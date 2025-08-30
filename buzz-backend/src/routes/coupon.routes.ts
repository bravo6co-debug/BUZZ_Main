import express from 'express';
import couponController from '../controllers/coupon.controller';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { validate, commonValidations } from '../middleware/validation';
import { body, query } from 'express-validator';

const router = express.Router();

// Apply authentication to all coupon routes
router.use(requireAuth);

/**
 * @route   GET /api/coupons
 * @desc    Get user's coupons
 * @access  Private
 */
router.get('/',
  validate([
    query('status').optional().isIn(['active', 'used', 'expired']),
    commonValidations.page(),
    commonValidations.limit(),
  ]),
  asyncHandler(couponController.getUserCoupons)
);

/**
 * @route   GET /api/coupons/available
 * @desc    Get available coupons for user
 * @access  Private
 */
router.get('/available',
  validate([
    commonValidations.page(),
    commonValidations.limit(),
  ]),
  asyncHandler(couponController.getAvailableCoupons)
);

/**
 * @route   POST /api/coupons/use
 * @desc    Use a coupon
 * @access  Private
 */
router.post('/use',
  validate([
    body('qrCode')
      .notEmpty()
      .withMessage('QR code is required'),
    body('purchaseAmount')
      .isFloat({ min: 0 })
      .withMessage('Purchase amount must be a positive number'),
    body('businessId')
      .isUUID()
      .withMessage('Valid business ID is required'),
  ]),
  asyncHandler(couponController.useCoupon)
);

/**
 * @route   GET /api/coupons/:id
 * @desc    Get coupon details
 * @access  Private
 */
router.get('/:id',
  validate([
    commonValidations.couponId(),
  ]),
  asyncHandler(couponController.getCouponDetails)
);

export default router;