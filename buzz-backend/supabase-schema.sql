-- Buzz Platform Complete Database Schema for Supabase
-- Version: 2.0.0
-- Date: 2025-08-30

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. USER MANAGEMENT TABLES
-- =====================================================

-- Core users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'business', 'admin')),
    auth_provider VARCHAR(50) CHECK (auth_provider IN ('google', 'kakao', 'email')),
    provider_id VARCHAR(255),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    password_hash TEXT,
    must_change_password BOOLEAN DEFAULT false,
    created_by UUID,
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- User profiles (extended information)
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    birth_date DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    university VARCHAR(100),
    referral_code VARCHAR(20) NOT NULL UNIQUE,
    referrer_id UUID REFERENCES users(id),
    marketing_agree BOOLEAN DEFAULT false,
    terms_agreed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    privacy_agreed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin role definitions
CREATE TABLE IF NOT EXISTS admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User admin role assignments
CREATE TABLE IF NOT EXISTS user_admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- Business applications
CREATE TABLE IF NOT EXISTS business_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    business_number VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    bank_info JSONB,
    documents JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. BUSINESS MANAGEMENT TABLES
-- =====================================================

-- Business information
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    business_number VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    business_hours JSONB,
    images JSONB DEFAULT '[]',
    bank_info JSONB,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business exposure tracking for fair rotation
CREATE TABLE IF NOT EXISTS business_exposures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    exposure_count INTEGER DEFAULT 0,
    main_exposure_count INTEGER DEFAULT 0,
    last_main_exposure TIMESTAMPTZ,
    rotation_slot INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, date)
);

-- Business reviews
CREATE TABLE IF NOT EXISTS business_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT NOT NULL,
    images JSONB DEFAULT '[]',
    visit_date DATE,
    is_verified_purchase BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden', 'reported')),
    helpful_count INTEGER DEFAULT 0,
    report_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. REFERRAL SYSTEM TABLES
-- =====================================================

-- Referral visits tracking
CREATE TABLE IF NOT EXISTS referral_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code VARCHAR(20) NOT NULL,
    visitor_ip VARCHAR(45),
    user_agent TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    visited_at TIMESTAMPTZ DEFAULT NOW(),
    converted_at TIMESTAMPTZ,
    converted_user_id UUID REFERENCES users(id),
    is_converted BOOLEAN DEFAULT false,
    visitor_coupon_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral rewards distribution
CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id),
    referee_id UUID NOT NULL REFERENCES users(id),
    visit_id UUID REFERENCES referral_visits(id),
    reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('referral', 'first_purchase', 'repeat_purchase')),
    amount INTEGER NOT NULL,
    currency VARCHAR(10) DEFAULT 'KRW',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral performance statistics
CREATE TABLE IF NOT EXISTS referral_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    visits INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    rewards INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- =====================================================
-- 4. COUPON & MILEAGE SYSTEM TABLES
-- =====================================================

-- Coupon templates
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    coupon_type VARCHAR(50) NOT NULL CHECK (coupon_type IN ('signup', 'referral', 'event', 'visit')),
    discount_type VARCHAR(50) NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
    discount_value INTEGER NOT NULL,
    min_purchase_amount INTEGER DEFAULT 0,
    max_discount_amount INTEGER,
    usage_limit INTEGER,
    expiry_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User coupon instances
CREATE TABLE IF NOT EXISTS user_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coupon_id UUID NOT NULL REFERENCES coupons(id),
    business_id UUID REFERENCES businesses(id),
    qr_code VARCHAR(100) UNIQUE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
    used_at TIMESTAMPTZ,
    used_amount INTEGER,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User mileage accounts
CREATE TABLE IF NOT EXISTS mileage_accounts (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 0 CHECK (balance >= 0),
    total_earned INTEGER DEFAULT 0,
    total_used INTEGER DEFAULT 0,
    last_transaction_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mileage transaction history
CREATE TABLE IF NOT EXISTS mileage_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id),
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('earn', 'use', 'expire', 'refund')),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    qr_code VARCHAR(100),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. QR CODE & EVENTS SYSTEM
-- =====================================================

-- QR code tracking
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    code_type VARCHAR(50) NOT NULL CHECK (code_type IN ('coupon', 'mileage')),
    qr_code VARCHAR(100) NOT NULL UNIQUE,
    payload JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    business_id UUID REFERENCES businesses(id),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR events (special promotions)
CREATE TABLE IF NOT EXISTS qr_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_qr_count INTEGER NOT NULL,
    prize_config JSONB NOT NULL,
    budget_limit INTEGER,
    distribution_channels JSONB,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR event participation tracking
CREATE TABLE IF NOT EXISTS qr_event_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES qr_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    qr_code VARCHAR(100) NOT NULL,
    prize_won JSONB,
    participated_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- =====================================================
-- 6. SETTLEMENT & FINANCIAL TABLES
-- =====================================================

-- Settlement requests from businesses
CREATE TABLE IF NOT EXISTS settlement_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    settlement_date DATE NOT NULL,
    total_amount INTEGER NOT NULL,
    coupon_amount INTEGER DEFAULT 0,
    coupon_count INTEGER DEFAULT 0,
    mileage_amount INTEGER DEFAULT 0,
    mileage_count INTEGER DEFAULT 0,
    bank_info JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
    admin_note TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settlement transaction details
CREATE TABLE IF NOT EXISTS settlement_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id UUID NOT NULL REFERENCES settlement_requests(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('coupon', 'mileage')),
    transaction_id UUID,
    amount INTEGER NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget management
CREATE TABLE IF NOT EXISTS budget_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year_month VARCHAR(7) NOT NULL UNIQUE, -- YYYY-MM format
    total_budget INTEGER NOT NULL,
    category_budgets JSONB NOT NULL DEFAULT '{}',
    daily_limit INTEGER,
    warning_threshold INTEGER DEFAULT 70,
    danger_threshold INTEGER DEFAULT 85,
    critical_threshold INTEGER DEFAULT 95,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget execution tracking
CREATE TABLE IF NOT EXISTS budget_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_setting_id UUID REFERENCES budget_settings(id),
    category VARCHAR(50) NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget control actions
CREATE TABLE IF NOT EXISTS budget_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('limit_services', 'emergency_stop', 'reduce_rewards')),
    affected_services JSONB DEFAULT '[]',
    reason TEXT NOT NULL,
    duration_seconds INTEGER,
    triggered_by UUID REFERENCES users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget alerts
CREATE TABLE IF NOT EXISTS budget_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('warning', 'danger', 'critical')),
    category VARCHAR(50),
    current_percentage DECIMAL(5,2),
    threshold_percentage INTEGER,
    message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. SYSTEM & AUDIT TABLES
-- =====================================================

-- System configuration settings
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security settings
CREATE TABLE IF NOT EXISTS security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    login_max_attempts INTEGER DEFAULT 5,
    login_lockout_minutes INTEGER DEFAULT 30,
    ip_blacklist JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    changes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API request/response logs
CREATE TABLE IF NOT EXISTS api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content management tables
CREATE TABLE IF NOT EXISTS contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('banner', 'regional', 'marketer', 'announcement')),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    images JSONB DEFAULT '[]',
    target_audience VARCHAR(50) DEFAULT 'all',
    is_featured BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON user_profiles(referral_code);

-- Business indexes
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_business_reviews_business_id ON business_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_business_reviews_user_id ON business_reviews(user_id);

-- Referral indexes
CREATE INDEX IF NOT EXISTS idx_referral_visits_referral_code ON referral_visits(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_id ON referral_rewards(referrer_id);

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_mileage_transactions_user_id ON mileage_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_mileage_transactions_created_at ON mileage_transactions(created_at);

-- QR and event indexes
CREATE INDEX IF NOT EXISTS idx_qr_codes_qr_code ON qr_codes(qr_code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_expires_at ON qr_codes(expires_at);

-- Settlement indexes
CREATE INDEX IF NOT EXISTS idx_settlement_requests_business_id ON settlement_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_settlement_requests_status ON settlement_requests(status);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT COLUMNS
-- =====================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_exposures_updated_at BEFORE UPDATE ON business_exposures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mileage_accounts_updated_at BEFORE UPDATE ON mileage_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Insert default admin roles
INSERT INTO admin_roles (name, display_name, description, permissions) VALUES
('super_admin', 'Super Administrator', 'Full system access', '{"all": true}'),
('admin', 'Administrator', 'General administration', '{"budget": ["view", "edit"], "users": ["view", "edit"], "businesses": ["view", "edit"], "settlements": ["view", "approve"]}'),
('business_manager', 'Business Manager', 'Business application and management', '{"businesses": ["view", "edit", "approve"], "settlements": ["view"]}'),
('content_manager', 'Content Manager', 'Content and marketing management', '{"contents": ["view", "edit", "create"], "events": ["view", "edit", "create"]}')
ON CONFLICT (name) DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (key, value, category, data_type, description, is_public) VALUES
('referral_reward_amount', '500', 'referral', 'number', 'Default referral reward amount in KRW', false),
('visitor_coupon_amount', '3000', 'coupon', 'number', 'Visitor coupon amount in KRW', false),
('signup_bonus_mileage', '5000', 'mileage', 'number', 'Signup bonus mileage points', false),
('signup_bonus_coupon', '5000', 'coupon', 'number', 'Signup bonus coupon amount in KRW', false),
('qr_code_ttl_seconds', '300', 'qr', 'number', 'QR code time-to-live in seconds', false),
('mileage_expire_days', '365', 'mileage', 'number', 'Mileage expiration in days', false),
('app_name', 'Buzz Platform', 'app', 'string', 'Application name', true),
('app_version', '1.0.0', 'app', 'string', 'Application version', true)
ON CONFLICT (key) DO NOTHING;

-- Insert default security settings
INSERT INTO security_settings (rate_limit_per_minute, rate_limit_per_hour, login_max_attempts, login_lockout_minutes)
VALUES (60, 1000, 5, 30)
ON CONFLICT DO NOTHING;

-- Insert default coupons
INSERT INTO coupons (name, description, coupon_type, discount_type, discount_value, min_purchase_amount, expiry_days, is_active) VALUES
('신규가입 환영 쿠폰', '신규 회원가입을 축하하는 쿠폰입니다', 'signup', 'fixed', 5000, 30000, 30, true),
('추천인 보상 쿠폰', '친구 추천 성공 보상 쿠폰입니다', 'referral', 'fixed', 3000, 20000, 30, true),
('매장 방문 쿠폰', '매장 방문 고객을 위한 쿠폰입니다', 'visit', 'fixed', 2000, 10000, 7, true)
ON CONFLICT DO NOTHING;

-- Schema setup complete message
SELECT 'Buzz Platform database schema created successfully!' AS status;