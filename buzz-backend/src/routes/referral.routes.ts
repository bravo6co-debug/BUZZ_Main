import express from 'express';
import referralController from '../controllers/referral.controller';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth, optionalAuthenticate } from '../middleware/auth';
import { validate, commonValidations, referralValidations } from '../middleware/validation';
import { body, query } from 'express-validator';

const router = express.Router();

/**
 * @route   GET /api/referral/code
 * @desc    Get user's referral code
 * @access  Private
 */
router.get('/code', requireAuth, asyncHandler(referralController.getReferralCode));

/**
 * @route   POST /api/referral/track
 * @desc    Track referral visit
 * @access  Public
 */
router.post('/track',
  validate([
    body('referralCode')
      .notEmpty()
      .withMessage('Referral code is required')
      .matches(/^BUZZ-[A-Z0-9]{6}$/)
      .withMessage('Invalid referral code format'),
    body('metadata').optional().isObject(),
  ]),
  asyncHandler(referralController.trackReferral)
);

/**
 * @route   GET /api/referral/stats
 * @desc    Get referral statistics
 * @access  Private
 */
router.get('/stats',
  requireAuth,
  validate([
    query('timeframe').optional().isIn(['all', 'month', 'week']),
  ]),
  asyncHandler(referralController.getReferralStats)
);

/**
 * @route   GET /api/referral/leaderboard
 * @desc    Get referral leaderboard
 * @access  Public (optional auth for user's rank)
 */
router.get('/leaderboard',
  optionalAuthenticate,
  validate([
    query('timeframe').optional().isIn(['all', 'month', 'week']),
    commonValidations.page(),
    commonValidations.limit(),
  ]),
  asyncHandler(referralController.getLeaderboard)
);

/**
 * @route   POST /api/referral/claim-reward
 * @desc    Claim referral reward (mileage or discount QR)
 * @access  Private
 */
router.post('/claim-reward',
  requireAuth,
  validate([
    body('rewardType')
      .notEmpty()
      .isIn(['mileage', 'discount_qr'])
      .withMessage('Invalid reward type'),
    body('referralIds')
      .optional()
      .isArray()
      .withMessage('Referral IDs must be an array'),
  ]),
  asyncHandler(referralController.claimReward)
);

/**
 * @route   GET /api/referral/discount-qr/:code
 * @desc    Get discount QR code image
 * @access  Private
 */
router.get('/discount-qr/:code',
  requireAuth,
  asyncHandler(referralController.getDiscountQR)
);

/**
 * @route   GET /api/referral/available-rewards
 * @desc    Get available rewards for user
 * @access  Private
 */
router.get('/available-rewards',
  requireAuth,
  asyncHandler(referralController.getAvailableRewards)
);

export default router;