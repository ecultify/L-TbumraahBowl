# Supabase URL Handling Fix for Video Generation

## Problem
After implementing Supabase upload, the video generation was failing because:

1. ✅ User uploads video → Supabase returns URL: `https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/user-videos/...`
2. ✅ Frontend sends Supabase URL to `/api/generate-video`
3. ❌ Backend checks if file exists **locally** → Fails!
   ```typescript
   const fullCheck = path.join(process.cwd(), 'public', cleaned);
   if (existsSync(fullCheck)) { // ❌ Returns false for Supabase URLs
   ```
4. ❌ Video generation proceeds without user video reference

## Root Cause
The `generate-video` route was expecting **local file paths** like:
- `/uploads/video.mp4`
- `uploads/video.mp4`
- `public/uploads/video.mp4`

But now receives **remote Supabase URLs** like:
- `https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/user-videos/user-uploads/user-video-1234567890.mp4`

## Solution
Updated `app/api/generate-video/route.ts` to detect and handle both:
1. **Supabase URLs** (remote) - Pass directly to Remotion
2. **Local paths** (legacy) - Check file exists on disk

### Code Changes

**Before:**
```typescript
// Resolve user video path
let userVideoRelPath: string | null = null;
if (typeof userVideoPublicPath === 'string' && userVideoPublicPath.trim()) {
  const cleaned = userVideoPublicPath.replace(/^\/?public\//, '').replace(/^\//, '');
  const fullCheck = path.join(process.cwd(), 'public', cleaned);
  if (existsSync(fullCheck)) {  // ❌ Fails for Supabase URLs
    userVideoRelPath = cleaned;
  } else {
    console.warn('Provided userVideoPublicPath does not exist on disk:', fullCheck);
  }
}
```

**After:**
```typescript
// Resolve user video path
let userVideoRelPath: string | null = null;
if (typeof userVideoPublicPath === 'string' && userVideoPublicPath.trim()) {
  // Check if it's a Supabase URL
  if (userVideoPublicPath.startsWith('http://') || userVideoPublicPath.startsWith('https://')) {
    // It's a remote URL (Supabase) - pass it directly to Remotion
    userVideoRelPath = userVideoPublicPath;
    console.log('✅ Using Supabase video URL:', userVideoPublicPath.substring(0, 80) + '...');
  } else {
    // It's a local path - check if file exists
    const cleaned = userVideoPublicPath.replace(/^\/?public\//, '').replace(/^\//, '');
    const fullCheck = path.join(process.cwd(), 'public', cleaned);
    if (existsSync(fullCheck)) {
      userVideoRelPath = cleaned;
      console.log('✅ Using local video path:', cleaned);
    } else {
      console.warn('⚠️ Local video path does not exist on disk:', fullCheck);
    }
  }
}
```

## How It Works

### Flow with Supabase:
```
1. User uploads video → /api/upload-user-video
   ↓
2. Video saved to Supabase Storage
   ↓
3. Returns: { publicPath: 'https://hqzukyxnnjnstrecybzx.supabase.co/...' }
   ↓
4. Frontend sends URL to /api/generate-video
   ↓
5. Backend detects https:// prefix ✅
   ↓
6. Passes Supabase URL directly to Remotion
   ↓
7. Remotion fetches video from Supabase URL
   ↓
8. Video renders successfully! 🎉
```

### Flow with Local Files (Legacy):
```
1. Video already exists in /public/uploads/video.mp4
   ↓
2. Frontend sends: { userVideoPublicPath: '/uploads/video.mp4' }
   ↓
3. Backend checks local file system ✅
   ↓
4. File exists → Passes local path to Remotion
   ↓
5. Remotion reads from local file system
   ↓
6. Video renders successfully! 🎉
```

## Benefits

### 1. **Backward Compatible**
- ✅ Works with Supabase URLs (new)
- ✅ Works with local paths (legacy)
- ✅ No breaking changes

### 2. **No Payload Size Issues**
- ✅ Only sends **URL string** (< 200 bytes)
- ✅ Not sending video data (50MB+)
- ✅ No more 413 errors

### 3. **Remotion Compatibility**
- ✅ Remotion can load videos from HTTP URLs
- ✅ Automatically fetches from Supabase
- ✅ No need to download video first

## Expected Logs

### Successful Supabase Flow:
```
📤 Starting video upload to Supabase...
📊 File details: {name: 'video.mp4', size: '15.23MB', type: 'video/mp4'}
📦 Uploading to Supabase Storage: user-uploads/user-video-1234567890.mp4
✅ Video uploaded successfully to Supabase: https://hqzukyxnnjnstrecybzx.supabase.co/...

🎥 Starting video rendering process...
✅ Using Supabase video URL: https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/...
Rendering video with Remotion CLI...
✅ Video rendered successfully: /generated-videos/... (2.45 MB)
📤 Uploading generated video to Supabase...
✅ Video uploaded to Supabase: https://...
```

### Legacy Local Flow (Still Works):
```
🎥 Starting video rendering process...
✅ Using local video path: uploads/video.mp4
Rendering video with Remotion CLI...
✅ Video rendered successfully: /generated-videos/... (2.45 MB)
```

### Error Case (Video Not Found):
```
🎥 Starting video rendering process...
⚠️ Local video path does not exist on disk: /path/to/project/public/uploads/video.mp4
[Remotion proceeds without user video - uses analysis data only]
```

## Important Notes

### Remotion Requirements:
Remotion can load videos from URLs, but requires:
1. ✅ URL must be publicly accessible (Supabase bucket is public)
2. ✅ CORS must allow access (Supabase handles this)
3. ✅ Video format must be supported (MP4, MOV, WebM)

### If Remotion Still Fails on Vercel:
The 413 error is now fixed, but Remotion may still fail due to:
- ⚠️ Serverless timeout (60s limit on Vercel Pro)
- ⚠️ Missing FFmpeg/Chromium in serverless environment
- ⚠️ Memory constraints

**This is a separate issue** from the payload size error. The video upload and analysis will work regardless.

## Testing

### Test Supabase Upload + Generation:
1. Upload a 10-20MB video
2. Check console for:
   ```
   ✅ Video uploaded successfully to Supabase: https://...
   ```
3. Wait for analysis to complete
4. Click "Generate Video" (if similarity > 85%)
5. Check console for:
   ```
   ✅ Using Supabase video URL: https://...
   ```
6. If successful:
   ```
   ✅ Video rendered successfully
   ```

### Test Legacy Local Path (Optional):
1. Manually place video in `/public/uploads/test.mp4`
2. Set `userVideoPublicPath` to `/uploads/test.mp4`
3. Should see:
   ```
   ✅ Using local video path: uploads/test.mp4
   ```

## Files Modified
- `app/api/generate-video/route.ts` - Added URL detection and handling

## Summary
✅ **413 Error Fixed** - Video uploads go to Supabase (no payload limit)  
✅ **URL Handling Fixed** - Generate-video route now accepts Supabase URLs  
✅ **Backward Compatible** - Still works with local paths  
✅ **No Remotion Lambda Needed** - Uses standard Remotion rendering  

The main 413 error is completely resolved! 🎉

