-- ================================================================
-- SUPABASE STORAGE SETUP FOR VIDEO UPLOADS
-- Complete SQL Guide for Bowling Analysis App
-- ================================================================

-- STEP 1: Create the Storage Bucket (if not already created via UI)
-- Note: This is typically done via the Supabase Dashboard UI
-- But can also be done via SQL if you have admin access

-- ================================================================
-- STEP 2: Enable Row Level Security (RLS) Policies
-- ================================================================

-- Policy 1: Allow PUBLIC to INSERT (upload) videos
-- Drop first to avoid "already exists" error
DROP POLICY IF EXISTS "Allow public uploads to user-videos" ON storage.objects;
CREATE POLICY "Allow public uploads to user-videos"
ON storage.objects 
FOR INSERT 
TO public
WITH CHECK (bucket_id = 'user-videos');

-- Policy 2: Allow PUBLIC to SELECT (download/view) videos
DROP POLICY IF EXISTS "Allow public downloads from user-videos" ON storage.objects;
CREATE POLICY "Allow public downloads from user-videos"
ON storage.objects 
FOR SELECT 
TO public
USING (bucket_id = 'user-videos');

-- Policy 3: Allow PUBLIC to view the bucket itself
DROP POLICY IF EXISTS "Allow public bucket access" ON storage.buckets;
CREATE POLICY "Allow public bucket access"
ON storage.buckets 
FOR SELECT 
TO public
USING (id = 'user-videos');

-- Policy 4: Allow PUBLIC to UPDATE videos (optional - for re-uploads)
DROP POLICY IF EXISTS "Allow public updates to user-videos" ON storage.objects;
CREATE POLICY "Allow public updates to user-videos"
ON storage.objects 
FOR UPDATE 
TO public
USING (bucket_id = 'user-videos')
WITH CHECK (bucket_id = 'user-videos');

-- Policy 5: Allow PUBLIC to DELETE videos (optional - for cleanup)
DROP POLICY IF EXISTS "Allow public deletes from user-videos" ON storage.objects;
CREATE POLICY "Allow public deletes from user-videos"
ON storage.objects 
FOR DELETE 
TO public
USING (bucket_id = 'user-videos');

-- ================================================================
-- STEP 3: Verify Policies Are Created
-- ================================================================

-- Check all policies on storage.objects table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
ORDER BY policyname;

-- Check all policies on storage.buckets table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'buckets'
AND schemaname = 'storage'
ORDER BY policyname;

-- ================================================================
-- STEP 4: Check Bucket Configuration
-- ================================================================

-- View bucket details
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets
WHERE id = 'user-videos';

-- ================================================================
-- EXPECTED RESULTS
-- ================================================================

/*
After running this SQL, you should see:

1. Five policies on storage.objects:
   - Allow public uploads to user-videos (INSERT)
   - Allow public downloads from user-videos (SELECT)
   - Allow public updates to user-videos (UPDATE)
   - Allow public deletes from user-videos (DELETE)

2. One policy on storage.buckets:
   - Allow public bucket access (SELECT)

3. Bucket configuration showing:
   - id: user-videos
   - public: true
   - file_size_limit: 52428800 (50MB) or your configured size
   - allowed_mime_types: ['video/mp4', 'video/quicktime', 'video/webm', 'video/ogg']
*/

-- ================================================================
-- TROUBLESHOOTING
-- ================================================================

-- If uploads fail with "policy violation" error, check:
-- 1. Is the bucket public?
SELECT public FROM storage.buckets WHERE id = 'user-videos';
-- Should return: true

-- 2. Are the INSERT policies enabled?
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND cmd = 'INSERT';
-- Should show at least one INSERT policy

-- 3. Check if RLS is enabled on storage.objects
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'storage'
AND tablename IN ('objects', 'buckets');
-- Should show: rowsecurity = true for both

-- ================================================================
-- OPTIONAL: Storage Lifecycle Rules (Auto-cleanup)
-- ================================================================

-- Automatically delete videos older than 30 days (optional)
-- This needs to be configured via Supabase Dashboard → Storage → Bucket Settings
-- Or via Supabase Management API

-- ================================================================
-- OPTIONAL: Additional Security (if needed)
-- ================================================================

-- If you want to restrict uploads to authenticated users only:
-- DROP POLICY "Allow public uploads to user-videos" ON storage.objects;
-- CREATE POLICY "Allow authenticated uploads to user-videos"
-- ON storage.objects 
-- FOR INSERT 
-- TO authenticated
-- WITH CHECK (bucket_id = 'user-videos');

-- If you want to restrict uploads by file size:
-- (This is typically done via bucket configuration, not policies)

-- If you want to restrict uploads by user:
-- CREATE POLICY "Users can only upload their own videos"
-- ON storage.objects 
-- FOR INSERT 
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'user-videos' 
--   AND (storage.foldername(name))[1] = auth.uid()::text
-- );

-- ================================================================
-- CLEANUP (Use with caution!)
-- ================================================================

-- To remove all policies (USE WITH CAUTION):
-- DROP POLICY IF EXISTS "Allow public uploads to user-videos" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow public downloads from user-videos" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow public bucket access" ON storage.buckets;
-- DROP POLICY IF EXISTS "Allow public updates to user-videos" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow public deletes from user-videos" ON storage.objects;

-- To delete all videos in bucket (USE WITH EXTREME CAUTION):
-- DELETE FROM storage.objects WHERE bucket_id = 'user-videos';

-- ================================================================
-- END OF SQL SETUP
-- ================================================================

-- Next Steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify policies are created (run the SELECT queries above)
-- 3. Test upload from your app
-- 4. Check Supabase Storage Dashboard to see uploaded files

