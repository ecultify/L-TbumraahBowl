'use client';

import React from 'react';
import Lottie from 'lottie-react';
import bikeProgressAnimation from '../Bike Progress.json';

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

        {/* Progress bar container */}
        <div 
          className="relative"
          style={{
            width: '300px',
            height: '90px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Progress bar background */}
          <div 
            className="relative"
            style={{
              width: '300px',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '2px solid #000',
              borderRadius: '20px',
              overflow: 'visible'
            }}
          >
            {/* Progress fill */}
            <div 
              className="h-full transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: '#007bff',
                borderRadius: '18px'
              }}
            />
          </div>
          
          {/* Lottie animation positioned on top of progress bar - outside the progress bar div */}
          {progress > 0 && progress < 100 && (
            <div 
              className="absolute"
              style={{
                left: `${Math.max(0, Math.min(progress, 100))}%`,
                bottom: 'calc(50% - 38px)',
                transform: 'translate(-50%, 0) scaleX(-1)',
                width: '100px',
                height: '100px',
                zIndex: 10,
                transition: 'left 0.3s ease-out'
              }}
            >
              <Lottie 
                animationData={bikeProgressAnimation}
                loop={true}
                autoplay={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          )}
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


