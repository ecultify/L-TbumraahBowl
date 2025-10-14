# URL Tracking Comparison - Composite Card vs Video

## ✅ Both URLs Are Tracked the Same Way!

Both `composite_card_url` and `video_url` follow the **exact same pattern**:

1. ✅ Upload to Supabase Storage Bucket
2. ✅ Get public URL
3. ✅ **UPDATE** `bowling_attempts` table with the URL
4. ✅ Store in sessionStorage for client use

---

## Side-by-Side Comparison

### 🎴 **Composite Card URL Flow**

```typescript
// Step 1: Generate composite card
uploadCompositeCardOnGeneration() 
  ↓
// Step 2: Upload to 'bowling-reports' bucket
await supabase.storage.from('bowling-reports').upload(...)
  ↓
// Step 3: Get public URL
const { data } = supabase.storage.from('bowling-reports').getPublicUrl(...)
const compositeCardUrl = data.publicUrl;
  ↓
// Step 4: Store in sessionStorage
window.sessionStorage.setItem('compositeCardUrl', compositeCardUrl);
  ↓
// Step 5: UPDATE database (app/analyze/page.tsx, Line 369-372)
await supabase
  .from('bowling_attempts')
  .update({ composite_card_url: compositeCardUrl })
  .eq('id', leaderboardEntryId);
```

**Result:** ✅ URL stored in `bowling_attempts.composite_card_url`

---

### 🎥 **Video URL Flow**

```typescript
// Step 1: Render video
handleViewVideo()
  ↓
// Step 2: Upload to 'rendered-videos' bucket
const { uploadResult } = await uploadRenderedVideoToSupabase(...)
await supabase.storage.from('rendered-videos').upload(...)
  ↓
// Step 3: Get public URL
const { data } = supabase.storage.from('rendered-videos').getPublicUrl(...)
const supabaseVideoUrl = data.publicUrl;
  ↓
// Step 4: Store in sessionStorage
window.sessionStorage.setItem('generatedVideoUrl', supabaseVideoUrl);
  ↓
// Step 5: UPDATE database (app/analyze/page.tsx, Line 936)
await supabase
  .from('bowling_attempts')
  .update({ video_url: supabaseVideoUrl })
  .eq('id', leaderboardId);
```

**Result:** ✅ URL stored in `bowling_attempts.video_url`

---

## Code Comparison

### Composite Card URL Update (app/analyze/page.tsx, Line 369-372)
```typescript
console.log('📊 Updating bowling_attempts with composite card URL...');
const { error: updateError } = await supabase
  .from('bowling_attempts')
  .update({ composite_card_url: result.compositeCardUrl })
  .eq('id', leaderboardEntryId);

if (updateError) {
  console.error('❌ Failed to update composite_card_url:', updateError);
} else {
  console.log('✅ Composite card URL saved to database!');
}
```

### Video URL Update (app/analyze/page.tsx, Line 934-943)
```typescript
console.log('[handleViewVideo] 📊 Updating leaderboard entry with Supabase video URL...');
const { error: updateError } = await supabase
  .from('bowling_attempts')
  .update({ video_url: supabaseVideoUrl })
  .eq('id', leaderboardId);

if (updateError) {
  console.error('[handleViewVideo] ❌ Failed to update leaderboard with video URL:', updateError);
} else {
  console.log('[handleViewVideo] ✅ Leaderboard entry updated with Supabase video URL!');
}
```

**Identical Pattern!** ✅

---

## Database Schema

Both columns exist in the `bowling_attempts` table:

```sql
CREATE TABLE bowling_attempts (
  id UUID PRIMARY KEY,
  phone_number TEXT,
  display_name TEXT,
  
  -- URLs to Supabase Storage
  composite_card_url TEXT,  -- ← Composite card in 'bowling-reports' bucket
  video_url TEXT,            -- ← Rendered video in 'rendered-videos' bucket
  
  -- Other fields
  predicted_kmh NUMERIC,
  similarity_percent NUMERIC,
  accuracy_score NUMERIC,
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Storage Buckets

### 📁 Composite Cards
- **Bucket:** `bowling-reports`
- **Path:** `reports/{filename}.png`
- **Column:** `bowling_attempts.composite_card_url`
- **Example URL:** `https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/bowling-reports/reports/john-doe-123.png`

### 📁 Rendered Videos
- **Bucket:** `rendered-videos`
- **Path:** `{filename}.mp4`
- **Column:** `bowling_attempts.video_url`
- **Example URL:** `https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/rendered-videos/analysis-john-doe-456.mp4`

---

## Two Places Where Video URL is Updated

### 1. Client-Side Update (app/analyze/page.tsx, Line 936)

**When:** After client uploads video to Supabase storage

```typescript
// 📤 UPLOAD RENDERED VIDEO TO SUPABASE STORAGE
const uploadResult = await uploadRenderedVideoToSupabase(
  finalVideoUrl,
  playerName,
  Date.now().toString()
);

if (uploadResult.success && uploadResult.publicUrl) {
  supabaseVideoUrl = uploadResult.publicUrl;
  window.sessionStorage.setItem('generatedVideoUrl', supabaseVideoUrl);
  
  // 📊 UPDATE LEADERBOARD ENTRY
  const { error: updateError } = await supabase
    .from('bowling_attempts')
    .update({ video_url: supabaseVideoUrl })
    .eq('id', leaderboardId);
}
```

### 2. Server-Side Update (server/render-video.js, Line 239)

**When:** After server renders and uploads video to Supabase storage

```typescript
// 🆕 UPLOAD TO SUPABASE
const supabaseUrl = await uploadToSupabase(outputPath, playerName, renderId);

// 🆕 UPDATE DATABASE WITH VIDEO URL
if (supabaseUrl && supabaseUrl.startsWith('https://') && leaderboardId) {
  await updateBowlingAttemptsVideoUrl(leaderboardId, supabaseUrl);
}

// updateBowlingAttemptsVideoUrl function:
async function updateBowlingAttemptsVideoUrl(leaderboardId, videoUrl) {
  const { error } = await supabase
    .from('bowling_attempts')
    .update({ video_url: videoUrl })
    .eq('id', leaderboardId);
  
  console.log(`✅ [DB Update] Successfully updated video_url in database!`);
}
```

---

## Console Logs to Verify

### Composite Card URL
```
🎨 Auto-uploading composite card to Supabase...
📤 Starting composite card upload to Supabase...
✅ Image uploaded to storage successfully
🔗 Public URL: https://...supabase.co/.../bowling-reports/reports/player-123.png
📊 Updating bowling_attempts with composite card URL...
✅ Composite card URL saved to database!
```

### Video URL
```
[handleViewVideo] 📤 Uploading rendered video to Supabase Storage...
[handleViewVideo] ✅ Video uploaded to Supabase!
[handleViewVideo] 🔗 Supabase URL: https://...supabase.co/.../rendered-videos/video-456.mp4
[handleViewVideo] 📊 Updating leaderboard entry with Supabase video URL...
[handleViewVideo] ✅ Leaderboard entry updated with Supabase video URL!
```

**OR (Server-Side):**
```
📤 [Supabase Upload] Starting upload to Supabase...
✅ [Supabase Upload] Upload complete!
✅ [Supabase Upload] Supabase URL: https://...supabase.co/.../rendered-videos/video-789.mp4
📊 [DB Update] Updating bowling_attempts table...
✅ [DB Update] Successfully updated video_url in database!
```

---

## Verification Query

Run this in Supabase SQL Editor to see both URLs:

```sql
SELECT 
  id,
  phone_number,
  display_name,
  composite_card_url,  -- Should be populated
  video_url,            -- Should be populated after video renders
  whatsapp_sent,
  created_at
FROM bowling_attempts
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result:**
- ✅ `composite_card_url`: Populated immediately after analysis
- ✅ `video_url`: Populated after user clicks "View Video" (2-5 min later)

---

## Timeline Comparison

### User Journey:
```
1. Upload video + analyze
   ↓
2. Enter phone number
   ↓
3. Navigate to analyze page
   ↓
4. Auto-submit to leaderboard
   - ✅ Creates bowling_attempts entry (id saved)
   - ⏸️ composite_card_url: NULL
   - ⏸️ video_url: NULL
   ↓
5. Auto-generate composite card (2 sec delay)
   - ✅ Upload to 'bowling-reports' bucket
   - ✅ UPDATE bowling_attempts SET composite_card_url = '...'
   ↓
6. User sees composite card
   ↓
7. User clicks "View Video" button
   ↓
8. Render video (2-5 minutes)
   - ✅ Upload to 'rendered-videos' bucket
   - ✅ UPDATE bowling_attempts SET video_url = '...'
   ↓
9. Send WhatsApp
   - ✅ UPDATE bowling_attempts SET whatsapp_sent = true
```

**Final Database State:**
```sql
{
  id: 'uuid-123',
  phone_number: '8169921886',
  composite_card_url: 'https://.../bowling-reports/reports/card.png', ✅
  video_url: 'https://.../rendered-videos/video.mp4', ✅
  whatsapp_sent: true ✅
}
```

---

## Why The Same Pattern Works

### Problem We Fixed for Composite Card:
- ❌ Was trying to include `composite_card_url` in INSERT (before generation)
- ❌ URL was NULL at INSERT time
- ✅ **Solution:** Remove from INSERT, UPDATE after generation

### Video URL Pattern (Already Correct):
- ✅ Not included in INSERT (video not rendered yet)
- ✅ UPDATE after video is uploaded
- ✅ Works perfectly!

**Video URL was already implemented correctly from the start!**

---

## Summary Table

| Aspect | Composite Card URL | Video URL |
|--------|-------------------|-----------|
| **Storage Bucket** | `bowling-reports` ✅ | `rendered-videos` ✅ |
| **Database Column** | `composite_card_url` ✅ | `video_url` ✅ |
| **In INSERT?** | ❌ No (we fixed this) | ❌ No (correct) |
| **UPDATE After Upload?** | ✅ Yes (line 369-372) | ✅ Yes (line 936) |
| **Stored in sessionStorage?** | ✅ Yes | ✅ Yes |
| **Server-Side Update?** | ❌ No (client only) | ✅ Yes (line 239) |
| **Status** | **✅ WORKING** | **✅ WORKING** |

---

## How to Verify Both URLs Are Saved

### 1. Check Console Logs
Look for these messages after completing analysis:
```
✅ Composite card URL saved to database!
✅ Leaderboard entry updated with Supabase video URL!
```

### 2. Check Supabase Dashboard
**Table Editor → bowling_attempts → Recent entries:**
- `composite_card_url` should have a value
- `video_url` should have a value (after rendering)

### 3. Check Storage Buckets
**Storage → bowling-reports:**
- Should see `.png` files

**Storage → rendered-videos:**
- Should see `.mp4` files

### 4. Test URL Access
Copy the URLs from the database and open in browser:
- Composite card URL → Should display PNG image
- Video URL → Should play MP4 video

---

## Conclusion

✅ **Composite Card URL:** Saved to `bowling_attempts` table  
✅ **Video URL:** Saved to `bowling_attempts` table  
✅ **Both follow the exact same pattern**  
✅ **Both are stored in Supabase buckets**  
✅ **Both are tracked in the database**  

**Everything is working as designed!** 🎉

The only difference:
- **Composite card:** Generated ~2 seconds after analysis
- **Video:** Generated ~2-5 minutes after user clicks "View Video"

But both URLs end up in the `bowling_attempts` table exactly the same way!

