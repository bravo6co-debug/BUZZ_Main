-- ====================================
-- Buzz Platform Complete Database Schema
-- Version: 2.0.0
-- Date: 2025-08-30
-- Description: 완전한 Admin 기능 지원을 위한 전체 스키마
-- ====================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================
-- 1. USER & AUTHENTICATION TABLES
-- ====================================

-- Users table (core user information)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'business', 'admin')),
    auth_provider VARCHAR(20) CHECK (auth_provider IN ('google', 'kakao', 'email')), -- 인증 제공자
    provider_id VARCHAR(255), -- 소셜 로그인 provider ID
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    password_hash TEXT, -- email 로그인용 (Buzz-Biz, Admin)
    must_change_password BOOLEAN DEFAULT false, -- Admin 첫 로그인 시 변경 필수
    created_by UUID REFERENCES users(id), -- Admin 계정 생성자
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- User profiles (extended user information)
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    birth_date DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    university VARCHAR(100),
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    referrer_id UUID REFERENCES users(id),
    marketing_agree BOOLEAN DEFAULT false,
    terms_agreed_at TIMESTAMPTZ NOT NULL,
    privacy_agreed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin roles (관리자 역할 정의)
CREATE TABLE admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    level INTEGER NOT NULL, -- 권한 레벨 (1: 최고관리자, 2: 관리자, 3: 매장관리자, 4: 컨텐츠관리자)
    permissions JSONB NOT NULL, -- 세부 권한 정의
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User admin roles (사용자-역할 매핑)
CREATE TABLE user_admin_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES admin_roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    expires_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, role_id)
);

-- Business applications (Buzz-Biz 가입 신청)
CREATE TABLE business_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    business_info JSONB NOT NULL, -- {name, registrationNumber, category, address, phone, bankAccount}
    documents JSONB, -- 첨부 서류 URLs
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    approved_user_id UUID REFERENCES users(id), -- 승인 후 생성된 user ID
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'), -- 30일 후 자동 만료
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for user tables
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_auth_provider ON users(auth_provider);
CREATE INDEX idx_users_provider_id ON users(provider_id);
CREATE INDEX idx_user_profiles_referral_code ON user_profiles(referral_code);
CREATE INDEX idx_user_profiles_referrer_id ON user_profiles(referrer_id);
CREATE INDEX idx_business_applications_status ON business_applications(status);
CREATE INDEX idx_business_applications_email ON business_applications(email);

-- ====================================
-- 2. REFERRAL SYSTEM TABLES
-- ====================================

-- Referral visit tracking
CREATE TABLE referral_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code VARCHAR(20) NOT NULL,
    visitor_ip INET,
    user_agent TEXT,
    referer_url TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    device_type VARCHAR(20),
    browser VARCHAR(50),
    visited_at TIMESTAMPTZ DEFAULT NOW(),
    converted_at TIMESTAMPTZ,
    converted_user_id UUID REFERENCES users(id)
);

-- Referral rewards
CREATE TABLE referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id),
    referred_user_id UUID REFERENCES users(id),
    reward_type VARCHAR(20) CHECK (reward_type IN ('mileage', 'coupon')),
    reward_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral performance stats (리퍼럴 성과 통계)
CREATE TABLE referral_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_visits INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    total_rewards DECIMAL(10,2) DEFAULT 0,
    monthly_rank INTEGER,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for referral tables
CREATE INDEX idx_referral_visits_referral_code ON referral_visits(referral_code);
CREATE INDEX idx_referral_visits_converted_user_id ON referral_visits(converted_user_id);
CREATE INDEX idx_referral_visits_visited_at ON referral_visits(visited_at);
CREATE INDEX idx_referral_rewards_referrer_id ON referral_rewards(referrer_id);
CREATE INDEX idx_referral_rewards_status ON referral_rewards(status);

-- ====================================
-- 3. BUSINESS MANAGEMENT TABLES
-- ====================================

-- Business information
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id),
    business_name VARCHAR(200) NOT NULL,
    business_number VARCHAR(20) UNIQUE,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    address_detail TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    phone VARCHAR(20),
    business_hours JSONB,
    images JSONB,
    tags TEXT[],
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    suspended_at TIMESTAMPTZ,
    suspension_reason TEXT,
    qr_scan_count INTEGER DEFAULT 0,
    avg_rating DECIMAL(2,1) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business exposure tracking (노출 공평성 관리 개선)
CREATE TABLE business_exposures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    exposure_date DATE NOT NULL,
    exposure_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    main_exposure_count INTEGER DEFAULT 0,
    category_exposure_count INTEGER DEFAULT 0,
    search_exposure_count INTEGER DEFAULT 0,
    rotation_slot INTEGER, -- 로테이션 순서
    last_main_exposure TIMESTAMPTZ, -- 마지막 메인 노출 시간
    guaranteed_exposure_count INTEGER DEFAULT 0, -- 보장 노출 횟수
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, exposure_date)
);

-- Business reviews
CREATE TABLE business_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    images JSONB,
    is_verified_purchase BOOLEAN DEFAULT false,
    like_count INTEGER DEFAULT 0,
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for business tables
CREATE INDEX idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_category ON businesses(category);
CREATE INDEX idx_business_exposures_business_date ON business_exposures(business_id, exposure_date);
CREATE INDEX idx_business_exposures_rotation_slot ON business_exposures(rotation_slot);
CREATE INDEX idx_business_reviews_business_id ON business_reviews(business_id);

-- ====================================
-- 4. COUPON SYSTEM TABLES
-- ====================================

-- Coupon templates
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('signup', 'referral', 'event', 'basic')),
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
    discount_value DECIMAL(10,2) NOT NULL,
    min_purchase_amount DECIMAL(10,2),
    max_discount_amount DECIMAL(10,2),
    valid_from DATE,
    valid_until DATE,
    total_quantity INTEGER,
    used_quantity INTEGER DEFAULT 0,
    applicable_businesses UUID[], -- Array of business IDs
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User coupons
CREATE TABLE user_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    coupon_id UUID NOT NULL REFERENCES coupons(id),
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ,
    used_business_id UUID REFERENCES businesses(id),
    used_amount DECIMAL(10,2),
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
    qr_code_data TEXT UNIQUE
);

-- Create indexes for coupon tables
CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_status ON user_coupons(status);
CREATE INDEX idx_user_coupons_expires_at ON user_coupons(expires_at);
CREATE INDEX idx_user_coupons_qr_code_data ON user_coupons(qr_code_data);

-- ====================================
-- 5. MILEAGE SYSTEM TABLES
-- ====================================

-- Mileage accounts
CREATE TABLE mileage_accounts (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0 CHECK (balance >= 0),
    total_earned DECIMAL(10,2) DEFAULT 0,
    total_used DECIMAL(10,2) DEFAULT 0,
    total_expired DECIMAL(10,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mileage transactions
CREATE TABLE mileage_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    business_id UUID REFERENCES businesses(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'use', 'expire', 'cancel', 'refund')),
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    description TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for mileage tables
CREATE INDEX idx_mileage_transactions_user_id ON mileage_transactions(user_id);
CREATE INDEX idx_mileage_transactions_business_id ON mileage_transactions(business_id);
CREATE INDEX idx_mileage_transactions_type ON mileage_transactions(type);
CREATE INDEX idx_mileage_transactions_created_at ON mileage_transactions(created_at);

-- ====================================
-- 6. QR CODE SYSTEM TABLES
-- ====================================

-- QR codes
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    business_id UUID REFERENCES businesses(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('coupon', 'mileage', 'event')),
    reference_id UUID,
    qr_data TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,
    scanned_at TIMESTAMPTZ,
    scanned_by_business_id UUID REFERENCES businesses(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR events
CREATE TABLE qr_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    total_qr_count INTEGER NOT NULL,
    scanned_count INTEGER DEFAULT 0,
    win_count INTEGER DEFAULT 0,
    prize_config JSONB NOT NULL, -- {prizes: [{rank: 1, amount: 100000, quantity: 1}, ...]}
    budget_limit DECIMAL(10,2) NOT NULL,
    budget_used DECIMAL(10,2) DEFAULT 0,
    distribution_channels JSONB, -- {university: 30%, tourist: 30%, online: 40%}
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'paused', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR event participations
CREATE TABLE qr_event_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_event_id UUID NOT NULL REFERENCES qr_events(id),
    user_id UUID REFERENCES users(id),
    qr_code TEXT NOT NULL,
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    is_winner BOOLEAN DEFAULT false,
    prize_rank INTEGER,
    prize_amount DECIMAL(10,2),
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for QR tables
CREATE INDEX idx_qr_codes_user_id ON qr_codes(user_id);
CREATE INDEX idx_qr_codes_qr_data ON qr_codes(qr_data);
CREATE INDEX idx_qr_codes_expires_at ON qr_codes(expires_at);
CREATE INDEX idx_qr_event_participations_qr_event_id ON qr_event_participations(qr_event_id);

-- ====================================
-- 7. SETTLEMENT SYSTEM TABLES
-- ====================================

-- Settlement requests
CREATE TABLE settlement_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    settlement_date DATE NOT NULL,
    coupon_count INTEGER DEFAULT 0,
    coupon_amount DECIMAL(10,2) DEFAULT 0,
    mileage_count INTEGER DEFAULT 0,
    mileage_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    bank_name VARCHAR(50),
    bank_account VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    paid_at TIMESTAMPTZ,
    rejection_reason TEXT,
    admin_note TEXT,
    UNIQUE(business_id, settlement_date)
);

-- Settlement details
CREATE TABLE settlement_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_request_id UUID NOT NULL REFERENCES settlement_requests(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('coupon', 'mileage')),
    transaction_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    customer_name VARCHAR(100),
    transaction_at TIMESTAMPTZ NOT NULL
);

-- Create indexes for settlement tables
CREATE INDEX idx_settlement_requests_business_id ON settlement_requests(business_id);
CREATE INDEX idx_settlement_requests_status ON settlement_requests(status);
CREATE INDEX idx_settlement_requests_settlement_date ON settlement_requests(settlement_date);
CREATE INDEX idx_settlement_details_settlement_request_id ON settlement_details(settlement_request_id);

-- ====================================
-- 8. BUDGET MANAGEMENT TABLES
-- ====================================

-- Monthly budget settings
CREATE TABLE budget_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year_month CHAR(7) UNIQUE NOT NULL, -- 'YYYY-MM'
    total_budget DECIMAL(12,2) NOT NULL,
    referral_budget DECIMAL(10,2) NOT NULL,
    coupon_budget DECIMAL(10,2) NOT NULL,
    event_budget DECIMAL(10,2) NOT NULL,
    settlement_budget DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Budget executions
CREATE TABLE budget_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_setting_id UUID NOT NULL REFERENCES budget_settings(id),
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget control rules
CREATE TABLE budget_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_type VARCHAR(50) NOT NULL,
    threshold_percentage INTEGER NOT NULL,
    action VARCHAR(100) NOT NULL,
    action_params JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget alerts
CREATE TABLE budget_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_setting_id UUID NOT NULL REFERENCES budget_settings(id),
    alert_type VARCHAR(50) NOT NULL,
    alert_level VARCHAR(20) CHECK (alert_level IN ('info', 'warning', 'danger', 'critical')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for budget tables
CREATE INDEX idx_budget_settings_year_month ON budget_settings(year_month);
CREATE INDEX idx_budget_executions_budget_setting_id ON budget_executions(budget_setting_id);
CREATE INDEX idx_budget_executions_executed_at ON budget_executions(executed_at);
CREATE INDEX idx_budget_alerts_is_read ON budget_alerts(is_read);

-- ====================================
-- 9. CONTENT MANAGEMENT TABLES
-- ====================================

-- Regional content
CREATE TABLE regional_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    description TEXT,
    content_body TEXT,
    images JSONB,
    tags TEXT[],
    display_order INTEGER,
    is_featured BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    banner_image TEXT,
    detail_images JSONB,
    benefit_config JSONB, -- {type: 'coupon', amount: 5000, conditions: {...}}
    participant_count INTEGER DEFAULT 0,
    participant_limit INTEGER,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event participations
CREATE TABLE event_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id),
    user_id UUID NOT NULL REFERENCES users(id),
    participated_at TIMESTAMPTZ DEFAULT NOW(),
    reward_type VARCHAR(50),
    reward_amount DECIMAL(10,2),
    reward_issued_at TIMESTAMPTZ,
    UNIQUE(event_id, user_id)
);

-- 홈화면 설정 (신규 추가)
CREATE TABLE home_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_type VARCHAR(50) NOT NULL, -- 'banner', 'featured_business', 'category_order'
    config_data JSONB NOT NULL,
    display_order INTEGER,
    is_active BOOLEAN DEFAULT true,
    scheduled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    target_audience VARCHAR(50), -- 'all', 'new_users', 'active_users'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- 마케터 컨텐츠 (신규 추가)
CREATE TABLE marketer_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- 'education', 'campaign', 'tips', 'success_story'
    content_body TEXT,
    video_url TEXT,
    attachments JSONB,
    target_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for content tables
CREATE INDEX idx_regional_contents_is_featured ON regional_contents(is_featured);
CREATE INDEX idx_regional_contents_published_at ON regional_contents(published_at);
CREATE INDEX idx_events_is_active ON events(is_active);
CREATE INDEX idx_events_starts_at ON events(starts_at);
CREATE INDEX idx_event_participations_event_id ON event_participations(event_id);
CREATE INDEX idx_home_configs_config_type ON home_configs(config_type);
CREATE INDEX idx_home_configs_is_active ON home_configs(is_active);
CREATE INDEX idx_marketer_contents_content_type ON marketer_contents(content_type);

-- ====================================
-- 10. SYSTEM MANAGEMENT TABLES (신규 추가)
-- ====================================

-- 시스템 설정
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'referral', 'coupon', 'mileage', 'settlement', 'security'
    data_type VARCHAR(20), -- 'string', 'number', 'boolean', 'json'
    is_public BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- 보안 설정
CREATE TABLE security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_type VARCHAR(50) NOT NULL, -- 'rate_limit', 'ip_whitelist', 'ip_blacklist', 'login_attempt'
    setting_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IP 차단 목록
CREATE TABLE ip_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL UNIQUE,
    reason TEXT,
    blocked_until TIMESTAMPTZ,
    is_permanent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Create indexes for system tables
CREATE INDEX idx_system_settings_category ON system_settings(category);
CREATE INDEX idx_security_settings_setting_type ON security_settings(setting_type);
CREATE INDEX idx_ip_blacklist_ip_address ON ip_blacklist(ip_address);

-- ====================================
-- 11. COMMUNITY TABLES
-- ====================================

-- Community posts
CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    category VARCHAR(50) NOT NULL CHECK (category IN ('free', 'tip', 'review', 'qna')),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    images JSONB,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    hidden_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community comments
CREATE TABLE community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    parent_comment_id UUID REFERENCES community_comments(id),
    content TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT false,
    hidden_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community reports (신고 관리)
CREATE TABLE community_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(20) CHECK (content_type IN ('post', 'comment')),
    content_id UUID NOT NULL,
    reporter_id UUID NOT NULL REFERENCES users(id),
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    action_taken TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for community tables
CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX idx_community_posts_category ON community_posts(category);
CREATE INDEX idx_community_posts_created_at ON community_posts(created_at);
CREATE INDEX idx_community_comments_post_id ON community_comments(post_id);
CREATE INDEX idx_community_reports_status ON community_reports(status);

-- ====================================
-- 12. NOTIFICATION TABLES
-- ====================================

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push tokens
CREATE TABLE push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    platform VARCHAR(20) CHECK (platform IN ('ios', 'android', 'web')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 공지사항/팝업 (신규 추가)
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('notice', 'popup', 'banner', 'urgent')),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    target_audience VARCHAR(50) NOT NULL, -- 'all', 'users', 'businesses', 'admin'
    target_conditions JSONB, -- {min_visits: 5, university: 'bukyung'}
    priority INTEGER DEFAULT 0,
    button_text VARCHAR(50),
    button_link TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 팝업 배너 전용 테이블 (추가)
CREATE TABLE popup_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_position VARCHAR(20) DEFAULT 'center' CHECK (display_position IN ('center', 'bottom', 'top', 'fullscreen')),
    display_frequency VARCHAR(20) DEFAULT 'always' CHECK (display_frequency IN ('always', 'once_per_day', 'once_per_week', 'once_ever')),
    animation_type VARCHAR(20) DEFAULT 'none' CHECK (animation_type IN ('none', 'fade', 'slide', 'zoom')),
    auto_close_seconds INTEGER, -- NULL means manual close only
    show_close_button BOOLEAN DEFAULT true,
    background_color VARCHAR(7), -- Hex color
    overlay_opacity DECIMAL(3,2) DEFAULT 0.5,
    width INTEGER, -- pixels or percentage
    height INTEGER, -- pixels or percentage
    border_radius INTEGER DEFAULT 8,
    z_index INTEGER DEFAULT 9999,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 팝업 배너 노출 기록
CREATE TABLE popup_banner_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    popup_banner_id UUID REFERENCES popup_banners(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(100),
    action VARCHAR(20) NOT NULL CHECK (action IN ('view', 'click', 'close', 'auto_close')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for notification tables
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_announcements_type ON announcements(type);
CREATE INDEX idx_announcements_is_active ON announcements(is_active);
CREATE INDEX idx_popup_banners_announcement_id ON popup_banners(announcement_id);
CREATE INDEX idx_popup_banner_impressions_popup_id ON popup_banner_impressions(popup_banner_id);
CREATE INDEX idx_popup_banner_impressions_user_id ON popup_banner_impressions(user_id);

-- ====================================
-- 13. AUDIT & LOGGING TABLES
-- ====================================

-- Audit logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API logs
CREATE TABLE api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    method VARCHAR(10) NOT NULL,
    endpoint TEXT NOT NULL,
    request_headers JSONB,
    request_body JSONB,
    response_status INTEGER,
    response_body JSONB,
    response_time_ms INTEGER,
    error_message TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 관리자 활동 로그 (신규 추가)
CREATE TABLE admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id),
    activity_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    affected_entity VARCHAR(50),
    affected_id UUID,
    metadata JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit tables
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX idx_api_logs_created_at ON api_logs(created_at);
CREATE INDEX idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX idx_admin_activity_logs_activity_type ON admin_activity_logs(activity_type);

-- ====================================
-- 14. ANALYTICS TABLES (신규 추가)
-- ====================================

-- 일별 통계 집계
CREATE TABLE daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stat_date DATE UNIQUE NOT NULL,
    new_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_referral_visits INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_qr_scans INTEGER DEFAULT 0,
    total_settlements DECIMAL(10,2) DEFAULT 0,
    total_budget_used DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B 테스트 설정
CREATE TABLE ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name VARCHAR(100) NOT NULL,
    test_type VARCHAR(50) NOT NULL, -- 'home_layout', 'referral_reward', 'coupon_value'
    variant_a JSONB NOT NULL,
    variant_b JSONB NOT NULL,
    traffic_split INTEGER DEFAULT 50, -- percentage for variant A
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'paused', 'completed')),
    winner VARCHAR(1), -- 'A' or 'B'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- A/B 테스트 참여자
CREATE TABLE ab_test_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id),
    user_id UUID NOT NULL REFERENCES users(id),
    variant CHAR(1) NOT NULL CHECK (variant IN ('A', 'B')),
    converted BOOLEAN DEFAULT false,
    conversion_value DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(test_id, user_id)
);

-- Create indexes for analytics tables
CREATE INDEX idx_daily_stats_stat_date ON daily_stats(stat_date);
CREATE INDEX idx_ab_tests_status ON ab_tests(status);
CREATE INDEX idx_ab_test_participants_test_id ON ab_test_participants(test_id);

-- ====================================
-- TRIGGERS & FUNCTIONS
-- ====================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mileage_accounts_updated_at BEFORE UPDATE ON mileage_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regional_contents_updated_at BEFORE UPDATE ON regional_contents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON community_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_comments_updated_at BEFORE UPDATE ON community_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_home_configs_updated_at BEFORE UPDATE ON home_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketer_contents_updated_at BEFORE UPDATE ON marketer_contents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Example RLS policies for users table
CREATE POLICY users_select_policy ON users
    FOR SELECT USING (
        auth.uid() = id OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY users_update_policy ON users
    FOR UPDATE USING (auth.uid() = id);

-- Business RLS policies
CREATE POLICY businesses_select_policy ON businesses
    FOR SELECT USING (true); -- 모든 사용자가 매장 조회 가능

CREATE POLICY businesses_update_policy ON businesses
    FOR UPDATE USING (
        owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Mileage RLS policies
CREATE POLICY mileage_accounts_select_policy ON mileage_accounts
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'business'))
    );

-- ====================================
-- INITIAL DATA SEEDING
-- ====================================

-- Insert default admin roles
INSERT INTO admin_roles (name, display_name, level, permissions, description) VALUES
    ('super_admin', '최고관리자', 1, '{"*": ["*"]}'::jsonb, '모든 권한 - 시스템 설정, 관리자 계정 생성'),
    ('admin', '관리자', 2, '{"users": ["*"], "businesses": ["*"], "settlements": ["*"], "contents": ["*"], "budget": ["read"], "referral": ["read"]}'::jsonb, '사용자/매장/컨텐츠/정산 관리'),
    ('business_manager', '매장관리자', 3, '{"businesses": ["create", "read", "update"], "settlements": ["read"]}'::jsonb, '매장 관리 및 정산 조회'),
    ('content_manager', '컨텐츠관리자', 4, '{"contents": ["*"], "events": ["*"]}'::jsonb, '컨텐츠 및 이벤트 관리');

-- Insert default budget control rules
INSERT INTO budget_controls (control_type, threshold_percentage, action, action_params) VALUES
    ('budget_warning', 70, 'send_alert', '{"level": "warning", "channels": ["email", "sms"]}'::jsonb),
    ('budget_danger', 85, 'reduce_rewards', '{"reduction": 30, "affected": ["referral", "event"]}'::jsonb),
    ('budget_critical', 95, 'limit_services', '{"services": ["referral", "event", "new_coupon"]}'::jsonb),
    ('budget_blocked', 98, 'emergency_stop', '{"stop_all": true, "allow_existing": true}'::jsonb),
    ('budget_exhausted', 100, 'complete_block', '{"block_all": true}'::jsonb);

-- Insert default system settings
INSERT INTO system_settings (key, value, description, category, data_type) VALUES
    ('referral_reward_amount', '500'::jsonb, '리퍼럴 보상 금액', 'referral', 'number'),
    ('referral_visitor_coupon', '3000'::jsonb, '방문자 쿠폰 금액', 'referral', 'number'),
    ('signup_bonus_mileage', '5000'::jsonb, '가입 보너스 마일리지', 'referral', 'number'),
    ('signup_bonus_coupon', '5000'::jsonb, '가입 보너스 쿠폰 금액', 'referral', 'number'),
    ('mileage_expire_days', '365'::jsonb, '마일리지 유효기간 (일)', 'mileage', 'number'),
    ('qr_code_ttl_seconds', '300'::jsonb, 'QR 코드 유효시간 (초)', 'security', 'number'),
    ('max_daily_referral_reward', '50000'::jsonb, '일일 최대 리퍼럴 보상', 'referral', 'number'),
    ('coupon_default_expire_days', '30'::jsonb, '쿠폰 기본 유효기간 (일)', 'coupon', 'number'),
    ('settlement_processing_days', '3'::jsonb, '정산 처리 기간 (영업일)', 'settlement', 'number'),
    ('api_rate_limit_per_minute', '60'::jsonb, 'API 분당 요청 제한', 'security', 'number');

-- Insert default security settings
INSERT INTO security_settings (setting_type, setting_value, description) VALUES
    ('rate_limit', '{"per_minute": 60, "per_hour": 1000}'::jsonb, 'API 요청 제한'),
    ('login_attempt', '{"max_attempts": 5, "lockout_minutes": 30}'::jsonb, '로그인 시도 제한'),
    ('session_timeout', '{"idle_minutes": 30, "absolute_hours": 24}'::jsonb, '세션 타임아웃 설정'),
    ('password_policy', '{"min_length": 8, "require_uppercase": true, "require_number": true}'::jsonb, '비밀번호 정책');

-- Insert default coupon templates
INSERT INTO coupons (name, type, discount_type, discount_value, valid_until, status) VALUES
    ('신규가입 환영 쿠폰', 'signup', 'fixed', 5000, '2025-12-31', 'active'),
    ('기본 할인 쿠폰', 'basic', 'fixed', 3000, '2025-12-31', 'active'),
    ('리퍼럴 보상 쿠폰', 'referral', 'percentage', 10, '2025-12-31', 'active'),
    ('크리스마스 이벤트 쿠폰', 'event', 'percentage', 30, '2025-12-25', 'active');

-- ====================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ====================================

-- Additional composite indexes for frequently joined queries
CREATE INDEX idx_referral_performance ON referral_visits(referral_code, converted_at) WHERE converted_at IS NOT NULL;
CREATE INDEX idx_business_active ON businesses(status, category) WHERE status = 'approved';
CREATE INDEX idx_settlement_pending ON settlement_requests(status, business_id) WHERE status = 'pending';
CREATE INDEX idx_budget_current ON budget_executions(budget_setting_id, executed_at);
CREATE INDEX idx_active_events ON events(is_active, starts_at, ends_at) WHERE is_active = true;
CREATE INDEX idx_user_coupons_active ON user_coupons(user_id, status, expires_at) WHERE status = 'active';

-- ====================================
-- END OF COMPLETE SCHEMA
-- ====================================