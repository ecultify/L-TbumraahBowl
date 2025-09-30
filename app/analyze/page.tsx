'use client';

import React from 'react';
import Link from 'next/link';
import { useAnalysis } from '@/context/AnalysisContext';
import { intensityToKmh, classifySpeed } from '@/lib/utils/normalize';
import { NoBowlingActionModal } from '@/components/NoBowlingActionModal';
import { CompositeCard } from '@/components/CompositeCard';
import { GlassBackButton } from '@/components/GlassBackButton';
import html2canvas from 'html2canvas';

export default function SimplifiedAnalyzePage() {
  const { state } = useAnalysis();
  const [sessionAnalysisData, setSessionAnalysisData] = React.useState<any>(null);
  const [benchmarkDetailedData, setBenchmarkDetailedData] = React.useState<any>(null);
  const [detailedAnalysisData, setDetailedAnalysisData] = React.useState<any>(null);
  const [isViewingVideo, setIsViewingVideo] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showNoBowlingModal, setShowNoBowlingModal] = React.useState(false);

  // Player name state
  const [playerName, setPlayerName] = React.useState<string>('');

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

  // Download composite card functionality
  const downloadCompositeCard = async () => {
    const cardElement = document.getElementById('composite-card');
    if (!cardElement) {
      console.error('Composite card element not found');
      return;
    }

    try {
      console.log('📥 Starting composite card download...');
      
      // Wait for fonts to load
      try {
        await document.fonts.ready;
        console.log('✅ Fonts loaded');
      } catch (e) {
        console.log('⚠️ Font loading check skipped');
      }
      
      // Wait for the card to be fully rendered with correct scale
      const waitForReady = () => new Promise<void>((resolve) => {
        const checkReady = () => {
          if (cardElement.getAttribute('data-ready') === 'true') {
            console.log('✅ Card is ready for capture');
            resolve();
          } else {
            console.log('⏳ Waiting for card to render...');
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });

      await waitForReady();
      
      // Get the scale from the card element
      const scaleValue = parseFloat(cardElement.getAttribute('data-scale') || '1');
      console.log('📐 Using scale:', scaleValue);
      
      // Force browser to recalculate and apply all styles
      cardElement.offsetHeight; // Trigger reflow
      
      // Wait for browser to paint all changes
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Double RAF ensures paint is complete
            setTimeout(resolve, 500);
          });
        });
      });
      
      console.log('📸 Starting capture with dimensions:', {
        width: cardElement.offsetWidth,
        height: cardElement.offsetHeight,
        scale: scaleValue
      });
      
      // Configure html2canvas options for better quality
      const canvas = await html2canvas(cardElement, {
        useCORS: true,
        allowTaint: true,
        scale: 2, // Higher resolution
        backgroundColor: null, // Transparent background
        imageTimeout: 0,
        removeContainer: true,
        logging: false,
        width: cardElement.offsetWidth,
        height: cardElement.offsetHeight,
        onclone: (clonedDoc) => {
          console.log('🖨️ Cloning document for capture...');
          
          // Find the cloned card and apply scale-dependent styles
          const clonedCard = clonedDoc.getElementById('composite-card');
          if (clonedCard) {
            // Reset transforms that might interfere
            clonedCard.style.transform = 'none';
            clonedCard.style.isolation = 'auto';
            clonedCard.style.willChange = 'auto';
            
            // Get the stored scale value
            const cloneScale = parseFloat(clonedCard.getAttribute('data-scale') || '1');
            console.log('📐 Clone scale:', cloneScale);
            
            // Force all absolutely positioned elements to use inline styles with current scale
            const allAbsoluteElements = clonedCard.querySelectorAll('[style*="position: absolute"]');
            allAbsoluteElements.forEach((el: any) => {
              const style = el.getAttribute('style');
              if (style) {
                // Keep the existing inline styles as they already have the scale applied
                el.style.cssText = style;
              }
            });
          }
        }
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `bowling-analysis-report-${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Composite card downloaded successfully');
    } catch (error) {
      console.error('❌ Failed to download composite card:', error);
    }
  };

  return (
    <>
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
                    fontSize: 17.5,
                    color: "#000000",
                    lineHeight: 1.1,
                    marginBottom: 2,
                  }}
                >
                  Your #BumrahKiSpeedPar<br />Report is Ready!
                </div>
              </div>

              {/* Composite Card - Always shown when there are results */}
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
                        backgroundColor: '#28a745',
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
                      onClick={() => {
                        console.log('🎥 View Video button clicked');
                        // Add your video viewing logic here
                        setIsViewingVideo(true);
                      }}
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

      <footer className="mt-auto w-full bg-black py-6 px-6">
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
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
                onClick={() => {
                  console.log('⬅️ Back button clicked - going to video-preview...');
                  window.location.href = '/video-preview';
                }}
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

              {/* Analyze Glass Box - Centered */}
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
                  {/* Desktop Analyze Content */}
                  <div className="w-full">
                    {/* Headline */}
                    <div className="mb-4 text-center">
                      <div
                        style={{
                          fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                          fontWeight: 800,
                          fontStyle: "italic",
                          fontSize: 18,
                          color: "#000000",
                          lineHeight: 1.1,
                          marginBottom: 4,
                        }}
                      >
                        Your #BumrahKiSpeedPar<br />Report is Ready!
                      </div>
                    </div>

                    {/* Composite Card - Always shown when there are results */}
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
                    
                    {/* Action Buttons - Inside glass box */}
                    <div className="mb-2" style={{ width: '100%', marginTop: '12px' }}>
                      {accuracyDisplay > 85 ? (
                        // 3 buttons when score > 85%
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Link href="/leaderboard" style={{ flex: 1 }}>
                            <button
                              className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                              style={{
                                width: "100%",
                                backgroundColor: '#CCEAF7',
                                borderRadius: '22px',
                                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                                fontWeight: '700',
                                fontSize: '13px',
                                color: 'black',
                                padding: '8px 12px',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6
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
                              backgroundColor: '#28a745',
                              borderRadius: '22px',
                              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                              fontWeight: '700',
                              fontSize: '13px',
                              color: 'white',
                              padding: '8px 12px',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6
                            }}
                            onClick={() => {
                              console.log('🎥 View Video button clicked');
                              // Add your video viewing logic here
                              setIsViewingVideo(true);
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                            View Video
                          </button>

                          <button
                            className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                            style={{
                              flex: 1,
                              backgroundColor: '#FDC217',
                              borderRadius: '22px',
                              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                              fontWeight: '700',
                              fontSize: '13px',
                              color: 'black',
                              padding: '8px 12px',
                              border: 'none'
                            }}
                            onClick={downloadCompositeCard}
                          >
                            Download Report
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
                                borderRadius: '22px',
                                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                                fontWeight: '700',
                                fontSize: '13px',
                                color: 'black',
                                padding: '8px 12px',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6
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
                              borderRadius: '22px',
                              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                              fontWeight: '700',
                              fontSize: '13px',
                              color: 'black',
                              padding: '8px 12px',
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
                </div>

                {/* Text and Retry Button - Below Glass Box */}
                <div style={{ marginTop: '20px', width: '100%' }}>
                  {/* Plain White Text */}
                  <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                    <p style={{
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: '700',
                      fontSize: '13px',
                      color: '#FFFFFF',
                      margin: 0
                    }}>
                      Enter feedback or comments here
                    </p>
                  </div>
                  
                  {/* Retry Button */}
                  <button
                    className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                    style={{
                      width: '100%',
                      backgroundColor: '#80CBEB',
                      borderRadius: '22.89px',
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: '700',
                      fontSize: '13px',
                      color: 'white',
                      padding: '10px 16px',
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
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Footer */}
        <footer className="mt-auto w-full bg-black py-6 px-6">
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
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

      {/* Always include the modal in case it needs to be triggered */}
      <NoBowlingActionModal
        open={showNoBowlingModal}
        onOpenChange={setShowNoBowlingModal}
      />
    </>
  );
}