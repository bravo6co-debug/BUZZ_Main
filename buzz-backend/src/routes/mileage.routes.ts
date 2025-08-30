import express from 'express';
import mileageController from '../controllers/mileage.controller';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { validate, commonValidations, mileageValidations } from '../middleware/validation';
import { query } from 'express-validator';

const router = express.Router();

// Apply authentication to all mileage routes
router.use(requireAuth);

/**
 * @route   GET /api/mileage/balance
 * @desc    Get mileage balance
 * @access  Private
 */
router.get('/balance', asyncHandler(mileageController.getBalance));

/**
 * @route   POST /api/mileage/use
 * @desc    Use mileage
 * @access  Private
 */
router.post('/use', mileageValidations.use, asyncHandler(mileageController.useMileage));

/**
 * @route   GET /api/mileage/history
 * @desc    Get transaction history
 * @access  Private
 */
router.get('/history',
  validate([
    query('type').optional().isIn(['earn', 'use', 'expire', 'cancel', 'refund']),
    commonValidations.page(),
    commonValidations.limit(),
  ]),
  asyncHandler(mileageController.getHistory)
);

/**
 * @route   GET /api/mileage/opportunities
 * @desc    Get mileage earning opportunities
 * @access  Private
 */
router.get('/opportunities', asyncHandler(mileageController.getEarningOpportunities));

export default router;