# Video Preview Page - Background Supabase Upload

## What Was Added

Added **background Supabase upload** functionality to the video-preview page that:
- ✅ Runs automatically after video loads
- ✅ Doesn't block the UI or existing functionality
- ✅ Uploads video to Supabase in the background
- ✅ Stores the public URL for later use
- ✅ Skips if video is already uploaded

## How It Works

### New Functionality Flow:

```
1. User arrives at video-preview page
   ↓
2. Video displays from blob URL (existing functionality) ✅
   ↓
3. [2 seconds later] Background upload starts 📤
   ↓
4. Video uploads to Supabase (non-blocking) 📦
   ↓
5. Supabase public URL saved to sessionStorage ✅
   ↓
6. User can continue to details page
   ↓
7. Details page uses Supabase URL (no 413 error!) 🎉
```

### Existing Functionality (Unchanged):

- ✅ Video displays immediately from blob URL
- ✅ Face detection still runs
- ✅ Gemini torso generation still works
- ✅ Navigation to details page still works
- ✅ All UI interactions remain the same

## Code Changes

### Added State:
```typescript
const [supabaseUploadComplete, setSupabaseUploadComplete] = useState(false);
```

### Added Background Upload Function:
```typescript
const uploadVideoToSupabase = useCallback(async () => {
  // Check if already uploaded
  if (sessionStorage.getItem('uploadedVideoPublicPath')) {
    console.log('ℹ️ Video already uploaded to Supabase, skipping...');
    return;
  }

  // Get video file from tempVideoFile or reconstruct from base64
  let videoFile: File | null = null;
  
  if ((window as any).tempVideoFile) {
    videoFile = (window as any).tempVideoFile;
  } else {
    // Reconstruct from sessionStorage
    const storedVideoData = sessionStorage.getItem('uploadedVideoData');
    if (storedVideoData?.startsWith('data:')) {
      const blob = await (await fetch(storedVideoData)).blob();
      videoFile = new File([blob], fileName, { type: mimeType });
    }
  }

  // Upload to Supabase
  const formData = new FormData();
  formData.append('file', videoFile);
  
  const response = await fetch('/api/upload-user-video', {
    method: 'POST',
    body: formData
  });

  if (response.ok) {
    const result = await response.json();
    sessionStorage.setItem('uploadedVideoPublicPath', result.publicPath);
    console.log('✅ [Background] Video uploaded to Supabase');
  }
}, []);
```

### Added Auto-Upload Effect:
```typescript
useEffect(() => {
  if (videoUrl && !supabaseUploadComplete && !sessionStorage.getItem('uploadedVideoPublicPath')) {
    // Wait 2 seconds before uploading (ensure page is loaded)
    const timer = setTimeout(() => {
      uploadVideoToSupabase();
    }, 2000);
    
    return () => clearTimeout(timer);
  }
}, [videoUrl, supabaseUploadComplete, uploadVideoToSupabase]);
```

## Benefits

### 1. **Non-Blocking Upload**
- Video displays immediately
- Upload happens in background
- User can interact with page during upload

### 2. **No Duplicate Uploads**
- Checks if video is already uploaded
- Skips upload if `uploadedVideoPublicPath` exists in sessionStorage
- Saves bandwidth and time

### 3. **Fallback to SessionStorage**
- If `tempVideoFile` is not available, reconstructs from base64 data
- Ensures upload works even if file reference is lost

### 4. **Graceful Error Handling**
- Upload errors don't crash the app
- Logs warnings instead of throwing errors
- Existing functionality continues to work

### 5. **Seamless Integration**
- No changes to existing video display logic
- No changes to face detection logic
- No changes to navigation logic
- Works alongside all existing features

## Expected Console Logs

### Successful Background Upload:
```
✅ Video loaded successfully: [video data]
📤 [Background] Starting Supabase video upload...
📦 Using tempVideoFile for Supabase upload
📤 Starting video upload to Supabase...
📊 File details: {name: 'video.mp4', size: '15.23MB', type: 'video/mp4'}
📦 Uploading to Supabase Storage: user-uploads/user-video-1234567890.mp4
✅ Video uploaded successfully to Supabase: https://hqzukyxnnjnstrecybzx...
✅ [Background] Video uploaded to Supabase: https://...
```

### Skip Upload (Already Uploaded):
```
ℹ️ Video already uploaded to Supabase, skipping...
```

### Upload Failed (Non-Fatal):
```
⚠️ [Background] Supabase upload failed: 403
[Page continues to work normally]
```

## SessionStorage Keys

After successful upload, you'll have:
```javascript
sessionStorage.getItem('uploadedVideoPublicPath')
// Returns: "https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/user-videos/..."
```

This URL is then used by:
- `app/analyze/page.tsx` - For video rendering
- `app/api/generate-video/route.ts` - For Remotion

## Testing

### Test Background Upload:
1. Upload a video on record-upload page
2. Navigate to video-preview page
3. Video should display immediately
4. Wait 2-3 seconds
5. Check console for:
   ```
   ✅ [Background] Video uploaded to Supabase
   ```
6. Check sessionStorage:
   ```javascript
   sessionStorage.getItem('uploadedVideoPublicPath')
   // Should return Supabase URL
   ```

### Test Skip Duplicate Upload:
1. Upload a video (background upload completes)
2. Go back to record-upload page
3. Navigate to video-preview again
4. Check console for:
   ```
   ℹ️ Video already uploaded to Supabase, skipping...
   ```

### Test Page Flow:
1. Upload video
2. Video displays immediately ✅
3. Face detection runs (if enabled) ✅
4. Click "Continue" → Details page ✅
5. Analysis uses Supabase URL (no 413 error) ✅

## Important Notes

### 1. **2-Second Delay**
The upload starts 2 seconds after the video loads to:
- Ensure page is fully loaded
- Prevent blocking initial render
- Allow face detection to start first

### 2. **Background Process**
The upload is **completely separate** from:
- Video display (happens immediately)
- Face detection (runs independently)
- User navigation (not blocked)

### 3. **Error Handling**
Upload errors are **non-fatal**:
- Logs warning to console
- Doesn't throw error
- Doesn't show modal
- Page continues to work

### 4. **Fallback Mechanism**
If Supabase upload fails, the analyze page will:
1. Try to upload again (has its own upload logic)
2. Or use the base64 data as fallback
3. Analysis will still work (might hit 413 if video is too large)

## Files Modified

- `app/video-preview/page.tsx`
  - Added `supabaseUploadComplete` state
  - Added `uploadVideoToSupabase` function
  - Added auto-upload `useEffect`

## Supabase Setup Required

### Option 1: Via Dashboard (Recommended)
1. Go to Supabase Dashboard → Storage
2. Create bucket: `user-videos` (Public)
3. Go to SQL Editor
4. Run `SUPABASE_COMPLETE_SETUP.sql`

### Option 2: Quick SQL (Minimum)
```sql
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'user-videos');

CREATE POLICY "Allow public downloads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-videos');

CREATE POLICY "Allow public bucket access"
ON storage.buckets FOR SELECT
TO public
USING (id = 'user-videos');
```

## Troubleshooting

### Upload Fails with 403:
→ Run the SQL policies in Supabase

### Upload Fails with "Bucket not found":
→ Create `user-videos` bucket in Supabase Dashboard

### Upload Doesn't Start:
→ Check console for error messages
→ Ensure video is loaded (`videoUrl` is set)

### Upload Takes Too Long:
→ Normal for large videos (10-50MB)
→ Upload happens in background, doesn't block UI

## Summary

✅ **Background upload** - Doesn't block UI  
✅ **Non-blocking** - User can navigate immediately  
✅ **Duplicate prevention** - Only uploads once  
✅ **Error tolerant** - Failures don't break page  
✅ **Seamless** - No changes to existing flow  

The video-preview page now automatically uploads videos to Supabase in the background, ensuring the Supabase URL is available for video generation without any 413 errors! 🎉

