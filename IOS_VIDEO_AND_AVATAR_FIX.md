# iOS Video & Avatar Download Fix

## Issues Fixed

### Issue 1: Default Avatar Missing in Downloaded Composite Card
**Problem:** When Gemini-generated image was not available, the default avatar (`defaultavatar.png`) was showing in the UI but NOT in the downloaded report card.

**Root Cause:** The download function (`downloadCompositeCard.ts`) didn't have logic to load and render the default avatar when the Gemini image was missing.

**Solution:** Enhanced `downloadCompositeCard.ts` to:
1. Load `defaultavatar.png` alongside other images
2. Track whether to use default avatar with `useDefaultAvatar` flag
3. Render default avatar at correct size (300px) and position when Gemini image is missing
4. Only use Gemini image when it exists and loads successfully

**Changes Made:**
```typescript
// Load default avatar
const [upper, bottom, vector, defaultAvatar] = await Promise.all([
  loadImg('/frontend-images/homepage/upperpart.png'),
  loadImg('/frontend-images/homepage/bottompart.png'),
  loadImg('/images/Vector 8.svg'),
  loadImg('/images/defaultavatar.png') // NEW
]);

// Smart fallback logic
let torso: HTMLImageElement | null = null;
let useDefaultAvatar = false;
if (torsoSrc) {
  try { 
    torso = await loadImg(torsoSrc);
  } catch (e) { 
    useDefaultAvatar = true; // Fallback
  }
} else {
  useDefaultAvatar = true; // No Gemini image
}

// Render appropriate avatar
if (torso && !useDefaultAvatar) {
  // Draw Gemini torso (285px)
} else if (useDefaultAvatar) {
  // Draw default avatar (300px) ✅
}
```

### Issue 2: iOS Video Black Screen (No First Frame Display)
**Problem:** On iOS devices, uploaded videos showed a black screen until the user manually played the video. This prevented face detection and Gemini image generation.

**Root Cause:** iOS Safari requires explicit actions to load and display video frames:
1. `playsInline` attribute required for inline playback
2. Explicit `video.load()` call needed
3. Must seek to a frame position to trigger frame rendering

**Solution:** Enhanced `app/video-preview/page.tsx` with iOS-specific video handling:

#### Video Element Enhancements:
```jsx
<video
  ref={videoRef}
  src={videoUrl}
  controls
  preload="metadata"
  playsInline              // ✅ Required for iOS inline playback
  muted={false}            // ✅ Explicit muted state
  crossOrigin="anonymous"  // ✅ For CORS if needed
  onLoadedMetadata={handleVideoLoadedMetadata}
  onError={handleVideoError}
>
```

#### Force First Frame Loading (iOS):
```typescript
useEffect(() => {
  if (videoRef.current && videoUrl) {
    const video = videoRef.current;
    
    const forceLoadFirstFrame = async () => {
      // 1. Force reload
      video.load();
      
      // 2. Wait for metadata
      if (video.readyState < 1) {
        await new Promise((resolve) => {
          video.addEventListener('loadedmetadata', handler);
          setTimeout(() => resolve(null), 3000);
        });
      }
      
      // 3. Seek to 0.1s to force frame display
      video.currentTime = 0.1;
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      // 4. Reset to start
      video.currentTime = 0;
    };
    
    forceLoadFirstFrame();
  }
}, [videoUrl]);
```

#### Extended Face Detection Delay:
```typescript
// Increased delay from 1000ms to 1500ms for iOS
setTimeout(() => {
  detectFaceAndGenerateTorso();
}, 1500);
```

## Why These Fixes Are Needed

### iOS Video Behavior:
1. **Power Saving:** iOS aggressively optimizes battery by not loading video frames until necessary
2. **User Gesture Required:** Many video operations require user interaction
3. **Autoplay Restrictions:** Videos won't autoplay without muted + playsInline
4. **Frame Rendering:** First frame won't render without explicit seek operation

### Default Avatar in Download:
1. **Canvas Rendering:** Browser canvas needs explicit image loading
2. **Async Loading:** Must wait for image to load before drawing
3. **Fallback Logic:** Need graceful degradation when Gemini fails
4. **Size Consistency:** Default avatar (300px) vs Gemini torso (285px)

## Expected Behavior After Fix

### iOS Video Loading:
```
📱 Forcing video to load first frame for iOS compatibility...
✅ First frame loaded (readyState: 4)
🎯 Video loaded, auto-starting background face detection...
✅ Face detection successful
✅ Gemini torso generated
```

### Download with Default Avatar:
```
ℹ️ No Gemini image found, using default avatar
🎨 Drew default avatar at x: 31 size: 300
✅ Download complete
```

### Download with Gemini Image:
```
✅ Loaded Gemini generated torso image for download
🎨 Drew Gemini torso at x: 46 size: 285
✅ Download complete
```

## Testing Checklist

### iOS Video:
- [ ] Upload video on iPhone - first frame should display immediately
- [ ] Video should NOT be black before playing
- [ ] Face detection should run automatically after upload
- [ ] Gemini torso should generate successfully

### Default Avatar Download:
- [ ] When Gemini image is missing → Download shows default avatar ✅
- [ ] When Gemini image exists → Download shows Gemini torso ✅
- [ ] Avatar position matches UI display ✅
- [ ] Avatar size is correct (300px default, 285px Gemini) ✅

### Android (Should Still Work):
- [ ] Video displays first frame without playing
- [ ] Face detection works
- [ ] Download works with both avatar types

## Files Modified

1. **lib/utils/downloadCompositeCard.ts**
   - Added default avatar loading
   - Added `useDefaultAvatar` flag logic
   - Added conditional rendering for both avatar types
   - Updated positioning to match CompositeCard.tsx (-15px offset)

2. **app/video-preview/page.tsx**
   - Added `playsInline` attribute to video element
   - Added `muted={false}` and `crossOrigin` attributes
   - Added new useEffect to force first frame load on iOS
   - Increased face detection delay from 1000ms to 1500ms

## Technical Notes

### iOS Video ReadyState:
- `0` = HAVE_NOTHING
- `1` = HAVE_METADATA ← iOS often stops here
- `2` = HAVE_CURRENT_DATA ← Need this for frame display
- `3` = HAVE_FUTURE_DATA
- `4` = HAVE_ENOUGH_DATA

### Avatar Positioning:
- Default avatar: 300px x 300px at offset -15px
- Gemini torso: 285px x 285px at offset -15px (slightly smaller)
- Both positioned at top: 105px from container top
- Drop shadow on Gemini torso for separation from background

### Why Seek to 0.1s Works:
iOS Safari's video renderer only activates when:
1. Video is played (requires user gesture)
2. OR video is seeked to a specific time
3. Seeking to 0.1s triggers frame loading without playing
4. Then we can reset to 0 for actual playback

