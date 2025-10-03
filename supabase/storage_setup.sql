-- Supabase Storage Setup for Video Uploads
-- Run this SQL in Supabase SQL Editor after creating the 'user-videos' bucket

-- 1. Allow public uploads to user-videos bucket
CREATE POLICY IF NOT EXISTS "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'user-videos');

-- 2. Allow public downloads from user-videos bucket
CREATE POLICY IF NOT EXISTS "Allow public downloads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-videos');

-- 3. Allow public to view bucket
CREATE POLICY IF NOT EXISTS "Allow public bucket access"
ON storage.buckets FOR SELECT
TO public
USING (id = 'user-videos');

-- 4. Optional: Allow public to update files (for re-uploads)
CREATE POLICY IF NOT EXISTS "Allow public updates"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'user-videos')
WITH CHECK (bucket_id = 'user-videos');

-- 5. Optional: Allow public to delete files (for cleanup)
CREATE POLICY IF NOT EXISTS "Allow public deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'user-videos');

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('objects', 'buckets')
AND schemaname = 'storage';

