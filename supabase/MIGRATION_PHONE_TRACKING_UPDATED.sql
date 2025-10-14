-- ============================================
-- PHONE-BASED USER TRACKING MIGRATION (UPDATED)
-- Allows multiple bowling attempts per phone number
-- ============================================

-- Step 1: Add missing columns to bowling_attempts table
-- --------------------------------------------
ALTER TABLE public.bowling_attempts 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS composite_card_url TEXT,
ADD COLUMN IF NOT EXISTS accuracy_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS whatsapp_sent BOOLEAN DEFAULT FALSE;

-- Step 2: Remove old unique index if it exists (we want multiple attempts per phone)
-- --------------------------------------------
DROP INDEX IF EXISTS public.bowling_attempts_phone_unique;

-- Step 3: Create regular index on phone_number for faster lookups
-- (NOT unique - allows multiple attempts per phone)
-- --------------------------------------------
CREATE INDEX IF NOT EXISTS bowling_attempts_phone_idx 
ON public.bowling_attempts(phone_number);

CREATE INDEX IF NOT EXISTS bowling_attempts_accuracy_idx 
ON public.bowling_attempts(accuracy_score DESC);

-- Step 4: Add comments for documentation
-- --------------------------------------------
COMMENT ON COLUMN public.bowling_attempts.phone_number IS 
  'User phone number - used for WhatsApp notifications and tracking returning users';

COMMENT ON COLUMN public.bowling_attempts.composite_card_url IS 
  'URL to the composite card image stored in Supabase Storage bucket: composite-cards';

COMMENT ON COLUMN public.bowling_attempts.accuracy_score IS 
  'Overall accuracy score calculated from phase and technical metrics (0-100)';

COMMENT ON COLUMN public.bowling_attempts.whatsapp_sent IS 
  'Boolean flag to track if WhatsApp message was successfully sent to user (TRUE) or not (FALSE)';

COMMENT ON COLUMN public.bowling_attempts.video_url IS 
  'URL to the rendered analysis video stored in Supabase Storage bucket: rendered-videos';

-- Step 5: Update RLS policies (allow public read/write)
-- --------------------------------------------
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow public insert" ON public.bowling_attempts;
  DROP POLICY IF EXISTS "Allow public read" ON public.bowling_attempts;
  DROP POLICY IF EXISTS "query by phone number" ON public.bowling_attempts;

  -- Create new policies
  CREATE POLICY "Allow public insert"
  ON public.bowling_attempts
  FOR INSERT
  WITH CHECK (true);

  CREATE POLICY "Allow public read"
  ON public.bowling_attempts
  FOR SELECT
  USING (true);
END $$;

-- Step 6: Update the leaderboard views to include new fields
-- --------------------------------------------
-- Drop existing views first
DROP VIEW IF EXISTS public.leaderboard_all_time CASCADE;
DROP VIEW IF EXISTS public.leaderboard_best_per_player CASCADE;
DROP VIEW IF EXISTS public.leaderboard_weekly CASCADE;

-- Recreate view: ALL TIME LEADERBOARD
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
  whatsapp_sent,
  meta
FROM
  public.bowling_attempts
ORDER BY
  predicted_kmh DESC,
  similarity_percent DESC,
  created_at ASC;

-- Recreate view: BEST PER PLAYER
-- Groups by phone_number (or user_id/display_name as fallback) and shows best attempt
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
  whatsapp_sent,
  meta
FROM
  ranked
WHERE
  rn = 1
ORDER BY
  predicted_kmh DESC,
  similarity_percent DESC,
  created_at ASC;

-- Recreate view: WEEKLY LEADERBOARD
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
  whatsapp_sent,
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
-- Check if columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' 
  AND table_name = 'bowling_attempts'
  AND column_name IN ('phone_number', 'composite_card_url', 'accuracy_score', 'video_url', 'avatar_url', 'whatsapp_sent')
ORDER BY 
  column_name;

-- Check indexes
SELECT 
  indexname, 
  indexdef
FROM 
  pg_indexes
WHERE 
  schemaname = 'public' 
  AND tablename = 'bowling_attempts'
ORDER BY 
  indexname;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ PHONE TRACKING MIGRATION COMPLETE!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Changes Applied:';
  RAISE NOTICE '   ✓ Added phone_number column (allows multiple attempts)';
  RAISE NOTICE '   ✓ Added composite_card_url column (from Supabase bucket)';
  RAISE NOTICE '   ✓ Added accuracy_score column';
  RAISE NOTICE '   ✓ Added whatsapp_sent column (tracking delivery status)';
  RAISE NOTICE '   ✓ Created indexes for faster lookups';
  RAISE NOTICE '   ✓ Updated leaderboard views';
  RAISE NOTICE '   ✓ Updated RLS policies for public access';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Features Enabled:';
  RAISE NOTICE '   → Users can bowl multiple times';
  RAISE NOTICE '   → Phone number stored for WhatsApp notifications';
  RAISE NOTICE '   → Composite card URL tracked (bucket: composite-cards)';
  RAISE NOTICE '   → Video URL tracked (bucket: rendered-videos)';
  RAISE NOTICE '   → Accuracy score calculated and stored';
  RAISE NOTICE '   → WhatsApp delivery status tracked';
  RAISE NOTICE '';
  RAISE NOTICE '📱 WhatsApp Integration Tracking:';
  RAISE NOTICE '   → Phone numbers stored with each attempt';
  RAISE NOTICE '   → Video URLs sent via WhatsApp after generation';
  RAISE NOTICE '   → whatsapp_sent flag tracks delivery status';
  RAISE NOTICE '   → Query: SELECT * FROM bowling_attempts WHERE whatsapp_sent = true';
  RAISE NOTICE '';
  RAISE NOTICE '💾 Storage Integration:';
  RAISE NOTICE '   → composite_card_url: Links to composite-cards bucket';
  RAISE NOTICE '   → video_url: Links to rendered-videos bucket';
  RAISE NOTICE '   → Both URLs stored in bowling_attempts table';
  RAISE NOTICE '';
END $$;

