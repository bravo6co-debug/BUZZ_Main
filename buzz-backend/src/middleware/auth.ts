import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractBearerToken } from '../utils/auth';
import { JWTPayload, UserRole } from '../types';
import { ApiError } from '../utils/response';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and adds user to request
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    
    if (!token) {
      res.status(401).json(new ApiError('AUTH_001', 'Authentication token is required'));
      return;
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json(new ApiError('AUTH_002', 'Invalid or expired token'));
  }
};

/**
 * Optional authentication middleware
 * Adds user to request if token is provided and valid
 */
export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    
    if (token) {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

/**
 * Authorization middleware factory
 * Creates middleware that checks for specific roles
 */
export const authorize = (roles: UserRole | UserRole[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(new ApiError('AUTH_001', 'Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json(new ApiError('AUTH_003', 'Insufficient permissions'));
      return;
    }

    next();
  };
};

/**
 * Admin authorization middleware
 */
export const requireAdmin = authorize(UserRole.ADMIN);

/**
 * Business authorization middleware
 */
export const requireBusiness = authorize([UserRole.BUSINESS, UserRole.ADMIN]);

/**
 * User authorization middleware (any authenticated user)
 */
export const requireAuth = authenticate;

/**
 * Super admin authorization middleware
 * For operations that require the highest level of access
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json(new ApiError('AUTH_001', 'Authentication required'));
    return;
  }

  if (req.user.role !== UserRole.ADMIN) {
    res.status(403).json(new ApiError('AUTH_003', 'Super admin access required'));
    return;
  }

  // Additional check for super admin specific operations
  // This could be enhanced with more granular permissions
  next();
};

/**
 * Require specific roles middleware
 * Alternative naming for authorize function
 */
export const requireRole = (roles: UserRole | UserRole[]) => {
  return authorize(roles);
};

/**
 * Resource owner authorization middleware
 * Allows access if user is the resource owner or admin
 */
export const requireOwnershipOrAdmin = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(new ApiError('AUTH_001', 'Authentication required'));
      return;
    }

    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
    
    if (req.user.role === UserRole.ADMIN || req.user.userId === resourceUserId) {
      next();
    } else {
      res.status(403).json(new ApiError('AUTH_003', 'Access denied'));
    }
  };
};

export default {
  authenticate,
  optionalAuthenticate,
  authorize,
  requireRole,
  requireAdmin,
  requireBusiness,
  requireAuth,
  requireSuperAdmin,
  requireOwnershipOrAdmin,
};