'use client';

import React from 'react';

interface AnalysisLoaderProps {
  isVisible: boolean;
  progress: number;
}

export function AnalysisLoader({ isVisible, progress }: AnalysisLoaderProps) {
  if (!isVisible) return null;

  const progressPercentage = Math.round(progress);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <div 
        className="flex flex-col items-center justify-center text-center p-8"
        style={{
          width: '355px',
          height: '186px',
          backgroundColor: '#FFC315',
          borderRadius: '20px',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
        }}
      >
        {/* Title Text */}
        <div className="mb-6">
          <h2 
            className="text-black mb-2"
            style={{
              fontFamily: 'Frutiger, Inter, sans-serif',
              fontWeight: '700',
              fontSize: '18px',
              lineHeight: '1.2'
            }}
          >
            Generating your
          </h2>
          <div className="flex items-center justify-center">
            <span 
              className="text-black"
              style={{
                fontFamily: 'Frutiger, Inter, sans-serif',
                fontWeight: '700',
                fontSize: '18px',
                lineHeight: '1.2'
              }}
            >
              Quick analysis
            </span>
            <span 
              className="text-black ml-1"
              style={{
                fontFamily: 'Frutiger, Inter, sans-serif',
                fontWeight: '700',
                fontSize: '18px',
                lineHeight: '1.2'
              }}
            >
              <LoadingDots />
            </span>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full max-w-xs">
          <div 
            className="relative overflow-hidden"
            style={{
              width: '297px',
              height: '11px',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '6px'
            }}
          >
            {/* Progress Fill */}
            <div 
              className="h-full transition-all duration-300 ease-out"
              style={{
                width: `${progressPercentage}%`,
                backgroundColor: 'black',
                borderRadius: '6px'
              }}
            />

            {/* Moving Percentage */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-xs font-bold"
              style={{
                left: `calc(${Math.min(Math.max(progressPercentage, 4), 96)}%)`,
                fontFamily: 'Frutiger, Inter, sans-serif',
                color: '#FFC315'
              }}
            >
              {progressPercentage}%
            </div>
          </div>
        </div>

        <p
          className="mt-4 text-sm text-black/80"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            lineHeight: 1.4,
            maxWidth: '260px'
          }}
        >
          Please keep this page open while we analyze your video. This can take up to a minute.
        </p>
      </div>
    </div>
  );
}

// Component for animated loading dots
function LoadingDots() {
  const [dots, setDots] = React.useState('');

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return <span>{dots}</span>;
}
