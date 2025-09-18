'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings2, Play, RotateCcw } from 'lucide-react';
import { AnalysisProvider, useAnalysis, FrameIntensity, AnalyzerMode } from '@/context/AnalysisContext';
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
import { supabase } from '@/lib/supabase/client';
import LeaderboardModal from '@/components/LeaderboardModal';
import ReportPreview from '@/components/ReportPreview';

function AnalyzeContent() {
  const { state, dispatch } = useAnalysis();
  const { addToast, ToastContainer } = useToast();
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [detailedAnalysis, setDetailedAnalysis] = useState<any>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lastInsertId, setLastInsertId] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameSamplerRef = useRef<FrameSampler | null>(null);

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

      // Page 2: Details
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Technical Details', 20, 20);
      doc.setFontSize(12);

      let y = 32;
      const line = (label: string, value: string) => {
        doc.text(`${label}: ${value}`, 20, y);
        y += 7;
      };

      line('Overall Similarity', `${similarity.toFixed(1)}%`);
      line('Predicted Speed', `${kmh.toFixed(2)} km/h`);
      if (state.speedClass) line('Speed Class', state.speedClass);
      line('Confidence', `${Math.round(state.confidence * 100)}%`);

      if (detailedAnalysis) {
        y += 5;
        doc.setFontSize(14);
        doc.text('Phase Comparison', 20, y);
        doc.setFontSize(12);
        y += 8;
        line('Run-up', `${Math.round(detailedAnalysis.phaseComparison.runUp * 100)}%`);
        line('Delivery', `${Math.round(detailedAnalysis.phaseComparison.delivery * 100)}%`);
        line('Follow-through', `${Math.round(detailedAnalysis.phaseComparison.followThrough * 100)}%`);

        y += 5;
        doc.setFontSize(14);
        doc.text('Technical Metrics', 20, y);
        doc.setFontSize(12);
        y += 8;
        line('Arm Swing Similarity', `${Math.round(detailedAnalysis.technicalMetrics.armSwingSimilarity * 100)}%`);
        line('Body Movement Similarity', `${Math.round(detailedAnalysis.technicalMetrics.bodyMovementSimilarity * 100)}%`);
        line('Rhythm Similarity', `${Math.round(detailedAnalysis.technicalMetrics.rhythmSimilarity * 100)}%`);
        line('Release Point Accuracy', `${Math.round(detailedAnalysis.technicalMetrics.releasePointAccuracy * 100)}%`);

        if (Array.isArray(detailedAnalysis.recommendations) && detailedAnalysis.recommendations.length) {
          y += 5;
          doc.setFontSize(14);
          doc.text('Recommendations', 20, y);
          doc.setFontSize(12);
          y += 8;
          detailedAnalysis.recommendations.forEach((rec: string) => {
            const split = doc.splitTextToSize(`• ${rec}`, 170);
            doc.text(split, 20, y);
            y += (split as string[]).length * 6;
          });
        }
      }

      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      doc.save(`bowling_report_${ts}.pdf`);
    } catch (e) {
      console.warn('Failed to generate PDF', e);
      addToast({ type: 'error', title: 'PDF failed', message: 'Could not create report' });
    } finally {
      setGeneratingPdf(false);
    }
  }, [state.finalIntensity, state.speedClass, state.confidence, state.analyzerMode, detailedAnalysis, addToast]);

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

      // Save to Supabase leaderboard
      try {
        const predictedKmh = intensityToKmh(finalIntensity);
        const payload: any = {
          display_name: 'Anonymous',
          predicted_kmh: Number(predictedKmh.toFixed(2)),
          similarity_percent: Number(finalIntensity.toFixed(2)),
          intensity_percent: Number(finalIntensity.toFixed(2)),
          speed_class: speedClass,
          meta: {
            analyzer_mode: state.analyzerMode,
            app: 'bowling-analyzer',
          },
        };
        const { data, error } = await supabase.from('bowling_attempts').insert(payload).select('id').single();
        if (error) {
          console.warn('Supabase insert failed', error);
        } else {
          setLastInsertId(data?.id ?? null);
          addToast({ type: 'success', title: 'Saved to leaderboard', message: 'Your result is on the board!' });
        }
      } catch (e) {
        console.warn('Skipping leaderboard save', e);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <ToastContainer />
      {/* Hidden capture area for PDF page 2 */}
      <div id="pdf-report-capture" style={{ position: 'absolute', left: -10000, top: -10000 }}>
        <ReportPreview
          kmh={Number(intensityToKmh(state.finalIntensity).toFixed(2))}
          similarityPercent={state.finalIntensity}
          speedClass={state.speedClass}
          confidencePercent={Math.round(state.confidence * 100)}
          details={detailedAnalysis}
        />
      </div>
      <LeaderboardModal open={showLeaderboard} onOpenChange={setShowLeaderboard} highlightId={lastInsertId} />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Analyzer Mode Toggle */}
            <div className="flex items-center gap-3 bg-white rounded-xl p-2 shadow-md">
              <Settings2 className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Analyzer:</span>
              <button
                onClick={toggleAnalyzerMode}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  state.analyzerMode === 'benchmark'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-purple-100 text-purple-800'
                }`}
              >
                {state.analyzerMode === 'benchmark' ? 'Benchmark' : 'Pose AI'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Video Input/Analysis */}
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex bg-white rounded-2xl p-2 shadow-md">
              <button
                onClick={() => setActiveTab('record')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === 'record'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Record
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === 'upload'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Upload
              </button>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              {activeTab === 'record' ? (
                <VideoRecorder onVideoReady={handleVideoReady} />
              ) : (
                <VideoUploader onVideoReady={handleVideoReady} />
              )}
            </div>

            {/* Analysis Controls */}
            {state.currentVideo && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Analysis</h3>
                  {state.progress > 0 && state.progress < 100 && (
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
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
                  className="w-full rounded-xl mb-4"
                />

                <div className="flex gap-3">
                  <button
                    onClick={startAnalysis}
                    disabled={state.isAnalyzing}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 disabled:transform-none"
                  >
                    <Play className="w-5 h-5" />
                    {state.isAnalyzing ? 'Analyzing...' : 'Analyze'}
                  </button>
                  
                  {state.speedClass && (
                    <button
                      onClick={resetAnalysis}
                      className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Try Another Video
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Speed Meter */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">Speed Meter</h2>
              <SpeedMeter
                intensity={state.finalIntensity}
                speedClass={state.speedClass}
                isAnimating={state.progress === 100}
              />
              
              {state.speedClass && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-sm">
                    <span className="font-medium">Confidence:</span>
                    <span className="font-bold">{Math.round(state.confidence * 100)}%</span>
                  </div>
                </div>
              )}

              {/* Export tools removed */}
            </div>

            {/* Sparkline */}
            {state.frameIntensities.length > 0 && (
              <Sparkline
                frameIntensities={state.frameIntensities}
                currentTime={currentVideoTime}
              />
            )}

            {/* Detailed Analysis Results */}
            {detailedAnalysis && state.speedClass && (
              <AnalysisResults
                analysis={detailedAnalysis}
                speedClass={state.speedClass}
              />
            )}

            {/* Improvement PDF for similarity < 85%  */}
            {state.speedClass && state.finalIntensity < 85 && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-sm text-gray-700">
                    Want personalized tips? Download your improvement report.
                  </div>
                  <button
                    onClick={downloadReportPdf}
                    disabled={generatingPdf}
                    className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold"
                  >
                    {generatingPdf ? 'Preparing PDF...' : 'Download 2-page PDF'}
                  </button>
                </div>
              </div>
            )}

            {/* Benchmark Video Reference */}
            {!state.currentVideo && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-purple-800">Benchmark Video Reference</h3>
                </div>
                <p className="text-purple-700 mb-4 text-sm">
                  This is an example of good bowling footage for analysis. Your video should have similar clarity and framing.
                </p>
                <div className="flex flex-col lg:flex-row gap-4 items-start">
                  <video
                    src="https://ik.imagekit.io/qm7ltbkkk/bumrah%20bowling%20action.mp4?updatedAt=1756728336742"
                    controls
                    preload="metadata"
                    className="w-full lg:w-64 rounded-xl shadow-md"
                    poster="https://ik.imagekit.io/qm7ltbkkk/bumrah%20bowling%20action.mp4/ik-thumbnail.jpg"
                  />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">Clear view of bowler's full action</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">Good lighting and contrast</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">Stable camera position</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
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
  );
}

export default function AnalyzePage() {
  return (
    <AnalysisProvider>
      <AnalyzeContent />
    </AnalysisProvider>
  );
}


