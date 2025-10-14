-- ============================================
-- OTP System for Axiom SMS Gateway
-- ============================================
-- Run this in Supabase SQL Editor

-- 1. Create OTP table
CREATE TABLE IF NOT EXISTS public.otp_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Phone and OTP
  phone VARCHAR(10) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  
  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ NULL,
  
  -- Security
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Metadata
  template VARCHAR(20) NULL, -- 'bowl' or 'poster'
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  
  -- Constraints
  CONSTRAINT otp_length_check CHECK (LENGTH(otp) = 6),
  CONSTRAINT phone_length_check CHECK (LENGTH(phone) = 10),
  CONSTRAINT attempts_check CHECK (attempts >= 0 AND attempts <= max_attempts)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_otp_phone ON public.otp_verification(phone);
CREATE INDEX IF NOT EXISTS idx_otp_phone_verified ON public.otp_verification(phone, is_verified);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON public.otp_verification(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_created_at ON public.otp_verification(created_at DESC);

-- 3. Create rate limiting table
CREATE TABLE IF NOT EXISTS public.otp_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(10) NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  send_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT phone_length_check CHECK (LENGTH(phone) = 10)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_phone ON public.otp_rate_limit(phone);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON public.otp_rate_limit(window_start);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.otp_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_rate_limit ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - Server-side only access
-- Only backend API can access these tables (using service role key)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can manage OTP" ON public.otp_verification;
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.otp_rate_limit;

-- Create policies
CREATE POLICY "Service role can manage OTP" ON public.otp_verification
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage rate limits" ON public.otp_rate_limit
  FOR ALL
  USING (auth.role() = 'service_role');

-- 6. Function to clean up expired OTPs (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete OTPs older than 24 hours
  DELETE FROM public.otp_verification
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete rate limit records older than 24 hours
  DELETE FROM public.otp_rate_limit
  WHERE window_start < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to get active OTP for a phone
CREATE OR REPLACE FUNCTION get_active_otp(p_phone VARCHAR(10))
RETURNS TABLE (
  id uuid,
  phone VARCHAR(10),
  otp VARCHAR(6),
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  attempts INT,
  max_attempts INT,
  is_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.phone,
    v.otp,
    v.created_at,
    v.expires_at,
    v.attempts,
    v.max_attempts,
    v.is_verified
  FROM public.otp_verification v
  WHERE v.phone = p_phone
    AND v.is_verified = FALSE
    AND v.expires_at > NOW()
    AND v.attempts < v.max_attempts
  ORDER BY v.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create a view for OTP statistics (optional - for monitoring)
CREATE OR REPLACE VIEW otp_statistics AS
SELECT 
  DATE_TRUNC('hour', created_at) AS hour,
  COUNT(*) AS total_sent,
  COUNT(*) FILTER (WHERE is_verified = TRUE) AS verified_count,
  COUNT(*) FILTER (WHERE expires_at < NOW() AND is_verified = FALSE) AS expired_count,
  COUNT(*) FILTER (WHERE attempts >= max_attempts AND is_verified = FALSE) AS max_attempts_reached
FROM public.otp_verification
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- 10. Grant permissions (if needed)
-- GRANT ALL ON public.otp_verification TO service_role;
-- GRANT ALL ON public.otp_rate_limit TO service_role;

-- ============================================
-- DONE! Your OTP system is ready.
-- ============================================

-- To verify installation, run:
-- SELECT * FROM otp_verification LIMIT 1;
-- SELECT * FROM otp_rate_limit LIMIT 1;

