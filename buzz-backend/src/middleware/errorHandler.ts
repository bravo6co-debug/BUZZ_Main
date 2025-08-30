import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger';
import { ApiError } from '../utils/response';
import { config } from '../config';

interface CustomError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const isDevelopment = config.server.env === 'development';
  
  // Log the error
  log.apiError(req.method, req.path, error, req.user?.userId);
  
  // Default error values
  let status = error.status || 500;
  let code = error.code || 'SERVER_001';
  let message = error.message || 'Internal server error';
  let details = error.details;
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    status = 400;
    code = 'VALIDATION_001';
    message = 'Validation failed';
    details = error.details || error.message;
  } else if (error.name === 'UnauthorizedError') {
    status = 401;
    code = 'AUTH_001';
    message = 'Authentication required';
  } else if (error.name === 'JsonWebTokenError') {
    status = 401;
    code = 'AUTH_002';
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    status = 401;
    code = 'AUTH_002';
    message = 'Token has expired';
  } else if (error.name === 'CastError') {
    status = 400;
    code = 'VALIDATION_002';
    message = 'Invalid data format';
  } else if (error.name === 'MongoError' || error.name === 'PostgresError') {
    status = 500;
    code = 'SERVER_002';
    message = 'Database error';
    // Don't expose database errors in production
    if (!isDevelopment) {
      details = undefined;
    }
  } else if (error.code === 'ENOTFOUND') {
    status = 503;
    code = 'SERVER_003';
    message = 'External service unavailable';
  } else if (error.code === 'ECONNREFUSED') {
    status = 503;
    code = 'SERVER_003';
    message = 'Service connection refused';
  }
  
  // Handle Knex/PostgreSQL specific errors
  if (error.code === '23505') { // Unique constraint violation
    status = 409;
    code = 'VALIDATION_004';
    message = 'Duplicate entry';
  } else if (error.code === '23503') { // Foreign key constraint violation
    status = 400;
    code = 'VALIDATION_002';
    message = 'Invalid reference';
  } else if (error.code === '23502') { // Not null constraint violation
    status = 400;
    code = 'VALIDATION_001';
    message = 'Missing required field';
  }
  
  // Create API error response
  const apiError = new ApiError(code, message, isDevelopment ? details : undefined);
  
  // Send error response
  apiError.send(res, status);
};

/**
 * Handle 404 errors (route not found)
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new ApiError(
    'ROUTE_001',
    `Route ${req.method} ${req.path} not found`
  );
  
  error.send(res, 404);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch and forward errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Database error handler
 */
export const handleDatabaseError = (error: any): CustomError => {
  const dbError: CustomError = new Error();
  
  if (error.code === '23505') {
    // Unique constraint violation
    dbError.status = 409;
    dbError.code = 'VALIDATION_004';
    dbError.message = 'Duplicate entry';
    dbError.details = error.detail;
  } else if (error.code === '23503') {
    // Foreign key constraint violation
    dbError.status = 400;
    dbError.code = 'VALIDATION_002';
    dbError.message = 'Invalid reference';
    dbError.details = error.detail;
  } else if (error.code === '23502') {
    // Not null constraint violation
    dbError.status = 400;
    dbError.code = 'VALIDATION_001';
    dbError.message = 'Missing required field';
    dbError.details = error.detail;
  } else if (error.code === '42P01') {
    // Table does not exist
    dbError.status = 500;
    dbError.code = 'SERVER_002';
    dbError.message = 'Database table not found';
  } else {
    // Generic database error
    dbError.status = 500;
    dbError.code = 'SERVER_002';
    dbError.message = 'Database error';
    dbError.details = config.server.env === 'development' ? error.message : undefined;
  }
  
  return dbError;
};

/**
 * External service error handler
 */
export const handleExternalServiceError = (
  serviceName: string,
  error: any
): CustomError => {
  const serviceError: CustomError = new Error();
  
  serviceError.status = error.status || 503;
  serviceError.code = 'SERVER_003';
  serviceError.message = `External service error: ${serviceName}`;
  serviceError.details = config.server.env === 'development' ? error.message : undefined;
  
  return serviceError;
};

/**
 * Validation error handler
 */
export const handleValidationError = (errors: any[]): CustomError => {
  const validationError: CustomError = new Error();
  
  validationError.status = 400;
  validationError.code = 'VALIDATION_001';
  validationError.message = 'Validation failed';
  validationError.details = errors;
  
  return validationError;
};

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleDatabaseError,
  handleExternalServiceError,
  handleValidationError,
};