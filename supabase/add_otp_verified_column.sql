-- ============================================
-- Add OTP Verification Tracking to Bowling Attempts
-- ============================================

-- 1. Add otp_verified column to bowling_attempts table
ALTER TABLE public.bowling_attempts 
ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_bowling_attempts_otp_verified 
ON public.bowling_attempts(otp_verified);

-- 3. Add otp_phone column to track which phone was used (optional but useful)
ALTER TABLE public.bowling_attempts 
ADD COLUMN IF NOT EXISTS otp_phone VARCHAR(10) NULL;

-- 4. Create a view for OTP verification analytics
CREATE OR REPLACE VIEW otp_verification_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) AS date,
  COUNT(*) AS total_attempts,
  COUNT(*) FILTER (WHERE otp_verified = TRUE) AS verified_count,
  COUNT(*) FILTER (WHERE otp_verified = FALSE) AS unverified_count,
  ROUND(
    (COUNT(*) FILTER (WHERE otp_verified = TRUE)::NUMERIC / COUNT(*)::NUMERIC * 100), 
    2
  ) AS verification_rate_percent
FROM public.bowling_attempts
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- 5. Comment on new columns
COMMENT ON COLUMN public.bowling_attempts.otp_verified IS 'Whether user verified their phone number via OTP';
COMMENT ON COLUMN public.bowling_attempts.otp_phone IS 'Phone number used for OTP verification';

-- ============================================
-- Automatic OTP Cleanup (Delete expired OTPs)
-- ============================================

-- 6. Create function to automatically delete expired unverified OTPs
CREATE OR REPLACE FUNCTION delete_expired_unverified_otps()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete OTPs that:
  -- 1. Have expired (expires_at < NOW)
  -- 2. Are not verified (is_verified = FALSE)
  DELETE FROM public.otp_verification
  WHERE expires_at < NOW()
    AND is_verified = FALSE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE 'Deleted % expired unverified OTP(s)', deleted_count;
  END IF;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a trigger to clean up expired OTPs automatically
-- This trigger runs every time someone queries the otp_verification table
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_otps()
RETURNS TRIGGER AS $$
BEGIN
  -- Asynchronously delete expired OTPs (non-blocking)
  PERFORM delete_expired_unverified_otps();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: For better performance, use pg_cron extension if available
-- Or call delete_expired_unverified_otps() periodically from your backend

-- ============================================
-- Helper Functions
-- ============================================

-- 8. Function to check if phone has verified OTP in last 5 minutes
CREATE OR REPLACE FUNCTION has_recent_verified_otp(p_phone VARCHAR(10))
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.otp_verification
    WHERE phone = p_phone
      AND is_verified = TRUE
      AND verified_at > NOW() - INTERVAL '5 minutes'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to get OTP verification status for analytics
CREATE OR REPLACE FUNCTION get_otp_stats(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  total_otps_sent BIGINT,
  total_verified BIGINT,
  total_expired BIGINT,
  verification_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_otps_sent,
    COUNT(*) FILTER (WHERE is_verified = TRUE)::BIGINT AS total_verified,
    COUNT(*) FILTER (WHERE expires_at < NOW() AND is_verified = FALSE)::BIGINT AS total_expired,
    ROUND(
      (COUNT(*) FILTER (WHERE is_verified = TRUE)::NUMERIC / NULLIF(COUNT(*), 0) * 100),
      2
    ) AS verification_rate
  FROM public.otp_verification
  WHERE created_at > NOW() - (days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Verify Installation
-- ============================================

-- Check if column was added successfully
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'bowling_attempts' 
  AND column_name IN ('otp_verified', 'otp_phone');

-- Test analytics view
SELECT * FROM otp_verification_analytics LIMIT 5;

-- Test OTP stats function
SELECT * FROM get_otp_stats(7);

-- ============================================
-- DONE! OTP tracking is now enabled.
-- ============================================

