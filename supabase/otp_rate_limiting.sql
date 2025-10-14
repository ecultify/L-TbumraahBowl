-- ============================================
-- OTP Rate Limiting System
-- 3 Attempts Per 24 Hours Per Phone Number
-- ============================================

-- 1. Create OTP attempts tracking table
CREATE TABLE IF NOT EXISTS public.otp_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Phone number (10 digits)
  phone VARCHAR(10) NOT NULL,
  
  -- Tracking
  attempt_type VARCHAR(20) NOT NULL, -- 'send' or 'verify'
  success BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Timestamps
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  error_message TEXT NULL,
  
  -- Constraints
  CONSTRAINT phone_length_check CHECK (LENGTH(phone) = 10),
  CONSTRAINT attempt_type_check CHECK (attempt_type IN ('send', 'verify'))
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_otp_attempts_phone ON public.otp_attempts(phone);
CREATE INDEX IF NOT EXISTS idx_otp_attempts_phone_time ON public.otp_attempts(phone, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_attempts_attempted_at ON public.otp_attempts(attempted_at);

-- 3. Create rate limit violations table (for logging)
CREATE TABLE IF NOT EXISTS public.otp_rate_limit_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(10) NOT NULL,
  attempts_count INT NOT NULL,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unblock_at TIMESTAMPTZ NOT NULL,
  ip_address VARCHAR(45) NULL,
  
  CONSTRAINT phone_length_check CHECK (LENGTH(phone) = 10)
);

CREATE INDEX IF NOT EXISTS idx_rate_violations_phone ON public.otp_rate_limit_violations(phone);
CREATE INDEX IF NOT EXISTS idx_rate_violations_unblock ON public.otp_rate_limit_violations(unblock_at);

-- 4. Enable Row Level Security
ALTER TABLE public.otp_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_rate_limit_violations ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - Service role only
CREATE POLICY "Service role can manage OTP attempts" ON public.otp_attempts
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage rate violations" ON public.otp_rate_limit_violations
  FOR ALL
  USING (auth.role() = 'service_role');

-- 6. Function to check if phone is rate limited
CREATE OR REPLACE FUNCTION check_otp_rate_limit(p_phone VARCHAR(10))
RETURNS TABLE (
  is_blocked BOOLEAN,
  attempts_count INT,
  unblock_at TIMESTAMPTZ,
  hours_remaining NUMERIC
) AS $$
DECLARE
  v_attempts_count INT;
  v_oldest_attempt TIMESTAMPTZ;
  v_unblock_time TIMESTAMPTZ;
  v_hours_remaining NUMERIC;
BEGIN
  -- Count OTP send attempts in the last 24 hours
  SELECT COUNT(*), MIN(attempted_at)
  INTO v_attempts_count, v_oldest_attempt
  FROM public.otp_attempts
  WHERE phone = p_phone
    AND attempt_type = 'send'
    AND attempted_at > NOW() - INTERVAL '24 hours';
  
  -- If 3 or more attempts, calculate unblock time
  IF v_attempts_count >= 3 THEN
    v_unblock_time := v_oldest_attempt + INTERVAL '24 hours';
    v_hours_remaining := EXTRACT(EPOCH FROM (v_unblock_time - NOW())) / 3600;
    
    -- Still blocked if unblock time is in the future
    IF v_unblock_time > NOW() THEN
      RETURN QUERY SELECT TRUE, v_attempts_count, v_unblock_time, v_hours_remaining;
      RETURN;
    END IF;
  END IF;
  
  -- Not blocked
  RETURN QUERY SELECT FALSE, v_attempts_count, NULL::TIMESTAMPTZ, 0::NUMERIC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to log OTP attempt
CREATE OR REPLACE FUNCTION log_otp_attempt(
  p_phone VARCHAR(10),
  p_attempt_type VARCHAR(20),
  p_success BOOLEAN,
  p_ip_address VARCHAR(45) DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.otp_attempts (
    phone,
    attempt_type,
    success,
    ip_address,
    user_agent,
    error_message
  ) VALUES (
    p_phone,
    p_attempt_type,
    p_success,
    p_ip_address,
    p_user_agent,
    p_error_message
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to log rate limit violation
CREATE OR REPLACE FUNCTION log_rate_limit_violation(
  p_phone VARCHAR(10),
  p_attempts_count INT,
  p_ip_address VARCHAR(45) DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
  v_unblock_at TIMESTAMPTZ;
BEGIN
  -- Calculate unblock time (24 hours from oldest attempt)
  SELECT MIN(attempted_at) + INTERVAL '24 hours'
  INTO v_unblock_at
  FROM public.otp_attempts
  WHERE phone = p_phone
    AND attempt_type = 'send'
    AND attempted_at > NOW() - INTERVAL '24 hours';
  
  INSERT INTO public.otp_rate_limit_violations (
    phone,
    attempts_count,
    unblock_at,
    ip_address
  ) VALUES (
    p_phone,
    p_attempts_count,
    v_unblock_at,
    p_ip_address
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to cleanup old attempts (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_otp_attempts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.otp_attempts
  WHERE attempted_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to cleanup old violations (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_rate_violations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.otp_rate_limit_violations
  WHERE blocked_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create view for rate limit analytics
CREATE OR REPLACE VIEW otp_rate_limit_analytics AS
SELECT
  DATE_TRUNC('day', attempted_at) AS date,
  COUNT(*) FILTER (WHERE attempt_type = 'send') AS send_attempts,
  COUNT(*) FILTER (WHERE attempt_type = 'send' AND success = TRUE) AS successful_sends,
  COUNT(*) FILTER (WHERE attempt_type = 'verify') AS verify_attempts,
  COUNT(*) FILTER (WHERE attempt_type = 'verify' AND success = TRUE) AS successful_verifications,
  COUNT(DISTINCT phone) AS unique_phones,
  COUNT(*) FILTER (WHERE success = FALSE) AS failed_attempts
FROM public.otp_attempts
WHERE attempted_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', attempted_at)
ORDER BY date DESC;

-- 12. Create view for currently blocked phones
CREATE OR REPLACE VIEW currently_blocked_phones AS
WITH phone_attempts AS (
  SELECT 
    phone,
    COUNT(*) AS attempts_in_24h,
    MIN(attempted_at) AS first_attempt,
    MIN(attempted_at) + INTERVAL '24 hours' AS unblock_at
  FROM public.otp_attempts
  WHERE attempt_type = 'send'
    AND attempted_at > NOW() - INTERVAL '24 hours'
  GROUP BY phone
)
SELECT 
  phone,
  attempts_in_24h,
  first_attempt,
  unblock_at,
  EXTRACT(EPOCH FROM (unblock_at - NOW())) / 3600 AS hours_until_unblock
FROM phone_attempts
WHERE attempts_in_24h >= 3
  AND unblock_at > NOW()
ORDER BY phone;

-- ============================================
-- TESTING QUERIES
-- ============================================

-- Check if a phone is rate limited:
-- SELECT * FROM check_otp_rate_limit('9876543210');

-- Log an OTP send attempt:
-- SELECT log_otp_attempt('9876543210', 'send', true, '127.0.0.1', 'Mozilla/5.0', NULL);

-- View currently blocked phones:
-- SELECT * FROM currently_blocked_phones;

-- View rate limit analytics:
-- SELECT * FROM otp_rate_limit_analytics LIMIT 7;

-- Cleanup old data:
-- SELECT cleanup_old_otp_attempts();
-- SELECT cleanup_old_rate_violations();

-- ============================================
-- DONE! Rate limiting system ready.
-- ============================================

