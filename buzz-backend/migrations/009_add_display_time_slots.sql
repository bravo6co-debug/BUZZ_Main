-- Migration: Add display_time_slots column to businesses table
-- Version: 009
-- Date: 2025-08-30
-- Description: Add time-based display feature for businesses

-- Add display_time_slots column to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS display_time_slots JSONB DEFAULT '{
  "morning": false,
  "lunch": false, 
  "dinner": false,
  "night": false
}'::jsonb;

-- Add display_time_slots column to business_applications table
ALTER TABLE business_applications 
ADD COLUMN IF NOT EXISTS display_time_slots JSONB DEFAULT '{
  "morning": false,
  "lunch": false, 
  "dinner": false,
  "night": false
}'::jsonb;

-- Add comments to explain the columns
COMMENT ON COLUMN businesses.display_time_slots IS 'Time slots when business should be displayed: morning (06:00-11:00), lunch (11:00-14:00), dinner (17:00-21:00), night (21:00-02:00)';
COMMENT ON COLUMN business_applications.display_time_slots IS 'Time slots when business should be displayed: morning (06:00-11:00), lunch (11:00-14:00), dinner (17:00-21:00), night (21:00-02:00)';

-- Create indexes for efficient time-based filtering
CREATE INDEX IF NOT EXISTS idx_businesses_display_time_slots ON businesses USING gin (display_time_slots);
CREATE INDEX IF NOT EXISTS idx_business_applications_display_time_slots ON business_applications USING gin (display_time_slots);

-- Update existing businesses to have all time slots enabled by default (optional migration strategy)
-- This ensures existing businesses continue to show at all times
UPDATE businesses 
SET display_time_slots = '{
  "morning": true,
  "lunch": true,
  "dinner": true,
  "night": true
}'::jsonb 
WHERE display_time_slots IS NULL;

-- Migration complete
SELECT 'Migration 009: display_time_slots column added successfully!' AS status;