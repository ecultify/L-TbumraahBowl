-- ================================================================
-- QUICK SUPABASE SETUP FOR VIDEO UPLOADS
-- Just copy and paste this entire file into Supabase SQL Editor
-- ================================================================

-- Clean up existing policies (if any)
DROP POLICY IF EXISTS "Allow public uploads to user-videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads from user-videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public bucket access" ON storage.buckets;

-- Create new policies
CREATE POLICY "Allow public uploads to user-videos"
ON storage.objects 
FOR INSERT 
TO public
WITH CHECK (bucket_id = 'user-videos');

CREATE POLICY "Allow public downloads from user-videos"
ON storage.objects 
FOR SELECT 
TO public
USING (bucket_id = 'user-videos');

CREATE POLICY "Allow public bucket access"
ON storage.buckets 
FOR SELECT 
TO public
USING (id = 'user-videos');

-- Verify policies were created
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('objects', 'buckets')
AND schemaname = 'storage'
ORDER BY policyname;

-- Expected result: You should see 3 policies listed

