'use client';

import React, { useState, useEffect } from 'react';
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
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (!isVisible) {
      setDisplayProgress(0);
      return;
    }

    // Slowly progress to 80% over time (simulating initial processing)
    if (progress < 100) {
      const interval = setInterval(() => {
        setDisplayProgress((prev) => {
          // If actual progress is 0, slowly increment to 80%
          if (progress === 0) {
            if (prev < 80) {
              return prev + 0.5; // Slow increment (0.5% every 100ms = ~16 seconds to reach 80%)
            }
            return prev;
          }
          
          // If actual progress is between 0-95%, sync with it but cap at 80%
          if (progress > 0 && progress < 100) {
            const targetProgress = Math.min(progress, 80);
            if (prev < targetProgress) {
              return Math.min(prev + 1, targetProgress);
            }
            return prev;
          }
          
          return prev;
        });
      }, 100);

      return () => clearInterval(interval);
    } else if (progress === 100) {
      // When analysis completes, quickly jump to 100%
      const quickInterval = setInterval(() => {
        setDisplayProgress((prev) => {
          if (prev < 100) {
            return Math.min(prev + 5, 100); // Fast increment (5% every 100ms = 2 seconds max to reach 100%)
          }
          return 100;
        });
      }, 100);

      return () => clearInterval(quickInterval);
    }
  }, [isVisible, progress]);

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
          className="absolute w-[320px] h-[320px] md:w-[480px] md:h-[480px]"
          style={{
            objectFit: 'contain',
            zIndex: 9,
            top: '28%',
            left: '50%',
            transform: 'translate(-50%, calc(-50% + 40px))'
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
        className="flex flex-col items-center justify-center text-center relative w-[400px] h-[140px] md:w-[600px] md:h-[210px] mt-[40px] md:mt-[140px]"
        style={{
          backgroundColor: '#FFC315',
          borderRadius: '18px',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          padding: '20px',
          zIndex: 10
        }}
      >
        {/* Headline */}
        <div className="mb-4 md:mb-6">
          <h2 
            className="text-black text-[18px] md:text-[27px]"
            style={{
              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
              fontWeight: '700',
              lineHeight: '1.2'
            }}
          >
            Analyzing Your Pace
            <LoadingDots />
          </h2>
        </div>

        {/* Progress bar container */}
        <div 
          className="relative w-[300px] h-[90px] md:w-[450px] md:h-[135px]"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Progress bar background */}
          <div 
            className="relative w-[300px] h-[8px] md:w-[450px] md:h-[12px]"
            style={{
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
                width: `${displayProgress}%`,
                backgroundColor: '#007bff',
                borderRadius: '18px'
              }}
            />
          </div>
          
          {/* Lottie animation positioned on top of progress bar - outside the progress bar div */}
          {displayProgress > 0 && displayProgress < 100 && (
            <div 
              className="absolute w-[100px] h-[100px] md:w-[150px] md:h-[150px]"
              style={{
                left: `${Math.max(0, Math.min(displayProgress, 100))}%`,
                bottom: isDesktop ? 'calc(50% - 58px)' : 'calc(50% - 38px)',
                transform: 'translate(-50%, 0) scaleX(-1)',
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
        className="absolute text-center w-[400px] md:w-[600px] px-4"
        style={{
          top: '50%',
          marginTop: '120px',
          zIndex: 15
        }}
      >
        <p 
          className="text-white text-[16px] md:text-[18px]"
          style={{
            fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
            fontWeight: '700',
            lineHeight: '1.4',
            marginTop: isDesktop ? '60px' : '0'
          }}
        >
          Hang tight — your <span style={{ color: '#FFC315' }}>#BumrahKiSpeedPar</span> report is on its way!
        </p>
      </div>
      </div>
    </>
  );
}


