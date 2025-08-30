import { Request, Response } from 'express';
import { db } from '../config/database';
import { validateReviewInput, validateReviewUpdate } from '../validators/review.validator';
import { uploadReviewImages } from '../services/upload.service';
import { filterProfanity } from '../services/profanity.service';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * 리뷰 작성 API
 * POST /api/reviews
 */
export const createReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { business_id, rating, content, visit_purpose, tags, visit_count = 1 } = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '로그인이 필요합니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 입력값 검증
    const validation = validateReviewInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '입력값이 올바르지 않습니다.',
          details: validation.errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    // 사업자 존재 확인
    const business = await db('businesses')
      .where({ id: business_id, status: 'approved' })
      .first();

    if (!business) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BUSINESS_NOT_FOUND',
          message: '존재하지 않는 사업자입니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 중복 리뷰 확인 (1인 1리뷰 원칙)
    const existingReview = await db('business_reviews')
      .where({ business_id, user_id })
      .first();

    if (existingReview) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_REVIEW',
          message: '이미 해당 사업자에 대한 리뷰를 작성하셨습니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 욕설/부적절한 내용 필터링
    const filteredContent = content ? await filterProfanity(content) : null;
    const needsReview = content !== filteredContent; // 욕설이 포함되어 있으면 관리자 검토 필요

    // 이미지 업로드 처리
    let uploadedImages = [];
    let isPhotoReview = false;
    
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      if (req.files.length > 3) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TOO_MANY_IMAGES',
            message: '이미지는 최대 3장까지 업로드 가능합니다.',
            timestamp: new Date().toISOString()
          }
        });
      }

      try {
        uploadedImages = await uploadReviewImages(req.files as Express.Multer.File[]);
        isPhotoReview = true;
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(400).json({
          success: false,
          error: {
            code: 'IMAGE_UPLOAD_FAILED',
            message: '이미지 업로드에 실패했습니다.',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // 트랜잭션으로 리뷰 생성
    const result = await db.transaction(async (trx) => {
      // 리뷰 생성
      const [newReview] = await trx('business_reviews')
        .insert({
          business_id,
          user_id,
          rating,
          content: filteredContent,
          visit_purpose,
          tags: tags ? JSON.stringify(tags) : null,
          visit_count,
          is_photo_review: isPhotoReview,
          status: needsReview ? 'pending' : 'approved', // 욕설이 있으면 pending
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      // 이미지 정보 저장
      if (uploadedImages.length > 0) {
        const imageInserts = uploadedImages.map((image, index) => ({
          review_id: newReview.id,
          image_url: image.url,
          thumbnail_url: image.thumbnailUrl,
          original_filename: image.originalName,
          file_size: image.size,
          mime_type: image.mimeType,
          width: image.width,
          height: image.height,
          sort_order: index,
          created_at: new Date()
        }));

        await trx('review_images').insert(imageInserts);
      }

      return newReview;
    });

    // 응답용 데이터 조합
    const reviewWithImages = {
      ...result,
      images: uploadedImages.map(img => ({
        url: img.url,
        thumbnail_url: img.thumbnailUrl
      })),
      user: {
        name: req.user.name,
        avatar_url: req.user.avatar_url
      }
    };

    res.status(201).json({
      success: true,
      data: reviewWithImages,
      message: needsReview 
        ? '리뷰가 등록되었습니다. 관리자 검토 후 공개됩니다.' 
        : '리뷰가 성공적으로 등록되었습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '리뷰 작성 중 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * 리뷰 목록 조회 API
 * GET /api/reviews
 */
export const getReviews = async (req: Request, res: Response) => {
  try {
    const { 
      business_id, 
      page = 1, 
      limit = 10, 
      rating, 
      has_images, 
      sort_by = 'created_at',
      sort_order = 'desc' 
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = db('business_reviews as br')
      .select([
        'br.*',
        'u.name as user_name',
        'u.avatar_url as user_avatar',
        'b.business_name'
      ])
      .leftJoin('users as u', 'br.user_id', 'u.id')
      .leftJoin('businesses as b', 'br.business_id', 'b.id')
      .where('br.status', 'approved'); // 승인된 리뷰만 조회

    // 필터링
    if (business_id) {
      query = query.where('br.business_id', business_id);
    }

    if (rating) {
      query = query.where('br.rating', rating);
    }

    if (has_images === 'true') {
      query = query.where('br.is_photo_review', true);
    }

    // 정렬
    const validSortFields = ['created_at', 'rating', 'helpful_count'];
    const sortField = validSortFields.includes(sort_by as string) ? sort_by : 'created_at';
    const sortDir = sort_order === 'asc' ? 'asc' : 'desc';
    
    query = query.orderBy(`br.${sortField}`, sortDir);

    // 페이지네이션
    const totalCount = await query.clone().count('* as count').first();
    const reviews = await query.limit(Number(limit)).offset(offset);

    // 리뷰별 이미지 조회
    const reviewIds = reviews.map(review => review.id);
    let reviewImages = [];
    
    if (reviewIds.length > 0) {
      reviewImages = await db('review_images')
        .whereIn('review_id', reviewIds)
        .orderBy('sort_order', 'asc');
    }

    // 리뷰와 이미지 매핑
    const reviewsWithImages = reviews.map(review => ({
      ...review,
      user: {
        name: review.user_name,
        avatar_url: review.user_avatar
      },
      images: reviewImages
        .filter(img => img.review_id === review.id)
        .map(img => ({
          url: img.image_url,
          thumbnail_url: img.thumbnail_url
        })),
      tags: review.tags ? JSON.parse(review.tags) : null
    }));

    res.json({
      success: true,
      data: {
        reviews: reviewsWithImages,
        pagination: {
          current_page: Number(page),
          per_page: Number(limit),
          total_count: Number(totalCount?.count || 0),
          total_pages: Math.ceil(Number(totalCount?.count || 0) / Number(limit))
        }
      },
      message: '리뷰 목록을 성공적으로 조회했습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '리뷰 조회 중 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * 리뷰 도움됨 처리 API
 * POST /api/reviews/:id/helpful
 */
export const toggleReviewHelpfulness = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_helpful } = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '로그인이 필요합니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 리뷰 존재 확인
    const review = await db('business_reviews')
      .where({ id, status: 'approved' })
      .first();

    if (!review) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REVIEW_NOT_FOUND',
          message: '존재하지 않는 리뷰입니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 본인 리뷰는 도움됨 처리 불가
    if (review.user_id === user_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_RATE_OWN_REVIEW',
          message: '본인이 작성한 리뷰는 평가할 수 없습니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 기존 평가 확인
    const existingRating = await db('review_helpfulness')
      .where({ review_id: id, user_id })
      .first();

    if (existingRating) {
      // 기존 평가 업데이트
      await db('review_helpfulness')
        .where({ review_id: id, user_id })
        .update({
          is_helpful,
          updated_at: new Date()
        });
    } else {
      // 새 평가 추가
      await db('review_helpfulness').insert({
        review_id: id,
        user_id,
        is_helpful,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // 업데이트된 도움됨 카운트 조회
    const helpfulCount = await db('review_helpfulness')
      .where({ review_id: id, is_helpful: true })
      .count('* as count')
      .first();

    res.json({
      success: true,
      data: {
        helpful_count: Number(helpfulCount?.count || 0),
        user_rating: is_helpful
      },
      message: '도움됨 평가가 반영되었습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Toggle review helpfulness error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '도움됨 처리 중 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * 리뷰 신고 API
 * POST /api/reviews/:id/report
 */
export const reportReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '로그인이 필요합니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 리뷰 존재 확인
    const review = await db('business_reviews')
      .where({ id })
      .first();

    if (!review) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REVIEW_NOT_FOUND',
          message: '존재하지 않는 리뷰입니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 이미 신고한 경우 확인
    const existingReport = await db('review_reports')
      .where({ review_id: id, reporter_id: user_id })
      .first();

    if (existingReport) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_REPORTED',
          message: '이미 신고한 리뷰입니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 신고 접수
    await db('review_reports').insert({
      review_id: id,
      reporter_id: user_id,
      reason,
      description,
      status: 'pending',
      created_at: new Date()
    });

    // 리뷰 신고 카운트 증가
    await db('business_reviews')
      .where({ id })
      .increment('report_count', 1);

    res.json({
      success: true,
      data: null,
      message: '신고가 정상적으로 접수되었습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Report review error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '리뷰 신고 중 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      }
    });
  }
};