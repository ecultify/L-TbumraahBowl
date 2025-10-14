"use client";
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GlassBackButton } from '@/components/GlassBackButton';
import { normalizeVideoUrl } from '@/lib/utils/urlNormalization';
import { usePageProtection } from '@/lib/hooks/usePageProtection';
import { UnauthorizedAccess } from '@/components/UnauthorizedAccess';

export default function DownloadVideoPage() {
  // ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY CONDITIONAL RETURNS
  // Protect this page - require OTP verification and proper flow
  const isAuthorized = usePageProtection('download-video');
  const router = useRouter();
  
  // All state hooks
  const [url, setUrl] = React.useState<string | null>(null);
  const [isRendering, setIsRendering] = React.useState(false);
  const [renderProgress, setRenderProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [renderStartTime, setRenderStartTime] = React.useState<number>(0);
  const [isMobileView, setIsMobileView] = React.useState(false);
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Poll for render completion
  const pollRenderStatus = React.useCallback(async () => {
    try {
      const renderId = window.sessionStorage.getItem('videoRenderId');
      if (!renderId) {
        console.log('[DownloadVideo] No render ID found, checking for completed video...');
        const completedUrl = window.sessionStorage.getItem('generatedVideoUrl');
        if (completedUrl) {
          setUrl(completedUrl);
          setIsRendering(false);
          window.sessionStorage.setItem('videoRenderStatus', 'completed');
        }
        return;
      }

      // Determine endpoints
      const host = window.location.host.toLowerCase();
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
      
      // On localhost, use Next.js API routes
      if (isLocalhost) {
        const STATUS = '/api/renders/status';
        const statusRes = await fetch(`${STATUS}?renderId=${renderId}`);
        
        if (!statusRes.ok) {
          throw new Error('Failed to fetch render status');
        }

        const statusJson = await statusRes.json();
        console.log('[DownloadVideo] Render status:', statusJson);

        if (statusJson.progress && typeof statusJson.progress === 'number') {
          setRenderProgress(Math.round(statusJson.progress));
        }

        if (statusJson.done) {
          if (statusJson.url) {
            console.log('[DownloadVideo] ✅ Render complete!');
            setUrl(statusJson.url);
            setIsRendering(false);
            window.sessionStorage.setItem('generatedVideoUrl', statusJson.url);
            window.sessionStorage.setItem('videoRenderStatus', 'completed');
            
            // Stop polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          } else if (statusJson.error) {
            throw new Error(statusJson.error);
          }
        }
        return;
      }
      
      // For production/Hostinger, use PHP endpoints
      let BASE = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || '';
      let RUNTIME_KEY = process.env.NEXT_PUBLIC_BACKEND_KEY || '';
      
      try {
        const res = await fetch('/env.php');
        if (res.ok) {
          const cfg = await res.json();
          if (cfg && typeof cfg.backendBaseUrl === 'string') BASE = cfg.backendBaseUrl;
          if (cfg && typeof cfg.backendKey === 'string' && cfg.backendKey) RUNTIME_KEY = cfg.backendKey;
        }
      } catch {}

      const STATUS = BASE ? `${BASE}/api/renders/status` : `/render-status.php`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (RUNTIME_KEY) headers['x-backend-key'] = RUNTIME_KEY;

      const statusRes = await fetch(`${STATUS}?renderId=${renderId}`, { headers });
      
      if (!statusRes.ok) {
        throw new Error('Failed to fetch render status');
      }

      const statusJson = await statusRes.json();
      console.log('[DownloadVideo] Render status:', statusJson);

      if (statusJson.progress && typeof statusJson.progress === 'number') {
        setRenderProgress(Math.round(statusJson.progress * 100));
      }

      if (statusJson.done) {
        if (statusJson.url || statusJson.videoUrl) {
          const rawUrl = statusJson.url || statusJson.videoUrl;
          console.log('[DownloadVideo] ✅ Render complete!');
          console.log('[DownloadVideo] Raw URL from server (full):', rawUrl);
          console.log('[DownloadVideo] URL starts with https://:', rawUrl.startsWith('https://'));
          console.log('[DownloadVideo] URL includes "bowllikebumrah.com":', rawUrl.includes('bowllikebumrah.com'));
          console.log('[DownloadVideo] URL includes "supabase.co":', rawUrl.includes('supabase.co'));
          
          // 🆕 NORMALIZE URL BEFORE USING (fixes https// -> https://)
          const normalizedUrl = normalizeVideoUrl(rawUrl);
          
          if (normalizedUrl) {
            setUrl(normalizedUrl);
            window.sessionStorage.setItem('generatedVideoUrl', normalizedUrl);
            console.log('[DownloadVideo] ✅ URL normalized and stored:', normalizedUrl.substring(0, 100));
          } else {
            console.error('[DownloadVideo] ❌ Invalid URL from server');
            setUrl(rawUrl); // Use as-is, but log the issue
            window.sessionStorage.setItem('generatedVideoUrl', rawUrl);
          }
          
          setIsRendering(false);
          window.sessionStorage.setItem('videoRenderStatus', 'completed');
          
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (statusJson.error) {
          throw new Error(statusJson.error);
        }
      }
    } catch (err) {
      console.error('[DownloadVideo] Polling error:', err);
      setError(err instanceof Error ? err.message : 'Failed to check render status');
      setIsRendering(false);
      
      // Stop polling on error
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, []);

  // Check for mobile view
  React.useEffect(() => {
    const updateView = () => {
      if (typeof window === 'undefined') return;
      setIsMobileView(window.innerWidth < 768);
    };

    updateView();
    window.addEventListener('resize', updateView);
    return () => window.removeEventListener('resize', updateView);
  }, []);

  // Initialize and check render status
  React.useEffect(() => {
    try {
      if (typeof window === 'undefined') return;

      // Get render status and URLs
      const renderStatus = window.sessionStorage.getItem('videoRenderStatus');
      const freshVideoUrl = window.sessionStorage.getItem('generatedVideoUrl');
      const renderId = window.sessionStorage.getItem('videoRenderId');
      const startTime = window.sessionStorage.getItem('videoRenderStartTime');
      
      // FIRST: Check if there's a fresh video from current render (retry scenario)
      if (renderStatus === 'completed' && freshVideoUrl) {
        console.log('[DownloadVideo] ✨ Fresh video detected - using NEW video (retry)');
        const normalizedUrl = normalizeVideoUrl(freshVideoUrl);
        if (normalizedUrl) {
          setUrl(normalizedUrl);
          setIsRendering(false);
          console.log('[DownloadVideo] ✅ Fresh video URL loaded');
          return;
        }
      }
      
      // SECOND: Only check existing video if no fresh video available
      const isReturningUser = window.sessionStorage.getItem('isReturningUser') === 'true';
      const hasVideo = window.sessionStorage.getItem('hasVideo') === 'true';
      const existingVideoUrl = window.sessionStorage.getItem('existingVideoUrl');

      if (isReturningUser && hasVideo && existingVideoUrl) {
        console.log('[DownloadVideo] 📦 No fresh video - loading CACHED existing video');
        console.log('[DownloadVideo] Cached video URL:', existingVideoUrl);
        setUrl(existingVideoUrl);
        setIsRendering(false);
        return;
      }

      console.log('[DownloadVideo] Initial status:', { 
        renderStatus, 
        hasUrl: !!freshVideoUrl, 
        hasRenderId: !!renderId 
      });

      if (startTime) {
        setRenderStartTime(parseInt(startTime));
      }

      // If we have a render ID, start polling regardless of status
      // (handles case where status was set to 'failed' due to dev server crash)
      if (renderId && !freshVideoUrl) {
        console.log('[DownloadVideo] Found render ID, starting polling...');
        setIsRendering(true);
        setRenderProgress(10);
        
        // Clear failed status if present
        if (renderStatus === 'failed') {
          window.sessionStorage.setItem('videoRenderStatus', 'rendering');
        }
        
        // Start polling
        pollRenderStatus(); // Initial poll
        pollingIntervalRef.current = setInterval(pollRenderStatus, 3000); // Poll every 3 seconds
        
        return () => {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
        };
      }

      // If video is rendering
      if (renderStatus === 'rendering') {
        setIsRendering(true);
        setRenderProgress(10);
        
        // Start polling
        pollRenderStatus(); // Initial poll
        pollingIntervalRef.current = setInterval(pollRenderStatus, 3000); // Poll every 3 seconds
        
        return () => {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
        };
      }

      // If no render status, check for completed video
      if (freshVideoUrl) {
        setUrl(normalizeVideoUrl(freshVideoUrl) || freshVideoUrl);
      }
    } catch (err) {
      console.error('[DownloadVideo] Initialization error:', err);
    }
  }, [pollRenderStatus]);

  // Calculate elapsed time
  const elapsedTime = renderStartTime ? Math.round((Date.now() - renderStartTime) / 1000) : 0;

  // Handle Retry button click
  const handleRetry = React.useCallback(() => {
    console.log('[Retry] User clicked retry on download video page');
    
    if (typeof window !== 'undefined') {
      // Clear analysis and video data only - preserve user auth/flow data
      window.sessionStorage.removeItem('analysisResults');
      window.sessionStorage.removeItem('compositeCardUrl');
      window.sessionStorage.removeItem('generatedVideoUrl');
      window.sessionStorage.removeItem('existingCompositeCardUrl');
      window.sessionStorage.removeItem('existingVideoUrl');
      window.sessionStorage.removeItem('existingSimilarityPercent');
      window.sessionStorage.removeItem('geminiAvatarUrl');
      window.sessionStorage.removeItem('videoRenderId');
      window.sessionStorage.removeItem('videoRenderStatus');
      window.sessionStorage.removeItem('videoRenderStartTime');
      window.sessionStorage.removeItem('analysisVideoData');
      window.sessionStorage.removeItem('benchmarkDetailedData');
      window.sessionStorage.removeItem('leaderboardEntryId');
      
      // Keep these items for page protection and user flow:
      // - playerPhone, playerName
      // - otpVerified, otpVerifiedForBowling
      // - detailsCompleted
      // - isReturningUser, existingRecordId
      // - userFlow
      
      console.log('[Retry] Redirecting to record-upload page...');
      console.log('[Retry] Preserved session data:', {
        phone: window.sessionStorage.getItem('playerPhone'),
        name: window.sessionStorage.getItem('playerName'),
        otpVerified: window.sessionStorage.getItem('otpVerified'),
        detailsCompleted: window.sessionStorage.getItem('detailsCompleted'),
        isReturningUser: window.sessionStorage.getItem('isReturningUser')
      });
    }
    
    // Navigate to record-upload page using Next.js router (client-side navigation)
    router.push('/record-upload');
  }, [router]);

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

  // Error state - Use new layout
  if (error) {
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

                {/* Error Content - Centered */}
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
                      gap: 20,
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <h2 style={{ 
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: 700,
                        fontSize: 24,
                        color: '#DC2626',
                        marginBottom: 16
                      }}>
                        Oops! Something went wrong
                      </h2>
                      <p style={{
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: 400,
                        fontSize: 16,
                        color: '#000',
                        marginBottom: 24
                      }}>
                        {error}
                      </p>
                      <Link href="/analyze">
                        <button
                          style={{
                            backgroundColor: '#FDC217',
                            color: '#000',
                            fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                            fontWeight: 700,
                            fontSize: 16,
                            padding: '12px 32px',
                            borderRadius: 25,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          Go Back to Results
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Footer */}
          <footer className="w-full bg-black px-4 md:px-8 pt-4 pb-6 relative z-20">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
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
                
                <div className="flex gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.30 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden min-h-screen flex flex-col">
          <main className="flex-1 px-6 pt-20 pb-8 flex justify-center relative z-10">
            <div className="relative mx-auto" style={{ width: "100%", maxWidth: 400, marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16, paddingLeft: 4 }}>
                <img
                  src="/images/newhomepage/Bowling%20Campaign%20Logo.png"
                  alt="Bowling Campaign Logo"
                  style={{ width: 208, height: "auto", cursor: "pointer" }}
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      sessionStorage.clear();
                      window.location.href = '/';
                    }
                  }}
                />
              </div>

              <div style={{ position: "relative", width: "100%" }}>
                <img
                  src="/images/instructions/loanapproved.png"
                  alt="Loan Approved"
                  style={{ 
                    position: "absolute", 
                    top: -170, 
                    right: -8, 
                    width: 150, 
                    height: "auto", 
                    zIndex: 1, 
                    pointerEvents: "none" 
                  }}
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
                    gap: 16,
                    zIndex: 2,
                    marginTop: 20,
                    textAlign: "center"
                  }}
                >
                  <GlassBackButton />
                  
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
                  <h2 style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: 700,
                    fontSize: 20,
                    color: "#000",
                    marginBottom: 8
                  }}>Rendering Failed</h2>
                  <p style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontSize: 14,
                    color: "#666",
                    marginBottom: 16
                  }}>{error}</p>
                  <Link href="/analyze" style={{ textDecoration: 'none', width: '100%' }}>
                    <button
                      style={{
                        width: "100%",
                        backgroundColor: '#FDC217',
                        borderRadius: '25.62px',
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: '700',
                        fontSize: '14px',
                        color: 'black',
                        padding: '10px 16px',
                        border: 'none',
                        cursor: 'pointer'
                      }}
          >
            Go Back to Results
                    </button>
          </Link>
                </div>
              </div>
            </div>
          </main>

          {/* Mobile Footer */}
          <footer className="mt-auto w-full bg-black px-4 md:px-8 pt-4 pb-6">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
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
                
                <div className="flex gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  // Rendering in progress - Use new layout
  if (isRendering) {
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

                {/* Rendering Content - Centered */}
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
                      gap: 20,
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <h2 style={{ 
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: 700,
                        fontSize: 24,
                        color: '#1E40AF',
                        marginBottom: 16
                      }}>
                        Creating Your Video...
                      </h2>
                      <div style={{ 
                        width: '100%', 
                        height: 8,
                        backgroundColor: '#E5E7EB',
                        borderRadius: 4,
                        overflow: 'hidden',
                        marginBottom: 16
                      }}>
                        <div 
                          style={{
                            width: `${renderProgress}%`,
                            height: '100%',
                            backgroundColor: '#FDC217',
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                      <p style={{
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: 600,
                        fontSize: 18,
                        color: '#1E40AF',
                        marginBottom: 8
                      }}>
                        {renderProgress}% Complete
                      </p>
                      <p style={{
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: 400,
                        fontSize: 14,
                        color: '#6B7280'
                      }}>
                        Elapsed time: {elapsedTime}s
                      </p>
                      <p style={{
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: 400,
                        fontSize: 14,
                        color: '#1E40AF',
                        marginTop: 16
                      }}>
                        💡 <strong>Did you know?</strong> Your video includes your actual bowling action compared to professional benchmarks!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Footer */}
          <footer className="w-full bg-black px-4 md:px-8 pt-4 pb-6 relative z-20">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
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
                
                <div className="flex gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden min-h-screen flex flex-col">
          <main className="flex-1 px-6 pt-20 pb-8 flex justify-center relative z-10">
            <div className="relative mx-auto" style={{ width: "100%", maxWidth: 400, marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16, paddingLeft: 4 }}>
                <img
                  src="/images/newhomepage/Bowling%20Campaign%20Logo.png"
                  alt="Bowling Campaign Logo"
                  style={{ width: 208, height: "auto", cursor: "pointer" }}
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      sessionStorage.clear();
                      window.location.href = '/';
                    }
                  }}
                />
              </div>

              <div style={{ position: "relative", width: "100%" }}>
                <img
                  src="/images/instructions/loanapproved.png"
                  alt="Loan Approved"
                  style={{ 
                    position: "absolute", 
                    top: -170, 
                    right: -8, 
                    width: 150, 
                    height: "auto", 
                    zIndex: 1, 
                    pointerEvents: "none" 
                  }}
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
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 16,
                    zIndex: 2,
                    marginTop: 20,
                    textAlign: "center"
                  }}
                >
                  <GlassBackButton />
                  
                  <div className="w-20 h-20 mx-auto relative mb-4">
                <svg className="animate-spin h-20 w-20 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
                  
                  <h2 style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: 700,
                    fontSize: 20,
                    color: "#000",
                    marginBottom: 4
                  }}>🎬 Creating Your Video</h2>
                  
                  <p style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontSize: 14,
                    color: "#666",
                    marginBottom: 12
                  }}>
              We're generating your personalized bowling analysis video...
            </p>
            
                  <div style={{ width: '100%', marginBottom: 8 }}>
                    <div style={{ 
                      width: '100%', 
                      backgroundColor: '#E5E7EB', 
                      borderRadius: 9999, 
                      height: 12, 
                      overflow: 'hidden' 
                    }}>
                      <div 
                        style={{ 
                          width: `${Math.max(10, renderProgress)}%`,
                          height: '100%',
                          background: 'linear-gradient(to right, #3B82F6, #9333EA)',
                          borderRadius: 9999,
                          transition: 'width 0.5s ease-out'
                        }}
                />
              </div>
                    <p style={{
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontSize: 12,
                      color: "#666",
                      marginTop: 8
                    }}>
                {renderProgress > 0 ? `${renderProgress}%` : 'Initializing...'} complete
              </p>
            </div>

            {elapsedTime > 0 && (
                    <p style={{
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontSize: 11,
                      color: "#999"
                    }}>
                Elapsed: {elapsedTime}s {elapsedTime > 60 && '(This may take a few minutes)'}
              </p>
            )}

                  <div style={{ 
                    marginTop: 16, 
                    padding: 12, 
                    backgroundColor: '#EFF6FF', 
                    borderRadius: 8,
                    width: '100%'
                  }}>
                    <p style={{
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontSize: 12,
                      color: '#1E40AF'
                    }}>
                💡 <strong>Did you know?</strong> Your video includes your actual bowling action compared to professional benchmarks!
              </p>
            </div>
          </div>
              </div>
            </div>
          </main>

          {/* Mobile Footer */}
          <footer className="mt-auto w-full bg-black px-4 md:px-8 pt-4 pb-6">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
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
                
                <div className="flex gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  // No video found - Use new layout
  if (!url) {
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

                {/* No Video Content - Centered */}
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
                      gap: 20,
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <h2 style={{ 
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: 700,
                        fontSize: 24,
                        color: '#6B7280',
                        marginBottom: 16
                      }}>
                        No Video Available
                      </h2>
                      <p style={{
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: 400,
                        fontSize: 16,
                        color: '#000',
                        marginBottom: 24
                      }}>
                        Your video hasn't been generated yet. Please analyze your bowling action first.
                      </p>
                      <Link href="/analyze">
                        <button
                          style={{
                            backgroundColor: '#FDC217',
                            color: '#000',
                            fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                            fontWeight: 700,
                            fontSize: 16,
                            padding: '12px 32px',
                            borderRadius: 25,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          Go to Analysis
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Footer */}
          <footer className="w-full bg-black px-4 md:px-8 pt-4 pb-6 relative z-20">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
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
                
                <div className="flex gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden min-h-screen flex flex-col">
          <main className="flex-1 px-6 pt-20 pb-8 flex justify-center relative z-10">
            <div className="relative mx-auto" style={{ width: "100%", maxWidth: 400, marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16, paddingLeft: 4 }}>
                <img
                  src="/images/newhomepage/Bowling%20Campaign%20Logo.png"
                  alt="Bowling Campaign Logo"
                  style={{ width: 208, height: "auto", cursor: "pointer" }}
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      sessionStorage.clear();
                      window.location.href = '/';
                    }
                  }}
                />
              </div>

              <div style={{ position: "relative", width: "100%" }}>
                <img
                  src="/images/instructions/loanapproved.png"
                  alt="Loan Approved"
                  style={{ 
                    position: "absolute", 
                    top: -170, 
                    right: -8, 
                    width: 150, 
                    height: "auto", 
                    zIndex: 1, 
                    pointerEvents: "none" 
                  }}
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
                    gap: 16,
                    zIndex: 2,
                    marginTop: 20,
                    textAlign: "center"
                  }}
                >
                  <GlassBackButton />
                  
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
                  <h2 style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: 700,
                    fontSize: 20,
                    color: "#000",
                    marginBottom: 8
                  }}>No Video Found</h2>
                  <p style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontSize: 14,
                    color: "#666",
                    marginBottom: 16
                  }}>
            Go back to the analysis page and generate your video report.
          </p>
                  <Link href="/analyze" style={{ textDecoration: 'none', width: '100%' }}>
                    <button
                      style={{
                        width: "100%",
                        backgroundColor: '#FDC217',
                        borderRadius: '25.62px',
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: '700',
                        fontSize: '14px',
                        color: 'black',
                        padding: '10px 16px',
                        border: 'none',
                        cursor: 'pointer'
                      }}
          >
            Go to Analysis
                    </button>
          </Link>
                </div>
              </div>
            </div>
          </main>

          {/* Mobile Footer */}
          <footer className="mt-auto w-full bg-black px-4 md:px-8 pt-4 pb-6">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
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
                
                <div className="flex gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </div>
                  
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  // Video ready
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

              {/* Video Container - Centered */}
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
                    gap: 20,
                  }}
                >
                  {/* Video Box with 1080 x 1440 dimensions */}
                  <div style={{
                    width: '100%',
                    maxWidth: 360,
                    aspectRatio: '1080/1440', // 3:4 ratio
                    backgroundColor: '#000',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '2px solid #E5E7EB'
                  }}>
            <video 
              src={url} 
              controls 
              playsInline
              className="w-full h-full object-contain"
                      style={{
                        display: 'block',
                        width: '100%',
                        height: '100%'
                      }}
            />
          </div>

          {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'center' }}>
                    {/* Leaderboard Button */}
                    <Link href="/leaderboard" style={{ flex: 1, maxWidth: 200 }}>
                      <button
                        className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                        style={{
                          width: "100%",
                          backgroundColor: '#CCEAF7',
                          borderRadius: '25.62px',
                          fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                          fontWeight: '700',
                          fontSize: '14px',
                          color: 'black',
                          padding: '10px 16px',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8
                        }}
                      >
                        <img
                          src="/frontend-images/homepage/Vector.svg"
                          alt="Leaderboard"
                          style={{ width: 16, height: 16 }}
                        />
                        Leaderboard
                      </button>
                    </Link>

            {/* Download Video Button */}
            <a
              href={url}
              download="bowling-analysis-video.mp4"
              target="_blank"
              rel="noreferrer"
                      style={{ flex: 1, maxWidth: 200, textDecoration: 'none' }}
                    >
                      <button
                        className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                        style={{
                          width: "100%",
                          backgroundColor: '#FDC217',
                          borderRadius: '25.62px',
                          fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                          fontWeight: '700',
                          fontSize: '14px',
                          color: 'black',
                          padding: '10px 16px',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
              </svg>
              Download Video
                      </button>
                    </a>
                  </div>

                  {/* Retry Button - Centered below */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                    <button
                      className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                      style={{
                        backgroundColor: '#FFC315',
                        borderRadius: '25.62px',
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: '700',
                        fontSize: '14px',
                        color: 'black',
                        padding: '10px 24px',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        minWidth: 200
                      }}
                      onClick={handleRetry}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                      </svg>
                      Retry Analysis
                    </button>
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
                © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833 | <a href="/terms-and-conditions" className="text-blue-300 hover:text-blue-200 underline">Terms and Conditions</a>
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
                
                {/* Facebook */}
                <a href="https://m.facebook.com/LnTFS?wtsid=rdr_0GljAOcj6obaXQY93" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                
                {/* Instagram */}
                <a href="https://www.instagram.com/lntfinance?igsh=a3ZvY2JxaWdnb25s" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.40s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
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
          <div className="relative mx-auto" style={{ width: "100%", maxWidth: 400, marginTop: 4 }}>
            {/* Mobile Logo */}
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16, paddingLeft: 4 }}>
              <div onClick={() => {
                console.log('🏠 Homepage logo clicked - clearing session data and reloading...');
                if (typeof window !== 'undefined') {
                  sessionStorage.clear();
                  window.location.href = '/';
                }
              }}>
                <img
                  src="/images/newhomepage/Bowling%20Campaign%20Logo.png"
                  alt="Bowling Campaign Logo"
                  style={{ width: 208, height: "auto", cursor: "pointer" }}
                />
              </div>
            </div>

            <div style={{ position: "relative", width: "100%" }}>
              {/* Loan Approved Decoration */}
              <img
                src="/images/instructions/loanapproved.png"
                alt="Loan Approved"
                style={{ 
                  position: "absolute", 
                  top: -170, 
                  right: -8, 
                  width: 150, 
                  height: "auto", 
                  zIndex: 1, 
                  pointerEvents: "none" 
                }}
              />

              {/* Glass Box Container */}
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
                  gap: 16,
                  zIndex: 2,
                  marginTop: 20,
                }}
              >
                {/* Universal Back Arrow Box - Top Left */}
                <GlassBackButton />

                {/* Video Box with 1080 x 1440 dimensions */}
                <div style={{
                  width: '100%',
                  maxWidth: 315,
                  aspectRatio: '1080/1440', // 3:4 ratio
                  backgroundColor: '#000',
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '2px solid #E5E7EB'
                }}>
                  <video 
                    src={url} 
                    controls 
                    playsInline
                    className="w-full h-full object-contain"
                    style={{
                      display: 'block',
                      width: '100%',
                      height: '100%'
                    }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 12 }}>
            {/* Leaderboard Button */}
                  <Link href="/leaderboard" style={{ flex: 1 }}>
                    <button
                      className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                      style={{
                        width: "100%",
                        backgroundColor: '#CCEAF7',
                        borderRadius: '25.62px',
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: '700',
                        fontSize: '14px',
                        color: 'black',
                        padding: '10px 16px',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <img
                        src="/frontend-images/homepage/Vector.svg"
                        alt="Leaderboard"
                        style={{ width: 16, height: 16 }}
                      />
              Leaderboard
                    </button>
            </Link>

                  {/* Download Video Button */}
                  <a
                    href={url}
                    download="bowling-analysis-video.mp4"
                    target="_blank"
                    rel="noreferrer"
                    style={{ flex: 1, textDecoration: 'none' }}
                  >
                    <button
                      className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                      style={{
                        width: "100%",
                        backgroundColor: '#FDC217',
                        borderRadius: '25.62px',
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: '700',
                        fontSize: '14px',
                        color: 'black',
                        padding: '10px 16px',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
                      </svg>
                      Download Video
                    </button>
                  </a>
          </div>

          {/* Retry Button - Desktop Centered below */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
            <button
              className="transition-all duration-300 hover:brightness-110 hover:scale-105"
              style={{
                backgroundColor: '#FFC315',
                borderRadius: '25.62px',
                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                fontWeight: '700',
                fontSize: '16px',
                color: 'black',
                padding: '12px 32px',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                minWidth: 220
              }}
              onClick={handleRetry}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
              </svg>
              Retry Analysis
            </button>
          </div>
        </div>
            </div>
          </div>
        </main>

        {/* Mobile Footer */}
        <footer className="mt-auto w-full bg-black px-4 md:px-8 pt-4 pb-6">
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
                © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833 | <a href="/terms-and-conditions" className="text-blue-300 hover:text-blue-200 underline">Terms and Conditions</a>
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
  );
}
