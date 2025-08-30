import { Router } from 'express';
import { authenticate, requireBusiness } from '../../middleware/auth';
import {
  getBusinessReviews,
  getBusinessReviewStatistics,
  replyToReview,
  deleteReviewReply
} from '../../controllers/business/review.business.controller';

const router = Router();

// 모든 사업자 리뷰 API는 인증과 사업자 권한이 필요
router.use(authenticate);
router.use(requireBusiness);

/**
 * @swagger
 * /api/business/reviews:
 *   get:
 *     summary: 사업자 리뷰 목록 조회
 *     description: 해당 사업자의 리뷰 목록을 조회합니다.
 *     tags: [Business - Reviews]
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
 *           maximum: 50
 *           default: 20
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: 평점별 필터
 *       - in: query
 *         name: has_images
 *         schema:
 *           type: boolean
 *         description: 이미지 포함 리뷰만 조회
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, rating, helpful_count]
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
 *         description: 사업자 리뷰 목록 조회 성공
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
 *                         $ref: '#/components/schemas/ReviewWithUser'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       403:
 *         description: 승인된 사업자만 접근 가능
 */
router.get('/', getBusinessReviews);

/**
 * @swagger
 * /api/business/reviews/statistics:
 *   get:
 *     summary: 사업자 리뷰 통계 조회
 *     description: 해당 사업자의 리뷰에 대한 상세 통계를 조회합니다.
 *     tags: [Business - Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사업자 리뷰 통계 조회 성공
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
 *                           description: 전체 리뷰 수
 *                         approved_reviews:
 *                           type: integer
 *                           description: 승인된 리뷰 수
 *                         pending_reviews:
 *                           type: integer
 *                           description: 검토 중인 리뷰 수
 *                         photo_reviews:
 *                           type: integer
 *                           description: 사진 리뷰 수
 *                         average_rating:
 *                           type: number
 *                           description: 평균 평점
 *                         total_helpful_count:
 *                           type: integer
 *                           description: 총 도움됨 수
 *                     rating_distribution:
 *                       type: array
 *                       description: 평점별 분포
 *                       items:
 *                         type: object
 *                         properties:
 *                           rating:
 *                             type: integer
 *                           count:
 *                             type: integer
 *                     daily_trends:
 *                       type: array
 *                       description: 최근 30일간 리뷰 추이
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           count:
 *                             type: integer
 *                           avg_rating:
 *                             type: number
 *                     recent_reviews:
 *                       type: array
 *                       description: 최근 리뷰 5개
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           rating:
 *                             type: integer
 *                           content:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           user:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               avatar_url:
 *                                 type: string
 *                     popular_tags:
 *                       type: array
 *                       description: 인기 태그 TOP 10
 *                       items:
 *                         type: object
 *                         properties:
 *                           tag:
 *                             type: string
 *                           count:
 *                             type: integer
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/statistics', getBusinessReviewStatistics);

/**
 * @swagger
 * /api/business/reviews/{id}/reply:
 *   post:
 *     summary: 리뷰에 답글 작성
 *     description: 특정 리뷰에 대해 사업자 답글을 작성하거나 수정합니다.
 *     tags: [Business - Reviews]
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 description: 답글 내용
 *     responses:
 *       200:
 *         description: 답글 작성/수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ReviewReply'
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       403:
 *         description: 해당 리뷰에 답글을 작성할 권한이 없음
 *       404:
 *         description: 존재하지 않는 리뷰
 */
router.post('/:id/reply', replyToReview);

/**
 * @swagger
 * /api/business/reviews/{id}/reply:
 *   delete:
 *     summary: 리뷰 답글 삭제
 *     description: 특정 리뷰에 작성한 사업자 답글을 삭제합니다.
 *     tags: [Business - Reviews]
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
 *     responses:
 *       200:
 *         description: 답글 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       403:
 *         description: 해당 답글을 삭제할 권한이 없음
 *       404:
 *         description: 존재하지 않는 답글
 */
router.delete('/:id/reply', deleteReviewReply);

export default router;