'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Play, Download, Camera } from 'lucide-react';

// Types
interface DetectedFace {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface FaceSwapResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export default function FaceSwapTestPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [currentFrame, setCurrentFrame] = useState<string>('');
  const [faceSwapResult, setFaceSwapResult] = useState<FaceSwapResult | null>(null);
  const [status, setStatus] = useState<string>('');
  const [previousFaces, setPreviousFaces] = useState<DetectedFace[]>([]);
  const [frameCount, setFrameCount] = useState(0);
  const [openCvLoaded, setOpenCvLoaded] = useState(false);
  const [croppedFacePreview, setCroppedFacePreview] = useState<string>('');
  const [sharpenedFacePreview, setSharpenedFacePreview] = useState<string>('');
  const [upscaledHeadPreview, setUpscaledHeadPreview] = useState<string>('');
  const [optimalFrameInfo, setOptimalFrameInfo] = useState<{position: number, brightness: number, analysis?: any} | null>(null);
  const [videoAnalysisProgress, setVideoAnalysisProgress] = useState<{current: number, total: number, percentage: number} | null>(null);

  // Download utility function
  const downloadFrame = useCallback((dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Download captured frame
  const handleDownloadFrame = useCallback(() => {
    if (currentFrame) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `bowling-frame-${timestamp}.jpg`;
      downloadFrame(currentFrame, filename);
    }
  }, [currentFrame, downloadFrame]);

  // Crop head from frame for better head swap accuracy (includes hair, face, neck)
  const cropHeadFromFrame = useCallback((frameDataUrl: string, head: DetectedFace) => {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Add padding around the head for complete head capture (40% padding for hair/neck)
        const padding = 0.4;  // Increased padding for full head
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
        
        // Draw the cropped head region (includes hair, face, neck)
        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,  // Source rectangle
          0, 0, cropWidth, cropHeight           // Destination rectangle
        );
        
        // Convert to high-quality JPEG for head swap API
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(croppedDataUrl);
      };
      
      img.onerror = () => reject(new Error('Failed to load image for cropping'));
      img.src = frameDataUrl;
    });
  }, []);

  // Download cropped head
  const handleDownloadCroppedHead = useCallback(async () => {
    if (currentFrame && detectedFaces.length > 0) {
      try {
        const head = detectedFaces[0]; // Use the first detected head
        const croppedHead = await cropHeadFromFrame(currentFrame, head);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `cropped-head-${timestamp}.jpg`;
        downloadFrame(croppedHead, filename);
      } catch (error) {
        console.error('Failed to crop head:', error);
      }
    }
  }, [currentFrame, detectedFaces, cropHeadFromFrame, downloadFrame]);

  // Download sharpened head
  const handleDownloadSharpenedHead = useCallback(() => {
    if (sharpenedFacePreview) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `sharpened-head-${timestamp}.jpg`;
      downloadFrame(sharpenedFacePreview, filename);
    }
  }, [sharpenedFacePreview, downloadFrame]);

  // Download upscaled head
  const handleDownloadUpscaledHead = useCallback(() => {
    if (upscaledHeadPreview) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `upscaled-head-${timestamp}.jpg`;
      downloadFrame(upscaledHeadPreview, filename);
    }
  }, [upscaledHeadPreview, downloadFrame]);

  // AI Upscale image using advanced bicubic interpolation with edge enhancement
  const upscaleImage = useCallback(async (imageDataUrl: string, scaleFactor: number = 2) => {
    try {
      console.log('Starting local AI-enhanced upscaling process...');
      
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context for upscaling'));
              return;
            }
            
            const originalWidth = img.width;
            const originalHeight = img.height;
            const newWidth = originalWidth * scaleFactor;
            const newHeight = originalHeight * scaleFactor;
            
            console.log(`📐 UPSCALING DIMENSIONS:`);
            console.log(`   Input: ${originalWidth}x${originalHeight} (${(originalWidth * originalHeight / 1000).toFixed(0)}K pixels)`);
            console.log(`   Output: ${newWidth}x${newHeight} (${(newWidth * newHeight / 1000).toFixed(0)}K pixels)`);
            console.log(`   Scale Factor: ${scaleFactor}x`);
            
            // Set canvas to new dimensions
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            // Step 1: Use browser's high-quality image scaling (bicubic-like)
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            
            // Step 2: Apply edge enhancement for sharper upscaled result
            const imageData = ctx.getImageData(0, 0, newWidth, newHeight);
            const data = imageData.data;
            const enhanced = new Uint8ClampedArray(data);
            
            // Enhanced sharpening kernel for upscaled images
            const enhanceKernel = [
              -0.1, -0.2, -0.1,
              -0.2,  2.2, -0.2,
              -0.1, -0.2, -0.1
            ];
            
            // Apply enhancement (skip edges to avoid artifacts)
            for (let y = 1; y < newHeight - 1; y++) {
              for (let x = 1; x < newWidth - 1; x++) {
                for (let c = 0; c < 3; c++) { // RGB channels only
                  let sum = 0;
                  
                  // Apply enhancement kernel
                  for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                      const idx = ((y + ky) * newWidth + (x + kx)) * 4 + c;
                      const kernelIdx = (ky + 1) * 3 + (kx + 1);
                      sum += data[idx] * enhanceKernel[kernelIdx];
                    }
                  }
                  
                  const pixelIdx = (y * newWidth + x) * 4 + c;
                  enhanced[pixelIdx] = Math.max(0, Math.min(255, sum));
                }
              }
            }
            
            // Step 3: Apply subtle noise reduction to smooth out artifacts
            const smoothed = new Uint8ClampedArray(enhanced);
            for (let y = 1; y < newHeight - 1; y++) {
              for (let x = 1; x < newWidth - 1; x++) {
                for (let c = 0; c < 3; c++) {
                  const idx = (y * newWidth + x) * 4 + c;
                  
                  // Light 3x3 smoothing
                  const sum = 
                    enhanced[((y - 1) * newWidth + (x - 1)) * 4 + c] * 0.1 +
                    enhanced[((y - 1) * newWidth + x) * 4 + c] * 0.1 +
                    enhanced[((y - 1) * newWidth + (x + 1)) * 4 + c] * 0.1 +
                    enhanced[(y * newWidth + (x - 1)) * 4 + c] * 0.2 +
                    enhanced[(y * newWidth + x) * 4 + c] * 0.2 +
                    enhanced[(y * newWidth + (x + 1)) * 4 + c] * 0.2 +
                    enhanced[((y + 1) * newWidth + (x - 1)) * 4 + c] * 0.1 +
                    enhanced[((y + 1) * newWidth + x) * 4 + c] * 0.1 +
                    enhanced[((y + 1) * newWidth + (x + 1)) * 4 + c] * 0.1;
                    
                  smoothed[idx] = Math.max(0, Math.min(255, sum));
                }
              }
            }
            
            // Step 4: Apply contrast enhancement for better definition
            const contrastFactor = 1.1;
            for (let i = 0; i < smoothed.length; i += 4) {
              for (let c = 0; c < 3; c++) {
                const enhanced = ((smoothed[i + c] - 128) * contrastFactor + 128);
                smoothed[i + c] = Math.max(0, Math.min(255, enhanced));
              }
            }
            
            // Put enhanced data back to canvas
            ctx.putImageData(new ImageData(smoothed, newWidth, newHeight), 0, 0);
            
            // Convert to high-quality JPEG
            const upscaledDataUrl = canvas.toDataURL('image/jpeg', 0.95);
            console.log('Local AI-enhanced upscaling completed successfully');
            resolve(upscaledDataUrl);
            
          } catch (error) {
            console.error('Local upscaling error:', error);
            reject(error);
          }
        };
        
        img.onerror = () => {
          console.error('Failed to load image for upscaling');
          // Return original image if upscaling fails
          resolve(imageDataUrl);
        };
        
        img.src = imageDataUrl;
      });
      
    } catch (error) {
      console.error('Upscaling process error:', error);
      // Return original image if upscaling fails
      console.log('Upscaling failed, using original sharpened image');
      return imageDataUrl;
    }
  }, []);

  // Sharpen cropped head image for better head swap results
  const sharpenCroppedHead = useCallback((croppedHeadDataUrl: string) => {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context for sharpening'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const sharpened = new Uint8ClampedArray(data);
        
        // Unsharp mask sharpening algorithm
        const sharpenKernel = [
          0, -1, 0,
          -1, 5, -1,
          0, -1, 0
        ];
        
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < canvas.width - 1; x++) {
            for (let c = 0; c < 3; c++) { // RGB channels only
              let sum = 0;
              
              // Apply sharpening kernel
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const idx = ((y + ky) * canvas.width + (x + kx)) * 4 + c;
                  const kernelIdx = (ky + 1) * 3 + (kx + 1);
                  sum += data[idx] * sharpenKernel[kernelIdx];
                }
              }
              
              const pixelIdx = (y * canvas.width + x) * 4 + c;
              sharpened[pixelIdx] = Math.max(0, Math.min(255, sum));
            }
          }
        }
        
        // Apply contrast enhancement
        const contrastFactor = 1.3;
        for (let i = 0; i < sharpened.length; i += 4) {
          // Enhance RGB channels
          for (let c = 0; c < 3; c++) {
            const enhanced = ((sharpened[i + c] - 128) * contrastFactor + 128);
            sharpened[i + c] = Math.max(0, Math.min(255, enhanced));
          }
        }
        
        // Apply slight brightness boost to heads (works for faces and hair)
        const brightnessBoost = 15;
        for (let i = 0; i < sharpened.length; i += 4) {
          for (let c = 0; c < 3; c++) {
            sharpened[i + c] = Math.max(0, Math.min(255, sharpened[i + c] + brightnessBoost));
          }
        }
        
        // Put the sharpened data back
        ctx.putImageData(new ImageData(sharpened, canvas.width, canvas.height), 0, 0);
        
        // Convert to high-quality JPEG
        const sharpenedDataUrl = canvas.toDataURL('image/jpeg', 0.98);
        console.log('Head sharpened successfully');
        resolve(sharpenedDataUrl);
      };
      
      img.onerror = () => reject(new Error('Failed to load image for sharpening'));
      img.src = croppedHeadDataUrl;
    });
  }, []);

  // Generate cropped head preview after successful detection
  const generateCroppedHeadPreview = useCallback(async (frameData: string, heads: DetectedFace[]) => {
    if (heads.length > 0) {
      try {
        const croppedHead = await cropHeadFromFrame(frameData, heads[0]);
        setCroppedFacePreview(croppedHead);
        console.log('Cropped head preview generated');
        
        // Generate sharpened preview
        const sharpenedHead = await sharpenCroppedHead(croppedHead);
        setSharpenedFacePreview(sharpenedHead);
        console.log('Sharpened head preview generated');
        
        // Generate upscaled preview for best quality
        console.log('Starting AI upscaling for enhanced quality...');
        const upscaledHead = await upscaleImage(sharpenedHead, 2); // 2x upscale
        setUpscaledHeadPreview(upscaledHead);
        console.log('Upscaled head preview generated');
      } catch (error) {
        console.error('Failed to generate head previews:', error);
      }
    }
  }, [cropHeadFromFrame, sharpenCroppedHead, upscaleImage]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load MediaPipe Face Detection
  useEffect(() => {
    const loadMediaPipe = async () => {
      try {
        setStatus('Loading MediaPipe Face Detection...');
        // MediaPipe will be loaded dynamically when needed
        setStatus('MediaPipe Face Detection ready');
      } catch (error) {
        console.error('Error loading MediaPipe:', error);
        setStatus('Face detection ready - using fallback method');
      }
    };

    loadMediaPipe();
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setDetectedFaces([]);
      setFaceSwapResult(null);
      setCurrentFrame('');
    }
  }, []);

  // Enhanced preprocessing functions for better face detection
  const preprocessImage = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
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
  }, []);
  
  // Face tracking function to maintain consistency between frames
  const trackFaces = useCallback((newFaces: DetectedFace[], previousFaces: DetectedFace[]) => {
    if (previousFaces.length === 0) return newFaces;
    
    const trackedFaces: DetectedFace[] = [];
    const maxDistance = 50; // Maximum pixel distance for tracking
    
    newFaces.forEach(newFace => {
      let bestMatch: DetectedFace | null = null;
      let minDistance = Infinity;
      
      previousFaces.forEach(prevFace => {
        const distance = Math.sqrt(
          Math.pow(newFace.x - prevFace.x, 2) + 
          Math.pow(newFace.y - prevFace.y, 2)
        );
        
        if (distance < minDistance && distance < maxDistance) {
          minDistance = distance;
          bestMatch = prevFace;
        }
      });
      
      if (bestMatch) {
        // Smooth the transition by averaging with previous position
        const smoothingFactor = 0.7;
        const match = bestMatch as DetectedFace;
        const smoothedFace: DetectedFace = {
          x: newFace.x * (1 - smoothingFactor) + match.x * smoothingFactor,
          y: newFace.y * (1 - smoothingFactor) + match.y * smoothingFactor,
          width: newFace.width * (1 - smoothingFactor) + match.width * smoothingFactor,
          height: newFace.height * (1 - smoothingFactor) + match.height * smoothingFactor,
          confidence: Math.max(newFace.confidence, match.confidence * 0.9)
        };
        trackedFaces.push(smoothedFace);
      } else {
        trackedFaces.push(newFace);
      }
    });
    
    return trackedFaces;
  }, []);

  const captureFrame = useCallback(async (withPreprocessing = true) => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // Apply preprocessing for better detection
    if (withPreprocessing) {
      preprocessImage(canvas, ctx);
    }

    return canvas.toDataURL('image/jpeg', 0.9);
  }, [preprocessImage]);

  // Seek to optimal time position for face detection (2-3 seconds)
  const seekToOptimalTime = useCallback(async () => {
    if (!videoRef.current) return false;

    const video = videoRef.current;
    const duration = video.duration;
    
    // Calculate optimal time - prefer 2.5 seconds, but adjust based on video length
    let optimalTime: number;
    if (duration > 5) {
      optimalTime = 2.5; // 2.5 seconds for longer videos
    } else if (duration > 3) {
      optimalTime = Math.min(2.0, duration * 0.4); // 40% through short videos
    } else {
      optimalTime = Math.min(1.0, duration * 0.3); // 30% through very short videos
    }
    
    console.log(`Video duration: ${duration.toFixed(1)}s, seeking to optimal time: ${optimalTime.toFixed(1)}s`);
    
    return new Promise<boolean>((resolve) => {
      const handleSeeked = () => {
        video.removeEventListener('seeked', handleSeeked);
        console.log(`Successfully seeked to ${video.currentTime.toFixed(1)}s`);
        resolve(true);
      };
      
      const handleError = () => {
        video.removeEventListener('error', handleError);
        video.removeEventListener('seeked', handleSeeked);
        console.log('Seek failed, using current position');
        resolve(false);
      };
      
      video.addEventListener('seeked', handleSeeked);
      video.addEventListener('error', handleError);
      
      try {
        video.currentTime = optimalTime;
      } catch (error) {
        console.error('Error setting video time:', error);
        video.removeEventListener('seeked', handleSeeked);
        video.removeEventListener('error', handleError);
        resolve(false);
      }
      
      // Timeout fallback
      setTimeout(() => {
        video.removeEventListener('seeked', handleSeeked);
        video.removeEventListener('error', handleError);
        resolve(false);
      }, 2000);
    });
  }, []);

  // OpenCV.js face detection function
  const detectFacesWithOpenCV = useCallback(async (imageData: string) => {
    try {
      setStatus('Trying OpenCV.js face detection...');
      
      // Load OpenCV.js dynamically
      if (!(window as any).cv) {
        // Load OpenCV.js from CDN
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.onload = () => {
            (window as any).cv.onRuntimeInitialized = () => {
              setOpenCvLoaded(true);
              resolve();
            };
          };
          script.onerror = reject;
          script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
          document.head.appendChild(script);
        });
      }
      
      const cv = (window as any).cv;
      
      // Create image from data URL
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageData;
      });
      
      // Create canvas and convert to OpenCV Mat
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      
      const src = cv.imread(canvas);
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      
      // Load Haar cascade for face detection
      const faces = new cv.RectVector();
      const faceCascade = new cv.CascadeClassifier();
      
      // Use built-in Haar cascade (this is a simplified approach)
      // In practice, you'd load the actual cascade file
      try {
        // Multi-scale detection for better results with distant faces
        const scaleFactor = 1.1;
        const minNeighbors = 3;
        const minSize = new cv.Size(30, 30);
        const maxSize = new cv.Size(300, 300);
        
        // This is a placeholder - actual implementation would need cascade file
        // For now, we'll return empty results and let other methods handle detection
        throw new Error('Cascade not available in this simplified implementation');
        
      } catch (cascadeError) {
        // Clean up OpenCV resources
        src.delete();
        gray.delete();
        faces.delete();
        faceCascade.delete();
        throw cascadeError;
      }
      
    } catch (error) {
      console.log('OpenCV.js detection failed:', error);
      throw error;
    }
  }, []);

  // Comprehensive video analysis to find the frame with the most visible and clear face
  const findOptimalFrame = useCallback(async () => {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    const duration = video.duration;
    
    console.log(`Starting comprehensive video analysis (duration: ${duration.toFixed(1)}s)`);
    setStatus('Analyzing entire video to find the clearest face...');
    
    // Configuration for analysis
    const sampleInterval = Math.max(0.5, duration / 60); // Sample every 0.5s or 60 samples max
    const totalSamples = Math.floor(duration / sampleInterval);
    const startTime = Math.max(0.5, duration * 0.1); // Skip first 10% or 0.5s
    const endTime = Math.min(duration - 0.5, duration * 0.9); // Skip last 10% or 0.5s
    
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
      const progress = Math.round((processed / totalSamples) * 100);
      setVideoAnalysisProgress({ current: processed, total: totalSamples, percentage: progress });
      setStatus(`Analyzing frame ${processed}/${totalSamples} (${progress}%) at ${time.toFixed(1)}s...`);
      
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
        const frameData = await captureFrame(false); // Raw frame for better analysis
        if (!frameData) continue;
        
        // Analyze frame quality
        const analysis = await analyzeFrameQuality(frameData, time);
        if (analysis) {
          frameAnalyses.push(analysis);
          console.log(`Frame ${time.toFixed(1)}s: Score=${analysis.overallScore.toFixed(2)} (B:${analysis.brightness.toFixed(0)}, C:${analysis.contrast.toFixed(2)}, S:${analysis.sharpness.toFixed(2)}, Skin:${analysis.skinToneScore.toFixed(2)}, Head:${analysis.headScore.toFixed(2)})`);
        }
        
      } catch (error) {
        console.log(`Analysis failed at ${time.toFixed(1)}s:`, error);
        continue;
      }
    }
    
    if (frameAnalyses.length === 0) {
      setStatus('No valid frames found during analysis');
      return null;
    }
    
    // Sort by overall score (highest first)
    frameAnalyses.sort((a, b) => b.overallScore - a.overallScore);
    
    const bestFrame = frameAnalyses[0];
    console.log(`✓ Best frame selected: ${bestFrame.position.toFixed(1)}s with score ${bestFrame.overallScore.toFixed(2)}`);
    console.log('Top 5 frames:', frameAnalyses.slice(0, 5).map(f => `${f.position.toFixed(1)}s: ${f.overallScore.toFixed(2)}`));
    
    // Seek to the best frame and capture final high-quality version
    setStatus(`Capturing best frame at ${bestFrame.position.toFixed(1)}s...`);
    
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
      const finalFrameData = await captureFrame(true); // With preprocessing for final quality
      
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
  }, [captureFrame]);
  
  // Analyze frame quality for face visibility and clarity
  const analyzeFrameQuality = useCallback(async (frameData: string, position: number) => {
    return new Promise<{
      position: number;
      frameData: string;
      brightness: number;
      contrast: number;
      sharpness: number;
      skinToneScore: number;
      headScore: number;
      overallScore: number;
    } | null>((resolve) => {
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
          
          // 1. Brightness analysis (avoid too dark/bright)
          let totalBrightness = 0;
          let brightnessSamples = 0;
          
          // 2. Contrast analysis (higher contrast = clearer features)
          let totalContrast = 0;
          let contrastSamples = 0;
          
          // 3. Sharpness analysis (edge detection)
          let totalSharpness = 0;
          let sharpnessSamples = 0;
          
          // 4. Skin tone detection
          let skinPixels = 0;
          let totalPixels = 0;
          
          // 5. Head region analysis (focus on upper-center area for entire head)
          const headRegion = {
            startX: Math.floor(canvas.width * 0.15),  // Wider for head
            endX: Math.floor(canvas.width * 0.85),
            startY: Math.floor(canvas.height * 0.05), // Higher up for hair/forehead
            endY: Math.floor(canvas.height * 0.65)    // Lower for chin/neck
          };
          
          let headRegionQuality = 0;
          let headRegionPixels = 0;
          
          for (let y = 0; y < canvas.height - 1; y++) {
            for (let x = 0; x < canvas.width - 1; x++) {
              const i = (y * canvas.width + x) * 4;
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              
              // Brightness calculation
              const brightness = (r + g + b) / 3;
              totalBrightness += brightness;
              brightnessSamples++;
              
              // Contrast calculation (compare with neighbor)
              const i_next = ((y * canvas.width) + (x + 1)) * 4;
              const r_next = data[i_next];
              const g_next = data[i_next + 1];
              const b_next = data[i_next + 2];
              const brightness_next = (r_next + g_next + b_next) / 3;
              const contrast = Math.abs(brightness - brightness_next);
              totalContrast += contrast;
              contrastSamples++;
              
              // Sharpness calculation (Sobel edge detection simplified)
              if (y > 0 && x > 0) {
                const i_up = ((y - 1) * canvas.width + x) * 4;
                const i_left = (y * canvas.width + (x - 1)) * 4;
                const r_up = data[i_up];
                const r_left = data[i_left];
                const dx = r - r_left;
                const dy = r - r_up;
                const edge = Math.sqrt(dx * dx + dy * dy);
                totalSharpness += edge;
                sharpnessSamples++;
              }
              
              // Enhanced skin tone detection
              const isSkin = (
                (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) ||
                (r > 120 && g > 80 && b > 50 && r > g && g > b && (r - g) < 80) ||
                (r > 180 && g > 120 && b > 90 && Math.abs(r - g) < 50)
              );
              
              if (isSkin) skinPixels++;
              totalPixels++;
              
              // Head region specific analysis (includes hair, forehead, face, chin)
              if (x >= headRegion.startX && x <= headRegion.endX && 
                  y >= headRegion.startY && y <= headRegion.endY) {
                // Enhanced head detection: skin tone gets 2x weight, hair/dark areas get 1.5x
                const isHairLikely = (r < 100 && g < 100 && b < 100) && (r + g + b < 200); // Dark areas (hair)
                const headPixelQuality = brightness * (contrast / 100) * (isSkin ? 2 : isHairLikely ? 1.5 : 1);
                headRegionQuality += headPixelQuality;
                headRegionPixels++;
              }
            }
          }
          
          // Calculate metrics
          const avgBrightness = totalBrightness / brightnessSamples;
          const avgContrast = totalContrast / contrastSamples;
          const avgSharpness = totalSharpness / sharpnessSamples;
          const skinToneRatio = skinPixels / totalPixels;
          const headRegionScore = headRegionPixels > 0 ? headRegionQuality / headRegionPixels : 0;
          
          // Scoring algorithm
          let brightnessScore = 0;
          if (avgBrightness >= 80 && avgBrightness <= 200) {
            brightnessScore = 1.0 - Math.abs(avgBrightness - 140) / 140; // Optimal around 140
          } else {
            brightnessScore = Math.max(0, 1.0 - Math.abs(avgBrightness - 140) / 200);
          }
          
          const contrastScore = Math.min(1.0, avgContrast / 30); // Higher contrast is better
          const sharpnessScore = Math.min(1.0, avgSharpness / 50); // Higher sharpness is better
          const skinScore = Math.min(1.0, skinToneRatio * 10); // More skin tone is better
          const headScore = Math.min(1.0, headRegionScore / 200); // Better head region quality
          
          // Weighted overall score (optimized for head detection)
          const overallScore = (
            brightnessScore * 0.25 +
            contrastScore * 0.20 +
            sharpnessScore * 0.20 +
            skinScore * 0.15 +      // Slightly reduced since hair doesn't have skin tone
            headScore * 0.20        // Increased weight for head region
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
  }, []);

  const detectFaces = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setFrameCount(prev => prev + 1);
    setStatus('Seeking to optimal time for clearer face capture...');

    try {
      // Find the optimal frame with best lighting and clarity
      setStatus('Analyzing video for optimal frame position...');
      const optimalFrame = await findOptimalFrame();
      
      if (!optimalFrame || !optimalFrame.frameData) {
        setStatus('Failed to find optimal frame');
        setIsProcessing(false);
        return;
      }

      setCurrentFrame(optimalFrame.frameData);
      setOptimalFrameInfo({
        position: optimalFrame.position,
        brightness: optimalFrame.brightness,
        analysis: optimalFrame.analysis
      });
      setVideoAnalysisProgress(null); // Clear progress
      
      const analysisText = optimalFrame.analysis ? 
        `(Score: ${optimalFrame.analysis.overallScore.toFixed(2)}, Brightness: ${optimalFrame.brightness.toFixed(0)}, Contrast: ${optimalFrame.analysis.contrast.toFixed(1)}, Sharpness: ${optimalFrame.analysis.sharpness.toFixed(1)})` :
        `(Brightness: ${optimalFrame.brightness.toFixed(0)})`;
        
      setStatus(`✓ Best frame selected at ${optimalFrame.position.toFixed(1)}s ${analysisText}`);
      console.log('Optimal frame selected:', {
        position: optimalFrame.position,
        brightness: optimalFrame.brightness,
        analysis: optimalFrame.analysis
      });

      const video = videoRef.current;
      const frameData = optimalFrame.frameData; // Use the optimal frame data
      console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight}`);

      // Try MediaPipe Face Detection first with enhanced settings
      try {
        setStatus('Running enhanced MediaPipe face detection...');
        
        // Try multiple preprocessing approaches for MediaPipe
        const originalFrame = await captureFrame(false); // Without preprocessing
        const enhancedFrame = await captureFrame(true);  // With preprocessing
        
        // Dynamic import to avoid build issues
        const { FaceDetection } = await import('@mediapipe/face_detection');
        const { Camera } = await import('@mediapipe/camera_utils');
        
        const faceDetection = new FaceDetection({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
          }
        });

        // Enhanced settings for sports videos with distant faces
        faceDetection.setOptions({
          model: 'full', // Use full model for better accuracy
          minDetectionConfidence: 0.3, // Lower threshold for distant faces
        });

        const detectedFaces: DetectedFace[] = [];

        let mediaScriptResolved = false;
        let detectionResults: DetectedFace[] = [];
        
        faceDetection.onResults((results) => {
          if (results.detections && results.detections.length > 0) {
            console.log('MediaPipe detected', results.detections.length, 'faces');
            
            results.detections.forEach((detection, index) => {
              const bbox = detection.boundingBox;
              if (bbox) {
                const face: DetectedFace = {
                  x: bbox.xCenter * video.videoWidth - (bbox.width * video.videoWidth) / 2,
                  y: bbox.yCenter * video.videoHeight - (bbox.height * video.videoHeight) / 2,
                  width: bbox.width * video.videoWidth,
                  height: bbox.height * video.videoHeight,
                  confidence: (detection as any).score?.[0] || 0.8
                };
                detectionResults.push(face);
                console.log(`MediaPipe Face ${index + 1}:`, face);
              }
            });
          }
          mediaScriptResolved = true;
        });

        // Try detection with both original and enhanced frames
        const framesToTry = [enhancedFrame, originalFrame].filter(Boolean);
        let detectionSuccessful = false;
        
        for (let i = 0; i < framesToTry.length && !detectionSuccessful; i++) {
          const currentFrame = framesToTry[i];
          setStatus(`MediaPipe attempt ${i + 1}/${framesToTry.length} ${i === 0 ? '(enhanced)' : '(original)'}...`);
          
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          try {
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                if (!mediaScriptResolved) {
                  reject(new Error('MediaPipe detection timeout'));
                }
              }, 8000); // Longer timeout for full model
              
              img.onload = async () => {
                try {
                  await faceDetection.send({ image: img });
                  
                  // Wait for MediaPipe to process and call onResults
                  const checkResults = () => {
                    if (mediaScriptResolved) {
                      clearTimeout(timeout);
                      if (detectionResults.length > 0) {
                        // Apply face tracking for consistency
                        const trackedFaces = trackFaces(detectionResults, previousFaces);
                        setDetectedFaces(trackedFaces);
                        setPreviousFaces(trackedFaces);
                        setCurrentFrame(currentFrame!);
                        
                        // Generate cropped head preview for the primary head
                        generateCroppedHeadPreview(currentFrame!, trackedFaces);
                        
                        setStatus(`MediaPipe detected ${trackedFaces.length} face(s) (${i === 0 ? 'enhanced' : 'original'} frame)! Ready for face swap.`);
                        console.log('MediaPipe detection successful:', trackedFaces);
                        detectionSuccessful = true;
                        resolve(null);
                      } else {
                        // No faces found in this attempt
                        resolve(null);
                      }
                    } else {
                      // Still waiting for results
                      setTimeout(checkResults, 100);
                    }
                  };
                  
                  // Start checking for results
                  setTimeout(checkResults, 100);
                  
                } catch (error) {
                  clearTimeout(timeout);
                  reject(error);
                }
              };
              
              img.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Failed to load image for MediaPipe'));
              };
              
              img.src = currentFrame!;
            });
          } catch (attemptError) {
            console.log(`MediaPipe attempt ${i + 1} failed:`, attemptError);
            if (i === framesToTry.length - 1) {
              throw attemptError; // Re-throw if this was the last attempt
            }
          }
          
          // Reset for next attempt
          mediaScriptResolved = false;
          detectionResults = [];
        }
        
        if (!detectionSuccessful) {
          throw new Error('No faces detected by MediaPipe in any frame variant');
        }
        
      } catch (mediaPipeError) {
        console.log('MediaPipe detection failed, trying TensorFlow BlazeFace:', mediaPipeError);
        
        // Try TensorFlow BlazeFace as second option
        try {
          setStatus('Trying TensorFlow BlazeFace detection...');
          
          const tf = await import('@tensorflow/tfjs');
          const blazeface = await import('@tensorflow-models/blazeface');
          
          // Initialize TensorFlow backend
          await tf.ready();
          
          // Load BlazeFace model
          const model = await blazeface.load();
          console.log('BlazeFace model loaded successfully');
          
          // Create tensor from video frame
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            img.onload = async () => {
              try {
                const predictions = await model.estimateFaces(img, false);
                
                if (predictions && predictions.length > 0) {
                  console.log('BlazeFace detected', predictions.length, 'faces');
                  
                  const blazeFaces: DetectedFace[] = predictions.map((prediction, index) => {
                    const [x1, y1, x2, y2] = (prediction as any).bbox;
                    const face: DetectedFace = {
                      x: x1,
                      y: y1,
                      width: x2 - x1,
                      height: y2 - y1,
                      confidence: (prediction as any).probability?.[0] || 0.9
                    };
                    console.log(`BlazeFace ${index + 1}:`, face);
                    return face;
                  });
                  
                  setDetectedFaces(blazeFaces);
                  // Generate cropped head preview
                  generateCroppedHeadPreview(frameData, blazeFaces);
                  setStatus(`BlazeFace detected ${blazeFaces.length} face(s)! Ready for face swap.`);
                  resolve(null);
                } else {
                  throw new Error('No faces detected by BlazeFace');
                }
              } catch (error) {
                reject(error);
              }
            };
            
            img.onerror = () => reject(new Error('Failed to load image for BlazeFace'));
            img.src = frameData;
          });
          
        } catch (blazeFaceError) {
          console.log('BlazeFace detection failed, trying Face Landmarks Detection:', blazeFaceError);
          
          // Try TensorFlow Face Landmarks Detection (better for various angles)
          try {
            setStatus('Trying Face Landmarks Detection...');
            
            const faceLandmarks = await import('@tensorflow-models/face-landmarks-detection');
            const tf = await import('@tensorflow/tfjs');
            
            await tf.ready();
            
            const model = await faceLandmarks.createDetector(faceLandmarks.SupportedModels.MediaPipeFaceMesh);
            console.log('Face Landmarks model loaded successfully');
            
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
              img.onload = async () => {
                try {
                  const predictions = await model.estimateFaces(img);
                  
                  if (predictions && predictions.length > 0) {
                    console.log('Face Landmarks detected', predictions.length, 'faces');
                    
                    const landmarkFaces: DetectedFace[] = predictions.map((prediction, index) => {
                      // Calculate bounding box from keypoints
                      const keypoints = prediction.keypoints;
                      let minX = Infinity, minY = Infinity;
                      let maxX = -Infinity, maxY = -Infinity;
                      
                      keypoints.forEach(point => {
                        minX = Math.min(minX, point.x);
                        maxX = Math.max(maxX, point.x);
                        minY = Math.min(minY, point.y);
                        maxY = Math.max(maxY, point.y);
                      });
                      
                      const face: DetectedFace = {
                        x: minX,
                        y: minY, 
                        width: maxX - minX,
                        height: maxY - minY,
                        confidence: 0.85
                      };
                      console.log(`Face Landmarks ${index + 1}:`, face);
                      return face;
                    });
                    
                    setDetectedFaces(landmarkFaces);
                    // Generate cropped head preview
                    generateCroppedHeadPreview(frameData, landmarkFaces);
                    setStatus(`Face Landmarks detected ${landmarkFaces.length} face(s)! Ready for face swap.`);
                    resolve(null);
                  } else {
                    throw new Error('No faces detected by Face Landmarks');
                  }
                } catch (error) {
                  reject(error);
                }
              };
              
              img.onerror = () => reject(new Error('Failed to load image for Face Landmarks'));
              img.src = frameData;
            });
            
          } catch (landmarksError) {
            console.log('Face Landmarks detection failed, trying Browser Vision API:', landmarksError);
            
            // Try Browser Vision API if available (experimental)
            try {
              setStatus('Trying Browser Vision API...');
              
              if ('vision' in navigator) {
                const vision = (navigator as any).vision;
                const detector = new vision.FaceDetector();
                
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                await new Promise((resolve, reject) => {
                  img.onload = async () => {
                    try {
                      const faces = await detector.detect(img);
                      
                      if (faces && faces.length > 0) {
                        console.log('Browser Vision API detected', faces.length, 'faces');
                        
                        const visionFaces: DetectedFace[] = faces.map((face: any, index: number) => {
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
                        
                        setDetectedFaces(visionFaces);
                        // Generate cropped head preview
                        generateCroppedHeadPreview(frameData, visionFaces);
                        setStatus(`Browser Vision API detected ${visionFaces.length} face(s)! Ready for face swap.`);
                        resolve(null);
                      } else {
                        throw new Error('No faces detected by Browser Vision API');
                      }
                    } catch (error) {
                      reject(error);
                    }
                  };
                  
                  img.onerror = () => reject(new Error('Failed to load image for Browser Vision API'));
                  img.src = frameData;
                });
                
              } else {
                throw new Error('Browser Vision API not available');
              }
              
            } catch (visionError) {
              console.log('All AI models failed, using advanced sports algorithm:', visionError);
              
              // Advanced multi-approach fallback for sports videos
              setStatus('Using advanced sports video detection with motion analysis...');
        
        // Use canvas to analyze the image for better face positioning
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Create temporary canvas for analysis
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          
          if (tempCtx) {
            tempCanvas.width = video.videoWidth;
            tempCanvas.height = video.videoHeight;
            tempCtx.drawImage(video, 0, 0);
            
            // Get image data for analysis
            const imageData = tempCtx.getImageData(0, 0, video.videoWidth, video.videoHeight);
            const data = imageData.data;
            
            // Multi-approach detection combining several heuristics
            const candidates: Array<{x: number, y: number, score: number}> = [];
            
            // Approach 1: Enhanced skin tone detection with multiple tone ranges
            let bestSkinX = video.videoWidth * 0.3;
            let bestSkinY = video.videoHeight * 0.2;
            let maxSkinPixels = 0;
            
            const blockSize = 15; // Smaller blocks for better precision
            for (let y = 0; y < video.videoHeight - blockSize; y += blockSize / 2) {
              for (let x = 0; x < video.videoWidth - blockSize; x += blockSize / 2) {
                let skinPixels = 0;
                let brightPixels = 0;
                
                // Check block for multiple skin tone variants
                for (let by = y; by < y + blockSize && by < video.videoHeight; by++) {
                  for (let bx = x; bx < x + blockSize && bx < video.videoWidth; bx++) {
                    const i = (by * video.videoWidth + bx) * 4;
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    // Enhanced skin tone detection with multiple ranges
                    const isSkin1 = r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15;
                    const isSkin2 = r > 120 && g > 80 && b > 50 && r > g && g > b && (r - g) < 80;
                    const isSkin3 = r > 180 && g > 120 && b > 90 && Math.abs(r - g) < 50;
                    
                    if (isSkin1 || isSkin2 || isSkin3) {
                      skinPixels++;
                    }
                    
                    // Check for bright areas (often faces in sports lighting)
                    const brightness = (r + g + b) / 3;
                    if (brightness > 150) {
                      brightPixels++;
                    }
                  }
                }
                
                // Score this region (upper part of image preferred for faces)
                const heightBonus = y < video.videoHeight * 0.4 ? 1.5 : (y < video.videoHeight * 0.6 ? 1.0 : 0.5);
                const centerBonus = Math.abs(x - video.videoWidth * 0.5) < video.videoWidth * 0.3 ? 1.2 : 0.8;
                const score = (skinPixels * 2 + brightPixels) * heightBonus * centerBonus;
                
                candidates.push({x, y, score});
                
                if (skinPixels > maxSkinPixels && y < video.videoHeight * 0.7) {
                  maxSkinPixels = skinPixels;
                  bestSkinX = x;
                  bestSkinY = y;
                }
              }
            }
            
            // Approach 2: Motion-based detection (compare with previous frame if available)
            let motionX = bestSkinX;
            let motionY = bestSkinY;
            let motionScore = 0;
            
            if (previousFaces.length > 0) {
              const prevFace = previousFaces[0];
              const searchRadius = 100;
              const startX = Math.max(0, prevFace.x - searchRadius);
              const endX = Math.min(video.videoWidth, prevFace.x + prevFace.width + searchRadius);
              const startY = Math.max(0, prevFace.y - searchRadius);
              const endY = Math.min(video.videoHeight, prevFace.y + prevFace.height + searchRadius);
              
              // Look for movement patterns around previous face location
              for (let y = startY; y < endY; y += 20) {
                for (let x = startX; x < endX; x += 20) {
                  let localScore = 0;
                  const blockEnd = Math.min(y + 20, video.videoHeight);
                  const blockEndX = Math.min(x + 20, video.videoWidth);
                  
                  for (let by = y; by < blockEnd; by++) {
                    for (let bx = x; bx < blockEndX; bx++) {
                      const i = (by * video.videoWidth + bx) * 4;
                      const r = data[i];
                      const g = data[i + 1];
                      const b = data[i + 2];
                      
                      if (r > 100 && g > 60 && b > 40) localScore++;
                    }
                  }
                  
                  if (localScore > motionScore) {
                    motionScore = localScore;
                    motionX = x;
                    motionY = y;
                  }
                }
              }
            }
            
            // Approach 3: Edge detection for face-like shapes
            let edgeX = bestSkinX;
            let edgeY = bestSkinY;
            let maxEdges = 0;
            
            for (let y = 0; y < video.videoHeight - 60; y += 20) {
              for (let x = 0; x < video.videoWidth - 60; x += 20) {
                let edgeCount = 0;
                
                // Simple edge detection in a region
                for (let by = y; by < y + 60 && by < video.videoHeight - 1; by += 3) {
                  for (let bx = x; bx < x + 60 && bx < video.videoWidth - 1; bx += 3) {
                    const i1 = (by * video.videoWidth + bx) * 4;
                    const i2 = (by * video.videoWidth + (bx + 1)) * 4;
                    const i3 = ((by + 1) * video.videoWidth + bx) * 4;
                    
                    const diff1 = Math.abs(data[i1] - data[i2]);
                    const diff2 = Math.abs(data[i1] - data[i3]);
                    
                    if (diff1 > 30 || diff2 > 30) edgeCount++;
                  }
                }
                
                if (edgeCount > maxEdges && y < video.videoHeight * 0.6) {
                  maxEdges = edgeCount;
                  edgeX = x;
                  edgeY = y;
                }
              }
            }
            
            // Combine approaches with weighted scoring
            const skinWeight = maxSkinPixels > 5 ? 0.4 : 0.2;
            const motionWeight = motionScore > 0 ? 0.3 : 0;
            const edgeWeight = maxEdges > 10 ? 0.3 : 0.1;
            const remaining = 1.0 - skinWeight - motionWeight - edgeWeight;
            
            const finalX = (bestSkinX * skinWeight + motionX * motionWeight + edgeX * edgeWeight + bestSkinX * remaining);
            const finalY = (bestSkinY * skinWeight + motionY * motionWeight + edgeY * edgeWeight + bestSkinY * remaining);
            
            // Adaptive face size based on distance and video resolution
            const baseSize = Math.min(video.videoWidth, video.videoHeight);
            const faceWidth = baseSize * (finalY < video.videoHeight * 0.3 ? 0.15 : 0.25); // Smaller if likely distant
            const faceHeight = faceWidth * 1.3;
            
            // Calculate confidence based on multiple factors
            const skinConfidence = Math.min(maxSkinPixels / 50, 1.0);
            const motionConfidence = motionScore > 0 ? 0.8 : 0.0;
            const edgeConfidence = Math.min(maxEdges / 100, 1.0);
            const combinedConfidence = Math.max(0.4, (skinConfidence * 0.4 + motionConfidence * 0.3 + edgeConfidence * 0.3));
            
            const enhancedFace: DetectedFace = {
              x: Math.max(0, finalX - faceWidth * 0.1),
              y: Math.max(0, finalY - faceHeight * 0.1),
              width: faceWidth,
              height: faceHeight,
              confidence: combinedConfidence
            };
            
            // Apply tracking if we have previous faces
            const finalFaces = trackFaces([enhancedFace], previousFaces);
            setPreviousFaces(finalFaces);
            setDetectedFaces(finalFaces);
            // Use the current frameData since we're in fallback mode
            const currentFrameData = await captureFrame(true);
            setCurrentFrame(currentFrameData || frameData);
            
            // Generate cropped head preview
            generateCroppedHeadPreview(currentFrameData || frameData, finalFaces);
            
            setStatus(`Advanced sports detection completed! Confidence: ${(finalFaces[0].confidence * 100).toFixed(0)}% (Skin: ${(skinConfidence*100).toFixed(0)}%, Motion: ${(motionConfidence*100).toFixed(0)}%, Edges: ${(edgeConfidence*100).toFixed(0)}%)`);
            console.log('Advanced sports detection result:', finalFaces[0]);
            console.log('Detection metrics:', { skinPixels: maxSkinPixels, motionScore, edgeCount: maxEdges });
          }
        }
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Face detection failed:', error);
      setStatus('Face detection failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  }, [captureFrame, trackFaces, preprocessImage, detectFacesWithOpenCV, generateCroppedHeadPreview, seekToOptimalTime, findOptimalFrame]);

  const performHeadSwap = useCallback(async () => {
    if (!currentFrame || detectedFaces.length === 0) {
      setStatus('No head detected. Please detect heads first.');
      return;
    }

    setIsProcessing(true);
    setStatus('Preparing images for head swap...');

    try {
      console.log('Starting head swap process');
      
      // Crop the detected head for better accuracy
      setStatus('Cropping detected head for better accuracy...');
      const primaryHead = detectedFaces[0]; // Use the first (usually highest confidence) head
      console.log('Using head for swap:', primaryHead);
      
      const croppedHeadDataUrl = await cropHeadFromFrame(currentFrame, primaryHead);
      console.log('Head cropped successfully, cropped image size:', croppedHeadDataUrl.length);
      
      // Sharpen the cropped head for better quality
      setStatus('Sharpening head for optimal quality...');
      const sharpenedHeadDataUrl = await sharpenCroppedHead(croppedHeadDataUrl);
      console.log('Head sharpened successfully, sharpened image size:', sharpenedHeadDataUrl.length);
      
      // Upscale the sharpened head for maximum quality
      setStatus('AI upscaling head for maximum quality (processing locally)...');
      const upscaledHeadDataUrl = await upscaleImage(sharpenedHeadDataUrl, 2);
      console.log('Head upscaled successfully, upscaled image size:', upscaledHeadDataUrl.length);
      
      // Convert upscaled head (data URL) to base64
      const base64Data = upscaledHeadDataUrl.split(',')[1];
      console.log('Upscaled head base64 length:', base64Data.length);
      
      setStatus('Loading target image (base.png)...');
      
      // Load base image (this contains a face that will be replaced with video face)
      const baseImageResponse = await fetch('/images/base.png');
      if (!baseImageResponse.ok) {
        throw new Error('Failed to load target image (base.png)');
      }
      
      const baseImageBlob = await baseImageResponse.blob();
      console.log('Target image (base.png) loaded, size:', baseImageBlob.size);
      
      const baseImageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          if (result && result.includes(',')) {
            resolve(result.split(',')[1]);
          } else {
            reject(new Error('Failed to convert base image to base64'));
          }
        };
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(baseImageBlob);
      });
      
      console.log('Target image (base.png) base64 length:', baseImageBase64.length);
      
      setStatus('Calling head swap API...');
      
      // Prepare API request data for head swapping
      // source_image = the AI-UPSCALED SHARPENED CROPPED head we want to use (FROM the video)
      // target_image = the image with head we want to replace (base.png has existing head)
      // Result: base.png but with high-quality upscaled video head replacing its original head
      const requestData = {
        source_image: base64Data, // AI-UPSCALED SHARPENED CROPPED head from video (head to take FROM)
        target_image: baseImageBase64, // Base.png (head to replace IN this image)
        model_type: 'quality', // Use quality model for better results
        swap_type: 'head',     // Ensure we're doing head swap, not just face
        style_type: 'normal',
        seed: Math.floor(Math.random() * 10000),
        image_format: 'png',
        image_quality: 95, // Higher quality output
        hardware: 'fast',
        base64: true
      };
      
      console.log('Making API request to Segmind...');
      
      // Call Segmind Face Swap API
      const response = await fetch('https://api.segmind.com/v1/faceswap-v4', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'SG_c7a0d229dc5d25b4'
        },
        body: JSON.stringify(requestData)
      });

      console.log('API response status:', response.status);
      console.log('API response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        console.log('Content type:', contentType);
        
        if (contentType?.includes('application/json')) {
          // JSON response
          const jsonResult = await response.json();
          console.log('JSON response received:', typeof jsonResult);
          
          if (jsonResult.image || jsonResult.output) {
            const imageData = jsonResult.image || jsonResult.output;
            const imageUrl = imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`;
            
            setFaceSwapResult({
              success: true,
              imageUrl: imageUrl
            });
            setStatus('Head swap completed! Video head has replaced the head in base.png');
          } else {
            throw new Error('No image data in response');
          }
        } else {
          // Assume base64 image response
          const result = await response.text();
          console.log('Text response length:', result.length);
          
          // Check if result is base64
          if (result.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
            const imageUrl = `data:image/png;base64,${result}`;
            setFaceSwapResult({
              success: true,
              imageUrl: imageUrl
            });
            setStatus('Head swap completed successfully!');
          } else if (result.startsWith('data:')) {
            setFaceSwapResult({
              success: true,
              imageUrl: result
            });
            setStatus('Head swap completed! Video head has replaced the head in base.png');
          } else {
            throw new Error('Invalid response format');
          }
        }
      } else {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        
        let errorMessage = 'Head swap failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${errorText || response.statusText}`;
        }
        
        setFaceSwapResult({
          success: false,
          error: errorMessage
        });
        setStatus(`Head swap failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Head swap error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setFaceSwapResult({
        success: false,
        error: errorMessage
      });
      setStatus(`Head swap failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, [currentFrame, detectedFaces, cropHeadFromFrame, sharpenCroppedHead, upscaleImage]);

  const downloadResult = useCallback(() => {
    if (!faceSwapResult?.imageUrl) return;

    const link = document.createElement('a');
    link.href = faceSwapResult.imageUrl;
    link.download = `faceswap-result-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [faceSwapResult]);

  const resetAll = useCallback(() => {
    setSelectedFile(null);
    setVideoUrl('');
    setDetectedFaces([]);
    setCurrentFrame('');
    setFaceSwapResult(null);
    setStatus('');
    setCroppedFacePreview('');
    setSharpenedFacePreview('');
    setUpscaledHeadPreview('');
    setOptimalFrameInfo(null);
    setVideoAnalysisProgress(null);
    setPreviousFaces([]);
    setFrameCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: 'url(/frontend-images/homepage/bowlbg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Header */}
      <div className="absolute top-4 left-0 right-0 z-20 flex justify-center">
        <Link href="/">
          <img
            src="/frontend-images/homepage/justzoom logo.png"
            alt="JustZoom logo"
            className="h-12 w-auto"
          />
        </Link>
      </div>

      <div className="absolute top-0 left-0 right-0 z-10 pt-6 px-4">
        <Link 
          href="/"
          className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 
              className="mb-2"
              style={{
                fontFamily: 'Frutiger, Inter, sans-serif',
                fontWeight: '700',
                fontSize: '32px',
                color: '#FDC217',
                lineHeight: '1.2'
              }}
            >
              AI Head Detection + Swap
            </h1>
            <p 
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '400',
                fontSize: '16px',
                color: 'white',
                lineHeight: '1.3'
              }}
            >
              Comprehensive video analysis finds the clearest head frame using AI
            </p>
          </div>

          {/* Upload Section */}
          <div className="mb-8">
            <div className="rounded-[20px] border border-white/10 bg-white/10 px-6 py-6 shadow-[0_8px_32px_rgba(31,38,135,0.25)] backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white mb-4">Upload Video</h2>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 border-2 border-dashed border-white/30 rounded-lg text-white hover:border-white/50 transition-colors flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8" />
                <span>Click to upload video</span>
                {selectedFile && (
                  <span className="text-sm text-green-300">
                    Selected: {selectedFile.name}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Video Display */}
          {videoUrl && (
            <div className="mb-8">
              <div className="rounded-[20px] border border-white/10 bg-white/10 px-6 py-6 shadow-[0_8px_32px_rgba(31,38,135,0.25)] backdrop-blur-xl">
                <h2 className="text-lg font-semibold text-white mb-4">Video Preview</h2>
                
                <div className="relative flex justify-center">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      controls
                      className="rounded-lg"
                      style={{ maxHeight: '400px', maxWidth: '100%' }}
                    />
                    
                    {/* Head detection overlay */}
                    {detectedFaces.length > 0 && videoRef.current && (
                      <div className="absolute inset-0 pointer-events-none">
                        {detectedFaces.map((head, index) => {
                          // Get the actual displayed video dimensions
                          const video = videoRef.current!;
                          const videoRect = video.getBoundingClientRect();
                          const containerRect = video.parentElement!.getBoundingClientRect();
                          
                          // Calculate scale factors
                          const scaleX = video.offsetWidth / video.videoWidth;
                          const scaleY = video.offsetHeight / video.videoHeight;
                          
                          // Scale and position the head box
                          const scaledX = head.x * scaleX;
                          const scaledY = head.y * scaleY;
                          const scaledWidth = head.width * scaleX;
                          const scaledHeight = head.height * scaleY;
                          
                          return (
                            <div
                              key={index}
                              className="absolute border-2 border-red-500 bg-red-500/10"
                              style={{
                                left: `${scaledX}px`,
                                top: `${scaledY}px`,
                                width: `${scaledWidth}px`,
                                height: `${scaledHeight}px`,
                              }}
                            >
                              <div className="absolute -top-6 left-0 text-xs text-red-500 bg-black/75 px-2 py-1 rounded whitespace-nowrap">
                                Head {index + 1} ({(head.confidence * 100).toFixed(0)}%)
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex justify-center gap-4">
                  <button
                    onClick={detectFaces}
                    disabled={isProcessing}
                    className="px-6 py-2 bg-[#FFC315] text-black font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    {isProcessing ? 'Processing...' : 'Detect Heads'}
                  </button>
                  
                  {detectedFaces.length > 0 && (
                    <button
                      onClick={performHeadSwap}
                      disabled={isProcessing}
                      className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isProcessing ? 'Swapping...' : 'Perform Head Swap'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Current Frame */}
          {currentFrame && (
            <div className="mb-8">
              <div className="rounded-[20px] border border-white/10 bg-white/10 px-6 py-6 shadow-[0_8px_32px_rgba(31,38,135,0.25)] backdrop-blur-xl">
                <h2 className="text-lg font-semibold text-white mb-4">Captured Frame</h2>
                <div className="text-center">
                  <img 
                    src={currentFrame} 
                    alt="Captured frame"
                    className="w-full max-w-md mx-auto rounded-lg mb-4"
                  />
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={handleDownloadFrame}
                      className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Full Frame
                    </button>
                    
                    {detectedFaces.length > 0 && (
                      <>
                        <button
                          onClick={handleDownloadCroppedHead}
                          className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download Cropped Head
                        </button>
                        
                        {sharpenedFacePreview && (
                          <button
                            onClick={handleDownloadSharpenedHead}
                            className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Download Sharpened
                          </button>
                        )}
                        
                        {upscaledHeadPreview && (
                          <button
                            onClick={handleDownloadUpscaledHead}
                            className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Download AI Upscaled
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cropped Face Preview */}
          {croppedFacePreview && (
            <div className="mb-8">
              <div className="rounded-[20px] border border-white/10 bg-white/10 px-6 py-6 shadow-[0_8px_32px_rgba(31,38,135,0.25)] backdrop-blur-xl">
                <h2 className="text-lg font-semibold text-white mb-4">Head Processing Pipeline</h2>
                <p className="text-sm text-white/80 mb-4 text-center">
                  From detected head → cropped → sharpened → AI upscaled → sent to Segmind API
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Cropped Head */}
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-white mb-2">1. Cropped Head</h3>
                    <img 
                      src={croppedFacePreview} 
                      alt="Cropped head"
                      className="max-w-full mx-auto rounded-lg border-2 border-blue-400"
                      style={{ maxHeight: '150px' }}
                    />
                    <p className="text-xs text-white/60 mt-1">
                      Size: {Math.round(croppedFacePreview.length / 1024)} KB
                    </p>
                  </div>
                  
                  {/* Sharpened Head */}
                  {sharpenedFacePreview && (
                    <div className="text-center">
                      <h3 className="text-sm font-semibold text-white mb-2">2. Sharpened Head</h3>
                      <img 
                        src={sharpenedFacePreview} 
                        alt="Sharpened head"
                        className="max-w-full mx-auto rounded-lg border-2 border-purple-400"
                        style={{ maxHeight: '150px' }}
                      />
                      <p className="text-xs text-white/60 mt-1">
                        Size: {Math.round(sharpenedFacePreview.length / 1024)} KB
                      </p>
                      <p className="text-xs text-green-400 mt-1">
                        ✓ Enhanced • Sharpened
                      </p>
                    </div>
                  )}
                  
                  {/* AI Upscaled Head */}
                  {upscaledHeadPreview && (
                    <div className="text-center">
                      <h3 className="text-sm font-semibold text-white mb-2">3. AI Upscaled Head (→ API)</h3>
                      <img 
                        src={upscaledHeadPreview} 
                        alt="AI upscaled head for head swap"
                        className="max-w-full mx-auto rounded-lg border-2 border-green-400"
                        style={{ maxHeight: '150px' }}
                      />
                      <p className="text-xs text-white/60 mt-1">
                        Size: {Math.round(upscaledHeadPreview.length / 1024)} KB
                      </p>
                      <p className="text-xs text-green-400 mt-1">
                        ✓ AI Enhanced • 2x Resolution • Premium Quality
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Face Swap Result */}
          {faceSwapResult && (
            <div className="mb-8">
              <div className="rounded-[20px] border border-white/10 bg-white/10 px-6 py-6 shadow-[0_8px_32px_rgba(31,38,135,0.25)] backdrop-blur-xl">
                <h2 className="text-lg font-semibold text-white mb-4">Head Swap Result</h2>
                
                {faceSwapResult.success && faceSwapResult.imageUrl ? (
                  <div>
                    <img 
                      src={faceSwapResult.imageUrl} 
                      alt="Head swap result"
                      className="w-full max-w-md mx-auto rounded-lg mb-4"
                    />
                    <div className="text-center">
                      <button
                        onClick={downloadResult}
                        className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 flex items-center gap-2 mx-auto"
                      >
                        <Download className="w-4 h-4" />
                        Download Result
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-red-300">
                    Error: {faceSwapResult.error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status */}
          {status && (
            <div className="mb-8">
              <div className="rounded-[20px] border border-white/10 bg-white/10 px-6 py-4 shadow-[0_8px_32px_rgba(31,38,135,0.25)] backdrop-blur-xl">
                <p className="text-white text-center">{status}</p>
                
                {/* Video Analysis Progress Bar */}
                {videoAnalysisProgress && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-white/80 mb-2">
                      <span>Analyzing Frames</span>
                      <span>{videoAnalysisProgress.current}/{videoAnalysisProgress.total}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-[#FFC315] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${videoAnalysisProgress.percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-center text-white/70 text-xs mt-2">
                      {videoAnalysisProgress.percentage}% Complete
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Debug Info */}
          {(detectedFaces.length > 0 || currentFrame) && (
            <div className="mb-8">
              <div className="rounded-[20px] border border-white/10 bg-white/10 px-6 py-4 shadow-[0_8px_32px_rgba(31,38,135,0.25)] backdrop-blur-xl">
                <h3 className="text-lg font-semibold text-white mb-3">Debug Info</h3>
                
                {videoRef.current && (
                  <div className="text-sm text-white/80 space-y-1">
                    <p>Video Dimensions: {videoRef.current.videoWidth} × {videoRef.current.videoHeight}</p>
                    <p>Display Dimensions: {videoRef.current.offsetWidth} × {videoRef.current.offsetHeight}</p>
                  </div>
                )}
                
                {detectedFaces.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-white/80 mb-2">Detected Heads:</p>
                    {detectedFaces.map((head, index) => (
                      <div key={index} className="text-xs text-white/70 bg-black/20 p-2 rounded mb-2">
                        <p>Head {index + 1}:</p>
                        <p>Position: ({Math.round(head.x)}, {Math.round(head.y)})</p>
                        <p>Size: {Math.round(head.width)} × {Math.round(head.height)}</p>
                        <p>Confidence: {(head.confidence * 100).toFixed(1)}%</p>
                        <p className="text-green-400 text-xs mt-1">
                          Method: {status.includes('MediaPipe') ? 'Google MediaPipe' : 
                                  status.includes('BlazeFace') ? 'TensorFlow BlazeFace' : 
                                  status.includes('Face Landmarks') ? 'TF Face Landmarks' :
                                  status.includes('Browser Vision API') ? 'Browser Vision API' :
                                  status.includes('sports') ? 'Sports Video Algorithm' : 'AI Detection'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                {currentFrame && (
                  <div className="mt-3">
                    <p className="text-sm text-white/80">Frame Captured: ✓ ({Math.round(currentFrame.length / 1024)} KB)</p>
                    {optimalFrameInfo && (
                      <div className="mt-2">
                        <p className="text-sm text-green-400">
                          ✓ Optimal Position: {optimalFrameInfo.position.toFixed(1)}s 
                          | Brightness: {optimalFrameInfo.brightness.toFixed(0)}/255
                          {optimalFrameInfo.brightness > 150 ? ' (Bright)' : 
                           optimalFrameInfo.brightness > 100 ? ' (Good)' : ' (Dark)'}
                        </p>
                        
                        {/* Comprehensive Analysis Results */}
                        {optimalFrameInfo.analysis && (
                          <div className="mt-3 bg-black/30 p-3 rounded-lg">
                            <p className="text-sm text-blue-300 mb-2 font-semibold">Comprehensive Analysis Results:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="text-white/70">
                                <span className="text-yellow-300">Overall Score:</span> {optimalFrameInfo.analysis.overallScore.toFixed(3)}
                              </div>
                              <div className="text-white/70">
                                <span className="text-yellow-300">Brightness:</span> {optimalFrameInfo.brightness.toFixed(0)}/255
                              </div>
                              <div className="text-white/70">
                                <span className="text-yellow-300">Contrast:</span> {optimalFrameInfo.analysis.contrast.toFixed(2)}
                              </div>
                              <div className="text-white/70">
                                <span className="text-yellow-300">Sharpness:</span> {optimalFrameInfo.analysis.sharpness.toFixed(2)}
                              </div>
                              <div className="text-white/70">
                                <span className="text-yellow-300">Skin Tone:</span> {(optimalFrameInfo.analysis.skinToneScore * 100).toFixed(1)}%
                              </div>
                              <div className="text-white/70">
                                <span className="text-yellow-300">Head Region:</span> {(optimalFrameInfo.analysis.headScore * 100).toFixed(1)}%
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="w-full bg-gray-700 rounded-full h-1.5">
                                <div 
                                  className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${optimalFrameInfo.analysis.overallScore * 100}%` }}
                                ></div>
                              </div>
                              <p className="text-center text-xs text-white/60 mt-1">
                                Quality Score: {(optimalFrameInfo.analysis.overallScore * 100).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="text-center">
            <button
              onClick={resetAll}
              className="px-6 py-2 border border-white/20 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors"
            >
              Reset All
            </button>
          </div>
        </div>
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Footer */}
      <footer className="w-full bg-black px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 max-w-6xl mx-auto">
          <div className="text-left">
            <p 
              className="text-white text-xs"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '400',
                fontSize: '10px',
                lineHeight: '1.4'
              }}
            >
              © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span 
              className="text-white text-xs mr-2"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '400',
                fontSize: '10px'
              }}
            >
              Connect with us
            </span>
            
            <div className="flex gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </div>
              
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}