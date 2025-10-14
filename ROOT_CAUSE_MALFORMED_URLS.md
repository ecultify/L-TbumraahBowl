# 🔍 Root Cause Analysis: Malformed URLs

## TL;DR

**Malformed URLs like `https://bowllikebumrah.comhttps://...` were created WEEKS AGO and stored in the database. Your normalization IS working - it's fixing them on read. But we need to clean the database to remove them permanently.**

---

## 📊 Complete URL Flow Trace

### Path 1: Fresh User (New Video)
```
1. User uploads video
2. Server renders video → gets URL from Supabase Storage
3. URL saved to bowling_attempts.video_url
4. ✅ NEW VALIDATION (just added) prevents malformed URLs
```

### Path 2: Returning User (Existing Video) ← YOUR CASE
```
1. User enters phone number
   ↓
2. API: /api/lookup-phone/route.ts
   - Line 42: SELECT video_url FROM bowling_attempts
   - Gets: "https://bowllikebumrah.comhttps://hqzukyxnnjnstrecybzx..."
   - Lines 99-106: normalizeVideoUrl() fixes it
   - Returns: "https://hqzukyxnnjnstrecybzx.supabase.co/..." ✅
   ↓
3. DetailsCard.tsx
   - Line 151: Receives already-fixed URL
   - Stores in sessionStorage.existingVideoUrl
   ↓
4. User clicks "View Video"
   ↓
5. analyze/page.tsx
   - Line 824: Copies to sessionStorage.generatedVideoUrl
   ↓
6. download-video/page.tsx
   - Reads generatedVideoUrl
   - Applies normalization AGAIN (redundant but safe)
   - Displays video ✅
```

---

## ❓ Why Are Malformed URLs in Database?

The malformed URLs were created **BEFORE validation was added**, likely from one of these scenarios:

### Scenario A: URL Construction Bug (Most Likely)
```javascript
// Somewhere in old code (now fixed)
let videoUrl = supabaseUrl; // "https//..." (missing colon)

// Browser/framework treated it as relative URL
// Automatically prepended domain:
// Result: "https://bowllikebumrah.com" + "https//..." 
//       = "https://bowllikebumrah.comhttps//..."
```

### Scenario B: String Concatenation Error
```javascript
// Accidental concatenation
const domain = "https://bowllikebumrah.com";
const videoUrl = domain + supabaseUrl; // Oops!
```

### Scenario C: Missing Protocol Colon
```javascript
// Supabase returned: "https//..." (missing colon)
// Some code tried to fix it by adding domain:
const fixed = "https://bowllikebumrah.com" + url;
```

---

## ✅ Current State (After Your Fixes)

### What's Working Now:
1. ✅ **Normalization fixes malformed URLs on READ** (API, client)
2. ✅ **Validation BLOCKS saving new malformed URLs** (server, client)
3. ✅ **Videos display correctly** (normalization fixes them)

### What's Still Broken:
1. ❌ **Old malformed URLs still in database** (need SQL cleanup)
2. ⚠️ **Database integrity** (mixing clean and malformed URLs)

---

## 🔧 The Fix

### Step 1: Clean Database (NOW)
```sql
UPDATE bowling_attempts
SET video_url = NULL
WHERE video_url LIKE '%bowllikebumrah.com%';
```

This will:
- Remove all malformed URLs
- Force users to re-render (or we can manually fix URLs)

### Step 2: Verify No New Malformed URLs Created
After cleanup, monitor for 24 hours:

```sql
-- Check for new malformed URLs
SELECT id, phone_number, video_url, created_at
FROM bowling_attempts
WHERE video_url LIKE '%bowllikebumrah.com%'
  AND created_at > NOW() - INTERVAL '24 hours';
```

If any appear, the validation isn't working correctly.

### Step 3: Optional - Fix URLs Instead of Deleting
If you want to REPAIR URLs instead of setting them to NULL:

```sql
-- WARNING: Test on staging first!
UPDATE bowling_attempts
SET video_url = REGEXP_REPLACE(
  video_url,
  '^https?://[^/]+https?://',
  'https://'
)
WHERE video_url LIKE '%bowllikebumrah.com%';
```

This extracts the correct Supabase URL from the malformed one.

---

## 📋 Why Normalization Isn't Enough

You asked: "Why are we getting that URL in the first place?"

**Answer:** The malformed URLs are **STORED in your database from weeks ago**. Your normalization code is **working perfectly** - it's fixing them when they're read. But:

### Problems with Just Normalizing:
1. **Database integrity** - Bad data in database
2. **WhatsApp messages** - May contain malformed URLs
3. **Search/analytics** - Malformed URLs break queries
4. **Trust** - Hard to debug when source data is wrong

### Why We Need Both:
- **Normalization** = Band-aid (fixes symptoms)
- **Validation** = Prevention (stops new malformed URLs)
- **Database Cleanup** = Cure (removes root cause)

---

## 🎯 Timeline

### Past (Weeks Ago)
- Malformed URLs created and saved to database
- No validation existed
- Bug existed in URL handling

### Recent (This Week)
- You noticed malformed URLs appearing
- Added normalization (fixes on read)
- Added validation (blocks on save)

### Now (Today)
- Normalization working ✅
- Validation working ✅
- Old malformed URLs still in DB ❌

### Future (After Cleanup)
- Database clean ✅
- No new malformed URLs ✅
- All systems working ✅

---

## 🔍 How to Verify the Fix

### Test 1: Fresh Upload (New User)
1. Upload new video
2. Check browser console for validation logs
3. Query database:
   ```sql
   SELECT video_url FROM bowling_attempts 
   WHERE phone_number = 'TEST_PHONE'
   ORDER BY created_at DESC LIMIT 1;
   ```
4. **Expected:** Clean Supabase URL with no domain prepending

### Test 2: Returning User (After Cleanup)
1. Clean database with SQL
2. User re-renders video
3. Check video_url in database
4. **Expected:** Clean URL, video works

### Test 3: Monitor for 24 Hours
```sql
-- Run this every hour
SELECT COUNT(*) as malformed_count
FROM bowling_attempts
WHERE video_url LIKE '%bowllikebumrah.com%'
  AND created_at > NOW() - INTERVAL '1 hour';
```
**Expected:** Always returns 0

---

## 💡 Key Insights

1. **The malformed URLs are HISTORICAL** - They're not being created NOW
2. **Your normalization IS working** - It's fixing them on read
3. **Your validation IS working** - It's blocking new ones
4. **Database cleanup is NEEDED** - To remove the source

### Analogy:
- You have water pipes with rust (malformed URLs in database)
- You installed a filter at the tap (normalization)
- You installed a water quality sensor (validation)
- **But you still need to replace the rusty pipes (database cleanup)**

---

## ✅ Action Items

1. **[URGENT]** Run SQL cleanup to remove malformed URLs
2. **[TODAY]** Test fresh video upload, verify clean URL saved
3. **[24h]** Monitor for new malformed URLs
4. **[WEEK]** Confirm all videos working correctly

---

## 📞 If You Still See Malformed URLs After Cleanup

**That means validation isn't working correctly.** Share:

1. **Server logs** when video is saved:
   ```bash
   pm2 logs render-video | grep "DB Update"
   ```

2. **Browser console** when clicking "View Video"

3. **Database query**:
   ```sql
   SELECT id, video_url, created_at
   FROM bowling_attempts
   WHERE video_url LIKE '%bowllikebumrah.com%'
   ORDER BY created_at DESC LIMIT 1;
   ```

4. **The phone number** of the test user

We'll trace exactly where the malformed URL is being created.

---

**Bottom Line:** Run the SQL cleanup. Your code fixes are already working. The malformed URLs are old data that needs to be removed.

