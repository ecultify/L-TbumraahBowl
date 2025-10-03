# Video Analysis Timeout Fix

## Problem Summary
Video analysis was failing with only 1 frame being captured out of 48 expected frames. The video would timeout and jump to the end immediately without processing.

## Root Cause
The blob URL video wasn't loading properly before analysis started, causing:
- `readyState` = undefined at timeout
- Video jumping to end without frame processing
- Only 1 frame captured: `🔍 Frame 0: Detected 1 poses` instead of 48 frames
- Result: 0% similarity → "No Bowling Action" modal triggered incorrectly

## Fixes Applied

### 1. **Enhanced Video Loading** (`app/details/page.tsx`)

#### Before:
- 15 second timeout
- Only `canplaythrough` and `canplay` events
- No explicit `video.load()` call
- Timeout would proceed with analysis even if video wasn't ready

#### After:
- **30 second timeout** (doubled for large videos)
- **Added `loadeddata` event** - triggers when metadata + first frame loaded
- **Explicit `video.load()` call** - forces video to start loading
- **Added error event handler** - catches loading errors
- **Proper cleanup logic** - prevents duplicate event firing
- **Smart timeout behavior**:
  - If `readyState < 2` after 30s → **Stop and alert user**
  - If `readyState >= 2` → **Proceed with analysis**

### 2. **Fixed Modal Centering** (`components/NoBowlingActionModal.tsx`)

#### Before:
```jsx
<AlertDialogContent 
  className="sm:max-w-md..."
  style={{ ...other styles }}
>
```

#### After:
```jsx
<AlertDialogContent 
  className="sm:max-w-md..."
  style={{
    ...other styles,
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  }}
>
```

## Expected Behavior After Fix

### Successful Video Analysis:
```
✅ Video has enough data to play (readyState: 4)
🔄 Blob URL detected, adding stabilization delay...
▶️ Starting video playback NOW...
✅ Frame sampler started
🔍 Frame 0: Detected 1 poses
🔍 Frame 20: Detected 1 poses
🔍 Frame 40: Detected 1 poses
... (all 48 frames processed)
📊 Input armSwingVelocity - avg: 5.234 max: 18.456
✅ Movement thresholds passed
📊 OVERALL SIMILARITY: 0.652 (65.2%)
```

### Failed Video Load:
```
⏳ Waiting for video to be fully loaded (readyState: 0)...
📥 Explicitly called video.load()
⚠️ Video load timeout after 30s (readyState: 1)
❌ Video failed to load - readyState still too low. Cannot analyze.
[Alert shown to user: "Failed to load video. Please try uploading again."]
```

## Video ReadyState Reference
- `0` = HAVE_NOTHING - No information
- `1` = HAVE_METADATA - Metadata loaded, but no frame data yet
- `2` = HAVE_CURRENT_DATA - Data for current playback position loaded
- `3` = HAVE_FUTURE_DATA - Data for current + future positions loaded
- `4` = HAVE_ENOUGH_DATA - Enough data to play through without buffering

## Testing Recommendations

1. **Test with various video sizes:**
   - Small (< 5MB) - should load in 2-3 seconds
   - Medium (5-20MB) - should load in 5-10 seconds
   - Large (> 20MB) - may take up to 30 seconds

2. **Test different video formats:**
   - MP4 (most common)
   - MOV (iPhone videos)
   - WebM
   - OGG

3. **Test different network conditions:**
   - Fast WiFi - immediate loading
   - Slow connection - gradual loading with progress
   - Localhost blob URLs - stabilization delay applied

4. **Expected frame processing:**
   - 4 second video @ 12 FPS = 48 frames
   - Should see multiple `🔍 Frame X` logs
   - Should see velocity calculations for each frame pair
   - Final intensity should be > 0 for valid bowling actions

## SessionStorage Quota Warning
The warning `⚠️ SessionStorage quota exceeded` is expected for large videos and is handled gracefully:
- System falls back to file reference method
- Uses `window.tempVideoFile` for persistence
- Creates fresh blob URL when needed
- Analysis works correctly despite the warning

