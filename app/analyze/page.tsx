'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings2, Play, RotateCcw } from 'lucide-react';
import { useAnalysis, FrameIntensity, AnalyzerMode } from '@/context/AnalysisContext';
import { SpeedMeter } from '@/components/SpeedMeter';
import { VideoRecorder } from '@/components/VideoRecorder';
import { VideoUploader } from '@/components/VideoUploader';
import { Sparkline } from '@/components/Sparkline';
import { AnalysisResults } from '@/components/AnalysisResults';
import { useToast } from '@/components/Toast';
import { FrameSampler } from '@/lib/video/frameSampler';

import { PoseBasedAnalyzer } from '@/lib/analyzers/poseBased';
import { BenchmarkComparisonAnalyzer } from '@/lib/analyzers/benchmarkComparison';
import { normalizeIntensity, classifySpeed, intensityToKmh } from '@/lib/utils/normalize';
import LeaderboardModal from '@/components/LeaderboardModal';
import ReportPreview from '@/components/ReportPreview';

function AnalyzeContent() {
  const { state, dispatch } = useAnalysis();
  const { addToast, ToastContainer } = useToast();
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [detailedAnalysis, setDetailedAnalysis] = useState<any>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameSamplerRef = useRef<FrameSampler | null>(null);

  const buttonFontFamily = "'Frutiger Bold','Frutiger','Inter',sans-serif";
  const buttonFontStyle = { fontFamily: buttonFontFamily };
  const ctaTextStyle = {
    fontFamily: buttonFontFamily,
    fontWeight: 700,
    fontSize: '16px',
    lineHeight: '1'
  };

  const poseAnalyzerRef = useRef<PoseBasedAnalyzer>(new PoseBasedAnalyzer());
  const benchmarkAnalyzerRef = useRef<BenchmarkComparisonAnalyzer>(new BenchmarkComparisonAnalyzer());
  // Get tab from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'upload') {
      setActiveTab('upload');
    }
  }, []);

  const downloadReportPdf = useCallback(async () => {
    try {
      setGeneratingPdf(true);
      const [{ jsPDF }, html2canvas] = await Promise.all([
        import('jspdf'),
        import('html2canvas').then((m: any) => m.default || m)
      ]);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const title = 'Bowling Analysis Report';
      const now = new Date();
      const dt = now.toLocaleString();

      // Try to draw logo at top center
      try {
        const logoUrl = 'https://ecultify.com/wp-content/uploads/2022/09/logo-ecultify.png.webp';
        const dataUrl = await (async function toPngDataUrl(url: string) {
          return await new Promise<string>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('no ctx');
                ctx.drawImage(img, 0, 0);
                const d = canvas.toDataURL('image/png');
                resolve(d);
              } catch (e) { reject(e); }
            };
            img.onerror = () => resolve('');
            img.src = url;
          });
        })(logoUrl);
        if (dataUrl) {
          const pageWidth = doc.internal.pageSize.getWidth();
          const imgW = 50; // mm
          const imgH = 16; // approx
          doc.addImage(dataUrl, 'PNG', (pageWidth - imgW) / 2, 15, imgW, imgH);
        }
      } catch {}

      // Page 1: company logo only + generated timestamp
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(11);
      doc.text(`Generated: ${dt}`, pageWidth - 10, 10, { align: 'right' });

      // Page 2: Styled report (captured from UI)
      doc.addPage();
      const target = document.getElementById('pdf-report-capture');
      if (target) {
        const canvas = await html2canvas(target as HTMLElement, { backgroundColor: null, scale: 2 } as any);
        const imgData = canvas.toDataURL('image/png');
        const w = doc.internal.pageSize.getWidth();
        const h = (canvas.height * w) / canvas.width;
        doc.addImage(imgData, 'PNG', 0, 0, w, h);
      }
      const ts2 = new Date().toISOString().replace(/[:.]/g, '-');
      doc.save(`bowling_report_${ts2}.pdf`);
      return;

    } catch (e) {
      console.warn('Failed to generate PDF', e);
      addToast({ type: 'error', title: 'PDF failed', message: 'Could not create report' });
    } finally {
      setGeneratingPdf(false);
    }
  }, [state.finalIntensity, state.speedClass, state.confidence, state.analyzerMode, detailedAnalysis, addToast]);

  const generateAnalysisVideo = useCallback(async () => {
    try {
      setGeneratingVideo(true);
      addToast({
        type: 'info',
        title: 'Generating video...',
        message: 'Creating your personalized analysis video'
      });

      // Prepare analysis data for Remotion
      const analysisData = {
        intensity: state.finalIntensity,
        speedClass: state.speedClass,
        kmh: Number(intensityToKmh(state.finalIntensity).toFixed(2)),
        similarity: state.finalIntensity,
        frameIntensities: state.frameIntensities, // Add frame intensities for motion chart
        phases: {
          runUp: detailedAnalysis?.phaseComparison?.runUp ? Math.round(detailedAnalysis.phaseComparison.runUp * 100) : 50,
          delivery: detailedAnalysis?.phaseComparison?.delivery ? Math.round(detailedAnalysis.phaseComparison.delivery * 100) : 60,
          followThrough: detailedAnalysis?.phaseComparison?.followThrough ? Math.round(detailedAnalysis.phaseComparison.followThrough * 100) : 71
        },
        technicalMetrics: {
          armSwing: detailedAnalysis?.technicalMetrics?.armSwingSimilarity ? Math.round(detailedAnalysis.technicalMetrics.armSwingSimilarity * 100) : 49,
          bodyMovement: detailedAnalysis?.technicalMetrics?.bodyMovementSimilarity ? Math.round(detailedAnalysis.technicalMetrics.bodyMovementSimilarity * 100) : 69,
          rhythm: detailedAnalysis?.technicalMetrics?.rhythmSimilarity ? Math.round(detailedAnalysis.technicalMetrics.rhythmSimilarity * 100) : 49,
          releasePoint: detailedAnalysis?.technicalMetrics?.releasePointAccuracy ? Math.round(detailedAnalysis.technicalMetrics.releasePointAccuracy * 100) : 69
        },
        recommendations: detailedAnalysis?.recommendations || ['Focus on arm swing technique and timing'],
        playerName: 'Pawan' // You can make this dynamic later
      };

      // Call the video generation API
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysisData }),
      });

      if (!response.ok) {
        throw new Error('Video generation failed');
      }

      const result = await response.json();
      
      if (result.success && result.videoUrl) {
        setGeneratedVideoUrl(result.videoUrl);
        addToast({
          type: 'success',
          title: 'Video ready!',
          message: 'Your analysis video has been generated'
        });
      } else {
        throw new Error(result.error || 'Video generation failed');
      }

    } catch (error) {
      console.error('Video generation failed:', error);
      addToast({
        type: 'error',
        title: 'Video generation failed',
        message: 'Please try again later'
      });
    } finally {
      setGeneratingVideo(false);
    }
  }, [state.finalIntensity, state.speedClass, detailedAnalysis, addToast]);

  const handleVideoReady = useCallback((videoUrl: string) => {
    dispatch({ type: 'SET_VIDEO', payload: videoUrl });
    addToast({
      type: 'success',
      title: 'Video ready!',
      message: 'Click Analyze to start processing'
    });
  }, [dispatch, addToast]);

  const startAnalysis = useCallback(async () => {
    if (!state.currentVideo || !videoRef.current) return;

    dispatch({ type: 'START_ANALYSIS' });
    
    try {
      console.log(`Starting analysis with ${state.analyzerMode} mode`);
      
      // Initialize analyzer based on mode
      let analyzer: PoseBasedAnalyzer | BenchmarkComparisonAnalyzer;
      if (state.analyzerMode === 'benchmark') {
        console.log('Initializing benchmark analyzer...');
        const initialized = await benchmarkAnalyzerRef.current.loadBenchmarkPattern();
        if (!initialized) {
          console.warn('Benchmark analyzer failed');
          addToast({
            type: 'error',
            title: 'Benchmark comparison failed',
            message: 'Please try again or use pose detection'
          });
          return;
        } else {
          console.log('Benchmark analyzer initialized successfully');
          analyzer = benchmarkAnalyzerRef.current;
        }
      } else if (state.analyzerMode === 'pose') {
        console.log('Initializing pose analyzer...');
        const initialized = await poseAnalyzerRef.current.initialize();
        if (!initialized) {
          console.warn('Pose analyzer failed, falling back to benchmark');
          addToast({
            type: 'error',
            title: 'Pose detection failed',
            message: 'Falling back to benchmark analyzer'
          });
          dispatch({ type: 'SET_ANALYZER_MODE', payload: 'benchmark' });
          const benchmarkInitialized = await benchmarkAnalyzerRef.current.loadBenchmarkPattern();
          if (!benchmarkInitialized) {
            addToast({
              type: 'error',
              title: 'All analyzers failed',
              message: 'Please try again'
            });
            return;
          }
          analyzer = benchmarkAnalyzerRef.current;
        } else {
          console.log('Pose analyzer initialized successfully');
          analyzer = poseAnalyzerRef.current;
        }
      } else {
        // Default to benchmark analyzer
        console.log('Defaulting to benchmark analyzer...');
        const initialized = await benchmarkAnalyzerRef.current.loadBenchmarkPattern();
        if (!initialized) {
          addToast({
            type: 'error',
            title: 'Analyzer initialization failed',
            message: 'Please try again'
          });
          return;
        }
        analyzer = benchmarkAnalyzerRef.current;
      }

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

          let intensity: number;
          if (state.analyzerMode === 'pose') {
            intensity = await (analyzer as PoseBasedAnalyzer).analyzeFrame(frame);
          } else {
            intensity = await (analyzer as BenchmarkComparisonAnalyzer).analyzeFrame(frame);
          }

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
        const handleEnded = () => {
          frameSamplerRef.current?.stop();
          resolve();
        };
        videoRef.current?.addEventListener('ended', handleEnded);
      });

      // Calculate final results
      const rawFinalIntensity = analyzer.getFinalIntensity();
      console.log(`Raw final intensity: ${rawFinalIntensity}`);
      // For benchmark comparison, rawFinalIntensity is already a similarity percentage (0-100)
      // For other analyzers, we need to normalize
      let finalIntensity: number;
      if (state.analyzerMode === 'benchmark') {
        finalIntensity = rawFinalIntensity; // Already 0-100
      } else {
        const allIntensities = intensities.map(f => f.intensity);
        const minIntensity = Math.min(...allIntensities, 0);
        const maxIntensity = Math.max(...allIntensities, 1);
        finalIntensity = normalizeIntensity(rawFinalIntensity, minIntensity, maxIntensity);
      }
      
      console.log(`Final intensity: ${finalIntensity}`);
      const { speedClass, confidence, message } = classifySpeed(finalIntensity);

      dispatch({ 
        type: 'COMPLETE_ANALYSIS', 
        payload: { 
          finalIntensity, 
          speedClass, 
          confidence
        } 
      });

      // Get detailed analysis if using benchmark mode
      if (state.analyzerMode === 'benchmark') {
        const detailed = (analyzer as BenchmarkComparisonAnalyzer).getDetailedAnalysis();
        setDetailedAnalysis(detailed);
      }

      if (typeof window !== 'undefined') {
        const pendingEntry = {
          predicted_kmh: Number(intensityToKmh(finalIntensity).toFixed(2)),
          similarity_percent: Number(finalIntensity.toFixed(2)),
          intensity_percent: Number(finalIntensity.toFixed(2)),
          speed_class: speedClass,
          meta: {
            analyzer_mode: state.analyzerMode,
            app: 'bowling-analyzer',
          },
          created_at: new Date().toISOString(),
        };
        window.sessionStorage.setItem('pendingLeaderboardEntry', JSON.stringify(pendingEntry));
      }

      // Show leaderboard modal
      setShowLeaderboard(true);

      addToast({
        type: 'success',
        title: `Analysis complete: ${speedClass}!`,
        message
      });

    } catch (error) {
      console.error('Analysis failed:', error);
      addToast({
        type: 'error',
        title: 'Analysis failed',
        message: 'Please try again with a different video'
      });
    }
  }, [state.currentVideo, state.analyzerMode, dispatch, addToast]);

  const resetAnalysis = useCallback(() => {
    dispatch({ type: 'RESET_ANALYSIS' });
    frameSamplerRef.current?.stop();
    setCurrentVideoTime(0);
  }, [dispatch]);


  const toggleAnalyzerMode = useCallback(() => {
    const modes: AnalyzerMode[] = ['benchmark', 'pose'];
    const currentIndex = modes.indexOf(state.analyzerMode);
    const newMode = modes[(currentIndex + 1) % modes.length];
    
    dispatch({ type: 'SET_ANALYZER_MODE', payload: newMode });
    
    const modeNames = {
      benchmark: 'Benchmark Comparison', 
      pose: 'Pose AI'
    };
    
    const modeDescriptions = {
      benchmark: 'Comparing hand movements to benchmark video',
      pose: 'Using AI pose detection for analysis'
    };
    
    addToast({
      type: 'info',
      title: `Switched to ${modeNames[newMode]}`,
      message: modeDescriptions[newMode]
    });
  }, [state.analyzerMode, dispatch, addToast]);

  // Update current video time for sparkline
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentVideoTime(video.currentTime);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [state.currentVideo]);

  const hasResults = state.finalIntensity > 0 && !!state.speedClass;
  const kmhValue = hasResults ? Math.round(intensityToKmh(state.finalIntensity)) : 142;
  const mphValue = hasResults ? Number((kmhValue * 0.621371).toFixed(1)) : 88.2;
  const mphValueDisplay = Number.isNaN(mphValue)
    ? '0 mph'
    : `${Number.isInteger(mphValue) ? mphValue.toFixed(0) : mphValue.toFixed(1)} mph`;
  const classificationResult = classifySpeed(state.finalIntensity || 0);
  const speedLabel = hasResults ? (state.speedClass ?? classificationResult.speedClass) : 'Fast';
  const summaryMessage = hasResults
    ? classificationResult.message
    : 'Excellent bowling speed! Your technique shows good consistency with room for minor improvements.';
  const accuracyScore = hasResults
    ? (detailedAnalysis?.overallSimilarity
      ? Math.round(detailedAnalysis.overallSimilarity * 100)
      : Math.max(0, Math.round(state.finalIntensity)))
    : 85;
  const accuracyDisplay = Math.min(Math.max(accuracyScore, 0), 100);
  const releaseTimeValue = detailedAnalysis?.timing?.releaseTime
    ? `${detailedAnalysis.timing.releaseTime.toFixed(2)}s`
    : '0.18s';
  const runUpScore = hasResults && detailedAnalysis?.phaseComparison?.runUp
    ? Math.round(detailedAnalysis.phaseComparison.runUp * 100)
    : 78;
  const deliveryScore = hasResults && detailedAnalysis?.phaseComparison?.delivery
    ? Math.round(detailedAnalysis.phaseComparison.delivery * 100)
    : 82;
  const followThroughScore = hasResults && detailedAnalysis?.phaseComparison?.followThrough
    ? Math.round(detailedAnalysis.phaseComparison.followThrough * 100)
    : 80;
  const armSwingScore = hasResults && detailedAnalysis?.technicalMetrics?.armSwingSimilarity
    ? Math.round(detailedAnalysis.technicalMetrics.armSwingSimilarity * 100)
    : 74;
  const bodyMovementScore = hasResults && detailedAnalysis?.technicalMetrics?.bodyMovementSimilarity
    ? Math.round(detailedAnalysis.technicalMetrics.bodyMovementSimilarity * 100)
    : 79;
  const rhythmScore = hasResults && detailedAnalysis?.technicalMetrics?.rhythmSimilarity
    ? Math.round(detailedAnalysis.technicalMetrics.rhythmSimilarity * 100)
    : 72;
  const releasePointScore = hasResults && detailedAnalysis?.technicalMetrics?.releasePointAccuracy
    ? Math.round(detailedAnalysis.technicalMetrics.releasePointAccuracy * 100)
    : 76;

  const metrics = [
    { label: 'Run-up', value: runUpScore },
    { label: 'Delivery', value: deliveryScore },
    { label: 'Follow-through', value: followThroughScore },
  ];

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
      <ToastContainer />
      <div id="pdf-report-capture" style={{ position: 'absolute', left: -10000, top: -10000 }}>
        <ReportPreview
          kmh={Number(intensityToKmh(state.finalIntensity).toFixed(2))}
          similarityPercent={state.finalIntensity}
          speedClass={state.speedClass}
          confidencePercent={Math.round(state.confidence * 100)}
          details={detailedAnalysis}
        />
      </div>
      <LeaderboardModal open={showLeaderboard} onOpenChange={setShowLeaderboard} highlightId={null} />

      {/* Mobile Analysis Report */}
      <div 
        className="md:hidden relative flex flex-col min-h-screen"
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

        <div className="absolute top-0 left-0 right-0 z-10 pt-6 px-4">
          <Link
            href="/quick-analysis"
            className="inline-flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>
        </div>

        <div className="relative flex-1 px-4 pt-20 pb-12 space-y-8">
          <div className="text-center">
            <h1 className="mb-1 text-2xl font-extrabold   tracking-tight text-[#FDC217]">
              Analysis Report
            </h1>
            <p className="text-xs font-medium tracking-tight text-white">
              Your bowling performance breakdown
            </p>
          </div>

          <div className="relative">
            <img
              src="/frontend-images/homepage/ball.png"
              alt=""
              className="pointer-events-none absolute -top-6 -left-6 h-16 w-16 object-contain"
            />
            <img
              src="/frontend-images/homepage/ball.png"
              alt=""
              className="pointer-events-none absolute -bottom-8 -right-6 h-20 w-20 object-contain"
            />
            <div className="relative rounded-[20px] border border-white/10 bg-white/10 px-6 py-6 text-left shadow-[0_8px_32px_rgba(31,38,135,0.25)] backdrop-blur-xl">
              <h2 className="text-base font-semibold tracking-wide text-white text-center">Bowling Speed</h2>
              <div className="mt-5 flex flex-col items-center">
                <div
                  className="flex h-[110px] w-[110px] flex-col items-center justify-center rounded-full shadow-lg"
                  style={{ background: 'linear-gradient(180deg, #40A5EF 0%, #0A526E 100%)' }}
                >
                  <span className="text-[40px] font-extrabold leading-none text-white">{kmhValue}</span>
                  <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/90">km/h</span>
                </div>
                
              </div>
              <div className="mt-6 flex items-start justify-between text-white">
                <div>
                  <p className="text-[13px] uppercase tracking-wide text-white/70">Speed (Imperial)</p>
                  <p className="text-xl font-bold leading-tight">{mphValueDisplay}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] uppercase tracking-wide text-white/70">Bowling Type</p>
                  <p className="text-xl font-bold leading-tight">{speedLabel}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[20px] border border-white/10 bg-white/10 px-4 py-5 text-white shadow-[0_8px_32px_rgba(31,38,135,0.25)] backdrop-blur-xl flex flex-col items-center text-center">
              <img src="/frontend-images/homepage/icons/carbon_growth.svg" alt="Accuracy" className="h-10 w-10" />
              <p className="mt-3 text-xl font-semibold">{accuracyDisplay}%</p>
              <p className="text-xs tracking-wide text-white/70">Accuracy score</p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/10 px-4 py-5 text-white shadow-[0_8px_32px_rgba(31,38,135,0.25)] backdrop-blur-xl flex flex-col items-center text-center">
              <img src="/frontend-images/homepage/icons/streamline-sharp_time-lapse.svg" alt="Release Time" className="h-10 w-10" />
              <p className="mt-3 text-xl font-semibold">{releaseTimeValue}</p>
              <p className="text-xs tracking-wide text-white/70">Release time</p>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-[20px] bg-[#FFC315] px-6 py-6 text-left text-black shadow-[0_8px_32px_rgba(31,38,135,0.25)]">
              <h3 className="mb-4 text-lg font-bold uppercase tracking-tight">Performance Summary</h3>
              {metrics.map((metric) => (
                <div key={metric.label} className="mb-4 last:mb-0">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{metric.label}</span>
                    <span>{Math.min(metric.value, 100)}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10 border border-black">
                    <div
                      className="h-full rounded-full bg-white"
                      style={{ width: `${Math.min(metric.value, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="mt-5 text-sm font-medium leading-relaxed">{summaryMessage}</p>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <div className="w-full max-w-md text-center">
              <h3
                className="mb-3 text-white"
                style={{
                  fontFamily: "'Frutiger Bold','Frutiger','Inter',sans-serif",
                  fontSize: '24px',
                  fontWeight: 700
                }}
              >
                Detailed Report
              </h3>

              <div
                className="rounded-2xl bg-white/10 p-5 text-white backdrop-blur-xl shadow-[0_12px_32px_rgba(31,38,135,0.25)] space-y-5 text-left"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70 mb-3">Technical Breakdown</p>
                  <div className="space-y-3">
                    {[
                      { label: 'Arm Swing', value: armSwingScore },
                      { label: 'Body Movement', value: bodyMovementScore },
                      { label: 'Rhythm', value: rhythmScore },
                      { label: 'Release Point', value: releasePointScore },
                    ].map((metric) => (
                      <div key={metric.label} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-white/80">{metric.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-white/15 border border-black/40 overflow-hidden">
                            <div
                              className="h-full bg-[#FFC315]"
                              style={{ width: `${Math.min(100, metric.value)}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-sm font-semibold">{metric.value}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {hasResults && detailedAnalysis?.recommendations?.length ? (
            <div className="mt-6 flex justify-center">
              <div
                className="w-[353px] rounded-[20px] bg-[#FFC315] px-6 py-5 text-black shadow-[0_8px_24px_rgba(31,38,135,0.25)]"
                style={{ fontFamily: "'Frutiger','Inter',sans-serif" }}
              >
                <h4
                  className="mb-3 text-left text-lg font-bold uppercase tracking-tight"
                  style={{ fontFamily: "'Frutiger Bold','Frutiger','Inter',sans-serif" }}
                >
                  Recommendations
                </h4>
                <ul className="space-y-2 text-sm leading-relaxed">
                  {detailedAnalysis.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-black/70" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {hasResults && state.finalIntensity >= 85 ? (
            <div className="mt-6 flex justify-center">
              <button
                onClick={generateAnalysisVideo}
                disabled={generatingVideo}
                className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 disabled:opacity-60"
                style={{
                  backgroundColor: '#FFC315',
                  borderRadius: '25.62px',
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontSize: '16px',
                  color: 'black',
                  width: '261px',
                  height: '41px'
                }}
              >
                {generatingVideo ? 'Generating Video...' : 'Generate Analysis Video'}
              </button>
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            <div className="flex justify-center">
              <Link
                href="/leaderboard"
                className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105"
                style={{
                  ...ctaTextStyle,
                  backgroundColor: '#FFC315',
                  borderRadius: '25.62px',
                  color: 'black',
                  width: '261px',
                  height: '41px'
                }}
              >
                View Leaderboard
              </Link>
            </div>
            <div className="flex justify-center">
              <button
                onClick={downloadReportPdf}
                disabled={generatingPdf}
                className="inline-flex items-center justify-center border border-white/20 bg-white/10 text-center text-sm font-bold tracking-wide text-white backdrop-blur-lg transition-all duration-300 hover:bg-white/20 disabled:opacity-60"
                style={{
                  ...ctaTextStyle,
                  borderRadius: '25.62px',
                  width: '261px',
                  height: '41px'
                }}
              >
                {generatingPdf ? 'Preparing Report...' : 'Download Report'}
              </button>
            </div>
          </div>
        </div>

        <footer className="relative bg-black px-4 py-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-left">
              <p
                className="text-xs text-white"
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
                className="mr-2 text-xs text-white"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: '10px'
                }}
              >
                Connect with us
              </span>

              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>

                <div className="flex h-8 w-8 items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </div>

                <div className="flex h-8 w-8 items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </div>

                <div className="flex h-8 w-8 items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Desktop Experience */}
      <div
        className="hidden md:block min-h-screen"
        style={{
          backgroundImage: 'url(/frontend-images/homepage/bowlbg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </Link>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 rounded-xl bg-white p-2 shadow-md">
                <Settings2 className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Analyzer:</span>
                <button
                  onClick={toggleAnalyzerMode}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    state.analyzerMode === 'benchmark'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                  style={buttonFontStyle}
                >
                  {state.analyzerMode === 'benchmark' ? 'Benchmark' : 'Pose AI'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex rounded-2xl bg-white p-2 shadow-md">
                <button
                  onClick={() => setActiveTab('record')}
                  className={`flex-1 rounded-xl py-3 px-4 font-semibold transition-all duration-200 ${
                    activeTab === 'record'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={buttonFontStyle}
                >
                  Record
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 rounded-xl py-3 px-4 font-semibold transition-all duration-200 ${
                    activeTab === 'upload'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={buttonFontStyle}
                >
                  Upload
                </button>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-lg">
                {activeTab === 'record' ? (
                  <VideoRecorder onVideoReady={handleVideoReady} />
                ) : (
                  <VideoUploader onVideoReady={handleVideoReady} />
                )}
              </div>

              {state.currentVideo && (
                <div className="rounded-2xl bg-white p-6 shadow-lg">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">Analysis</h3>
                    {state.progress > 0 && state.progress < 100 && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${state.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{Math.round(state.progress)}%</span>
                      </div>
                    )}
                  </div>

                  <video
                    ref={videoRef}
                    src={state.currentVideo}
                    controls
                    className="mb-4 w-full rounded-xl"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={startAnalysis}
                      disabled={state.isAnalyzing}
                      className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-green-700 disabled:scale-100 disabled:bg-gray-400"
                      style={buttonFontStyle}
                    >
                      <Play className="w-5 h-5" />
                      {state.isAnalyzing ? 'Analyzing...' : 'Analyze'}
                    </button>

                    {state.speedClass && (
                      <button
                        onClick={resetAnalysis}
                        className="flex items-center gap-2 rounded-xl bg-gray-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-gray-700"
                        style={buttonFontStyle}
                      >
                        <RotateCcw className="w-5 h-5" />
                        Try Another Video
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-4 shadow-lg sm:p-8">
                <h2 className="mb-6 text-center text-xl font-bold text-gray-800 sm:mb-8 sm:text-2xl">Speed Meter</h2>
                <SpeedMeter
                  intensity={state.finalIntensity}
                  speedClass={state.speedClass}
                  isAnimating={!state.isAnalyzing && state.finalIntensity > 0}
                  displayValue={hasResults ? `${kmhValue} km/h` : undefined}
                  displayLabel={hasResults ? 'Predicted speed' : undefined}
                />

                {state.speedClass && (
                  <div className="mt-6 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm">
                      <span className="font-medium">Confidence:</span>
                      <span className="font-bold">{Math.round(state.confidence * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>

              {state.frameIntensities.length > 0 && (
                <Sparkline
                  frameIntensities={state.frameIntensities}
                  currentTime={currentVideoTime}
                />
              )}

              {detailedAnalysis && state.speedClass && (
                <AnalysisResults
                  analysis={detailedAnalysis}
                  speedClass={state.speedClass}
                />
              )}

              {state.speedClass && state.finalIntensity < 85 && (
                <div className="rounded-2xl bg-white p-6 shadow-lg">
                  <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <div className="text-sm text-gray-700">
                      Want personalized tips? Download your improvement report.
                    </div>
                    <button
                      onClick={downloadReportPdf}
                      disabled={generatingPdf}
                      className="rounded-lg bg-purple-600 px-5 py-2 font-semibold text-white hover:bg-purple-700 disabled:bg-gray-400"
                      style={buttonFontStyle}
                    >
                      {generatingPdf ? 'Preparing PDF...' : 'Download 2-page PDF'}
                    </button>
                  </div>
                </div>
              )}

              {state.speedClass && state.finalIntensity >= 85 && (
                <div className="rounded-2xl bg-white p-6 shadow-lg">
                  <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <div className="text-sm text-gray-700">
                      Create a personalized analysis video with your results!
                    </div>
                    <button
                      onClick={generateAnalysisVideo}
                      disabled={generatingVideo}
                      className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
                      style={buttonFontStyle}
                    >
                      {generatingVideo ? 'Generating Video...' : 'Generate Analysis Video'}
                    </button>
                  </div>

                  {generatedVideoUrl && (
                    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                        <div className="text-sm text-green-700">
                          🎉 Your analysis video is ready!
                        </div>
                        <a
                          href={generatedVideoUrl}
                          download="bowling-analysis-video.mp4"
                          className="rounded-lg bg-green-600 px-5 py-2 font-semibold text-white hover:bg-green-700"
                          style={buttonFontStyle}
                        >
                          Download Video
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!state.currentVideo && (
                <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-purple-800">Benchmark Video Reference</h3>
                  </div>
                  <p className="mb-4 text-sm text-purple-700">
                    This is an example of good bowling footage for analysis. Your video should have similar clarity and framing.
                  </p>
                  <div className="flex flex-col items-start gap-4 lg:flex-row">
                    <video
                      src="https://ik.imagekit.io/qm7ltbkkk/bumrah%20bowling%20action.mp4?updatedAt=1756728336742"
                      controls
                      preload="metadata"
                      className="w-full rounded-xl shadow-md lg:w-64"
                      poster="https://ik.imagekit.io/qm7ltbkkk/bumrah%20bowling%20action.mp4/ik-thumbnail.jpg"
                    />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="text-gray-700">Clear view of bowler's full action</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="text-gray-700">Good lighting and contrast</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="text-gray-700">Stable camera position</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="text-gray-700">Complete bowling motion captured</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return <AnalyzeContent />;
}
