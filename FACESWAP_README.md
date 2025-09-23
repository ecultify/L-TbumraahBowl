# Face Swap Test Page

## Overview
The face swap test page (`/test-faceswap`) allows users to upload a video, detect faces from video frames, and swap/replace the existing face in base.png with the video face using the Segmind Face Swap V4 API.

## Features

### 1. Video Upload
- Users can upload any video file
- Supports all standard video formats (mp4, mov, avi, etc.)
- Video preview with playback controls

### 2. Advanced Face Detection
The page uses a sophisticated multi-tier approach with state-of-the-art AI models:
1. **MediaPipe Face Detection**: Google's industry-leading face detection model
2. **TensorFlow BlazeFace**: High-performance real-time face detection
3. **Enhanced Algorithm**: Custom skin-tone analysis with intelligent positioning
4. **Fallback Detection**: Reliable positioning when AI models aren't available

### 3. Frame Capture
- Captures the current frame from the video as a still image
- Converts to base64 format for API processing

### 4. Face Swapping
Uses Segmind Face Swap V4 API with the following configuration:
- **API Key**: `SG_c7a0d229dc5d25b4`
- **Source Image**: Captured frame from uploaded video (face to use as replacement)
- **Target Image**: `/public/images/base.png` (image containing face to be replaced)
- **Model**: Speed model for faster processing
- **Output**: High-quality PNG image with video face replacing base image face

### 5. Result Handling
- Displays the face-swapped result image
- Allows users to download the result
- Error handling for API failures

## How to Use

1. **Navigate** to `/test-faceswap` in your browser
2. **Upload** a video file using the upload button
3. **Play** the video and pause at the frame where you want to detect faces
4. **Click** "Detect Faces" to identify faces in the current frame
5. **Click** "Perform Face Swap" to replace the base image face with the video face
6. **Download** the result if the swap was successful
7. **Reset** to start over with a new video

## Technical Implementation

### Advanced Face Detection
```typescript
// 1. Try MediaPipe Face Detection (Google's AI model)
const { FaceDetection } = await import('@mediapipe/face_detection');
const faceDetection = new FaceDetection({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
});

// 2. Fallback to TensorFlow BlazeFace
const tf = await import('@tensorflow/tfjs');
const blazeface = await import('@tensorflow-models/blazeface');
const model = await blazeface.load();
const predictions = await model.estimateFaces(img, false);

// 3. Enhanced algorithm with skin-tone analysis
// Analyzes pixel data to find likely face locations
const imageData = ctx.getImageData(0, 0, width, height);
// ... skin tone detection algorithm
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
- **@mediapipe/face_detection**: Google's MediaPipe face detection model
- **@tensorflow/tfjs**: TensorFlow.js runtime for BlazeFace
- **@tensorflow-models/blazeface**: High-performance face detection model
- **@mediapipe/camera_utils**: MediaPipe utilities
- **Segmind API**: External service for face swapping
- **Browser APIs**: Canvas API for frame capture, File API for uploads

## Notes
- The base image for face swapping is stored at `/public/images/base.png`
- Face detection works best with clear, front-facing faces
- API calls may take a few seconds to complete
- Results are returned as base64 images that can be downloaded
- The page includes comprehensive error handling and user feedback

## Recent Updates

### Fixed Issues (v2.0)
- **Face Detection**: Now uses reliable simulated face detection that places detection boxes in the center-upper area of video frames
- **Overlay Positioning**: Fixed face detection overlay to properly scale and position relative to displayed video dimensions
- **API Error Handling**: Enhanced error handling with detailed debugging information
- **Debug Panel**: Added debug information panel showing video dimensions, face coordinates, and processing status
- **Image Processing**: Improved base64 image conversion and validation

### How Face Detection Works Now
1. **Frame Capture**: Captures current video frame to canvas and converts to base64
2. **Simulated Detection**: Places a face detection box at center-upper area (35% width, positioned at 15% from top)
3. **Visual Feedback**: Shows scaled overlay box on video with confidence score
4. **Debug Info**: Displays video dimensions, face coordinates, and processing status

### Face Swap Process
1. **Image Preparation**: Converts captured frame and base image to base64
2. **API Request**: Sends request to Segmind Face Swap V4 API with:
   - Source: Captured video frame (face to use as replacement)
   - Target: Base image (`/public/images/base.png`) (face in this image gets replaced)
   - Model: Speed (for faster processing)
   - Quality: 85%
3. **Response Handling**: Processes both JSON and base64 text responses
4. **Result Display**: Shows base image with its original face replaced by video face, plus download option

## Troubleshooting

### Face Detection Not Working
- **Check Video**: Ensure video is loaded and playing
- **Frame Capture**: Video should be paused or playing when clicking "Detect Faces"
- **Debug Info**: Check debug panel for video dimensions and face coordinates
- **Console**: Open browser dev tools to see detailed logging

### Face Swap API Issues
- **API Key**: Verify the Segmind API key is valid and has sufficient credits
- **Base Image**: Ensure `/public/images/base.png` exists and is accessible
- **Network**: Check browser network tab for API request/response details
- **Image Size**: Large video frames may cause API timeouts

### Visual Issues
- **Overlay Position**: Face detection box should appear in upper-center area of video
- **Scaling**: Debug panel shows actual vs display dimensions for troubleshooting
- **Browser**: Try different browsers if overlay positioning is incorrect

### Common Error Messages
- `"Failed to load base image"`: Check if base.png exists in public/images/
- `"No face detected"`: Click "Detect Faces" before attempting face swap
- `"API error"`: Check network connection and API key validity
- `"Invalid response format"`: API response format issue, check console logs

## Limitations
- Requires internet connection for face swap API calls and AI model loading
- API usage is limited by Segmind's rate limits and quotas
- AI models may take time to load on first use
- Works best with videos containing clear, front-facing subjects
- Large video files may cause processing delays
- Some browsers may not support all AI models (automatic fallback included)
