import { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  // Generate random referral codes
  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  // Create test users with profiles
  const testUsers = [
    {
      id: 'user-1111-2222-3333-444444444444',
      email: 'testuser1@example.com',
      phone: '010-1111-1111',
      name: '김테스트',
      role: 'user',
      auth_provider: 'google',
      provider_id: 'google_123456789',
      is_active: true,
      referral_code: generateReferralCode()
    },
    {
      id: 'user-2222-3333-4444-555555555555',
      email: 'testuser2@example.com',
      phone: '010-2222-2222',
      name: '이사용자',
      role: 'user',
      auth_provider: 'kakao',
      provider_id: 'kakao_987654321',
      is_active: true,
      referral_code: generateReferralCode()
    },
    {
      id: 'user-3333-4444-5555-666666666666',
      email: 'business1@example.com',
      phone: '010-3333-3333',
      name: '박사장',
      role: 'business',
      auth_provider: 'email',
      password_hash: await bcrypt.hash('Business123!', 10),
      is_active: true,
      referral_code: generateReferralCode()
    },
    {
      id: 'user-4444-5555-6666-777777777777',
      email: 'business2@example.com',
      phone: '010-4444-4444',
      name: '최대표',
      role: 'business',
      auth_provider: 'email',
      password_hash: await bcrypt.hash('Business456!', 10),
      is_active: true,
      referral_code: generateReferralCode()
    }
  ];

  // Insert test users
  for (const user of testUsers) {
    await knex('users').insert({
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      auth_provider: user.auth_provider,
      provider_id: user.provider_id,
      password_hash: user.password_hash,
      is_active: user.is_active,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });

    // Insert user profiles
    await knex('user_profiles').insert({
      user_id: user.id,
      birth_date: '1990-01-01',
      gender: 'male',
      university: '부경대학교',
      referral_code: user.referral_code,
      referrer_id: user.id === 'user-2222-3333-4444-555555555555' ? 'user-1111-2222-3333-444444444444' : null,
      marketing_agree: true,
      terms_agreed_at: knex.fn.now(),
      privacy_agreed_at: knex.fn.now(),
      created_at: knex.fn.now()
    });

    // Initialize mileage accounts
    await knex('mileage_accounts').insert({
      user_id: user.id,
      balance: user.role === 'user' ? 10000 : 0,
      total_earned: user.role === 'user' ? 10000 : 0,
      total_used: 0,
      total_expired: 0,
      updated_at: knex.fn.now()
    });
  }

  // Create sample businesses
  const testBusinesses = [
    {
      id: 'biz-1111-2222-3333-444444444444',
      owner_id: 'user-3333-4444-5555-666666666666',
      business_name: '맛있는 치킨집',
      business_number: '123-45-67890',
      category: 'restaurant',
      description: '바삭하고 맛있는 치킨 전문점입니다.',
      address: '부산광역시 남구 용소로45번길 10',
      address_detail: '1층',
      latitude: 35.1379,
      longitude: 129.0756,
      phone: '051-1111-2222',
      business_hours: {
        monday: { open: '11:00', close: '22:00', closed: false },
        tuesday: { open: '11:00', close: '22:00', closed: false },
        wednesday: { open: '11:00', close: '22:00', closed: false },
        thursday: { open: '11:00', close: '22:00', closed: false },
        friday: { open: '11:00', close: '23:00', closed: false },
        saturday: { open: '11:00', close: '23:00', closed: false },
        sunday: { open: '12:00', close: '22:00', closed: false }
      },
      images: ['https://example.com/chicken1.jpg', 'https://example.com/chicken2.jpg'],
      tags: ['치킨', '배달', '테이크아웃'],
      status: 'approved',
      approved_at: knex.fn.now(),
      approved_by: '11111111-2222-3333-4444-555555555555',
      qr_scan_count: 150,
      avg_rating: 4.5,
      review_count: 23
    },
    {
      id: 'biz-2222-3333-4444-555555555555',
      owner_id: 'user-4444-5555-6666-777777777777',
      business_name: '커피앤베이글',
      business_number: '987-65-43210',
      category: 'cafe',
      description: '신선한 베이글과 향긋한 커피를 제공합니다.',
      address: '부산광역시 해운대구 해운대해변로 264',
      address_detail: '2층',
      latitude: 35.1581,
      longitude: 129.1603,
      phone: '051-2222-3333',
      business_hours: {
        monday: { open: '07:00', close: '20:00', closed: false },
        tuesday: { open: '07:00', close: '20:00', closed: false },
        wednesday: { open: '07:00', close: '20:00', closed: false },
        thursday: { open: '07:00', close: '20:00', closed: false },
        friday: { open: '07:00', close: '21:00', closed: false },
        saturday: { open: '08:00', close: '21:00', closed: false },
        sunday: { open: '08:00', close: '20:00', closed: false }
      },
      images: ['https://example.com/cafe1.jpg', 'https://example.com/cafe2.jpg'],
      tags: ['커피', '베이글', '브런치'],
      status: 'approved',
      approved_at: knex.fn.now(),
      approved_by: '11111111-2222-3333-4444-555555555555',
      qr_scan_count: 89,
      avg_rating: 4.2,
      review_count: 31
    }
  ];

  // Insert test businesses
  for (const business of testBusinesses) {
    await knex('businesses').insert({
      ...business,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
  }

  // Create sample coupons
  const testCoupons = [
    {
      id: 'coupon-1111-2222-3333-444444444444',
      name: '신규가입 환영 쿠폰',
      type: 'signup',
      discount_type: 'fixed',
      discount_value: 5000,
      valid_from: new Date('2024-01-01'),
      valid_until: new Date('2025-12-31'),
      total_quantity: 1000,
      used_quantity: 45,
      status: 'active'
    },
    {
      id: 'coupon-2222-3333-4444-555555555555',
      name: '리퍼럴 보상 쿠폰',
      type: 'referral',
      discount_type: 'percentage',
      discount_value: 10,
      max_discount_amount: 3000,
      valid_from: new Date('2024-01-01'),
      valid_until: new Date('2025-12-31'),
      total_quantity: 500,
      used_quantity: 12,
      status: 'active'
    },
    {
      id: 'coupon-3333-4444-5555-666666666666',
      name: '치킨집 할인 쿠폰',
      type: 'basic',
      discount_type: 'fixed',
      discount_value: 3000,
      min_purchase_amount: 15000,
      valid_from: new Date('2024-01-01'),
      valid_until: new Date('2024-12-31'),
      total_quantity: 100,
      used_quantity: 8,
      applicable_businesses: ['biz-1111-2222-3333-444444444444'],
      status: 'active'
    }
  ];

  // Insert test coupons
  for (const coupon of testCoupons) {
    await knex('coupons').insert({
      ...coupon,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
  }

  // Give coupons to test users
  const userCoupons = [
    {
      id: 'uc-1111-2222-3333-444444444444',
      user_id: 'user-1111-2222-3333-444444444444',
      coupon_id: 'coupon-1111-2222-3333-444444444444',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'active',
      qr_code_data: 'QR_CODE_DATA_001'
    },
    {
      id: 'uc-2222-3333-4444-555555555555',
      user_id: 'user-2222-3333-4444-555555555555',
      coupon_id: 'coupon-2222-3333-4444-555555555555',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
      qr_code_data: 'QR_CODE_DATA_002'
    },
    {
      id: 'uc-3333-4444-5555-666666666666',
      user_id: 'user-1111-2222-3333-444444444444',
      coupon_id: 'coupon-3333-4444-5555-666666666666',
      expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      status: 'active',
      qr_code_data: 'QR_CODE_DATA_003'
    }
  ];

  // Insert user coupons
  for (const userCoupon of userCoupons) {
    await knex('user_coupons').insert({
      ...userCoupon,
      issued_at: knex.fn.now()
    });
  }

  // Create sample referral visits
  await knex('referral_visits').insert([
    {
      referral_code: testUsers[0].referral_code,
      visitor_ip: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      device_type: 'desktop',
      browser: 'Chrome',
      visited_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      converted_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      converted_user_id: 'user-2222-3333-4444-555555555555'
    },
    {
      referral_code: testUsers[0].referral_code,
      visitor_ip: '192.168.1.101',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
      device_type: 'mobile',
      browser: 'Safari',
      visited_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      converted_at: null,
      converted_user_id: null
    }
  ]);

  // Create referral rewards
  await knex('referral_rewards').insert([
    {
      referrer_id: 'user-1111-2222-3333-444444444444',
      referred_user_id: 'user-2222-3333-4444-555555555555',
      reward_type: 'mileage',
      reward_amount: 500,
      status: 'paid',
      paid_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    }
  ]);

  // Create referral stats
  await knex('referral_stats').insert([
    {
      user_id: 'user-1111-2222-3333-444444444444',
      total_visits: 15,
      total_conversions: 3,
      conversion_rate: 20.00,
      total_rewards: 1500,
      monthly_rank: 1,
      last_calculated_at: knex.fn.now()
    }
  ]);

  // Create sample mileage transactions
  const mileageTransactions = [
    {
      user_id: 'user-1111-2222-3333-444444444444',
      type: 'earn',
      amount: 5000,
      balance_before: 0,
      balance_after: 5000,
      description: '신규 가입 보너스',
      reference_type: 'signup_bonus',
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      user_id: 'user-1111-2222-3333-444444444444',
      type: 'earn',
      amount: 500,
      balance_before: 5000,
      balance_after: 5500,
      description: '리퍼럴 보상',
      reference_type: 'referral_reward',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      user_id: 'user-2222-3333-4444-555555555555',
      type: 'earn',
      amount: 5000,
      balance_before: 0,
      balance_after: 5000,
      description: '신규 가입 보너스',
      reference_type: 'signup_bonus',
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    }
  ];

  for (const transaction of mileageTransactions) {
    await knex('mileage_transactions').insert(transaction);
  }

  // Create sample business reviews
  await knex('business_reviews').insert([
    {
      business_id: 'biz-1111-2222-3333-444444444444',
      user_id: 'user-1111-2222-3333-444444444444',
      rating: 5,
      content: '정말 맛있어요! 바삭하고 양념이 완벽해요',
      is_verified_purchase: true,
      like_count: 3,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      business_id: 'biz-2222-3333-4444-555555555555',
      user_id: 'user-2222-3333-4444-555555555555',
      rating: 4,
      content: '커피가 맛있고 베이글도 신선해요. 분위기도 좋습니다.',
      is_verified_purchase: true,
      like_count: 1,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  ]);

  // Create sample events
  await knex('events').insert([
    {
      id: 'event-1111-2222-3333-444444444444',
      title: '신규 가입 이벤트',
      description: '지금 가입하면 5000원 쿠폰 증정!',
      event_type: 'signup_promotion',
      banner_image: 'https://example.com/event_banner1.jpg',
      benefit_config: {
        type: 'coupon',
        amount: 5000,
        conditions: { new_users_only: true }
      },
      participant_count: 245,
      participant_limit: 1000,
      starts_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      is_active: true,
      created_by: '11111111-2222-3333-4444-555555555555',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);

  // Create sample budget setting for current month
  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM format
  await knex('budget_settings').insert({
    year_month: currentMonth,
    total_budget: 10000000, // 10M KRW
    referral_budget: 3000000, // 3M KRW
    coupon_budget: 4000000, // 4M KRW
    event_budget: 2000000, // 2M KRW
    settlement_budget: 1000000, // 1M KRW
    created_by: '11111111-2222-3333-4444-555555555555',
    created_at: knex.fn.now()
  });

  console.log('✅ Test data seeded successfully');
  console.log('📧 Test accounts created:');
  console.log('   - testuser1@example.com (Google OAuth)');
  console.log('   - testuser2@example.com (Kakao OAuth)');
  console.log('   - business1@example.com / Business123!');
  console.log('   - business2@example.com / Business456!');
}