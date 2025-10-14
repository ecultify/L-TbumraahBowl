-- ============================================
-- Add Retry Count Column for Returning Users
-- ============================================

-- Add retry_count column to track how many times a user has retried
ALTER TABLE public.bowling_attempts
ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0;

-- Add updated_at column to track when record was last modified
ALTER TABLE public.bowling_attempts
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NULL;

-- Add index for phone number lookups (fast returning user check)
CREATE INDEX IF NOT EXISTS idx_bowling_attempts_phone 
ON public.bowling_attempts(phone_number);

-- Add index for composite card URL lookups
CREATE INDEX IF NOT EXISTS idx_bowling_attempts_composite_card 
ON public.bowling_attempts(composite_card_url)
WHERE composite_card_url IS NOT NULL;

-- Add index for video URL lookups
CREATE INDEX IF NOT EXISTS idx_bowling_attempts_video 
ON public.bowling_attempts(video_url)
WHERE video_url IS NOT NULL;

-- Add index for efficient latest record per phone lookup
CREATE INDEX IF NOT EXISTS idx_bowling_attempts_phone_created 
ON public.bowling_attempts(phone_number, created_at DESC);

-- Create function to increment retry count
CREATE OR REPLACE FUNCTION increment_retry_count(record_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.bowling_attempts
  SET retry_count = retry_count + 1
  WHERE id = record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE! Retry tracking is ready.
-- ============================================

-- Test query to find returning users:
-- SELECT phone_number, display_name, retry_count, created_at, updated_at
-- FROM bowling_attempts
-- WHERE retry_count > 0
-- ORDER BY retry_count DESC;

