import express from 'express';
import businessController from '../controllers/business.controller';
import businessReviewRoutes from './business/review.business.routes';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth, requireBusiness } from '../middleware/auth';
import { businessValidations, validate, commonValidations } from '../middleware/validation';

const router = express.Router();

/**
 * @route   POST /api/business/apply
 * @desc    Apply for business account
 * @access  Public
 */
router.post('/apply', businessValidations.apply, asyncHandler(businessController.apply));

/**
 * @route   GET /api/business/application/status
 * @desc    Check application status
 * @access  Public
 */
router.get('/application/status', asyncHandler(businessController.getApplicationStatus));

/**
 * @route   POST /api/business/login
 * @desc    Business account login
 * @access  Public
 */
router.post('/login', 
  validate([
    commonValidations.email(),
    // password validation
  ]),
  asyncHandler(businessController.login)
);

// Apply business authentication to remaining routes
router.use(requireBusiness);

/**
 * @route   GET /api/business/dashboard
 * @desc    Business dashboard data
 * @access  Private (Business)
 */
router.get('/dashboard', asyncHandler(businessController.getDashboard));

/**
 * @route   GET /api/business/settlements
 * @desc    Get settlement history
 * @access  Private (Business)
 */
router.get('/settlements',
  validate([
    commonValidations.page(),
    commonValidations.limit(),
  ]),
  asyncHandler(businessController.getSettlements)
);

/**
 * @route   POST /api/business/settlements/request
 * @desc    Request settlement
 * @access  Private (Business)
 */
router.post('/settlements/request', 
  // settlementValidations.request,
  asyncHandler(businessController.requestSettlement)
);

// Mount review management routes
router.use('/reviews', businessReviewRoutes);

export default router;