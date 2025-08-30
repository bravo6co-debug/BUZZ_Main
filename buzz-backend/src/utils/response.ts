import { Response } from 'express';
import { ApiResponse, ApiError as IApiError, PaginationResult } from '../types';

/**
 * Success response utility
 */
export class ApiSuccess {
  constructor(
    public data?: any,
    public message?: string
  ) {}

  send(res: Response, statusCode: number = 200): Response {
    const response: ApiResponse = {
      success: true,
      data: this.data,
      message: this.message || '',
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
  }
}

/**
 * Error response utility
 */
export class ApiError {
  constructor(
    public code: string,
    public message: string,
    public details?: any
  ) {}

  send(res: Response, statusCode: number = 400): Response {
    const response: IApiError = {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: new Date().toISOString(),
      },
    };

    return res.status(statusCode).json(response);
  }
}

/**
 * Pagination response utility
 */
export class PaginatedResponse<T> {
  constructor(
    public data: T[],
    public total: number,
    public page: number,
    public limit: number,
    public message?: string
  ) {}

  send(res: Response, statusCode: number = 200): Response {
    const totalPages = Math.ceil(this.total / this.limit);
    const hasNext = this.page < totalPages;
    const hasPrev = this.page > 1;

    const result: PaginationResult<T> = {
      data: this.data,
      pagination: {
        total: this.total,
        page: this.page,
        limit: this.limit,
        totalPages,
        hasNext,
        hasPrev,
      },
    };

    const response: ApiResponse<PaginationResult<T>> = {
      success: true,
      data: result,
      message: this.message || '',
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
  }
}

/**
 * Send success response
 */
export const sendSuccess = (
  res: Response,
  data?: any,
  message?: string,
  statusCode: number = 200
): Response => {
  return new ApiSuccess(data, message).send(res, statusCode);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  code: string,
  message: string,
  details?: any,
  statusCode: number = 400
): Response => {
  return new ApiError(code, message, details).send(res, statusCode);
};

/**
 * Send paginated response
 */
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string,
  statusCode: number = 200
): Response => {
  return new PaginatedResponse(data, total, page, limit, message).send(res, statusCode);
};

/**
 * Send created response
 */
export const sendCreated = (
  res: Response,
  data?: any,
  message: string = 'Resource created successfully'
): Response => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Send no content response
 */
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Common error responses
 */
export const Errors = {
  // Authentication Errors
  UNAUTHORIZED: (details?: any) => new ApiError('AUTH_001', 'Authentication required', details),
  TOKEN_EXPIRED: (details?: any) => new ApiError('AUTH_002', 'Token has expired', details),
  FORBIDDEN: (details?: any) => new ApiError('AUTH_003', 'Insufficient permissions', details),
  INVALID_CREDENTIALS: (details?: any) => new ApiError('AUTH_004', 'Invalid credentials', details),

  // Validation Errors
  VALIDATION_ERROR: (details?: any) => new ApiError('VALIDATION_001', 'Validation failed', details),
  INVALID_FORMAT: (details?: any) => new ApiError('VALIDATION_002', 'Invalid data format', details),
  MISSING_FIELD: (field: string) => new ApiError('VALIDATION_003', `Missing required field: ${field}`),
  DUPLICATE_ENTRY: (field: string) => new ApiError('VALIDATION_004', `${field} already exists`),

  // Resource Errors
  NOT_FOUND: (resource: string = 'Resource') => new ApiError('RESOURCE_001', `${resource} not found`),
  ALREADY_EXISTS: (resource: string) => new ApiError('RESOURCE_002', `${resource} already exists`),
  CONFLICT: (message: string) => new ApiError('RESOURCE_003', message),

  // Business Logic Errors
  BUDGET_EXCEEDED: (details?: any) => new ApiError('BUDGET_001', 'Budget limit exceeded', details),
  SERVICE_UNAVAILABLE: (service: string) => new ApiError('BUDGET_002', `${service} temporarily unavailable due to budget constraints`),
  BUSINESS_NOT_APPROVED: () => new ApiError('BUSINESS_001', 'Business account not approved'),
  INVALID_QR_CODE: () => new ApiError('QR_001', 'Invalid or expired QR code'),
  COUPON_EXPIRED: () => new ApiError('COUPON_001', 'Coupon has expired'),
  INSUFFICIENT_BALANCE: () => new ApiError('MILEAGE_001', 'Insufficient mileage balance'),

  // Rate Limiting Errors
  RATE_LIMIT_EXCEEDED: (details?: any) => new ApiError('RATE_001', 'Too many requests', details),

  // Server Errors
  INTERNAL_ERROR: (details?: any) => new ApiError('SERVER_001', 'Internal server error', details),
  DATABASE_ERROR: (details?: any) => new ApiError('SERVER_002', 'Database error', details),
  EXTERNAL_SERVICE_ERROR: (service: string, details?: any) => 
    new ApiError('SERVER_003', `External service error: ${service}`, details),
};

export default {
  ApiSuccess,
  ApiError,
  PaginatedResponse,
  sendSuccess,
  sendError,
  sendPaginated,
  sendCreated,
  sendNoContent,
  Errors,
};