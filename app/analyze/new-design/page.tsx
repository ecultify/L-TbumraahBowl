'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAnalysis } from '@/context/AnalysisContext';
import { intensityToKmh } from '@/lib/utils/normalize';

function NewAnalyzeDesignContent() {
  const { state } = useAnalysis();
  const [sessionAnalysisData, setSessionAnalysisData] = useState<any>(null);
  const [benchmarkDetailedData, setBenchmarkDetailedData] = useState<any>(null);
  const [detailedAnalysisData, setDetailedAnalysisData] = useState<any>(null);
  const [detailedAnalysis, setDetailedAnalysis] = useState<any>(null);

  // Load data from session storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load analysisVideoData
      const storedData = window.sessionStorage.getItem('analysisVideoData');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          setSessionAnalysisData(parsedData);
        } catch (error) {
          console.error('Error parsing session storage data:', error);
        }
      }
      
      // Load benchmarkDetailedData  
      const benchmarkData = window.sessionStorage.getItem('benchmarkDetailedData');
      if (benchmarkData) {
        try {
          const parsedBenchmarkData = JSON.parse(benchmarkData);
          setBenchmarkDetailedData(parsedBenchmarkData);
          setDetailedAnalysisData(parsedBenchmarkData);
        } catch (error) {
          console.error('Error parsing benchmarkDetailedData from session storage:', error);
        }
      }
    }
  }, []);

  // Calculate values using the same logic as the original analyze page
  const hasResults = state.finalIntensity > 0 && !!state.speedClass;
  
  // Speed Values
  const kmhValue = hasResults ? Math.round(intensityToKmh(state.finalIntensity)) : 142;
  const mphValue = hasResults ? Number((kmhValue * 0.621371).toFixed(1)) : 88.2;
  const mphValueDisplay = Number.isNaN(mphValue)
    ? '0 mph'
    : `${Number.isInteger(mphValue) ? mphValue.toFixed(0) : mphValue.toFixed(1)} mph`;
  const speedLabel = hasResults ? state.speedClass : 'Fast';
  
  // Accuracy Score
  const accuracyScore = hasResults
    ? (benchmarkDetailedData?.overallSimilarity
      ? Math.round(parseFloat(benchmarkDetailedData.overallSimilarity) * 100)
      : Math.max(0, Math.round(state.finalIntensity)))
    : 93;
  const accuracyDisplay = Math.min(Math.max(accuracyScore, 0), 100);
  
  // Release Time
  const releaseTimeValue = detailedAnalysis?.timing?.releaseTime
    ? `${detailedAnalysis.timing.releaseTime.toFixed(2)}s`
    : '0.18s';

  // Phase Analysis Scores
  const directRunUpScore = benchmarkDetailedData?.runUp ? Math.round(parseFloat(benchmarkDetailedData.runUp) * 100) : (sessionAnalysisData?.phases?.runUp || 87);
  const directDeliveryScore = benchmarkDetailedData?.delivery ? Math.round(parseFloat(benchmarkDetailedData.delivery) * 100) : (sessionAnalysisData?.phases?.delivery || 79);
  const directFollowThroughScore = benchmarkDetailedData?.followThrough ? Math.round(parseFloat(benchmarkDetailedData.followThrough) * 100) : (sessionAnalysisData?.phases?.followThrough || 81);
  
  // Technical Metrics
  const directArmSwingScore = benchmarkDetailedData?.armSwing ? Math.round(parseFloat(benchmarkDetailedData.armSwing) * 100) : (sessionAnalysisData?.technicalMetrics?.armSwing || 83);
  const directBodyMovementScore = benchmarkDetailedData?.bodyMovement ? Math.round(parseFloat(benchmarkDetailedData.bodyMovement) * 100) : (sessionAnalysisData?.technicalMetrics?.bodyMovement || 88);
  const directRhythmScore = benchmarkDetailedData?.rhythm ? Math.round(parseFloat(benchmarkDetailedData.rhythm) * 100) : (sessionAnalysisData?.technicalMetrics?.rhythm || 85);
  const directReleasePointScore = benchmarkDetailedData?.releasePoint ? Math.round(parseFloat(benchmarkDetailedData.releasePoint) * 100) : (sessionAnalysisData?.technicalMetrics?.releasePoint || 89);

  // Recommendations
  const recommendations = detailedAnalysisData?.recommendations || sessionAnalysisData?.recommendations || detailedAnalysis?.recommendations || [];

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
      <main className="flex-1 px-6 pt-20 pb-8 flex justify-center relative z-10">
        <div className="relative mx-auto" style={{ width: 400, marginTop: 4 }}>
          
          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16, paddingLeft: 4 }}>
            <Link href="/">
              <img
                src="/images/newhomepage/Bowling%20Campaign%20Logo.png"
                alt="Bowling Campaign Logo"
                style={{ width: 208, height: "auto", cursor: "pointer" }}
              />
            </Link>
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
              
              {/* Headline */}
              <div className="mb-3 text-center">
                <div
                  style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: 800,
                    fontStyle: "italic",
                    fontSize: 19.65,
                    color: "#000000",
                    lineHeight: 1.1,
                    marginBottom: 2,
                  }}
                >
                  Your #BumrahKiSpeedPar<br />Report is Ready!
                </div>
              </div>

              {/* Upper Part Image */}
              <div style={{ position: "relative", width: "100%" }}>
                <img
                  src="/frontend-images/homepage/upperpart.png"
                  alt="Upper Part"
                  style={{ 
                    width: "100%", 
                    height: "auto",
                    display: "block"
                  }}
                />
                
                {/* Bottom Part Image - positioned on top with same bottom alignment */}
                <img
                  src="/frontend-images/homepage/bottompart.png"
                  alt="Bottom Part"
                  style={{ 
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    width: "100%", 
                    height: "auto",
                    display: "block"
                  }}
                />
              </div>

              {/* Analysis Data Card */}
              <div
                style={{
                  width: "100%",
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 12
                }}
              >
                <h3 style={{
                  fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  color: "#000000",
                  marginBottom: 12,
                  textAlign: "center"
                }}>
                  Analysis Results
                </h3>

                {/* Speed Values */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Speed (km/h):</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{kmhValue}</span>
                  </div>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Speed (mph):</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{mphValueDisplay}</span>
                  </div>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Classification:</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{speedLabel}</span>
                  </div>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Accuracy:</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{accuracyDisplay}%</span>
                  </div>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Release Time:</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{releaseTimeValue}</span>
                  </div>
                </div>

                {/* Phase Analysis */}
                <div style={{ marginBottom: 12 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Phase Analysis:</h4>
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 12 }}>Run-up:</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{directRunUpScore}%</span>
                    </div>
                    <div style={{ width: "100%", height: 4, backgroundColor: "#E5E7EB", borderRadius: 2 }}>
                      <div style={{ 
                        width: `${Math.min(directRunUpScore, 100)}%`, 
                        height: "100%", 
                        backgroundColor: "#10B981", 
                        borderRadius: 2 
                      }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 12 }}>Delivery:</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{directDeliveryScore}%</span>
                    </div>
                    <div style={{ width: "100%", height: 4, backgroundColor: "#E5E7EB", borderRadius: 2 }}>
                      <div style={{ 
                        width: `${Math.min(directDeliveryScore, 100)}%`, 
                        height: "100%", 
                        backgroundColor: "#3B82F6", 
                        borderRadius: 2 
                      }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 12 }}>Follow-through:</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{directFollowThroughScore}%</span>
                    </div>
                    <div style={{ width: "100%", height: 4, backgroundColor: "#E5E7EB", borderRadius: 2 }}>
                      <div style={{ 
                        width: `${Math.min(directFollowThroughScore, 100)}%`, 
                        height: "100%", 
                        backgroundColor: "#8B5CF6", 
                        borderRadius: 2 
                      }} />
                    </div>
                  </div>
                </div>

                {/* Technical Metrics */}
                <div style={{ marginBottom: 12 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Technical Metrics:</h4>
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 12 }}>Arm Swing:</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{directArmSwingScore}%</span>
                    </div>
                    <div style={{ width: "100%", height: 4, backgroundColor: "#E5E7EB", borderRadius: 2 }}>
                      <div style={{ 
                        width: `${Math.min(directArmSwingScore, 100)}%`, 
                        height: "100%", 
                        backgroundColor: "#F59E0B", 
                        borderRadius: 2 
                      }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 12 }}>Body Movement:</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{directBodyMovementScore}%</span>
                    </div>
                    <div style={{ width: "100%", height: 4, backgroundColor: "#E5E7EB", borderRadius: 2 }}>
                      <div style={{ 
                        width: `${Math.min(directBodyMovementScore, 100)}%`, 
                        height: "100%", 
                        backgroundColor: "#EF4444", 
                        borderRadius: 2 
                      }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 12 }}>Rhythm:</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{directRhythmScore}%</span>
                    </div>
                    <div style={{ width: "100%", height: 4, backgroundColor: "#E5E7EB", borderRadius: 2 }}>
                      <div style={{ 
                        width: `${Math.min(directRhythmScore, 100)}%`, 
                        height: "100%", 
                        backgroundColor: "#06B6D4", 
                        borderRadius: 2 
                      }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 12 }}>Release Point:</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{directReleasePointScore}%</span>
                    </div>
                    <div style={{ width: "100%", height: 4, backgroundColor: "#E5E7EB", borderRadius: 2 }}>
                      <div style={{ 
                        width: `${Math.min(directReleasePointScore, 100)}%`, 
                        height: "100%", 
                        backgroundColor: "#84CC16", 
                        borderRadius: 2 
                      }} />
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Recommendations:</h4>
                    {recommendations.map((rec: string, index: number) => (
                      <p key={index} style={{ 
                        fontSize: 12, 
                        marginBottom: 4, 
                        padding: 8,
                        backgroundColor: "#F3F4F6",
                        borderRadius: 4,
                        lineHeight: 1.4
                      }}>
                        • {rec}
                      </p>
                    ))}
                  </div>
                )}

                {/* Debug Info */}
                <div style={{ marginTop: 12, padding: 8, backgroundColor: "#F9FAFB", borderRadius: 4 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Debug Info:</h4>
                  <div style={{ fontSize: 10, color: "#6B7280" }}>
                    <p>Has Results: {hasResults ? 'Yes' : 'No'}</p>
                    <p>State Final Intensity: {state.finalIntensity}</p>
                    <p>State Speed Class: {state.speedClass || 'None'}</p>
                    <p>Benchmark Data: {benchmarkDetailedData ? 'Available' : 'None'}</p>
                    <p>Session Data: {sessionAnalysisData ? 'Available' : 'None'}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: 12, 
                width: "100%",
                marginTop: 12 
              }}>
                
                {/* Leaderboard Button */}
                <Link href="/leaderboard">
                  <button
                    style={{
                      width: "100%",
                      backgroundColor: '#CCEAF7',
                      borderRadius: '25.62px',
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: '700',
                      fontSize: '14px',
                      color: 'black',
                      padding: '12px 16px',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                    className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                  >
                    <img
                      src="/frontend-images/homepage/Vector.svg"
                      alt="Leaderboard"
                      style={{ width: 16, height: 16 }}
                    />
                    View Leaderboard
                  </button>
                </Link>

                {/* Download Report Button */}
                <button
                  style={{
                    width: "100%",
                    backgroundColor: '#FDC217',
                    borderRadius: '25.62px',
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: '700',
                    fontSize: '14px',
                    color: 'black',
                    padding: '12px 16px',
                    border: 'none'
                  }}
                  className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                >
                  Download Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto w-full bg-black py-6 px-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
          <div className="text-left">
            <p className="text-white text-xs" style={{ 
              fontFamily: "Inter, sans-serif", 
              fontWeight: 400, 
              fontSize: 10, 
              lineHeight: 1.4 
            }}>
              Copyright L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white text-xs mr-2" style={{ 
              fontFamily: "Inter, sans-serif", 
              fontWeight: 400, 
              fontSize: 10 
            }}>
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
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
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

export default function NewAnalyzeDesignPage() {
  return <NewAnalyzeDesignContent />;
}