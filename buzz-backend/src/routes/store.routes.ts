import express from 'express';
import storeController from '../controllers/store.controller';
import { asyncHandler } from '../middleware/errorHandler';
import { optionalAuthenticate, requireAuth } from '../middleware/auth';
import { validate, commonValidations, storeValidations } from '../middleware/validation';
import { body, query } from 'express-validator';

const router = express.Router();

/**
 * @route   GET /api/stores
 * @desc    Get store list with filters
 * @access  Public (optional auth for personalization)
 */
router.get('/', 
  optionalAuthenticate,
  validate([
    query('category').optional().isIn(['cafe', 'restaurant', 'shop']),
    query('latitude').optional().isFloat({ min: -90, max: 90 }),
    query('longitude').optional().isFloat({ min: -180, max: 180 }),
    query('radius').optional().isInt({ min: 100, max: 50000 }),
    query('sortBy').optional().isIn(['distance', 'rating', 'reviews', 'name']),
    query('search').optional().isLength({ max: 100 }),
    commonValidations.page(),
    commonValidations.limit(),
  ]),
  asyncHandler(storeController.getStores)
);

/**
 * @route   GET /api/stores/search
 * @desc    Search stores
 * @access  Public
 */
router.get('/search',
  optionalAuthenticate,
  validate([
    query('q').notEmpty().withMessage('Search query is required').isLength({ max: 100 }),
    query('category').optional().isIn(['cafe', 'restaurant', 'shop']),
    query('latitude').optional().isFloat({ min: -90, max: 90 }),
    query('longitude').optional().isFloat({ min: -180, max: 180 }),
    commonValidations.page(),
    commonValidations.limit(),
  ]),
  asyncHandler(storeController.searchStores)
);

/**
 * @route   GET /api/stores/categories
 * @desc    Get store categories
 * @access  Public
 */
router.get('/categories', asyncHandler(storeController.getCategories));

/**
 * @route   GET /api/stores/:id
 * @desc    Get store details
 * @access  Public
 */
router.get('/:id',
  optionalAuthenticate,
  validate([
    commonValidations.businessId(),
  ]),
  asyncHandler(storeController.getStoreById)
);

/**
 * @route   POST /api/stores/:id/review
 * @desc    Add store review
 * @access  Private
 */
router.post('/:id/review',
  requireAuth,
  validate([
    commonValidations.businessId(),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').optional().isLength({ min: 10, max: 500 }).withMessage('Review must be between 10-500 characters'),
    body('images').optional().isArray({ max: 5 }).withMessage('Maximum 5 images allowed'),
  ]),
  asyncHandler(storeController.addReview)
);

export default router;