import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { sendError } from '../utils/response';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    sendError(
      res,
      'VALIDATION_001',
      'Validation failed',
      errors.array(),
      400
    );
    return;
  }
  
  next();
};

/**
 * Validation middleware factory
 */
export const validate = (validations: ValidationChain[]) => {
  return [
    ...validations,
    handleValidationErrors,
  ];
};

// Common validation rules
export const commonValidations = {
  // User validations
  email: () => body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  password: () => body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  name: () => body('name').isLength({ min: 2, max: 100 }).trim().withMessage('Name must be between 2-100 characters'),
  phone: () => body('phone').optional().isMobilePhone('ko-KR').withMessage('Invalid phone number format'),
  
  // UUID validations
  userId: () => param('userId').isUUID().withMessage('Invalid user ID format'),
  businessId: () => param('businessId').isUUID().withMessage('Invalid business ID format'),
  couponId: () => param('couponId').isUUID().withMessage('Invalid coupon ID format'),
  settlementId: () => param('settlementId').isUUID().withMessage('Invalid settlement ID format'),
  
  // Pagination validations
  page: () => query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  limit: () => query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
  
  // Business validations
  businessName: () => body('businessName').isLength({ min: 2, max: 200 }).trim().withMessage('Business name must be between 2-200 characters'),
  businessNumber: () => body('businessNumber').optional().matches(/^\d{3}-\d{2}-\d{5}$/).withMessage('Invalid business registration number format'),
  category: () => body('category').isIn(['cafe', 'restaurant', 'shop']).withMessage('Invalid business category'),
  address: () => body('address').isLength({ min: 10, max: 500 }).trim().withMessage('Address must be between 10-500 characters'),
  
  // Amount validations
  amount: () => body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  discountValue: () => body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be positive'),
  
  // Date validations
  date: (field: string) => body(field).isISO8601().withMessage(`${field} must be a valid date`),
  
  // Enum validations
  userRole: () => body('role').isIn(['user', 'business', 'admin']).withMessage('Invalid user role'),
  couponType: () => body('type').isIn(['signup', 'referral', 'event', 'basic']).withMessage('Invalid coupon type'),
  discountType: () => body('discountType').isIn(['fixed', 'percentage']).withMessage('Invalid discount type'),
  status: (validStatuses: string[]) => body('status').isIn(validStatuses).withMessage(`Status must be one of: ${validStatuses.join(', ')}`),
};

// Specific validation sets for endpoints
export const authValidations = {
  socialLogin: validate([
    body('idToken').optional().notEmpty().withMessage('ID token is required for Google login'),
    body('accessToken').optional().notEmpty().withMessage('Access token is required for Kakao login'),
    body('additionalInfo.phone').optional().isMobilePhone('ko-KR'),
    body('additionalInfo.university').optional().isLength({ max: 100 }),
    body('additionalInfo.referralCode').optional().matches(/^BUZZ-[A-Z0-9]{6}$/),
    body('additionalInfo.marketingAgree').optional().isBoolean(),
  ]),
  
  emailLogin: validate([
    commonValidations.email(),
    body('password').notEmpty().withMessage('Password is required'),
    body('type').isIn(['business', 'admin']).withMessage('Login type must be business or admin'),
  ]),
  
  refreshToken: validate([
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  ]),
  
  createAdmin: validate([
    commonValidations.email(),
    commonValidations.name(),
    commonValidations.userRole(),
    body('temporaryPassword').optional().isLength({ min: 8 }),
    body('requirePasswordChange').optional().isBoolean(),
  ]),
};

export const businessValidations = {
  apply: validate([
    commonValidations.email(),
    commonValidations.password(),
    body('businessInfo.name').isLength({ min: 2, max: 200 }).trim(),
    body('businessInfo.registrationNumber').matches(/^\d{3}-\d{2}-\d{5}$/),
    body('businessInfo.category').isIn(['cafe', 'restaurant', 'shop']),
    body('businessInfo.address').isLength({ min: 10, max: 500 }).trim(),
    body('businessInfo.phone').isMobilePhone('ko-KR'),
    body('businessInfo.bankAccount.bankName').notEmpty(),
    body('businessInfo.bankAccount.accountNumber').notEmpty(),
    body('businessInfo.bankAccount.accountHolder').notEmpty(),
    body('documents').optional().isArray(),
  ]),
  
  register: validate([
    commonValidations.businessName(),
    commonValidations.businessNumber(),
    commonValidations.category(),
    body('description').optional().isLength({ max: 1000 }).trim(),
    commonValidations.address(),
    commonValidations.phone(),
    body('businessHours').optional().isObject(),
    body('images').optional().isArray({ max: 10 }),
  ]),
  
  approve: validate([
    body('approved').isBoolean().withMessage('Approved status is required'),
    body('businessName').optional().isLength({ min: 2, max: 200 }),
    body('category').optional().isIn(['cafe', 'restaurant', 'shop']),
    body('reason').optional().isLength({ max: 500 }),
  ]),
  
  reject: validate([
    body('reason').isLength({ min: 10, max: 500 }).withMessage('Rejection reason is required (10-500 characters)'),
  ]),
};

export const couponValidations = {
  create: validate([
    body('name').isLength({ min: 2, max: 200 }).trim(),
    commonValidations.couponType(),
    commonValidations.discountType(),
    commonValidations.discountValue(),
    body('minPurchaseAmount').optional().isFloat({ min: 0 }),
    body('maxDiscountAmount').optional().isFloat({ min: 0 }),
    body('totalQuantity').optional().isInt({ min: 1 }),
    body('applicableBusinesses').optional().isArray(),
  ]),
  
  use: validate([
    body('qrCode').notEmpty().withMessage('QR code is required'),
    body('purchaseAmount').optional().isFloat({ min: 0 }),
  ]),
};

export const mileageValidations = {
  use: validate([
    body('qrCode').notEmpty().withMessage('QR code is required'),
    commonValidations.amount(),
  ]),
};

export const settlementValidations = {
  request: validate([
    body('settlementDate').isISO8601().withMessage('Valid settlement date is required'),
    body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be positive'),
    body('bankInfo.bankName').notEmpty().withMessage('Bank name is required'),
    body('bankInfo.accountNumber').notEmpty().withMessage('Account number is required'),
    body('transactions.coupon.count').optional().isInt({ min: 0 }),
    body('transactions.coupon.amount').optional().isFloat({ min: 0 }),
    body('transactions.mileage.count').optional().isInt({ min: 0 }),
    body('transactions.mileage.amount').optional().isFloat({ min: 0 }),
  ]),
  
  approve: validate([
    body('approved').isBoolean().withMessage('Approval status is required'),
    body('adminNote').optional().isLength({ max: 500 }),
  ]),
};

export const userValidations = {
  updateProfile: validate([
    body('name').optional().isLength({ min: 2, max: 100 }).trim(),
    body('phone').optional().isMobilePhone('ko-KR'),
    body('birthDate').optional().isISO8601().withMessage('Invalid birth date format'),
    body('gender').optional().isIn(['male', 'female', 'other']),
    body('university').optional().isLength({ max: 100 }).trim(),
    body('marketingAgree').optional().isBoolean(),
  ]),
};

export const storeValidations = {
  addReview: validate([
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').optional().isLength({ min: 10, max: 500 }).withMessage('Review must be between 10-500 characters'),
    body('images').optional().isArray({ max: 5 }).withMessage('Maximum 5 images allowed'),
  ]),
};

export const referralValidations = {
  track: validate([
    body('referralCode').notEmpty().matches(/^BUZZ-[A-Z0-9]{6}$/),
    body('metadata').optional().isObject(),
  ]),
};

export default {
  validate,
  handleValidationErrors,
  commonValidations,
  authValidations,
  businessValidations,
  couponValidations,
  mileageValidations,
  settlementValidations,
  userValidations,
  storeValidations,
  referralValidations,
};