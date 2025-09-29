'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAnalysis, FrameIntensity, AnalyzerMode } from '@/context/AnalysisContext';
import { AnalysisLoader } from '@/components/AnalysisLoader';
import { GlassBackButton } from '@/components/GlassBackButton';
import { PoseBasedAnalyzer } from '@/lib/analyzers/poseBased';
import { BenchmarkComparisonAnalyzer } from '@/lib/analyzers/benchmarkComparison';
import { FrameSampler } from '@/lib/video/frameSampler';
import { getFaceDetectionService, storeCroppedHeadImage } from '@/lib/utils/faceDetection';
import { getGeminiTorsoService, storeGeneratedTorsoImage } from '@/lib/utils/geminiService';
import { classifySpeed, intensityToKmh } from '@/lib/utils/normalize';

export default function VideoPreviewPage() {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<string>('00:00');
  const [fileName, setFileName] = useState<string>('');
  const [videoSource, setVideoSource] = useState<'record' | 'upload' | 'unknown'>('unknown');
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [fileSizeLabel, setFileSizeLabel] = useState<string | null>(null);
  const [isPortraitVideo, setIsPortraitVideo] = useState(false);
  const [hasAnalysisData, setHasAnalysisData] = useState(false);
  const [isFaceDetectionRunning, setIsFaceDetectionRunning] = useState(false);
  const { state, dispatch } = useAnalysis();
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameSamplerRef = useRef<FrameSampler | null>(null);
  const poseAnalyzerRef = useRef<PoseBasedAnalyzer>(new PoseBasedAnalyzer());
  const benchmarkAnalyzerRef = useRef<BenchmarkComparisonAnalyzer>(new BenchmarkComparisonAnalyzer());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Check if there's video data in sessionStorage (from upload)
    const storedVideoUrl = sessionStorage.getItem('uploadedVideoUrl');
    const storedVideoData = sessionStorage.getItem('uploadedVideoData');
    const storedFileName = sessionStorage.getItem('uploadedFileName');
    const storedSource = sessionStorage.getItem('uploadedSource');
    const storedMimeType = sessionStorage.getItem('uploadedMimeType');
    const storedFileSize = sessionStorage.getItem('uploadedFileSize');
    
    console.log('🔍 Video Preview: Checking available data...');
    console.log('📊 storedVideoUrl:', storedVideoUrl ? 'Available' : 'Missing');
    console.log('📊 storedVideoData:', storedVideoData ? `Available (${(storedVideoData.length / 1024).toFixed(1)}KB)` : 'Missing');
    console.log('📊 storedFileName:', storedFileName);
    console.log('📊 storedSource:', storedSource);

    // Recreate video URL from stored data if blob URL is invalid or missing
    const setupVideoUrl = async () => {
      // Strategy 1: Use temporary file reference (most reliable for same-session navigation)
      if (typeof window !== 'undefined' && (window as any).tempVideoFile) {
        try {
          const tempFile = (window as any).tempVideoFile;
          // Validate the file is still accessible
          if (tempFile instanceof File && tempFile.size > 0) {
            const newVideoUrl = URL.createObjectURL(tempFile);
            setVideoUrl(newVideoUrl);
            console.log('✅ Using temporary file reference to create fresh blob URL');
            return;
          }
        } catch (error) {
          console.error('❌ Error using temporary file reference:', error);
        }
      }
      
      // Strategy 2: Recreate from base64 data (most reliable for persistence)
      if (storedVideoData && storedVideoData.startsWith('data:')) {
        try {
          // Convert base64 data back to blob
          const response = await fetch(storedVideoData);
          const blob = await response.blob();
          if (blob.size > 0) {
            const newVideoUrl = URL.createObjectURL(blob);
            setVideoUrl(newVideoUrl);
            // Also store the temp file reference for consistency
            (window as any).tempVideoFile = new File([blob], storedFileName || 'video.mp4', {
              type: blob.type || 'video/mp4'
            });
            console.log('✅ Video URL recreated from stored base64 data');
            return;
          }
        } catch (error) {
          console.error('❌ Error recreating video URL from stored data:', error);
        }
      }
      
      // Strategy 3: Check file reference indicators
      if (storedVideoData === 'file-reference-available' || storedVideoData === 'file-reference-only') {
        if (typeof window !== 'undefined' && (window as any).tempVideoFile) {
          try {
            const tempFile = (window as any).tempVideoFile;
            const newVideoUrl = URL.createObjectURL(tempFile);
            setVideoUrl(newVideoUrl);
            console.log('✅ Using temp file from file reference indicator');
            return;
          } catch (error) {
            console.error('❌ Error using temp file from indicator:', error);
          }
        }
      }
      
      // Strategy 4: Test original blob URL validity (least reliable)
      if (storedVideoUrl && storedVideoUrl.startsWith('blob:')) {
        try {
          // Try to test the blob URL by creating a temporary video element
          const testVideo = document.createElement('video');
          testVideo.preload = 'metadata';
          
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Blob URL test timeout'));
            }, 5000);
            
            testVideo.addEventListener('loadedmetadata', () => {
              clearTimeout(timeout);
              setVideoUrl(storedVideoUrl!);
              console.log('✅ Original blob URL is still valid');
              resolve(true);
            }, { once: true });
            
            testVideo.addEventListener('error', (error) => {
              clearTimeout(timeout);
              reject(error);
            }, { once: true });
            
            testVideo.src = storedVideoUrl!;
          });
          
          return; // Success
        } catch (error) {
          console.log('🔄 Original blob URL is invalid:', error);
        }
      }
      
      // If all strategies failed, show error and redirect
      console.error('❌ No valid video data found - all recovery strategies failed');
      console.log('📊 Debug info:', {
        hasStoredVideoUrl: !!storedVideoUrl,
        hasStoredVideoData: !!storedVideoData,
        storedVideoDataLength: storedVideoData?.length || 0,
        hasTempFile: !!(typeof window !== 'undefined' && (window as any).tempVideoFile),
        storedVideoDataType: storedVideoData ? (storedVideoData.startsWith('data:') ? 'base64' : 'indicator') : 'none',
        sessionStorageKeys: Object.keys(sessionStorage)
      });
      
      // Show user-friendly error message
      if (typeof window !== 'undefined') {
        const shouldRetry = confirm('Video data was lost during navigation. Would you like to upload your video again?');
        if (shouldRetry) {
          window.location.href = '/record-upload';
        }
      }
    };

    if (storedVideoUrl || storedVideoData) {
      setupVideoUrl();
      
      if (storedSource === 'record' || storedSource === 'upload') {
        setVideoSource(storedSource);
      }

      if (storedMimeType) {
        setMimeType(storedMimeType);
      }

      if (storedFileSize) {
        const parsedSize = parseInt(storedFileSize, 10);
        if (!Number.isNaN(parsedSize)) {
          const sizeInMb = parsedSize / (1024 * 1024);
          setFileSizeLabel(`${sizeInMb.toFixed(2)} MB`);
        }
      }

      const fallbackName = storedSource === 'record' ? 'recording.webm' : 'uploaded-video.mp4';
      setFileName(storedFileName || fallbackName);
    } else {
      console.warn('⚠️ No video data found in sessionStorage');
      console.log('📊 Available sessionStorage keys:', Object.keys(sessionStorage));
      console.log('📊 Temporary file available:', !!(typeof window !== 'undefined' && (window as any).tempVideoFile));
    }

    // Check if analysis data exists and details are completed (user returning from details page)
    const analysisData = window.sessionStorage.getItem('analysisVideoData');
    const benchmarkData = window.sessionStorage.getItem('benchmarkDetailedData');
    const detailsCompleted = window.sessionStorage.getItem('detailsCompleted');
    if (analysisData && benchmarkData && detailsCompleted) {
      console.log('🔄 Found existing analysis data and completed details - showing View Analysis button');
      setHasAnalysisData(true);
    }

    // Cleanup function to remove sessionStorage when leaving the page
    return () => {
      // Optional: Clean up sessionStorage when component unmounts
      // sessionStorage.removeItem('uploadedVideoUrl');
      // sessionStorage.removeItem('uploadedFileName');
    };
  }, []);

  // Handle navigation after analysis completion with a delay to show the loader
  useEffect(() => {
    if (!state.isAnalyzing && state.progress === 100 && (state.finalIntensity > 0 || state.speedClass === 'No Action')) {
      console.log('🔄 Analysis completed - navigating to /analyze in 2 seconds...');
      const timer = setTimeout(() => {
        // Use replace instead of href to avoid back button issues
        window.location.replace('/analyze');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.isAnalyzing, state.progress, state.finalIntensity, state.speedClass]);

  const handleVideoLoadedMetadata = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const duration = video.duration;
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    setVideoDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    setIsPortraitVideo(video.videoHeight > video.videoWidth);
    console.log('✅ Video loaded successfully:', {
      duration: `${minutes}:${seconds}`,
      dimensions: `${video.videoWidth}x${video.videoHeight}`,
      orientation: video.videoHeight > video.videoWidth ? 'portrait' : 'landscape'
    });
  };
  
  const handleVideoError = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error('❌ Video failed to load:', event);
    if (typeof window !== 'undefined') {
      alert('Failed to load video. Please try uploading again.');
      window.location.href = '/record-upload';
    }
  };

  const startAnalysis = useCallback(async () => {
    if (!videoRef.current || !videoUrl) {
      console.error('No video available for analysis');
      return;
    }

    dispatch({ type: 'START_ANALYSIS' });
    dispatch({ type: 'SET_VIDEO', payload: videoUrl });

    try {
      console.log('Starting analysis with benchmark mode');

      // Initialize benchmark analyzer
      const initialized = await benchmarkAnalyzerRef.current.loadBenchmarkPattern();
      if (!initialized) {
        console.warn('Benchmark analyzer failed');
        return;
      }

      const analyzer = benchmarkAnalyzerRef.current;
      analyzer.reset();

      // Start frame sampling
      const intensities: FrameIntensity[] = [];
      let frameCount = 0;
      const totalFrames = Math.floor(videoRef.current.duration * 12); // Estimate frames
      console.log(`Processing ${totalFrames} frames at 12 FPS`);

      frameSamplerRef.current = new FrameSampler(
        videoRef.current,
        12, // 12 FPS
        async (frame) => {
          frameCount++;
          const progress = Math.min((frameCount / totalFrames) * 100, 95);
          dispatch({ type: 'UPDATE_PROGRESS', payload: progress });

          const intensity = await analyzer.analyzeFrame(frame);

          const frameIntensity: FrameIntensity = {
            timestamp: frame.timestamp,
            intensity
          };

          intensities.push(frameIntensity);
          dispatch({ type: 'ADD_FRAME_INTENSITY', payload: frameIntensity });
        }
      );

      // Reset video and start analysis
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      frameSamplerRef.current.start();

      // Wait for video to finish
      await new Promise<void>((resolve) => {
        const video = videoRef.current!;
        const handleEnded = () => {
          video.removeEventListener('ended', handleEnded);
          resolve();
        };
        video.addEventListener('ended', handleEnded);
      });

      // Complete analysis
      if (frameSamplerRef.current) {
        frameSamplerRef.current.stop();
      }

      // Calculate final results
      const rawFinalIntensity = analyzer.getFinalIntensity();
      const finalIntensity = Math.max(0, Math.min(100, rawFinalIntensity));
      const speedResult = classifySpeed(finalIntensity);

      // Check if no bowling action was detected
      if (finalIntensity === 0) {
        console.log('🚫 No bowling action detected');
        // Store a flag indicating no bowling action was detected
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('noBowlingActionDetected', 'true');
        }

      dispatch({
        type: 'COMPLETE_ANALYSIS',
        payload: {
          finalIntensity: 0,
          speedClass: 'No Action',
          confidence: 0,
        }
      });

      // Don't navigate here - let the useEffect handle navigation after showing the loader
      return;
      }

      // Get detailed analysis data
      console.log('📊 Getting detailed analysis data in video-preview...');
      const detailedAnalysis = analyzer.getDetailedAnalysis();
      console.log('📊 Detailed analysis retrieved:', detailedAnalysis);

      // Store detailed analysis in sessionStorage immediately
      if (detailedAnalysis && typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem('benchmarkDetailedData', JSON.stringify(detailedAnalysis));
          console.log('✅ Stored detailed analysis in sessionStorage');

          // Get player name from sessionStorage
          const storedPlayerName = window.sessionStorage.getItem('playerName');
          
          // Also store in the more comprehensive format
          const analysisVideoData = {
            intensity: finalIntensity,
            speedClass: speedResult.speedClass,
            kmh: Number(intensityToKmh(finalIntensity).toFixed(2)),
            similarity: finalIntensity,
            frameIntensities: intensities.map(({ timestamp, intensity }) => ({
              timestamp: Number(timestamp.toFixed(3)),
              intensity: Number(intensity.toFixed(3)),
            })),
            phases: {
              runUp: detailedAnalysis.runUp ? Math.round(parseFloat(String(detailedAnalysis.runUp)) * 100) : 83,
              delivery: detailedAnalysis.delivery ? Math.round(parseFloat(String(detailedAnalysis.delivery)) * 100) : 86,
              followThrough: detailedAnalysis.followThrough ? Math.round(parseFloat(String(detailedAnalysis.followThrough)) * 100) : 87,
            },
            technicalMetrics: {
              armSwing: detailedAnalysis.armSwing ? Math.round(parseFloat(String(detailedAnalysis.armSwing)) * 100) : 80,
              bodyMovement: detailedAnalysis.bodyMovement ? Math.round(parseFloat(String(detailedAnalysis.bodyMovement)) * 100) : 86,
              rhythm: detailedAnalysis.rhythm ? Math.round(parseFloat(String(detailedAnalysis.rhythm)) * 100) : 81,
              releasePoint: detailedAnalysis.releasePoint ? Math.round(parseFloat(String(detailedAnalysis.releasePoint)) * 100) : 82,
            },
            recommendations: detailedAnalysis.recommendations || ['Focus on maintaining consistency'],
            playerName: storedPlayerName || 'Player',
            createdAt: new Date().toISOString(),
          };

          window.sessionStorage.setItem('analysisVideoData', JSON.stringify(analysisVideoData));
          console.log('✅ Stored comprehensive analysis data in sessionStorage');
        } catch (error) {
          console.error('❌ Failed to store detailed analysis:', error);
        }
      } else {
        console.warn('⚠️ No detailed analysis data available to store');
      }

      console.log('🏆 Analysis Complete! Final Results:', {
        finalIntensity,
        speedClass: speedResult.speedClass,
        confidence: speedResult.confidence,
        kmh: Number(intensityToKmh(finalIntensity).toFixed(2))
      });

      dispatch({
        type: 'COMPLETE_ANALYSIS',
        payload: {
          finalIntensity,
          speedClass: speedResult.speedClass,
          confidence: speedResult.confidence,
        }
      });

      if (typeof window !== 'undefined') {
        const storedPlayerName = window.sessionStorage.getItem('playerName');
        const pendingEntry = {
          predicted_kmh: Number(intensityToKmh(finalIntensity).toFixed(2)),
          similarity_percent: Number(finalIntensity.toFixed(2)),
          intensity_percent: Number(finalIntensity.toFixed(2)),
          speed_class: speedResult.speedClass,
          name: storedPlayerName || null,
          meta: {
            analyzer_mode: state.analyzerMode,
            app: 'bowling-analyzer',
            player_name: storedPlayerName || null,
            playerName: storedPlayerName || null,
          },
          created_at: new Date().toISOString(),
        };
        window.sessionStorage.setItem('pendingLeaderboardEntry', JSON.stringify(pendingEntry));
      }

      // Don't navigate here - let the useEffect handle navigation after showing the loader

    } catch (error) {
      console.error('Analysis failed:', error);
      dispatch({ type: 'RESET_ANALYSIS' });
    }
  }, [videoUrl, dispatch, state.analyzerMode]);

  // Background Face Detection and Torso Generation Function
  const detectFaceAndGenerateTorso = useCallback(async () => {
    if (!videoRef.current || !videoUrl) {
      console.error('No video available for face detection');
      return;
    }

    setIsFaceDetectionRunning(true);

    try {
      console.log('🎯 Starting background face detection and torso generation process...');
      
      // Initialize face detection service
      const faceService = getFaceDetectionService();
      faceService.setVideoElement(videoRef.current);
      
      // Detect faces and get optimal frame
      const detectionResult = await faceService.detectFaces();
      
      if (!detectionResult.faces || detectionResult.faces.length === 0) {
        throw new Error('No faces detected in the video');
      }

      if (!detectionResult.frameData) {
        throw new Error('Failed to capture frame data');
      }

      console.log('✅ Face detection successful:', detectionResult.faces);

      // Crop the head from the detected face
      const primaryFace = detectionResult.faces[0]; // Use the first (highest confidence) face
      const croppedHeadImage = await faceService.cropHeadFromFrame(detectionResult.frameData, primaryFace);
      
      console.log('✅ Head cropped successfully');

      // Store cropped head image in session storage
      storeCroppedHeadImage(croppedHeadImage);
      
      console.log('✅ Cropped head image stored in session storage');
      
      // Start torso generation
      const geminiService = getGeminiTorsoService();
      
      console.log('🎨 Starting Gemini 2.0 Flash Preview Image Generation...');
      
      // Try Gemini 2.0 Flash Preview Image Generation first
      let torsoResult = await geminiService.generateTorso({
        croppedHeadImage: croppedHeadImage,
        gender: 'auto'
      });

      // If Gemini fails, try the composite fallback
      if (!torsoResult.success) {
        console.log('Gemini 2.0 Flash failed, trying composite fallback...');
        torsoResult = await geminiService.generateTorsoFallback({
          croppedHeadImage: croppedHeadImage,
          gender: 'auto'
        });
      }

      if (torsoResult.success && torsoResult.imageUrl) {
        console.log('✅ Torso generation successful');
        
        // Store generated torso image in session storage
        storeGeneratedTorsoImage(torsoResult.imageUrl);
        
        console.log('✅ Generated torso image stored in session storage - ready for composite card integration');
        
      } else {
        throw new Error(torsoResult.error || 'Failed to generate torso image');
      }

    } catch (error) {
      console.error('❌ Background face detection or torso generation failed:', error);
      // Silently continue - don't block the main flow
    } finally {
      setIsFaceDetectionRunning(false);
    }
  }, [videoUrl]);

  // Auto-trigger face detection when video is loaded and ready
  useEffect(() => {
    if (videoRef.current && videoUrl && !isFaceDetectionRunning && !hasAnalysisData) {
      // Auto-start face detection after video loads
      const video = videoRef.current;
      const handleLoadedData = () => {
        console.log('🎯 Video loaded, auto-starting face detection...');
        setTimeout(() => {
          detectFaceAndGenerateTorso();
        }, 1000); // Wait 1 second for video to stabilize
      };

      if (video.readyState >= 2) {
        // Video is already loaded
        handleLoadedData();
      } else {
        video.addEventListener('loadeddata', handleLoadedData, { once: true });
        return () => video.removeEventListener('loadeddata', handleLoadedData);
      }
    }
  }, [videoUrl, detectFaceAndGenerateTorso, isFaceDetectionRunning, hasAnalysisData]);

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: "url(/images/instructions/Instructions%20bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-col min-h-screen" style={{
        backgroundImage: "url(/images/Desktop.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}>
        {/* Logo in top left corner */}
        <div className="absolute top-6 left-6 z-20">
          <div
            onClick={() => {
              // Clear all session data and reload page
              console.log('🏠 Homepage logo clicked - clearing session data and reloading...');
              if (typeof window !== 'undefined') {
                sessionStorage.clear();
                window.location.href = '/';
              }
            }}
          >
            <img
              src="/images/newhomepage/Bowling%20Campaign%20Logo.png"
              alt="Bowling Campaign Logo"
              className="w-64 lg:w-72"
              style={{ height: "auto", cursor: "pointer" }}
            />
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex items-stretch px-8 relative">
          {/* Left side - Bumrah Image */}
          <div className="flex-1 relative">
            <img
              src="/images/Bumrah%205.png"
              alt="Bumrah"
              style={{ 
                position: 'absolute',
                bottom: 0,
                left: '60%',
                transform: 'translateX(-50%)',
                width: '500px', 
                height: '600px', 
                margin: 0,
                padding: 0,
                display: 'block',
                objectFit: 'contain',
                zIndex: 10
              }}
            />
          </div>

          {/* Right side - Glass Box Content */}
          <div className="flex-1 flex justify-center items-center py-16" style={{ marginTop: '50px' }}>
            <div className="relative" style={{ maxWidth: 500 }}>
              <div
                className="w-full"
                style={{
                  position: "relative",
                  borderRadius: 18,
                  backgroundColor: "#FFFFFF80",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: "inset 0 0 0 1px #FFFFFF",
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  zIndex: 2,
                }}
              >
                {/* Universal Back Arrow Box - Top Left */}
                <div
                  onClick={() => {
                    // Don't allow back navigation during analysis
                    if (!state.isAnalyzing) {
                      window.history.back();
                    }
                  }}
                  style={{
                    position: "absolute",
                    top: "10px",
                    left: "10px",
                    width: "30px",
                    height: "30px",
                    border: "1px solid white",
                    borderRadius: "4px",
                    backgroundColor: "rgba(0,0,0,0.1)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: state.isAnalyzing ? "not-allowed" : "pointer",
                    opacity: state.isAnalyzing ? 0.5 : 1,
                    zIndex: 10,
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (!state.isAnalyzing) {
                      e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.2)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.1)";
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path 
                      d="M15 18L9 12L15 6" 
                      stroke="white" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* Desktop Video Preview Content */}
                <div className="text-center w-full">
                  {/* Preview Your Delivery headline with woosh */}
                  <div className="mb-4">
                    <div
                      style={{
                        position: "relative",
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: 800,
                        fontStyle: "italic",
                        fontSize: 16,
                        color: "#0A0A0A",
                        lineHeight: 1.1,
                        marginBottom: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                       <span>PREVIEW YOUR DELIVER</span>
                       <span style={{ position: "relative" }}>
                         <img
                           src="/images/newhomepage/woosh.svg"
                           alt=""
                           aria-hidden
                           style={{
                             position: "absolute",
                             left: -24,
                             top: "50%",
                             transform: "translateY(-50%)",
                             height: "1em",
                             filter: "brightness(0) saturate(100%)"
                           }}
                         />
                         <img
                           src="/images/newhomepage/woosh.svg"
                           alt=""
                           aria-hidden
                           style={{
                             position: "absolute",
                             right: -24,
                             top: "50%",
                             transform: "translateY(-50%) scaleX(-1)",
                             height: "1em",
                             filter: "brightness(0) saturate(100%)"
                           }}
                         />
                         Y
                       </span>
                    </div>

                    <p
                      style={{
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: 400,
                        fontSize: 11,
                        color: "#0A0A0A",
                        lineHeight: 1.3,
                        margin: 0
                      }}
                    >
                      Make sure your best ball is ready before you submit!
                    </p>
                  </div>

                  {/* Video Preview Box - Desktop */}
                  <div className="mb-4">
                    <div
                      className="relative overflow-hidden w-full mx-auto"
                      style={{
                        borderRadius: '16px',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        aspectRatio: isPortraitVideo ? '9/16' : '16/9',
                        minHeight: '200px',
                        maxHeight: isPortraitVideo ? '320px' : '260px'
                      }}
                    >
                      {videoUrl ? (
                        <>
                          {videoSource !== 'unknown' && (
                            <span
                              className="absolute top-3 left-3 z-10 px-2 py-1 text-xs font-semibold rounded-full bg-black/70 text-white"
                              style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em' }}
                            >
                              {videoSource === 'record' ? 'Recorded clip' : 'Uploaded clip'}
                            </span>
                          )}
                          <video
                            ref={videoRef}
                            src={videoUrl}
                            controls
                            preload="metadata"
                            className={isPortraitVideo ? 'w-full h-full object-contain bg-black' : 'w-full h-full object-cover'}
                            style={{ borderRadius: '16px' }}
                            onLoadedMetadata={handleVideoLoadedMetadata}
                            onError={handleVideoError}
                          >
                            Your browser does not support the video tag.
                          </video>

                          <div
                            className="absolute bottom-3 right-3 px-2 py-1 text-white text-xs rounded"
                            style={{
                              backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              fontFamily: 'Inter, sans-serif'
                            }}
                          >
                            {videoDuration}
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white">
                          <div className="text-center">
                            <div className="mb-3">
                              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="mx-auto">
                                <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 2v-7l-4 2z"/>
                              </svg>
                            </div>
                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
                              No video available
                            </p>
                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', opacity: 0.7 }}>
                              Please go back and upload a video
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons - Desktop */}
                  <div className="flex flex-row gap-3 justify-center w-full">
                    <Link
                      href="/record-upload"
                      className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 flex-1"
                      style={{
                        backgroundColor: '#CCEAF7',
                        borderRadius: '16px',
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: '700',
                        fontSize: 12,
                        color: 'black',
                        height: '36px',
                        border: 'none',
                        padding: '0 12px'
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2"
                      >
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                        <path d="M21 3v5h-5"/>
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                        <path d="M8 16H3v5"/>
                      </svg>
                      Retry
                    </Link>

                    {/* DEMO MODE: Analysis functionality commented out */}
                    <Link
                      href="/leaderboard"
                      className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 flex-1"
                      style={{
                        backgroundColor: '#FFCA04',
                        borderRadius: '16px',
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: '700',
                        fontSize: 12,
                        color: 'black',
                        height: '36px',
                        border: 'none',
                        padding: '0 12px'
                      }}
                    >
                      View Leaderboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Footer */}
        <footer className="w-full bg-black py-6 px-6 relative z-20">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
            <div className="text-left">
              <p className="text-white text-xs" style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 10, lineHeight: 1.4 }}>
                Copyright L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white text-xs mr-2" style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 10 }}>
                Connect with us
              </span>
              <div className="flex gap-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </div>
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.80 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/></svg>
                </div>
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </div>
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden min-h-screen flex flex-col">
        <main className="flex-1 px-6 pt-20 pb-8 flex justify-center relative z-10">
          <div className="relative mx-auto max-w-md md:max-w-2xl lg:max-w-4xl" style={{ width: "100%", maxWidth: 380, marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16, paddingLeft: 4 }}>
              <div
                onClick={() => {
                  // Clear all session data and reload page
                  console.log('🏠 Homepage logo clicked - clearing session data and reloading...');
                  if (typeof window !== 'undefined') {
                    sessionStorage.clear();
                    window.location.href = '/';
                  }
                }}
              >
                <img
                  src="/images/newhomepage/Bowling%20Campaign%20Logo.png"
                  alt="Bowling Campaign Logo"
                  className="w-52"
                  style={{ height: "auto", cursor: "pointer" }}
                />
              </div>
            </div>

            <div style={{ position: "relative", width: "100%" }}>
              <img
                src="/images/instructions/loanapproved.png"
                alt="Loan Approved"
                style={{ position: "absolute", top: -170, right: -8, width: 150, height: "auto", zIndex: 1, pointerEvents: "none" }}
              />

              <div
                className="w-full max-w-sm mx-auto"
                style={{
                  position: "relative",
                  borderRadius: 18,
                  backgroundColor: "#FFFFFF80",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: "inset 0 0 0 1px #FFFFFF",
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  zIndex: 2,
                  marginTop: 20,
                }}
              >
                {/* Universal Back Arrow Box - Top Left */}
                <div
                  onClick={() => {
                    // Don't allow back navigation during analysis
                    if (!state.isAnalyzing) {
                      window.history.back();
                    }
                  }}
                  style={{
                    position: "absolute",
                    top: "10px",
                    left: "10px",
                    width: "30px",
                    height: "30px",
                    border: "1px solid white",
                    borderRadius: "4px",
                    backgroundColor: "rgba(0,0,0,0.1)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: state.isAnalyzing ? "not-allowed" : "pointer",
                    opacity: state.isAnalyzing ? 0.5 : 1,
                    zIndex: 10,
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (!state.isAnalyzing) {
                      e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.2)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.1)";
                  }}
                >
                  {/* Left Arrow Icon (without stem) - Even Bigger */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path 
                      d="M15 18L9 12L15 6" 
                      stroke="white" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                {/* Preview Your Delivery headline with woosh */}
                <div className="mb-6 text-center">
                  <div
                    style={{
                      position: "relative",
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: 800,
                      fontStyle: "italic",
                      fontSize: "clamp(16px, 4vw, 19.65px)",
                      color: "#000000",
                      lineHeight: 1.1,
                      marginBottom: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                     <span>PREVIEW YOUR DELIVER</span>
                     <span style={{ position: "relative" }}>
                       <img
                         src="/images/newhomepage/woosh.svg"
                         alt=""
                         aria-hidden
                         style={{
                           position: "absolute",
                           left: -30,
                           top: "50%",
                           transform: "translateY(-50%)",
                           height: "1.2em",
                           filter: "brightness(0) saturate(100%)"
                         }}
                       />
                       <img
                         src="/images/newhomepage/woosh.svg"
                         alt=""
                         aria-hidden
                         style={{
                           position: "absolute",
                           right: -30,
                           top: "50%",
                           transform: "translateY(-50%) scaleX(-1)",
                           height: "1.2em",
                           filter: "brightness(0) saturate(100%)"
                         }}
                       />
                       Y
                     </span>
                  </div>

                  <p
                    style={{
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: 400,
                      fontStyle: "normal",
                      fontSize: "clamp(11px, 2.5vw, 12px)",
                      lineHeight: "14px",
                      color: "#000000",
                    }}
                  >
                    Make sure your best ball is ready before you submit!
                  </p>
                </div>

                {/* Video Preview Box */}
                <div className="mb-6">
                  <div
                    className="relative overflow-hidden w-full max-w-sm md:max-w-md mx-auto"
                    style={{
                      borderRadius: '20px',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      aspectRatio: isPortraitVideo ? '9/16' : '16/9',
                      minHeight: '180px',
                      maxHeight: isPortraitVideo ? '400px' : '240px'
                    }}
                  >
                    {videoUrl ? (
                      <>
                        {videoSource !== 'unknown' && (
                          <span
                            className="absolute top-4 left-4 z-10 px-3 py-1 text-xs font-semibold rounded-full bg-black/70 text-white"
                            style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em' }}
                          >
                            {videoSource === 'record' ? 'Recorded clip' : 'Uploaded clip'}
                          </span>
                        )}
                        <video
                          ref={videoRef}
                          src={videoUrl}
                          controls
                          preload="metadata"
                          className={isPortraitVideo ? 'w-full h-full object-contain bg-black' : 'w-full h-full object-cover'}
                          style={{ borderRadius: '20px' }}
                          onLoadedMetadata={handleVideoLoadedMetadata}
                          onError={handleVideoError}
                        >
                          Your browser does not support the video tag.
                        </video>

                        <div
                          className="absolute bottom-4 right-4 px-2 py-1 text-white text-xs rounded"
                          style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            fontFamily: 'Inter, sans-serif'
                          }}
                        >
                          {videoDuration}
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white">
                        <div className="text-center">
                          <div className="mb-4">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="mx-auto">
                              <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 2v-7l-4 2z"/>
                            </svg>
                          </div>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
                            No video available
                          </p>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', opacity: 0.7 }}>
                            Please go back and upload a video
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>


                {/* Action Buttons */}
                <div className="flex flex-row gap-3 justify-center w-full">
                  <Link
                    href="/record-upload"
                    className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 flex-1"
                    style={{
                      backgroundColor: '#CCEAF7',
                      borderRadius: '20px',
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: '700',
                      fontSize: 'clamp(12px, 2.5vw, 14px)',
                      color: 'black',
                      minWidth: '142px',
                      height: '36px',
                      border: 'none',
                      padding: '0 16px'
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2"
                    >
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                      <path d="M21 3v5h-5"/>
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                      <path d="M8 16H3v5"/>
                    </svg>
                    Retry
                  </Link>

                  {/* DEMO MODE: Analysis functionality commented out */}
                  <Link
                    href="/leaderboard"
                    className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 flex-1"
                    style={{
                      backgroundColor: '#FFCA04',
                      borderRadius: '20px',
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: '700',
                      fontSize: 'clamp(12px, 2.5vw, 14px)',
                      color: 'black',
                      minWidth: '142px',
                      height: '36px',
                      border: 'none',
                      padding: '0 16px'
                    }}
                  >
                    View Leaderboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="md:hidden mt-auto w-full bg-black py-6 px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
            <div className="text-left">
              <p className="text-white text-xs" style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 10, lineHeight: 1.4 }}>
                Copyright L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white text-xs mr-2" style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 10 }}>
                Connect with us
              </span>
              <div className="flex gap-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </div>
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.80 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/></svg>
                </div>
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </div>
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Analysis Loading Overlay */}
      <AnalysisLoader isVisible={state.isAnalyzing} progress={state.progress} />
    </div>
  );
}


