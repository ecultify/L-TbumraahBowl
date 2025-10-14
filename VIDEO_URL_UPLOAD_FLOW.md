# Complete Video URL Upload Flow to Supabase 🎥

## Overview
The video URL is uploaded to Supabase in **TWO stages**:
1. **Video file** → Supabase Storage (gets public URL)
2. **Public URL** → Supabase Database (bowling_attempts table)

---

## 📊 Complete Flow Diagram

```
User clicks "View Video"
        ↓
Video renders (local/server)
        ↓
finalVideoUrl obtained (blob/S3/local URL)
        ↓
┌────────────────────────────────────────────────────┐
│ STEP 1: UPLOAD VIDEO FILE TO SUPABASE STORAGE     │
└────────────────────────────────────────────────────┘
        ↓
uploadRenderedVideoToSupabase(finalVideoUrl, playerName, renderId)
        ↓
    Fetches video from finalVideoUrl (blob or S3)
        ↓
    Creates filename: analysis-{player}-{timestamp}-{id}.mp4
        ↓
    Uploads to Supabase Storage bucket: 'rendered-videos'
        ↓
    Gets public URL from Supabase
        ↓
    Returns: { success: true, publicUrl: "https://hqzukyxnnjnstrecybzx..." }
        ↓
uploadResult.publicUrl received
        ↓
┌────────────────────────────────────────────────────┐
│ MY FIX #1: NORMALIZE URL (Line 1139)              │
│ Fixes: https// → https://                         │
│ Prevents: domain prefix issues                     │
└────────────────────────────────────────────────────┘
        ↓
normalizedUrl = normalizeVideoUrl(uploadResult.publicUrl)
        ↓
    Checks for malformed URLs (https// without colon)
    Fixes if needed: https// → https://
    Validates starts with https://
        ↓
supabaseVideoUrl = normalizedUrl ✅
        ↓
Store in sessionStorage: 'generatedVideoUrl'
        ↓
┌────────────────────────────────────────────────────┐
│ STEP 2: SAVE PUBLIC URL TO DATABASE               │
└────────────────────────────────────────────────────┘
        ↓
Get leaderboardId from sessionStorage
        ↓
┌────────────────────────────────────────────────────┐
│ MY FIX #2: DOUBLE NORMALIZE (Line 1174)           │
│ Extra validation before database save              │
└────────────────────────────────────────────────────┘
        ↓
finalVideoUrl = normalizeVideoUrl(supabaseVideoUrl)
        ↓
    Re-validates URL format
    Ensures https:// (not https//)
    Returns null if invalid
        ↓
Validate: finalVideoUrl.startsWith('https://')
        ↓
        YES ✅
        ↓
await supabase
  .from('bowling_attempts')
  .update({ video_url: finalVideoUrl })  ← Clean, normalized URL
  .eq('id', leaderboardId)
        ↓
✅ VIDEO URL SAVED TO DATABASE!
        ↓
Navigate to /download-video
```

---

## 🔍 Detailed Code Flow

### STEP 1: Upload Video File to Supabase Storage

**Location:** `app/analyze/page.tsx` lines 1120-1157

```typescript
// Import upload utility
const { uploadRenderedVideoToSupabase } = await import('@/lib/utils/uploadRenderedVideoToSupabase');

// Call upload function
const uploadResult = await uploadRenderedVideoToSupabase(
  finalVideoUrl,        // blob:// or S3 URL or local path
  playerName,           // 'Abhinav'
  Date.now().toString() // '1760280441646'
);

// uploadResult contains:
{
  success: true,
  publicUrl: "https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/rendered-videos/analysis-abhinav-1760280441646-xyz123.mp4"
}
```

### Inside uploadRenderedVideoToSupabase()

**Location:** `lib/utils/uploadRenderedVideoToSupabase.ts`

```typescript
export async function uploadRenderedVideoToSupabase(
  videoUrl: string,      // Input: blob:// or S3 URL
  playerName: string,    // 'Abhinav'
  renderId?: string      // '1760280441646'
) {
  // 1. Fetch video from URL
  const response = await fetch(videoUrl);
  const blob = await response.blob();
  
  // 2. Create unique filename
  const sanitizedName = playerName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const timestamp = Date.now();
  const filename = `analysis-${sanitizedName}-${timestamp}-${renderId}.mp4`;
  // Result: "analysis-abhinav-1760280441646-xyz123.mp4"
  
  // 3. Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('rendered-videos')  // Bucket name
    .upload(filename, blob, {
      contentType: 'video/mp4',
      cacheControl: '3600',
      upsert: false
    });
  
  // 4. Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('rendered-videos')
    .getPublicUrl(filename);
  
  const publicUrl = publicUrlData.publicUrl;
  // Result: "https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/rendered-videos/analysis-abhinav-1760280441646-xyz123.mp4"
  
  // 5. Return URL
  return {
    success: true,
    publicUrl: publicUrl  // ← This is what gets returned
  };
}
```

---

### MY FIX #1: Normalize After Upload

**Location:** `app/analyze/page.tsx` lines 1138-1150

```typescript
if (uploadResult.success && uploadResult.publicUrl) {
  console.log('🔗 Raw Supabase URL:', uploadResult.publicUrl);
  
  // 🆕 MY FIX: Normalize URL before using
  const normalizedUrl = normalizeVideoUrl(uploadResult.publicUrl);
  
  if (!normalizedUrl) {
    console.error('❌ URL normalization failed!');
    supabaseVideoUrl = finalVideoUrl; // Fallback
  } else {
    supabaseVideoUrl = normalizedUrl; // ✅ Use normalized
    console.log('✅ Normalized URL:', supabaseVideoUrl.substring(0, 80) + '...');
  }
  
  // Update sessionStorage with clean URL
  window.sessionStorage.setItem('generatedVideoUrl', supabaseVideoUrl);
}
```

**What normalizeVideoUrl() Does:**

```typescript
export function normalizeVideoUrl(url: string): string | null {
  // Remove whitespace
  url = url.trim();
  
  // Fix missing colon: https// → https://
  if (url.includes('https//') && !url.includes('https://')) {
    url = url.replace(/https\/\//g, 'https://');
    console.warn('⚠️ Fixed malformed URL: added colon after https');
  }
  
  // Validate URL format
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    console.error('❌ Invalid URL format');
    return null; // ← Reject invalid URLs
  }
  
  return url; // ✅ Clean URL
}
```

---

### STEP 2: Save Public URL to Database

**Location:** `app/analyze/page.tsx` lines 1159-1202

```typescript
// Get leaderboard ID
const leaderboardId = window.sessionStorage.getItem('leaderboardEntryId');

if (leaderboardId && supabaseVideoUrl) {
  
  // 🆕 MY FIX #2: Double-check URL before database save
  const finalVideoUrl = normalizeVideoUrl(supabaseVideoUrl);
  
  if (!finalVideoUrl || !finalVideoUrl.startsWith('https://')) {
    console.error('❌ Invalid URL format!');
    console.error('🔍 Original:', supabaseVideoUrl);
    console.error('🔍 Normalized:', finalVideoUrl);
  } else {
    console.log('✅ URL validated, proceeding with UPDATE...');
    console.log('🔗 Clean URL:', finalVideoUrl.substring(0, 80) + '...');
    
    // UPDATE database with clean URL
    const { error, data } = await supabase
      .from('bowling_attempts')
      .update({ 
        video_url: finalVideoUrl  // ✅ Normalized, validated URL
      })
      .eq('id', leaderboardId)
      .select();
    
    if (!error) {
      console.log('✅ Video URL saved to database!');
      console.log('📋 Updated record:', data);
    }
  }
}
```

---

## 🎯 Why Two Normalizations?

### First Normalization (Line 1139)
- **When:** Right after upload to Supabase Storage
- **Why:** Fixes URL for immediate use
- **Stores:** Clean URL in sessionStorage

### Second Normalization (Line 1174)
- **When:** Before database save
- **Why:** Extra safety net to prevent malformed URLs in database
- **Ensures:** Database always has valid URLs

---

## 🐛 What Problem Does This Fix?

### Before My Fix:
```
1. Upload to Supabase Storage ✅
   URL: "https://hqzukyxnnjnstrecybzx.supabase.co/..."
   
2. Something corrupts URL (missing colon) ❌
   URL: "https//hqzukyxnnjnstrecybzx.supabase.co/..."
   
3. Browser treats as relative URL ❌
   Final: "https://bowllikebumrah.comhttps//hqzukyxnnjnstrecybzx..."
   
4. Saved to database ❌ (MALFORMED!)
```

### After My Fix:
```
1. Upload to Supabase Storage ✅
   URL: "https://hqzukyxnnjnstrecybzx.supabase.co/..."
   
2. First normalization ✅
   Detects: "https//" → Fixes to "https://"
   
3. Second normalization (database) ✅
   Re-validates: Starts with "https://" ✅
   
4. Saved to database ✅ (CLEAN!)
```

---

## 📊 Database Schema

**Table:** `bowling_attempts`

```sql
CREATE TABLE bowling_attempts (
  id UUID PRIMARY KEY,
  phone_number TEXT,
  display_name TEXT,
  video_url TEXT,  ← This column gets updated with normalized URL
  composite_card_url TEXT,
  predicted_kmh NUMERIC,
  similarity_percent NUMERIC,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

**Example Record After Upload:**
```json
{
  "id": "9e26cb93-5695-478c-ab2e-f2e240ba9bdd",
  "phone_number": "8169921886",
  "display_name": "Abhinav",
  "video_url": "https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/rendered-videos/analysis-abhinav-1760280441646-xyz123.mp4",
  "composite_card_url": "https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/bowling-reports/reports/abhinav-1760280441646.png",
  "predicted_kmh": 141,
  "similarity_percent": 92.00,
  "updated_at": "2025-10-12T14:47:21.646Z"
}
```

---

## ✅ Summary

**Upload Process:**
1. Video file → Supabase Storage bucket: `rendered-videos`
2. Get public URL from Storage
3. **MY FIX:** Normalize URL (fix `https//` → `https://`)
4. Store normalized URL in sessionStorage
5. **MY FIX:** Re-normalize before database save
6. Save clean URL → Database column: `video_url`

**Result:** Database always has clean, valid URLs that work perfectly! 🎉

