import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import {
  getAdminReviews,
  updateReviewStatus,
  handleReviewReport,
  getReviewStatistics,
  bulkReviewAction
} from '../../controllers/admin/review.admin.controller';

const router = Router();

// 모든 관리자 리뷰 API는 인증과 관리자 권한이 필요
router.use(authenticate);
router.use(requireAdmin);

/**
 * @swagger
 * /api/admin/reviews:
 *   get:
 *     summary: 관리자 리뷰 목록 조회
 *     description: 모든 리뷰 목록을 조회합니다. 검토 필요한 리뷰, 신고된 리뷰 등을 포함합니다.
 *     tags: [Admin - Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, hidden]
 *         description: 리뷰 상태별 필터
 *       - in: query
 *         name: business_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 특정 사업자의 리뷰만 조회
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: 평점별 필터
 *       - in: query
 *         name: has_reports
 *         schema:
 *           type: boolean
 *         description: 신고가 접수된 리뷰만 조회
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, rating, report_count, helpful_count, status]
 *           default: created_at
 *         description: 정렬 기준
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 정렬 순서
 *     responses:
 *       200:
 *         description: 관리자 리뷰 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviews:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AdminReviewDetail'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/', getAdminReviews);

/**
 * @swagger
 * /api/admin/reviews/{id}/status:
 *   put:
 *     summary: 리뷰 상태 변경
 *     description: 리뷰의 승인/거부/숨김 상태를 변경합니다.
 *     tags: [Admin - Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 리뷰 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected, hidden]
 *                 description: 변경할 리뷰 상태
 *               review_notes:
 *                 type: string
 *                 maxLength: 500
 *                 description: 관리자 검토 메모
 *     responses:
 *       200:
 *         description: 리뷰 상태 변경 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Review'
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: 존재하지 않는 리뷰
 */
router.put('/:id/status', updateReviewStatus);

/**
 * @swagger
 * /api/admin/reviews/reports/{reportId}:
 *   put:
 *     summary: 리뷰 신고 처리
 *     description: 접수된 리뷰 신고를 처리합니다.
 *     tags: [Admin - Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 신고 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [resolved, dismissed]
 *                 description: 신고 처리 액션 (해결됨/기각됨)
 *               admin_notes:
 *                 type: string
 *                 maxLength: 500
 *                 description: 관리자 처리 메모
 *     responses:
 *       200:
 *         description: 신고 처리 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ReviewReport'
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: 존재하지 않는 신고
 */
router.put('/reports/:reportId', handleReviewReport);

/**
 * @swagger
 * /api/admin/reviews/statistics:
 *   get:
 *     summary: 리뷰 통계 조회
 *     description: 전체 리뷰에 대한 통계 정보를 조회합니다.
 *     tags: [Admin - Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: 통계 시작 날짜
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: 통계 종료 날짜
 *     responses:
 *       200:
 *         description: 리뷰 통계 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                       properties:
 *                         total_reviews:
 *                           type: integer
 *                         approved_reviews:
 *                           type: integer
 *                         pending_reviews:
 *                           type: integer
 *                         rejected_reviews:
 *                           type: integer
 *                         hidden_reviews:
 *                           type: integer
 *                         photo_reviews:
 *                           type: integer
 *                         reported_reviews:
 *                           type: integer
 *                         average_rating:
 *                           type: number
 *                     rating_distribution:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rating:
 *                             type: integer
 *                           count:
 *                             type: integer
 *                     daily_trends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           count:
 *                             type: integer
 *                     top_businesses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           business_id:
 *                             type: string
 *                           business_name:
 *                             type: string
 *                           review_count:
 *                             type: integer
 *                           avg_rating:
 *                             type: number
 *                     report_statistics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           reason:
 *                             type: string
 *                           count:
 *                             type: integer
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/statistics', getReviewStatistics);

/**
 * @swagger
 * /api/admin/reviews/bulk-action:
 *   post:
 *     summary: 리뷰 일괄 처리
 *     description: 여러 리뷰를 한 번에 승인/거부/숨김 처리합니다.
 *     tags: [Admin - Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - review_ids
 *               - action
 *             properties:
 *               review_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 100
 *                 description: 처리할 리뷰 ID 목록
 *               action:
 *                 type: string
 *                 enum: [approved, rejected, hidden]
 *                 description: 수행할 액션
 *               review_notes:
 *                 type: string
 *                 maxLength: 500
 *                 description: 관리자 검토 메모
 *     responses:
 *       200:
 *         description: 일괄 처리 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     updated_count:
 *                       type: integer
 *                     action:
 *                       type: string
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.post('/bulk-action', bulkReviewAction);

export default router;