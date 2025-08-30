import express from 'express';
import { getDatabase } from '../config/knex';
import { config } from '../config';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.server.env,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      api: 'healthy',
      database: 'unknown',
      redis: 'unknown',
    },
  };

  try {
    // Check database connection
    const db = getDatabase();
    await db.raw('SELECT 1+1 as result');
    healthStatus.services.database = 'healthy';
  } catch (error) {
    healthStatus.services.database = 'unhealthy';
    healthStatus.status = 'unhealthy';
  }

  // TODO: Add Redis health check when implemented
  // healthStatus.services.redis = 'healthy';

  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
  
  if (statusCode === 200) {
    sendSuccess(res, healthStatus, 'System is healthy', statusCode);
  } else {
    sendError(res, 'HEALTH_001', 'System health check failed', healthStatus, statusCode);
  }
}));

/**
 * @route   GET /health/detailed
 * @desc    Detailed health check with system information
 * @access  Public
 */
router.get('/detailed', asyncHandler(async (req, res) => {
  const detailedHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.server.env,
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    },
    services: {
      api: 'healthy',
      database: {
        status: 'unknown',
        responseTime: 0,
      },
    },
  };

  try {
    // Check database connection with timing
    const db = getDatabase();
    const start = Date.now();
    await db.raw('SELECT 1+1 as result');
    const responseTime = Date.now() - start;
    
    detailedHealth.services.database = {
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    detailedHealth.services.database = {
      status: 'unhealthy',
      responseTime: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    detailedHealth.status = 'unhealthy';
  }

  const statusCode = detailedHealth.status === 'healthy' ? 200 : 503;
  
  if (statusCode === 200) {
    sendSuccess(res, detailedHealth, 'Detailed system health check', statusCode);
  } else {
    sendError(res, 'HEALTH_001', 'System health check failed', detailedHealth, statusCode);
  }
}));

export default router;