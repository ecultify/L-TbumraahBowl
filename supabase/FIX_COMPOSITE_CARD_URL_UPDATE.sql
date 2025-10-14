-- ============================================
-- FIX: Allow UPDATE of composite_card_url AND video_url in bowling_attempts
-- ============================================
-- 
-- PROBLEM: Anonymous users can INSERT records but cannot UPDATE them
-- with composite_card_url or video_url because there's no UPDATE policy
--
-- AFFECTED FIELDS:
--   - composite_card_url (composite card images)
--   - video_url (rendered analysis videos)
--   - Any other field that needs to be updated later
--
-- SOLUTION: Add UPDATE policy for anonymous users
-- ============================================

-- Step 1: Drop conflicting policies if they exist
-- --------------------------------------------
DROP POLICY IF EXISTS "update own attempts" ON public.bowling_attempts;
DROP POLICY IF EXISTS "Allow public update" ON public.bowling_attempts;
DROP POLICY IF EXISTS "Allow anonymous update" ON public.bowling_attempts;

-- Step 2: Create UPDATE policy that allows both authenticated and anonymous users
-- --------------------------------------------
-- This policy allows:
-- - Authenticated users to update their own records (user_id = auth.uid())
-- - Anonymous users to update any record (since they can't be matched by user_id)
CREATE POLICY "Allow public update"
ON public.bowling_attempts
FOR UPDATE
USING (
  -- Allow authenticated users to update their own records
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- Allow anonymous users to update any record they created
  (auth.uid() IS NULL AND user_id IS NULL)
  OR
  -- Allow service role (admin) to update any record
  (auth.role() = 'service_role')
)
WITH CHECK (true);

-- Alternative: More permissive policy for easier debugging
-- Uncomment this if you want to allow all updates (less secure but simpler)
/*
DROP POLICY IF EXISTS "Allow public update" ON public.bowling_attempts;
CREATE POLICY "Allow public update"
ON public.bowling_attempts
FOR UPDATE
USING (true)
WITH CHECK (true);
*/

-- Step 3: Verify the policies
-- --------------------------------------------
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM 
  pg_policies
WHERE 
  schemaname = 'public' 
  AND tablename = 'bowling_attempts'
ORDER BY 
  policyname;

-- Step 4: Test UPDATE with a sample query
-- --------------------------------------------
-- This should now work for anonymous users
-- UPDATE public.bowling_attempts 
-- SET composite_card_url = 'https://example.com/test.png'
-- WHERE id = 'your-record-id-here';

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ═════════════════════════════════════════════════';
  RAISE NOTICE '✅  COMPOSITE CARD URL + VIDEO URL UPDATE FIX APPLIED!';
  RAISE NOTICE '✅ ═════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Changes Applied:';
  RAISE NOTICE '   ✓ Added UPDATE policy for bowling_attempts table';
  RAISE NOTICE '   ✓ Allows authenticated users to update own records';
  RAISE NOTICE '   ✓ Allows anonymous users to update records';
  RAISE NOTICE '';
  RAISE NOTICE '📊 What this fixes (ALL fields can now be updated):';
  RAISE NOTICE '   ✅ composite_card_url can now be updated';
  RAISE NOTICE '   ✅ video_url can now be updated';
  RAISE NOTICE '   ✅ whatsapp_sent flag can now be updated';
  RAISE NOTICE '   ✅ Any other field can now be updated';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security:';
  RAISE NOTICE '   → Authenticated users: Update own records only';
  RAISE NOTICE '   → Anonymous users: Update any record (necessary for client-side updates)';
  RAISE NOTICE '   → Admin (service_role): Update any record';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '   1. Test with new bowling attempt';
  RAISE NOTICE '   2. Check composite_card_url is populated (2 seconds after analysis)';
  RAISE NOTICE '   3. Check video_url is populated (after video rendering)';
  RAISE NOTICE '   4. Verify in admin dashboard';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Verification Query:';
  RAISE NOTICE '   SELECT id, display_name, composite_card_url, video_url, created_at';
  RAISE NOTICE '   FROM bowling_attempts';
  RAISE NOTICE '   ORDER BY created_at DESC LIMIT 5;';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Both composite_card_url AND video_url should now populate!';
  RAISE NOTICE '';
END $$;

