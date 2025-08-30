import express from 'express';
import userController from '../controllers/user.controller';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { validate, commonValidations, userValidations } from '../middleware/validation';

const router = express.Router();

// Apply authentication to all user routes
router.use(requireAuth);

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', asyncHandler(userController.getProfile));

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', userValidations.updateProfile, asyncHandler(userController.updateProfile));

/**
 * @route   GET /api/users/mileage
 * @desc    Get mileage balance and history
 * @access  Private
 */
router.get('/mileage', 
  validate([
    commonValidations.page(),
    commonValidations.limit(),
  ]),
  asyncHandler(userController.getMileage)
);

/**
 * @route   GET /api/users/coupons
 * @desc    Get user's coupons
 * @access  Private
 */
router.get('/coupons',
  validate([
    commonValidations.page(),
    commonValidations.limit(),
  ]),
  asyncHandler(userController.getCoupons)
);

/**
 * @route   GET /api/users/referral-stats
 * @desc    Get referral statistics
 * @access  Private
 */
router.get('/referral-stats', asyncHandler(userController.getReferralStats));

export default router;