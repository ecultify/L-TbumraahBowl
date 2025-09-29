'use client';

import { AnalyzingLoader } from '@/components/AnalyzingLoader';
import { AnalysisProvider, SpeedClass, AnalyzerMode } from '@/context/AnalysisContext';
import { useState, useEffect } from 'react';

export default function TestAnalyzingLoaderPage() {
  const [progress, setProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [finalIntensity, setFinalIntensity] = useState(0);
  const [speedClass, setSpeedClass] = useState<SpeedClass | null>(null);

  // Simulate analysis progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setIsAnalyzing(false);
          setFinalIntensity(85); // Simulate 85% similarity
          setSpeedClass('Fast'); // Simulate speed classification
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Mock analysis state
  const mockAnalysisState = {
    isAnalyzing,
    progress,
    finalIntensity,
    speedClass,
    frameIntensities: [],
    analyzerMode: 'pose' as AnalyzerMode,
    videoUrl: '',
    fileName: '',
    videoSource: 'upload' as const,
    mimeType: 'video/mp4',
    fileSizeLabel: '2.5 MB',
    isPortraitVideo: false,
    videoDuration: '00:05'
  };

  return (
    <AnalysisProvider>
      <AnalyzingLoader stateOverride={mockAnalysisState} />
    </AnalysisProvider>
  );
}
