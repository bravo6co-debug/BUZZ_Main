import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { sendError } from '../utils/response';

/**
 * Standard rate limiter
 */
export const standardLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes
  max: config.rateLimit.maxRequests, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_001',
      message: 'Too many requests, please try again later',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    sendError(
      res,
      'RATE_001',
      'Too many requests, please try again later',
      {
        limit: config.rateLimit.maxRequests,
        windowMs: config.rateLimit.windowMs,
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
      },
      429
    );
  },
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 authentication requests per windowMs
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: {
      code: 'RATE_001',
      message: 'Too many authentication attempts, please try again later',
      timestamp: new Date().toISOString(),
    },
  },
  handler: (req, res) => {
    sendError(
      res,
      'RATE_001',
      'Too many authentication attempts, please try again later',
      {
        limit: 10,
        windowMs: 15 * 60 * 1000,
        retryAfter: 15 * 60, // 15 minutes in seconds
      },
      429
    );
  },
});

/**
 * Lenient rate limiter for public endpoints
 */
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // limit each IP to 60 requests per windowMs for public endpoints
  message: {
    success: false,
    error: {
      code: 'RATE_001',
      message: 'Too many requests from this IP, please try again later',
      timestamp: new Date().toISOString(),
    },
  },
  handler: (req, res) => {
    sendError(
      res,
      'RATE_001',
      'Too many requests from this IP, please try again later',
      {
        limit: 60,
        windowMs: 15 * 60 * 1000,
        retryAfter: Math.ceil((15 * 60 * 1000) / 1000),
      },
      429
    );
  },
});

/**
 * Admin rate limiter (more lenient for authenticated admin users)
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // higher limit for admin endpoints
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise fall back to IP
    return req.user?.userId || req.ip;
  },
  message: {
    success: false,
    error: {
      code: 'RATE_001',
      message: 'Too many admin requests, please try again later',
      timestamp: new Date().toISOString(),
    },
  },
  handler: (req, res) => {
    sendError(
      res,
      'RATE_001',
      'Too many admin requests, please try again later',
      {
        limit: 600,
        windowMs: 15 * 60 * 1000,
        retryAfter: Math.ceil((15 * 60 * 1000) / 1000),
      },
      429
    );
  },
});

/**
 * Upload rate limiter
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 upload requests per hour
  message: {
    success: false,
    error: {
      code: 'RATE_001',
      message: 'Too many upload requests, please try again later',
      timestamp: new Date().toISOString(),
    },
  },
  handler: (req, res) => {
    sendError(
      res,
      'RATE_001',
      'Too many upload requests, please try again later',
      {
        limit: 50,
        windowMs: 60 * 60 * 1000,
        retryAfter: 60 * 60, // 1 hour in seconds
      },
      429
    );
  },
});

/**
 * QR code generation limiter
 */
export const qrLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each user to 20 QR generations per 5 minutes
  keyGenerator: (req) => {
    return req.user?.userId || req.ip;
  },
  message: {
    success: false,
    error: {
      code: 'RATE_001',
      message: 'Too many QR code generations, please try again later',
      timestamp: new Date().toISOString(),
    },
  },
  handler: (req, res) => {
    sendError(
      res,
      'RATE_001',
      'Too many QR code generations, please try again later',
      {
        limit: 20,
        windowMs: 5 * 60 * 1000,
        retryAfter: 5 * 60, // 5 minutes in seconds
      },
      429
    );
  },
});

export default {
  standardLimiter,
  authLimiter,
  publicLimiter,
  adminLimiter,
  uploadLimiter,
  qrLimiter,
};