# Buzz Backend Database Setup

This document provides comprehensive information about the Buzz Platform database schema, migrations, and setup procedures.

## Database Architecture

The Buzz Platform uses PostgreSQL as the primary database with the following key features:

- **Complete referral and rewards system**
- **Business application and management**
- **User authentication with multiple providers**
- **Coupon and mileage systems**
- **Settlement and budget management**
- **Admin role-based access control**
- **Comprehensive audit logging**

## Quick Start

### Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 18+ installed
- npm or yarn package manager

### Development Setup

1. **Clone and navigate to the project:**
   ```bash
   cd buzz-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Run the development setup script:**
   ```bash
   # On Windows
   scripts\dev.bat
   
   # On Linux/macOS
   chmod +x scripts/dev.sh
   ./scripts/dev.sh
   ```

The script will automatically:
- Check system requirements
- Setup database connections
- Run migrations
- Populate seed data
- Start the development server

## Database Configuration

### Environment Variables

Configure these variables in your `.env` file:

```env
# Development Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=buzz_platform
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=20

# Test Database
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=buzz_platform_test
TEST_DB_USER=postgres
TEST_DB_PASSWORD=your_password

# Production Database
DATABASE_URL=postgresql://user:password@host:port/database
```

### Database Creation

Create the required databases:

```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE buzz_platform;
CREATE DATABASE buzz_platform_test;

-- Create dedicated user (optional but recommended)
CREATE USER buzz_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE buzz_platform TO buzz_user;
GRANT ALL PRIVILEGES ON DATABASE buzz_platform_test TO buzz_user;
```

## Schema Overview

### Core Tables

#### 1. User Management
- **users** - Core user information and authentication
- **user_profiles** - Extended user profile data
- **admin_roles** - Admin role definitions
- **user_admin_roles** - User-role mappings
- **business_applications** - Business registration applications

#### 2. Business Management  
- **businesses** - Business information and settings
- **business_exposures** - Fair rotation and exposure tracking
- **business_reviews** - Customer reviews and ratings

#### 3. Referral System
- **referral_visits** - Referral link tracking
- **referral_rewards** - Reward distribution
- **referral_stats** - Performance analytics

#### 4. Rewards System
- **coupons** - Coupon templates and configurations
- **user_coupons** - User-specific coupon instances
- **mileage_accounts** - User mileage balances
- **mileage_transactions** - Transaction history

#### 5. QR & Events
- **qr_codes** - QR code generation and validation
- **qr_events** - Special QR-based events
- **qr_event_participations** - Event participation tracking

#### 6. Financial Management
- **settlement_requests** - Business settlement requests
- **settlement_details** - Detailed settlement breakdowns
- **budget_settings** - Monthly budget allocations
- **budget_executions** - Budget usage tracking
- **budget_controls** - Automated budget controls
- **budget_alerts** - Budget threshold notifications

#### 7. System & Audit
- **system_settings** - Application configuration
- **security_settings** - Security policies
- **audit_logs** - Comprehensive audit trail
- **api_logs** - API request/response logging
- **notifications** - User notifications

## Migrations

### Migration Files

The database schema is managed through TypeScript migration files:

```
src/migrations/
├── 001_create_users_tables.ts      # User authentication & profiles
├── 002_create_business_tables.ts   # Business management
├── 003_create_referral_tables.ts   # Referral system
├── 004_create_coupon_mileage_tables.ts  # Rewards system
├── 005_create_settlement_tables.ts # Financial management
└── 006_create_system_tables.ts     # System & audit tables
```

### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npx knex migrate:status

# Rollback last migration
npm run migrate:rollback

# Reset database (rollback all + migrate + seed)
npm run db:reset
```

### Environment-Specific Migrations

```bash
# Development (default)
npm run migrate

# Test environment
npm run migrate --env=test

# Production environment
npm run migrate --env=production
```

## Seed Data

### Seed Files

```
src/seeds/
├── 001_admin_users.ts    # Admin accounts & system settings
└── 002_test_data.ts      # Sample users, businesses & test data
```

### Default Accounts Created

#### Admin Accounts
- **superadmin@buzz.com** / `BuzzAdmin2024!` (Super Administrator)
- **admin@buzz.com** / `BuzzAdmin2024!` (General Administrator)
- **business.manager@buzz.com** / `BuzzAdmin2024!` (Business Manager)
- **content.manager@buzz.com** / `BuzzAdmin2024!` (Content Manager)

#### Business Test Accounts
- **business1@example.com** / `Business123!` (치킨집)
- **business2@example.com** / `Business456!` (카페)

#### User Test Accounts
- **testuser1@example.com** (Google OAuth user)
- **testuser2@example.com** (Kakao OAuth user)

### Running Seeds

```bash
# Run all seed files
npm run seed

# Environment-specific seeding
npm run seed --env=test
npm run seed --env=production
```

## Testing

### Test Database Setup

Tests use a separate `buzz_platform_test` database:

```bash
# Run all tests
npm run test

# Run specific test suites
./scripts/test.sh unit
./scripts/test.sh integration
./scripts/test.sh auth
./scripts/test.sh user
./scripts/test.sh business
./scripts/test.sh admin

# Run with coverage
./scripts/test.sh coverage

# Watch mode
./scripts/test.sh watch
```

### Test Structure

```
tests/
├── setup.ts              # Test database setup & utilities
├── auth.test.ts          # Authentication endpoints
├── user.test.ts          # User management endpoints
├── business.test.ts      # Business management endpoints
├── admin.test.ts         # Admin panel endpoints
└── integration/
    └── api.test.ts       # End-to-end workflow tests
```

## Performance Considerations

### Indexes

The schema includes optimized indexes for:
- User lookups (email, phone, referral codes)
- Business queries (status, category, location)
- Transaction history (user_id, created_at)
- Settlement calculations (business_id, date ranges)
- Admin analytics (various composite indexes)

### Connection Pooling

Knex is configured with connection pooling:
- **Development**: 2-20 connections
- **Test**: 1-5 connections  
- **Production**: 5-50 connections

## Security Features

### Row Level Security (RLS)

RLS policies are implemented for sensitive tables:
- Users can only access their own data
- Businesses can only modify their own information
- Admins have elevated access based on roles

### Audit Logging

All sensitive operations are logged:
- User account changes
- Admin actions
- Business approvals/rejections
- Financial transactions
- System setting modifications

### Data Protection

- Password hashing with bcrypt
- JWT token validation
- Rate limiting on sensitive endpoints
- IP blacklisting capability
- Comprehensive input validation

## Monitoring & Maintenance

### Health Checks

```bash
# Check database connection
pg_isready -h localhost -p 5432

# Check migration status
npx knex migrate:status

# View recent logs
tail -f logs/combined.log
```

### Backup Recommendations

1. **Daily automated backups**
2. **Pre-deployment backups**
3. **Point-in-time recovery setup**
4. **Regular backup restoration tests**

### Performance Monitoring

Monitor these key metrics:
- Connection pool utilization
- Query performance (slow query log)
- Database size and growth
- Index usage statistics

## Troubleshooting

### Common Issues

1. **Migration Fails**
   ```bash
   # Check database connection
   npm run knex migrate:status
   
   # Verify environment variables
   echo $DATABASE_URL
   ```

2. **Seed Data Conflicts**
   ```bash
   # Reset and re-seed
   npm run db:reset
   ```

3. **Test Database Issues**
   ```bash
   # Recreate test database
   dropdb buzz_platform_test
   createdb buzz_platform_test
   npm run migrate --env=test
   npm run seed --env=test
   ```

4. **Connection Pool Exhaustion**
   - Check for unclosed connections in application code
   - Adjust pool size in knexfile.ts
   - Monitor active connections

### Debug Mode

Enable debug logging:

```bash
# Development
DEBUG=knex:* npm run dev

# Migrations
DEBUG=knex:* npm run migrate
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] Database backup completed
- [ ] Migration files reviewed
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Connection limits appropriate
- [ ] Monitoring configured

### Deployment Process

```bash
# Run deployment script
./scripts/deploy.sh production
```

The deployment script handles:
- Pre-deployment validation
- Database migrations
- Application build
- Health checks
- Rollback on failure

### Post-Deployment

1. **Verify migrations applied**
2. **Check application health**
3. **Monitor error logs**
4. **Validate key functionality**
5. **Update monitoring dashboards**

## Support

For database-related issues:

1. Check this documentation
2. Review application logs
3. Verify environment configuration
4. Test database connectivity
5. Contact the development team

---

**Last Updated**: August 30, 2024  
**Schema Version**: 2.0.0  
**Compatible Node.js**: 18+  
**Compatible PostgreSQL**: 12+