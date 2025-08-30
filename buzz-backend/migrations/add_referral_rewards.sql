-- Add reward tracking columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS reward_claimed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reward_claimed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reward_type VARCHAR(20);

-- Create discount_codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  referral_count INTEGER NOT NULL DEFAULT 0,
  valid_until TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  used_by_business_id INTEGER REFERENCES businesses(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_discount_codes_user_id ON discount_codes(user_id);
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_valid_until ON discount_codes(valid_until);

-- Add comment for documentation
COMMENT ON TABLE discount_codes IS 'Stores discount QR codes generated from referral rewards';
COMMENT ON COLUMN discount_codes.code IS 'Unique discount code (format: BUZZ-DC-XXXXX)';
COMMENT ON COLUMN discount_codes.discount_percentage IS 'Discount percentage (10%, 15%, 20%, 30%)';
COMMENT ON COLUMN discount_codes.referral_count IS 'Number of referrals used to generate this code';