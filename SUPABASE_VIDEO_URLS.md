# Supabase Video URLs for Remotion

## ✅ Videos Uploaded to Supabase

All large video files have been uploaded to Supabase to avoid bundling them with the Remotion site, which was causing timeout issues on Lambda.

### Uploaded Videos:

1. **Background Video (BG.mp4)** - 25.66 MB
   ```
   https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/bowling-avatars/remotion-assets/BG.mp4
   ```

2. **Benchmark Bowling Action** - 0.78 MB
   ```
   https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/bowling-avatars/remotion-assets/benchmark-bowling-action.mp4
   ```

## Changes Made

### File: `remotion/FirstFrame.tsx`

**Before:**
```typescript
const benchmarkVideoSrc = staticFile('benchmark-bowling-action.mp4');

// ...

<Video
  src={staticFile('BG.mp4')}
  // ...
/>
```

**After:**
```typescript
const benchmarkVideoSrc = 'https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/bowling-avatars/remotion-assets/benchmark-bowling-action.mp4';

// ...

<Video
  src="https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/bowling-avatars/remotion-assets/BG.mp4"
  // ...
/>
```

## Test Results

✅ **Lambda Render Test Completed Successfully!**

- **Render ID:** `xmopngx3yy`
- **Duration:** 41.46 seconds
- **Cost:** $0.031
- **Output Size:** 13.1 MB
- **Output URL:** `https://s3.ap-south-1.amazonaws.com/remotionlambda-apsouth1-fp5224pnxc/renders/xmopngx3yy/test-render-SUCCESS.mp4`

### What This Proves:

1. ✅ Supabase video URLs are accessible from Lambda
2. ✅ No timeout issues when videos are hosted on Supabase
3. ✅ Render completes successfully and outputs to S3
4. ✅ Videos stored in S3 are publicly accessible
5. ✅ Background rendering will work in production

## Supabase Configuration

- **URL:** `https://hqzukyxnnjnstrecybzx.supabase.co`
- **Bucket:** `bowling-avatars`
- **Folder:** `remotion-assets/`

## Next Steps

1. ✅ Videos uploaded to Supabase
2. ✅ Remotion composition updated to use Supabase URLs
3. ✅ Site redeployed with new configuration
4. ✅ Lambda rendering tested and verified

### For Future Video Uploads:

Use the script at `scripts/upload-videos-to-supabase.js` to upload additional videos:

```bash
node scripts/upload-videos-to-supabase.js
```

You can modify the `videosToUpload` array in the script to add more videos.

## Important Notes

- Large video files should **NOT** be bundled with the Remotion site
- Always use direct URLs (from Supabase or other CDN) for videos > 5MB
- The `staticFile()` helper should only be used for small assets (images, small videos)
- Lambda has a 30-second timeout per frame by default; loading large videos from the bundle can cause timeouts
- Using Supabase URLs makes renders faster and more reliable

---

**Last Updated:** October 7, 2025  
**Status:** ✅ Working and verified

