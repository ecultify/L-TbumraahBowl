-- Simplified Avatar Storage Migration
-- This version handles existing views properly
-- Run this in your Supabase SQL Editor

-- ============================================
-- STEP 1: CREATE STORAGE BUCKET
-- ============================================

-- Create storage bucket (will skip if exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bowling-avatars',
  'bowling-avatars',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 2: STORAGE POLICIES
-- ============================================

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public avatar read access" ON storage.objects;
  DROP POLICY IF EXISTS "Avatar upload for all users" ON storage.objects;
  DROP POLICY IF EXISTS "Update own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Delete own avatars" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Public read
CREATE POLICY "Public avatar read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'bowling-avatars');

-- Upload for all
CREATE POLICY "Avatar upload for all users"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'bowling-avatars' 
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

-- Update own
CREATE POLICY "Update own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'bowling-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (bucket_id = 'bowling-avatars');

-- Delete own
CREATE POLICY "Delete own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'bowling-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- STEP 3: ADD AVATAR_URL COLUMN
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bowling_attempts' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.bowling_attempts 
    ADD COLUMN avatar_url text NULL;
    
    RAISE NOTICE '✅ Added avatar_url column';
  ELSE
    RAISE NOTICE '✓ avatar_url column already exists';
  END IF;
END $$;

-- ============================================
-- STEP 4: CREATE INDEX
-- ============================================

CREATE INDEX IF NOT EXISTS bowling_attempts_avatar_idx 
ON public.bowling_attempts (avatar_url) 
WHERE avatar_url IS NOT NULL;

-- ============================================
-- STEP 5: RECREATE VIEWS
-- ============================================

-- Drop and recreate all views
DROP VIEW IF EXISTS public.leaderboard_all_time CASCADE;
DROP VIEW IF EXISTS public.leaderboard_best_per_player CASCADE;
DROP VIEW IF EXISTS public.leaderboard_weekly CASCADE;

-- View 1: All time leaderboard
CREATE VIEW public.leaderboard_all_time AS
SELECT
  id,
  created_at,
  coalesce(display_name, 'Anonymous') as name,
  display_name,
  user_id,
  predicted_kmh,
  similarity_percent,
  intensity_percent,
  speed_class,
  video_url,
  avatar_url,
  meta
FROM public.bowling_attempts
ORDER BY
  predicted_kmh DESC,
  similarity_percent DESC,
  created_at ASC;

-- View 2: Best per player
CREATE VIEW public.leaderboard_best_per_player AS
WITH ranked AS (
  SELECT
    ba.*,
    row_number() OVER (
      PARTITION BY coalesce(ba.user_id::text, ba.display_name)
      ORDER BY
        ba.predicted_kmh DESC,
        ba.similarity_percent DESC,
        ba.created_at ASC
    ) AS rn
  FROM public.bowling_attempts ba
)
SELECT
  id,
  created_at,
  display_name AS name,
  user_id,
  predicted_kmh,
  similarity_percent,
  intensity_percent,
  speed_class,
  video_url,
  avatar_url,
  meta
FROM ranked
WHERE rn = 1
ORDER BY
  predicted_kmh DESC,
  similarity_percent DESC,
  created_at ASC;

-- View 3: Weekly leaderboard
CREATE VIEW public.leaderboard_weekly AS
SELECT
  id,
  created_at,
  coalesce(display_name, 'Anonymous') as name,
  display_name,
  user_id,
  predicted_kmh,
  similarity_percent,
  intensity_percent,
  speed_class,
  video_url,
  avatar_url,
  meta
FROM public.bowling_attempts
WHERE created_at >= date_trunc('week', now())
ORDER BY
  predicted_kmh DESC,
  similarity_percent DESC,
  created_at ASC;

-- ============================================
-- STEP 6: GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON public.leaderboard_all_time TO anon, authenticated;
GRANT SELECT ON public.leaderboard_best_per_player TO anon, authenticated;
GRANT SELECT ON public.leaderboard_weekly TO anon, authenticated;

-- ============================================
-- COMPLETION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Avatar Storage Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Storage bucket: bowling-avatars';
  RAISE NOTICE '🖼️  Column added: avatar_url';
  RAISE NOTICE '📊 Views updated: 3 leaderboard views';
  RAISE NOTICE '🔐 Policies created: 4 storage policies';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '1. Upload avatars to storage bucket';
  RAISE NOTICE '2. Store avatar URLs in bowling_attempts';
  RAISE NOTICE '3. View avatars in leaderboard';
  RAISE NOTICE '';
END $$;
