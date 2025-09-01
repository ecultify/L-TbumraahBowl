import { FrameData } from '../video/frameSampler';
import { ExponentialMovingAverage } from '../utils/ema';

export class MockMotionAnalyzer {
  private previousFrame: ImageData | null = null;
  private ema = new ExponentialMovingAverage(0.3);
  private rawIntensities: number[] = [];

  analyzeFrame(frame: FrameData): number {
    if (!this.previousFrame) {
      this.previousFrame = frame.imageData;
      return 0;
    }

    // Calculate frame difference (simplified motion detection)
    const current = frame.imageData.data;
    const previous = this.previousFrame.data;
    let totalDifference = 0;
    let pixelCount = 0;

    // Sample every 4th pixel for performance (RGBA channels)
    for (let i = 0; i < current.length; i += 16) {
      const rDiff = Math.abs(current[i] - previous[i]);
      const gDiff = Math.abs(current[i + 1] - previous[i + 1]);
      const bDiff = Math.abs(current[i + 2] - previous[i + 2]);
      
      totalDifference += (rDiff + gDiff + bDiff) / 3;
      pixelCount++;
    }

    const avgDifference = totalDifference / pixelCount;
    this.rawIntensities.push(avgDifference);
    
    // Apply exponential moving average
    const smoothedIntensity = this.ema.update(avgDifference);
    
    // Store current frame for next comparison
    this.previousFrame = frame.imageData;
    
    return smoothedIntensity;
  }

  getFinalIntensity(): number {
    if (this.rawIntensities.length === 0) return 0;
    
    // Use max intensity with some smoothing
    const maxIntensity = Math.max(...this.rawIntensities);
    const avgIntensity = this.rawIntensities.reduce((a, b) => a + b, 0) / this.rawIntensities.length;
    
    // Weighted combination favoring peak intensity
    return maxIntensity * 0.7 + avgIntensity * 0.3;
  }

  reset(): void {
    this.previousFrame = null;
    this.ema.reset();
    this.rawIntensities = [];
  }
}