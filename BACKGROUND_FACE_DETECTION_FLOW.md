# Background Face Detection & Torso Generation Flow

## Overview
This document explains how the background face detection and AI torso generation works in the bowling action analysis application.

---

## 🎯 User Flow with Background Processing

```mermaid
record-upload → video-preview [FACE DETECTION] → details → analyze [TORSO ON CARD]
                     ↓
                [Background Process]
                     ↓
            Face Detected → Gemini AI
                     ↓
              Torso Generated
```

---

## 📍 When & Where It Happens

### 1. **Video Preview Page** (`/video-preview`)
When the user lands on this page after uploading/recording:

✅ **Automatic Background Process Starts:**
- Face detection initializes automatically when video loads
- No user interaction required
- Runs silently in the background
- User can continue to details page immediately

---

## 🔧 Technical Implementation

### A. **Auto-Trigger Logic** (app/video-preview/page.tsx)

```typescript
// Lines 295-315
useEffect(() => {
  if (videoRef.current && videoUrl && !isFaceDetectionRunning && !hasAnalysisData) {
    const handleLoadedData = () => {
      console.log('🎯 Video loaded, auto-starting face detection...');
      setTimeout(() => {
        detectFaceAndGenerateTorso();
      }, 1000); // Wait 1 second for video to stabilize
    };

    if (video.readyState >= 2) {
      handleLoadedData(); // Video already loaded
    } else {
      video.addEventListener('loadeddata', handleLoadedData, { once: true });
    }
  }
}, [videoUrl, detectFaceAndGenerateTorso, isFaceDetectionRunning, hasAnalysisData]);
```

### B. **Face Detection & Torso Generation Process**

**Step-by-Step:**

1. **Initialize Face Detection Service**
   ```typescript
   const faceService = getFaceDetectionService();
   faceService.setVideoElement(videoRef.current);
   ```

2. **Detect Faces in Video**
   ```typescript
   const detectionResult = await faceService.detectFaces();
   // Returns: { faces: DetectedFace[], frameData: string }
   ```

3. **Crop Head from Best Frame**
   ```typescript
   const primaryFace = detectionResult.faces[0]; // Highest confidence face
   const croppedHeadImage = await faceService.cropHeadFromFrame(
     detectionResult.frameData, 
     primaryFace
   );
   ```

4. **Store Cropped Head**
   ```typescript
   storeCroppedHeadImage(croppedHeadImage); // sessionStorage
   ```

5. **Generate Torso with Gemini AI**
   ```typescript
   const geminiService = getGeminiTorsoService();
   const torsoResult = await geminiService.generateTorso({
     croppedHeadImage: croppedHeadImage,
     gender: 'auto'
   });
   ```

6. **Store Generated Torso**
   ```typescript
   storeGeneratedTorsoImage(torsoResult.imageUrl); // sessionStorage
   ```

---

## 🎨 Gemini AI Prompt Configuration

### **Updated Prompt** (lib/utils/geminiService.ts)

**Key Changes Made:**
- ✅ **No hands visible** - Image cropped at mid-chest
- ✅ **No arms visible** - Upper torso only
- ✅ **Simple upright posture** - Just chest and jersey

**Full Prompt:**
```
GENERATE AN IMAGE: Create a professional chest-level portrait photograph 
of an Indian cricket player using the EXACT face from the provided image 
without any modifications. The person should be wearing an official Indian 
cricket team blue jersey with "INDIA" text only (no other logos).

CRITICAL: Crop the generated image at mid-chest level (upper torso only). 
The image should show ONLY from the head/neck down to mid-chest. 
NO HANDS, NO ARMS, NO SHOULDERS should be visible in the final output - 
only the upper chest area with jersey visible.

REQUIREMENTS:
- Use input face EXACTLY as provided with ZERO alterations
- Indian cricket team jersey: primary blue with orange accents  
- Only "INDIA" text - NO other logos or sponsors
- Upper torso/chest portrait only (no hands, no arms visible)
- Simple upright posture showing only chest and jersey
- Chest-level cropping (head to mid-chest only, NO hands/arms)
- Gender-appropriate body proportions
- High resolution photorealistic quality
```

**Negative Prompt Enhanced:**
```
... hands_visible, arms_visible, shoulders_visible, folded_arms, 
crossed_arms, hands_in_frame, elbows_visible, forearms_visible, 
wrists_visible, fingers_visible
```

---

## 🖼️ Composite Card Integration

### **Torso Image Positioning** (components/CompositeCard.tsx)

**Updated Position:**
- **Top:** `140px` from top (was 102px)
- **Right:** `15px` from right (was 10px)
- **Between:** upperpart.png and bottompart.png
- **Z-Index:** 1.5 (layered between upper and bottom)

```typescript
{generatedTorsoImage && (
  <img
    src={generatedTorsoImage}
    alt="Generated Cricket Player Torso"
    style={{
      position: "absolute",
      top: `${140 * scale}px`,      // ← Updated
      right: `${15 * scale}px`,     // ← Updated
      width: "auto",
      height: "auto",
      maxWidth: `${150 * scale}px`,
      maxHeight: `${200 * scale}px`,
      display: "block",
      zIndex: 1.5,
      borderRadius: `${8 * scale}px`,
      objectFit: "contain"
    }}
  />
)}
```

---

## 📦 Session Storage Structure

### Keys Used:
```javascript
sessionStorage.setItem('croppedHeadImage', base64ImageData);
sessionStorage.setItem('generatedTorsoImage', base64ImageData);
```

### Data Flow:
1. **video-preview** → Detects face → Stores `croppedHeadImage`
2. **video-preview** → Generates torso → Stores `generatedTorsoImage`
3. **analyze** → CompositeCard reads `generatedTorsoImage` → Displays on card

---

## 🔄 Fallback Strategy

If Gemini AI fails, the system has a fallback composite approach:

```typescript
if (!torsoResult.success) {
  console.warn('⚠️ Gemini generation failed, using composite fallback');
  torsoResult = await geminiService.generateTorsoFallback({
    croppedHeadImage: croppedHeadImage
  });
}
```

**Fallback Creates:**
- Canvas-based composite image
- Blue jersey gradient background
- "INDIA" text overlay
- Simple jersey design with cropped head

---

## ⚡ Performance Considerations

1. **Non-Blocking:**
   - Runs in background using async/await
   - User can navigate to `/details` immediately
   - Face detection doesn't block UI

2. **Single Execution:**
   - `isFaceDetectionRunning` flag prevents duplicate runs
   - Only runs once per video session

3. **Smart Timing:**
   - Waits for video `readyState >= 2`
   - 1-second delay to let video stabilize
   - Optimal frame selection for best face quality

---

## 🧪 Testing the Flow

### Test Steps:
1. Go to `/record-upload`
2. Upload or record a bowling video
3. Click **"Continue"** to `/video-preview`
4. **Watch console logs:**
   ```
   🎯 Video loaded, auto-starting face detection...
   🎯 Starting background face detection and torso generation process...
   ✅ Face detection successful
   ✅ Head cropped successfully
   ✅ Cropped head image stored in session storage
   🎨 Starting Gemini 2.0 Flash Preview Image Generation...
   ✅ Torso generated successfully
   ✅ Generated torso image stored in session storage
   ```
5. Click **"Continue"** to `/details`
6. Fill in details and click **"Analyze Video"**
7. On `/analyze` page, check **CompositeCard** - torso should appear at position (140px top, 15px right)

---

## 📊 Success Indicators

✅ **Face Detection Successful:**
- Console logs show face detected
- `croppedHeadImage` stored in sessionStorage
- No error modals shown

✅ **Torso Generation Successful:**
- Console logs show Gemini API success
- `generatedTorsoImage` stored in sessionStorage
- Image visible on CompositeCard at correct position

✅ **Correct Positioning:**
- Torso appears 140px from top
- Torso appears 15px from right
- Torso is between upper and bottom parts
- No hands/arms visible (chest-level crop only)

---

## 🛠️ Key Files Modified

| File | Changes |
|------|---------|
| `lib/utils/geminiService.ts` | ✅ Updated prompt to remove hands/arms |
| | ✅ Enhanced negative prompt |
| `components/CompositeCard.tsx` | ✅ Updated position: top 140px, right 15px |
| `app/video-preview/page.tsx` | ✅ Already has background detection (no changes needed) |

---

## 🚨 Error Handling

The system handles various error scenarios:

1. **No Face Detected:**
   - Logs warning
   - Does not block user flow
   - Composite card renders without torso image

2. **Gemini API Failure:**
   - Falls back to composite generation
   - Logs error but continues flow

3. **Video Not Loaded:**
   - Waits for video ready state
   - Auto-retries when video loads

---

## ✨ Summary

The background face detection and torso generation is a **fully automated, non-blocking background process** that:

1. ✅ **Starts automatically** when video loads
2. ✅ **Runs silently** in the background
3. ✅ **Doesn't block user** from continuing to details
4. ✅ **Uses Gemini AI** to generate realistic cricket jersey torso
5. ✅ **Crops at chest level** (no hands/arms visible)
6. ✅ **Positions correctly** on composite card (140px top, 15px right)
7. ✅ **Has fallback strategy** if AI fails
8. ✅ **Stores in sessionStorage** for use in analyze page

The user never needs to interact with this process - it just works! 🎯
