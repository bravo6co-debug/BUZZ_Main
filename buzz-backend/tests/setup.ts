import { Knex } from 'knex';
import knexConfig from '../knexfile';

// Get test database configuration
const testConfig = knexConfig.test;
let knex: Knex;

export const setupTestDb = async (): Promise<Knex> => {
  knex = require('knex')(testConfig);
  
  // Run migrations
  await knex.migrate.latest();
  
  // Run seeds for test data
  await knex.seed.run();
  
  return knex;
};

export const cleanupTestDb = async (): Promise<void> => {
  if (knex) {
    // Clean up all tables in reverse order of dependencies
    await knex('audit_logs').del();
    await knex('api_logs').del();
    await knex('community_reports').del();
    await knex('community_comments').del();
    await knex('community_posts').del();
    await knex('ip_blacklist').del();
    await knex('security_settings').del();
    await knex('system_settings').del();
    await knex('push_tokens').del();
    await knex('notifications').del();
    await knex('event_participations').del();
    await knex('events').del();
    await knex('budget_alerts').del();
    await knex('budget_controls').del();
    await knex('budget_executions').del();
    await knex('budget_settings').del();
    await knex('settlement_details').del();
    await knex('settlement_requests').del();
    await knex('qr_event_participations').del();
    await knex('qr_events').del();
    await knex('qr_codes').del();
    await knex('mileage_transactions').del();
    await knex('mileage_accounts').del();
    await knex('user_coupons').del();
    await knex('coupons').del();
    await knex('referral_stats').del();
    await knex('referral_rewards').del();
    await knex('referral_visits').del();
    await knex('business_reviews').del();
    await knex('business_exposures').del();
    await knex('businesses').del();
    await knex('business_applications').del();
    await knex('user_admin_roles').del();
    await knex('admin_roles').del();
    await knex('user_profiles').del();
    await knex('users').del();
  }
};

export const teardownTestDb = async (): Promise<void> => {
  if (knex) {
    await knex.destroy();
  }
};

export const resetTestDb = async (): Promise<void> => {
  await cleanupTestDb();
  await knex.seed.run();
};

export const getTestDb = (): Knex => {
  return knex;
};

// Test user credentials
export const TEST_USERS = {
  SUPER_ADMIN: {
    email: 'superadmin@buzz.com',
    password: 'BuzzAdmin2024!',
    id: '11111111-2222-3333-4444-555555555555'
  },
  ADMIN: {
    email: 'admin@buzz.com',
    password: 'BuzzAdmin2024!',
    id: '22222222-3333-4444-5555-666666666666'
  },
  BUSINESS_MANAGER: {
    email: 'business.manager@buzz.com',
    password: 'BuzzAdmin2024!',
    id: '33333333-4444-5555-6666-777777777777'
  },
  CONTENT_MANAGER: {
    email: 'content.manager@buzz.com',
    password: 'BuzzAdmin2024!',
    id: '44444444-5555-6666-7777-888888888888'
  },
  TEST_USER_1: {
    email: 'testuser1@example.com',
    id: 'user-1111-2222-3333-444444444444'
  },
  TEST_USER_2: {
    email: 'testuser2@example.com',
    id: 'user-2222-3333-4444-555555555555'
  },
  BUSINESS_USER_1: {
    email: 'business1@example.com',
    password: 'Business123!',
    id: 'user-3333-4444-5555-666666666666'
  },
  BUSINESS_USER_2: {
    email: 'business2@example.com',
    password: 'Business456!',
    id: 'user-4444-5555-6666-777777777777'
  }
};

export const TEST_BUSINESSES = {
  CHICKEN_RESTAURANT: {
    id: 'biz-1111-2222-3333-444444444444',
    name: '맛있는 치킨집'
  },
  COFFEE_SHOP: {
    id: 'biz-2222-3333-4444-555555555555',
    name: '커피앤베이글'
  }
};

export const TEST_COUPONS = {
  SIGNUP_COUPON: {
    id: 'coupon-1111-2222-3333-444444444444',
    name: '신규가입 환영 쿠폰'
  },
  REFERRAL_COUPON: {
    id: 'coupon-2222-3333-4444-555555555555',
    name: '리퍼럴 보상 쿠폰'
  }
};

// Helper function to generate test JWT tokens
export const generateTestToken = (userId: string, role: string = 'user'): string => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      userId,
      role,
      email: TEST_USERS.TEST_USER_1.email
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

// Global test hooks
beforeAll(async () => {
  await setupTestDb();
});

afterEach(async () => {
  // Clean up after each test but keep the schema
  await resetTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

export default {
  setupTestDb,
  cleanupTestDb,
  teardownTestDb,
  resetTestDb,
  getTestDb,
  TEST_USERS,
  TEST_BUSINESSES,
  TEST_COUPONS,
  generateTestToken
};