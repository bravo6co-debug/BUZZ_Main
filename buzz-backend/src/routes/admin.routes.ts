import express from 'express';
import adminDashboardController from '../controllers/admin/dashboard.controller';
import adminBudgetController from '../controllers/admin/budget.controller';
import adminUserController from '../controllers/admin/user.controller';
import referralPolicyController from '../controllers/admin/referralPolicy.controller';
import adminReviewRoutes from './admin/review.admin.routes';
import adminCouponRoutes from './admin/coupon.admin.routes';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAdmin } from '../middleware/auth';
import { validate, commonValidations } from '../middleware/validation';
import { body, query, param } from 'express-validator';

const router = express.Router();

// Apply admin authentication to all routes
router.use(requireAdmin);

// Dashboard routes
/**
 * @route   GET /api/admin/dashboard
 * @desc    Admin dashboard statistics
 * @access  Private (Admin)
 */
router.get('/dashboard',
  validate([
    query('timeframe').optional().isIn(['week', 'month', 'year']),
  ]),
  asyncHandler(adminDashboardController.getDashboard)
);

/**
 * @route   GET /api/admin/analytics
 * @desc    Detailed analytics
 * @access  Private (Admin)
 */
router.get('/analytics',
  validate([
    query('timeframe').optional().isIn(['week', 'month', 'year']),
    query('metric').optional().isIn(['users', 'businesses', 'mileage', 'coupons']),
  ]),
  asyncHandler(adminDashboardController.getAnalytics)
);

// Budget routes
/**
 * @route   GET /api/admin/budget
 * @desc    Get budget status
 * @access  Private (Admin)
 */
router.get('/budget',
  validate([
    query('period').optional().isIn(['current_month', 'last_month', 'current_year']),
  ]),
  asyncHandler(adminBudgetController.getBudgetStatus)
);

/**
 * @route   POST /api/admin/budget/policy
 * @desc    Update budget policy
 * @access  Private (Admin)
 */
router.post('/budget/policy',
  validate([
    body('monthlyLimits').optional().isObject(),
    body('dailyLimits').optional().isObject(),
    body('autoSuspendThreshold').optional().isFloat({ min: 0, max: 100 }),
    body('alertThresholds').optional().isObject(),
    body('emergencyControls').optional().isObject(),
  ]),
  asyncHandler(adminBudgetController.updateBudgetPolicy)
);

/**
 * @route   POST /api/admin/budget/emergency
 * @desc    Emergency controls
 * @access  Private (Admin)
 */
router.post('/budget/emergency',
  validate([
    body('enabled').isBoolean().withMessage('Enabled status is required'),
    body('reason').optional().isLength({ min: 10, max: 500 }),
    body('restrictions').optional().isObject(),
  ]),
  asyncHandler(adminBudgetController.updateEmergencyControls)
);

/**
 * @route   GET /api/admin/budget/forecast
 * @desc    Get budget forecast
 * @access  Private (Admin)
 */
router.get('/budget/forecast',
  validate([
    query('months').optional().isInt({ min: 1, max: 12 }),
  ]),
  asyncHandler(adminBudgetController.getBudgetForecast)
);

// User management routes
/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private (Admin)
 */
router.get('/users',
  validate([
    query('role').optional().isIn(['user', 'business', 'admin']),
    query('status').optional().isIn(['active', 'inactive']),
    query('search').optional().isLength({ max: 100 }),
    query('sortBy').optional().isIn(['created_at', 'name', 'email', 'login_count', 'last_login_at']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    commonValidations.page(),
    commonValidations.limit(),
  ]),
  asyncHandler(adminUserController.getUsers)
);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user details
 * @access  Private (Admin)
 */
router.get('/users/:id',
  validate([
    commonValidations.userId(),
  ]),
  asyncHandler(adminUserController.getUserDetails)
);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Private (Admin)
 */
router.put('/users/:id',
  validate([
    commonValidations.userId(),
    commonValidations.name().optional(),
    commonValidations.email().optional(),
    commonValidations.phone().optional(),
    body('role').optional().isIn(['user', 'business', 'admin']),
    body('isActive').optional().isBoolean(),
    body('businessStatus').optional().isIn(['pending', 'approved', 'suspended', 'rejected']),
    body('notes').optional().isLength({ max: 1000 }),
  ]),
  asyncHandler(adminUserController.updateUser)
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Private (Admin)
 */
router.delete('/users/:id',
  validate([
    commonValidations.userId(),
    body('permanent').optional().isBoolean(),
    body('reason').optional().isLength({ min: 10, max: 500 }),
  ]),
  asyncHandler(adminUserController.deleteUser)
);

/**
 * @route   POST /api/admin/users/:id/reset-password
 * @desc    Reset user password
 * @access  Private (Admin)
 */
router.post('/users/:id/reset-password',
  validate([
    commonValidations.userId(),
    body('temporaryPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('requirePasswordChange').optional().isBoolean(),
  ]),
  asyncHandler(adminUserController.resetUserPassword)
);

/**
 * @route   GET /api/admin/users/:id/activity
 * @desc    Get user activity logs
 * @access  Private (Admin)
 */
router.get('/users/:id/activity',
  validate([
    commonValidations.userId(),
    commonValidations.page(),
    commonValidations.limit(),
  ]),
  asyncHandler(adminUserController.getUserActivity)
);

// Referral Policy management routes
/**
 * @route   GET /api/admin/referral-policies
 * @desc    Get all reward policies
 * @access  Private (Admin)
 */
router.get('/referral-policies', asyncHandler(referralPolicyController.getPolicies));

/**
 * @route   GET /api/admin/referral-policies/:type
 * @desc    Get policy by type
 * @access  Private (Admin)
 */
router.get('/referral-policies/:type',
  validate([
    param('type').isIn(['referral_recommender', 'referral_referee', 'review', 'store_visit', 'qr_first_use', 'repeat_purchase', 'signup']),
  ]),
  asyncHandler(referralPolicyController.getPolicyByType)
);

/**
 * @route   POST /api/admin/referral-policies
 * @desc    Create new reward policy
 * @access  Private (Admin)
 */
router.post('/referral-policies',
  validate([
    body('type').isIn(['referral_recommender', 'referral_referee', 'review', 'store_visit', 'qr_first_use', 'repeat_purchase', 'signup']),
    body('name').notEmpty().withMessage('Policy name is required'),
    body('description').notEmpty().withMessage('Policy description is required'),
    body('reward').isObject().withMessage('Reward configuration is required'),
    body('reward.type').isIn(['point', 'cash', 'coupon', 'discount']),
    body('reward.amount').isFloat({ min: 0 }).withMessage('Reward amount must be positive'),
    body('conditions').optional().isObject(),
    body('priority').optional().isInt({ min: 1 }),
    body('reason').optional().isLength({ max: 500 }),
  ]),
  asyncHandler(referralPolicyController.createPolicy)
);

/**
 * @route   PUT /api/admin/referral-policies/:id
 * @desc    Update reward policy
 * @access  Private (Admin)
 */
router.put('/referral-policies/:id',
  validate([
    param('id').notEmpty().withMessage('Policy ID is required'),
    body('name').optional().notEmpty(),
    body('description').optional().notEmpty(),
    body('reward').optional().isObject(),
    body('conditions').optional().isObject(),
    body('status').optional().isIn(['active', 'inactive']),
    body('priority').optional().isInt({ min: 1 }),
    body('reason').optional().isLength({ max: 500 }),
  ]),
  asyncHandler(referralPolicyController.updatePolicy)
);

/**
 * @route   DELETE /api/admin/referral-policies/:id
 * @desc    Delete/Deactivate policy
 * @access  Private (Admin)
 */
router.delete('/referral-policies/:id',
  validate([
    param('id').notEmpty().withMessage('Policy ID is required'),
    body('permanent').optional().isBoolean(),
    body('reason').optional().isLength({ max: 500 }),
  ]),
  asyncHandler(referralPolicyController.deletePolicy)
);

/**
 * @route   GET /api/admin/referral-policies/:id/history
 * @desc    Get policy change history
 * @access  Private (Admin)
 */
router.get('/referral-policies/:id/history',
  validate([
    param('id').notEmpty().withMessage('Policy ID is required'),
    commonValidations.page(),
    commonValidations.limit(),
  ]),
  asyncHandler(referralPolicyController.getPolicyHistory)
);

/**
 * @route   POST /api/admin/referral-policies/:type/calculate
 * @desc    Calculate reward amount for given context
 * @access  Private (Admin)
 */
router.post('/referral-policies/:type/calculate',
  validate([
    param('type').isIn(['referral_recommender', 'referral_referee', 'review', 'store_visit', 'qr_first_use', 'repeat_purchase', 'signup']),
    body('context').optional().isObject(),
  ]),
  asyncHandler(referralPolicyController.getRewardAmount)
);

// Mount review management routes
router.use('/reviews', adminReviewRoutes);

// Mount coupon management routes
router.use('/coupons', adminCouponRoutes);

export default router;