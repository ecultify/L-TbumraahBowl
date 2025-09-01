export interface FrameData {
  imageData: ImageData;
  timestamp: number;
}

export class FrameSampler {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private targetFPS: number;
  private onFrame: (frame: FrameData) => void;
  private isRunning: boolean = false;
  private animationId: number | null = null;

  constructor(
    video: HTMLVideoElement, 
    targetFPS: number = 12,
    onFrame: (frame: FrameData) => void
  ) {
    this.video = video;
    this.targetFPS = targetFPS;
    this.onFrame = onFrame;
    
    // Create offscreen canvas for frame processing
    this.canvas = document.createElement('canvas');
    this.canvas.width = 320; // Downscale for performance
    this.canvas.height = 240;
    this.ctx = this.canvas.getContext('2d')!;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    
    const targetInterval = 1000 / this.targetFPS;
    let lastFrameTime = 0;

    const processFrame = (currentTime: number) => {
      if (!this.isRunning) return;

      if (currentTime - lastFrameTime >= targetInterval) {
        this.captureFrame();
        lastFrameTime = currentTime;
      }

      this.animationId = requestAnimationFrame(processFrame);
    };

    this.animationId = requestAnimationFrame(processFrame);
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private captureFrame(): void {
    if (this.video.readyState >= 2) {
      // Draw video frame to canvas
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      
      // Get image data
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      
      this.onFrame({
        imageData,
        timestamp: this.video.currentTime
      });
    }
  }
}