import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { validateReviewImages } from '../validators/review.validator';
import {
  createReview,
  getReviews,
  toggleReviewHelpfulness,
  reportReview
} from '../controllers/review.controller';

const router = Router();

// 멀티파트 폼 데이터 처리를 위한 multer 설정
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 3 // 최대 3개 파일
  },
  fileFilter: (req, file, cb) => {
    // 이미지 파일만 허용
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: 리뷰 작성
 *     description: 사업자에 대한 새로운 리뷰를 작성합니다.
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - business_id
 *               - rating
 *             properties:
 *               business_id:
 *                 type: string
 *                 format: uuid
 *                 description: 사업자 ID
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: 평점 (1-5)
 *               content:
 *                 type: string
 *                 maxLength: 1000
 *                 description: 리뷰 내용
 *               visit_purpose:
 *                 type: string
 *                 maxLength: 100
 *                 description: 방문 목적
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 10
 *                 description: 리뷰 태그
 *               visit_count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 1
 *                 description: 방문 횟수
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 3
 *                 description: 리뷰 이미지 (최대 3장)
 *     responses:
 *       201:
 *         description: 리뷰 작성 성공
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
 *       400:
 *         description: 잘못된 요청
 *       409:
 *         description: 중복 리뷰 (이미 해당 사업자에 대한 리뷰 존재)
 */
router.post('/', authenticate, upload.array('images', 3), createReview);

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: 리뷰 목록 조회
 *     description: 리뷰 목록을 조회합니다. 사업자별, 평점별 필터링 가능합니다.
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: business_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 사업자 ID (특정 사업자의 리뷰만 조회)
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
 *           default: 10
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: 평점 필터
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
 *         description: 리뷰 목록 조회 성공
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
 */
router.get('/', getReviews);

/**
 * @swagger
 * /api/reviews/{id}/helpful:
 *   post:
 *     summary: 리뷰 도움됨 평가
 *     description: 특정 리뷰에 대해 도움됨/도움안됨을 평가합니다.
 *     tags: [Reviews]
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
 *               - is_helpful
 *             properties:
 *               is_helpful:
 *                 type: boolean
 *                 description: true는 도움됨, false는 도움안됨
 *     responses:
 *       200:
 *         description: 도움됨 평가 성공
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
 *                     helpful_count:
 *                       type: integer
 *                     user_rating:
 *                       type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: 본인 리뷰는 평가할 수 없음
 *       404:
 *         description: 존재하지 않는 리뷰
 */
router.post('/:id/helpful', authenticate, toggleReviewHelpfulness);

/**
 * @swagger
 * /api/reviews/{id}/report:
 *   post:
 *     summary: 리뷰 신고
 *     description: 부적절한 리뷰를 신고합니다.
 *     tags: [Reviews]
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 enum:
 *                   - inappropriate_content
 *                   - fake_review
 *                   - spam
 *                   - offensive_language
 *                   - irrelevant_content
 *                   - privacy_violation
 *                   - other
 *                 description: 신고 사유
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: 신고 상세 내용
 *     responses:
 *       200:
 *         description: 신고 접수 성공
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
 *       404:
 *         description: 존재하지 않는 리뷰
 *       409:
 *         description: 이미 신고한 리뷰
 */
router.post('/:id/report', authenticate, reportReview);

export default router;