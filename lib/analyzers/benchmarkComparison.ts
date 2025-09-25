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

    const scale = this.getNormalizationScale(currentPose);

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
        const velocity = (distance / timeDelta) / (scale || 1);
        
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

    const scale = this.getNormalizationScale(currentPose);

    for (const pointName of bodyPoints) {
      const prevPoint = prevPose.keypoints.find(kp => kp.name === pointName);
      const currentPoint = currentPose.keypoints.find(kp => kp.name === pointName);

      if (prevPoint && currentPoint && 
          prevPoint.score && prevPoint.score > 0.3 && 
          currentPoint.score && currentPoint.score > 0.3) {
        const dx = currentPoint.x - prevPoint.x;
        const dy = currentPoint.y - prevPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const velocity = (distance / timeDelta) / (scale || 1);
        
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
    const FULL_BODY_THRESHOLD = 0.6; // 60% of frames must have both upper and lower body keypoints
    const MIN_CONFIDENCE = 0.4;

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
      const hasArms = (leftElbow || rightElbow) && (leftWrist || rightWrist);
      const hasUpperBody = hasShoulders && hasArms;
      
      // === LOWER BODY REQUIREMENTS ===
      const hasHips = leftHip || rightHip;
      const hasLegs = (leftKnee || rightKnee) && (leftAnkle || rightAnkle);
      const hasLowerBody = hasHips && hasLegs;
      
      // === FULL BODY CHECK ===
      if (hasUpperBody && hasLowerBody) {
        framesWithFullBody++;
      }
    }

    if (validFrameCount === 0) {
      return false;
    }

    const fullBodyRatio = framesWithFullBody / validFrameCount;
    const hasRequiredFullBody = fullBodyRatio >= FULL_BODY_THRESHOLD;
    
    console.log(`Full body keypoint analysis: ${framesWithFullBody}/${validFrameCount} frames have complete body (${(fullBodyRatio * 100).toFixed(1)}%), threshold: ${(FULL_BODY_THRESHOLD * 100).toFixed(1)}%`);
    
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

    // Check for required full body keypoints - reject videos without both upper AND lower body visibility
    const hasRequiredFullBodyKeypoints = this.checkRequiredFullBodyKeypoints();
    if (!hasRequiredFullBodyKeypoints) {
      console.log('Required full body keypoints not detected - bowling analysis requires complete body visibility');
      return 0;
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

    // Minimum thresholds for bowling action detection
    const MIN_ARM_SWING_VELOCITY = 0.5; // Adjust based on your data
    const MIN_OVERALL_INTENSITY = 1.0;
    const MIN_MAX_INTENSITY = 2.0;

    if (maxArmSwingVelocity < MIN_ARM_SWING_VELOCITY || 
        avgOverallIntensity < MIN_OVERALL_INTENSITY || 
        maxOverallIntensity < MIN_MAX_INTENSITY) {
      console.log(`Insufficient movement detected - avgArmSwing: ${avgArmSwingVelocity.toFixed(3)}, maxArmSwing: ${maxArmSwingVelocity.toFixed(3)}, avgOverall: ${avgOverallIntensity.toFixed(3)}, maxOverall: ${maxOverallIntensity.toFixed(3)}`);
      return 0; // No similarity score for static/minimal movement videos
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
    
    console.log(`Analysis complete: ${similarity.toFixed(2)} similarity`);
    
    // Convert similarity to intensity score (0-100)
    return similarity * 100;
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
    // Calculate individual similarity metrics
    const armSwingSim = this.compareArrays(this.inputPattern.armSwingVelocities, benchmark.armSwingVelocities);
    const bodyMovementSim = this.compareArrays(this.inputPattern.bodyMovementVelocities, benchmark.bodyMovementVelocities);
    const rhythmSim = this.compareArrays(this.inputPattern.overallIntensities, benchmark.overallIntensities);

    // Release point timing similarity
    let releasePointSim = 0;
    if (this.inputPattern.overallIntensities.length > 0 && benchmark.overallIntensities.length > 0) {
      const inputRelativeRelease = this.inputPattern.releasePointFrame / this.inputPattern.overallIntensities.length;
      const benchmarkRelativeRelease = benchmark.releasePointFrame / benchmark.overallIntensities.length;
      releasePointSim = 1 - Math.abs(inputRelativeRelease - benchmarkRelativeRelease);
    }

    // Phase similarities
    const runUpSim = this.comparePhasesAgainst(benchmark, 'runUp');
    const deliverySim = this.comparePhasesAgainst(benchmark, 'delivery');
    const followThroughSim = this.comparePhasesAgainst(benchmark, 'followThrough');

    const w = this.getWeights();
    const overallSimilarity = (
      armSwingSim * w.armSwing +
      releasePointSim * w.releasePoint +
      rhythmSim * w.rhythm +
      followThroughSim * w.followThrough +
      runUpSim * w.runUp +
      deliverySim * w.delivery
    );

    console.log('Similarity breakdown:', {
      armSwing: armSwingSim.toFixed(3),
      bodyMovement: bodyMovementSim.toFixed(3),
      releasePoint: releasePointSim.toFixed(3),
      rhythm: rhythmSim.toFixed(3),
      followThrough: followThroughSim.toFixed(3),
      runUp: runUpSim.toFixed(3),
      delivery: deliverySim.toFixed(3),
      overall: overallSimilarity.toFixed(3)
    });

    return Math.max(0, Math.min(1, overallSimilarity));
  }

  private compareArrays(arr1: number[], arr2: number[]): number {
    if (arr1.length === 0 || arr2.length === 0) return 0;
    
    // Normalize arrays to same length
    const targetLength = Math.min(arr1.length, arr2.length, 30);
    // Smooth to reduce jitter, then linearly resample
    const sm1 = this.smoothArray(arr1, 5);
    const sm2 = this.smoothArray(arr2, 5);
    const resampled1 = this.resampleArray(sm1, targetLength);
    const resampled2 = this.resampleArray(sm2, targetLength);
    
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
    const correlation = denominator === 0 ? 0 : (numerator / denominator);
    // Convert correlation (-1 to 1) to similarity (0 to 1)
    const corrSim = Math.max(0, (correlation + 1) / 2);

    // DTW similarity with a Sakoe–Chiba band for elastic alignment
    const dtwSim = this.dtwSimilarity(resampled1, resampled2, 0.1);

    // Blend: DTW (robust to timing shifts) + correlation (shape agreement)
    return Math.max(0, Math.min(1, 0.6 * dtwSim + 0.4 * corrSim));
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
    const inputData = this.inputPattern.overallIntensities.slice(inputPhase.start, inputPhase.end + 1);
    const benchmarkData = benchmark.overallIntensities.slice(benchmarkPhase.start, benchmarkPhase.end + 1);
    return this.compareArrays(inputData, benchmarkData);
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
