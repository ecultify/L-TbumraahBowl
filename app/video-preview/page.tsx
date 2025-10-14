'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAnalysis, FrameIntensity, AnalyzerMode } from '@/context/AnalysisContext';
import { getFaceDetectionService, storeCroppedHeadImage } from '@/lib/utils/faceDetection';
import { getGeminiTorsoService, storeGeneratedTorsoImage } from '@/lib/utils/geminiService';
import { uploadGeminiAvatar } from '@/lib/utils/avatarUpload';
import { uploadUserVideoToSupabase } from '@/lib/utils/videoUpload';
import { GlassBackButton } from '@/components/GlassBackButton';
import { ProcessingModal } from '@/components/ProcessingModal';
import { AnalysisLoader } from '@/components/AnalysisLoader';
import { PoseBasedAnalyzer } from '@/lib/analyzers/poseBased';
import { BenchmarkComparisonAnalyzer } from '@/lib/analyzers/benchmarkComparison';
import { FrameSampler } from '@/lib/video/frameSampler';
import { classifySpeed, intensityToKmh, normalizeIntensity } from '@/lib/utils/normalize';
import { usePageProtection } from '@/lib/hooks/usePageProtection';
import { UnauthorizedAccess } from '@/components/UnauthorizedAccess';

export default function VideoPreviewPage() {
  // ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY CONDITIONAL RETURNS
  // Protect this page - require OTP verification and proper flow
  const isAuthorized = usePageProtection('video-preview');
  
  const router = useRouter();
  
  // All state hooks
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<string>('00:00');
  const [fileName, setFileName] = useState<string>('');
  const [videoSource, setVideoSource] = useState<'record' | 'upload' | 'unknown'>('unknown');
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [fileSizeLabel, setFileSizeLabel] = useState<string | null>(null);
  const [isPortraitVideo, setIsPortraitVideo] = useState(false);
  const [hasAnalysisData, setHasAnalysisData] = useState(false);
  const [isFaceDetectionRunning, setIsFaceDetectionRunning] = useState(false);
  const [faceDetectionCompleted, setFaceDetectionCompleted] = useState(false);
  const [supabaseUploadComplete, setSupabaseUploadComplete] = useState(false);
  const [showTransitionBlur, setShowTransitionBlur] = useState(false);
  const { state, dispatch } = useAnalysis();
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameSamplerRef = useRef<FrameSampler | null>(null);
  const poseAnalyzerRef = useRef<PoseBasedAnalyzer>(new PoseBasedAnalyzer());
  const benchmarkAnalyzerRef = useRef<BenchmarkComparisonAnalyzer>(new BenchmarkComparisonAnalyzer());

  // Background Supabase upload function (non-blocking)
  const uploadVideoToSupabase = useCallback(async () => {
    // Check if already uploaded
    if (sessionStorage.getItem('uploadedVideoPublicPath')) {
      console.log('ℹ️ Video already uploaded to Supabase, skipping...');
      setSupabaseUploadComplete(true);
      return;
    }

    try {
      console.log('📤 [Background] Starting Supabase video upload...');
      
      // Get video file from tempVideoFile or reconstruct from sessionStorage
      let videoFile: File | null = null;
      
      if (typeof window !== 'undefined' && (window as any).tempVideoFile) {
        videoFile = (window as any).tempVideoFile;
        console.log('📦 Using tempVideoFile for Supabase upload');
      } else {
        // Reconstruct from base64 data
        const storedVideoData = sessionStorage.getItem('uploadedVideoData');
        const storedFileName = sessionStorage.getItem('uploadedFileName') || 'video.mp4';
        const storedMimeType = sessionStorage.getItem('uploadedMimeType') || 'video/mp4';
        
        if (storedVideoData && storedVideoData.startsWith('data:')) {
          const response = await fetch(storedVideoData);
          const blob = await response.blob();
          videoFile = new File([blob], storedFileName, { type: storedMimeType });
          console.log('📦 Reconstructed video file from base64 data');
        }
      }

      if (!videoFile) {
        console.warn('⚠️ No video file available for Supabase upload');
        return;
      }

      // Upload to Supabase
      const formData = new FormData();
      formData.append('file', videoFile, videoFile.name);

      const response = await fetch('/api/upload-user-video', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (result.publicPath) {
          sessionStorage.setItem('uploadedVideoPublicPath', result.publicPath);
          console.log('✅ [Background] Video uploaded to Supabase:', result.publicPath);
          setSupabaseUploadComplete(true);
        }
      } else {
        console.warn('⚠️ [Background] Supabase upload failed:', response.status);
      }
    } catch (error) {
      console.warn('⚠️ [Background] Supabase upload error:', error);
      // Don't throw - this is a background process
    }
  }, []);

  // Direct Supabase upload (static hosting-safe)
  const uploadVideoToSupabaseDirect = useCallback(async () => {
    if (sessionStorage.getItem('uploadedVideoPublicPath')) {
      setSupabaseUploadComplete(true);
      return;
    }
    try {
      let videoFile: File | null = null;
      if (typeof window !== 'undefined' && (window as any).tempVideoFile) {
        videoFile = (window as any).tempVideoFile as File;
      } else {
        const storedVideoData = sessionStorage.getItem('uploadedVideoData');
        const storedFileName = sessionStorage.getItem('uploadedFileName') || 'video.mp4';
        const storedMimeType = sessionStorage.getItem('uploadedMimeType') || 'video/mp4';
        if (storedVideoData && storedVideoData.startsWith('data:')) {
          const resp = await fetch(storedVideoData);
          const blob = await resp.blob();
          videoFile = new File([blob], storedFileName, { type: storedMimeType });
        }
      }
      if (!videoFile) return;
      const publicUrl = await uploadUserVideoToSupabase(videoFile);
      if (publicUrl) {
        setSupabaseUploadComplete(true);
      }
    } catch {}
  }, []);

  // Auto-upload to Supabase in background (doesn't block UI)
  useEffect(() => {
    if (videoUrl && !supabaseUploadComplete && !sessionStorage.getItem('uploadedVideoPublicPath')) {
      // Delay upload slightly to ensure page is loaded
      const timer = setTimeout(() => {
        uploadVideoToSupabaseDirect();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [videoUrl, supabaseUploadComplete, uploadVideoToSupabaseDirect]);

  // Clear old face detection data when page loads (fresh start for each video)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🧹 Clearing old face detection data for fresh detection...');
      // Clear sessionStorage
      sessionStorage.removeItem('croppedHeadImage');
      sessionStorage.removeItem('generatedTorsoImage');
      sessionStorage.removeItem('detectedFrameDataUrl');
      
      // 🆕 CRITICAL: Clear localStorage to prevent cross-user face frame contamination
      console.log('🧹 Clearing localStorage to prevent cross-user contamination...');
      localStorage.removeItem('userVideoThumbnail');
      localStorage.removeItem('torsoVideoUrl');
      console.log('✅ Face detection data cleared from both storages');
      
      // Don't set faceDetectionCompleted - let detection run fresh
      setFaceDetectionCompleted(false);
    }
  }, []);

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

      console.log('Face detection successful:', detectionResult.faces);
      // Save full detected frame for Remotion rendering and thumbnail fallback
      try {
        if (typeof window !== 'undefined' && detectionResult.frameData) {
          sessionStorage.setItem('detectedFrameDataUrl', detectionResult.frameData);
          try { localStorage.setItem('userVideoThumbnail', detectionResult.frameData); } catch {}
        }
      } catch {}

      // Crop the head from the detected face
      const primaryFace = detectionResult.faces[0]; // Use the first (highest confidence) face
      const croppedHeadImage = await faceService.cropHeadFromFrame(detectionResult.frameData, primaryFace);

      console.log('✅ Head cropped successfully');

      // Store cropped head image in session storage
      storeCroppedHeadImage(croppedHeadImage);

      console.log('✅ Cropped head image stored in session storage');

      // Start torso generation
      const geminiService = getGeminiTorsoService();

      console.log('🎨 Starting Gemini 2.5 Flash Image Preview...');

      // Try Gemini 2.5 Flash Image Preview first
      let torsoResult = await geminiService.generateTorso({
        croppedHeadImage: croppedHeadImage,
        gender: 'auto'
      });

      // If Gemini fails, try the composite fallback
      if (!torsoResult.success) {
        console.log('Gemini 2.5 Flash failed, trying composite fallback...');
        torsoResult = await geminiService.generateTorsoFallback({
          croppedHeadImage: croppedHeadImage,
          gender: 'auto'
        });
      }

      if (torsoResult.success && torsoResult.imageUrl) {
        console.log('✅ Torso generation successful');

        // Store generated torso image in session storage (for local use)
        storeGeneratedTorsoImage(torsoResult.imageUrl);

        console.log('✅ Generated torso image stored in session storage - ready for composite card integration');

        // Upload torso to Supabase to get public URL for leaderboard avatar
        try {
          const playerName = typeof window !== 'undefined' 
            ? window.sessionStorage.getItem('playerName') || 'anonymous'
            : 'anonymous';
          
          console.log('📤 Uploading torso to Supabase for avatar...');
          const publicAvatarUrl = await uploadGeminiAvatar(torsoResult.imageUrl, playerName);
          
          if (publicAvatarUrl) {
            console.log('✅ Avatar uploaded to Supabase successfully:', publicAvatarUrl);
            // Note: uploadGeminiAvatar already stores this in sessionStorage as 'geminiAvatarUrl'
          } else {
            console.warn('⚠️ Failed to upload avatar to Supabase, will use default avatar');
          }
        } catch (uploadError) {
          console.error('❌ Avatar upload error:', uploadError);
          // Continue anyway - avatar is optional
        }

      } else {
        throw new Error(torsoResult.error || 'Failed to generate torso image');
      }

      // Mark face detection as completed successfully
      setFaceDetectionCompleted(true);

    } catch (error) {
      console.error('❌ Background face detection or torso generation failed:', error);
      // Mark as completed even on failure to prevent infinite retries
      setFaceDetectionCompleted(true);
      // Silently continue - don't block the main flow
    } finally {
      setIsFaceDetectionRunning(false);
    }
  }, [videoUrl]);

  // Force video to load first frame (especially important for iOS)
  useEffect(() => {
    if (videoRef.current && videoUrl) {
      const video = videoRef.current;
      
      // iOS Safari requires explicit load() call to display first frame
      const forceLoadFirstFrame = async () => {
        try {
          console.log('📱 Forcing video to load first frame for iOS compatibility...');
          video.load(); // Force reload to ensure iOS displays frame
          
          // Wait for metadata to be loaded
          if (video.readyState < 1) {
            await new Promise((resolve) => {
              const handler = () => {
                video.removeEventListener('loadedmetadata', handler);
                resolve(null);
              };
              video.addEventListener('loadedmetadata', handler);
              setTimeout(() => {
                video.removeEventListener('loadedmetadata', handler);
                resolve(null);
              }, 3000);
            });
          }
          
          // Seek to 0.1 seconds to force frame display on iOS
          video.currentTime = 0.1;
          await new Promise((resolve) => setTimeout(resolve, 100));
          video.currentTime = 0; // Reset to start
          
          console.log('✅ First frame loaded (readyState:', video.readyState, ')');
        } catch (error) {
          console.warn('⚠️ Error forcing first frame load:', error);
        }
      };
      
      forceLoadFirstFrame();
    }
  }, [videoUrl]);

  // Auto-trigger face detection when video is loaded and ready (background process) - RUNS ONLY ONCE
  useEffect(() => {
    if (videoRef.current && videoUrl && !isFaceDetectionRunning && !hasAnalysisData && !faceDetectionCompleted) {
      // Auto-start face detection after video loads (runs in background)
      const video = videoRef.current;
      const handleLoadedData = () => {
        console.log('🎯 Video loaded, auto-starting background face detection...');
        setTimeout(() => {
          detectFaceAndGenerateTorso();
        }, 1500); // Increased from 1000ms to 1500ms to allow iOS to fully load
      };

      if (video.readyState >= 2) {
        // Video is already loaded
        handleLoadedData();
      } else {
        video.addEventListener('loadeddata', handleLoadedData, { once: true });
        return () => video.removeEventListener('loadeddata', handleLoadedData);
      }
    }
  }, [videoUrl, detectFaceAndGenerateTorso, isFaceDetectionRunning, hasAnalysisData, faceDetectionCompleted]);

  // Handle navigation after analysis completion with a delay to show the loader
  useEffect(() => {
    const shouldNavigate = !state.isAnalyzing && state.progress === 100 && (
      (typeof state.finalIntensity === 'number' && !isNaN(state.finalIntensity) && state.finalIntensity > 0) ||
      state.speedClass === 'No Action' ||
      (state.speedClass && state.speedClass !== null) // Navigate if we have any valid speed class
    );
    
    if (shouldNavigate) {
      console.log('🔄 Analysis completed - navigating to /analyze in 2 seconds...');
      console.log('📊 Navigation criteria:', {
        isAnalyzing: state.isAnalyzing,
        progress: state.progress,
        finalIntensity: state.finalIntensity,
        speedClass: state.speedClass,
        shouldNavigate
      });
      
      // Show blur overlay immediately when analysis completes
      setShowTransitionBlur(true);
      
      const timer = setTimeout(() => {
        console.log('🚀 Navigating to analyze page (client-side navigation - console logs will be preserved)');
        // Use Next.js router.push() for client-side navigation
        // This preserves console logs unlike window.location.replace()
        router.push('/analyze');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.isAnalyzing, state.progress, state.finalIntensity, state.speedClass, router]);

  const startAnalysis = useCallback(async () => {
    console.log('🚀 Starting video analysis...');
    
    if (!videoRef.current || !videoUrl) {
      console.error('❌ No video available for analysis');
      return;
    }

    // Clear any previous no bowling action flag
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('noBowlingActionDetected');
    }
    
    dispatch({ type: 'START_ANALYSIS' });
    dispatch({ type: 'SET_VIDEO', payload: videoUrl });
    dispatch({ type: 'SET_ANALYZER_MODE', payload: 'benchmark' });
    
    console.log('📊 Analysis state after dispatch:', { isAnalyzing: state.isAnalyzing, progress: state.progress });

    try {
      console.log('Starting analysis with benchmark mode');

      // Initialize benchmark analyzer
      console.log('🔄 Initializing benchmark analyzer...');
      const initialized = await benchmarkAnalyzerRef.current.loadBenchmarkPattern();
      if (!initialized) {
        console.error('❌ Benchmark analyzer failed to initialize');
        dispatch({ type: 'RESET_ANALYSIS' });
        return;
      }
      console.log('✅ Benchmark analyzer initialized successfully');

      const analyzer = benchmarkAnalyzerRef.current;
      console.log('✅ Analyzer reset completed');

      // Start frame sampling
      const intensities: FrameIntensity[] = [];
      let frameCount = 0;
      const totalFrames = Math.floor(videoRef.current.duration * 12); // Estimate frames
      console.log(`Processing ${totalFrames} frames at 12 FPS`);
      // Flag to disable certain timeouts while deterministic fallback runs
      let isFallbackRunning = false;

      frameSamplerRef.current = new FrameSampler(
        videoRef.current,
        12, // 12 FPS
        async (frame) => {
          try {
            frameCount++;
            const progress = Math.min((frameCount / totalFrames) * 100, 95);
            dispatch({ type: 'UPDATE_PROGRESS', payload: progress });

            const intensity = await analyzer.analyzeFrame(frame);
            
            // Debug logging for frame analysis
            if (frameCount <= 5 || frameCount % 50 === 0) {
              console.log(`🎬 Frame ${frameCount}:`, {
                timestamp: frame.timestamp,
                intensity: intensity,
                progress: progress.toFixed(1) + '%'
              });
            }

            const frameIntensity: FrameIntensity = {
              timestamp: frame.timestamp,
              intensity
            };

            intensities.push(frameIntensity);
            dispatch({ type: 'ADD_FRAME_INTENSITY', payload: frameIntensity });
          } catch (frameError: any) {
            console.error('Error in frame sampling callback:', frameError);
            console.error('Frame error stack:', frameError.stack);
          }
        }
      );

      // Reset video and start analysis
      videoRef.current.currentTime = 0;
      console.log('▶️ Starting video playback for analysis...');
      console.log('📊 Video details:', {
        duration: videoRef.current.duration,
        readyState: videoRef.current.readyState,
        videoWidth: videoRef.current.videoWidth,
        videoHeight: videoRef.current.videoHeight,
        src: videoRef.current.src.substring(0, 100)
      });
      
      // CRITICAL: Wait for video to be fully loaded (especially for blob URLs on localhost)
      if (videoRef.current.readyState < 4) {
        console.log('⏳ Waiting for video to be fully loaded (readyState: ' + videoRef.current.readyState + ')...');
        
        // Force video to load by setting load() explicitly
        try {
          videoRef.current.load();
          console.log('📥 Explicitly called video.load()');
        } catch (e) {
          console.warn('⚠️ Error calling video.load():', e);
        }
        
        await new Promise<void>((resolve) => {
          let resolved = false;
          
          const cleanup = () => {
            if (resolved) return;
            resolved = true;
            videoRef.current?.removeEventListener('canplaythrough', handleCanPlayThrough);
            videoRef.current?.removeEventListener('loadeddata', handleLoadedData);
            videoRef.current?.removeEventListener('canplay', handleCanPlay);
            videoRef.current?.removeEventListener('error', handleError);
          };
          
          const handleCanPlayThrough = () => {
            console.log('✅ Video can play through without buffering (readyState: ' + videoRef.current?.readyState + ')');
            cleanup();
            resolve();
          };
          
          const handleLoadedData = () => {
            console.log('✅ Video metadata and first frame loaded (readyState: ' + videoRef.current?.readyState + ')');
            // Wait a bit more for blob URLs to stabilize
            setTimeout(() => {
              cleanup();
              resolve();
            }, 1000);
          };
          
          const handleCanPlay = () => {
            console.log('✅ Video has enough data to play (readyState: ' + videoRef.current?.readyState + ')');
            // Still wait a bit more for blob URLs
            setTimeout(() => {
              cleanup();
              resolve();
            }, 1000);
          };
          
          const handleError = (e: any) => {
            console.error('❌ Video loading error:', e);
            cleanup();
            resolve(); // Continue anyway to avoid infinite wait
          };
          
          videoRef.current?.addEventListener('canplaythrough', handleCanPlayThrough);
          videoRef.current?.addEventListener('loadeddata', handleLoadedData);
          videoRef.current?.addEventListener('canplay', handleCanPlay);
          videoRef.current?.addEventListener('error', handleError);
          
          // Increased timeout to 30 seconds for large videos
          setTimeout(() => {
            if (isFallbackRunning) {
              console.log('⏭️ Skipping timeout - fallback is running');
              return;
            }
            console.log('⚠️ Video load timeout after 30s (readyState: ' + videoRef.current?.readyState + ')');
            if (videoRef.current && videoRef.current.readyState < 2) {
              console.error('❌ Video failed to load - readyState still too low. Cannot analyze.');
              cleanup();
              // Don't resolve - we need valid video data
              dispatch({ type: 'RESET_ANALYSIS' });
              alert('Failed to load video. Please try uploading again.');
              return;
            }
            cleanup();
            resolve();
          }, 30000);
        });
      }
      
      // Extra delay for blob URLs on localhost to ensure they're ready
      if (videoRef.current.src.startsWith('blob:')) {
        console.log('🔄 Blob URL detected, adding stabilization delay...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('▶️ Starting video playback NOW...');
      await videoRef.current.play();
      frameSamplerRef.current.start();
      console.log('✅ Frame sampler started');

      // Wait for video to finish
      console.log('🔄 Waiting for video to complete...');
      console.log('Video duration:', videoRef.current.duration);
      console.log('Video current time at start:', videoRef.current.currentTime);
      
      await new Promise<void>((resolve) => {
        const handleEnded = () => {
          console.log('Video ended event fired!');
          frameSamplerRef.current?.stop();
          resolve();
        };
        
        const handleTimeUpdate = () => {
          const currentTime = videoRef.current?.currentTime || 0;
          const duration = videoRef.current?.duration || 0;
          console.log(`Video time: ${currentTime.toFixed(2)}/${duration.toFixed(2)}`);
          
          // Auto-resolve if we're very close to the end
          if (duration > 0 && currentTime >= duration - 0.1) {
            console.log('Video near end, triggering completion manually');
            videoRef.current?.removeEventListener('ended', handleEnded);
            videoRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
            frameSamplerRef.current?.stop();
            resolve();
          }
        };
        
        // Add timeout as fallback
        const timeout = setTimeout(() => {
          console.log('Video completion timeout reached');
          videoRef.current?.removeEventListener('ended', handleEnded);
          videoRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
          frameSamplerRef.current?.stop();
          resolve();
        }, 30000); // 30 second timeout
        
        const cleanup = () => {
          clearTimeout(timeout);
          videoRef.current?.removeEventListener('ended', handleEnded);
          videoRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
        };
        
        videoRef.current?.addEventListener('ended', () => {
          cleanup();
          handleEnded();
        });
        
        videoRef.current?.addEventListener('timeupdate', handleTimeUpdate);
      });

      // Complete analysis
      if (frameSamplerRef.current) {
        frameSamplerRef.current.stop();
      }

      // Deterministic seek-based fallback sampling if we under-sampled
      try {
        const expected = Math.max(1, Math.floor((videoRef.current?.duration || 0) * 12));
        if (intensities.length < expected * 0.5 && videoRef.current) {
          console.log(`⚠️ Under-sampled (${intensities.length}/${expected}). Running deterministic 12fps sampling fallback...`);
          isFallbackRunning = true;
          const vid = videoRef.current;
          vid.pause();
          // Clear contaminated frames and reset detector
          await analyzer.reset();
          // Dispose old detector to clear smoothing state
          const analyzerAny = benchmarkAnalyzerRef.current as any;
          if (analyzerAny && analyzerAny.detector) {
            try { analyzerAny.detector.dispose?.(); } catch {}
            analyzerAny.detector = null;
            analyzerAny.isInitialized = false;
          }
          // Reinitialize with fresh state
          await benchmarkAnalyzerRef.current.loadBenchmarkPattern();
          const fallbackCanvas = document.createElement('canvas');
          fallbackCanvas.width = 320;
          fallbackCanvas.height = 240;
          const fctx = fallbackCanvas.getContext('2d');
          if (fctx) {
            const step = 1 / 12;
            for (let t = 0; t < vid.duration; t += step) {
              await new Promise<void>((resolve) => {
                const onSeeked = () => {
                  vid.removeEventListener('seeked', onSeeked);
                  resolve();
                };
                vid.addEventListener('seeked', onSeeked);
                try { vid.currentTime = Math.min(t, Math.max(0, vid.duration - 0.001)); } catch {}
              });

              try {
                fctx.clearRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
                fctx.drawImage(vid, 0, 0, fallbackCanvas.width, fallbackCanvas.height);
                const imageData = fctx.getImageData(0, 0, fallbackCanvas.width, fallbackCanvas.height);
                const intensity = await analyzer.analyzeFrame({ imageData, timestamp: vid.currentTime });
                const progress = Math.min(((intensities.length + 1) / expected) * 100, 95);
                dispatch({ type: 'UPDATE_PROGRESS', payload: progress });
                const frameIntensity: FrameIntensity = { timestamp: vid.currentTime, intensity };
                intensities.push(frameIntensity);
                dispatch({ type: 'ADD_FRAME_INTENSITY', payload: frameIntensity });
              } catch (seekErr) {
                console.warn('⚠️ Fallback sampling error at t=', t.toFixed(2), seekErr);
              }
            }
          }
        }
      } catch (fallbackErr) {
        console.warn('⚠️ Deterministic sampling fallback failed:', fallbackErr);
      }
      // Fallback complete (or skipped)
      isFallbackRunning = false;

      // Calculate final results
      console.log('=== STARTING FINAL RESULTS CALCULATION ===');
      const rawFinalIntensity = analyzer.getFinalIntensity();
      console.log(`Raw final intensity: ${rawFinalIntensity}`);
      
      // For benchmark comparison, rawFinalIntensity is already a similarity percentage (0-100)
      let finalIntensity: number;
      // Always use benchmark mode since we're setting it explicitly
      finalIntensity = rawFinalIntensity; // Already 0-100 for benchmark mode
      
      console.log(`Final intensity: ${finalIntensity}`);
      console.log('About to classify speed...');
      const speedResult = classifySpeed(finalIntensity);
      console.log('Speed classified successfully:', speedResult);
      
      console.log('📊 Final Analysis Results:');
      console.log('  - Raw Final Intensity:', rawFinalIntensity);
      console.log('  - Clamped Final Intensity:', finalIntensity);
      console.log('  - Speed Result:', speedResult);
      console.log('  - Frame Intensities Count:', intensities.length);
      console.log('  - Last 5 intensities:', intensities.slice(-5).map(i => i.intensity));

      // Check if no bowling action was detected
      if (finalIntensity === 0) {
        console.log('🚫 No bowling action detected - setting flag');
        // Store a flag indicating no bowling action was detected
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('noBowlingActionDetected', 'true');
          console.log('📊 Set noBowlingActionDetected flag in sessionStorage');
        }

        dispatch({
          type: 'COMPLETE_ANALYSIS',
          payload: {
            finalIntensity: 0,
            speedClass: 'No Action',
            confidence: 0,
          }
        });

        // Navigation will be handled by useEffect when analysis state updates
        return;
      }

      // Get detailed analysis data
      console.log('📊 Getting detailed analysis data...');
      const detailedAnalysis = analyzer.getDetailedAnalysis();
      console.log('📊 Detailed analysis retrieved:', detailedAnalysis);

      // Store detailed analysis in sessionStorage immediately
      if (detailedAnalysis && typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem('benchmarkDetailedData', JSON.stringify(detailedAnalysis));
          console.log('✅ Stored detailed analysis in sessionStorage');

          // Get player name from sessionStorage
          const storedPlayerName = window.sessionStorage.getItem('playerName');
          
          // Helper function to safely parse and round values
          const safeParseAndRound = (value: any, fallback: number) => {
            if (value === null || value === undefined) return fallback;
            const parsed = parseFloat(String(value));
            return isNaN(parsed) ? fallback : Math.round(parsed * 100);
          };
          
          // Also store in the more comprehensive format
          const analysisVideoData = {
            intensity: finalIntensity,
            speedClass: speedResult.speedClass,
            kmh: Number(intensityToKmh(finalIntensity).toFixed(2)),
            similarity: finalIntensity,
            frameIntensities: intensities.map(({ timestamp, intensity }) => ({
              timestamp: Number(timestamp.toFixed(3)),
              intensity: isNaN(intensity) ? 0 : Number(intensity.toFixed(3)),
            })),
            phases: {
              runUp: safeParseAndRound(detailedAnalysis.runUp, 83),
              delivery: safeParseAndRound(detailedAnalysis.delivery, 86),
              followThrough: safeParseAndRound(detailedAnalysis.followThrough, 87),
            },
            technicalMetrics: {
              armSwing: safeParseAndRound(detailedAnalysis.armSwing, 80),
              bodyMovement: safeParseAndRound(detailedAnalysis.bodyMovement, 86),
              rhythm: safeParseAndRound(detailedAnalysis.rhythm, 81),
              releasePoint: safeParseAndRound(detailedAnalysis.releasePoint, 82),
            },
            recommendations: detailedAnalysis.recommendations || ['Focus on maintaining consistency'],
            playerName: storedPlayerName || 'Player',
            createdAt: new Date().toISOString(),
          };

          window.sessionStorage.setItem('analysisVideoData', JSON.stringify(analysisVideoData));
          window.sessionStorage.setItem('analysisVideoData_backup', JSON.stringify(analysisVideoData));
          window.sessionStorage.setItem('analysisVideoData_timestamp', Date.now().toString());
          console.log('✅ Stored comprehensive analysis data in sessionStorage');
          
          // Verify storage immediately
          const verification = window.sessionStorage.getItem('analysisVideoData');
          console.log('Verification - can retrieve immediately?', verification ? 'YES' : 'NO');
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
            analyzer_mode: 'benchmark',
            app: 'bowling-analyzer',
            player_name: storedPlayerName || null,
            playerName: storedPlayerName || null,
          },
          created_at: new Date().toISOString(),
        };
        window.sessionStorage.setItem('pendingLeaderboardEntry', JSON.stringify(pendingEntry));
      }

      // Navigation will be handled by useEffect when analysis state updates

    } catch (error) {
      console.error('❌ Analysis failed with error:', error);
      
      // Clean up
      if (frameSamplerRef.current) {
        frameSamplerRef.current.stop();
      }
      
      dispatch({ type: 'RESET_ANALYSIS' });
      
      // Show user-friendly error
      if (typeof window !== 'undefined') {
        alert('Analysis failed. Please try again or upload a different video.');
      }
    }
  }, [videoUrl, dispatch, state.analyzerMode, router]);

  // Show loading state while checking authorization
  if (isAuthorized === null) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000'
      }}>
        <div style={{ color: '#fff', fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  // Show unauthorized page if not authorized
  if (isAuthorized === false) {
    return <UnauthorizedAccess />;
  }

  return (
    <>
      {/* Processing Modal */}
      <ProcessingModal 
        isOpen={isFaceDetectionRunning} 
        message="Finding the best frame from your video." 
      />
      
      {/* Analysis Loading Overlay */}
      <AnalysisLoader isVisible={state.isAnalyzing} progress={state.progress} />

      {/* Transition Blur Overlay - appears after analysis completes before navigation */}
      {showTransitionBlur && (
        <div
          className="fixed inset-0 z-50"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            transition: 'all 0.3s ease-in-out',
          }}
        />
      )}
      
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
      <div className="hidden md:flex flex-col" style={{
        minHeight: "100vh",
        backgroundImage: 'url("/images/desktop bg (1).png")',
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
        <div className="flex-1 flex items-stretch relative" style={{ minHeight: '85vh' }}>
          {/* Left side - Loan Approved Image */}
          <div className="flex-1 relative">
            <img
              src="/images/loanapprovednew.png"
              alt="Loan Approved"
              style={{
                position: 'absolute',
                bottom: '-20px',
                left: '60%',
                transform: 'translateX(-50%)',
                width: '480px',
                height: '580px',
                margin: 0,
                padding: 0,
                display: 'block',
                objectFit: 'contain',
                zIndex: 10
              }}
            />
          </div>

          {/* Right side - Large Glass Box Container */}
          <div className="flex-1 flex justify-end items-stretch" style={{ paddingLeft: '60px' }}>
            <div className="relative" style={{ width: 900, height: '100%' }}>
              {/* Large Glass Box Background */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5)), url(/images/ballsglass.png)",
                  backgroundRepeat: "no-repeat, no-repeat",
                  backgroundPosition: "center, center",
                  backgroundSize: "100% 100%, contain",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: "inset 0 0 0 1px #FFFFFF",
                  borderTopLeftRadius: 60,
                  borderBottomLeftRadius: 60,
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  zIndex: 1,
                }}
              />

              {/* Back Button - Top Left Corner of Large Glass Box */}
              <div
                style={{
                  position: "absolute",
                  top: "24px",
                  left: "24px",
                  width: "60px",
                  height: "60px",
                  borderRadius: "20px",
                  backgroundColor: "#0095D740",
                  border: "2px solid #0095D74D",
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
                onClick={() => {
                  // Don't allow back navigation during analysis
                  if (!state.isAnalyzing) {
                    window.history.back();
                  }
                }}
                onMouseEnter={(e) => {
                  if (!state.isAnalyzing) {
                    e.currentTarget.style.backgroundColor = "#0095D760";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#0095D740";
                }}
              >
                {/* Left Arrow Icon */}
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 18L9 12L15 6"
                    stroke="#0095D7"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Video Preview Glass Box - Centered */}
              <div className="relative flex flex-col items-center justify-center" style={{ height: '100%', paddingTop: 40, paddingBottom: 40, zIndex: 2 }}>
                <div
                  className="w-full"
                  style={{
                    maxWidth: 500,
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
                  }}
                >

                  {/* Desktop Video Preview Content */}
                  <div className="text-center w-full">
                    {/* Preview Your Delivery headline */}
                    <div className="mb-6 text-center">
                      <div className="flex justify-center mb-1">
                        <img
                          src="/images/newhomepage/previewyourdelivery.png"
                          alt="Preview Your Delivery"
                          style={{
                            width: "85%",
                            maxWidth: "360px",
                            height: "auto",
                            marginLeft: "10px"
                          }}
                        />
                      </div>

                      <p
                        style={{
                          fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                          fontWeight: 400,
                          fontStyle: "normal",
                          fontSize: "20px", // Increased from 18 to 20 (+2)
                          lineHeight: "24px", // Increased from 1.3 to 24px
                          color: "#000000", // Changed from #0A0A0A to #000000 to match mobile
                          margin: 0,
                          textAlign: "center"
                        }}
                      >
                        Make sure your best ball is ready before you submit!
                      </p>
                    </div>

                    {/* Video Preview Box - Desktop */}
                    <div className="mb-6">
                      <div
                        className="relative overflow-hidden w-full max-w-sm md:max-w-md mx-auto"
                        style={{
                          borderRadius: '20px', // Changed from 16px to 20px to match mobile
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          aspectRatio: isPortraitVideo ? '9/16' : '16/9',
                          minHeight: '180px', // Changed from 200px to 180px to match mobile
                          maxHeight: isPortraitVideo ? '400px' : '240px' // Changed from 320px/260px to 400px/240px to match mobile
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
                              controls={!state.isAnalyzing}
                              preload="metadata"
                              playsInline
                              muted={state.isAnalyzing}
                              crossOrigin="anonymous"
                              className={isPortraitVideo ? 'w-full h-full object-contain bg-black' : 'w-full h-full object-cover'}
                              style={{ 
                                borderRadius: '20px',
                                pointerEvents: state.isAnalyzing ? 'none' : 'auto',
                                opacity: state.isAnalyzing ? 0.5 : 1
                              }}
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
                                  <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 2v-7l-4 2z" />
                                </svg>
                              </div>
                              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px' }}> {/* Increased from 12px to 14px (+2) */}
                                No video available
                              </p>
                              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', opacity: 0.7 }}> {/* Increased from 10px to 12px (+2) */}
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
                          backgroundColor: '#80CAEB', // Changed from #CCEAF7 to #80CAEB as requested
                          borderRadius: '20px', // Changed from 16px to 20px to match mobile
                          fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                          fontWeight: '700',
                          fontSize: 'clamp(12px, 2.5vw, 14px)', // Increased from 12 to 14 (+2) and made responsive
                          color: 'black',
                          minWidth: '142px', // Added minWidth to match mobile
                          height: '36px',
                          border: 'none',
                          padding: '0 16px' // Changed from 12px to 16px to match mobile
                        }}
                      >
                        <svg
                          width="16" // Increased from 14 to 16 to match mobile
                          height="16" // Increased from 14 to 16 to match mobile
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-2"
                        >
                          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                          <path d="M21 3v5h-5" />
                          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                          <path d="M8 16H3v5" />
                        </svg>
                        Retry
                      </Link>

                      {/* View Analysis Button */}
                      <button
                        onClick={async () => {
                          console.log('🎬 View Analysis button clicked - Starting analysis');
                          await startAnalysis();
                        }}
                        disabled={state.isAnalyzing}
                        className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          padding: '0 16px',
                          cursor: state.isAnalyzing ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {state.isAnalyzing ? 'Analyzing...' : 'View Analysis'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Footer */}
        <footer className="w-full bg-black px-4 md:px-8 pt-4 pb-6 relative z-20">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
            {/* Copyright Text */}
            <div className="text-center">
              <p 
                className="text-white text-xs"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: 'clamp(10px, 2vw, 14px)',
                  lineHeight: '1.4'
                }}
              >
                © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833 | <Link href="/terms-and-conditions" className="text-blue-300 hover:text-blue-200 underline">Terms and Conditions</Link>
              </p>
            </div>
            
            {/* Social Media Icons */}
            <div className="flex items-center gap-3">
              <span 
                className="text-white text-xs mr-2"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: 'clamp(10px, 2vw, 14px)'
                }}
              >
                Connect with us
              </span>
              
              {/* Social Icons */}
              <div className="flex gap-3 md:gap-4">
                {/* Facebook */}
                <a href="https://m.facebook.com/LnTFS?wtsid=rdr_0GljAOcj6obaXQY93" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                
                {/* Instagram */}
                <a href="https://www.instagram.com/lntfinance?igsh=a3ZvY2JxaWdnb25s" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
                  </svg>
                </a>
                
                {/* Twitter */}
                <a href="https://x.com/LnTFinance" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                
                {/* YouTube */}
                <a href="https://www.youtube.com/user/ltfinance" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
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
                <GlassBackButton />
                {/* Preview Your Delivery headline */}
                <div className="mb-6 text-center" style={{ marginTop: '30px' }}>
                  <div className="flex justify-center mb-1">
                    <img
                      src="/images/newhomepage/previewyourdelivery.png"
                      alt="Preview Your Delivery"
                      style={{
                        width: "85%",
                        maxWidth: "360px",
                        height: "auto",
                        marginLeft: "10px"
                      }}
                    />
                  </div>

                  <p
                    style={{
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: 400,
                      fontStyle: "normal",
                      fontSize: "18px",
                      lineHeight: "22px",
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
                          controls={!state.isAnalyzing}
                          preload="metadata"
                          playsInline
                          muted={state.isAnalyzing}
                          className={isPortraitVideo ? 'w-full h-full object-contain bg-black' : 'w-full h-full object-cover'}
                          style={{ 
                            borderRadius: '20px',
                            pointerEvents: state.isAnalyzing ? 'none' : 'auto',
                            opacity: state.isAnalyzing ? 0.5 : 1
                          }}
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
                              <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 2v-7l-4 2z" />
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
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M8 16H3v5" />
                    </svg>
                    Retry
                  </Link>

                  {/* View Analysis Button */}
                  <button
                    onClick={async () => {
                      console.log('🎬 View Analysis button clicked - Starting analysis');
                      await startAnalysis();
                    }}
                    disabled={state.isAnalyzing}
                    className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      padding: '0 16px',
                      cursor: state.isAnalyzing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {state.isAnalyzing ? 'Analyzing...' : 'View Analysis'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="md:hidden mt-auto w-full bg-black px-4 md:px-8 pt-4 pb-6">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
            {/* Copyright Text */}
            <div className="text-center">
              <p 
                className="text-white text-xs"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: 'clamp(10px, 2vw, 14px)',
                  lineHeight: '1.4'
                }}
              >
                © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833 | <Link href="/terms-and-conditions" className="text-blue-300 hover:text-blue-200 underline">Terms and Conditions</Link>
              </p>
            </div>
            
            {/* Social Media Icons */}
            <div className="flex items-center gap-3">
              <span 
                className="text-white text-xs mr-2"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: 'clamp(10px, 2vw, 14px)'
                }}
              >
                Connect with us
              </span>
              
              {/* Social Icons */}
              <div className="flex gap-3 md:gap-4">
                {/* Facebook */}
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                
                {/* Instagram */}
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
                  </svg>
                </div>
                
                {/* Twitter */}
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </div>
                
                {/* YouTube */}
                <a href="https://www.youtube.com/user/ltfinance" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
    </>
  );
}




