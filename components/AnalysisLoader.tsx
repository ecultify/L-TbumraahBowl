'use client';

import React from 'react';

// Add custom CSS for appear animation
const appearStyle = `
  @keyframes appear {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  .animate-appear {
    animation: appear 0.5s ease-out forwards;
  }
`;

interface AnalysisLoaderProps {
  isVisible: boolean;
  progress: number;
}

// LoadingDots component for static dots
function LoadingDots() {
  return (
    <span className="inline-flex">
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </span>
  );
}

export function AnalysisLoader({ isVisible, progress }: AnalysisLoaderProps) {
  if (!isVisible) return null;

  return (
    <>
      <style>{appearStyle}</style>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }}
      >
        {/* Bumrah Ball in Hand background image */}
        <img 
          src="/images/newhomepage/Bumrah%20Ball%20in%20Hand%201.png"
          alt="Bumrah Ball in Hand"
          className="absolute"
          style={{
            width: '320px',
            height: '320px',
            objectFit: 'contain',
            zIndex: 9,
            top: '28%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            console.log('Image failed to load:', target.src);
            target.style.display = 'none';
          }}
          onLoad={() => {
            console.log('Bumrah image loaded successfully');
          }}
        />
      
      {/* Main yellow container */}
      <div 
        className="flex flex-col items-center justify-center text-center relative"
        style={{
          width: '400px',
          height: '140px',
          backgroundColor: '#FFC315',
          borderRadius: '18px',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          padding: '20px',
          zIndex: 10
        }}
      >
        {/* Headline */}
        <div className="mb-4">
          <h2 
            className="text-black"
            style={{
              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
              fontWeight: '700',
              fontSize: '18px',
              lineHeight: '1.2'
            }}
          >
            Analyzing Your Pace
            <LoadingDots />
          </h2>
        </div>

        {/* Loading container with blue balls */}
        <div 
          className="relative overflow-hidden"
          style={{
            width: '360px',
            height: '60px',
            borderRadius: '12.1px',
            border: '2px solid #000',
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <BlueBallLoader />
        </div>
      </div>

      {/* Bottom text */}
      <div 
        className="absolute mt-48 text-center"
        style={{
          width: '400px'
        }}
      >
        <p 
          className="text-white"
          style={{
            fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
            fontWeight: '700',
            fontSize: '12px',
            lineHeight: '12px'
          }}
        >
          Hang tight — your <span style={{ color: '#FFC315' }}>#BumrahKiSpeedPar</span> report is on its way!
        </p>
      </div>
      </div>
    </>
  );
}

// Blue ball loader component with 10 balls
function BlueBallLoader() {
  const ballWidth = 30; // Smaller balls to fit 10
  const gap = 3;
  const containerWidth = 360; // Inner container width
  const totalBallsWidth = (10 * ballWidth) + (9 * gap); // 10 balls + 9 gaps
  const startX = (containerWidth - totalBallsWidth) / 2; // Center the balls
  
  return (
    <div className="flex items-center justify-center h-full relative">
      {Array.from({ length: 10 }, (_, index) => {
        const leftPosition = startX + (index * (ballWidth + gap));
        // Slower timing to simulate TensorFlow initialization:
        // First 9 balls appear progressively during TensorFlow loading (slower)
        // 10th ball appears when TensorFlow completes (longer delay)
        let delay;
        if (index < 9) {
          // First 9 balls appear every 800ms (slower for TensorFlow loading)
          delay = index * 800;
        } else {
          // 10th ball appears after a longer delay (TensorFlow completion)
          delay = 8 * 800 + 1500; // 8th ball delay + extra 1.5s for TensorFlow completion
        }
        
        return (
          <div 
            key={index}
            className="absolute animate-appear"
            style={{
              left: `${leftPosition}px`,
              animationDelay: `${delay}ms`,
              animationDuration: '0.6s', // Slightly longer appear animation
              animationFillMode: 'forwards',
              opacity: 0 // Start invisible
            }}
          >
            <img 
              src="/images/blueball.svg" 
              alt="Loading" 
              width={ballWidth} 
              height={ballWidth} 
              className="animate-spin"
              style={{ animationDuration: '2s' }}
            />
          </div>
        );
      })}
    </div>
  );
}

