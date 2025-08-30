import express from 'express';
import adminCouponController from '../../controllers/admin/coupon.controller';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAdmin } from '../../middleware/auth';
import { validate, commonValidations } from '../../middleware/validation';
import { body, query, param } from 'express-validator';

const router = express.Router();

// Apply admin authentication to all routes
router.use(requireAdmin);

/**
 * @route   GET /api/admin/coupons
 * @desc    Get all coupons for admin
 * @access  Private (Admin)
 */
router.get('/',
  validate([
    query('status').optional().isIn(['active', 'inactive']),
    query('type').optional().isIn(['basic', 'signup', 'referral', 'event']),
    query('search').optional().isLength({ max: 100 }),
    commonValidations.page(),
    commonValidations.limit(),
  ]),
  asyncHandler(adminCouponController.getCoupons)
);

/**
 * @route   GET /api/admin/coupons/statistics
 * @desc    Get coupon statistics
 * @access  Private (Admin)
 */
router.get('/statistics',
  validate([
    query('timeframe').optional().isIn(['week', 'month', 'year']),
  ]),
  asyncHandler(adminCouponController.getCouponStatistics)
);

/**
 * @route   POST /api/admin/coupons
 * @desc    Create new coupon
 * @access  Private (Admin)
 */
router.post('/',
  validate([
    body('name')
      .notEmpty()
      .isLength({ min: 2, max: 200 })
      .withMessage('Coupon name must be between 2-200 characters'),
    body('type')
      .isIn(['basic', 'signup', 'referral', 'event'])
      .withMessage('Invalid coupon type'),
    body('discount_type')
      .isIn(['fixed', 'percentage'])
      .withMessage('Discount type must be fixed or percentage'),
    body('discount_value')
      .isFloat({ min: 0 })
      .withMessage('Discount value must be a positive number'),
    body('min_purchase_amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum purchase amount must be positive'),
    body('max_discount_amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Maximum discount amount must be positive'),
    body('valid_from')
      .optional()
      .isISO8601()
      .withMessage('Valid from must be a valid date'),
    body('valid_until')
      .optional()
      .isISO8601()
      .withMessage('Valid until must be a valid date'),
    body('total_quantity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Total quantity must be a positive integer'),
    body('applicable_businesses')
      .optional()
      .isArray()
      .withMessage('Applicable businesses must be an array'),
    body('applicable_businesses.*')
      .optional()
      .isUUID()
      .withMessage('Each business ID must be a valid UUID'),
  ]),
  asyncHandler(adminCouponController.createCoupon)
);

/**
 * @route   POST /api/admin/coupons/issue
 * @desc    Issue coupons to users in bulk
 * @access  Private (Admin)
 */
router.post('/issue',
  validate([
    body('couponId')
      .isUUID()
      .withMessage('Coupon ID must be a valid UUID'),
    body('userIds')
      .optional()
      .isArray()
      .withMessage('User IDs must be an array'),
    body('userIds.*')
      .optional()
      .isUUID()
      .withMessage('Each user ID must be a valid UUID'),
    body('userFilters')
      .optional()
      .isObject()
      .withMessage('User filters must be an object'),
    body('userFilters.role')
      .optional()
      .isIn(['user', 'business'])
      .withMessage('Invalid user role'),
    body('userFilters.isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be boolean'),
    body('userFilters.university')
      .optional()
      .isLength({ max: 100 })
      .withMessage('University name too long'),
    body('userFilters.registeredAfter')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
    body('userFilters.registeredBefore')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
    body('expirationDays')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Expiration days must be between 1-365'),
  ]),
  asyncHandler(adminCouponController.issueCoupons)
);

/**
 * @route   GET /api/admin/coupons/:id
 * @desc    Get coupon details by ID
 * @access  Private (Admin)
 */
router.get('/:id',
  validate([
    commonValidations.couponId(),
  ]),
  asyncHandler(adminCouponController.getCoupon)
);

/**
 * @route   PUT /api/admin/coupons/:id
 * @desc    Update coupon
 * @access  Private (Admin)
 */
router.put('/:id',
  validate([
    commonValidations.couponId(),
    body('name')
      .optional()
      .isLength({ min: 2, max: 200 })
      .withMessage('Coupon name must be between 2-200 characters'),
    body('discount_type')
      .optional()
      .isIn(['fixed', 'percentage'])
      .withMessage('Discount type must be fixed or percentage'),
    body('discount_value')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Discount value must be a positive number'),
    body('min_purchase_amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum purchase amount must be positive'),
    body('max_discount_amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Maximum discount amount must be positive'),
    body('valid_from')
      .optional()
      .isISO8601()
      .withMessage('Valid from must be a valid date'),
    body('valid_until')
      .optional()
      .isISO8601()
      .withMessage('Valid until must be a valid date'),
    body('total_quantity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Total quantity must be a positive integer'),
    body('applicable_businesses')
      .optional()
      .isArray()
      .withMessage('Applicable businesses must be an array'),
    body('applicable_businesses.*')
      .optional()
      .isUUID()
      .withMessage('Each business ID must be a valid UUID'),
    body('status')
      .optional()
      .isIn(['active', 'inactive'])
      .withMessage('Status must be active or inactive'),
  ]),
  asyncHandler(adminCouponController.updateCoupon)
);

/**
 * @route   DELETE /api/admin/coupons/:id
 * @desc    Delete/deactivate coupon
 * @access  Private (Admin)
 */
router.delete('/:id',
  validate([
    commonValidations.couponId(),
    body('permanent')
      .optional()
      .isBoolean()
      .withMessage('Permanent must be boolean'),
  ]),
  asyncHandler(adminCouponController.deleteCoupon)
);

/**
 * @route   GET /api/admin/coupons/:id/usage
 * @desc    Get coupon usage history
 * @access  Private (Admin)
 */
router.get('/:id/usage',
  validate([
    commonValidations.couponId(),
    query('status').optional().isIn(['active', 'used', 'expired']),
    commonValidations.page(),
    commonValidations.limit(),
  ]),
  asyncHandler(adminCouponController.getCouponUsageHistory)
);

export default router;