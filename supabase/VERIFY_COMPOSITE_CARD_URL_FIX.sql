-- ============================================
-- VERIFICATION SCRIPT FOR COMPOSITE CARD URL FIX
-- ============================================
-- Run this script to verify:
-- 1. Current state of RLS policies
-- 2. Current state of bowling_attempts records
-- 3. Whether the fix is working
-- ============================================

-- ============================================
-- 1. CHECK RLS POLICIES
-- ============================================
SELECT 
  '📋 CURRENT RLS POLICIES' as section,
  policyname as "Policy Name",
  cmd as "Command",
  permissive as "Permissive",
  CASE 
    WHEN cmd = 'SELECT' THEN '✅'
    WHEN cmd = 'INSERT' THEN '✅'
    WHEN cmd = 'UPDATE' THEN '✅ (NEEDED FOR FIX)'
    WHEN cmd = 'DELETE' THEN '⚠️'
    ELSE '❓'
  END as "Status"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'bowling_attempts'
ORDER BY cmd, policyname;

-- ============================================
-- 2. CHECK IF UPDATE POLICY EXISTS
-- ============================================
SELECT 
  '🔍 UPDATE POLICY CHECK' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'bowling_attempts' 
        AND cmd = 'UPDATE'
    ) THEN '✅ UPDATE policy EXISTS - Fix is applied!'
    ELSE '❌ UPDATE policy MISSING - Need to run FIX_COMPOSITE_CARD_URL_UPDATE.sql'
  END as "Status";

-- ============================================
-- 3. CHECK RECENT RECORDS
-- ============================================
SELECT 
  '📊 RECENT BOWLING ATTEMPTS' as section,
  id,
  created_at,
  display_name,
  phone_number,
  predicted_kmh,
  CASE 
    WHEN composite_card_url IS NULL THEN '❌ NULL'
    WHEN composite_card_url LIKE 'https://%bowling-reports%' THEN '✅ Valid URL'
    ELSE '⚠️ Invalid URL'
  END as "Composite Card Status",
  CASE 
    WHEN video_url IS NULL THEN '❌ NULL'
    WHEN video_url LIKE 'https://%' THEN '✅ Has URL'
    ELSE '⚠️ Invalid URL'
  END as "Video Status",
  LENGTH(composite_card_url) as "URL Length"
FROM bowling_attempts
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 4. STATISTICS SUMMARY
-- ============================================
SELECT 
  '📈 STATISTICS' as section,
  COUNT(*) as "Total Records",
  COUNT(composite_card_url) as "Records with Composite Card URL",
  COUNT(*) - COUNT(composite_card_url) as "Records Missing Composite Card URL",
  ROUND(
    (COUNT(composite_card_url)::numeric / NULLIF(COUNT(*), 0) * 100), 2
  ) as "Percentage with URL (%)"
FROM bowling_attempts;

-- ============================================
-- 5. CHECK RECENT RECORDS (LAST 24 HOURS)
-- ============================================
SELECT 
  '⏰ LAST 24 HOURS' as section,
  COUNT(*) as "Total Records (24h)",
  COUNT(composite_card_url) as "With Composite Card URL",
  COUNT(*) - COUNT(composite_card_url) as "Missing Composite Card URL",
  ROUND(
    (COUNT(composite_card_url)::numeric / NULLIF(COUNT(*), 0) * 100), 2
  ) as "Percentage with URL (%)"
FROM bowling_attempts
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- ============================================
-- 6. CHECK TABLE STRUCTURE
-- ============================================
SELECT 
  '🗂️ TABLE STRUCTURE' as section,
  column_name as "Column",
  data_type as "Type",
  is_nullable as "Nullable",
  CASE 
    WHEN column_name = 'composite_card_url' THEN '← This field was remaining blank'
    WHEN column_name = 'video_url' THEN '← Video URL (should also populate)'
    WHEN column_name = 'phone_number' THEN '← Phone tracking'
    WHEN column_name = 'avatar_url' THEN '← Gemini avatar'
    ELSE ''
  END as "Notes"
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'bowling_attempts'
  AND column_name IN ('id', 'composite_card_url', 'video_url', 'avatar_url', 'phone_number', 'display_name')
ORDER BY 
  CASE column_name
    WHEN 'id' THEN 1
    WHEN 'display_name' THEN 2
    WHEN 'phone_number' THEN 3
    WHEN 'composite_card_url' THEN 4
    WHEN 'video_url' THEN 5
    WHEN 'avatar_url' THEN 6
  END;

-- ============================================
-- 7. CHECK STORAGE BUCKETS
-- ============================================
SELECT 
  '🪣 STORAGE BUCKETS' as section,
  id as "Bucket ID",
  name as "Bucket Name",
  public as "Public?",
  file_size_limit / 1024 / 1024 as "Max Size (MB)",
  CASE 
    WHEN name = 'bowling-reports' THEN '← Composite cards stored here'
    WHEN name = 'rendered-videos' THEN '← Rendered videos stored here'
    WHEN name = 'bowling-avatars' THEN '← Gemini avatars stored here'
    ELSE ''
  END as "Usage"
FROM storage.buckets
WHERE name IN ('bowling-reports', 'rendered-videos', 'bowling-avatars')
ORDER BY name;

-- ============================================
-- 8. CHECK COMPOSITE_CARDS TABLE
-- ============================================
SELECT 
  '🎴 COMPOSITE_CARDS TABLE' as section,
  COUNT(*) as "Total Composite Cards",
  COUNT(DISTINCT player_name) as "Unique Players",
  COUNT(DISTINCT avatar_url) as "Records with Avatar",
  MAX(created_at) as "Most Recent Card",
  MIN(created_at) as "Oldest Card"
FROM composite_cards;

-- ============================================
-- 9. TEST UPDATE CAPABILITY (READ-ONLY TEST)
-- ============================================
-- This checks if an UPDATE would be allowed (doesn't actually update)
EXPLAIN (FORMAT TEXT) 
UPDATE bowling_attempts 
SET composite_card_url = 'https://test.com/test.png'
WHERE id = (SELECT id FROM bowling_attempts ORDER BY created_at DESC LIMIT 1);

-- ============================================
-- 10. FINAL DIAGNOSIS
-- ============================================
DO $$
DECLARE
  has_update_policy BOOLEAN;
  total_records INT;
  records_with_url INT;
  recent_records INT;
  recent_with_url INT;
BEGIN
  -- Check if UPDATE policy exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bowling_attempts' AND cmd = 'UPDATE'
  ) INTO has_update_policy;
  
  -- Get statistics
  SELECT COUNT(*), COUNT(composite_card_url) 
  INTO total_records, records_with_url
  FROM bowling_attempts;
  
  SELECT COUNT(*), COUNT(composite_card_url)
  INTO recent_records, recent_with_url
  FROM bowling_attempts
  WHERE created_at >= NOW() - INTERVAL '24 hours';
  
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║           COMPOSITE CARD URL FIX - DIAGNOSIS              ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  
  -- Policy Check
  IF has_update_policy THEN
    RAISE NOTICE '✅ UPDATE Policy: EXISTS - Fix is applied!';
  ELSE
    RAISE NOTICE '❌ UPDATE Policy: MISSING - Run FIX_COMPOSITE_CARD_URL_UPDATE.sql';
  END IF;
  
  -- Overall Statistics
  RAISE NOTICE '';
  RAISE NOTICE '📊 Overall Statistics:';
  RAISE NOTICE '   Total Records: %', total_records;
  RAISE NOTICE '   With Composite Card URL: % (%%)', 
    records_with_url, 
    ROUND((records_with_url::numeric / NULLIF(total_records, 0) * 100), 1);
  RAISE NOTICE '   Missing Composite Card URL: % (%%)', 
    (total_records - records_with_url),
    ROUND(((total_records - records_with_url)::numeric / NULLIF(total_records, 0) * 100), 1);
  
  -- Recent Statistics
  RAISE NOTICE '';
  RAISE NOTICE '⏰ Last 24 Hours:';
  RAISE NOTICE '   Total Records: %', recent_records;
  RAISE NOTICE '   With Composite Card URL: % (%%)', 
    recent_with_url,
    ROUND((recent_with_url::numeric / NULLIF(recent_records, 0) * 100), 1);
  
  -- Diagnosis
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Diagnosis:';
  
  IF NOT has_update_policy THEN
    RAISE NOTICE '   ❌ UPDATE policy is MISSING';
    RAISE NOTICE '   → This is why composite_card_url remains blank';
    RAISE NOTICE '   → Solution: Run FIX_COMPOSITE_CARD_URL_UPDATE.sql';
  ELSIF recent_records = 0 THEN
    RAISE NOTICE '   ⚠️  No records in last 24 hours - cannot test';
    RAISE NOTICE '   → Create a new bowling attempt to test';
  ELSIF recent_with_url = 0 AND recent_records > 0 THEN
    RAISE NOTICE '   ⚠️  Recent records still missing URLs';
    RAISE NOTICE '   → Fix might not be working';
    RAISE NOTICE '   → Check browser console for errors';
  ELSIF recent_with_url = recent_records THEN
    RAISE NOTICE '   ✅ All recent records have composite card URLs!';
    RAISE NOTICE '   → Fix is working perfectly!';
  ELSE
    RAISE NOTICE '   ⚠️  Some recent records have URLs, some don''t';
    RAISE NOTICE '   → % out of % have URLs', recent_with_url, recent_records;
    RAISE NOTICE '   → Check if fix was applied during this period';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Verification complete!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '   1. Review the output above';
  RAISE NOTICE '   2. If UPDATE policy is missing, run: FIX_COMPOSITE_CARD_URL_UPDATE.sql';
  RAISE NOTICE '   3. If policy exists but URLs still missing, check browser console';
  RAISE NOTICE '   4. Test with a new bowling attempt';
  RAISE NOTICE '';
END $$;

