import express from 'express';
import settlementController from '../controllers/settlement.controller';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth, requireBusiness, requireAdmin } from '../middleware/auth';
import { validate, commonValidations, settlementValidations } from '../middleware/validation';
import { body, query } from 'express-validator';

const router = express.Router();

// Apply authentication to all settlement routes
router.use(requireAuth);

/**
 * @route   POST /api/settlements/request
 * @desc    Request settlement
 * @access  Private (Business)
 */
router.post('/request',
  requireBusiness,
  settlementValidations.request,
  asyncHandler(settlementController.requestSettlement)
);

/**
 * @route   GET /api/settlements
 * @desc    Get settlement history
 * @access  Private (Business/Admin)
 */
router.get('/',
  validate([
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'paid']),
    commonValidations.page(),
    commonValidations.limit(),
  ]),
  asyncHandler(settlementController.getSettlements)
);

/**
 * @route   GET /api/settlements/:id
 * @desc    Get settlement details
 * @access  Private (Business/Admin)
 */
router.get('/:id',
  validate([
    commonValidations.settlementId(),
  ]),
  asyncHandler(settlementController.getSettlementById)
);

/**
 * @route   POST /api/settlements/:id/cancel
 * @desc    Cancel settlement request
 * @access  Private (Business only, pending status only)
 */
router.post('/:id/cancel',
  requireBusiness,
  validate([
    commonValidations.settlementId(),
    body('reason').optional().isLength({ max: 500 }),
  ]),
  asyncHandler(settlementController.cancelSettlement)
);

export default router;