// Face Detection Utility for Video Processing
'use client';

export interface DetectedFace {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface OptimalFrameInfo {
  position: number;
  brightness: number;
  analysis?: {
    overallScore: number;
    brightness: number;
    contrast: number;
    sharpness: number;
    skinToneScore: number;
    headScore: number;
  };
}

export class FaceDetectionService {
  private videoRef: HTMLVideoElement | null = null;
  private canvasRef: HTMLCanvasElement | null = null;

  constructor() {
    // Create hidden canvas for processing
    if (typeof window !== 'undefined') {
      this.canvasRef = document.createElement('canvas');
      this.canvasRef.style.display = 'none';
      document.body.appendChild(this.canvasRef);
    }
  }

  // Initialize with video element
  setVideoElement(video: HTMLVideoElement) {
    this.videoRef = video;
  }

  // Enhanced preprocessing for better face detection
  private preprocessImage(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Enhance brightness and contrast for better detection
    const brightness = 20;
    const contrast = 1.2;
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply brightness and contrast
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128 + brightness));     // Red
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128 + brightness)); // Green
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128 + brightness)); // Blue
    }
    
    // Apply noise reduction using simple smoothing
    const smoothedData = new Uint8ClampedArray(data);
    const width = canvas.width;
    const height = canvas.height;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB channels only
          const idx = (y * width + x) * 4 + c;
          const sum = 
            data[((y - 1) * width + (x - 1)) * 4 + c] + data[((y - 1) * width + x) * 4 + c] + data[((y - 1) * width + (x + 1)) * 4 + c] +
            data[(y * width + (x - 1)) * 4 + c] + data[(y * width + x) * 4 + c] + data[(y * width + (x + 1)) * 4 + c] +
            data[((y + 1) * width + (x - 1)) * 4 + c] + data[((y + 1) * width + x) * 4 + c] + data[((y + 1) * width + (x + 1)) * 4 + c];
          smoothedData[idx] = sum / 9;
        }
      }
    }
    
    ctx.putImageData(new ImageData(smoothedData, width, height), 0, 0);
  }

  // Capture frame from video
  private captureFrame(withPreprocessing = true): string | null {
    if (!this.videoRef || !this.canvasRef) return null;

    const video = this.videoRef;
    const canvas = this.canvasRef;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // Apply preprocessing for better detection
    if (withPreprocessing) {
      this.preprocessImage(canvas, ctx);
    }

    return canvas.toDataURL('image/jpeg', 0.9);
  }

  // Analyze frame quality for face visibility and clarity
  private async analyzeFrameQuality(frameData: string, position: number): Promise<{
    position: number;
    frameData: string;
    brightness: number;
    contrast: number;
    sharpness: number;
    skinToneScore: number;
    headScore: number;
    overallScore: number;
  } | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Calculate quality metrics
          let totalBrightness = 0;
          let totalContrast = 0;
          let totalSharpness = 0;
          let skinPixels = 0;
          let totalPixels = 0;
          let headRegionQuality = 0;
          let headRegionPixels = 0;
          
          // Head region analysis (focus on upper-center area)
          const headRegion = {
            startX: Math.floor(canvas.width * 0.15),
            endX: Math.floor(canvas.width * 0.85),
            startY: Math.floor(canvas.height * 0.05),
            endY: Math.floor(canvas.height * 0.65)
          };
          
          for (let y = 0; y < canvas.height - 1; y++) {
            for (let x = 0; x < canvas.width - 1; x++) {
              const i = (y * canvas.width + x) * 4;
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              
              const brightness = (r + g + b) / 3;
              totalBrightness += brightness;
              
              // Contrast calculation
              const i_next = ((y * canvas.width) + (x + 1)) * 4;
              const r_next = data[i_next];
              const g_next = data[i_next + 1];
              const b_next = data[i_next + 2];
              const brightness_next = (r_next + g_next + b_next) / 3;
              const contrast = Math.abs(brightness - brightness_next);
              totalContrast += contrast;
              
              // Sharpness calculation
              if (y > 0 && x > 0) {
                const i_up = ((y - 1) * canvas.width + x) * 4;
                const i_left = (y * canvas.width + (x - 1)) * 4;
                const r_up = data[i_up];
                const r_left = data[i_left];
                const dx = r - r_left;
                const dy = r - r_up;
                const edge = Math.sqrt(dx * dx + dy * dy);
                totalSharpness += edge;
              }
              
              // Enhanced skin tone detection
              const isSkin = (
                (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) ||
                (r > 120 && g > 80 && b > 50 && r > g && g > b && (r - g) < 80) ||
                (r > 180 && g > 120 && b > 90 && Math.abs(r - g) < 50)
              );
              
              if (isSkin) skinPixels++;
              totalPixels++;
              
              // Head region specific analysis
              if (x >= headRegion.startX && x <= headRegion.endX && 
                  y >= headRegion.startY && y <= headRegion.endY) {
                const isHairLikely = (r < 100 && g < 100 && b < 100) && (r + g + b < 200);
                const headPixelQuality = brightness * (contrast / 100) * (isSkin ? 2 : isHairLikely ? 1.5 : 1);
                headRegionQuality += headPixelQuality;
                headRegionPixels++;
              }
            }
          }
          
          const pixelCount = canvas.width * canvas.height;
          const avgBrightness = totalBrightness / pixelCount;
          const avgContrast = totalContrast / pixelCount;
          const avgSharpness = totalSharpness / pixelCount;
          const skinToneRatio = skinPixels / totalPixels;
          const headRegionScore = headRegionPixels > 0 ? headRegionQuality / headRegionPixels : 0;
          
          // Scoring algorithm
          let brightnessScore = 0;
          if (avgBrightness >= 80 && avgBrightness <= 200) {
            brightnessScore = 1.0 - Math.abs(avgBrightness - 140) / 140;
          } else {
            brightnessScore = Math.max(0, 1.0 - Math.abs(avgBrightness - 140) / 200);
          }
          
          const contrastScore = Math.min(1.0, avgContrast / 30);
          const sharpnessScore = Math.min(1.0, avgSharpness / 50);
          const skinScore = Math.min(1.0, skinToneRatio * 10);
          const headScore = Math.min(1.0, headRegionScore / 200);
          
          // Weighted overall score
          const overallScore = (
            brightnessScore * 0.25 +
            contrastScore * 0.20 +
            sharpnessScore * 0.20 +
            skinScore * 0.15 +
            headScore * 0.20
          );
          
          resolve({
            position,
            frameData,
            brightness: avgBrightness,
            contrast: avgContrast,
            sharpness: avgSharpness,
            skinToneScore: skinScore,
            headScore: headScore,
            overallScore
          });
          
        } catch (error) {
          console.error('Frame analysis error:', error);
          resolve(null);
        }
      };
      
      img.onerror = () => resolve(null);
      img.src = frameData;
    });
  }

  // Find optimal frame with best lighting and clarity
  async findOptimalFrame(): Promise<{ frameData: string; position: number; brightness: number; analysis?: any } | null> {
    if (!this.videoRef) return null;

    const video = this.videoRef;
    const duration = video.duration;
    
    console.log(`Starting comprehensive video analysis (duration: ${duration.toFixed(1)}s)`);
    
    // Configuration for analysis
    const sampleInterval = Math.max(0.5, duration / 60); // Sample every 0.5s or 60 samples max
    const totalSamples = Math.floor(duration / sampleInterval);
    const startTime = Math.max(0.5, duration * 0.1); // Skip first 10%
    const endTime = Math.min(duration - 0.5, duration * 0.9); // Skip last 10%
    
    console.log(`Analyzing ${totalSamples} frames with ${sampleInterval.toFixed(1)}s intervals`);
    
    const frameAnalyses: Array<{
      position: number;
      frameData: string;
      brightness: number;
      contrast: number;
      sharpness: number;
      skinToneScore: number;
      headScore: number;
      overallScore: number;
    }> = [];
    
    let processed = 0;
    
    for (let time = startTime; time <= endTime; time += sampleInterval) {
      if (time >= duration) break;
      
      processed++;
      
      try {
        // Seek to this position
        const seeked = await new Promise<boolean>((resolve) => {
          const handleSeeked = () => {
            video.removeEventListener('seeked', handleSeeked);
            resolve(true);
          };
          
          const handleError = () => {
            video.removeEventListener('error', handleError);
            video.removeEventListener('seeked', handleSeeked);
            resolve(false);
          };
          
          video.addEventListener('seeked', handleSeeked);
          video.addEventListener('error', handleError);
          video.currentTime = time;
          
          // Timeout
          setTimeout(() => {
            video.removeEventListener('seeked', handleSeeked);
            video.removeEventListener('error', handleError);
            resolve(false);
          }, 1000);
        });
        
        if (!seeked) {
          console.log(`Failed to seek to ${time.toFixed(1)}s`);
          continue;
        }
        
        // Wait for frame to stabilize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Capture frame
        const frameData = this.captureFrame(false); // Raw frame for analysis
        if (!frameData) continue;
        
        // Analyze frame quality
        const analysis = await this.analyzeFrameQuality(frameData, time);
        if (analysis) {
          frameAnalyses.push(analysis);
          console.log(`Frame ${time.toFixed(1)}s: Score=${analysis.overallScore.toFixed(2)}`);
        }
        
      } catch (error) {
        console.log(`Analysis failed at ${time.toFixed(1)}s:`, error);
        continue;
      }
    }
    
    if (frameAnalyses.length === 0) {
      console.log('No valid frames found during analysis');
      return null;
    }
    
    // Sort by overall score (highest first)
    frameAnalyses.sort((a, b) => b.overallScore - a.overallScore);
    
    const bestFrame = frameAnalyses[0];
    console.log(`✓ Best frame selected: ${bestFrame.position.toFixed(1)}s with score ${bestFrame.overallScore.toFixed(2)}`);
    
    // Seek to the best frame and capture final high-quality version
    try {
      await new Promise<boolean>((resolve) => {
        const handleSeeked = () => {
          video.removeEventListener('seeked', handleSeeked);
          resolve(true);
        };
        video.addEventListener('seeked', handleSeeked);
        video.currentTime = bestFrame.position;
        setTimeout(() => {
          video.removeEventListener('seeked', handleSeeked);
          resolve(false);
        }, 1000);
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      const finalFrameData = this.captureFrame(true); // With preprocessing for final quality
      
      return {
        frameData: finalFrameData || bestFrame.frameData,
        position: bestFrame.position,
        brightness: bestFrame.brightness,
        analysis: bestFrame
      };
      
    } catch (error) {
      console.error('Failed to capture final frame:', error);
      return {
        frameData: bestFrame.frameData,
        position: bestFrame.position,
        brightness: bestFrame.brightness,
        analysis: bestFrame
      };
    }
  }

  // Crop head from frame (includes hair, face, neck)
  async cropHeadFromFrame(frameDataUrl: string, head: DetectedFace): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Add padding around the head for complete head capture (40% padding)
        const padding = 0.4;
        const paddedWidth = head.width * (1 + padding * 2);
        const paddedHeight = head.height * (1 + padding * 2);
        const paddedX = Math.max(0, head.x - head.width * padding);
        const paddedY = Math.max(0, head.y - head.height * padding);
        
        // Ensure we don't go beyond image boundaries
        const cropX = Math.max(0, paddedX);
        const cropY = Math.max(0, paddedY);
        const cropWidth = Math.min(paddedWidth, img.width - cropX);
        const cropHeight = Math.min(paddedHeight, img.height - cropY);
        
        // Set canvas size to cropped dimensions
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        
        // Draw the cropped head region
        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,  // Source rectangle
          0, 0, cropWidth, cropHeight           // Destination rectangle
        );
        
        // Convert to high-quality JPEG
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(croppedDataUrl);
      };
      
      img.onerror = () => reject(new Error('Failed to load image for cropping'));
      img.src = frameDataUrl;
    });
  }

  // Detect faces using multiple AI models with fallbacks
  async detectFaces(): Promise<{ faces: DetectedFace[]; frameData: string | null }> {
    try {
      if (!this.videoRef) {
        throw new Error('Video element not set');
      }

      const optimalFrame = await this.findOptimalFrame();

      if (!optimalFrame || !optimalFrame.frameData) {
        throw new Error('Failed to find optimal frame');
      }

      const video = this.videoRef;
      const enhancedFrame = optimalFrame.frameData;

      const frameVariants: Array<{ data: string; label: string }> = [{ data: enhancedFrame, label: 'enhanced' }];

      const originalFrame = this.captureFrame(false);
      if (originalFrame && originalFrame !== enhancedFrame) {
        frameVariants.push({ data: originalFrame, label: 'original' });
      }

      const tryMediaPipe = async (): Promise<{ faces: DetectedFace[]; frameData: string } | null> => {
        try {
          console.log('dYZ_ Using MediaPipe Face Detection...');
          const { FaceDetection } = await import('@mediapipe/face_detection');

          const faceDetection = new FaceDetection({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/${file}`
          });

          faceDetection.setOptions({
            model: 'full',
            minDetectionConfidence: 0.3
          });

          let detectionResults: DetectedFace[] = [];
          let mediaScriptResolved = false;

          faceDetection.onResults((results: any) => {
            if (results.detections && results.detections.length > 0) {
              detectionResults = results.detections
                .map((detection: any, index: number) => {
                  const bbox = detection.boundingBox;
                  if (!bbox) {
                    return null;
                  }

                  const face: DetectedFace = {
                    x: bbox.xCenter * video.videoWidth - (bbox.width * video.videoWidth) / 2,
                    y: bbox.yCenter * video.videoHeight - (bbox.height * video.videoHeight) / 2,
                    width: bbox.width * video.videoWidth,
                    height: bbox.height * video.videoHeight,
                    confidence: (detection.score?.[0] as number | undefined) ?? 0.8
                  };

                  console.log(`MediaPipe Face ${index + 1}:`, face);
                  return face;
                })
                .filter(Boolean) as DetectedFace[];
            }
            mediaScriptResolved = true;
          });

          for (let attemptIndex = 0; attemptIndex < frameVariants.length; attemptIndex++) {
            const { data, label } = frameVariants[attemptIndex];
            mediaScriptResolved = false;
            detectionResults = [];

            const attempt = await new Promise<{ faces: DetectedFace[]; frameData: string } | null>((resolve, reject) => {
              const timeout = setTimeout(() => {
                if (!mediaScriptResolved) {
                  reject(new Error('MediaPipe detection timeout'));
                }
              }, 12000);

              const img = new Image();
              img.crossOrigin = 'anonymous';

              img.onload = async () => {
                try {
                  await faceDetection.send({ image: img });

                  const waitForResults = () => {
                    if (mediaScriptResolved) {
                      clearTimeout(timeout);
                      if (detectionResults.length > 0) {
                        console.log(`MediaPipe detection successful on ${label} frame`, detectionResults);
                        resolve({ faces: detectionResults, frameData: data });
                      } else {
                        resolve(null);
                      }
                    } else {
                      setTimeout(waitForResults, 100);
                    }
                  };

                  setTimeout(waitForResults, 100);
                } catch (error) {
                  clearTimeout(timeout);
                  reject(error as Error);
                }
              };

              img.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Failed to load image for MediaPipe'));
              };

              img.src = data;
            }).catch((error) => {
              console.log(`MediaPipe attempt ${attemptIndex + 1} (${label}) failed:`, error);
              return null;
            });

            if (attempt && attempt.faces.length > 0) {
              if (typeof faceDetection.close === 'function') {
                faceDetection.close();
              }
              return attempt;
            }
          }

          if (typeof faceDetection.close === 'function') {
            faceDetection.close();
          }
        } catch (error) {
          console.log('MediaPipe detection failed:', error);
        }

        return null;
      };

      const mediaPipeResult = await tryMediaPipe();
      if (mediaPipeResult) {
        return mediaPipeResult;
      }

      // Strict mode: Do not fall back to other detectors if MediaPipe fails.
      // Set localStorage key 'faceDetection.allowFallback' to '1' to enable fallbacks.
      let allowFallback = false;
      try {
        if (typeof window !== 'undefined') {
          allowFallback = window.localStorage.getItem('faceDetection.allowFallback') === '1';
        }
      } catch {}
      if (!allowFallback) {
        throw new Error('MediaPipe detection failed and fallbacks are disabled');
      }

      const tryBlazeFace = async (): Promise<{ faces: DetectedFace[]; frameData: string } | null> => {
        try {
          const tf = await import('@tensorflow/tfjs');
          const blazeface = await import('@tensorflow-models/blazeface');

          await tf.ready();
          const model = await blazeface.load();

          for (const variant of frameVariants) {
            const blazeResult = await new Promise<{ faces: DetectedFace[]; frameData: string } | null>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';

              img.onload = async () => {
                try {
                  const predictions = await model.estimateFaces(img, false);

                  if (predictions && predictions.length > 0) {
                    const faces = predictions.map((prediction: any) => {
                      const bbox = (prediction as any).box || (prediction as any).topLeft.concat((prediction as any).bottomRight);
                      const [x1, y1, width, height] = Array.isArray(bbox) && bbox.length === 4
                        ? bbox
                        : [
                            (prediction as any).topLeft[0],
                            (prediction as any).topLeft[1],
                            (prediction as any).bottomRight[0] - (prediction as any).topLeft[0],
                            (prediction as any).bottomRight[1] - (prediction as any).topLeft[1],
                          ];

                      return {
                        x: x1,
                        y: y1,
                        width,
                        height,
                        confidence: (prediction.probability?.[0] as number | undefined) ?? 0.9
                      } as DetectedFace;
                    });

                    resolve({ faces, frameData: variant.data });
                  } else {
                    resolve(null);
                  }
                } catch (error) {
                  reject(error);
                }
              };

              img.onerror = () => reject(new Error('Failed to load image for BlazeFace'));
              img.src = variant.data;
            }).catch((error) => {
              console.log('BlazeFace attempt failed:', error);
              return null;
            });

            if (blazeResult && blazeResult.faces.length > 0) {
              return blazeResult;
            }
          }
        } catch (error) {
          console.log('BlazeFace detection failed:', error);
        }

        return null;
      };

      const blazeFaceResult = await tryBlazeFace();
      if (blazeFaceResult) {
        return blazeFaceResult;
      }

      const tryFaceLandmarks = async (): Promise<{ faces: DetectedFace[]; frameData: string } | null> => {
        try {
          const faceLandmarks = await import('@tensorflow-models/face-landmarks-detection');
          const tf = await import('@tensorflow/tfjs');

          await tf.ready();
          const detector = await faceLandmarks.createDetector(
            faceLandmarks.SupportedModels.MediaPipeFaceMesh,
            {
              runtime: 'tfjs',
              refineLandmarks: true,
              maxFaces: 1,
            } as any
          );

          for (const variant of frameVariants) {
            const landmarkResult = await new Promise<{ faces: DetectedFace[]; frameData: string } | null>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';

              img.onload = async () => {
                try {
                  const predictions = await detector.estimateFaces(img);

                  if (predictions && predictions.length > 0) {
                    const faces = predictions.map((prediction: any, index: number) => {
                      const keypoints = prediction.keypoints || [];
                      let minX = Infinity;
                      let minY = Infinity;
                      let maxX = -Infinity;
                      let maxY = -Infinity;

                      keypoints.forEach((point: any) => {
                        minX = Math.min(minX, point.x);
                        maxX = Math.max(maxX, point.x);
                        minY = Math.min(minY, point.y);
                        maxY = Math.max(maxY, point.y);
                      });

                      const face: DetectedFace = {
                        x: minX,
                        y: minY,
                        width: Math.max(0, maxX - minX),
                        height: Math.max(0, maxY - minY),
                        confidence: 0.85
                      };

                      console.log(`Face Landmarks ${index + 1}:`, face);
                      return face;
                    });

                    resolve({ faces, frameData: variant.data });
                  } else {
                    resolve(null);
                  }
                } catch (error) {
                  reject(error);
                }
              };

              img.onerror = () => reject(new Error('Failed to load image for Face Landmarks'));
              img.src = variant.data;
            }).catch((error) => {
              console.log('Face Landmarks attempt failed:', error);
              return null;
            });

            if (landmarkResult && landmarkResult.faces.length > 0) {
              return landmarkResult;
            }
          }
        } catch (error) {
          console.log('Face Landmarks detection failed:', error);
        }

        return null;
      };

      const faceLandmarksResult = await tryFaceLandmarks();
      if (faceLandmarksResult) {
        return faceLandmarksResult;
      }

      const tryBrowserVision = async (): Promise<{ faces: DetectedFace[]; frameData: string } | null> => {
        if (typeof window === 'undefined') {
          return null;
        }

        const anyNavigator = navigator as any;
        const faceDetectorCtor = anyNavigator?.vision?.FaceDetector || (window as any)?.FaceDetector;
        if (!faceDetectorCtor) {
          return null;
        }

        try {
          for (const variant of frameVariants) {
            const visionResult = await new Promise<{ faces: DetectedFace[]; frameData: string } | null>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';

              img.onload = async () => {
                try {
                  const detector = new faceDetectorCtor();
                  const faces = await detector.detect(img);

                  if (faces && faces.length > 0) {
                    const mappedFaces = faces.map((face: any, index: number) => {
                      const bbox = face.boundingBox;
                      const detectedFace: DetectedFace = {
                        x: bbox.x,
                        y: bbox.y,
                        width: bbox.width,
                        height: bbox.height,
                        confidence: 0.9
                      };

                      console.log(`Browser Vision API ${index + 1}:`, detectedFace);
                      return detectedFace;
                    });

                    resolve({ faces: mappedFaces, frameData: variant.data });
                  } else {
                    resolve(null);
                  }
                } catch (error) {
                  reject(error);
                }
              };

              img.onerror = () => reject(new Error('Failed to load image for Browser Vision API'));
              img.src = variant.data;
            }).catch((error) => {
              console.log('Browser Vision API attempt failed:', error);
              return null;
            });

            if (visionResult && visionResult.faces.length > 0) {
              return visionResult;
            }
          }
        } catch (error) {
          console.log('Browser Vision API detection failed:', error);
        }

        return null;
      };

      const browserVisionResult = await tryBrowserVision();
      if (browserVisionResult) {
        return browserVisionResult;
      }

      const fallbackFrame = frameVariants[0]?.data ?? enhancedFrame;
      const fallbackFaces = await this.detectFacesWithAdvancedAlgorithm(fallbackFrame);

      if (fallbackFaces.length > 0) {
        console.log('Fallback algorithm detected', fallbackFaces.length, 'face(s)');
        return { faces: fallbackFaces, frameData: fallbackFrame };
      }

      throw new Error('All face detection methods failed');
    } catch (error) {
      console.error('Face detection failed:', error);
      throw error;
    }
  }

  // Advanced fallback face detection algorithm
  private async detectFacesWithAdvancedAlgorithm(frameData: string): Promise<DetectedFace[]> {
    if (!this.videoRef) return [];

    const video = this.videoRef;
    
    // Create analysis canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = frameData;
    });

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Advanced skin tone and face detection
    let bestX = canvas.width * 0.3;
    let bestY = canvas.height * 0.2;
    let maxScore = 0;

    const blockSize = 15;
    for (let y = 0; y < canvas.height - blockSize; y += blockSize / 2) {
      for (let x = 0; x < canvas.width - blockSize; x += blockSize / 2) {
        let skinPixels = 0;
        let brightPixels = 0;

        for (let by = y; by < y + blockSize && by < canvas.height; by++) {
          for (let bx = x; bx < x + blockSize && bx < canvas.width; bx++) {
            const i = (by * canvas.width + bx) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Enhanced skin tone detection
            const isSkin1 = r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15;
            const isSkin2 = r > 120 && g > 80 && b > 50 && r > g && g > b && (r - g) < 80;
            const isSkin3 = r > 180 && g > 120 && b > 90 && Math.abs(r - g) < 50;

            if (isSkin1 || isSkin2 || isSkin3) {
              skinPixels++;
            }

            const brightness = (r + g + b) / 3;
            if (brightness > 150) {
              brightPixels++;
            }
          }
        }

        // Score this region
        const heightBonus = y < canvas.height * 0.4 ? 1.5 : (y < canvas.height * 0.6 ? 1.0 : 0.5);
        const centerBonus = Math.abs(x - canvas.width * 0.5) < canvas.width * 0.3 ? 1.2 : 0.8;
        const score = (skinPixels * 2 + brightPixels) * heightBonus * centerBonus;

        if (score > maxScore && y < canvas.height * 0.7) {
          maxScore = score;
          bestX = x;
          bestY = y;
        }
      }
    }

    // Adaptive face size based on video resolution
    const baseSize = Math.min(canvas.width, canvas.height);
    const faceWidth = baseSize * 0.2;
    const faceHeight = faceWidth * 1.3;

    const confidence = Math.min(maxScore / 100, 0.8);

    return [{
      x: Math.max(0, bestX - faceWidth * 0.1),
      y: Math.max(0, bestY - faceHeight * 0.1),
      width: faceWidth,
      height: faceHeight,
      confidence
    }];
  }

  // Cleanup
  destroy() {
    if (this.canvasRef && typeof document !== 'undefined') {
      document.body.removeChild(this.canvasRef);
    }
  }
}

// Singleton instance
let faceDetectionService: FaceDetectionService | null = null;

export function getFaceDetectionService(): FaceDetectionService {
  if (!faceDetectionService) {
    faceDetectionService = new FaceDetectionService();
  }
  return faceDetectionService;
}

// Session storage utilities for cropped head images
export function storeCroppedHeadImage(imageDataUrl: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('croppedHeadImage', imageDataUrl);
    console.log('Cropped head image stored in session storage');
  }
}

export function getCroppedHeadImage(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('croppedHeadImage');
  }
  return null;
}

export function clearCroppedHeadImage() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('croppedHeadImage');
  }
}
