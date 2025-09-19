'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useIntersectionObserver } from '../../hooks/use-intersection-observer';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAnalysis, FrameIntensity, AnalyzerMode } from '@/context/AnalysisContext';
import { AnalysisLoader } from '@/components/AnalysisLoader';
import { PoseBasedAnalyzer } from '@/lib/analyzers/poseBased';
import { BenchmarkComparisonAnalyzer } from '@/lib/analyzers/benchmarkComparison';
import { FrameSampler } from '@/lib/video/frameSampler';
import { classifySpeed } from '@/lib/utils/normalize';

function VideoPreviewContent() {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<string>('00:00');
  const [fileName, setFileName] = useState<string>('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { state, dispatch } = useAnalysis();
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameSamplerRef = useRef<FrameSampler | null>(null);
  const poseAnalyzerRef = useRef<PoseBasedAnalyzer>(new PoseBasedAnalyzer());
  const benchmarkAnalyzerRef = useRef<BenchmarkComparisonAnalyzer>(new BenchmarkComparisonAnalyzer());

  // Intersection observers for animations
  const titleSection = useIntersectionObserver({ threshold: 0.1, freezeOnceVisible: true });
  const videoSection = useIntersectionObserver({ threshold: 0.1, freezeOnceVisible: true });
  const buttonsSection = useIntersectionObserver({ threshold: 0.1, freezeOnceVisible: true });

  useEffect(() => {
    // Check if there's video data in sessionStorage (from upload)
    const storedVideoUrl = sessionStorage.getItem('uploadedVideoUrl');
    const storedFileName = sessionStorage.getItem('uploadedFileName');
    
    if (storedVideoUrl) {
      setVideoUrl(storedVideoUrl);
      setFileName(storedFileName || 'uploaded-video.mp4');
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

      dispatch({
        type: 'COMPLETE_ANALYSIS',
        payload: {
          finalIntensity,
          speedClass: speedResult.speedClass,
          confidence: speedResult.confidence,
        }
      });

      // Navigate to analyzing page with results
      setTimeout(() => {
        router.push('/analyzing');
      }, 1000);

    } catch (error) {
      console.error('Analysis failed:', error);
      dispatch({ type: 'RESET_ANALYSIS' });
    }
  }, [videoUrl, dispatch, router]);

  return (
    <div 
      className="min-h-screen flex flex-col" 
      style={{ 
        backgroundImage: 'url(/frontend-images/homepage/bowlbg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute top-4 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <img
          src="/frontend-images/homepage/justzoom logo.png"
          alt="JustZoom logo"
          className="h-12 w-auto"
        />
      </div>
      {/* Header with Back Button */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-6 px-4">
        <Link 
          href="/record-upload"
          className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 pt-20 pb-12 px-4">
        {/* Title Section */}
        <div className="text-center mb-8" ref={titleSection.ref}>
          <h1 
            className={`mb-2 animate-fadeInUp ${titleSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              fontFamily: 'Frutiger, Inter, sans-serif',
              fontWeight: '700',
              fontSize: '24px',
              color: '#FDC217',
              lineHeight: '1.2'
            }}
          >
            Video Preview
          </h1>
          <p 
            className={`animate-fadeInUp animate-delay-200 ${titleSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: '400',
              fontSize: '12px',
              color: 'white',
              lineHeight: '1.3'
            }}
          >
            Review your submission
          </p>
        </div>

        {/* Video Preview Section */}
        <div className="mb-8" ref={videoSection.ref}>
          <div 
            className={`max-w-md mx-auto animate-scaleIn ${videoSection.isIntersecting ? 'animate-on-scroll' : ''}`}
          >
            <div 
              className="relative overflow-hidden"
              style={{
                borderRadius: '20px',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                aspectRatio: '16/9'
              }}
            >
              {videoUrl ? (
                <>
                  {/* Actual uploaded video */}
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    preload="metadata"
                    className="w-full h-full object-cover"
                    style={{ borderRadius: '20px' }}
                    onLoadedMetadata={handleVideoLoadedMetadata}
                  >
                    Your browser does not support the video tag.
                  </video>
                  
                  {/* Video duration overlay */}
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
                <>
                  {/* Fallback placeholder if no video */}
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* File Information Section */}
        {videoUrl && fileName && (
          <div className="mb-6" ref={videoSection.ref}>
            <div 
              className={`max-w-md mx-auto p-4 backdrop-blur-md border border-white/20 animate-fadeInUp animate-delay-300 ${videoSection.isIntersecting ? 'animate-on-scroll' : ''}`}
              style={{
                borderRadius: '15px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
              }}
            >
              <div className="text-center">
                <p 
                  className="text-white mb-1"
                  style={{
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '700',
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}
                >
                  {fileName}
                </p>
                <p 
                  className="text-white text-xs opacity-70"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '400',
                    fontSize: '12px'
                  }}
                >
                  Duration: {videoDuration}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="flex justify-center mb-6" ref={buttonsSection.ref}>
          <button
            onClick={startAnalysis}
            disabled={state.isAnalyzing || !videoUrl}
            className={`inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 animate-bounceIn disabled:opacity-50 disabled:cursor-not-allowed ${buttonsSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              backgroundColor: '#FFC315',
              borderRadius: '25.62px',
              fontFamily: 'Frutiger, Inter, sans-serif',
              fontWeight: '700',
              fontSize: '16px',
              color: 'black',
              width: '261px',
              height: '41px',
              border: 'none'
            }}
          >
            {state.isAnalyzing ? 'Analyzing...' : 'Continue to Submit'}
          </button>
        </div>

        {/* Retry Button (Glass Style) */}
        <div className="flex justify-center">
          <Link 
            href="/record-upload"
            className={`inline-flex items-center justify-center text-white font-bold transition-all duration-300 transform hover:scale-105 animate-fadeInUp animate-delay-200 ${buttonsSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '25.62px',
              fontFamily: 'Frutiger, Inter, sans-serif',
              fontWeight: '700',
              fontSize: '16px',
              color: 'white',
              width: '261px',
              height: '41px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
            }}
          >
            Retry
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full bg-black px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 max-w-6xl mx-auto">
          {/* Copyright Text */}
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
          
          {/* Social Media Icons */}
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
            
            {/* Social Icons */}
            <div className="flex gap-3">
              {/* Facebook */}
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              
              {/* Instagram */}
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              
              {/* Twitter */}
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </div>
              
              {/* YouTube */}
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Analysis Loading Overlay */}
      <AnalysisLoader isVisible={state.isAnalyzing} progress={state.progress} />
    </div>
  );
}

// Main component wrapped with AnalysisProvider
export default function VideoPreviewPage() {
  return <VideoPreviewContent />;
}
