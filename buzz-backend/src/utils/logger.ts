import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../config';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = (): string => {
  const env = config.server.env || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define format for logs
const format = winston.format.combine(
  // Add timestamp
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  // Add colors to log level
  winston.format.colorize({ all: true }),
  // Define format of log message
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Define transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    level: level(),
    format: format,
  }),
];

// Add file transports only if not in test environment
if (config.server.env !== 'test') {
  // Error log file
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      handleExceptions: true,
      maxSize: config.logging.fileSize,
      maxFiles: config.logging.maxFiles,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    })
  );

  // Combined log file
  transports.push(
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.fileSize,
      maxFiles: config.logging.maxFiles,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    })
  );

  // HTTP requests log file
  transports.push(
    new DailyRotateFile({
      filename: 'logs/http-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxSize: config.logging.fileSize,
      maxFiles: config.logging.maxFiles,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  );
}

// Create winston logger
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  // Handle exceptions and rejections
  exceptionHandlers: config.server.env !== 'test' ? [
    new DailyRotateFile({
      filename: 'logs/exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.fileSize,
      maxFiles: config.logging.maxFiles,
    }),
  ] : [],
  rejectionHandlers: config.server.env !== 'test' ? [
    new DailyRotateFile({
      filename: 'logs/rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.fileSize,
      maxFiles: config.logging.maxFiles,
    }),
  ] : [],
  exitOnError: false,
});

// Create a stream object for morgan
const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Export logger methods with additional utility methods
export const log = {
  error: (message: string, meta?: any) => {
    logger.error(message, meta);
  },
  
  warn: (message: string, meta?: any) => {
    logger.warn(message, meta);
  },
  
  info: (message: string, meta?: any) => {
    logger.info(message, meta);
  },
  
  http: (message: string, meta?: any) => {
    logger.http(message, meta);
  },
  
  debug: (message: string, meta?: any) => {
    logger.debug(message, meta);
  },
  
  // Utility methods for common use cases
  apiRequest: (method: string, url: string, userId?: string, duration?: number) => {
    logger.http('API Request', {
      method,
      url,
      userId,
      duration: duration ? `${duration}ms` : undefined,
    });
  },
  
  apiError: (method: string, url: string, error: Error, userId?: string) => {
    logger.error('API Error', {
      method,
      url,
      userId,
      error: error.message,
      stack: error.stack,
    });
  },
  
  dbQuery: (query: string, duration?: number, error?: Error) => {
    if (error) {
      logger.error('Database Query Error', {
        query,
        error: error.message,
        stack: error.stack,
      });
    } else {
      logger.debug('Database Query', {
        query,
        duration: duration ? `${duration}ms` : undefined,
      });
    }
  },
  
  auth: (action: string, userId: string, success: boolean, details?: any) => {
    const level = success ? 'info' : 'warn';
    logger.log(level, `Auth ${action}`, {
      userId,
      success,
      ...details,
    });
  },
  
  business: (action: string, businessId: string, userId: string, details?: any) => {
    logger.info(`Business ${action}`, {
      businessId,
      userId,
      ...details,
    });
  },
  
  budget: (action: string, amount: number, category: string, details?: any) => {
    logger.info(`Budget ${action}`, {
      amount,
      category,
      ...details,
    });
  },
};

export { stream };

export default logger;