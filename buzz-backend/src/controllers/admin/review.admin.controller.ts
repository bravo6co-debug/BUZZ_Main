import { Request, Response } from 'express';
import { db } from '../../config/database';
import { validateReviewStatus } from '../../validators/review.validator';
import { AuthenticatedRequest } from '../../middleware/auth';

/**
 * 관리자 리뷰 목록 조회 (검토 필요한 리뷰 포함)
 * GET /api/admin/reviews
 */
export const getAdminReviews = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status,
      business_id,
      rating,
      has_reports,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = db('business_reviews as br')
      .select([
        'br.*',
        'u.name as user_name',
        'u.email as user_email',
        'u.avatar_url as user_avatar',
        'b.business_name',
        'b.owner_id as business_owner_id',
        'reviewed_by_user.name as reviewed_by_name'
      ])
      .leftJoin('users as u', 'br.user_id', 'u.id')
      .leftJoin('businesses as b', 'br.business_id', 'b.id')
      .leftJoin('users as reviewed_by_user', 'br.reviewed_by', 'reviewed_by_user.id');

    // 필터링
    if (status) {
      query = query.where('br.status', status);
    }

    if (business_id) {
      query = query.where('br.business_id', business_id);
    }

    if (rating) {
      query = query.where('br.rating', rating);
    }

    if (has_reports === 'true') {
      query = query.where('br.report_count', '>', 0);
    }

    // 정렬
    const validSortFields = ['created_at', 'rating', 'report_count', 'helpful_count', 'status'];
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

    // 리뷰별 신고 내역 조회
    let reviewReports = [];
    if (reviewIds.length > 0) {
      reviewReports = await db('review_reports as rr')
        .select([
          'rr.*',
          'reporter.name as reporter_name',
          'handler.name as handler_name'
        ])
        .leftJoin('users as reporter', 'rr.reporter_id', 'reporter.id')
        .leftJoin('users as handler', 'rr.handled_by', 'handler.id')
        .whereIn('rr.review_id', reviewIds);
    }

    // 데이터 매핑
    const reviewsWithDetails = reviews.map(review => ({
      ...review,
      user: {
        name: review.user_name,
        email: review.user_email,
        avatar_url: review.user_avatar
      },
      business: {
        name: review.business_name,
        owner_id: review.business_owner_id
      },
      reviewed_by: review.reviewed_by_name,
      images: reviewImages
        .filter(img => img.review_id === review.id)
        .map(img => ({
          url: img.image_url,
          thumbnail_url: img.thumbnail_url
        })),
      reports: reviewReports
        .filter(report => report.review_id === review.id)
        .map(report => ({
          id: report.id,
          reason: report.reason,
          description: report.description,
          status: report.status,
          reporter_name: report.reporter_name,
          handler_name: report.handler_name,
          created_at: report.created_at,
          handled_at: report.handled_at
        })),
      tags: review.tags ? JSON.parse(review.tags) : null
    }));

    res.json({
      success: true,
      data: {
        reviews: reviewsWithDetails,
        pagination: {
          current_page: Number(page),
          per_page: Number(limit),
          total_count: Number(totalCount?.count || 0),
          total_pages: Math.ceil(Number(totalCount?.count || 0) / Number(limit))
        }
      },
      message: '관리자 리뷰 목록을 성공적으로 조회했습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get admin reviews error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '리뷰 목록 조회 중 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * 리뷰 상태 변경 (승인/거부/숨김)
 * PUT /api/admin/reviews/:id/status
 */
export const updateReviewStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, review_notes } = req.body;
    const admin_id = req.user?.id;

    if (!admin_id) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '관리자 권한이 필요합니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 입력값 검증
    const validation = validateReviewStatus(req.body);
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

    // 리뷰 상태 업데이트
    const [updatedReview] = await db('business_reviews')
      .where({ id })
      .update({
        status,
        reviewed_by: admin_id,
        reviewed_at: new Date(),
        review_notes,
        updated_at: new Date()
      })
      .returning('*');

    res.json({
      success: true,
      data: updatedReview,
      message: '리뷰 상태가 성공적으로 변경되었습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update review status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '리뷰 상태 변경 중 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * 리뷰 신고 처리
 * PUT /api/admin/reviews/reports/:reportId
 */
export const handleReviewReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    const { action, admin_notes } = req.body; // action: 'resolved', 'dismissed'
    const admin_id = req.user?.id;

    if (!admin_id) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '관리자 권한이 필요합니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 신고 존재 확인
    const report = await db('review_reports')
      .where({ id: reportId, status: 'pending' })
      .first();

    if (!report) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: '처리할 수 있는 신고가 없습니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    const newStatus = action === 'resolved' ? 'resolved' : 'dismissed';

    // 신고 처리
    const [updatedReport] = await db('review_reports')
      .where({ id: reportId })
      .update({
        status: newStatus,
        handled_by: admin_id,
        handled_at: new Date(),
        admin_notes
      })
      .returning('*');

    // 신고가 해결된 경우, 해당 리뷰를 숨김 처리할지 결정
    if (action === 'resolved') {
      // 추가 로직: 신고 사유에 따라 자동으로 리뷰를 숨김 처리하거나 관리자가 별도로 처리하도록 함
      // 여기서는 관리자가 별도로 리뷰 상태를 변경하도록 함
    }

    res.json({
      success: true,
      data: updatedReport,
      message: '신고가 성공적으로 처리되었습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Handle review report error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '신고 처리 중 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * 리뷰 통계 조회 (관리자용)
 * GET /api/admin/reviews/statistics
 */
export const getReviewStatistics = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    // 기본 통계 조회
    const totalStats = await db('business_reviews')
      .select([
        db.raw('COUNT(*) as total_reviews'),
        db.raw('COUNT(*) FILTER (WHERE status = \'approved\') as approved_reviews'),
        db.raw('COUNT(*) FILTER (WHERE status = \'pending\') as pending_reviews'),
        db.raw('COUNT(*) FILTER (WHERE status = \'rejected\') as rejected_reviews'),
        db.raw('COUNT(*) FILTER (WHERE status = \'hidden\') as hidden_reviews'),
        db.raw('COUNT(*) FILTER (WHERE is_photo_review = true) as photo_reviews'),
        db.raw('COUNT(*) FILTER (WHERE report_count > 0) as reported_reviews'),
        db.raw('AVG(rating) FILTER (WHERE status = \'approved\') as average_rating')
      ])
      .first();

    // 평점별 분포
    const ratingDistribution = await db('business_reviews')
      .select(['rating'])
      .count('* as count')
      .where('status', 'approved')
      .groupBy('rating')
      .orderBy('rating');

    // 최근 7일간 리뷰 추이
    const dailyReviews = await db('business_reviews')
      .select([
        db.raw('DATE(created_at) as date'),
        db.raw('COUNT(*) as count')
      ])
      .where('created_at', '>=', db.raw("NOW() - INTERVAL '7 days'"))
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date');

    // 사업자별 리뷰 수 TOP 10
    const topBusinesses = await db('business_reviews as br')
      .select([
        'b.business_name',
        'b.id as business_id',
        db.raw('COUNT(*) as review_count'),
        db.raw('AVG(br.rating) as avg_rating')
      ])
      .leftJoin('businesses as b', 'br.business_id', 'b.id')
      .where('br.status', 'approved')
      .groupBy('b.id', 'b.business_name')
      .orderBy('review_count', 'desc')
      .limit(10);

    // 신고 통계
    const reportStats = await db('review_reports')
      .select([
        'reason',
        db.raw('COUNT(*) as count')
      ])
      .groupBy('reason')
      .orderBy('count', 'desc');

    res.json({
      success: true,
      data: {
        overview: {
          total_reviews: Number(totalStats.total_reviews),
          approved_reviews: Number(totalStats.approved_reviews),
          pending_reviews: Number(totalStats.pending_reviews),
          rejected_reviews: Number(totalStats.rejected_reviews),
          hidden_reviews: Number(totalStats.hidden_reviews),
          photo_reviews: Number(totalStats.photo_reviews),
          reported_reviews: Number(totalStats.reported_reviews),
          average_rating: parseFloat(totalStats.average_rating || '0')
        },
        rating_distribution: ratingDistribution.map(item => ({
          rating: item.rating,
          count: Number(item.count)
        })),
        daily_trends: dailyReviews.map(item => ({
          date: item.date,
          count: Number(item.count)
        })),
        top_businesses: topBusinesses.map(item => ({
          business_id: item.business_id,
          business_name: item.business_name,
          review_count: Number(item.review_count),
          avg_rating: parseFloat(item.avg_rating || '0')
        })),
        report_statistics: reportStats.map(item => ({
          reason: item.reason,
          count: Number(item.count)
        }))
      },
      message: '리뷰 통계를 성공적으로 조회했습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get review statistics error:', error);
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
 * 리뷰 대량 처리 (일괄 승인/거부)
 * POST /api/admin/reviews/bulk-action
 */
export const bulkReviewAction = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { review_ids, action, review_notes } = req.body;
    const admin_id = req.user?.id;

    if (!admin_id) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '관리자 권한이 필요합니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!Array.isArray(review_ids) || review_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '처리할 리뷰 ID 목록이 필요합니다.',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!['approved', 'rejected', 'hidden'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ACTION',
          message: '올바른 액션을 선택해주세요.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 대량 업데이트
    const updatedCount = await db('business_reviews')
      .whereIn('id', review_ids)
      .update({
        status: action,
        reviewed_by: admin_id,
        reviewed_at: new Date(),
        review_notes,
        updated_at: new Date()
      });

    res.json({
      success: true,
      data: {
        updated_count: updatedCount,
        action: action
      },
      message: `${updatedCount}개의 리뷰가 성공적으로 ${action} 처리되었습니다.`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Bulk review action error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '리뷰 대량 처리 중 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      }
    });
  }
};