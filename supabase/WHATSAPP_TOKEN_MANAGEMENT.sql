-- ============================================================================
-- WHATSAPP TOKEN MANAGEMENT SETUP
-- ============================================================================
-- This script creates a table to store WhatsApp access tokens with auto-refresh
-- functionality to prevent token expiration during message sending.
-- ============================================================================

-- Create table for storing WhatsApp access tokens
CREATE TABLE IF NOT EXISTS public.whatsapp_tokens (
  id INTEGER PRIMARY KEY DEFAULT 1,
  access_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata for debugging
  token_source TEXT DEFAULT 'manual',
  refresh_count INTEGER DEFAULT 0,
  
  -- Constraint to ensure only one row exists
  CONSTRAINT whatsapp_tokens_single_row CHECK (id = 1)
);

-- Create unique index to enforce single row
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_tokens_single_row_idx ON public.whatsapp_tokens(id);

-- Add comment
COMMENT ON TABLE public.whatsapp_tokens IS 'Stores cached WhatsApp access token with 10-hour expiry. Auto-refreshed every 9 hours.';
COMMENT ON COLUMN public.whatsapp_tokens.access_token IS 'Current valid Sinch WhatsApp API access token';
COMMENT ON COLUMN public.whatsapp_tokens.expires_at IS 'Timestamp when this token expires (10 hours from creation)';
COMMENT ON COLUMN public.whatsapp_tokens.refresh_count IS 'Number of times this token has been refreshed';

-- Insert initial placeholder (will be replaced by actual token on first use)
INSERT INTO public.whatsapp_tokens (id, access_token, expires_at, token_source, refresh_count)
VALUES (
  1, 
  'PLACEHOLDER_TOKEN_WILL_BE_REPLACED_ON_FIRST_USE',
  NOW() - INTERVAL '1 hour', -- Set expiry in the past to force immediate refresh
  'initial_setup',
  0
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE public.whatsapp_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role (backend) full access
CREATE POLICY "Service role has full access to whatsapp_tokens"
  ON public.whatsapp_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow anon role to read (for API routes)
CREATE POLICY "Anon can read whatsapp_tokens"
  ON public.whatsapp_tokens
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow anon role to update (for token refresh)
CREATE POLICY "Anon can update whatsapp_tokens"
  ON public.whatsapp_tokens
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if table was created successfully
SELECT 
  'whatsapp_tokens' as table_name,
  COUNT(*) as row_count,
  access_token,
  expires_at,
  expires_at > NOW() as is_valid,
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 3600 as hours_until_expiry,
  refresh_count
FROM public.whatsapp_tokens
WHERE id = 1
GROUP BY access_token, expires_at, refresh_count;

-- ============================================================================
-- MANUAL TOKEN UPDATE (Optional - for testing)
-- ============================================================================
-- Run this if you want to manually insert a fresh token for testing:
-- 
-- UPDATE public.whatsapp_tokens
-- SET 
--   access_token = 'YOUR_ACTUAL_TOKEN_HERE',
--   expires_at = NOW() + INTERVAL '10 hours',
--   updated_at = NOW(),
--   token_source = 'manual_update',
--   refresh_count = refresh_count + 1
-- WHERE id = 1;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
SELECT '✅ WhatsApp Token Management table created successfully!' as status;
SELECT '📋 Next steps:' as instructions, 
       '1. The system will auto-refresh tokens every 9 hours' as step_1,
       '2. First token will be fetched on first WhatsApp message send' as step_2,
       '3. Check token status with: SELECT * FROM whatsapp_tokens;' as step_3;

