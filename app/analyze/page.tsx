'use client';

import React from 'react';
import Link from 'next/link';
import { useAnalysis } from '@/context/AnalysisContext';
import { intensityToKmh, classifySpeed } from '@/lib/utils/normalize';
import { NoBowlingActionModal } from '@/components/NoBowlingActionModal';
import { CompositeCard } from '@/components/CompositeCard';
import { GlassBackButton } from '@/components/GlassBackButton';
import { downloadCompositeCardManual } from '@/lib/utils/downloadCompositeCard';
import { supabase } from '@/lib/supabase/client';

export default function SimplifiedAnalyzePage() {
  const { state } = useAnalysis();
  const [sessionAnalysisData, setSessionAnalysisData] = React.useState<any>(null);
  const [benchmarkDetailedData, setBenchmarkDetailedData] = React.useState<any>(null);
  const [detailedAnalysisData, setDetailedAnalysisData] = React.useState<any>(null);
  const [isViewingVideo, setIsViewingVideo] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showNoBowlingModal, setShowNoBowlingModal] = React.useState(false);
  const [isRenderingVideo, setIsRenderingVideo] = React.useState(false);
  const [renderProgress, setRenderProgress] = React.useState(0);
  const [leaderboardEntryId, setLeaderboardEntryId] = React.useState<string | null>(null);
  const [hasSubmittedToLeaderboard, setHasSubmittedToLeaderboard] = React.useState(false);

  // Player name state
  const [playerName, setPlayerName] = React.useState<string>('');

  // Function to submit results to Supabase leaderboard
  const submitToLeaderboard = React.useCallback(async () => {
    // Prevent duplicate submissions
    if (hasSubmittedToLeaderboard) {
      console.log('⏭️ Already submitted to leaderboard, skipping...');
      return;
    }

    try {
      console.log('📤 Submitting analysis results to Supabase leaderboard...');

      // Get Gemini avatar URL from sessionStorage if available
      const geminiAvatarUrl = typeof window !== 'undefined' 
        ? window.sessionStorage.getItem('geminiAvatarUrl') 
        : null;

      // Calculate scores here based on current data
      const finalIntensityValue = sessionAnalysisData?.intensity || state.finalIntensity || 0;
      const kmhValue = Math.round(sessionAnalysisData?.kmh || intensityToKmh(finalIntensityValue));
      const classificationResult = classifySpeed(finalIntensityValue);
      const speedLabel = sessionAnalysisData?.speedClass || state.speedClass || classificationResult.speedClass;

      const accuracyScore = benchmarkDetailedData?.overall
        ? Math.round(benchmarkDetailedData.overall * 100)
        : benchmarkDetailedData?.overallSimilarity
        ? Math.round(benchmarkDetailedData.overallSimilarity * 100)
        : sessionAnalysisData?.similarity
        ? Math.round(sessionAnalysisData.similarity)
        : Math.max(0, Math.round(finalIntensityValue));
      const accuracyDisplay = Math.min(Math.max(accuracyScore, 0), 100);

      const runUpScore = benchmarkDetailedData?.runUp
        ? Math.round(benchmarkDetailedData.runUp * 100)
        : (sessionAnalysisData?.phases?.runUp || 87);
      const deliveryScore = benchmarkDetailedData?.delivery
        ? Math.round(benchmarkDetailedData.delivery * 100)
        : (sessionAnalysisData?.phases?.delivery || 79);
      const followThroughScore = benchmarkDetailedData?.followThrough
        ? Math.round(benchmarkDetailedData.followThrough * 100)
        : (sessionAnalysisData?.phases?.followThrough || 81);

      const armSwingScore = benchmarkDetailedData?.armSwing
        ? Math.round(benchmarkDetailedData.armSwing * 100)
        : (sessionAnalysisData?.technicalMetrics?.armSwing || 83);
      const bodyMovementScore = benchmarkDetailedData?.bodyMovement
        ? Math.round(benchmarkDetailedData.bodyMovement * 100)
        : (sessionAnalysisData?.technicalMetrics?.bodyMovement || 88);
      const rhythmScore = benchmarkDetailedData?.rhythm
        ? Math.round(benchmarkDetailedData.rhythm * 100)
        : (sessionAnalysisData?.technicalMetrics?.rhythm || 85);
      const releasePointScore = benchmarkDetailedData?.releasePoint
        ? Math.round(benchmarkDetailedData.releasePoint * 100)
        : (sessionAnalysisData?.technicalMetrics?.releasePoint || 89);

      // Prepare payload for Supabase
      const payload = {
        display_name: sessionAnalysisData?.playerName || playerName || 'Anonymous',
        predicted_kmh: Number(kmhValue.toFixed(2)),
        similarity_percent: Number(accuracyDisplay.toFixed(2)),
        intensity_percent: Number(finalIntensityValue.toFixed(2)),
        speed_class: speedLabel,
        avatar_url: geminiAvatarUrl, // Store Gemini-generated avatar
        meta: {
          analyzer_mode: 'benchmark',
          app: 'bowling-analyzer',
          player_name: sessionAnalysisData?.playerName || playerName,
          phases: {
            runUp: runUpScore,
            delivery: deliveryScore,
            followThrough: followThroughScore
          },
          technicalMetrics: {
            armSwing: armSwingScore,
            bodyMovement: bodyMovementScore,
            rhythm: rhythmScore,
            releasePoint: releasePointScore
          },
          recommendations: benchmarkDetailedData?.recommendations || sessionAnalysisData?.recommendations
        }
      };

      console.log('📊 Leaderboard payload:', payload);

      const { data, error } = await supabase
        .from('bowling_attempts')
        .insert(payload)
        .select('id')
        .single();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Successfully saved to leaderboard with ID:', data.id);
        setLeaderboardEntryId(data.id);
        setHasSubmittedToLeaderboard(true);
        
        // Store the entry ID for potential future reference
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('leaderboardEntryId', data.id);
        }
      }
    } catch (error) {
      console.error('❌ Failed to submit to leaderboard:', error);
      // Don't throw - allow user to continue even if leaderboard submission fails
    }
  }, [
    hasSubmittedToLeaderboard,
    sessionAnalysisData,
    playerName,
    state.finalIntensity,
    state.speedClass,
    benchmarkDetailedData
  ]);

  // Load data from sessionStorage on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔍 Analyze Page: Loading data from sessionStorage...');
      
      // Load player name first
      const storedPlayerName = window.sessionStorage.getItem('playerName');
      if (storedPlayerName) {
        setPlayerName(storedPlayerName);
        console.log('📊 Player name loaded:', storedPlayerName);
      }
      
      // Load analysisVideoData
      const storedData = window.sessionStorage.getItem('analysisVideoData');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          console.log('📊 analysisVideoData loaded:', parsedData);
          setSessionAnalysisData(parsedData);
        } catch (error) {
          console.error('Error parsing session storage data:', error);
        }
      } else {
        console.warn('⚠️ No analysisVideoData found in sessionStorage');
      }
      
      // Load benchmarkDetailedData  
      const benchmarkData = window.sessionStorage.getItem('benchmarkDetailedData');
      if (benchmarkData) {
        try {
          const parsedBenchmarkData = JSON.parse(benchmarkData);
          console.log('📊 benchmarkDetailedData loaded:', parsedBenchmarkData);
          setBenchmarkDetailedData(parsedBenchmarkData);
          setDetailedAnalysisData(parsedBenchmarkData);
        } catch (error) {
          console.error('Error parsing benchmarkDetailedData from session storage:', error);
        }
      } else {
        console.warn('⚠️ No benchmarkDetailedData found in sessionStorage');
      }
      
      console.log('📊 Current sessionStorage keys:', Object.keys(window.sessionStorage));
      
      // Set loading to false immediately for faster UI
      setIsLoading(false);
      
      // The modal will be shown based on the main detection logic below
    }
  }, []);

  // Fallback: if no analysisVideoData but a noBowling flag exists, synthesize minimal data so UI can render
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const hasAnalysis = !!window.sessionStorage.getItem('analysisVideoData');
      const noAction = window.sessionStorage.getItem('noBowlingActionDetected') === 'true';
      if (!hasAnalysis && noAction) {
        const storedPlayerName = window.sessionStorage.getItem('playerName');
        const minimalData = {
          intensity: 0,
          speedClass: 'No Action',
          kmh: 0,
          similarity: 0,
          frameIntensities: [],
          phases: { runUp: 0, delivery: 0, followThrough: 0 },
          technicalMetrics: { armSwing: 0, bodyMovement: 0, rhythm: 0, releasePoint: 0 },
          recommendations: ['We could not detect a bowling motion. Try a clearer full-action clip.'],
          playerName: storedPlayerName || 'Player',
          createdAt: new Date().toISOString(),
        } as any;
        window.sessionStorage.setItem('analysisVideoData', JSON.stringify(minimalData));
        window.sessionStorage.setItem('analysisVideoData_backup', JSON.stringify(minimalData));
        window.sessionStorage.setItem('analysisVideoData_timestamp', Date.now().toString());
        setSessionAnalysisData(minimalData);
      }
    } catch {}
  }, []);

  // Auto-submit to leaderboard when analysis data is loaded
  React.useEffect(() => {
    const shouldSubmit = 
      !hasSubmittedToLeaderboard &&
      sessionAnalysisData &&
      sessionAnalysisData.intensity > 0 &&
      sessionAnalysisData.speedClass !== 'No Action';

    if (shouldSubmit) {
      // Small delay to ensure all data is properly loaded
      const timer = setTimeout(() => {
        submitToLeaderboard();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [sessionAnalysisData, hasSubmittedToLeaderboard, submitToLeaderboard]);

  // Handle no bowling action modal - all hooks must come before any conditional returns
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const noBowlingDetected = 
        window.sessionStorage.getItem('noBowlingActionDetected') === 'true' ||
        state.speedClass === 'No Action' ||
        sessionAnalysisData?.speedClass === 'No Action' ||
        (state.finalIntensity === 0 && sessionAnalysisData?.intensity === 0);
        
      if (noBowlingDetected && !showNoBowlingModal) {
        setShowNoBowlingModal(true);
      }
    }
  }, [state.speedClass, state.finalIntensity, sessionAnalysisData, showNoBowlingModal]);

  // Show loading while checking for data
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  // Determine availability - use sessionStorage data if AnalysisContext is empty
  const hasSessionResults = sessionAnalysisData?.intensity > 0 || benchmarkDetailedData?.overall > 0;
  const hasValidResults = (state.finalIntensity > 0 && state.speedClass && state.speedClass !== 'No Action') || hasSessionResults;
  
  // Check for no bowling action detection
  const noBowlingDetected = typeof window !== 'undefined' && (
    window.sessionStorage.getItem('noBowlingActionDetected') === 'true' ||
    state.speedClass === 'No Action' ||
    sessionAnalysisData?.speedClass === 'No Action' ||
    (state.finalIntensity === 0 && sessionAnalysisData?.intensity === 0)
  );
  
  if (noBowlingDetected) {
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
        <NoBowlingActionModal
          open={showNoBowlingModal}
          onOpenChange={setShowNoBowlingModal}
        />
      </div>
    );
  }
  
  // TEMPORARILY COMMENTED OUT FOR UI/UX TESTING
  // Fallback for when there are no results at all (not even no bowling action)
  // if (!hasValidResults && !noBowlingDetected) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="text-gray-600 mb-4">
  //           <p>No analysis results found.</p>
  //           <p className="mt-2">
  //             <Link href="/record-upload" className="text-blue-600 hover:underline">
  //               Go back to upload a video
  //             </Link>
  //           </p>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  // Speed values - prioritize sessionStorage data and round to whole numbers
  const finalIntensityValue = sessionAnalysisData?.intensity || state.finalIntensity || 0;
  const kmhValue = Math.round(sessionAnalysisData?.kmh || intensityToKmh(finalIntensityValue));
  const mphRaw = kmhValue * 0.621371;
  const mphValueDisplay = Number.isNaN(mphRaw)
    ? '0 mph'
    : `${Number.isInteger(mphRaw) ? mphRaw.toFixed(0) : mphRaw.toFixed(1)} mph`;

  const classificationResult = classifySpeed(finalIntensityValue);
  const speedLabel = sessionAnalysisData?.speedClass || state.speedClass || classificationResult.speedClass;

  // Accuracy - prioritize benchmarkDetailedData.overall, then sessionAnalysisData
  const accuracyScore = benchmarkDetailedData?.overall
    ? Math.round(benchmarkDetailedData.overall * 100)
    : benchmarkDetailedData?.overallSimilarity
    ? Math.round(benchmarkDetailedData.overallSimilarity * 100)
    : sessionAnalysisData?.similarity
    ? Math.round(sessionAnalysisData.similarity)
    : Math.max(0, Math.round(finalIntensityValue));
  const accuracyDisplay = Math.min(Math.max(accuracyScore, 0), 100);
  
  console.log('🔍 [ANALYZE] Score Calculation:', {
    benchmarkOverall: benchmarkDetailedData?.overall,
    benchmarkOverallSimilarity: benchmarkDetailedData?.overallSimilarity,
    sessionSimilarity: sessionAnalysisData?.similarity,
    finalIntensityValue,
    calculatedAccuracyScore: accuracyScore,
    accuracyDisplay
  });

  // Phase metrics
  const runUpScore = benchmarkDetailedData?.runUp
    ? Math.round(benchmarkDetailedData.runUp * 100)
    : (sessionAnalysisData?.phases?.runUp || 87);
  const deliveryScore = benchmarkDetailedData?.delivery
    ? Math.round(benchmarkDetailedData.delivery * 100)
    : (sessionAnalysisData?.phases?.delivery || 79);
  const followThroughScore = benchmarkDetailedData?.followThrough
    ? Math.round(benchmarkDetailedData.followThrough * 100)
    : (sessionAnalysisData?.phases?.followThrough || 81);
    
  console.log('🔍 [ANALYZE] Phase Scores:', {
    runUp: { benchmark: benchmarkDetailedData?.runUp, session: sessionAnalysisData?.phases?.runUp, final: runUpScore },
    delivery: { benchmark: benchmarkDetailedData?.delivery, session: sessionAnalysisData?.phases?.delivery, final: deliveryScore },
    followThrough: { benchmark: benchmarkDetailedData?.followThrough, session: sessionAnalysisData?.phases?.followThrough, final: followThroughScore }
  });

  // Technical metrics
  const armSwingScore = benchmarkDetailedData?.armSwing
    ? Math.round(benchmarkDetailedData.armSwing * 100)
    : (sessionAnalysisData?.technicalMetrics?.armSwing || 83);
  const bodyMovementScore = benchmarkDetailedData?.bodyMovement
    ? Math.round(benchmarkDetailedData.bodyMovement * 100)
    : (sessionAnalysisData?.technicalMetrics?.bodyMovement || 88);
  const rhythmScore = benchmarkDetailedData?.rhythm
    ? Math.round(benchmarkDetailedData.rhythm * 100)
    : (sessionAnalysisData?.technicalMetrics?.rhythm || 85);
  const releasePointScore = benchmarkDetailedData?.releasePoint
    ? Math.round(benchmarkDetailedData.releasePoint * 100)
    : (sessionAnalysisData?.technicalMetrics?.releasePoint || 89);
    
  console.log('🔍 [ANALYZE] Technical Metrics:', {
    armSwing: { benchmark: benchmarkDetailedData?.armSwing, session: sessionAnalysisData?.technicalMetrics?.armSwing, final: armSwingScore },
    bodyMovement: { benchmark: benchmarkDetailedData?.bodyMovement, session: sessionAnalysisData?.technicalMetrics?.bodyMovement, final: bodyMovementScore },
    rhythm: { benchmark: benchmarkDetailedData?.rhythm, session: sessionAnalysisData?.technicalMetrics?.rhythm, final: rhythmScore },
    releasePoint: { benchmark: benchmarkDetailedData?.releasePoint, session: sessionAnalysisData?.technicalMetrics?.releasePoint, final: releasePointScore }
  });

  // Handle View Video button click - Trigger video rendering
  const handleViewVideo = async () => {
    try {
      if (typeof accuracyDisplay === 'number' && accuracyDisplay <= 85) {
        alert('View Video is available only for scores above 85%.');
        return;
      }
      console.log('🎥 Starting video rendering process...');
      setIsRenderingVideo(true);
      setRenderProgress(10);

      // Prepare analysis data for video rendering
      // Get frameIntensities from sessionStorage if available
      let frameIntensitiesData = [];
      try {
        const storedAnalysisData = sessionAnalysisData;
        if (storedAnalysisData && storedAnalysisData.frameIntensities) {
          frameIntensitiesData = storedAnalysisData.frameIntensities;
          console.log('📊 Found frameIntensities in session storage:', frameIntensitiesData.length, 'frames');
        } else {
          console.warn('⚠️ No frameIntensities found in session storage - using empty array');
        }
      } catch (err) {
        console.warn('⚠️ Could not retrieve frameIntensities:', err);
      }
      
      const videoAnalysisData = {
        intensity: finalIntensityValue,
        speedClass: speedLabel,
        kmh: kmhValue,
        similarity: accuracyDisplay,
        frameIntensities: frameIntensitiesData, // Include frame intensities
        phases: {
          runUp: runUpScore,
          delivery: deliveryScore,
          followThrough: followThroughScore
        },
        technicalMetrics: {
          armSwing: armSwingScore,
          bodyMovement: bodyMovementScore,
          rhythm: rhythmScore,
          releasePoint: releasePointScore
        },
        recommendations: benchmarkDetailedData?.recommendations || sessionAnalysisData?.recommendations || ['Great technique! Keep practicing to maintain consistency.'],
        playerName: sessionAnalysisData?.playerName || playerName || 'Player'
      };

      console.log('📦 Analysis data prepared for video:', videoAnalysisData);
      setRenderProgress(20);

      // Prepare assets: thumbnail + uploaded video path
      let bestFrameDataUrl: string | null = null;
      try {
        if (typeof window !== 'undefined') {
          bestFrameDataUrl = window.sessionStorage.getItem('detectedFrameDataUrl') || window.sessionStorage.getItem('videoThumbnail');
        }
      } catch {}

      // Ensure user's uploaded video is persisted in public/uploads and get its public path
      let userVideoPublicPath: string | null = null;
      try {
        if (typeof window !== 'undefined') {
          userVideoPublicPath = window.sessionStorage.getItem('uploadedVideoPublicPath');
          if (!userVideoPublicPath) {
            let uploadFile: File | null = null;
            const w: any = window as any;
            if (w.tempVideoFile instanceof File && w.tempVideoFile.size > 0) {
              uploadFile = w.tempVideoFile as File;
            } else {
              const base64 = window.sessionStorage.getItem('uploadedVideoData');
              if (base64 && base64.startsWith('data:')) {
                const res = await fetch(base64);
                const blob = await res.blob();
                uploadFile = new File([blob], window.sessionStorage.getItem('uploadedFileName') || 'uploaded-video.mp4', { type: blob.type || 'video/mp4' });
              }
            }
            if (uploadFile) {
              const form = new FormData();
              form.append('file', uploadFile, uploadFile.name);
              const uploadResp = await fetch('/api/upload-user-video', { method: 'POST', body: form });
              if (uploadResp.ok) {
                const up = await uploadResp.json();
                if (up?.publicPath) {
                  userVideoPublicPath = up.publicPath as string;
                  window.sessionStorage.setItem('uploadedVideoPublicPath', userVideoPublicPath);
                }
              } else {
                console.warn('Upload user video failed with status', uploadResp.status);
              }
            } else {
              console.warn('No uploadable user video available in this session');
            }
          }
        }
      } catch (e) { console.warn('Error ensuring uploaded video path:', e); }

      // Call API to generate video
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          analysisData: videoAnalysisData,
          thumbnailDataUrl: bestFrameDataUrl || undefined,
          userVideoPublicPath: userVideoPublicPath || undefined,
        }),
      });

      setRenderProgress(90);

      if (!response.ok) {
        throw new Error('Video generation failed');
      }

      const result = await response.json();
      console.log('✅ Video rendered successfully:', result);
      setRenderProgress(100);

      // Store video URL in sessionStorage
      if (typeof window !== 'undefined' && result.videoUrl) {
        window.sessionStorage.setItem('generatedVideoUrl', result.videoUrl);
        // Navigate to download video page
        setTimeout(() => {
          window.location.href = '/download-video';
        }, 500);
      }

    } catch (error) {
      console.error('❌ Video rendering error:', error);
      alert('Failed to generate video. Please try again.');
      setIsRenderingVideo(false);
      setRenderProgress(0);
    }
  };

  // Download composite card functionality - Using manual canvas rendering
  const downloadCompositeCard = async () => {
    try {
      await downloadCompositeCardManual({
        accuracyDisplay,
        runUpScore,
        deliveryScore,
        followThroughScore,
        playerName: sessionAnalysisData?.playerName || playerName || "PLAYER NAME",
        kmhValue,
        armSwingScore,
        bodyMovementScore,
        rhythmScore,
        releasePointScore,
        recommendations: (benchmarkDetailedData?.recommendations?.length || sessionAnalysisData?.recommendations?.length) > 0
          ? (benchmarkDetailedData?.recommendations || sessionAnalysisData?.recommendations || []).join(' ')
          : "Great technique! Keep practicing to maintain consistency.",
        sessionAnalysisData
      });
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download the report. Please try again.');
    }
  };

  return (
    <>
      {/* Video Rendering Loader Overlay */}
      {isRenderingVideo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                border: '4px solid rgba(255, 255, 255, 0.2)',
                borderTop: '4px solid #FDC217',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}
            />
            <h2
              style={{
                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                fontWeight: 700,
                fontSize: 24,
                color: '#fff',
                marginBottom: 12
              }}
            >
              Generating Your Video
            </h2>
            <p
              style={{
                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                fontSize: 16,
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: 24
              }}
            >
              Please wait while we create your bowling analysis video...
            </p>
            <div
              style={{
                width: 300,
                height: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 4,
                overflow: 'hidden',
                margin: '0 auto'
              }}
            >
              <div
                style={{
                  width: `${renderProgress}%`,
                  height: '100%',
                  backgroundColor: '#FDC217',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <p
              style={{
                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                fontSize: 14,
                color: 'rgba(255, 255, 255, 0.6)',
                marginTop: 12
              }}
            >
              {renderProgress}%
            </p>
          </div>
        </div>
      )}

      {/* Mobile Layout */}
      <div
        className="md:hidden min-h-screen flex flex-col relative"
        style={{
          backgroundImage: "url(/images/instructions/Instructions%20bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
      <main className="flex-1 px-6 pt-20 pb-8 flex justify-center relative z-10">
        <div className="relative mx-auto" style={{ width: 400, marginTop: 4 }}>
          
          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16, paddingLeft: 4 }}>
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
              
              {/* Headline */}
              <div className="mb-3 text-center">
                <div
                  style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: 800,
                    fontStyle: "italic",
                    fontSize: 22,
                    color: "#000000",
                    lineHeight: 1.1,
                    marginBottom: 2,
                  }}
                >
                  Your #BumrahKiSpeedPar<br />Report is Ready!
                </div>
              </div>

              {/* Composite Card - Always shown when there are results */}
              <div style={{ 
                width: '100%',
                maxWidth: 346,
                margin: '0 auto',
                position: 'relative'
              }}>
                <CompositeCard
                  accuracyDisplay={accuracyDisplay}
                  runUpScore={runUpScore}
                  deliveryScore={deliveryScore}
                  followThroughScore={followThroughScore}
                  playerName={sessionAnalysisData?.playerName || playerName || "PLAYER NAME"}
                  kmhValue={kmhValue}
                  armSwingScore={armSwingScore}
                  bodyMovementScore={bodyMovementScore}
                  rhythmScore={rhythmScore}
                  releasePointScore={releasePointScore}
                  recommendations={
                    (benchmarkDetailedData?.recommendations?.length || sessionAnalysisData?.recommendations?.length) > 0
                      ? (benchmarkDetailedData?.recommendations || sessionAnalysisData?.recommendations || []).join(' ')
                      : "Great technique! Keep practicing to maintain consistency."
                  }
                />
              </div>
              
              {/* Action Buttons - Inside glass box */}
              <div className="mb-3" style={{ width: '100%', marginTop: '20px' }}>
                {accuracyDisplay > 85 ? (
                  // 3 buttons when score > 85%
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
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

                      <button
                        className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                        style={{
                          flex: 1,
                          backgroundColor: '#FDC217',
                          borderRadius: '25.62px',
                          fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                          fontWeight: '700',
                          fontSize: '14px',
                          color: 'black',
                          padding: '10px 16px',
                          border: 'none'
                        }}
                        onClick={downloadCompositeCard}
                      >
                        Download Report
                      </button>
                    </div>
                    <button
                      className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                      style={{
                        width: "100%",
                        backgroundColor: '#0095d7',
                        borderRadius: '25.62px',
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: '700',
                        fontSize: '14px',
                        color: 'white',
                        padding: '10px 16px',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                      onClick={handleViewVideo}
                      disabled={isRenderingVideo}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      View Video
                    </button>
                  </div>
                ) : (
                  // 2 buttons when score <= 85%
                  <div style={{ display: 'flex', gap: 8 }}>
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

                    <button
                      className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                      style={{
                        flex: 1,
                        backgroundColor: '#FDC217',
                        borderRadius: '25.62px',
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: '700',
                        fontSize: '14px',
                        color: 'black',
                        padding: '10px 16px',
                        border: 'none'
                      }}
                      onClick={downloadCompositeCard}
                    >
                      Download Report
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Text and Retry Button - Below Glass Box */}
            {accuracyDisplay < 85 && (
              <div style={{ marginTop: '20px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Feedback Text */}
                <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                  <p style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: '700',
                    fontSize: '14px',
                    color: '#FFFFFF',
                    margin: 0,
                    marginBottom: '1px'
                  }}>
                    You've just missed the benchmark
                  </p>
                  <p style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: '700',
                    fontSize: '14px',
                    color: '#FFFFFF',
                    margin: 0
                  }}>
                    Don't worry, try again!
                  </p>
                </div>
                
                {/* Retry Button */}
                <button
                  className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                  style={{
                    width: '142px',
                    height: '36px',
                    backgroundColor: '#80CBEB',
                    borderRadius: '22.89px',
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: '700',
                    fontSize: '14px',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer'
                  }}
                onClick={() => {
                  console.log('🔄 Retry button clicked');
                  // Clear session data and redirect to record-upload
                  if (typeof window !== 'undefined') {
                    sessionStorage.clear();
                    window.location.href = '/record-upload';
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
                Retry
              </button>
            </div>
            )}
          </div>
        </div>
      </main>

      {/* Always include the modal in case it needs to be triggered */}
      <NoBowlingActionModal
        open={showNoBowlingModal}
        onOpenChange={setShowNoBowlingModal}
      />

        {/* Mobile Footer */}
        <footer className="md:hidden mt-auto w-full bg-black px-4 md:px-8 pt-4 pb-6">
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
              © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833 | <a href="/terms-and-conditions" className="text-blue-300 hover:text-blue-200 underline">Terms and Conditions</a>
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
                  <a href="https://m.facebook.com/LnTFS?wtsid=rdr_0GljAOcj6obaXQY93" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <a href="https://www.instagram.com/lntfinance?igsh=a3ZvY2JxaWdnb25s" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/></svg>
                  </a>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <a href="https://x.com/LnTFinance" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                  </a>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <a href="https://x.com/LnTFinance" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </a>
                </div>
              </div>
          </div>
        </div>
      </footer>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex flex-col" style={{
        minHeight: "100vh",
        backgroundImage: 'url("/images/analyzepagebg.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}>
        {/* Main content area with 3-column layout */}
        <div className="flex-1 flex items-stretch relative" style={{ minHeight: '75vh', paddingTop: '32px', paddingBottom: '20px', paddingLeft: '60px', paddingRight: '60px', gap: '0px' }}>
          
          {/* First Column - Logo and Loan Approved Image */}
          <div style={{ width: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingRight: '20px' }}>
            {/* Logo at top */}
            <div className="mb-8">
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

            {/* Loan Approved Image - Smaller with no bottom margin */}
            <div className="flex-1 flex items-end justify-center" style={{ marginBottom: '-20px' }}>
              <img
                src="/images/loanapprovednew.png"
                alt="Loan Approved"
                style={{ 
                  width: '300px',
                  height: 'auto',
                  objectFit: 'contain',
                  marginBottom: 0
                }}
              />
            </div>
          </div>

          {/* Second Column - Report is Ready and Buttons */}
          <div style={{ width: '450px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingLeft: '20px', paddingRight: '40px' }}>
            {/* Report is Ready Image */}
            <div className="mb-12">
              <img
                src="/images/reportisready.png"
                alt="Report is Ready"
                style={{
                  width: '450px',
                  height: 'auto',
                  objectFit: 'contain'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ width: '250px' }}>
              {accuracyDisplay > 85 ? (
                // 3 buttons when score > 85%
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Link href="/leaderboard">
                    <button
                      className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                      style={{
                        width: "100%",
                        backgroundColor: '#CCEAF7',
                        borderRadius: '25.62px',
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: '700',
                        fontSize: '16px',
                        color: 'black',
                        padding: '12px 20px',
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
                        style={{ width: 20, height: 20 }}
                      />
                      Leaderboard
                    </button>
                  </Link>

                  <button
                    className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                    style={{
                      width: "100%",
                      backgroundColor: '#FDC217',
                      borderRadius: '25.62px',
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: '700',
                      fontSize: '16px',
                      color: 'black',
                      padding: '12px 20px',
                      border: 'none'
                    }}
                    onClick={downloadCompositeCard}
                  >
                    Download Report
                  </button>

                  <button
                    className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                    style={{
                      width: "100%",
                      backgroundColor: '#0095d7',
                      borderRadius: '25.62px',
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: '700',
                      fontSize: '16px',
                      color: 'white',
                      padding: '12px 20px',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                    onClick={handleViewVideo}
                    disabled={isRenderingVideo}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                    View Video
                  </button>
                </div>
              ) : (
                // 2 buttons when score <= 85%
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Link href="/leaderboard">
                    <button
                      className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                      style={{
                        width: "100%",
                        backgroundColor: '#CCEAF7',
                        borderRadius: '25.62px',
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: '700',
                        fontSize: '16px',
                        color: 'black',
                        padding: '12px 20px',
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
                        style={{ width: 20, height: 20 }}
                      />
                      Leaderboard
                    </button>
                  </Link>

                  <button
                    className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                    style={{
                      width: "100%",
                      backgroundColor: '#FDC217',
                      borderRadius: '25.62px',
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: '700',
                      fontSize: '16px',
                      color: 'black',
                      padding: '12px 20px',
                      border: 'none'
                    }}
                    onClick={downloadCompositeCard}
                  >
                    Download Report
                  </button>
                </div>
              )}
            </div>

            {/* Missed Benchmark Text and Retry Button - Only show when score < 85% */}
            {accuracyDisplay < 85 && (
              <div className="mt-8 text-center">
                {/* Missed Benchmark Text */}
                <div className="mb-4">
                  <p style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: '700',
                    fontSize: '16px',
                    color: '#FFFFFF',
                    margin: 0,
                    lineHeight: 1.4
                  }}>
                    You've just missed the benchmark<br />
                    Don't worry, try again!
                  </p>
                </div>
                
                {/* Retry Button */}
                <button
                  className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                  style={{
                    width: '200px',
                    backgroundColor: '#0D4D80',
                    borderRadius: '22.89px',
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: '700',
                    fontSize: '16px',
                    color: 'white',
                    padding: '12px 20px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    margin: '0 auto'
                  }}
                  onClick={() => {
                    console.log('🔄 Retry button clicked');
                    if (typeof window !== 'undefined') {
                      sessionStorage.clear();
                      window.location.href = '/record-upload';
                    }
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                  </svg>
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Third Column - Composite Card with Glass Container */}
          <div style={{ width: '420px', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', paddingLeft: '20px', marginLeft: '35px' }}>
            <div className="relative" style={{ width: '380px' }}>
              {/* Glass Container Background */}
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
                  borderRadius: 30,
                  zIndex: 1,
                }}
              />

              {/* Composite Card - Centered */}
              <div className="relative flex items-center justify-center" style={{ height: '100%', padding: '20px', zIndex: 2 }}>
                <div style={{ 
                  width: '100%',
                  maxWidth: 346,
                  margin: '0 auto',
                  position: 'relative'
                }}>
                  <CompositeCard
                    accuracyDisplay={accuracyDisplay}
                    runUpScore={runUpScore}
                    deliveryScore={deliveryScore}
                    followThroughScore={followThroughScore}
                    playerName={sessionAnalysisData?.playerName || playerName || "PLAYER NAME"}
                    kmhValue={kmhValue}
                    armSwingScore={armSwingScore}
                    bodyMovementScore={bodyMovementScore}
                    rhythmScore={rhythmScore}
                    releasePointScore={releasePointScore}
                    recommendations={
                      (benchmarkDetailedData?.recommendations?.length || sessionAnalysisData?.recommendations?.length) > 0
                        ? (benchmarkDetailedData?.recommendations || sessionAnalysisData?.recommendations || []).join(' ')
                        : "Great technique! Keep practicing to maintain consistency."
                    }
                  />
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
                © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833 | <a href="/terms-and-conditions" className="text-blue-300 hover:text-blue-200 underline">Terms and Conditions</a>
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
                  <a href="https://m.facebook.com/LnTFS?wtsid=rdr_0GljAOcj6obaXQY93" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <a href="https://www.instagram.com/lntfinance?igsh=a3ZvY2JxaWdnb25s" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/></svg>
                  </a>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <a href="https://x.com/LnTFinance" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                  </a>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <a href="https://x.com/LnTFinance" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Always include the modal in case it needs to be triggered */}
      <NoBowlingActionModal
        open={showNoBowlingModal}
        onOpenChange={setShowNoBowlingModal}
      />
    </>
  );
}


