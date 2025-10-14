-- =====================================================
-- Supabase Storage Setup for Rendered Videos
-- =====================================================
-- Run this SQL in your Supabase SQL Editor to set up storage for rendered videos
-- This will create a bucket and configure permissions for storing analysis videos

-- =====================================================
-- 1. Create Storage Bucket for Rendered Videos
-- =====================================================

-- Create the rendered-videos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rendered-videos',
  'rendered-videos',
  true,  -- Public bucket for easy video access
  104857600,  -- 100 MB file size limit (videos can be large)
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']  -- Allowed video types
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. Storage Policies - Allow Public Access
-- =====================================================

-- Policy: Allow anyone to upload videos to rendered-videos bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public uploads to rendered-videos'
  ) THEN
    CREATE POLICY "Allow public uploads to rendered-videos"
    ON storage.objects FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'rendered-videos');
  END IF;
END $$;

-- Policy: Allow anyone to read/download videos from rendered-videos bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public downloads from rendered-videos'
  ) THEN
    CREATE POLICY "Allow public downloads from rendered-videos"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'rendered-videos');
  END IF;
END $$;

-- Policy: Allow public to view the bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'buckets' 
    AND policyname = 'Allow public bucket access for rendered-videos'
  ) THEN
    CREATE POLICY "Allow public bucket access for rendered-videos"
    ON storage.buckets FOR SELECT
    TO public
    USING (id = 'rendered-videos');
  END IF;
END $$;

-- Policy: Allow updates (optional - for replacing videos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public updates to rendered-videos'
  ) THEN
    CREATE POLICY "Allow public updates to rendered-videos"
    ON storage.objects FOR UPDATE
    TO public
    USING (bucket_id = 'rendered-videos')
    WITH CHECK (bucket_id = 'rendered-videos');
  END IF;
END $$;

-- Policy: Allow deletions (optional - for cleanup)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public deletes from rendered-videos'
  ) THEN
    CREATE POLICY "Allow public deletes from rendered-videos"
    ON storage.objects FOR DELETE
    TO public
    USING (bucket_id = 'rendered-videos');
  END IF;
END $$;

-- =====================================================
-- 3. Verify Setup
-- =====================================================

-- Check if bucket was created successfully
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'rendered-videos';

-- Check if policies were created successfully
SELECT 
  schemaname, 
  tablename, 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects' 
  AND policyname LIKE '%rendered-videos%'
ORDER BY policyname;

-- =====================================================
-- Expected Output:
-- =====================================================
-- You should see:
-- 1. One bucket named 'rendered-videos' with public=true
-- 2. Five policies for INSERT, SELECT, UPDATE, DELETE operations
-- 
-- If you see these, the setup is complete! ✅
-- =====================================================

