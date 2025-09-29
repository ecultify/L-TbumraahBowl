'use client';

import { AnalysisLoader } from '@/components/AnalysisLoader';
import { useState, useEffect } from 'react';

export default function TestAnalysisLoaderPage() {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  // Simulate analysis progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Test Analysis Loader</h1>
        <p className="mb-4">This simulates the overlay that appears on video preview page</p>
        <button 
          onClick={() => setIsVisible(!isVisible)}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Toggle Loader
        </button>
      </div>
      
      <AnalysisLoader isVisible={isVisible} progress={progress} />
    </div>
  );
}