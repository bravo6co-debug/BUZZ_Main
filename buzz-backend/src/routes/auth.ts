import express from 'express';
import authController from '../controllers/auth.controller';
import { asyncHandler } from '../middleware/errorHandler';
import { authValidations } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimit';
import { requireAuth, requireSuperAdmin } from '../middleware/auth';

const router = express.Router();

// Apply auth rate limiting to all routes
router.use(authLimiter);

/**
 * @route   POST /api/auth/social/google
 * @desc    Google social login for Buzz app users
 * @access  Public
 */
router.post('/social/google', authValidations.socialLogin, asyncHandler(authController.googleLogin));

/**
 * @route   POST /api/auth/social/kakao
 * @desc    Kakao social login for Buzz app users
 * @access  Public
 */
router.post('/social/kakao', authValidations.socialLogin, asyncHandler(authController.kakaoLogin));

/**
 * @route   POST /api/auth/login
 * @desc    Email login for Buzz-Biz/Admin users
 * @access  Public
 */
router.post('/login', authValidations.emailLogin, asyncHandler(authController.emailLogin));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authValidations.refreshToken, asyncHandler(authController.refreshToken));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate token)
 * @access  Private
 */
router.post('/logout', requireAuth, asyncHandler(authController.logout));

/**
 * @route   POST /api/auth/verify-2fa
 * @desc    Verify 2FA code
 * @access  Public
 */
router.post('/verify-2fa', asyncHandler(authController.verify2FA));

export default router;