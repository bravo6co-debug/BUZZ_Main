-- Migration 008: Create reward policies and change log tables
-- Description: Creates tables for dynamic reward policy management

-- Create reward_policies table
CREATE TABLE reward_policies (
    id VARCHAR(255) PRIMARY KEY,
    type ENUM(
        'referral_recommender', 
        'referral_referee', 
        'review', 
        'store_visit', 
        'qr_first_use', 
        'repeat_purchase', 
        'signup'
    ) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    reward JSON NOT NULL COMMENT 'JSON object containing type, amount, currency/unit',
    conditions JSON NULL COMMENT 'JSON object containing minAmount, maxRewards, etc.',
    status ENUM('active', 'inactive') DEFAULT 'active',
    priority INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    modified_by VARCHAR(255) NULL,
    
    INDEX idx_type_status (type, status),
    INDEX idx_status_priority (status, priority),
    INDEX idx_created_at (created_at)
);

-- Create policy change logs table
CREATE TABLE policy_change_logs (
    id VARCHAR(255) PRIMARY KEY,
    policy_id VARCHAR(255) NOT NULL,
    changed_by VARCHAR(255) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action ENUM('create', 'update', 'delete', 'deactivate', 'activate') NOT NULL,
    changes JSON NULL COMMENT 'JSON array of change objects with field, oldValue, newValue',
    reason TEXT NULL,
    
    INDEX idx_policy_id (policy_id),
    INDEX idx_changed_at (changed_at),
    INDEX idx_changed_by (changed_by),
    
    FOREIGN KEY (policy_id) REFERENCES reward_policies(id) ON DELETE CASCADE
);

-- Insert default reward policies
INSERT INTO reward_policies (id, type, name, description, reward, conditions, status, priority, created_by) VALUES
(
    'policy-referral-recommender', 
    'referral_recommender',
    '리퍼럴 추천인 보상',
    '친구를 성공적으로 추천한 회원에게 지급하는 보상',
    '{"type": "cash", "amount": 5000, "currency": "KRW"}',
    '{"minOrderAmount": 30000, "maxRewards": 10, "validPeriod": "2024-12-31"}',
    'active',
    1,
    'system'
),
(
    'policy-referral-referee', 
    'referral_referee',
    '리퍼럴 피추천인 보상',
    '추천을 받고 가입한 신규 회원에게 지급하는 보상',
    '{"type": "cash", "amount": 3000, "currency": "KRW"}',
    '{"minOrderAmount": 20000, "maxRewards": 1, "validPeriod": "2024-12-31"}',
    'active',
    2,
    'system'
),
(
    'policy-review', 
    'review',
    '리뷰 작성 보상',
    '주문 후 리뷰를 작성한 회원에게 지급하는 보상',
    '{"type": "coupon", "amount": 3000, "currency": "KRW"}',
    '{"photoRequired": true, "minOrderAmount": 10000, "maxRewards": 3}',
    'active',
    3,
    'system'
),
(
    'policy-store-visit', 
    'store_visit',
    '매장 방문 보상',
    '매장을 방문하고 체크인한 회원에게 지급하는 보상',
    '{"type": "point", "amount": 500, "unit": "P"}',
    '{"maxRewards": 1}',
    'active',
    4,
    'system'
),
(
    'policy-qr-first-use', 
    'qr_first_use',
    'QR 첫 사용 보상',
    '추천받은 회원이 처음으로 QR 코드를 사용했을 때 추천인에게 지급',
    '{"type": "cash", "amount": 5000, "currency": "KRW"}',
    '{"minOrderAmount": 30000, "maxRewards": 1}',
    'active',
    5,
    'system'
),
(
    'policy-signup', 
    'signup',
    '신규 가입 보상',
    '신규 회원 가입 완료 시 지급하는 환영 보상',
    '{"type": "point", "amount": 1000, "unit": "P"}',
    '{"maxRewards": 1}',
    'active',
    6,
    'system'
),
(
    'policy-repeat-purchase', 
    'repeat_purchase',
    '재구매 보상',
    '추천받은 회원이 재구매할 때 추천인에게 지급하는 보상',
    '{"type": "point", "amount": 500, "unit": "P"}',
    '{"minOrderAmount": 10000, "maxRewards": 5}',
    'active',
    7,
    'system'
);

-- Create initial change logs for default policies
INSERT INTO policy_change_logs (id, policy_id, changed_by, action, reason) 
SELECT 
    CONCAT('log-initial-', id),
    id,
    'system',
    'create',
    'Initial system policy creation'
FROM reward_policies;