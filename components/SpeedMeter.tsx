'use client';

import React, { useEffect, useState } from 'react';
import { SpeedClass } from '@/context/AnalysisContext';
import { intensityToKmh } from '@/lib/utils/normalize';

interface SpeedMeterProps {
  value?: number;
  intensity?: number;
  classification?: SpeedClass | string;
  speedClass?: SpeedClass | null;
  isAnimating?: boolean;
}

export function SpeedMeter({ 
  value, 
  intensity, 
  classification, 
  speedClass, 
  isAnimating = false 
}: SpeedMeterProps) {
  // Use value or intensity (backward compatibility)
  const finalIntensity = value !== undefined ? value : (intensity || 0);
  const finalSpeedClass = classification as SpeedClass || speedClass;
  const [animatedIntensity, setAnimatedIntensity] = useState(0);
  const [displayClass, setDisplayClass] = useState<SpeedClass | null>(null);

  useEffect(() => {
    if (isAnimating) {
      // Animate needle to final position
      const startTime = Date.now();
      const startIntensity = animatedIntensity;
      const targetIntensity = finalIntensity;
      const duration = 2000; // 2 seconds

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentIntensity = startIntensity + (targetIntensity - startIntensity) * easeOutCubic;
        
        setAnimatedIntensity(currentIntensity);
        
        // Update speed class during animation
        if (currentIntensity <= 35) {
          setDisplayClass('Slow');
        } else if (currentIntensity <= 70) {
          setDisplayClass('Fast');
        } else {
          setDisplayClass('Zooooom');
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayClass(finalSpeedClass);
        }
      };

      animate();
    } else {
      setAnimatedIntensity(finalIntensity);
      setDisplayClass(finalSpeedClass);
    }
  }, [finalIntensity, finalSpeedClass, isAnimating]);

  // Calculate needle rotation (-90 to +90 degrees)
  const needleRotation = (animatedIntensity / 100) * 180 - 90;
  
  // Get colors based on current intensity
  const getColors = () => {
    if (animatedIntensity <= 35) {
      return {
        primary: '#032743', // Dark blue from app theme
        secondary: '#FFC315', // Yellow from app theme
        text: '#032743'
      };
    } else if (animatedIntensity <= 70) {
      return {
        primary: '#FFC315', // Yellow from app theme
        secondary: '#FFD42D', // Lighter yellow
        text: '#032743'
      };
    } else {
      return {
        primary: '#FFB800', // Darker yellow/orange
        secondary: '#FFC315', // Yellow from app theme
        text: '#032743'
      };
    }
  };

  const colors = getColors();
  const kmh = intensityToKmh(animatedIntensity);

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Speed Meter Container */}
      <div className="relative w-full h-48 sm:h-60 mx-auto mb-4">
        {/* Speed Meter SVG */}
        <svg
          viewBox="0 0 300 200"
          className="w-full h-full drop-shadow-lg"
        >
          {/* Background Arc */}
          <path
            d="M 50 150 A 100 100 0 0 1 250 150"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="20"
            strokeLinecap="round"
          />
          
          {/* Progress Arc */}
          <path
            d="M 50 150 A 100 100 0 0 1 250 150"
            fill="none"
            stroke={colors.secondary}
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={`${(animatedIntensity / 100) * 314} 314`}
            className="transition-all duration-300"
          />
          
          {/* Speed labels - Adjusted for mobile */}
          <text x="80" y="175" textAnchor="middle" className="text-xs sm:text-sm font-medium fill-gray-600">
            Slow
          </text>
          <text x="150" y="45" textAnchor="middle" className="text-xs sm:text-sm font-medium fill-gray-600">
            Fast
          </text>
          <text x="220" y="175" textAnchor="middle" className="text-xs sm:text-sm font-medium fill-gray-600">
            Zooooom
          </text>
          
          {/* Center dot */}
          <circle cx="150" cy="150" r="6" fill={colors.primary} />
          
          {/* Needle */}
          <line
            x1="150"
            y1="150"
            x2="150"
            y2="65"
            stroke={colors.primary}
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${needleRotation} 150 150)`}
            className="transition-transform duration-500 ease-out"
          />
        </svg>

        {/* Intensity and Speed Value - Repositioned for mobile */}
        <div className="absolute top-2 right-2 bg-white rounded-lg px-2 py-1 shadow-md">
          <span className="text-xs sm:text-sm font-medium text-gray-600">
            {Math.round(animatedIntensity)}% · {kmh.toFixed(2)} km/h
          </span>
        </div>
      </div>

      {/* Speed Class Display - Moved outside absolute positioning */}
      {displayClass && (
        <div className="flex justify-center mt-6 mb-4">
          <div 
            className="px-4 py-2 sm:px-6 sm:py-3 rounded-2xl font-bold text-lg sm:text-2xl transition-all duration-500 shadow-lg"
            style={{ 
              backgroundColor: colors.secondary, 
              color: colors.text,
              transform: 'scale(1)',
              opacity: 1
            }}
          >
            {displayClass}
          </div>
        </div>
      )}
    </div>
  );
}
