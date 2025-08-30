# Buzz Platform Backend Architecture

## 🏗️ 시스템 아키텍처

### High-Level Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Buzz App      │    │   Buzz-Biz      │    │   Buzz-Admin    │
│   (React)       │    │   (React)       │    │   (React)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (Nginx)       │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   API Gateway   │
                    │   Rate Limiting │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Auth Service  │    │  Business Logic │    │  Admin Service  │
│   - JWT         │    │   - Referrals   │    │   - Dashboard   │
│   - OAuth       │    │   - Coupons     │    │   - Analytics   │
│   - Sessions    │    │   - Mileage     │    │   - Management  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Data Layer    │
                    └─────────────────┘
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │   File Storage  │
│   - Main DB     │    │   - Cache       │    │   - Images      │
│   - ACID        │    │   - Sessions    │    │   - Documents   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Backend Architecture Layers

#### 1. Presentation Layer (Routes)
```typescript
routes/
├── auth.ts           # 인증/인가 관련 엔드포인트
├── businesses.ts     # 비즈니스 관련 엔드포인트
├── admin.ts          # 관리자 전용 엔드포인트
├── coupons.ts        # 쿠폰 시스템 엔드포인트
├── mileage.ts        # 마일리지 시스템 엔드포인트
├── settlements.ts    # 정산 관련 엔드포인트
├── contents.ts       # 컨텐츠 관리 엔드포인트
└── health.ts         # 헬스체크 엔드포인트
```

#### 2. Business Logic Layer (Controllers & Services)
```typescript
controllers/          # HTTP 요청/응답 처리
├── AuthController.ts
├── BusinessController.ts
├── AdminController.ts
└── ...

services/             # 비즈니스 로직
├── AuthService.ts
├── UserService.ts
├── BusinessService.ts
├── CouponService.ts
├── MileageService.ts
├── ReferralService.ts
├── SettlementService.ts
├── BudgetService.ts
└── NotificationService.ts
```

#### 3. Data Access Layer (Models & Repositories)
```typescript
models/               # 데이터 모델 정의
├── User.ts
├── Business.ts
├── Coupon.ts
├── MileageTransaction.ts
└── ...

repositories/         # 데이터 액세스 추상화
├── UserRepository.ts
├── BusinessRepository.ts
└── ...
```

#### 4. Cross-Cutting Concerns
```typescript
middleware/           # 미들웨어
├── auth.ts          # 인증/인가
├── validation.ts    # 데이터 검증
├── rateLimit.ts     # Rate limiting
├── errorHandler.ts  # 에러 처리
├── logging.ts       # 로깅
└── cors.ts          # CORS 설정

utils/               # 유틸리티
├── auth.ts          # JWT, 암호화
├── response.ts      # 응답 포맷
├── logger.ts        # 로깅 유틸
├── validator.ts     # 검증 헬퍼
└── cache.ts         # 캐시 헬퍼
```

## 🗄️ 데이터베이스 설계

### Entity Relationship Diagram
```
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│    Users    │    │ Business Apps   │    │ Businesses  │
│             │    │                 │    │             │
│ id (PK)     │    │ id (PK)         │    │ id (PK)     │
│ email       │◄───┤ email           │    │ owner_id    │
│ name        │    │ business_info   │    │ name        │
│ role        │    │ status          │    │ category    │
│ ...         │    │ ...             │    │ ...         │
└─────────────┘    └─────────────────┘    └─────────────┘
       │                                          │
       │            ┌─────────────────┐          │
       │            │ User Profiles   │          │
       │            │                 │          │
       │            │ user_id (FK)    │          │
       └────────────┤ referral_code   │          │
                    │ university      │          │
                    │ ...             │          │
                    └─────────────────┘          │
                                                 │
┌─────────────┐    ┌─────────────────┐          │
│   Coupons   │    │  User Coupons   │          │
│             │    │                 │          │
│ id (PK)     │    │ id (PK)         │          │
│ name        │    │ user_id (FK)    │          │
│ type        │    │ coupon_id (FK)  │          │
│ discount    │◄───┤ status          │          │
│ ...         │    │ ...             │          │
└─────────────┘    └─────────────────┘          │
                                                 │
┌─────────────┐    ┌─────────────────┐          │
│  Mileage    │    │ Mileage Trans   │          │
│  Accounts   │    │                 │          │
│             │    │ id (PK)         │          │
│ user_id(PK) │    │ user_id (FK)    │          │
│ balance     │◄───┤ business_id(FK) │◄─────────┘
│ total_earned│    │ type            │
│ ...         │    │ amount          │
└─────────────┘    │ ...             │
                   └─────────────────┘
```

### Core Tables Summary

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `users` | Core user information | → user_profiles, mileage_accounts |
| `user_profiles` | Extended user data | users ← |
| `businesses` | Business information | users ← |
| `business_applications` | Biz signup applications | → users (after approval) |
| `coupons` | Coupon templates | → user_coupons |
| `user_coupons` | User's coupon instances | coupons ←, users ← |
| `mileage_accounts` | User mileage balances | users ← |
| `mileage_transactions` | Mileage transaction history | users ←, businesses ← |
| `settlement_requests` | Business settlement requests | businesses ← |
| `referral_visits` | Referral tracking | users ← |
| `referral_rewards` | Referral rewards | users ← |

## 🔐 보안 아키텍처

### Authentication & Authorization Flow
```
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│   Client    │    │   API Server    │    │  Database   │
│             │    │                 │    │             │
│ 1. Login    │───►│ 2. Verify       │───►│ 3. Check    │
│ Request     │    │ Credentials     │    │ User        │
│             │    │                 │    │             │
│ 5. Store    │◄───┤ 4. Generate     │◄───┤ User Found  │
│ Tokens      │    │ JWT Tokens      │    │             │
│             │    │                 │    │             │
│ 6. API      │───►│ 7. Verify JWT   │    │             │
│ Request     │    │ & Check Roles   │    │             │
│ + Token     │    │                 │    │             │
│             │    │ 8. Process      │───►│ 9. Execute  │
│ 10. Response│◄───┤ Request         │    │ Query       │
└─────────────┘    └─────────────────┘    └─────────────┘
```

### Role-Based Access Control (RBAC)
```typescript
enum UserRole {
  USER = 'user',        // Buzz app users
  BUSINESS = 'business', // Buzz-Biz users
  ADMIN = 'admin'       // Buzz-Admin users
}

// Permission Matrix
const PERMISSIONS = {
  'user': {
    coupons: ['read', 'use'],
    mileage: ['read', 'use'],
    profile: ['read', 'update']
  },
  'business': {
    business: ['read', 'update'],
    settlements: ['create', 'read'],
    qr: ['verify', 'process']
  },
  'admin': {
    users: ['create', 'read', 'update', 'delete'],
    businesses: ['read', 'approve', 'suspend'],
    settlements: ['read', 'approve', 'reject'],
    budget: ['read', 'update', 'control'],
    content: ['create', 'read', 'update', 'delete']
  }
}
```

## 📊 API Design Patterns

### RESTful API Structure
```
/api/auth/*              # Authentication endpoints
/api/users/*             # User management (admin)
/api/businesses/*        # Business management
/api/admin/*             # Admin-specific endpoints
/api/coupons/*           # Coupon system
/api/mileage/*           # Mileage system
/api/settlements/*       # Settlement system
/api/contents/*          # Content management
/api/referral/*          # Referral system
```

### Response Format Standardization
```typescript
// Success Response
interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

// Error Response
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

// Paginated Response
interface PaginatedResponse<T> {
  success: true;
  data: {
    items: T[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  timestamp: string;
}
```

## 🚀 Performance & Scalability

### Caching Strategy
```typescript
// Cache Layers
1. Application Cache (Node.js Memory)
   - JWT tokens validation
   - Frequently accessed config

2. Redis Cache
   - Session data
   - Rate limiting counters
   - Temporary QR codes
   - Business listings

3. Database Query Optimization
   - Proper indexing
   - Query optimization
   - Connection pooling
```

### Database Performance
```sql
-- Critical Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_active ON users(role, is_active);
CREATE INDEX idx_businesses_status_category ON businesses(status, category);
CREATE INDEX idx_user_coupons_user_status ON user_coupons(user_id, status);
CREATE INDEX idx_mileage_transactions_user_date ON mileage_transactions(user_id, created_at);
CREATE INDEX idx_referral_visits_code_date ON referral_visits(referral_code, visited_at);
```

### Rate Limiting Strategy
```typescript
const RATE_LIMITS = {
  '/api/auth/*': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10 // 10 attempts per window
  },
  '/api/admin/*': {
    windowMs: 15 * 60 * 1000,
    max: 600 // Higher limit for admins
  },
  '/api/*': {
    windowMs: 15 * 60 * 1000,
    max: 100 // Standard rate limit
  }
};
```

## 🔄 Error Handling Strategy

### Error Classification
```typescript
enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}
```

### Error Codes
```typescript
const ERROR_CODES = {
  // Authentication (AUTH_xxx)
  AUTH_001: 'Authentication token required',
  AUTH_002: 'Token expired or invalid',
  AUTH_003: 'Insufficient permissions',
  
  // Validation (VALIDATION_xxx)
  VALIDATION_001: 'Required field missing',
  VALIDATION_002: 'Invalid data format',
  
  // Business Logic (BUSINESS_xxx)
  BUSINESS_001: 'Business not found',
  BUDGET_001: 'Budget limit exceeded',
  
  // Rate Limiting (RATE_xxx)
  RATE_001: 'Too many requests'
};
```

## 📈 Monitoring & Logging

### Log Levels & Categories
```typescript
// Log Categories
enum LogCategory {
  AUTH = 'auth',
  BUSINESS = 'business',
  API = 'api',
  DATABASE = 'database',
  BUDGET = 'budget',
  SYSTEM = 'system'
}

// Structured Logging
logger.info('User authentication', {
  category: LogCategory.AUTH,
  userId: 'user-123',
  action: 'login',
  success: true,
  ip: '192.168.1.100',
  userAgent: 'Mozilla/5.0...'
});
```

### Health Check Endpoints
```typescript
GET /health              # Basic health check
GET /api/health          # API health check
GET /api/health/detailed # Detailed system health

// Health Check Response
{
  status: 'healthy' | 'unhealthy',
  timestamp: '2025-08-30T10:00:00Z',
  services: {
    database: 'healthy' | 'unhealthy',
    redis: 'healthy' | 'unhealthy',
    api: 'healthy' | 'unhealthy'
  },
  uptime: 3600,
  memory: { used: 100, total: 512 }
}
```

## 🔧 Development & Deployment

### Environment Configuration
```bash
# Development
NODE_ENV=development
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:3001

# Staging
NODE_ENV=staging
LOG_LEVEL=info
CORS_ORIGIN=https://staging-app.buzz.com

# Production
NODE_ENV=production
LOG_LEVEL=warn
CORS_ORIGIN=https://app.buzz.com
```

### Docker Architecture
```yaml
services:
  postgres:    # Primary database
  redis:       # Cache & sessions
  api:         # Node.js backend
  nginx:       # Reverse proxy
```

This architecture provides a scalable, maintainable, and secure foundation for the Buzz platform backend, supporting multiple client applications with proper separation of concerns and robust error handling.