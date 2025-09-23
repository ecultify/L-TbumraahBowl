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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load face detection - we'll use a simpler approach for this demo
  useEffect(() => {
    setStatus('Face detection ready - using built-in browser APIs');
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

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const detectFaces = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setStatus('Detecting faces...');

    try {
      const frameData = await captureFrame();
      if (!frameData) {
        setStatus('Failed to capture frame');
        return;
      }

      setCurrentFrame(frameData);

      // For this demo, we'll use a simple approach:
      // 1. Try to use browser's native FaceDetector API (if available)
      // 2. Otherwise, simulate face detection in center of frame
      
      try {
        // Check if browser supports Face Detection API
        if ('FaceDetector' in window) {
          const faceDetector = new (window as any).FaceDetector();
          const image = new Image();
          image.src = frameData;
          
          await new Promise((resolve) => {
            image.onload = async () => {
              try {
                const faces = await faceDetector.detect(image);
                if (faces.length > 0) {
                  const detectedFaces: DetectedFace[] = faces.map((face: any) => ({
                    x: face.boundingBox.x,
                    y: face.boundingBox.y,
                    width: face.boundingBox.width,
                    height: face.boundingBox.height,
                    confidence: 0.9
                  }));
                  setDetectedFaces(detectedFaces);
                  setStatus(`Detected ${faces.length} face(s) using browser API`);
                } else {
                  throw new Error('No faces detected by browser API');
                }
              } catch (e) {
                throw e;
              }
              resolve(null);
            };
          });
        } else {
          throw new Error('Browser FaceDetector not available');
        }
      } catch (error) {
        console.log('Browser face detection not available, using simulated detection:', error);
        
        // Fallback: simulate face detection in center of video
        const video = videoRef.current;
        const centerX = video.videoWidth * 0.3;
        const centerY = video.videoHeight * 0.2;
        const faceWidth = Math.min(video.videoWidth * 0.4, video.videoHeight * 0.6);
        const faceHeight = faceWidth * 1.3; // Face is typically taller than wide
        
        setDetectedFaces([{
          x: centerX,
          y: centerY,
          width: faceWidth,
          height: faceHeight,
          confidence: 0.85
        }]);
        setStatus('Using simulated face detection (center of frame)');
      }
    } catch (error) {
      console.error('Face detection failed:', error);
      setStatus('Face detection failed');
    } finally {
      setIsProcessing(false);
    }
  }, [captureFrame]);

  const performFaceSwap = useCallback(async () => {
    if (!currentFrame || detectedFaces.length === 0) {
      setStatus('No face detected. Please detect faces first.');
      return;
    }

    setIsProcessing(true);
    setStatus('Performing face swap...');

    try {
      // Convert currentFrame (data URL) to base64
      const base64Data = currentFrame.split(',')[1];
      
      // Load base image
      const baseImageResponse = await fetch('/images/base.png');
      const baseImageBlob = await baseImageResponse.blob();
      const baseImageBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(baseImageBlob);
      });

      // Call Segmind Face Swap API
      const response = await fetch('https://api.segmind.com/v1/faceswap-v4', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'SG_c7a0d229dc5d25b4'
        },
        body: JSON.stringify({
          source_image: baseImageBase64,
          target_image: base64Data,
          model_type: 'speed',
          swap_type: 'head',
          style_type: 'normal',
          seed: Math.floor(Math.random() * 10000),
          image_format: 'png',
          image_quality: 90,
          hardware: 'fast',
          base64: true
        })
      });

      if (response.ok) {
        const result = await response.text();
        
        // Check if result is base64
        if (result.startsWith('data:') || result.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
          const imageUrl = result.startsWith('data:') ? result : `data:image/png;base64,${result}`;
          setFaceSwapResult({
            success: true,
            imageUrl: imageUrl
          });
          setStatus('Face swap completed successfully!');
        } else {
          // Result might be a URL
          setFaceSwapResult({
            success: true,
            imageUrl: result
          });
          setStatus('Face swap completed successfully!');
        }
      } else {
        const errorData = await response.json();
        setFaceSwapResult({
          success: false,
          error: errorData.message || 'Face swap failed'
        });
        setStatus(`Face swap failed: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Face swap error:', error);
      setFaceSwapResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setStatus('Face swap failed due to network or API error');
    } finally {
      setIsProcessing(false);
    }
  }, [currentFrame, detectedFaces]);

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
              Face Swap Test
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
              Upload a video, detect faces, and swap with base image
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
                
                <div className="relative">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    className="w-full max-w-md mx-auto rounded-lg"
                    style={{ maxHeight: '400px' }}
                  />
                  
                  {/* Face detection overlay */}
                  {detectedFaces.length > 0 && (
                    <div className="absolute inset-0 pointer-events-none">
                      {detectedFaces.map((face, index) => (
                        <div
                          key={index}
                          className="absolute border-2 border-red-500"
                          style={{
                            left: face.x,
                            top: face.y,
                            width: face.width,
                            height: face.height
                          }}
                        >
                          <div className="absolute -top-6 left-0 text-xs text-red-500 bg-black/50 px-1 rounded">
                            Face {index + 1} ({(face.confidence * 100).toFixed(0)}%)
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-center gap-4">
                  <button
                    onClick={detectFaces}
                    disabled={isProcessing}
                    className="px-6 py-2 bg-[#FFC315] text-black font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    {isProcessing ? 'Processing...' : 'Detect Faces'}
                  </button>
                  
                  {detectedFaces.length > 0 && (
                    <button
                      onClick={performFaceSwap}
                      disabled={isProcessing}
                      className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isProcessing ? 'Swapping...' : 'Perform Face Swap'}
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
                <img 
                  src={currentFrame} 
                  alt="Captured frame"
                  className="w-full max-w-md mx-auto rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Face Swap Result */}
          {faceSwapResult && (
            <div className="mb-8">
              <div className="rounded-[20px] border border-white/10 bg-white/10 px-6 py-6 shadow-[0_8px_32px_rgba(31,38,135,0.25)] backdrop-blur-xl">
                <h2 className="text-lg font-semibold text-white mb-4">Face Swap Result</h2>
                
                {faceSwapResult.success && faceSwapResult.imageUrl ? (
                  <div>
                    <img 
                      src={faceSwapResult.imageUrl} 
                      alt="Face swap result"
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