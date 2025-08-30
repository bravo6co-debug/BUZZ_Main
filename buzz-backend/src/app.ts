import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { config } from './config';
import { stream } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { standardLimiter } from './middleware/rateLimit';

// Import routes
import apiRoutes from './routes/index';

/**
 * Create Express application
 */
const createApp = (): express.Application => {
  const app = express();

  // Security middleware
  app.use(helmet({
    crossOriginEmbedderPolicy: false, // Disable for development
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: config.security.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma'
    ],
    credentials: true,
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression middleware
  app.use(compression());

  // HTTP request logging
  app.use(morgan(
    config.server.env === 'production'
      ? 'combined'
      : 'dev',
    { stream }
  ));

  // Rate limiting
  app.use(standardLimiter);

  // Health check endpoint (before authentication)
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: config.server.env,
    });
  });

  // Mount API routes
  app.use('/api', apiRoutes);

  // Swagger documentation (if enabled)
  if (config.swagger.enabled) {
    // Swagger setup will be added here
    app.get('/docs', (_req, res) => {
      res.json({
        message: 'API Documentation',
        version: config.swagger.apiVersion,
        baseUrl: `/api`,
      });
    });
  }

  // Static files serving (for uploads)
  app.use('/uploads', express.static('uploads'));

  // Handle 404 errors
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
};

export default createApp;