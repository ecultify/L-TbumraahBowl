-- Migration: Add Avatar Image Storage Support
-- This adds support for storing Gemini-generated avatar images
-- Run this in your Supabase SQL editor

-- ============================================
-- 1. CREATE STORAGE BUCKET FOR AVATARS
-- ============================================

-- Create a public storage bucket for avatar images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bowling-avatars',
  'bowling-avatars',
  true,  -- Public bucket so avatars can be accessed directly via URL
  5242880,  -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. STORAGE POLICIES FOR AVATAR BUCKET
-- ============================================

-- Allow anyone to read avatars (public access)
CREATE POLICY "Public avatar read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'bowling-avatars');

-- Allow authenticated and anonymous users to upload avatars
CREATE POLICY "Avatar upload for all users"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'bowling-avatars' 
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

-- Allow users to update their own avatars (if authenticated)
CREATE POLICY "Update own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'bowling-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'bowling-avatars'
);

-- Allow users to delete their own avatars (if authenticated)
CREATE POLICY "Delete own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'bowling-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- 3. ADD AVATAR_URL COLUMN (if not exists)
-- ============================================

-- The avatar_url column should already exist in bowling_attempts table
-- but this ensures it's there with proper constraints
DO $$
BEGIN
  -- Check if column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bowling_attempts' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.bowling_attempts 
    ADD COLUMN avatar_url text NULL;
    
    COMMENT ON COLUMN public.bowling_attempts.avatar_url IS 
      'URL to Gemini-generated avatar image stored in Supabase storage';
  END IF;
END $$;

-- ============================================
-- 4. CREATE INDEX FOR AVATAR_URL
-- ============================================

-- Create index for faster queries filtering by avatar presence
CREATE INDEX IF NOT EXISTS bowling_attempts_avatar_idx 
ON public.bowling_attempts (avatar_url) 
WHERE avatar_url IS NOT NULL;

-- ============================================
-- 5. UPDATE VIEWS TO INCLUDE AVATAR
-- ============================================

-- Drop existing views first to avoid conflicts
DROP VIEW IF EXISTS public.leaderboard_all_time CASCADE;
DROP VIEW IF EXISTS public.leaderboard_best_per_player CASCADE;
DROP VIEW IF EXISTS public.leaderboard_weekly CASCADE;

-- Recreate leaderboard_all_time view with avatar_url
CREATE VIEW public.leaderboard_all_time AS
SELECT
  id,
  created_at,
  coalesce(display_name, 'Anonymous') as name,
  user_id,
  predicted_kmh,
  similarity_percent,
  intensity_percent,
  speed_class,
  video_url,
  avatar_url,  -- Include avatar_url
  meta
FROM
  public.bowling_attempts
ORDER BY
  predicted_kmh DESC,
  similarity_percent DESC,
  created_at ASC;

-- Recreate leaderboard_best_per_player view with avatar_url
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
  FROM
    public.bowling_attempts ba
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
  avatar_url,  -- Include avatar_url
  meta
FROM
  ranked
WHERE
  rn = 1
ORDER BY
  predicted_kmh DESC,
  similarity_percent DESC,
  created_at ASC;

-- Recreate leaderboard_weekly view with avatar_url
CREATE VIEW public.leaderboard_weekly AS
SELECT
  id,
  created_at,
  coalesce(display_name, 'Anonymous') as name,
  user_id,
  predicted_kmh,
  similarity_percent,
  intensity_percent,
  speed_class,
  video_url,
  avatar_url,  -- Include avatar_url
  meta
FROM
  public.bowling_attempts
WHERE
  created_at >= date_trunc('week', now())
ORDER BY
  predicted_kmh DESC,
  similarity_percent DESC,
  created_at ASC;

-- ============================================
-- 6. HELPER FUNCTION TO GET AVATAR URL
-- ============================================

-- Function to construct full avatar URL from storage path
CREATE OR REPLACE FUNCTION public.get_avatar_full_url(avatar_path text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  base_url text;
BEGIN
  IF avatar_path IS NULL OR avatar_path = '' THEN
    RETURN NULL;
  END IF;
  
  -- Get Supabase project URL from config
  SELECT current_setting('app.settings.supabase_url', true) INTO base_url;
  
  -- If not set, use a placeholder (update this with your actual Supabase URL)
  IF base_url IS NULL THEN
    base_url := 'https://hqzukyxnnjnstrecybzx.supabase.co';
  END IF;
  
  -- Return full URL
  RETURN base_url || '/storage/v1/object/public/bowling-avatars/' || avatar_path;
END;
$$;

COMMENT ON FUNCTION public.get_avatar_full_url IS 
  'Converts avatar storage path to full public URL';

-- ============================================
-- 7. GRANT NECESSARY PERMISSIONS
-- ============================================

-- Ensure anon and authenticated roles can read from views
GRANT SELECT ON public.leaderboard_all_time TO anon, authenticated;
GRANT SELECT ON public.leaderboard_best_per_player TO anon, authenticated;
GRANT SELECT ON public.leaderboard_weekly TO anon, authenticated;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Avatar storage migration completed successfully!';
  RAISE NOTICE '📦 Storage bucket "bowling-avatars" is ready';
  RAISE NOTICE '🖼️ avatar_url column available in bowling_attempts table';
  RAISE NOTICE '📊 All leaderboard views updated to include avatars';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '1. Update your frontend to upload Gemini avatars to storage';
  RAISE NOTICE '2. Store the public URL in avatar_url field';
  RAISE NOTICE '3. Display avatars in leaderboard UI';
END $$;
