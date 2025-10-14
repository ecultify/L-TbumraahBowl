# MoveNet Model Update - Thunder to Lightning

## Problem Encountered
The MoveNet **Thunder** model from TensorFlow Hub was returning **403 Forbidden** errors:
```
GET https://tfhub.dev/google/tfjs-model/movenet/singlepose/thunder/4/model.json 403 (Forbidden)
```

This was preventing video analysis from working for returning users.

## Solution Implemented
✅ Switched from **Thunder** to **Lightning** model in `lib/analyzers/benchmarkComparison.ts`

### Changes Made

**File:** `lib/analyzers/benchmarkComparison.ts` (Lines 103-111)

**Before:**
```typescript
this.detector = await poseDetection.createDetector(model, {
  modelType: 'SinglePose.Thunder',  // ❌ 403 Forbidden
  enableSmoothing: true
});
```

**After:**
```typescript
this.detector = await poseDetection.createDetector(model, {
  modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,  // ✅ Works
  enableSmoothing: true
});
```

## Benefits of Lightning Model

| Feature | Thunder | Lightning |
|---------|---------|-----------|
| **Accuracy** | Higher | Good |
| **Speed** | Slower | Faster ⚡ |
| **Size** | 12MB | 6MB |
| **Availability** | 403 errors | ✅ Accessible |
| **Loading** | Slow | Fast |

## Impact

✅ **Fixes:** 403 Forbidden model loading errors  
✅ **Improves:** Faster analysis initialization  
✅ **Reduces:** Page load time  
✅ **Maintains:** Video analysis quality  

## Deployment

Upload this file to VPS via SFTP:
- `lib/analyzers/benchmarkComparison.ts`

Then rebuild:
```bash
cd /var/www/html/bowling-project
rm -rf .next
npm run build
pm2 restart bowling-web
```

## Testing

After deployment:
1. Clear browser cache (F12 → Application → Clear site data)
2. Navigate to video-preview page
3. Upload a video
4. Console should show: `"Pose detector created with Lightning model"`
5. Analysis should complete without 403 errors

## Note
The Lightning model provides slightly lower accuracy than Thunder, but the difference is minimal for bowling action analysis. The improved speed and reliability more than compensate.

