# Video Analysis Flow - Complete Documentation

## Overview
This document explains how the bowling action video analysis works and documents the restoration of the analysis functionality.

---

## Analysis Flow Against Benchmark

### 1. **Video Upload/Recording**
- User uploads or records a bowling action video
- Video is stored in sessionStorage as:
  - `uploadedVideoUrl` - Blob URL
  - `uploadedVideoData` - Base64 data (for persistence)
  - `uploadedFileName` - File name
  - `uploadedSource` - 'record' or 'upload'
  - `uploadedMimeType` - Video MIME type
  - `uploadedFileSize` - File size in bytes

### 2. **Video Preview Page** (`/video-preview`)
- Loads video from sessionStorage
- User can:
  - Preview the video
  - Retry (go back to upload)
  - **Continue** (go to details page)
- Background processes:
  - Face detection (optional, runs in background)
  - Torso generation (optional, for composite card)

### 3. **Details Page** (`/details`)
- Loads video from sessionStorage
- Displays video preview (hidden, for analysis)
- Shows DetailsCard component with form:
  - Player Name (required)
  - Phone Number (optional)
  - OTP verification (optional)
  - Consent checkbox (required)
- When user clicks **"Analyze Video"**:
  - Stores player details in sessionStorage
  - **Triggers analysis** (`startAnalysis()` function)
  - Shows AnalysisLoader with progress

### 4. **Analysis Process** (Benchmark Comparison)

#### a. Initialization
```javascript
// Initialize BenchmarkComparisonAnalyzer
const analyzer = new BenchmarkComparisonAnalyzer();
await analyzer.loadBenchmarkPattern();
```

The analyzer loads the benchmark pattern from:
1. `/benchmarkPattern.json` (primary source - Bumrah's bowling action)
2. `/benchmarks/index.json` (fallback - multiple reference patterns)
3. `localStorage` (cached pattern)

#### b. Frame Sampling
```javascript
// Sample video at 12 FPS
const frameSampler = new FrameSampler(
  videoElement,
  12, // targetFPS
  async (frame) => {
    // Process each frame
  }
);
```

**Why 12 FPS?**
- Balance between accuracy and performance
- Sufficient for capturing bowling motion
- Reduces computational load

#### c. Pose Detection (Per Frame)
- Uses **TensorFlow MoveNet** (SinglePose.Thunder model)
- Detects 17 keypoints on the body:
  - Shoulders, elbows, wrists (arm analysis)
  - Hips, knees, ankles (body movement)
  - Nose, eyes, ears (face - for sitting detection)

#### d. Motion Calculation
For each frame pair, calculates:

**Arm Swing Velocity:**
```javascript
// Distance traveled by arm keypoints / time delta
// Weighted: wrists (3x) > elbows (2x) > shoulders (1x)
armSwingVelocity = Σ(distance × weight × confidence) / Σ(weights)
```

**Body Movement Velocity:**
```javascript
// Distance traveled by body center keypoints / time delta
bodyMovementVelocity = Σ(distance × confidence) / Σ(confidence)
```

**Normalization:**
- All distances are normalized by body scale (shoulder width)
- This makes the analysis independent of video resolution and player size

#### e. Benchmark Comparison

**Similarity Metrics:**

1. **DTW (Dynamic Time Warping)** - 60% weight
   - Handles timing variations
   - Aligns sequences elastically
   - Good for comparing actions of different speeds

2. **Pearson Correlation** - 40% weight
   - Measures pattern shape similarity
   - Independent of magnitude

3. **Phase Analysis:**
   - Run-up phase
   - Delivery phase
   - Follow-through phase

**Weighted Components:**
```javascript
overallSimilarity = 
  armSwing × 0.40 +          // Most important
  releasePoint × 0.25 +      // Critical timing
  rhythm × 0.15 +            // Motion smoothness
  followThrough × 0.15 +     // Completion
  runUp × 0.10 +             // Approach
  delivery × 0.05            // Peak action
```

#### f. Safety Checks

**Full Body Detection:**
- Requires both upper body (shoulders, arms) AND lower body (hips, legs)
- Must be detected in 60%+ of frames
- Rejects videos showing only upper body (sitting/cropped)

**Sitting Posture Detection:**
- Analyzes hip-knee angle
- Checks knee-ankle relationship
- Measures body compactness
- Rejects if 60%+ frames indicate sitting

**Minimum Movement:**
- `MIN_ARM_SWING_VELOCITY = 0.5`
- `MIN_OVERALL_INTENSITY = 1.0`
- `MIN_MAX_INTENSITY = 2.0`
- Rejects static or minimal movement videos

#### g. Results Generation

**Final Similarity Score:**
- Range: 0-100%
- Stored as `finalIntensity`

**Speed Classification:**
```javascript
if (similarity < 60%) → "Slow"
else if (similarity < 85%) → "Fast"
else → "Zooooom"
```

**Detailed Analysis:**
```javascript
{
  // Phase comparisons (0-1 scale)
  runUp: 0.87,
  delivery: 0.79,
  followThrough: 0.81,
  
  // Technical metrics (0-1 scale)
  armSwing: 0.83,
  bodyMovement: 0.88,
  rhythm: 0.85,
  releasePoint: 0.89,
  
  // Overall
  overall: 0.85,
  
  // Recommendations
  recommendations: [
    "Focus on arm swing technique and timing",
    "Work on consistent release point timing"
  ]
}
```

### 5. **Data Storage**

All results are stored in sessionStorage:

**benchmarkDetailedData:**
```json
{
  "runUp": 0.87,
  "delivery": 0.79,
  "followThrough": 0.81,
  "armSwing": 0.83,
  "bodyMovement": 0.88,
  "rhythm": 0.85,
  "releasePoint": 0.89,
  "overall": 0.85,
  "recommendations": ["..."]
}
```

**analysisVideoData:**
```json
{
  "intensity": 85,
  "speedClass": "Zooooom",
  "kmh": 130,
  "similarity": 85,
  "frameIntensities": [...],
  "phases": {
    "runUp": 87,
    "delivery": 79,
    "followThrough": 81
  },
  "technicalMetrics": {
    "armSwing": 83,
    "bodyMovement": 88,
    "rhythm": 85,
    "releasePoint": 89
  },
  "recommendations": ["..."],
  "playerName": "Player",
  "createdAt": "2025-09-30T..."
}
```

**pendingLeaderboardEntry:**
```json
{
  "predicted_kmh": 130,
  "similarity_percent": 85,
  "intensity_percent": 85,
  "speed_class": "Zooooom",
  "name": "Player Name",
  "meta": {
    "analyzer_mode": "benchmark",
    "app": "bowling-analyzer"
  },
  "created_at": "2025-09-30T..."
}
```

### 6. **Navigation**
- After analysis completes, automatically navigates to `/analyze`
- Shows loading overlay with progress (0-100%)
- Transition delayed by 2 seconds to show completion

### 7. **Analyze Page** (`/analyze`)
- Loads data from sessionStorage
- Displays:
  - Composite card with player photo
  - Bowling speed (km/h and mph)
  - Accuracy score
  - Phase breakdowns (run-up, delivery, follow-through)
  - Technical metrics (arm swing, body movement, rhythm, release point)
  - Recommendations
- Actions:
  - Download Report (as PNG)
  - View Leaderboard
  - View Video (if accuracy > 85%)
  - Retry (if accuracy ≤ 85%)

---

## What Was Restored

### Previous State (DEMO MODE)
- Analysis button was replaced with "View Leaderboard" link on video-preview page
- Videos went directly to leaderboard without analysis
- Details page existed but wasn't in the flow
- `startAnalysis()` function existed in details page but was never called

### Restored Functionality

#### Video Preview Page (`app/video-preview/page.tsx`)
```tsx
// Before: Link directly to leaderboard (DEMO MODE)
<Link href="/leaderboard">View Leaderboard</Link>

// After: Continue to details page
<Link href="/details">Continue</Link>
```

#### Details Page (`app/details/page.tsx`)
```tsx
// Analysis button that triggers the full analysis process
<DetailsCard
  submitLabel={'Analyze Video'}
  onSubmit={async (payload) => {
    // Store player details
    window.sessionStorage.setItem('playerName', payload.name);
    window.sessionStorage.setItem('playerPhone', payload.phone || '');
    
    // Start analysis
    await startAnalysis();
  }}
/>
```

### Complete Flow Now Working

1. **User uploads video** → `/record-upload`
2. **User previews video** → `/video-preview`
3. **User clicks "Continue"** → `/details`
4. **User enters name/phone** → Fills DetailsCard form
5. **User clicks "Analyze Video"**
6. **Analysis runs** (TensorFlow pose detection + benchmark comparison)
7. **Progress shown** (AnalysisLoader component)
8. **Results stored** (sessionStorage)
9. **Navigate to results** → `/analyze`
10. **Display analysis** (composite card with all metrics)

---

## Testing the Flow

1. Navigate to `/record-upload`
2. Upload or record a bowling action video
3. Click "Continue" to go to `/video-preview`
4. Preview your video
5. Click "Continue" (yellow button) to go to `/details`
6. Enter your name (required)
7. Enter phone number (optional)
8. Check consent checkbox
9. Click "Analyze Video" button
10. Wait for analysis (shows progress overlay)
11. Automatically redirected to `/analyze`
12. View results and download report

---

## Technical Stack

- **Frontend:** Next.js 14 (App Router)
- **State Management:** React Context API (`AnalysisContext`)
- **ML Framework:** TensorFlow.js
- **Pose Detection:** MoveNet (SinglePose.Thunder)
- **Video Processing:** Canvas API + requestVideoFrameCallback
- **Comparison Algorithm:** DTW + Pearson Correlation
- **Storage:** sessionStorage (for analysis results)
- **UI Components:** React + Tailwind CSS

---

## Key Files

| File | Purpose |
|------|---------|
| `app/record-upload/page.tsx` | Video upload/record interface |
| `app/video-preview/page.tsx` | Video preview (before details) |
| `app/details/page.tsx` | **Details form & analysis trigger** |
| `app/analyze/page.tsx` | Results display |
| `components/DetailsCard.tsx` | Player details form component |
| `lib/analyzers/benchmarkComparison.ts` | Main analysis logic |
| `lib/video/frameSampler.ts` | Frame extraction |
| `lib/utils/normalize.ts` | Speed classification |
| `context/AnalysisContext.tsx` | State management |
| `components/AnalysisLoader.tsx` | Progress indicator |
| `components/CompositeCard.tsx` | Results visualization |

---

## Notes

- Analysis runs entirely in the browser (client-side)
- No server required for pose detection
- Benchmark pattern can be updated by replacing `/public/benchmarkPattern.json`
- All analysis data persists in sessionStorage across page navigations
- Face detection and torso generation run in background (separate from analysis)

---

## Date Restored
September 30, 2025
