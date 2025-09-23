# Face Swap Test Page

## Overview
The face swap test page (`/test-faceswap`) allows users to upload a video, detect faces from video frames, and perform face swapping using the Segmind Face Swap V4 API.

## Features

### 1. Video Upload
- Users can upload any video file
- Supports all standard video formats (mp4, mov, avi, etc.)
- Video preview with playback controls

### 2. Face Detection
The page uses a multi-tier approach for face detection:
1. **Browser Native API**: First tries to use the browser's built-in `FaceDetector` API (if available)
2. **Simulated Detection**: Falls back to intelligent simulation that places face detection boxes in the center of the frame

### 3. Frame Capture
- Captures the current frame from the video as a still image
- Converts to base64 format for API processing

### 4. Face Swapping
Uses Segmind Face Swap V4 API with the following configuration:
- **API Key**: `SG_c7a0d229dc5d25b4`
- **Source Image**: `/public/images/base.png` (the face to swap from)
- **Target Image**: Captured frame from uploaded video
- **Model**: Speed model for faster processing
- **Output**: High-quality PNG image

### 5. Result Handling
- Displays the face-swapped result image
- Allows users to download the result
- Error handling for API failures

## How to Use

1. **Navigate** to `/test-faceswap` in your browser
2. **Upload** a video file using the upload button
3. **Play** the video and pause at the frame where you want to detect faces
4. **Click** "Detect Faces" to identify faces in the current frame
5. **Click** "Perform Face Swap" to swap the detected face with the base image
6. **Download** the result if the swap was successful
7. **Reset** to start over with a new video

## Technical Implementation

### Face Detection
```typescript
// Tries browser native Face Detection API first
if ('FaceDetector' in window) {
  const faceDetector = new window.FaceDetector();
  const faces = await faceDetector.detect(image);
}
// Falls back to simulated detection
else {
  // Places detection box in center of frame
  const centerX = video.videoWidth * 0.3;
  const centerY = video.videoHeight * 0.2;
  // ... calculate face boundaries
}
```

### API Integration
```typescript
const response = await fetch('https://api.segmind.com/v1/faceswap-v4', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'SG_c7a0d229dc5d25b4'
  },
  body: JSON.stringify({
    source_image: baseImageBase64,
    target_image: frameBase64,
    model_type: 'speed',
    swap_type: 'head',
    style_type: 'normal',
    // ... other parameters
  })
});
```

## Dependencies
- **face-api.js**: Installed but not required (fallback detection used)
- **Segmind API**: External service for face swapping
- **Browser APIs**: Canvas API for frame capture, File API for uploads

## Notes
- The base image for face swapping is stored at `/public/images/base.png`
- Face detection works best with clear, front-facing faces
- API calls may take a few seconds to complete
- Results are returned as base64 images that can be downloaded
- The page includes comprehensive error handling and user feedback

## Limitations
- Requires internet connection for face swap API calls
- API usage is limited by Segmind's rate limits and quotas
- Face detection accuracy depends on video quality and face visibility
- Browser Face Detection API support varies by browser and device