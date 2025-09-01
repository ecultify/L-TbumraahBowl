import * as tf from '@tensorflow/tfjs';
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
}

export class BenchmarkComparisonAnalyzer {
  private detector: poseDetection.PoseDetector | null = null;
  private benchmarkPattern: BowlingActionPattern | null = null;
  private inputPattern: BowlingActionPattern = this.createEmptyPattern();
  private isInitialized = false;

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
      await tf.ready();
      console.log('TensorFlow ready');
      
      const model = poseDetection.SupportedModels.MoveNet;
      this.detector = await poseDetection.createDetector(model, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
      });
      console.log('Pose detector created');

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
    canvas.width = 640;
    canvas.height = 480;

    const duration = Math.min(video.duration, 15); // Analyze first 15 seconds
    const frameInterval = 1 / 10; // 10 FPS for benchmark analysis
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
    // Get key arm points (shoulders, elbows, wrists)
    const armPoints = ['right_shoulder', 'right_elbow', 'right_wrist', 'left_shoulder', 'left_elbow', 'left_wrist'];
    let totalVelocity = 0;
    let validPoints = 0;

    for (const pointName of armPoints) {
      const prevPoint = prevPose.keypoints.find(kp => kp.name === pointName);
      const currentPoint = currentPose.keypoints.find(kp => kp.name === pointName);

      if (prevPoint && currentPoint && 
          prevPoint.score && prevPoint.score > 0.3 && 
          currentPoint.score && currentPoint.score > 0.3) {
        const dx = currentPoint.x - prevPoint.x;
        const dy = currentPoint.y - prevPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const velocity = distance / timeDelta;
        
        // Weight wrists more heavily as they move fastest during bowling
        const weight = pointName.includes('wrist') ? 3.0 : pointName.includes('elbow') ? 2.0 : 1.0;
        totalVelocity += velocity * weight;
        validPoints += weight;
      }
    }

    return validPoints > 0 ? totalVelocity / validPoints : 0;
  }

  private calculateBodyMovementVelocity(prevPose: poseDetection.Pose, currentPose: poseDetection.Pose, timeDelta: number): number {
    // Get body center points (hips, shoulders)
    const bodyPoints = ['left_hip', 'right_hip', 'left_shoulder', 'right_shoulder'];
    let totalVelocity = 0;
    let validPoints = 0;

    for (const pointName of bodyPoints) {
      const prevPoint = prevPose.keypoints.find(kp => kp.name === pointName);
      const currentPoint = currentPose.keypoints.find(kp => kp.name === pointName);

      if (prevPoint && currentPoint && 
          prevPoint.score && prevPoint.score > 0.3 && 
          currentPoint.score && currentPoint.score > 0.3) {
        const dx = currentPoint.x - prevPoint.x;
        const dy = currentPoint.y - prevPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const velocity = distance / timeDelta;
        
        totalVelocity += velocity;
        validPoints++;
      }
    }

    return validPoints > 0 ? totalVelocity / validPoints : 0;
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
    if (!this.benchmarkPattern) return 0;

    // Calculate individual similarity metrics
    const armSwingSim = this.compareArrays(this.inputPattern.armSwingVelocities, this.benchmarkPattern.armSwingVelocities);
    const bodyMovementSim = this.compareArrays(this.inputPattern.bodyMovementVelocities, this.benchmarkPattern.bodyMovementVelocities);
    const rhythmSim = this.compareArrays(this.inputPattern.overallIntensities, this.benchmarkPattern.overallIntensities);
    
    // Release point timing similarity
    let releasePointSim = 0;
    if (this.inputPattern.overallIntensities.length > 0 && this.benchmarkPattern.overallIntensities.length > 0) {
      const inputRelativeRelease = this.inputPattern.releasePointFrame / this.inputPattern.overallIntensities.length;
      const benchmarkRelativeRelease = this.benchmarkPattern.releasePointFrame / this.benchmarkPattern.overallIntensities.length;
      releasePointSim = 1 - Math.abs(inputRelativeRelease - benchmarkRelativeRelease);
    }

    // Phase similarities
    const runUpSim = this.comparePhases('runUp');
    const deliverySim = this.comparePhases('delivery');
    const followThroughSim = this.comparePhases('followThrough');

    // Weighted combination (as specified)
    const overallSimilarity = (
      armSwingSim * 0.40 +           // Arm swing: 40%
      releasePointSim * 0.25 +       // Release point: 25%
      rhythmSim * 0.15 +             // Overall rhythm: 15%
      followThroughSim * 0.15 +      // Follow-through: 15%
      runUpSim * 0.10 +              // Run-up: 10%
      deliverySim * 0.05             // Delivery phase: 5%
    );

    console.log('Similarity breakdown:', {
      armSwing: armSwingSim.toFixed(3),
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
    const resampled1 = this.resampleArray(arr1, targetLength);
    const resampled2 = this.resampleArray(arr2, targetLength);
    
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
    if (denominator === 0) return 0;
    
    const correlation = numerator / denominator;
    
    // Convert correlation (-1 to 1) to similarity (0 to 1)
    return Math.max(0, (correlation + 1) / 2);
  }

  private resampleArray(arr: number[], targetLength: number): number[] {
    if (arr.length <= targetLength) return [...arr];
    
    const result: number[] = [];
    const step = arr.length / targetLength;
    
    for (let i = 0; i < targetLength; i++) {
      const index = Math.floor(i * step);
      result.push(arr[index]);
    }
    
    return result;
  }

  private comparePhases(phase: 'runUp' | 'delivery' | 'followThrough'): number {
    if (!this.benchmarkPattern) return 0;
    
    const inputPhase = this.inputPattern.actionPhases[phase];
    const benchmarkPhase = this.benchmarkPattern.actionPhases[phase];
    
    const inputData = this.inputPattern.overallIntensities.slice(inputPhase.start, inputPhase.end + 1);
    const benchmarkData = this.benchmarkPattern.overallIntensities.slice(benchmarkPhase.start, benchmarkPhase.end + 1);
    
    return this.compareArrays(inputData, benchmarkData);
  }

  getDetailedAnalysis(): DetailedAnalysisResult | null {
    if (!this.benchmarkPattern) return null;

    const armSwingSim = this.compareArrays(this.inputPattern.armSwingVelocities, this.benchmarkPattern.armSwingVelocities);
    const bodyMovementSim = this.compareArrays(this.inputPattern.bodyMovementVelocities, this.benchmarkPattern.bodyMovementVelocities);
    const rhythmSim = this.compareArrays(this.inputPattern.overallIntensities, this.benchmarkPattern.overallIntensities);
    
    let releasePointAccuracy = 0;
    if (this.inputPattern.overallIntensities.length > 0 && this.benchmarkPattern.overallIntensities.length > 0) {
      const inputRelativeRelease = this.inputPattern.releasePointFrame / this.inputPattern.overallIntensities.length;
      const benchmarkRelativeRelease = this.benchmarkPattern.releasePointFrame / this.benchmarkPattern.overallIntensities.length;
      releasePointAccuracy = 1 - Math.abs(inputRelativeRelease - benchmarkRelativeRelease);
    }

    const runUpSim = this.comparePhases('runUp');
    const deliverySim = this.comparePhases('delivery');
    const followThroughSim = this.comparePhases('followThrough');

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
      recommendations
    };
  }

  reset(): void {
    this.inputPattern = this.createEmptyPattern();
  }
}