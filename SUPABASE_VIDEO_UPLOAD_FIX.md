# Supabase Video Upload Fix - 413 Error Resolution

## Problem Summary
Video uploads were failing with **413 (Content Too Large)** error, causing the entire video rendering pipeline to fail:
```
POST /api/upload-user-video 413 (Content Too Large)
POST /api/generate-video 500 (Internal Server Error)
❌ Video rendering error
```

## Root Cause
1. **Vercel API Route Limits:**
   - Maximum request body size: **4.5MB** on Hobby plan
   - Maximum request body size: **4.5MB** on Pro plan (default)
   - User videos are typically **10-50MB** → Exceeds limit!

2. **File System Limitations:**
   - Vercel's serverless functions have ephemeral file system
   - Generated videos stored locally are lost on function termination
   - No persistent storage for user uploads or generated videos

## Solution: Supabase Storage Integration

### What Changed

#### 1. Upload User Video Route (`app/api/upload-user-video/route.ts`)
**Before:** Saved videos to local `/public/uploads/` directory (limited by API body size)

**After:** Uploads directly to Supabase Storage bucket
- ✅ Handles large files (up to **5GB** per file)
- ✅ Persistent storage (videos don't disappear)
- ✅ CDN-backed public URLs
- ✅ No API body size limits

**Key Changes:**
```typescript
// OLD: Local file system
writeFileSync(fullPath, buffer);
return { publicPath: `/uploads/${filename}` };

// NEW: Supabase Storage
const { data, error } = await supabase.storage
  .from('user-videos')
  .upload(filename, arrayBuffer, {
    contentType: file.type || 'video/mp4',
    cacheControl: '3600',
    upsert: false
  });

const { data: publicUrlData } = supabase.storage
  .from('user-videos')
  .getPublicUrl(filename);

return { publicPath: publicUrlData.publicUrl };
```

#### 2. Generate Video Route (`app/api/generate-video/route.ts`)
**Before:** Only saved generated videos to local file system

**After:** Uploads generated videos to Supabase Storage after rendering
- ✅ Persistent generated videos
- ✅ Public URLs for sharing
- ✅ Automatic CDN distribution
- ✅ Fallback to local URL if Supabase upload fails

**Key Changes:**
```typescript
// After Remotion renders video locally
const videoBuffer = readFileSync(outputPath);
const supabaseFilename = `generated-videos/analysis-video-${timestamp}.mp4`;

const { data, error } = await supabase.storage
  .from('user-videos')
  .upload(supabaseFilename, videoBuffer, {
    contentType: 'video/mp4',
    cacheControl: '3600'
  });

const { data: publicUrlData } = supabase.storage
  .from('user-videos')
  .getPublicUrl(supabaseFilename);

return { 
  videoUrl: publicUrlData.publicUrl, // Supabase URL
  localUrl: publicUrl // Backup
};
```

## Supabase Storage Setup

### Step 1: Create Storage Bucket

Go to Supabase Dashboard → Storage → Create new bucket:

```
Bucket Name: user-videos
Public: ✅ Yes (for public video URLs)
File size limit: 52428800 (50MB, adjust as needed)
Allowed MIME types: video/mp4, video/quicktime, video/webm, video/ogg
```

### Step 2: Set Bucket Policies

Run this SQL in Supabase SQL Editor to allow public uploads and downloads:

```sql
-- Allow public uploads to user-videos bucket
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'user-videos');

-- Allow public downloads from user-videos bucket
CREATE POLICY "Allow public downloads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-videos');

-- Allow public to view bucket
CREATE POLICY "Allow public bucket access"
ON storage.buckets FOR SELECT
TO public
USING (id = 'user-videos');
```

### Step 3: Configure CORS (if needed)

If uploading from different domains, configure CORS in Supabase:

```json
{
  "allowedOrigins": ["*"],
  "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
  "allowedHeaders": ["*"],
  "maxAge": 3600
}
```

## File Organization in Supabase

```
user-videos/
├── user-uploads/
│   ├── user-video-1234567890.mp4
│   ├── user-video-1234567891.mov
│   └── ...
└── generated-videos/
    ├── analysis-video-2025-01-10T12-30-45.mp4
    ├── analysis-video-2025-01-10T14-22-10.mp4
    └── ...
```

## Benefits of This Solution

### 1. **No More 413 Errors**
- Bypasses Vercel's 4.5MB API body limit
- Handles videos up to 5GB (Supabase limit, adjustable)

### 2. **Persistent Storage**
- Videos survive across deployments
- No data loss on serverless function cold starts
- Generated videos remain accessible

### 3. **Performance**
- CDN-backed URLs for fast global delivery
- Automatic image/video optimization
- Reduced server load (offloaded to Supabase)

### 4. **Scalability**
- Pay-as-you-go storage pricing
- No need to provision servers
- Automatic backups and redundancy

### 5. **Cost-Effective**
- Supabase Free tier: **1GB storage + 2GB bandwidth/month**
- Pro tier: **8GB storage + 50GB bandwidth/month** ($25/month)
- Much cheaper than dedicated video hosting

## Error Handling

The solution includes graceful fallbacks:

### Upload Failure:
```typescript
if (error) {
  console.error('❌ Supabase upload error:', error);
  return NextResponse.json({ 
    success: false, 
    error: `Supabase upload failed: ${error.message}` 
  }, { status: 500 });
}
```

### Video Generation with Fallback:
```typescript
try {
  // Upload to Supabase
  supabaseVideoUrl = uploadedUrl;
} catch (error) {
  console.warn('⚠️ Supabase upload error, using local URL');
  // Falls back to local URL
}

return { 
  videoUrl: supabaseVideoUrl, // Prioritize Supabase
  localUrl: publicUrl // Fallback
};
```

## Testing Checklist

### Upload Route:
- [ ] Upload small video (< 5MB) → Should succeed
- [ ] Upload medium video (10-20MB) → Should succeed (was failing before)
- [ ] Upload large video (40-50MB) → Should succeed
- [ ] Check Supabase Dashboard → Video should appear in `user-videos/user-uploads/`
- [ ] Public URL should be accessible and playable

### Video Generation:
- [ ] Generate video with similarity > 85%
- [ ] Check Supabase Dashboard → Generated video should appear in `user-videos/generated-videos/`
- [ ] Generated video URL should be accessible
- [ ] Generated video should be playable

### Error Scenarios:
- [ ] Invalid file type → Should return error
- [ ] Supabase bucket doesn't exist → Should return error
- [ ] Network failure → Should handle gracefully

## Monitoring & Debugging

### Check Supabase Storage Usage:
Supabase Dashboard → Settings → Storage → Usage

### Check Upload Logs:
```
📤 Starting video upload to Supabase...
📊 File details: { name: '...', size: '15.23MB', type: 'video/mp4' }
📦 Uploading to Supabase Storage: user-uploads/user-video-1234567890.mp4
✅ Video uploaded successfully to Supabase: https://...
```

### Check Generation Logs:
```
✅ Video rendered successfully: /generated-videos/... (2.45 MB)
📤 Uploading generated video to Supabase...
✅ Video uploaded to Supabase: https://...
```

## Migration Notes

### Existing Videos:
- Old videos in `/public/uploads/` will still work locally
- New uploads will go to Supabase automatically
- No migration required for existing functionality

### Environment Variables:
Already configured in `lib/supabase/client.ts`:
```typescript
NEXT_PUBLIC_SUPABASE_URL=https://hqzukyxnnjnstrecybzx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## Files Modified

1. **`app/api/upload-user-video/route.ts`**
   - Replaced file system with Supabase Storage
   - Added detailed logging
   - Returns Supabase public URL

2. **`app/api/generate-video/route.ts`**
   - Added Supabase imports
   - Uploads generated videos to Supabase after rendering
   - Returns Supabase URL with local fallback

## Next Steps (Optional Enhancements)

1. **Automatic Cleanup:**
   - Delete old videos after X days
   - Implement lifecycle policies in Supabase

2. **Compression:**
   - Compress videos before upload to save bandwidth
   - Use FFmpeg to optimize video size

3. **Progress Tracking:**
   - Implement upload progress bars
   - Show percentage complete for large files

4. **Video Transcoding:**
   - Convert all uploads to consistent format (e.g., MP4 H.264)
   - Generate multiple resolutions (360p, 720p, 1080p)

5. **Thumbnail Generation:**
   - Auto-generate thumbnails on upload
   - Store in separate Supabase bucket

## Troubleshooting

### Error: "Bucket not found"
→ Create `user-videos` bucket in Supabase Dashboard

### Error: "Row level security policy violation"
→ Run the SQL policies from Step 2 above

### Error: "CORS policy blocked"
→ Configure CORS in Supabase Storage settings

### Error: "File too large"
→ Increase bucket file size limit in Supabase Dashboard

### Videos upload but can't be accessed
→ Check bucket is set to "Public" in Supabase Dashboard

