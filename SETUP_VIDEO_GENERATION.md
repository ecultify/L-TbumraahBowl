# Video Generation Setup

This guide explains how to set up the dynamic video generation feature for the Cricket Bowling Speed Meter app.

## Overview

The app now generates personalized analysis videos using the user's actual bowling analysis results. When a user completes an analysis, they can generate a custom video with their specific:
- Speed class (Slow/Fast/Zooooom)
- Similarity percentage
- Technical breakdown metrics
- Phase analysis results
- Personalized recommendations

## Installation

1. **Install the new dependencies:**
```bash
npm install
```

The following packages have been added to `devDependencies`:
- `@remotion/bundler`
- `@remotion/renderer`

## How It Works

### 1. Analysis Flow
1. User uploads/records a bowling video
2. App analyzes the video using pose detection or benchmark comparison
3. Results are displayed in the UI
4. User can click "Generate Analysis Video" button
5. Custom video is generated with their actual data
6. User can download the personalized video

### 2. Technical Implementation

**Frontend (analyze page):**
- New `generateAnalysisVideo()` function collects analysis data
- Calls `/api/generate-video` API endpoint
- Shows progress UI and download link

**Backend (API route):**
- `/app/api/generate-video/route.ts` handles video generation
- Uses Remotion CLI to render videos with dynamic props
- Stores generated videos in `public/generated-videos/`

**Remotion Integration:**
- `FirstFrame.tsx` now accepts `analysisData` props
- `SpeedMeter.tsx` is fully dynamic with needle movement
- All frames use real data instead of placeholders

### 3. File Structure
```
app/
├── analyze/page.tsx           # Updated with video generation UI
├── api/
│   └── generate-video/
│       └── route.ts          # Video generation API endpoint
public/
└── generated-videos/         # Generated videos stored here
remotion/
├── FirstFrame.tsx            # Updated to accept dynamic props  
├── SpeedMeter.tsx           # Now fully dynamic
└── Root.tsx                 # Updated with default props
```

## Usage

### Testing Video Generation

1. **Start the development server:**
```bash
npm run dev
```

2. **Test the analysis flow:**
   - Go to `/analyze`
   - Upload a video or use the benchmark video
   - Complete the analysis
   - Click "Generate Analysis Video"
   - Wait for the video to be generated
   - Download the personalized video

### Manual Video Generation (CLI)

You can also generate videos manually with custom data:

```bash
# Create a props file
echo '{"analysisData":{"intensity":45,"speedClass":"Slow","kmh":45,"similarity":45,"phases":{"runUp":30,"delivery":40,"followThrough":35},"technicalMetrics":{"armSwing":30,"bodyMovement":45,"rhythm":25,"releasePoint":40},"recommendations":["Focus on arm swing technique and timing"],"playerName":"John"}}' > props.json

# Render the video
npx @remotion/cli render remotion/index.ts first-frame output.mp4 --props=props.json
```

## Customization

### Player Name
Currently defaults to "Player". You can modify the `generateAnalysisVideo` function in `analyze/page.tsx` to:
- Ask user for their name
- Use a name from user profile
- Extract from video metadata

### Video Quality
The default settings produce high-quality MP4 videos. You can adjust in the API route:
- Resolution: Currently 1080x1920 (portrait)
- FPS: 30
- Duration: 20 seconds (600 frames)
- Codec: H.264

### Storage
Generated videos are stored in `public/generated-videos/` and served statically. For production, consider:
- AWS S3 for storage
- CloudFront for CDN
- Cleanup of old videos
- User authentication for downloads

## Troubleshooting

### Video Generation Fails
1. Check that all Remotion dependencies are installed
2. Verify Node.js version (Remotion requires Node 16+)
3. Check the API logs for specific error messages
4. Ensure `public/generated-videos/` directory exists

### Performance
- Video generation takes 30-60 seconds depending on system
- Consider implementing a queue system for multiple users
- Show appropriate loading states to users

### Development
```bash
# Preview Remotion compositions
npm run dev
# Visit /remotion to see the player

# Test CLI rendering
npx @remotion/cli render remotion/index.ts first-frame test.mp4
```

## Production Considerations

1. **File Storage**: Move to cloud storage (S3, etc.)
2. **Queue System**: Use background jobs for video generation
3. **Caching**: Cache rendered videos for common result patterns
4. **Cleanup**: Implement cleanup of old generated videos
5. **Monitoring**: Add logging and error tracking
6. **Rate Limiting**: Prevent abuse of video generation API

The implementation provides a solid foundation that can be enhanced based on your specific production requirements.
