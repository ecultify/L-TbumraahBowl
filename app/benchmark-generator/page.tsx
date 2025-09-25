'use client';

import React, { useState, useRef, useCallback } from 'react';
import { BenchmarkComparisonAnalyzer } from '@/lib/analyzers/benchmarkComparison';

export default function BenchmarkGeneratorPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzerRef = useRef<BenchmarkComparisonAnalyzer | null>(null);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setBenchmarkData('');
    setError('');
    setIsProcessing(true);
    setStatus('Initializing analyzer...');

    try {
      // Create analyzer instance
      analyzerRef.current = new BenchmarkComparisonAnalyzer();
      
      // Initialize detector (without loading existing benchmark)
      setStatus('Loading TensorFlow models...');
      const success = await initializeDetectorOnly(analyzerRef.current);
      
      if (!success) {
        throw new Error('Failed to initialize pose detector');
      }

      setStatus('Processing video to extract benchmark pattern...');
      
      // Create video element and process
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.src = URL.createObjectURL(file);

      video.addEventListener('loadeddata', async () => {
        try {
          setStatus('Analyzing video frames...');
          const pattern = await extractBenchmarkPattern(analyzerRef.current!, video);
          
          if (!pattern) {
            throw new Error('Failed to extract benchmark pattern from video');
          }

          // Serialize the pattern
          const serializedPattern = {
            armSwingVelocities: pattern.armSwingVelocities,
            bodyMovementVelocities: pattern.bodyMovementVelocities,
            overallIntensities: pattern.overallIntensities,
            releasePointFrame: pattern.releasePointFrame,
            actionPhases: pattern.actionPhases
          };

          const jsonString = JSON.stringify(serializedPattern, null, 2);
          setBenchmarkData(jsonString);
          setStatus('Benchmark pattern generated successfully!');

          // Clean up
          URL.revokeObjectURL(video.src);

        } catch (err) {
          setError(`Processing error: ${err instanceof Error ? err.message : String(err)}`);
          setStatus('');
        } finally {
          setIsProcessing(false);
        }
      });

      video.addEventListener('error', () => {
        setError('Failed to load video file');
        setStatus('');
        setIsProcessing(false);
        URL.revokeObjectURL(video.src);
      });

    } catch (err) {
      setError(`Initialization error: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('');
      setIsProcessing(false);
    }
  }, []);

  const downloadBenchmark = useCallback(() => {
    if (!benchmarkData) return;

    const blob = new Blob([benchmarkData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark_pattern_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [benchmarkData]);

  const copyToClipboard = useCallback(() => {
    if (!benchmarkData) return;
    navigator.clipboard.writeText(benchmarkData);
    alert('Benchmark data copied to clipboard!');
  }, [benchmarkData]);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Benchmark Pattern Generator</h1>
          <p className="text-gray-600 mb-6">Upload a bowling video to generate a benchmark pattern JSON</p>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Bowling Video
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              disabled={isProcessing}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
          </div>

          {/* Status */}
          {status && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                {isProcessing && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                )}
                <span className="text-blue-800 text-sm">{status}</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}

          {/* Generated Data */}
          {benchmarkData && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Generated Benchmark Pattern
                </label>
                <div className="space-x-2">
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Copy
                  </button>
                  <button
                    onClick={downloadBenchmark}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Download
                  </button>
                </div>
              </div>
              <textarea
                value={benchmarkData}
                readOnly
                className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-xs bg-gray-50"
                placeholder="Generated benchmark data will appear here..."
              />
            </div>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Instructions:</h3>
            <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
              <li>Upload the original Bumrah bowling video</li>
              <li>Wait for processing to complete</li>
              <li>Download the generated JSON file</li>
              <li>Replace the content in <code className="bg-yellow-100 px-1 rounded">/public/benchmarkPattern.json</code></li>
              <li>Clear browser cache and test scoring consistency</li>
            </ol>
          </div>

          {/* Technical Info */}
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Technical Details:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Processes video at 12 FPS with 320x240 resolution</li>
              <li>• Uses MoveNet Thunder for pose detection</li>
              <li>• Extracts arm swing velocities, body movement, and action phases</li>
              <li>• Normalizes movements by body scale for consistency</li>
              <li>• Generates pattern compatible with similarity comparison algorithm</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to initialize only the detector without loading existing benchmarks
async function initializeDetectorOnly(analyzer: BenchmarkComparisonAnalyzer): Promise<boolean> {
  try {
    // Access private methods through type assertion
    const analyzerAny = analyzer as any;
    
    // Initialize TensorFlow
    const tfjs = await import('@tensorflow/tfjs');
    try {
      await tfjs.setBackend('webgl');
    } catch (e) {
      console.warn('Failed to set WebGL backend, using default');
    }
    await tfjs.ready();

    // Create pose detector
    const poseDetection = await import('@tensorflow-models/pose-detection');
    const model = poseDetection.SupportedModels.MoveNet;
    analyzerAny.detector = await poseDetection.createDetector(model, {
      modelType: 'SinglePose.Thunder',
      enableSmoothing: true
    } as any);

    return analyzerAny.detector !== null;
  } catch (error) {
    console.error('Failed to initialize detector:', error);
    return false;
  }
}

// Helper function to extract benchmark pattern
async function extractBenchmarkPattern(analyzer: BenchmarkComparisonAnalyzer, video: HTMLVideoElement) {
  const analyzerAny = analyzer as any;
  
  const pattern = analyzerAny.createEmptyPattern();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 320;
  canvas.height = 240;

  const duration = Math.min(video.duration, 15);
  const frameInterval = 1 / 12;
  let previousPoses: any[] = [];

  for (let time = 0; time < duration; time += frameInterval) {
    video.currentTime = time;
    
    await new Promise(resolve => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve(void 0);
      };
      video.addEventListener('seeked', onSeeked);
    });

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      const poses = await analyzerAny.detector.estimatePoses(canvas);
      
      if (poses.length > 0) {
        pattern.keypoints.push({
          timestamp: time,
          poses: poses
        });

        if (previousPoses.length > 0) {
          const armSwingVel = analyzerAny.calculateArmSwingVelocity(previousPoses[0], poses[0], frameInterval);
          const bodyMovementVel = analyzerAny.calculateBodyMovementVelocity(previousPoses[0], poses[0], frameInterval);
          
          pattern.armSwingVelocities.push(armSwingVel);
          pattern.bodyMovementVelocities.push(bodyMovementVel);
          pattern.overallIntensities.push(armSwingVel + bodyMovementVel);
        }

        previousPoses = poses;
      }
    } catch (error) {
      console.warn('Pose detection failed for frame at', time, error);
    }
  }

  if (pattern.keypoints.length < 10) {
    throw new Error('Not enough keypoints extracted from video');
  }

  // Analyze action phases
  analyzerAny.analyzeActionPhases(pattern);
  
  // Find release point
  if (pattern.armSwingVelocities.length > 0) {
    const maxVelIndex = pattern.armSwingVelocities.indexOf(Math.max(...pattern.armSwingVelocities));
    pattern.releasePointFrame = maxVelIndex;
  }

  return pattern;
}