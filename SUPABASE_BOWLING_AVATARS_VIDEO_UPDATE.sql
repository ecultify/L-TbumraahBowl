-- ================================================================
-- UPDATE bowling-avatars BUCKET TO ACCEPT VIDEOS
-- Run this in Supabase SQL Editor
-- ================================================================

-- Update the bowling-avatars bucket to accept video files
-- This will add video MIME types to the allowed types
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY[
    'image/png',
    'image/jpeg', 
    'image/jpg',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/ogg'
  ],
  file_size_limit = 104857600  -- 100MB (increased from default)
WHERE id = 'bowling-avatars';

-- Verify the update
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'bowling-avatars';

-- Expected result:
-- The bucket should now accept both images AND videos
-- file_size_limit should be 104857600 (100MB)

-- ================================================================
-- ENSURE POLICIES ARE SET (should already exist)
-- ================================================================

-- Check existing policies
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND (qual LIKE '%bowling-avatars%' OR with_check LIKE '%bowling-avatars%');

-- If no policies exist, create them:
DO $$
BEGIN
  -- Only create if doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow public uploads to bowling-avatars'
  ) THEN
    CREATE POLICY "Allow public uploads to bowling-avatars"
    ON storage.objects 
    FOR INSERT 
    TO public
    WITH CHECK (bucket_id = 'bowling-avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow public downloads from bowling-avatars'
  ) THEN
    CREATE POLICY "Allow public downloads from bowling-avatars"
    ON storage.objects 
    FOR SELECT 
    TO public
    USING (bucket_id = 'bowling-avatars');
  END IF;
END $$;

-- ================================================================
-- VERIFY SETUP
-- ================================================================

-- Check bucket configuration
SELECT 
  'Bucket Config' as check_type,
  id as bucket_id,
  public as is_public,
  file_size_limit / 1024 / 1024 as size_limit_mb,
  cardinality(allowed_mime_types) as mime_types_count,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'bowling-avatars';

-- Check policies
SELECT 
  'Policy Check' as check_type,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND (qual LIKE '%bowling-avatars%' OR with_check LIKE '%bowling-avatars%')
ORDER BY policyname;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================
-- After running this, the bowling-avatars bucket will accept:
-- ✅ Images: PNG, JPEG, WebP, GIF
-- ✅ Videos: MP4, MOV, WebM, OGG
-- ✅ Max size: 100MB
-- ✅ Public access with proper policies

