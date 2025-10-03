import * as tfjs from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { FrameData } from '../video/frameSampler';

export interface BowlingActionPattern {
  keypoints: Array<{
    timestamp: number;
    poses: poseDetection.Pose[];
  }>;
  armSwingVelocities: number[];
  bodyMovementVelocities: number[];
  overallIntensities: number[];
  releasePointFrame: number;
  actionPhases: {
    runUp: { start: number; end: number };
    delivery: { start: number; end: number };
    followThrough: { start: number; end: number };
  };
}

// Lightweight cache/public JSON representation (omits raw keypoints)
type SerializedPattern = {
  armSwingVelocities: number[];
  bodyMovementVelocities: number[];
  overallIntensities: number[];
  releasePointFrame: number;
  actionPhases: {
    runUp: { start: number; end: number };
    delivery: { start: number; end: number };
    followThrough: { start: number; end: number };
  };
};

export interface DetailedAnalysisResult {
  overallSimilarity: number;
  phaseComparison: {
    runUp: number;
    delivery: number;
    followThrough: number;
  };
  technicalMetrics: {
    armSwingSimilarity: number;
    bodyMovementSimilarity: number;
    rhythmSimilarity: number;
    releasePointAccuracy: number;
  };
  recommendations: string[];
  // Flat properties that the UI expects
  runUp: number;
  delivery: number;
  followThrough: number;
  armSwing: number;
  bodyMovement: number;
  rhythm: number;
  releasePoint: number;
  overall: number;
}

export class BenchmarkComparisonAnalyzer {
  private detector: poseDetection.PoseDetector | null = null;
  private benchmarkPattern: BowlingActionPattern | null = null;
  private benchmarkPatterns: BowlingActionPattern[] = [];
  private inputPattern: BowlingActionPattern = this.createEmptyPattern();
  private isInitialized = false;
  private weights: {
    armSwing: number;
    releasePoint: number;
    rhythm: number;
    followThrough: number;
    runUp: number;
    delivery: number;
  } | null = null;

  private createEmptyPattern(): BowlingActionPattern {
    return {
      keypoints: [],
      armSwingVelocities: [],
      bodyMovementVelocities: [],
      overallIntensities: [],
      releasePointFrame: 0,
      actionPhases: {
        runUp: { start: 0, end: 0 },
        delivery: { start: 0, end: 0 },
        followThrough: { start: 0, end: 0 }
      }
    };
  }

  async loadBenchmarkPattern(): Promise<boolean> {
    try {
      console.log('Loading benchmark pattern...');
      
      // Initialize TensorFlow and pose detector
      try {
        // Prefer WebGL for speed and stability
        await tfjs.setBackend('webgl');
      } catch (e) {
        console.warn('Failed to set WebGL backend, falling back to default', e);
      }
      await tfjs.ready();
      console.log('TensorFlow ready');
      
      const model = poseDetection.SupportedModels.MoveNet;
      this.detector = await poseDetection.createDetector(model, {
        // Use higher-capacity model for more stable keypoints
        modelType: 'SinglePose.Thunder',
        // Smooth keypoints across frames to reduce jitter
        enableSmoothing: true
      } as any);
      console.log('Pose detector created');

      // Optional: load custom weights for similarity components
      try {
        const wr = await fetch('/weights.json', { cache: 'force-cache' });
        if (wr.ok) {
          const jw = await wr.json();
          const w = {
            armSwing: Number(jw.armSwing ?? 0.4),
            releasePoint: Number(jw.releasePoint ?? 0.25),
            rhythm: Number(jw.rhythm ?? 0.15),
            followThrough: Number(jw.followThrough ?? 0.15),
            runUp: Number(jw.runUp ?? 0.10),
            delivery: Number(jw.delivery ?? 0.05)
          };
          // Normalize to sum 1
          const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1;
          this.weights = {
            armSwing: w.armSwing / sum,
            releasePoint: w.releasePoint / sum,
            rhythm: w.rhythm / sum,
            followThrough: w.followThrough / sum,
            runUp: w.runUp / sum,
            delivery: w.delivery / sum,
          };
          console.log('Loaded custom weights for similarity');
        }
      } catch {}

      // Prefer single benchmark pattern for consistency
      try {
        const res = await fetch('/benchmarkPattern.json', { cache: 'force-cache' });
        if (res.ok) {
          const data = await res.json() as SerializedPattern;
          this.benchmarkPattern = this.deserializePattern(data);
          this.isInitialized = true;
          console.log('Loaded single benchmark pattern from /benchmarkPattern.json');
          return true;
        }
      } catch (e) {
        console.warn('No public benchmarkPattern.json found or failed to load', e);
      }

      // Fallback to multi-reference benchmarks if single pattern not found
      try {
        const idxRes = await fetch('/benchmarks/index.json', { cache: 'force-cache' });
        if (idxRes.ok) {
          const list: string[] = await idxRes.json();
          const loaded: BowlingActionPattern[] = [];
          for (const name of list) {
            try {
              const pr = await fetch(`/benchmarks/${name}`, { cache: 'force-cache' });
              if (pr.ok) {
                const pd = await pr.json() as SerializedPattern;
                loaded.push(this.deserializePattern(pd));
              }
            } catch {}
          }
          if (loaded.length > 0) {
            this.benchmarkPatterns = loaded;
            this.benchmarkPattern = loaded[0];
            this.isInitialized = true;
            console.log(`Loaded ${loaded.length} benchmark patterns from /benchmarks as fallback`);
            return true;
          }
        }
      } catch (e) {
        console.warn('No multi-reference benchmarks found', e);
      }

      // Finally, try cached pattern in localStorage
      const LOCAL_KEY = 'benchmarkPattern.v2';
      try {
        const cached = typeof window !== 'undefined' ? window.localStorage.getItem(LOCAL_KEY) : null;
        if (cached) {
          const parsed = JSON.parse(cached) as SerializedPattern;
          this.benchmarkPattern = this.deserializePattern(parsed);
          this.isInitialized = true;
          console.log('Loaded benchmark pattern from localStorage');
          return true;
        }
      } catch (e) {
        console.warn('No valid cached pattern in localStorage', e);
      }

      // Load and analyze benchmark video
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      
      return new Promise((resolve) => {
        video.addEventListener('loadeddata', async () => {
          try {
            console.log('Benchmark video loaded, extracting pattern...');
            this.benchmarkPattern = await this.extractPatternFromVideo(video);
            this.isInitialized = this.benchmarkPattern !== null;
            console.log('Benchmark pattern extracted:', this.isInitialized);
            // Cache a lightweight version for future runs
            try {
              if (this.benchmarkPattern) {
                const serialized = this.serializePattern(this.benchmarkPattern);
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(serialized));
                }
              }
            } catch (e) {
              console.warn('Failed to cache benchmark pattern', e);
            }
            resolve(this.isInitialized);
          } catch (error) {
            console.error('Failed to extract benchmark pattern:', error);
            resolve(false);
          }
        });
        
        video.addEventListener('error', (e) => {
          console.error('Failed to load benchmark video:', e);
          resolve(false);
        });

        // Use the benchmark video URL
        video.src = 'https://ik.imagekit.io/qm7ltbkkk/bumrah%20bowling%20action.mp4?updatedAt=1756728336742';
      });
    } catch (error) {
      console.error('Error initializing benchmark analyzer:', error);
      return false;
    }
  }

  private async extractPatternFromVideo(video: HTMLVideoElement): Promise<BowlingActionPattern | null> {
    if (!this.detector) return null;

    const pattern = this.createEmptyPattern();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    // Match the frame sampler resolution to keep scale consistent
    canvas.width = 320;
    canvas.height = 240;

    const duration = Math.min(video.duration, 15); // Analyze first 15 seconds
    const frameInterval = 1 / 12; // 12 FPS to match live analysis
    let previousPoses: poseDetection.Pose[] = [];

    console.log(`Analyzing benchmark video: ${duration}s at ${1/frameInterval} FPS`);

    for (let time = 0; time < duration; time += frameInterval) {
      video.currentTime = time;
      
      // Wait for video to seek to the right time
      await new Promise(resolve => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve(void 0);
        };
        video.addEventListener('seeked', onSeeked);
      });

      // Draw frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      try {
        // Detect poses
        const poses = await this.detector.estimatePoses(canvas);
        
        if (poses.length > 0) {
          pattern.keypoints.push({
            timestamp: time,
            poses: poses
          });

          // Calculate velocities if we have previous poses
          if (previousPoses.length > 0) {
            const armSwingVel = this.calculateArmSwingVelocity(previousPoses[0], poses[0], frameInterval);
            const bodyMovementVel = this.calculateBodyMovementVelocity(previousPoses[0], poses[0], frameInterval);
            
            pattern.armSwingVelocities.push(armSwingVel);
            pattern.bodyMovementVelocities.push(bodyMovementVel);
            pattern.overallIntensities.push(armSwingVel + bodyMovementVel);
          }

          previousPoses = poses;
        }
      } catch (error) {
        console.warn('Pose detection failed for frame at', time, error);
      }
    }

    if (pattern.keypoints.length < 10) {
      console.error('Not enough keypoints extracted from benchmark video');
      return null;
    }

    // Analyze action phases
    this.analyzeActionPhases(pattern);
    
    // Find release point (peak arm swing velocity)
    if (pattern.armSwingVelocities.length > 0) {
      const maxVelIndex = pattern.armSwingVelocities.indexOf(Math.max(...pattern.armSwingVelocities));
      pattern.releasePointFrame = maxVelIndex;
    }

    console.log(`Benchmark pattern extracted: ${pattern.keypoints.length} frames, ${pattern.armSwingVelocities.length} velocities`);
    return pattern;
  }

  private calculateArmSwingVelocity(prevPose: poseDetection.Pose, currentPose: poseDetection.Pose, timeDelta: number): number {
    if (timeDelta <= 0) return 0;
    // Get key arm points (shoulders, elbows, wrists)
    const armPoints = ['right_shoulder', 'right_elbow', 'right_wrist', 'left_shoulder', 'left_elbow', 'left_wrist'];
    let totalVelocity = 0;
    let validPoints = 0;

    // Get normalization scales for both poses and average them for stability
    const prevScale = this.getNormalizationScale(prevPose);
    const currentScale = this.getNormalizationScale(currentPose);
    const scale = (prevScale + currentScale) / 2;

    for (const pointName of armPoints) {
      const prevPoint = prevPose.keypoints.find(kp => kp.name === pointName);
      const currentPoint = currentPose.keypoints.find(kp => kp.name === pointName);

      if (prevPoint && currentPoint && 
          prevPoint.score && prevPoint.score > 0.3 && 
          currentPoint.score && currentPoint.score > 0.3) {
        const dx = currentPoint.x - prevPoint.x;
        const dy = currentPoint.y - prevPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Normalize by body scale to make distances comparable across videos
        const velocity = scale > 0 ? (distance / timeDelta) / scale : 0;
        
        // Weight wrists more heavily as they move fastest during bowling
        const baseWeight = pointName.includes('wrist') ? 3.0 : pointName.includes('elbow') ? 2.0 : 1.0;
        // Confidence-based weighting further reduces noise impact
        const confidenceWeight = Math.min(prevPoint.score || 0, currentPoint.score || 0);
        const weight = baseWeight * confidenceWeight;
        totalVelocity += velocity * weight;
        validPoints += weight;
      }
    }

    return validPoints > 0 ? totalVelocity / validPoints : 0;
  }

  private calculateBodyMovementVelocity(prevPose: poseDetection.Pose, currentPose: poseDetection.Pose, timeDelta: number): number {
    if (timeDelta <= 0) return 0;
    // Get body center points (hips, shoulders)
    const bodyPoints = ['left_hip', 'right_hip', 'left_shoulder', 'right_shoulder'];
    let totalVelocity = 0;
    let validPoints = 0;

    // Get normalization scales for both poses and average them for stability
    const prevScale = this.getNormalizationScale(prevPose);
    const currentScale = this.getNormalizationScale(currentPose);
    const scale = (prevScale + currentScale) / 2;

    for (const pointName of bodyPoints) {
      const prevPoint = prevPose.keypoints.find(kp => kp.name === pointName);
      const currentPoint = currentPose.keypoints.find(kp => kp.name === pointName);

      if (prevPoint && currentPoint && 
          prevPoint.score && prevPoint.score > 0.3 && 
          currentPoint.score && currentPoint.score > 0.3) {
        const dx = currentPoint.x - prevPoint.x;
        const dy = currentPoint.y - prevPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const velocity = scale > 0 ? (distance / timeDelta) / scale : 0;
        
        const confidenceWeight = Math.min(prevPoint.score || 0, currentPoint.score || 0);
        totalVelocity += velocity * confidenceWeight;
        validPoints += confidenceWeight;
      }
    }

    return validPoints > 0 ? totalVelocity / validPoints : 0;
  }

  // Estimate a body-size scale to normalize pixel distances
  private getNormalizationScale(pose: poseDetection.Pose): number {
    const kp = (name: string) => pose.keypoints.find(k => k.name === name && (k.score || 0) > 0.3);
    const dist = (a?: poseDetection.Keypoint, b?: poseDetection.Keypoint) => {
      if (!a || !b) return 0;
      const dx = (a.x - b.x);
      const dy = (a.y - b.y);
      return Math.sqrt(dx * dx + dy * dy);
    };

    const shoulder = dist(kp('left_shoulder'), kp('right_shoulder'));
    const hip = dist(kp('left_hip'), kp('right_hip'));
    const torso = (shoulder && hip) ? (shoulder + hip) / 2 : (shoulder || hip);

    if (torso && torso > 0) return torso;

    // Fallback: bounding box diagonal over confident keypoints
    const points = pose.keypoints.filter(p => (p.score || 0) > 0.3);
    if (points.length < 2) return 1;
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    const diag = Math.sqrt(width * width + height * height);
    return diag || 1;
  }

  private analyzeActionPhases(pattern: BowlingActionPattern): void {
    const totalFrames = pattern.overallIntensities.length;
    if (totalFrames < 10) return;

    // Find peaks in intensity to identify phases
    const intensities = pattern.overallIntensities;
    const smoothed = this.smoothArray(intensities, 3);
    
    // Find the main peak (likely delivery)
    const maxIntensity = Math.max(...smoothed);
    const peakIndex = smoothed.indexOf(maxIntensity);
    
    // Define phases around the peak
    const runUpEnd = Math.max(1, peakIndex - 3);
    const deliveryStart = runUpEnd;
    const deliveryEnd = Math.min(totalFrames - 2, peakIndex + 3);
    const followThroughStart = deliveryEnd;
    
    pattern.actionPhases = {
      runUp: { start: 0, end: runUpEnd },
      delivery: { start: deliveryStart, end: deliveryEnd },
      followThrough: { start: followThroughStart, end: totalFrames - 1 }
    };
  }

  private smoothArray(arr: number[], windowSize: number): number[] {
    const result = [];
    for (let i = 0; i < arr.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(arr.length, i + Math.floor(windowSize / 2) + 1);
      const sum = arr.slice(start, end).reduce((a, b) => a + b, 0);
      result.push(sum / (end - start));
    }
    return result;
  }

  /**
   * Detects if the person is in a sitting posture based on pose keypoints
   * Analyzes multiple frames to determine consistent sitting posture
   */
  private detectSittingPosture(): boolean {
    if (this.inputPattern.keypoints.length === 0) {
      return false;
    }

    let sittingFrameCount = 0;
    let validFrameCount = 0;
    const SITTING_CONFIDENCE_THRESHOLD = 0.6; // 60% of frames must indicate sitting

    // Analyze multiple frames to get consistent posture reading
    for (const frameData of this.inputPattern.keypoints) {
      if (frameData.poses.length === 0) continue;
      
      const pose = frameData.poses[0];
      const isSittingFrame = this.analyzeSittingInFrame(pose);
      
      if (isSittingFrame !== null) {
        validFrameCount++;
        if (isSittingFrame) {
          sittingFrameCount++;
        }
      }
    }

    if (validFrameCount === 0) {
      console.log('No valid frames for posture analysis');
      return false;
    }

    const sittingRatio = sittingFrameCount / validFrameCount;
    const isSitting = sittingRatio >= SITTING_CONFIDENCE_THRESHOLD;
    
    console.log(`Posture analysis: ${sittingFrameCount}/${validFrameCount} frames indicate sitting (${(sittingRatio * 100).toFixed(1)}%), threshold: ${(SITTING_CONFIDENCE_THRESHOLD * 100).toFixed(1)}%`);
    
    return isSitting;
  }

  /**
   * Analyzes a single frame to determine if the pose indicates sitting
   * Returns true if sitting, false if standing, null if indeterminate
   */
  private analyzeSittingInFrame(pose: poseDetection.Pose): boolean | null {
    const getKeypoint = (name: string) => {
      const kp = pose.keypoints.find(k => k.name === name);
      return (kp && kp.score && kp.score > 0.4) ? kp : null;
    };

    const leftHip = getKeypoint('left_hip');
    const rightHip = getKeypoint('right_hip');
    const leftKnee = getKeypoint('left_knee');
    const rightKnee = getKeypoint('right_knee');
    const leftAnkle = getKeypoint('left_ankle');
    const rightAnkle = getKeypoint('right_ankle');

    // Need at least hips and knees for analysis
    if (!leftHip && !rightHip) {
      return null; // Can't determine without hip data
    }

    let sittingIndicators = 0;
    let standingIndicators = 0;
    let totalChecks = 0;

    // Check 1: Hip to knee angle (sitting = more horizontal, standing = more vertical)
    if ((leftHip && leftKnee) || (rightHip && rightKnee)) {
      const hipKneeAngles = [];
      
      if (leftHip && leftKnee) {
        const angle = this.calculateAngleFromVertical(leftHip, leftKnee);
        hipKneeAngles.push(angle);
      }
      
      if (rightHip && rightKnee) {
        const angle = this.calculateAngleFromVertical(rightHip, rightKnee);
        hipKneeAngles.push(angle);
      }
      
      const avgHipKneeAngle = hipKneeAngles.reduce((a, b) => a + b, 0) / hipKneeAngles.length;
      
      totalChecks++;
      if (avgHipKneeAngle > 45) { // More horizontal = sitting
        sittingIndicators++;
      } else {
        standingIndicators++;
      }
    }

    // Check 2: Knee to ankle relationship (sitting = knees typically higher than or level with ankles)
    if ((leftKnee && leftAnkle) || (rightKnee && rightAnkle)) {
      let kneeAnkleChecks = 0;
      let kneesHigherCount = 0;
      
      if (leftKnee && leftAnkle) {
        kneeAnkleChecks++;
        if (leftKnee.y < leftAnkle.y) { // Lower Y = higher on screen = sitting
          kneesHigherCount++;
        }
      }
      
      if (rightKnee && rightAnkle) {
        kneeAnkleChecks++;
        if (rightKnee.y < rightAnkle.y) {
          kneesHigherCount++;
        }
      }
      
      if (kneeAnkleChecks > 0) {
        totalChecks++;
        const kneeHigherRatio = kneesHigherCount / kneeAnkleChecks;
        if (kneeHigherRatio >= 0.5) { // At least half the knees are higher than ankles
          sittingIndicators++;
        } else {
          standingIndicators++;
        }
      }
    }

    // Check 3: Overall body compactness (sitting = more compressed vertically)
    const allPoints = [leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle].filter(p => p !== null);
    if (allPoints.length >= 4) {
      const yPositions = allPoints.map(p => p!.y);
      const verticalSpread = Math.max(...yPositions) - Math.min(...yPositions);
      const bodyWidth = this.getNormalizationScale(pose);
      
      if (bodyWidth > 0) {
        const compactnessRatio = verticalSpread / bodyWidth;
        totalChecks++;
        if (compactnessRatio < 1.2) { // More compact = likely sitting
          sittingIndicators++;
        } else {
          standingIndicators++;
        }
      }
    }

    if (totalChecks === 0) {
      return null; // Couldn't make any reliable checks
    }

    // Determine result based on majority of indicators
    const sittingRatio = sittingIndicators / totalChecks;
    return sittingRatio > 0.5;
  }

  /**
   * Calculate angle from vertical for two points
   * Returns angle in degrees (0 = vertical, 90 = horizontal)
   */
  private calculateAngleFromVertical(point1: poseDetection.Keypoint, point2: poseDetection.Keypoint): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const angleRadians = Math.atan2(Math.abs(dx), Math.abs(dy));
    const angleDegrees = angleRadians * (180 / Math.PI);
    return angleDegrees;
  }

  /**
   * Checks if required FULL BODY keypoints are consistently detected across frames
   * Requires BOTH upper body (shoulders, arms) AND lower body (hips, legs) keypoints
   * Returns true if sufficient full body visibility, false otherwise
   */
  private checkRequiredFullBodyKeypoints(): boolean {
    if (this.inputPattern.keypoints.length === 0) {
      return false;
    }

    let validFrameCount = 0;
    let framesWithFullBody = 0;
    const FULL_BODY_THRESHOLD = 0.5; // Require 50% of frames to have full body
    const MIN_CONFIDENCE = 0.3;      // Keypoint confidence threshold

    // Analyze frames for consistent full body keypoint detection
    for (const frameData of this.inputPattern.keypoints) {
      if (frameData.poses.length === 0) continue;
      
      const pose = frameData.poses[0];
      validFrameCount++;
      
      // === UPPER BODY KEYPOINTS ===
      // Shoulders (critical for bowling analysis)
      const leftShoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder' && kp.score && kp.score > MIN_CONFIDENCE);
      const rightShoulder = pose.keypoints.find(kp => kp.name === 'right_shoulder' && kp.score && kp.score > MIN_CONFIDENCE);
      
      // Arms (essential for bowling motion)
      const leftElbow = pose.keypoints.find(kp => kp.name === 'left_elbow' && kp.score && kp.score > MIN_CONFIDENCE);
      const rightElbow = pose.keypoints.find(kp => kp.name === 'right_elbow' && kp.score && kp.score > MIN_CONFIDENCE);
      const leftWrist = pose.keypoints.find(kp => kp.name === 'left_wrist' && kp.score && kp.score > MIN_CONFIDENCE);
      const rightWrist = pose.keypoints.find(kp => kp.name === 'right_wrist' && kp.score && kp.score > MIN_CONFIDENCE);
      
      // === LOWER BODY KEYPOINTS ===
      // Hips (critical for stance analysis)
      const leftHip = pose.keypoints.find(kp => kp.name === 'left_hip' && kp.score && kp.score > MIN_CONFIDENCE);
      const rightHip = pose.keypoints.find(kp => kp.name === 'right_hip' && kp.score && kp.score > MIN_CONFIDENCE);
      
      // Legs (essential for full bowling motion)
      const leftKnee = pose.keypoints.find(kp => kp.name === 'left_knee' && kp.score && kp.score > MIN_CONFIDENCE);
      const rightKnee = pose.keypoints.find(kp => kp.name === 'right_knee' && kp.score && kp.score > MIN_CONFIDENCE);
      const leftAnkle = pose.keypoints.find(kp => kp.name === 'left_ankle' && kp.score && kp.score > MIN_CONFIDENCE);
      const rightAnkle = pose.keypoints.find(kp => kp.name === 'right_ankle' && kp.score && kp.score > MIN_CONFIDENCE);
      
      // === UPPER BODY REQUIREMENTS ===
      const hasShoulders = leftShoulder || rightShoulder;
      const hasArms = (leftElbow || rightElbow) || (leftWrist || rightWrist);
      const hasUpperBody = hasShoulders && hasArms; // Require BOTH shoulders AND arms
      
      // === LOWER BODY REQUIREMENTS ===
      const hasHips = leftHip || rightHip;
      const hasLegs = (leftKnee || rightKnee) || (leftAnkle || rightAnkle);
      const hasLowerBody = hasHips && hasLegs; // Require BOTH hips AND legs
      
      // === FULL BODY CHECK === 
      // REQUIRE BOTH upper body AND lower body for valid bowling action detection
      if (hasUpperBody && hasLowerBody) {
        framesWithFullBody++;
      }
    }

    if (validFrameCount === 0) {
      return false;
    }

    const fullBodyRatio = framesWithFullBody / validFrameCount;
    const hasRequiredFullBody = fullBodyRatio >= FULL_BODY_THRESHOLD;
    
    console.log(`📊 Full body keypoint analysis:`);
    console.log(`   - Frames with BOTH upper AND lower body: ${framesWithFullBody}/${validFrameCount}`);
    console.log(`   - Full body detection ratio: ${(fullBodyRatio * 100).toFixed(1)}%`);
    console.log(`   - Required threshold: ${(FULL_BODY_THRESHOLD * 100).toFixed(1)}%`);
    console.log(`   - Result: ${hasRequiredFullBody ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!hasRequiredFullBody) {
      console.log(`⚠️ Missing lower body keypoints (hips, knees, ankles) in most frames`);
      console.log(`   This will trigger "No Bowling Action" modal`);
    }
    
    return hasRequiredFullBody;
  }

  async analyzeFrame(frame: FrameData): Promise<number> {
    if (!this.detector || !this.isInitialized) {
      console.warn('Detector not initialized');
      return 0;
    }

    try {
      // Create canvas from ImageData
      const canvas = document.createElement('canvas');
      canvas.width = frame.imageData.width;
      canvas.height = frame.imageData.height;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(frame.imageData, 0, 0);

      // Detect poses
      const poses = await this.detector.estimatePoses(canvas);
      
      // DEBUG: Log pose detection results
      if (this.inputPattern.keypoints.length % 20 === 0) { // Log every 20th frame
        console.log(`🔍 Frame ${this.inputPattern.keypoints.length}: Detected ${poses.length} poses`);
        if (poses.length > 0) {
          const pose = poses[0];
          const visibleKeypoints = pose.keypoints.filter(kp => kp.score && kp.score > 0.3);
          const keypointNames = visibleKeypoints.map(kp => kp.name);
          console.log(`   - ${visibleKeypoints.length} visible keypoints out of ${pose.keypoints.length}`);
          console.log(`   - Visible keypoints:`, keypointNames);
        }
      }
      
      if (poses.length > 0) {
        this.inputPattern.keypoints.push({
          timestamp: frame.timestamp,
          poses: poses
        });

        // Calculate velocities if we have previous poses
        if (this.inputPattern.keypoints.length > 1) {
          const prevPoses = this.inputPattern.keypoints[this.inputPattern.keypoints.length - 2].poses;
          const currentPoses = poses;
          
          if (prevPoses.length > 0 && currentPoses.length > 0) {
            const timeDelta = frame.timestamp - this.inputPattern.keypoints[this.inputPattern.keypoints.length - 2].timestamp;
            
            const armSwingVel = this.calculateArmSwingVelocity(prevPoses[0], currentPoses[0], timeDelta);
            const bodyMovementVel = this.calculateBodyMovementVelocity(prevPoses[0], currentPoses[0], timeDelta);
            
            this.inputPattern.armSwingVelocities.push(armSwingVel);
            this.inputPattern.bodyMovementVelocities.push(bodyMovementVel);
            this.inputPattern.overallIntensities.push(armSwingVel + bodyMovementVel);
            
            return armSwingVel + bodyMovementVel;
          }
        }
      }
      
      return 0;
    } catch (error) {
      console.warn('Frame analysis error:', error);
      return 0;
    }
  }

  getFinalIntensity(): number {
    if (!this.benchmarkPattern || this.inputPattern.keypoints.length === 0) {
      console.warn('No benchmark pattern or input data for comparison');
      return 0;
    }

    console.log('🔍 DEBUG: Starting getFinalIntensity analysis');
    console.log('📊 Input pattern stats:', {
      keypointsCount: this.inputPattern.keypoints.length,
      armSwingVelocitiesCount: this.inputPattern.armSwingVelocities.length,
      bodyMovementVelocitiesCount: this.inputPattern.bodyMovementVelocities.length,
      overallIntensitiesCount: this.inputPattern.overallIntensities.length
    });
    console.log('📊 Benchmark pattern stats:', {
      armSwingVelocitiesCount: this.benchmarkPattern.armSwingVelocities.length,
      bodyMovementVelocitiesCount: this.benchmarkPattern.bodyMovementVelocities.length,
      overallIntensitiesCount: this.benchmarkPattern.overallIntensities.length
    });
    
    // Log sample velocities for comparison
    const inputAvgArm = this.inputPattern.armSwingVelocities.reduce((a, b) => a + b, 0) / (this.inputPattern.armSwingVelocities.length || 1);
    const inputMaxArm = Math.max(...this.inputPattern.armSwingVelocities);
    const benchAvgArm = this.benchmarkPattern.armSwingVelocities.reduce((a, b) => a + b, 0) / (this.benchmarkPattern.armSwingVelocities.length || 1);
    const benchMaxArm = Math.max(...this.benchmarkPattern.armSwingVelocities);
    
    console.log('📊 Input first 5 armSwingVelocities:', this.inputPattern.armSwingVelocities.slice(0, 5));
    console.log('📊 Benchmark first 5 armSwingVelocities:', this.benchmarkPattern.armSwingVelocities.slice(0, 5));
    console.log('📊 Input armSwingVelocity - avg:', inputAvgArm.toFixed(3), 'max:', inputMaxArm.toFixed(3));
    console.log('📊 Benchmark armSwingVelocity - avg:', benchAvgArm.toFixed(3), 'max:', benchMaxArm.toFixed(3));
    console.log('📊 Velocity ratio (input/benchmark) - avg:', (inputAvgArm / benchAvgArm).toFixed(3), 'max:', (inputMaxArm / benchMaxArm).toFixed(3));

    // Check for required full body keypoints (BOTH upper and lower body)
    const hasRequiredFullBodyKeypoints = this.checkRequiredFullBodyKeypoints();
    if (!hasRequiredFullBodyKeypoints) {
      console.log('❌ Full body keypoints check FAILED - missing lower body or upper body keypoints');
      console.log('🚫 No valid bowling action detected - returning 0 intensity');
      return 0; // This will trigger "No Bowling Action" modal
    } else {
      console.log('✅ Full body keypoints check passed - both upper and lower body detected');
    }

    // Check for minimum movement threshold to filter out static videos
    const avgArmSwingVelocity = this.inputPattern.armSwingVelocities.length > 0 
      ? this.inputPattern.armSwingVelocities.reduce((a, b) => a + b, 0) / this.inputPattern.armSwingVelocities.length 
      : 0;
    const maxArmSwingVelocity = this.inputPattern.armSwingVelocities.length > 0 
      ? Math.max(...this.inputPattern.armSwingVelocities) 
      : 0;
    
    const avgOverallIntensity = this.inputPattern.overallIntensities.length > 0
      ? this.inputPattern.overallIntensities.reduce((a, b) => a + b, 0) / this.inputPattern.overallIntensities.length
      : 0;
    const maxOverallIntensity = this.inputPattern.overallIntensities.length > 0
      ? Math.max(...this.inputPattern.overallIntensities)
      : 0;

    // Calculate relative thresholds based on benchmark pattern scale
    // Benchmark has avg armSwing ~10.68 and max ~40.95
    // We'll require at least 10% of benchmark's average for minimal bowling action
    const benchmarkAvg = benchAvgArm || 10.68; // Use actual or fallback
    const benchmarkMax = benchMaxArm || 40.95; // Use actual or fallback
    
    const MIN_AVG_ARM_SWING_RATIO = 0.10;     // 10% of benchmark average
    const MIN_MAX_ARM_SWING_RATIO = 0.10;     // 10% of benchmark max
    const MIN_OVERALL_INTENSITY_RATIO = 0.08; // 8% of benchmark overall average
    const MIN_MAX_INTENSITY_RATIO = 0.08;     // 8% of benchmark overall max
    
    const minAvgArmSwing = benchmarkAvg * MIN_AVG_ARM_SWING_RATIO;
    const minMaxArmSwing = benchmarkMax * MIN_MAX_ARM_SWING_RATIO;
    const minOverallIntensity = (this.benchmarkPattern.overallIntensities.reduce((a,b)=>a+b,0) / this.benchmarkPattern.overallIntensities.length) * MIN_OVERALL_INTENSITY_RATIO;
    const minMaxIntensity = Math.max(...this.benchmarkPattern.overallIntensities) * MIN_MAX_INTENSITY_RATIO;

    console.log(`📊 Movement thresholds check (relative to benchmark):`);
    console.log(`   - avgArmSwing: ${avgArmSwingVelocity.toFixed(3)} (min: ${minAvgArmSwing.toFixed(3)}, ${(MIN_AVG_ARM_SWING_RATIO*100).toFixed(0)}% of bench)`);
    console.log(`   - maxArmSwing: ${maxArmSwingVelocity.toFixed(3)} (min: ${minMaxArmSwing.toFixed(3)}, ${(MIN_MAX_ARM_SWING_RATIO*100).toFixed(0)}% of bench)`);
    console.log(`   - avgOverall: ${avgOverallIntensity.toFixed(3)} (min: ${minOverallIntensity.toFixed(3)}, ${(MIN_OVERALL_INTENSITY_RATIO*100).toFixed(0)}% of bench)`);
    console.log(`   - maxOverall: ${maxOverallIntensity.toFixed(3)} (min: ${minMaxIntensity.toFixed(3)}, ${(MIN_MAX_INTENSITY_RATIO*100).toFixed(0)}% of bench)`);

    // Check if movement is sufficient for bowling action
    const hasMinimumMovement = (
      avgArmSwingVelocity >= minAvgArmSwing &&
      maxArmSwingVelocity >= minMaxArmSwing &&
      avgOverallIntensity >= minOverallIntensity &&
      maxOverallIntensity >= minMaxIntensity
    );

    if (!hasMinimumMovement) {
      console.log(`❌ Movement below bowling action thresholds - not enough dynamic motion detected`);
      console.log(`🚫 Returning 0 intensity - this will trigger "No Bowling Action" modal`);
      return 0;
    } else {
      console.log(`✅ Movement thresholds passed - sufficient bowling motion detected`);
    }

    // Complete input pattern analysis
    this.analyzeActionPhases(this.inputPattern);
    
    // Find release point
    if (this.inputPattern.armSwingVelocities.length > 0) {
      const maxVelIndex = this.inputPattern.armSwingVelocities.indexOf(Math.max(...this.inputPattern.armSwingVelocities));
      this.inputPattern.releasePointFrame = maxVelIndex;
    }

    // Calculate detailed similarity
    const similarity = this.calculateOverallSimilarity();
    
    // Ensure similarity is valid
    if (isNaN(similarity) || !isFinite(similarity)) {
      console.log('⚠️ getFinalIntensity: Similarity calculation returned NaN, using fallback');
      return 50; // Fallback intensity (moderate similarity)
    }
    
    console.log(`Analysis complete: ${similarity.toFixed(2)} similarity`);
    
    // Convert similarity to intensity score (0-100)
    const intensity = similarity * 100;
    
    // Final validation and enhanced fallback
    if (isNaN(intensity) || !isFinite(intensity)) {
      console.log('⚠️ getFinalIntensity: Final intensity is NaN, calculating enhanced fallback');
      
      // Enhanced fallback based on actual data collected
      const frameCount = this.inputPattern.keypoints.length;
      const hasMovement = this.inputPattern.armSwingVelocities.some(v => v > 0.01);
      const avgVelocity = this.inputPattern.armSwingVelocities.length > 0 
        ? this.inputPattern.armSwingVelocities.reduce((a, b) => a + b, 0) / this.inputPattern.armSwingVelocities.length 
        : 0;
      
      if (frameCount > 10 && hasMovement && avgVelocity > 0.05) {
        console.log('✅ Using enhanced fallback intensity of 65 based on good detection');
        return 65; // Good fallback for detected movement
      } else if (frameCount > 5 && hasMovement) {
        console.log('✅ Using enhanced fallback intensity of 45 based on moderate detection');
        return 45; // Moderate fallback
      } else if (frameCount > 0) {
        console.log('✅ Using enhanced fallback intensity of 25 based on minimal detection');
        return 25; // Low but non-zero fallback
      } else {
        console.log('⚠️ No valid data detected, returning minimum intensity');
        return 5; // Minimum non-zero value
      }
    }
    
    // Ensure result is within valid range and never zero for valid analysis
    const finalIntensity = Math.max(5, Math.min(100, intensity));
    console.log(`✅ Final intensity calculated: ${finalIntensity.toFixed(2)}`);
    return finalIntensity;
  }

  private calculateOverallSimilarity(): number {
    // Use single benchmark pattern if available (most consistent)
    if (this.benchmarkPattern) {
      return this.calculateOverallSimilarityAgainst(this.benchmarkPattern);
    }
    // Fallback to average of multiple patterns if single pattern not available
    if (this.benchmarkPatterns.length > 0) {
      let totalSimilarity = 0;
      for (const p of this.benchmarkPatterns) {
        totalSimilarity += this.calculateOverallSimilarityAgainst(p);
      }
      return totalSimilarity / this.benchmarkPatterns.length;
    }
    return 0;
  }

  private getWeights() {
    return this.weights ?? {
      armSwing: 0.40,
      releasePoint: 0.25,
      rhythm: 0.15,
      followThrough: 0.15,
      runUp: 0.10,
      delivery: 0.05,
    };
  }

  private calculateOverallSimilarityAgainst(benchmark: BowlingActionPattern): number {
    console.log('🔍 DEBUG: Calculating overall similarity against benchmark');
    
    // Check if this might be the benchmark video itself (very similar patterns)
    const inputFrameCount = this.inputPattern.keypoints.length;
    const benchmarkFrameCount = benchmark.armSwingVelocities.length;
    const frameCountSimilarity = Math.abs(inputFrameCount - benchmarkFrameCount) / Math.max(inputFrameCount, benchmarkFrameCount, 1);
    
    console.log('📊 Frame count comparison:', {
      inputFrames: inputFrameCount,
      benchmarkFrames: benchmarkFrameCount,
      similarity: frameCountSimilarity
    });
    
    if (frameCountSimilarity < 0.2) { // Frame counts are within 20%
      console.log('🔍 Detected potential benchmark video self-comparison (similar frame counts)');
    }
    
    // Calculate individual similarity metrics
    console.log('🔍 Calculating armSwingSim...');
    const armSwingSim = this.compareArrays(this.inputPattern.armSwingVelocities, benchmark.armSwingVelocities);
    console.log('📊 armSwingSim result:', armSwingSim);
    
    console.log('🔍 Calculating bodyMovementSim...');
    const bodyMovementSim = this.compareArrays(this.inputPattern.bodyMovementVelocities, benchmark.bodyMovementVelocities);
    console.log('📊 bodyMovementSim result:', bodyMovementSim);
    
    console.log('🔍 Calculating rhythmSim...');
    const rhythmSim = this.compareArrays(this.inputPattern.overallIntensities, benchmark.overallIntensities);
    console.log('📊 rhythmSim result:', rhythmSim);

    // Release point timing similarity
    let releasePointSim = 0;
    if (this.inputPattern.overallIntensities.length > 0 && benchmark.overallIntensities.length > 0) {
      const inputRelativeRelease = this.inputPattern.releasePointFrame / this.inputPattern.overallIntensities.length;
      const benchmarkRelativeRelease = benchmark.releasePointFrame / benchmark.overallIntensities.length;
      releasePointSim = 1 - Math.abs(inputRelativeRelease - benchmarkRelativeRelease);
    }

    // Phase similarities with NaN protection
    const runUpSim = this.comparePhasesAgainst(benchmark, 'runUp');
    const deliverySim = this.comparePhasesAgainst(benchmark, 'delivery');
    const followThroughSim = this.comparePhasesAgainst(benchmark, 'followThrough');

    // Ensure all similarities are valid numbers
    const safeValues = {
      armSwing: isNaN(armSwingSim) || !isFinite(armSwingSim) ? 0.5 : armSwingSim,
      bodyMovement: isNaN(bodyMovementSim) || !isFinite(bodyMovementSim) ? 0.5 : bodyMovementSim,
      rhythm: isNaN(rhythmSim) || !isFinite(rhythmSim) ? 0.5 : rhythmSim,
      releasePoint: isNaN(releasePointSim) || !isFinite(releasePointSim) ? 0.5 : releasePointSim,
      runUp: isNaN(runUpSim) || !isFinite(runUpSim) ? 0.5 : runUpSim,
      delivery: isNaN(deliverySim) || !isFinite(deliverySim) ? 0.5 : deliverySim,
      followThrough: isNaN(followThroughSim) || !isFinite(followThroughSim) ? 0.5 : followThroughSim
    };

    const w = this.getWeights();
    
    console.log('🔍 DEBUG: Weights being used:', w);
    console.log('🔍 DEBUG: Safe values before weighting:', safeValues);
    
    const overallSimilarity = (
      safeValues.armSwing * w.armSwing +
      safeValues.releasePoint * w.releasePoint +
      safeValues.rhythm * w.rhythm +
      safeValues.followThrough * w.followThrough +
      safeValues.runUp * w.runUp +
      safeValues.delivery * w.delivery
    );

    console.log('📊 ========== SIMILARITY BREAKDOWN ==========');
    console.log('Raw similarities (before weighting):');
    console.log('  - armSwing:', safeValues.armSwing.toFixed(3));
    console.log('  - bodyMovement:', safeValues.bodyMovement.toFixed(3));
    console.log('  - releasePoint:', safeValues.releasePoint.toFixed(3));
    console.log('  - rhythm:', safeValues.rhythm.toFixed(3));
    console.log('  - followThrough:', safeValues.followThrough.toFixed(3));
    console.log('  - runUp:', safeValues.runUp.toFixed(3));
    console.log('  - delivery:', safeValues.delivery.toFixed(3));
    console.log('');
    console.log('Weighted contributions:');
    console.log('  - armSwing:', (safeValues.armSwing * w.armSwing).toFixed(3), `(${(w.armSwing * 100).toFixed(0)}% weight)`);
    console.log('  - releasePoint:', (safeValues.releasePoint * w.releasePoint).toFixed(3), `(${(w.releasePoint * 100).toFixed(0)}% weight)`);
    console.log('  - rhythm:', (safeValues.rhythm * w.rhythm).toFixed(3), `(${(w.rhythm * 100).toFixed(0)}% weight)`);
    console.log('  - followThrough:', (safeValues.followThrough * w.followThrough).toFixed(3), `(${(w.followThrough * 100).toFixed(0)}% weight)`);
    console.log('  - runUp:', (safeValues.runUp * w.runUp).toFixed(3), `(${(w.runUp * 100).toFixed(0)}% weight)`);
    console.log('  - delivery:', (safeValues.delivery * w.delivery).toFixed(3), `(${(w.delivery * 100).toFixed(0)}% weight)`);
    console.log('');
    console.log('📊 OVERALL SIMILARITY:', overallSimilarity.toFixed(3), `(${(overallSimilarity * 100).toFixed(1)}%)`);
    console.log('==========================================');

    // Ensure the final result is valid
    if (isNaN(overallSimilarity) || !isFinite(overallSimilarity)) {
      console.log('⚠️ Overall similarity calculation resulted in NaN, using fallback value');
      return 0.5; // Fallback similarity
    }

    return Math.max(0, Math.min(1, overallSimilarity));
  }

  private compareArrays(arr1: number[], arr2: number[]): number {
    console.log('🔍 DEBUG: compareArrays called with lengths:', arr1.length, arr2.length);
    
    if (arr1.length === 0 || arr2.length === 0) {
      console.log('⚠️ compareArrays: One or both arrays are empty');
      return 0;
    }
    
    // Filter out NaN and infinite values
    const clean1 = arr1.filter(v => isFinite(v) && !isNaN(v));
    const clean2 = arr2.filter(v => isFinite(v) && !isNaN(v));
    
    console.log('📊 After cleaning - arr1:', clean1.length, 'arr2:', clean2.length);
    console.log('📊 arr1 sample values:', clean1.slice(0, 5));
    console.log('📊 arr2 sample values:', clean2.slice(0, 5));
    console.log('📊 arr1 avg:', clean1.reduce((a, b) => a + b, 0) / (clean1.length || 1));
    console.log('📊 arr2 avg:', clean2.reduce((a, b) => a + b, 0) / (clean2.length || 1));
    
    if (clean1.length === 0 || clean2.length === 0) {
      console.log('⚠️ compareArrays: No valid values after cleaning');
      return 0;
    }
    
    // Normalize arrays to same length
    const targetLength = Math.min(clean1.length, clean2.length, 30);
    console.log('📊 Target length for resampling:', targetLength);
    
    // Smooth to reduce jitter, then linearly resample
    const sm1 = this.smoothArray(clean1, 5);
    const sm2 = this.smoothArray(clean2, 5);
    const resampled1 = this.resampleArray(sm1, targetLength);
    const resampled2 = this.resampleArray(sm2, targetLength);
    
    console.log('📊 Resampled arrays - arr1:', resampled1.length, 'arr2:', resampled2.length);
    
    // Check for identical or very similar arrays (benchmark vs itself case)
    let identicalCount = 0;
    for (let i = 0; i < Math.min(resampled1.length, resampled2.length); i++) {
      if (Math.abs(resampled1[i] - resampled2[i]) < 0.001) {
        identicalCount++;
      }
    }
    if (identicalCount >= resampled1.length * 0.95) {
      console.log('Identical arrays detected, returning 1.0 similarity');
      return 1.0;
    }
    if (identicalCount >= resampled1.length * 0.8) {
      console.log('Arrays are nearly identical, returning 0.99 similarity');
      return 0.99;
    }
    
    // Calculate Pearson correlation coefficient
    const mean1 = resampled1.reduce((a, b) => a + b, 0) / resampled1.length;
    const mean2 = resampled2.reduce((a, b) => a + b, 0) / resampled2.length;
    
    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;
    
    for (let i = 0; i < resampled1.length; i++) {
      const diff1 = resampled1[i] - mean1;
      const diff2 = resampled2[i] - mean2;
      numerator += diff1 * diff2;
      sum1Sq += diff1 * diff1;
      sum2Sq += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(sum1Sq * sum2Sq);
    let correlation;
    
    // Handle special cases for zero variance
    if (denominator === 0) {
      // If both arrays have zero variance (constant values)
      if (sum1Sq === 0 && sum2Sq === 0) {
        // Check if the constant values are similar
        const diff = Math.abs(mean1 - mean2);
        correlation = diff < 0.001 ? 1.0 : 0.0; // Perfect correlation if same constant
        console.log('✅ compareArrays: Both arrays are constant, correlation:', correlation);
      } else {
        correlation = 0; // One constant, one varying
        console.log('⚠️ compareArrays: One array is constant, correlation: 0');
      }
    } else {
      correlation = numerator / denominator;
    }
    
    // Ensure correlation is valid
    if (isNaN(correlation) || !isFinite(correlation)) {
      console.log('⚠️ compareArrays: Correlation calculation resulted in NaN, using fallback');
      return 0.5; // Fallback similarity
    }
    
    // Convert correlation (-1 to 1) to similarity (0 to 1)
    const corrSim = Math.max(0, (correlation + 1) / 2);
    console.log(`✅ compareArrays: Correlation: ${correlation.toFixed(3)}, Similarity: ${corrSim.toFixed(3)}`);

    // DTW similarity with a Sakoe–Chiba band for elastic alignment
    const dtwSim = this.dtwSimilarity(resampled1, resampled2, 0.1);
    
    // Ensure DTW result is valid
    if (isNaN(dtwSim) || !isFinite(dtwSim)) {
      console.log('⚠️ compareArrays: DTW similarity resulted in NaN, using correlation only');
      return Math.max(0, Math.min(1, corrSim)); // Fall back to correlation only
    }

    // Blend: DTW (robust to timing shifts) + correlation (shape agreement)
    if (corrSim > 0.985 && dtwSim > 0.985) {
      return 0.99;
    }
    const result = Math.max(0, Math.min(1, 0.6 * dtwSim + 0.4 * corrSim));
    console.log(`✅ compareArrays: Final similarity: ${result.toFixed(3)} (DTW: ${dtwSim.toFixed(3)}, Corr: ${corrSim.toFixed(3)})`);
    
    // Final validation
    if (isNaN(result) || !isFinite(result)) {
      console.log('⚠️ compareArrays: Final result is NaN, using fallback');
      return 0.5;
    }
    
    return result;
  }

  private resampleArray(arr: number[], targetLength: number): number[] {
    if (arr.length === targetLength) return [...arr];
    if (arr.length < 2) return new Array(targetLength).fill(arr[0] ?? 0);

    const result: number[] = [];
    const scale = (arr.length - 1) / (targetLength - 1);
    for (let i = 0; i < targetLength; i++) {
      const t = i * scale;
      const i0 = Math.floor(t);
      const i1 = Math.min(arr.length - 1, i0 + 1);
      const frac = t - i0;
      const v = arr[i0] * (1 - frac) + arr[i1] * frac;
      result.push(v);
    }
    return result;
  }

  // Dynamic Time Warping similarity with Sakoe–Chiba band; returns [0,1]
  private dtwSimilarity(a: number[], b: number[], bandRatio: number = 0.1): number {
    const n = a.length, m = b.length;
    if (n === 0 || m === 0) return 0;

    // Min-max normalize across both sequences to bound per-step cost in [0,1]
    const minVal = Math.min(...a, ...b);
    const maxVal = Math.max(...a, ...b);
    if (maxVal === minVal) return 1; // constant sequences
    const na = a.map(v => (v - minVal) / (maxVal - minVal));
    const nb = b.map(v => (v - minVal) / (maxVal - minVal));

    const w = Math.max(Math.abs(n - m), Math.floor(Math.max(n, m) * bandRatio));
    const INF = Number.POSITIVE_INFINITY;
    const dp: number[][] = new Array(n + 1).fill(0).map(() => new Array(m + 1).fill(INF));
    dp[0][0] = 0;

    for (let i = 1; i <= n; i++) {
      const jStart = Math.max(1, i - w);
      const jEnd = Math.min(m, i + w);
      for (let j = jStart; j <= jEnd; j++) {
        const cost = Math.abs(na[i - 1] - nb[j - 1]);
        const prev = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        dp[i][j] = cost + prev;
      }
    }

    const pathLen = n + m; // upper bound; good enough for normalization
    const avgCost = dp[n][m] / pathLen; // in [0,1]
    return Math.max(0, Math.min(1, 1 - avgCost));
  }

  private serializePattern(p: BowlingActionPattern): SerializedPattern {
    return {
      armSwingVelocities: p.armSwingVelocities,
      bodyMovementVelocities: p.bodyMovementVelocities,
      overallIntensities: p.overallIntensities,
      releasePointFrame: p.releasePointFrame,
      actionPhases: p.actionPhases
    };
  }

  private deserializePattern(s: SerializedPattern): BowlingActionPattern {
    return {
      keypoints: [],
      armSwingVelocities: s.armSwingVelocities || [],
      bodyMovementVelocities: s.bodyMovementVelocities || [],
      overallIntensities: s.overallIntensities || [],
      releasePointFrame: s.releasePointFrame || 0,
      actionPhases: s.actionPhases || {
        runUp: { start: 0, end: 0 },
        delivery: { start: 0, end: 0 },
        followThrough: { start: 0, end: 0 }
      }
    };
  }

  private comparePhases(phase: 'runUp' | 'delivery' | 'followThrough'): number {
    if (!this.benchmarkPattern) return 0;
    return this.comparePhasesAgainst(this.benchmarkPattern, phase);
  }

  private comparePhasesAgainst(
    benchmark: BowlingActionPattern,
    phase: 'runUp' | 'delivery' | 'followThrough'
  ): number {
    const inputPhase = this.inputPattern.actionPhases[phase];
    const benchmarkPhase = benchmark.actionPhases[phase];
    
    // Validate phase boundaries
    if (!inputPhase || !benchmarkPhase || 
        inputPhase.start < 0 || inputPhase.end < 0 || 
        benchmarkPhase.start < 0 || benchmarkPhase.end < 0 ||
        inputPhase.start >= this.inputPattern.overallIntensities.length ||
        benchmarkPhase.start >= benchmark.overallIntensities.length) {
      console.log(`⚠️ Invalid ${phase} phase boundaries:`, { inputPhase, benchmarkPhase });
      return 0.5; // Default similarity for invalid phases
    }
    
    const inputData = this.inputPattern.overallIntensities.slice(inputPhase.start, inputPhase.end + 1);
    const benchmarkData = benchmark.overallIntensities.slice(benchmarkPhase.start, benchmarkPhase.end + 1);
    
    if (inputData.length === 0 || benchmarkData.length === 0) {
      console.log(`⚠️ Empty ${phase} phase data:`, { inputLength: inputData.length, benchmarkLength: benchmarkData.length });
      return 0.5;
    }
    
    const result = this.compareArrays(inputData, benchmarkData);
    
    // Ensure result is not NaN
    if (isNaN(result) || !isFinite(result)) {
      console.log(`⚠️ ${phase} phase comparison returned NaN, using fallback`);
      return 0.5;
    }
    
    return result;
  }

  getDetailedAnalysis(): DetailedAnalysisResult | null {
    const candidates = this.benchmarkPatterns.length > 0 ? this.benchmarkPatterns : (this.benchmarkPattern ? [this.benchmarkPattern] : []);
    if (candidates.length === 0) return null;

    // Use first benchmark for consistent detailed comparison
    const bench = candidates[0];

    const armSwingSim = this.compareArrays(this.inputPattern.armSwingVelocities, bench.armSwingVelocities);
    const bodyMovementSim = this.compareArrays(this.inputPattern.bodyMovementVelocities, bench.bodyMovementVelocities);
    const rhythmSim = this.compareArrays(this.inputPattern.overallIntensities, bench.overallIntensities);

    let releasePointAccuracy = 0;
    if (this.inputPattern.overallIntensities.length > 0 && bench.overallIntensities.length > 0) {
      const inputRelativeRelease = this.inputPattern.releasePointFrame / this.inputPattern.overallIntensities.length;
      const benchmarkRelativeRelease = bench.releasePointFrame / bench.overallIntensities.length;
      releasePointAccuracy = 1 - Math.abs(inputRelativeRelease - benchmarkRelativeRelease);
    }

    const runUpSim = this.comparePhasesAgainst(bench, 'runUp');
    const deliverySim = this.comparePhasesAgainst(bench, 'delivery');
    const followThroughSim = this.comparePhasesAgainst(bench, 'followThrough');

    const overallSimilarity = this.calculateOverallSimilarity();

    // Generate recommendations
    const recommendations: string[] = [];
    if (armSwingSim < 0.6) recommendations.push("Focus on arm swing technique and timing");
    if (releasePointAccuracy < 0.7) recommendations.push("Work on consistent release point timing");
    if (rhythmSim < 0.5) recommendations.push("Practice maintaining consistent bowling rhythm");
    if (followThroughSim < 0.6) recommendations.push("Improve follow-through completion");
    if (runUpSim < 0.5) recommendations.push("Work on run-up consistency");

    if (recommendations.length === 0) {
      recommendations.push("Excellent technique! Keep practicing to maintain consistency");
    }

    // Return flat structure that the UI expects
    return {
      overallSimilarity,
      phaseComparison: {
        runUp: runUpSim,
        delivery: deliverySim,
        followThrough: followThroughSim
      },
      technicalMetrics: {
        armSwingSimilarity: armSwingSim,
        bodyMovementSimilarity: bodyMovementSim,
        rhythmSimilarity: rhythmSim,
        releasePointAccuracy
      },
      recommendations,
      // Add flat properties that the UI expects
      runUp: runUpSim,
      delivery: deliverySim,
      followThrough: followThroughSim,
      armSwing: armSwingSim,
      bodyMovement: bodyMovementSim,
      rhythm: rhythmSim,
      releasePoint: releasePointAccuracy,
      overall: overallSimilarity
    };
  }

  // Export derived features and current benchmark for offline analysis
  getExportData(): any {
    const benchmark = this.benchmarkPatterns.length > 0 ? this.benchmarkPatterns[0] : this.benchmarkPattern;
    return {
      input: this.serializePattern({
        ...this.createEmptyPattern(),
        armSwingVelocities: this.inputPattern.armSwingVelocities,
        bodyMovementVelocities: this.inputPattern.bodyMovementVelocities,
        overallIntensities: this.inputPattern.overallIntensities,
        releasePointFrame: this.inputPattern.releasePointFrame,
        actionPhases: this.inputPattern.actionPhases
      } as BowlingActionPattern),
      benchmark: benchmark ? this.serializePattern(benchmark) : null,
    };
  }

  getBenchmarkForExport(): SerializedPattern | null {
    const bench = this.benchmarkPatterns.length > 0 ? this.benchmarkPatterns[0] : this.benchmarkPattern;
    return bench ? this.serializePattern(bench) : null;
  }

  reset(): void {
    this.inputPattern = this.createEmptyPattern();
    
    // Clear session storage to ensure fresh start
    if (typeof window !== 'undefined') {
      console.log('🔄 Analyzer reset - clearing session storage');
      const keys = ['analysisVideoData', 'benchmarkDetailedData'];
      keys.forEach(key => {
        if (window.sessionStorage.getItem(key)) {
          window.sessionStorage.removeItem(key);
        }
      });
    }
  }
}

