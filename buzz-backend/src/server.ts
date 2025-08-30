import createApp from './app';
import { config } from './config';
import { initDatabase, closeDatabase } from './config/knex';
import { log } from './utils/logger';

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    // Initialize database connection
    log.info('Initializing database connection...');
    const db = initDatabase();
    
    // Test database connection
    await db.raw('SELECT 1+1 as result');
    log.info('Database connection established successfully');
    
    // Create Express application
    const app = createApp();
    
    // Start HTTP server
    const server = app.listen(config.server.port, config.server.host, () => {
      log.info(`Server started successfully with port security`, {
        host: config.server.host,
        port: config.server.port,
        environment: config.server.env,
        nodeVersion: process.version,
        pid: process.pid,
        portSecurity: {
          isSecure: config.server.portSecurity.isSecure,
          allowedPorts: config.server.portSecurity.allowedPorts,
          securityHash: config.server.portSecurity.securityHash.substring(0, 8) + '...',
        }
      });
      
      if (config.server.env === 'development') {
        log.info(`Server URLs:`, {
          local: `http://${config.server.host}:${config.server.port}`,
          api: `http://${config.server.host}:${config.server.port}/api`,
          health: `http://${config.server.host}:${config.server.port}/health`,
          docs: config.swagger.enabled ? `http://${config.server.host}:${config.server.port}/docs` : 'disabled',
        });
      }
    });
    
    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string): Promise<void> => {
      log.info(`Received ${signal}. Starting graceful shutdown...`);
      
      // Close HTTP server
      server.close(async () => {
        log.info('HTTP server closed');
        
        try {
          // Close database connections
          await closeDatabase();
          log.info('Database connections closed');
          
          log.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          log.error('Error during graceful shutdown', error);
          process.exit(1);
        }
      });
      
      // Force close after timeout
      setTimeout(() => {
        log.error('Forceful shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      log.error('Uncaught Exception', error);
      gracefulShutdown('uncaughtException');
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      log.error('Unhandled Rejection', { reason, promise });
      gracefulShutdown('unhandledRejection');
    });
    
  } catch (error) {
    log.error('Failed to start server', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export default startServer;