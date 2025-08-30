import { Request, Response } from 'express';
import { db } from '../../config/database';
import { AuthenticatedRequest } from '../../middleware/auth';

/**
 * 사업자의 리뷰 목록 조회
 * GET /api/business/reviews
 */
export const getBusinessReviews = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      rating,
      has_images,
      sort_by = 'created_at',
      sort_order = 'desc' 
    } = req.query;

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

    // 사업자 정보 확인
    const business = await db('businesses')
      .where({ owner_id: user_id, status: 'approved' })
      .first();

    if (!business) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'BUSINESS_ACCESS_DENIED',
          message: '승인된 사업자만 접근할 수 있습니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    const offset = (Number(page) - 1) * Number(limit);

    let query = db('business_reviews as br')
      .select([
        'br.*',
        'u.name as user_name',
        'u.avatar_url as user_avatar'
      ])
      .leftJoin('users as u', 'br.user_id', 'u.id')
      .where('br.business_id', business.id)
      .whereIn('br.status', ['approved', 'pending']); // 승인된 리뷰와 검토 중인 리뷰만 조회

    // 필터링
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
      message: '사업자 리뷰 목록을 성공적으로 조회했습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get business reviews error:', error);
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
 * 사업자 리뷰 통계 조회
 * GET /api/business/reviews/statistics
 */
export const getBusinessReviewStatistics = async (req: AuthenticatedRequest, res: Response) => {
  try {
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

    // 사업자 정보 확인
    const business = await db('businesses')
      .where({ owner_id: user_id, status: 'approved' })
      .first();

    if (!business) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'BUSINESS_ACCESS_DENIED',
          message: '승인된 사업자만 접근할 수 있습니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 리뷰 통계 조회
    const reviewStats = await db('business_reviews')
      .select([
        db.raw('COUNT(*) as total_reviews'),
        db.raw('COUNT(*) FILTER (WHERE status = \'approved\') as approved_reviews'),
        db.raw('COUNT(*) FILTER (WHERE status = \'pending\') as pending_reviews'),
        db.raw('COUNT(*) FILTER (WHERE is_photo_review = true AND status = \'approved\') as photo_reviews'),
        db.raw('AVG(rating) FILTER (WHERE status = \'approved\') as average_rating'),
        db.raw('SUM(helpful_count) FILTER (WHERE status = \'approved\') as total_helpful_count')
      ])
      .where('business_id', business.id)
      .first();

    // 평점별 분포
    const ratingDistribution = await db('business_reviews')
      .select(['rating'])
      .count('* as count')
      .where({ business_id: business.id, status: 'approved' })
      .groupBy('rating')
      .orderBy('rating');

    // 최근 30일간 리뷰 추이
    const dailyReviews = await db('business_reviews')
      .select([
        db.raw('DATE(created_at) as date'),
        db.raw('COUNT(*) as count'),
        db.raw('AVG(rating) as avg_rating')
      ])
      .where('business_id', business.id)
      .where('status', 'approved')
      .where('created_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date');

    // 최근 리뷰들 (최신 5개)
    const recentReviews = await db('business_reviews as br')
      .select([
        'br.id',
        'br.rating',
        'br.content',
        'br.created_at',
        'u.name as user_name',
        'u.avatar_url as user_avatar'
      ])
      .leftJoin('users as u', 'br.user_id', 'u.id')
      .where('br.business_id', business.id)
      .where('br.status', 'approved')
      .orderBy('br.created_at', 'desc')
      .limit(5);

    // 키워드 분석 (태그 기반)
    const tagAnalysis = await db('business_reviews')
      .select(db.raw('jsonb_array_elements_text(tags) as tag'))
      .count('* as count')
      .where({ business_id: business.id, status: 'approved' })
      .whereNotNull('tags')
      .groupBy('tag')
      .orderBy('count', 'desc')
      .limit(10);

    res.json({
      success: true,
      data: {
        overview: {
          total_reviews: Number(reviewStats.total_reviews || 0),
          approved_reviews: Number(reviewStats.approved_reviews || 0),
          pending_reviews: Number(reviewStats.pending_reviews || 0),
          photo_reviews: Number(reviewStats.photo_reviews || 0),
          average_rating: parseFloat(reviewStats.average_rating || '0'),
          total_helpful_count: Number(reviewStats.total_helpful_count || 0)
        },
        rating_distribution: ratingDistribution.map(item => ({
          rating: item.rating,
          count: Number(item.count)
        })),
        daily_trends: dailyReviews.map(item => ({
          date: item.date,
          count: Number(item.count),
          avg_rating: parseFloat(item.avg_rating || '0')
        })),
        recent_reviews: recentReviews.map(review => ({
          id: review.id,
          rating: review.rating,
          content: review.content,
          created_at: review.created_at,
          user: {
            name: review.user_name,
            avatar_url: review.user_avatar
          }
        })),
        popular_tags: tagAnalysis.map(item => ({
          tag: item.tag,
          count: Number(item.count)
        }))
      },
      message: '사업자 리뷰 통계를 성공적으로 조회했습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get business review statistics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '리뷰 통계 조회 중 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * 특정 리뷰에 대한 사업자 답글 작성
 * POST /api/business/reviews/:id/reply
 */
export const replyToReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
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

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '답글 내용을 입력해주세요.',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (content.length > 500) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '답글은 최대 500자까지 입력 가능합니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 리뷰가 해당 사업자의 것인지 확인
    const review = await db('business_reviews as br')
      .select(['br.*', 'b.owner_id'])
      .leftJoin('businesses as b', 'br.business_id', 'b.id')
      .where('br.id', id)
      .where('br.status', 'approved')
      .first();

    if (!review) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REVIEW_NOT_FOUND',
          message: '존재하지 않는 리뷰이거나 접근 권한이 없습니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (review.owner_id !== user_id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: '해당 리뷰에 답글을 작성할 권한이 없습니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 이미 답글이 있는지 확인
    const existingReply = await db('review_replies')
      .where({ review_id: id })
      .first();

    if (existingReply) {
      // 기존 답글 수정
      const [updatedReply] = await db('review_replies')
        .where({ review_id: id })
        .update({
          content: content.trim(),
          updated_at: new Date()
        })
        .returning('*');

      res.json({
        success: true,
        data: updatedReply,
        message: '답글이 성공적으로 수정되었습니다.',
        timestamp: new Date().toISOString()
      });
    } else {
      // 새 답글 작성
      const [newReply] = await db('review_replies')
        .insert({
          review_id: id,
          business_id: review.business_id,
          content: content.trim(),
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      res.json({
        success: true,
        data: newReply,
        message: '답글이 성공적으로 작성되었습니다.',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Reply to review error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '답글 작성 중 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * 사업자 답글 삭제
 * DELETE /api/business/reviews/:id/reply
 */
export const deleteReviewReply = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
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

    // 답글이 해당 사업자의 것인지 확인
    const reply = await db('review_replies as rr')
      .select(['rr.*', 'b.owner_id'])
      .leftJoin('businesses as b', 'rr.business_id', 'b.id')
      .where('rr.review_id', id)
      .first();

    if (!reply) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPLY_NOT_FOUND',
          message: '존재하지 않는 답글입니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (reply.owner_id !== user_id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: '해당 답글을 삭제할 권한이 없습니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 답글 삭제
    await db('review_replies')
      .where({ review_id: id })
      .delete();

    res.json({
      success: true,
      data: null,
      message: '답글이 성공적으로 삭제되었습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete review reply error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '답글 삭제 중 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      }
    });
  }
};