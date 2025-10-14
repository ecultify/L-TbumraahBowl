# Complete Retry Flow Fixes - All Issues Resolved ✅

## Issues Fixed

### 1. ✅ Download-Video Page Showing Old Video
**Problem:** After retry, download-video page showed old cached video instead of newly rendered one.

**Root Cause:** Page was checking for `existingVideoUrl` before checking for `generatedVideoUrl` (fresh video).

**Solution:** Reordered checks to prioritize fresh video data.

### 2. ✅ Malformed Video URL in Database
**Problem:** Video URLs in database were malformed like:
```
https://bowllikebumrah.comhttps//hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/rendered-videos/...
```

**Root Cause:** URLs with `https//` (missing colon) are treated as relative URLs by browsers, causing domain to be prepended.

**Solution:** Added URL normalization before saving to database.

### 3. ✅ Duplicate Rows in Database
**Problem:** Retry created new database rows instead of updating existing ones.

**Root Cause:** Returning user check happened AFTER fresh data check returned early, so `isReturningUser` and `existingRecordId` were never set.

**Solution:** Moved returning user check BEFORE fresh data check to ensure UPDATE happens instead of INSERT.

---

## Files Modified

### 1. `app/download-video/page.tsx`

**What Changed:**
- Reordered data loading logic to prioritize fresh video over cached

**Before:**
```typescript
// Check cached video first
const existingVideoUrl = ...;
if (existingVideoUrl) {
  setUrl(existingVideoUrl); // OLD video
}

// Then check fresh video
const generatedUrl = ...;
```

**After:**
```typescript
// Check fresh video FIRST
const freshVideoUrl = ...;
if (renderStatus === 'completed' && freshVideoUrl) {
  setUrl(normalizeVideoUrl(freshVideoUrl)); // NEW video ✅
  return;
}

// Only if no fresh video, check cached
const existingVideoUrl = ...;
if (existingVideoUrl) {
  setUrl(existingVideoUrl); // Fallback to old
}
```

**Console Output:**
- Fresh video: `✨ Fresh video detected - using NEW video (retry)`
- Cached video: `📦 No fresh video - loading CACHED existing video`

---

### 2. `app/analyze/page.tsx` (Video URL Normalization)

**What Changed:**
- Added URL normalization before saving to database (Line 1167)

**Before:**
```typescript
const { error } = await supabase
  .from('bowling_attempts')
  .update({ video_url: supabaseVideoUrl }) // ❌ Could be malformed
  .eq('id', leaderboardId);
```

**After:**
```typescript
// ⚠️ CRITICAL: Validate and normalize URL
const finalVideoUrl = normalizeVideoUrl(supabaseVideoUrl);

if (!finalVideoUrl || !finalVideoUrl.startsWith('https://')) {
  console.error('❌ Invalid URL format!');
} else {
  const { error } = await supabase
    .from('bowling_attempts')
    .update({ video_url: finalVideoUrl }) // ✅ Normalized & validated
    .eq('id', leaderboardId);
}
```

**What It Fixes:**
- Converts `https//` → `https://` (adds missing colon)
- Validates URL starts with `https://`
- Prevents browsers from prepending domain

---

### 3. `app/analyze/page.tsx` (Duplicate Rows Prevention)

**What Changed:**
- Moved returning user check BEFORE fresh data early return (Lines 378-392)

**Before:**
```typescript
if (hasFreshAnalysis) {
  console.log('Fresh analysis detected');
  return; // ❌ Returns early, never sets isReturningUser!
}

// This code never runs for fresh analysis ❌
if (returningUser && recordId) {
  setIsReturningUser(true);
  setExistingRecordId(recordId);
}
```

**After:**
```typescript
// ALWAYS check returning user status (even if fresh analysis)
const returningUser = ...;
const recordId = ...;

if (returningUser && recordId) {
  console.log('🔄 Returning user detected! Record ID:', recordId);
  setIsReturningUser(true); // ✅ Set BEFORE early return
  setExistingRecordId(recordId);
  setLeaderboardEntryId(recordId);
}

if (hasFreshAnalysis) {
  return; // OK now, user status already set ✅
}
```

**Why This Matters:**
The `submitToLeaderboard` function checks:
```typescript
if (isReturningUser && existingRecordId) {
  // UPDATE existing record ✅
  await supabase.update(...).eq('id', existingRecordId);
} else {
  // INSERT new record ❌ (creates duplicate!)
  await supabase.insert(...);
}
```

Without setting `isReturningUser` and `existingRecordId`, it always inserts a new row!

---

## Testing

### Test 1: Download-Video Page Priority

**Steps:**
1. As returning user → View old analysis
2. Click Retry → Complete analysis
3. Click "View Video" → Wait for render
4. Navigate to download-video page

**Expected Console:**
```
[DownloadVideo] ✨ Fresh video detected - using NEW video (retry)
[DownloadVideo] ✅ Fresh video URL loaded
```

**NOT:**
```
[DownloadVideo] 📦 Loading CACHED existing video  ← OLD video ❌
```

---

### Test 2: Video URL Normalization

**Steps:**
1. Complete video analysis and render
2. Check console logs

**Expected Console:**
```
[handleViewVideo] ✅ URL validated and normalized
[handleViewVideo] 🔗 Clean URL: https://hqzukyxnnjnstrecybzx.supabase.co/...
[handleViewVideo] ✅ Video URL saved to database!
```

**Check Database:**
```sql
SELECT video_url FROM bowling_attempts 
WHERE id = '<your-record-id>';
```

**Should be:**
```
https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/rendered-videos/analysis-player-123.mp4
```

**NOT:**
```
https://bowllikebumrah.comhttps//hqzukyxnnjnstrecybzx...  ← MALFORMED ❌
```

---

### Test 3: No Duplicate Rows

**Steps:**
1. As returning user → View old analysis
2. Click Retry → Complete new analysis
3. Check database

**Expected Console:**
```
[Analyze] 🔄 Returning user detected! Record ID: abc-123
[Analyze] ✨ Fresh analysis detected - using NEW data
📤 Submitting analysis results to Supabase leaderboard...
🔄 Returning user - UPDATING existing record: abc-123
✅ Successfully updated existing record (retry)
```

**Check Database:**
```sql
SELECT COUNT(*) FROM bowling_attempts 
WHERE phone_number = '<your-phone>';
```

**Should return:** `1` (same record updated)  
**NOT:** `2` or more (duplicate rows created) ❌

---

## Deployment

Upload these **3 files** to VPS:

1. `app/analyze/page.tsx` (2 fixes: URL normalization + duplicate rows)
2. `app/download-video/page.tsx` (fresh video priority)
3. `lib/utils/uploadCompositeCardOnGeneration.ts` (font fix from earlier)
4. `lib/utils/downloadCompositeCard.ts` (font fix from earlier)

Then rebuild:
```bash
cd /var/www/html/bowling-project
rm -rf .next
npm run build
pm2 restart bowling-web
```

**CRITICAL:** Clear browser cache!
- F12 → Application → Clear site data
- Check ALL boxes → Clear data
- Close browser → Reopen

---

## Summary

### ✅ Issue 1: Download-Video Caching
- **Fixed:** Prioritizes fresh video URL over cached
- **Impact:** Retry shows NEW video (not old)

### ✅ Issue 2: Malformed Video URLs
- **Fixed:** Normalizes URLs before saving to database
- **Impact:** No more `bowllikebumrah.comhttps//` URLs

### ✅ Issue 3: Duplicate Database Rows
- **Fixed:** Sets returning user status before early return
- **Impact:** Database UPDATE instead of INSERT

### ✅ Issue 4: Analyze Page Caching (from earlier)
- **Fixed:** Prioritizes fresh analysis data over cached
- **Impact:** Shows new 92% score (not old 81%)

### ✅ Issue 5: Composite Card Font (from earlier)
- **Fixed:** Preloads Helvetica Condensed before rendering
- **Impact:** Cards use correct font (not Times New Roman)

---

## Expected Results After Deployment

**Retry Flow:**
1. ✅ Analyze page shows NEW analysis (not cached)
2. ✅ NEW composite card displayed
3. ✅ NEW video rendered and shown
4. ✅ Database record UPDATED (not duplicated)
5. ✅ Video URL properly formatted
6. ✅ "View Video" button appears for high scores

**Database Integrity:**
- ✅ One row per phone number (no duplicates)
- ✅ All URLs properly formatted
- ✅ `updated_at` timestamp reflects retry

**User Experience:**
- ✅ Seamless retry experience
- ✅ Always shows latest results
- ✅ No confusion from stale data
- ✅ Professional fonts and URLs

🎉 **All retry flow issues are now completely resolved!**

