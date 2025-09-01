import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { FrameData } from '../video/frameSampler';
import { ExponentialMovingAverage } from '../utils/ema';

export class PoseBasedAnalyzer {
  private detector: poseDetection.PoseDetector | null = null;
  private previousPose: poseDetection.Pose | null = null;
  private ema = new ExponentialMovingAverage(0.3);
  private rawIntensities: number[] = [];
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    try {
      await tf.ready();
      
      const model = poseDetection.SupportedModels.MoveNet;
      this.detector = await poseDetection.createDetector(model, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
      });
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.warn('Failed to initialize pose detection:', error);
      return false;
    }
  }

  async analyzeFrame(frame: FrameData): Promise<number> {
    if (!this.detector || !this.isInitialized) {
      return 0;
    }

    try {
      // Create canvas from ImageData for pose detection
      const canvas = document.createElement('canvas');
      canvas.width = frame.imageData.width;
      canvas.height = frame.imageData.height;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(frame.imageData, 0, 0);

      // Detect poses
      const poses = await this.detector.estimatePoses(canvas);
      
      if (poses.length === 0) {
        return this.ema.getValue();
      }

      const pose = poses[0];
      
      if (!this.previousPose) {
        this.previousPose = pose;
        return 0;
      }

      // Calculate motion intensity based on key bowling joints
      const intensity = this.calculateBowlingIntensity(this.previousPose, pose, frame.timestamp);
      this.rawIntensities.push(intensity);
      
      const smoothedIntensity = this.ema.update(intensity);
      this.previousPose = pose;
      
      return smoothedIntensity;
    } catch (error) {
      console.warn('Pose analysis error:', error);
      return this.ema.getValue();
    }
  }

  private calculateBowlingIntensity(prevPose: poseDetection.Pose, currentPose: poseDetection.Pose, timeDelta: number): number {
    // Key points for bowling analysis
    const keyPoints = [
      'right_shoulder', 'left_shoulder',
      'right_elbow', 'left_elbow',
      'right_wrist', 'left_wrist',
      'right_hip', 'left_hip'
    ];

    let totalVelocity = 0;
    let validPoints = 0;

    for (const pointName of keyPoints) {
      const prevPoint = prevPose.keypoints.find(kp => kp.name === pointName);
      const currentPoint = currentPose.keypoints.find(kp => kp.name === pointName);

      if (prevPoint && currentPoint && 
          prevPoint.score > 0.3 && currentPoint.score > 0.3) {
        
        const dx = currentPoint.x - prevPoint.x;
        const dy = currentPoint.y - prevPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const velocity = distance / Math.max(timeDelta, 0.001);
        
        // Weight arm movements more heavily for bowling
        const weight = pointName.includes('wrist') ? 2.0 : 
                      pointName.includes('elbow') ? 1.5 : 1.0;
        
        totalVelocity += velocity * weight;
        validPoints += weight;
      }
    }

    return validPoints > 0 ? totalVelocity / validPoints : 0;
  }

  getFinalIntensity(): number {
    if (this.rawIntensities.length === 0) return 0;
    
    const maxIntensity = Math.max(...this.rawIntensities);
    const avgIntensity = this.rawIntensities.reduce((a, b) => a + b, 0) / this.rawIntensities.length;
    
    return maxIntensity * 0.6 + avgIntensity * 0.4;
  }

  reset(): void {
    this.previousPose = null;
    this.ema.reset();
    this.rawIntensities = [];
  }
}