# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a Cricket Bowling Speed Meter application built with Next.js 13. It's an AI-powered web application that analyzes cricket bowling actions through computer vision to estimate bowling intensity and classify bowlers as "Slow", "Fast", or "Zooooom". The app uses TensorFlow.js and pose detection to analyze video frames either from camera recording or uploaded videos.

## Development Commands

### Core Development
- `npm run dev` - Start development server (Next.js dev mode)
- `npm run build` - Build the application for production (static export)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint on the codebase

### Video Generation
- `npm run render:first` - Generate sample first frame using Remotion (creates `public/sample-first-frame.mp4`)

### Production Build Notes
- The app is configured for static export (`output: 'export'` in next.config.js)
- Images are unoptimized for static hosting
- ESLint is ignored during builds

## Architecture & Key Components

### Core Analysis System
The application centers around two main analysis approaches:

**BenchmarkComparisonAnalyzer** (`lib/analyzers/benchmarkComparison.ts`):
- Advanced pattern matching against reference bowling actions
- Loads benchmark patterns from `/benchmarks/index.json` (preferred) or `/benchmarkPattern.json`
- Caches patterns in localStorage (`benchmarkPattern.v2`)
- Provides detailed analysis including phase comparisons and technical metrics
- Uses weighted similarity scoring for arm swing, release point, rhythm, etc.

**PoseBasedAnalyzer** (`lib/analyzers/poseBased.ts`):
- Real-time pose detection using MoveNet model
- Focuses on key bowling joints (shoulders, elbows, wrists, hips)
- Uses exponential moving average for smoothing
- Weights arm movements more heavily (wrists: 2.0x, elbows: 1.5x)

### State Management
**AnalysisContext** (`context/AnalysisContext.tsx`):
- React Context for managing analysis state across components
- Handles video processing, progress tracking, and results
- Supports two analyzer modes: 'pose' and 'benchmark'
- Manages frame intensities and final speed classifications

### Video Processing
**FrameSampler** (`lib/video/frameSampler.ts`):
- Extracts frames from video sources for analysis
- Handles both camera streams and uploaded video files
- Provides frame timestamps and ImageData for pose detection

### UI Architecture
- **Next.js 13 App Router**: Routes in `app/` directory
- **Tailwind CSS + shadcn/ui**: Component styling with custom design system
- **Radix UI**: Accessible UI primitives throughout
- **Remotion Integration**: Video rendering capabilities for animations

### Database Integration
- **Supabase**: Used for leaderboard functionality
- Client configured in `lib/supabase/client.ts`
- Database schema in `supabase/leaderboard.sql`

## Key Directories Structure

```
app/                    # Next.js 13 app router pages
├── analyze/           # Main analysis page
├── about/             # About page
├── remotion/          # Remotion video demo page
└── speedometer-demo/  # Speed meter demo

components/            # React components
├── ui/               # shadcn/ui components (cards, buttons, etc.)
└── [feature components]

lib/                   # Core business logic
├── analyzers/        # AI analysis engines
├── video/           # Video processing utilities
├── utils/           # Helper utilities (EMA, normalization)
└── supabase/        # Database client

remotion/             # Video rendering with Remotion
├── SpeedMeter.tsx   # Animated speed meter component
├── FirstFrame.tsx   # First frame generation
└── Root.tsx         # Remotion composition root

context/              # React Context providers
hooks/               # Custom React hooks
dataset/             # Training data or benchmarks
public/              # Static assets including benchmark patterns
```

## Development Guidelines

### AI Model Dependencies
- TensorFlow.js automatically selects backend (prefers WebGL)
- Pose detection uses MoveNet model with single pose detection
- Models are loaded lazily when analysis starts

### Performance Considerations
- Analysis runs entirely client-side (privacy-focused)
- Benchmark patterns are cached in localStorage for faster subsequent loads
- WebGL backend is preferred for TensorFlow operations
- Frame sampling optimized for real-time analysis

### Benchmark Pattern Management
- Export patterns from Analyze page → "Export Benchmark Pattern"
- Place JSON files in `public/benchmarks/` 
- Update `public/benchmarks/index.json` with filename array
- Clear `benchmarkPattern.v2` localStorage key after changes

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- Default values are provided in code for development

### Static Export Configuration
The app is configured for static hosting with specific webpack adjustments for client-side Node.js module compatibility. All Node.js modules are excluded from browser bundle with fallbacks set to false.