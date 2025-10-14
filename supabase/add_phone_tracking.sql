-- ============================================
-- PHONE-BASED USER TRACKING MIGRATION
-- Add columns to enable returning user flow
-- ============================================

-- Step 1: Add missing columns to bowling_attempts table
-- --------------------------------------------
ALTER TABLE public.bowling_attempts 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS composite_card_url TEXT,
ADD COLUMN IF NOT EXISTS accuracy_score DECIMAL(5,2);

-- Step 2: Create unique index on phone_number
-- This ensures one active record per phone number
-- --------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS bowling_attempts_phone_unique 
ON public.bowling_attempts(phone_number) 
WHERE phone_number IS NOT NULL;

-- Step 3: Create indexes for faster lookups
-- --------------------------------------------
CREATE INDEX IF NOT EXISTS bowling_attempts_phone_idx 
ON public.bowling_attempts(phone_number);

CREATE INDEX IF NOT EXISTS bowling_attempts_accuracy_idx 
ON public.bowling_attempts(accuracy_score DESC);

-- Step 4: Add comments for documentation
-- --------------------------------------------
COMMENT ON COLUMN public.bowling_attempts.phone_number IS 
  'User phone number - used to track returning users and restore their data';

COMMENT ON COLUMN public.bowling_attempts.composite_card_url IS 
  'URL to the composite card image stored in Supabase Storage';

COMMENT ON COLUMN public.bowling_attempts.accuracy_score IS 
  'Overall accuracy score calculated from phase and technical metrics (0-100)';

-- Step 5: Update RLS policies (if needed)
-- The existing policies should work, but we can add phone-specific ones
-- --------------------------------------------

-- Optional: Add policy to allow users to query by their phone number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'bowling_attempts' 
    AND policyname = 'query by phone number'
  ) THEN
    CREATE POLICY "query by phone number"
    ON public.bowling_attempts
    FOR SELECT
    USING (true); -- Allow anyone to query (already public read)
  END IF;
END $$;

-- Step 6: Update the leaderboard views to include new fields
-- --------------------------------------------
-- Drop existing views first to avoid column name conflicts
DROP VIEW IF EXISTS public.leaderboard_all_time CASCADE;
DROP VIEW IF EXISTS public.leaderboard_best_per_player CASCADE;
DROP VIEW IF EXISTS public.leaderboard_weekly CASCADE;

-- Recreate views with new columns
CREATE VIEW public.leaderboard_all_time AS
SELECT
  id,
  created_at,
  coalesce(display_name, 'Anonymous') as name,
  user_id,
  phone_number,
  predicted_kmh,
  similarity_percent,
  intensity_percent,
  speed_class,
  accuracy_score,
  video_url,
  composite_card_url,
  avatar_url,
  meta
FROM
  public.bowling_attempts
ORDER BY
  predicted_kmh DESC,
  similarity_percent DESC,
  created_at ASC;

CREATE VIEW public.leaderboard_best_per_player AS
WITH
  ranked as (
    SELECT
      ba.*,
      row_number() over (
        PARTITION BY
          coalesce(ba.phone_number, ba.user_id::text, ba.display_name)
        ORDER BY
          ba.predicted_kmh DESC,
          ba.similarity_percent DESC,
          ba.created_at ASC
      ) as rn
    FROM
      public.bowling_attempts ba
  )
SELECT
  id,
  created_at,
  display_name as name,
  user_id,
  phone_number,
  predicted_kmh,
  similarity_percent,
  intensity_percent,
  speed_class,
  accuracy_score,
  video_url,
  composite_card_url,
  avatar_url,
  meta
FROM
  ranked
WHERE
  rn = 1
ORDER BY
  predicted_kmh DESC,
  similarity_percent DESC,
  created_at ASC;

CREATE VIEW public.leaderboard_weekly AS
SELECT
  id,
  created_at,
  coalesce(display_name, 'Anonymous') as name,
  user_id,
  phone_number,
  predicted_kmh,
  similarity_percent,
  intensity_percent,
  speed_class,
  accuracy_score,
  video_url,
  composite_card_url,
  avatar_url,
  meta
FROM
  public.bowling_attempts
WHERE
  created_at >= date_trunc('week', now())
ORDER BY
  predicted_kmh DESC,
  similarity_percent DESC,
  created_at ASC;

-- Step 7: Verification queries
-- --------------------------------------------
-- Run these to verify the migration was successful

-- Check if columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' 
  AND table_name = 'bowling_attempts'
  AND column_name IN ('phone_number', 'composite_card_url', 'accuracy_score')
ORDER BY 
  column_name;

-- Check if indexes were created
SELECT 
  indexname, 
  indexdef
FROM 
  pg_indexes
WHERE 
  schemaname = 'public' 
  AND tablename = 'bowling_attempts'
  AND indexname LIKE '%phone%'
ORDER BY 
  indexname;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ PHONE-BASED USER TRACKING MIGRATION COMPLETE!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Changes Applied:';
  RAISE NOTICE '   ✓ Added phone_number column';
  RAISE NOTICE '   ✓ Added composite_card_url column';
  RAISE NOTICE '   ✓ Added accuracy_score column';
  RAISE NOTICE '   ✓ Created unique index on phone_number';
  RAISE NOTICE '   ✓ Created indexes for faster lookups';
  RAISE NOTICE '   ✓ Updated leaderboard views';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 User Flow Enabled:';
  RAISE NOTICE '   → New user: Record phone → Generate results → Save';
  RAISE NOTICE '   → Returning user: Enter phone → Restore previous results';
  RAISE NOTICE '   → Retry: New attempt replaces old data (competitive!)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '   1. Deploy updated application code';
  RAISE NOTICE '   2. Test returning user flow';
  RAISE NOTICE '   3. Monitor phone_number data collection';
  RAISE NOTICE '';
END $$;

