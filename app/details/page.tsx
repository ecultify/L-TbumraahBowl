'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAnalysis, FrameIntensity, AnalyzerMode } from '@/context/AnalysisContext';
import { AnalysisLoader } from '@/components/AnalysisLoader';
import { DetailsCard } from '@/components/DetailsCard';
import { GlassBackButton } from '@/components/GlassBackButton';
import { PoseBasedAnalyzer } from '@/lib/analyzers/poseBased';
import { BenchmarkComparisonAnalyzer } from '@/lib/analyzers/benchmarkComparison';
import { FrameSampler } from '@/lib/video/frameSampler';
import { classifySpeed, intensityToKmh, normalizeIntensity } from '@/lib/utils/normalize';

export default function DetailsPage() {
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<string>('00:00');
  const [fileName, setFileName] = useState<string>('');
  const [videoSource, setVideoSource] = useState<'record' | 'upload' | 'unknown'>('unknown');
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [fileSizeLabel, setFileSizeLabel] = useState<string | null>(null);
  const [isPortraitVideo, setIsPortraitVideo] = useState(false);
  const [hasAnalysisData, setHasAnalysisData] = useState(false);
  const { state, dispatch } = useAnalysis();
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameSamplerRef = useRef<FrameSampler | null>(null);
  const poseAnalyzerRef = useRef<PoseBasedAnalyzer>(new PoseBasedAnalyzer());
  const benchmarkAnalyzerRef = useRef<BenchmarkComparisonAnalyzer>(new BenchmarkComparisonAnalyzer());

  // Load video data from sessionStorage
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
    
    console.log('🔍 Details Page: Checking available video data...');
    console.log('📊 storedVideoUrl:', storedVideoUrl ? 'Available' : 'Missing');
    console.log('📊 storedVideoData:', storedVideoData ? `Available (${(storedVideoData.length / 1024).toFixed(1)}KB)` : 'Missing');
    console.log('📊 storedFileName:', storedFileName);
    console.log('📊 storedSource:', storedSource);

    // Recreate video URL from stored file reference if available
    if (typeof window !== 'undefined' && (window as any).tempVideoFile) {
      try {
        const tempFile = (window as any).tempVideoFile;
        const newVideoUrl = URL.createObjectURL(tempFile);
        setVideoUrl(newVideoUrl);
        console.log('✅ Using temporary file reference to create fresh blob URL');
      } catch (error) {
        console.error('❌ Error using temporary file reference:', error);
        // Fallback to stored URL
        if (storedVideoUrl) {
          setVideoUrl(storedVideoUrl);
          console.log('✅ Fallback: Using stored video URL');
        }
      }
    } else if (storedVideoUrl) {
      setVideoUrl(storedVideoUrl);
      console.log('✅ Using stored video URL directly');
    }
    
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

  // Debug: Watch analysis state changes
  useEffect(() => {
    console.log('📊 Analysis state changed:', {
      isAnalyzing: state.isAnalyzing,
      progress: state.progress,
      finalIntensity: state.finalIntensity,
      speedClass: state.speedClass,
      confidence: state.confidence
    });
  }, [state.isAnalyzing, state.progress, state.finalIntensity, state.speedClass, state.confidence]);

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
      analyzer.reset();
      console.log('✅ Analyzer reset completed');

      // Start frame sampling
      const intensities: FrameIntensity[] = [];
      let frameCount = 0;
      const totalFrames = Math.floor(videoRef.current.duration * 12); // Estimate frames
      console.log(`Processing ${totalFrames} frames at 12 FPS`);

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
        videoHeight: videoRef.current.videoHeight
      });
      
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
      console.log('📊 Getting detailed analysis data in details page...');
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

      // Navigation will be handled by useEffect when analysis state updates (line 232-256)

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

  // Debug: Check if analysis data is available in sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔍 Details Page: Checking sessionStorage data...');
      const analysisData = window.sessionStorage.getItem('analysisVideoData');
      const benchmarkData = window.sessionStorage.getItem('benchmarkDetailedData');
      console.log('📊 analysisVideoData available:', !!analysisData);
      console.log('📊 benchmarkDetailedData available:', !!benchmarkData);
      if (analysisData) {
        try {
          const parsed = JSON.parse(analysisData);
          console.log('📊 Analysis data preview:', { 
            intensity: parsed.intensity, 
            speedClass: parsed.speedClass,
            kmh: parsed.kmh
          });
        } catch (e) {
          console.error('❌ Error parsing analysis data:', e);
        }
      }
    }
  }, []);
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
      {/* Hidden video for analysis */}
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          preload="metadata"
          className="hidden"
          onLoadedMetadata={handleVideoLoadedMetadata}
          onError={handleVideoError}
        >
          Your browser does not support the video tag.
        </video>
      )}

      {/* Analysis Loading Overlay */}
      <AnalysisLoader isVisible={state.isAnalyzing} progress={state.progress} />
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-col" style={{
        minHeight: "100vh",
        backgroundImage: "url(/images/Desktop.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}>
        {/* Logo in top left corner */}
        <div className="absolute top-6 left-6 z-20">
          <div
            onClick={() => {
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
        <div className="flex-1 flex items-stretch relative" style={{ minHeight: '90vh' }}>
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
            <div className="relative" style={{ width: 740, height: '100%' }}>
              {/* Large Glass Box Background */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "#FFFFFF80",
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
                  cursor: "pointer",
                  zIndex: 10,
                  transition: "all 0.2s ease"
                }}
                onClick={() => window.history.back()}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#0095D760";
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

              {/* Details Glass Box - Centered */}
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
                  {/* Desktop Details Content */}
                  <div className="w-full">
                <DetailsCard
                  submitLabel={'Analyze Video'}
                  loading={state.isAnalyzing}
                  onSubmit={async (payload) => {
                    // Store player name and details
                    if (typeof window !== 'undefined') {
                      window.sessionStorage.setItem('detailsCompleted', 'true');
                      window.sessionStorage.setItem('playerName', payload.name);
                      window.sessionStorage.setItem('playerPhone', payload.phone || '');
                      console.log('✅ Details completed - flag set in sessionStorage');
                      console.log('✅ Player name stored:', payload.name);
                    }
                    
                    // Always start fresh analysis for the current video
                    console.log('🎬 Submit clicked - Starting fresh analysis');
                    await startAnalysis();
                  }}
                />
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
          <div className="relative mx-auto max-w-md md:max-w-2xl lg:max-w-4xl" style={{ width: "100%", maxWidth: 400, marginTop: 4 }}>
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
                <DetailsCard
                  submitLabel={'Analyze Video'}
                  loading={state.isAnalyzing}
                  onSubmit={async (payload) => {
                    // Store player name and details
                    if (typeof window !== 'undefined') {
                      window.sessionStorage.setItem('detailsCompleted', 'true');
                      window.sessionStorage.setItem('playerName', payload.name);
                      window.sessionStorage.setItem('playerPhone', payload.phone || '');
                      console.log('✅ Details completed - flag set in sessionStorage');
                      console.log('✅ Player name stored:', payload.name);
                    }
                    
                    // Always start fresh analysis for the current video
                    console.log('🎬 Submit clicked - Starting fresh analysis');
                    await startAnalysis();
                  }}
                />
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/></svg>
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
    </div>
  );
}
