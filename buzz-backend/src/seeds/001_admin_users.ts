import { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  // Insert default admin roles first
  await knex('admin_roles').del();
  const adminRoles = await knex('admin_roles').insert([
    {
      id: 'a1b2c3d4-e5f6-7890-1234-567890123456',
      name: 'super_admin',
      display_name: '최고관리자',
      level: 1,
      permissions: { "*": ["*"] },
      description: '모든 권한 - 시스템 설정, 관리자 계정 생성',
      is_active: true
    },
    {
      id: 'b2c3d4e5-f6g7-8901-2345-678901234567',
      name: 'admin',
      display_name: '관리자',
      level: 2,
      permissions: {
        "users": ["*"],
        "businesses": ["*"],
        "settlements": ["*"],
        "contents": ["*"],
        "budget": ["read"],
        "referral": ["read"]
      },
      description: '사용자/매장/컨텐츠/정산 관리',
      is_active: true
    },
    {
      id: 'c3d4e5f6-g7h8-9012-3456-789012345678',
      name: 'business_manager',
      display_name: '매장관리자',
      level: 3,
      permissions: {
        "businesses": ["create", "read", "update"],
        "settlements": ["read"]
      },
      description: '매장 관리 및 정산 조회',
      is_active: true
    },
    {
      id: 'd4e5f6g7-h8i9-0123-4567-890123456789',
      name: 'content_manager',
      display_name: '컨텐츠관리자',
      level: 4,
      permissions: {
        "contents": ["*"],
        "events": ["*"]
      },
      description: '컨텐츠 및 이벤트 관리',
      is_active: true
    }
  ]).returning('*');

  // Hash password for admin users
  const passwordHash = await bcrypt.hash('BuzzAdmin2024!', 10);

  // Create super admin user
  await knex('users').del();
  const superAdminUser = await knex('users').insert({
    id: '11111111-2222-3333-4444-555555555555',
    email: 'superadmin@buzz.com',
    name: 'Super Administrator',
    role: 'admin',
    auth_provider: 'email',
    password_hash: passwordHash,
    must_change_password: false,
    is_active: true,
    created_at: knex.fn.now(),
    updated_at: knex.fn.now()
  }).returning('*');

  // Create additional admin users
  const adminUsers = await knex('users').insert([
    {
      id: '22222222-3333-4444-5555-666666666666',
      email: 'admin@buzz.com',
      name: 'General Administrator',
      role: 'admin',
      auth_provider: 'email',
      password_hash: passwordHash,
      must_change_password: true,
      created_by: '11111111-2222-3333-4444-555555555555',
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: '33333333-4444-5555-6666-777777777777',
      email: 'business.manager@buzz.com',
      name: 'Business Manager',
      role: 'admin',
      auth_provider: 'email',
      password_hash: passwordHash,
      must_change_password: true,
      created_by: '11111111-2222-3333-4444-555555555555',
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: '44444444-5555-6666-7777-888888888888',
      email: 'content.manager@buzz.com',
      name: 'Content Manager',
      role: 'admin',
      auth_provider: 'email',
      password_hash: passwordHash,
      must_change_password: true,
      created_by: '11111111-2222-3333-4444-555555555555',
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]).returning('*');

  // Assign roles to users
  await knex('user_admin_roles').del();
  await knex('user_admin_roles').insert([
    {
      user_id: '11111111-2222-3333-4444-555555555555',
      role_id: 'a1b2c3d4-e5f6-7890-1234-567890123456', // super_admin
      assigned_at: knex.fn.now(),
      assigned_by: '11111111-2222-3333-4444-555555555555'
    },
    {
      user_id: '22222222-3333-4444-5555-666666666666',
      role_id: 'b2c3d4e5-f6g7-8901-2345-678901234567', // admin
      assigned_at: knex.fn.now(),
      assigned_by: '11111111-2222-3333-4444-555555555555'
    },
    {
      user_id: '33333333-4444-5555-6666-777777777777',
      role_id: 'c3d4e5f6-g7h8-9012-3456-789012345678', // business_manager
      assigned_at: knex.fn.now(),
      assigned_by: '11111111-2222-3333-4444-555555555555'
    },
    {
      user_id: '44444444-5555-6666-7777-888888888888',
      role_id: 'd4e5f6g7-h8i9-0123-4567-890123456789', // content_manager
      assigned_at: knex.fn.now(),
      assigned_by: '11111111-2222-3333-4444-555555555555'
    }
  ]);

  // Insert budget control rules
  await knex('budget_controls').del();
  await knex('budget_controls').insert([
    {
      control_type: 'budget_warning',
      threshold_percentage: 70,
      action: 'send_alert',
      action_params: { level: 'warning', channels: ['email', 'sms'] },
      is_active: true
    },
    {
      control_type: 'budget_danger',
      threshold_percentage: 85,
      action: 'reduce_rewards',
      action_params: { reduction: 30, affected: ['referral', 'event'] },
      is_active: true
    },
    {
      control_type: 'budget_critical',
      threshold_percentage: 95,
      action: 'limit_services',
      action_params: { services: ['referral', 'event', 'new_coupon'] },
      is_active: true
    },
    {
      control_type: 'budget_blocked',
      threshold_percentage: 98,
      action: 'emergency_stop',
      action_params: { stop_all: true, allow_existing: true },
      is_active: true
    },
    {
      control_type: 'budget_exhausted',
      threshold_percentage: 100,
      action: 'complete_block',
      action_params: { block_all: true },
      is_active: true
    }
  ]);

  // Insert default system settings
  await knex('system_settings').del();
  await knex('system_settings').insert([
    {
      key: 'referral_reward_amount',
      value: 500,
      description: '리퍼럴 보상 금액',
      category: 'referral',
      data_type: 'number',
      is_public: false
    },
    {
      key: 'referral_visitor_coupon',
      value: 3000,
      description: '방문자 쿠폰 금액',
      category: 'referral',
      data_type: 'number',
      is_public: false
    },
    {
      key: 'signup_bonus_mileage',
      value: 5000,
      description: '가입 보너스 마일리지',
      category: 'referral',
      data_type: 'number',
      is_public: false
    },
    {
      key: 'signup_bonus_coupon',
      value: 5000,
      description: '가입 보너스 쿠폰 금액',
      category: 'referral',
      data_type: 'number',
      is_public: false
    },
    {
      key: 'mileage_expire_days',
      value: 365,
      description: '마일리지 유효기간 (일)',
      category: 'mileage',
      data_type: 'number',
      is_public: true
    },
    {
      key: 'qr_code_ttl_seconds',
      value: 300,
      description: 'QR 코드 유효시간 (초)',
      category: 'security',
      data_type: 'number',
      is_public: false
    },
    {
      key: 'max_daily_referral_reward',
      value: 50000,
      description: '일일 최대 리퍼럴 보상',
      category: 'referral',
      data_type: 'number',
      is_public: false
    },
    {
      key: 'coupon_default_expire_days',
      value: 30,
      description: '쿠폰 기본 유효기간 (일)',
      category: 'coupon',
      data_type: 'number',
      is_public: true
    },
    {
      key: 'settlement_processing_days',
      value: 3,
      description: '정산 처리 기간 (영업일)',
      category: 'settlement',
      data_type: 'number',
      is_public: true
    },
    {
      key: 'api_rate_limit_per_minute',
      value: 60,
      description: 'API 분당 요청 제한',
      category: 'security',
      data_type: 'number',
      is_public: false
    }
  ]);

  // Insert default security settings
  await knex('security_settings').del();
  await knex('security_settings').insert([
    {
      setting_type: 'rate_limit',
      setting_value: { per_minute: 60, per_hour: 1000 },
      description: 'API 요청 제한',
      is_active: true
    },
    {
      setting_type: 'login_attempt',
      setting_value: { max_attempts: 5, lockout_minutes: 30 },
      description: '로그인 시도 제한',
      is_active: true
    },
    {
      setting_type: 'session_timeout',
      setting_value: { idle_minutes: 30, absolute_hours: 24 },
      description: '세션 타임아웃 설정',
      is_active: true
    },
    {
      setting_type: 'password_policy',
      setting_value: { min_length: 8, require_uppercase: true, require_number: true },
      description: '비밀번호 정책',
      is_active: true
    }
  ]);

  console.log('✅ Admin users and system settings seeded successfully');
}