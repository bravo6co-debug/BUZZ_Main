import dotenv from 'dotenv';
import { getSecurePortConfig, initPortSecurity } from './port-security-simple';

dotenv.config();

// Initialize port security protection
initPortSecurity();

// Get secure port configuration
const securePortConfig = getSecurePortConfig(
  process.env['PORT'], 
  process.env['NODE_ENV'] || 'development'
);

/**
 * Application configuration with enhanced port security
 */
export const config = {
  // Server Configuration with Port Security
  server: {
    port: securePortConfig.port,
    host: process.env['HOST'] || 'localhost',
    env: process.env['NODE_ENV'] || 'development',
    portSecurity: securePortConfig,
  },

  // Database Configuration
  database: {
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '5432'),
    name: process.env['DB_NAME'] || 'buzz_platform',
    user: process.env['DB_USER'] || 'postgres',
    password: process.env['DB_PASSWORD'] || 'password',
    ssl: process.env['DB_SSL'] === 'true',
    poolMin: parseInt(process.env['DB_POOL_MIN'] || '2'),
    poolMax: parseInt(process.env['DB_POOL_MAX'] || '20'),
  },

  // JWT Configuration
  jwt: {
    secret: process.env['JWT_SECRET'] || 'your_jwt_secret_key_here',
    refreshSecret: process.env['JWT_REFRESH_SECRET'] || 'your_jwt_refresh_secret_here',
    expiresIn: process.env['JWT_EXPIRES_IN'] || '24h',
    refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',
  },

  // OAuth Configuration
  oauth: {
    google: {
      clientId: process.env['GOOGLE_CLIENT_ID'] || '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] || '',
    },
    kakao: {
      clientId: process.env['KAKAO_CLIENT_ID'] || '',
      clientSecret: process.env['KAKAO_CLIENT_SECRET'] || '',
    },
  },

  // Redis Configuration
  redis: {
    url: process.env['REDIS_URL'] || 'redis://localhost:6379',
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379'),
    password: process.env['REDIS_PASSWORD'] || '',
    db: parseInt(process.env['REDIS_DB'] || '0'),
  },

  // File Upload Configuration
  upload: {
    directory: process.env['UPLOAD_DIR'] || 'uploads',
    maxFileSize: parseInt(process.env['MAX_FILE_SIZE'] || '5242880'), // 5MB
    allowedFileTypes: (process.env['ALLOWED_FILE_TYPES'] || 'jpg,jpeg,png,pdf').split(','),
  },

  // AWS S3 Configuration
  aws: {
    region: process.env['AWS_REGION'] || 'ap-northeast-2',
    accessKeyId: process.env['AWS_ACCESS_KEY_ID'] || '',
    secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] || '',
    s3Bucket: process.env['AWS_S3_BUCKET'] || 'buzz-platform-files',
  },

  // Email Configuration
  email: {
    smtp: {
      host: process.env['SMTP_HOST'] || 'smtp.gmail.com',
      port: parseInt(process.env['SMTP_PORT'] || '587'),
      user: process.env['SMTP_USER'] || '',
      password: process.env['SMTP_PASSWORD'] || '',
    },
    from: process.env['EMAIL_FROM'] || 'noreply@buzz-platform.kr',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3001,http://localhost:3000').split(','),
    sessionSecret: process.env.SESSION_SECRET || 'your_session_secret',
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    fileSize: process.env.LOG_FILE_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
  },

  // Business Logic Configuration
  business: {
    referralRewardAmount: parseInt(process.env.REFERRAL_REWARD_AMOUNT || '500'),
    visitorCouponAmount: parseInt(process.env.VISITOR_COUPON_AMOUNT || '3000'),
    signupBonusMileage: parseInt(process.env.SIGNUP_BONUS_MILEAGE || '5000'),
    signupBonusCoupon: parseInt(process.env.SIGNUP_BONUS_COUPON || '5000'),
    qrCodeTtlSeconds: parseInt(process.env.QR_CODE_TTL_SECONDS || '300'),
    mileageExpireDays: parseInt(process.env.MILEAGE_EXPIRE_DAYS || '365'),
  },

  // Budget Control
  budget: {
    monthlyBudget: parseInt(process.env.MONTHLY_BUDGET || '50000000'),
    dailyBudgetLimit: parseInt(process.env.DAILY_BUDGET_LIMIT || '1666666'),
    warningThreshold: parseInt(process.env.BUDGET_WARNING_THRESHOLD || '70'),
    dangerThreshold: parseInt(process.env.BUDGET_DANGER_THRESHOLD || '85'),
    criticalThreshold: parseInt(process.env.BUDGET_CRITICAL_THRESHOLD || '95'),
  },

  // Admin Configuration
  admin: {
    superAdminEmail: process.env.SUPER_ADMIN_EMAIL || 'admin@buzz-platform.kr',
    defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPass123!',
  },

  // API Documentation
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
    apiVersion: process.env.API_VERSION || '1.0.0',
  },

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
} as const;

export default config;