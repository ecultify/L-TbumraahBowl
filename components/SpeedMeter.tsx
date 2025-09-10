'use client';

import React, { useEffect, useState } from 'react';
import { SpeedClass } from '@/context/AnalysisContext';
import { intensityToKmh } from '@/lib/utils/normalize';

interface SpeedMeterProps {
  intensity: number;
  speedClass: SpeedClass | null;
  isAnimating?: boolean;
}

export function SpeedMeter({ intensity, speedClass, isAnimating = false }: SpeedMeterProps) {
  const [animatedIntensity, setAnimatedIntensity] = useState(0);
  const [displayClass, setDisplayClass] = useState<SpeedClass | null>(null);

  useEffect(() => {
    if (isAnimating) {
      // Animate needle to final position
      const startTime = Date.now();
      const startIntensity = animatedIntensity;
      const targetIntensity = intensity;
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
          setDisplayClass(speedClass);
        }
      };

      animate();
    } else {
      setAnimatedIntensity(intensity);
      setDisplayClass(speedClass);
    }
  }, [intensity, speedClass, isAnimating]);

  // Calculate needle rotation (-90 to +90 degrees)
  const needleRotation = (animatedIntensity / 100) * 180 - 90;
  
  // Get colors based on current intensity
  const getColors = () => {
    if (animatedIntensity <= 35) {
      return {
        primary: '#3B82F6', // blue
        secondary: '#DBEAFE',
        text: '#1E40AF'
      };
    } else if (animatedIntensity <= 70) {
      return {
        primary: '#F97316', // orange
        secondary: '#FED7AA',
        text: '#EA580C'
      };
    } else {
      return {
        primary: '#EF4444', // red
        secondary: '#FECACA',
        text: '#DC2626'
      };
    }
  };

  const colors = getColors();
  const kmh = intensityToKmh(animatedIntensity);

  return (
    <div className="relative w-80 h-60 mx-auto mb-8">
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
        
        
        
        {/* Speed labels */}
        <text x="80" y="175" textAnchor="middle" className="text-sm font-medium fill-gray-600">
          Slow
        </text>
        <text x="150" y="50" textAnchor="middle" className="text-sm font-medium fill-gray-600">
          Fast
        </text>
        <text x="220" y="175" textAnchor="middle" className="text-sm font-medium fill-gray-600">
          Zooooom
        </text>
        
        {/* Center dot */}
        <circle cx="150" cy="150" r="8" fill={colors.primary} />
        
        {/* Needle */}
        <line
          x1="150"
          y1="150"
          x2="150"
          y2="60"
          stroke={colors.primary}
          strokeWidth="4"
          strokeLinecap="round"
          transform={`rotate(${needleRotation} 150 150)`}
          className="transition-transform duration-500 ease-out"
        />
      </svg>

      {/* Speed Class Display */}
      {displayClass && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
          <div 
            className="px-6 py-3 rounded-2xl font-bold text-2xl transition-all duration-500"
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

      {/* Intensity and Speed Value */}
      <div className="absolute top-4 right-4 bg-white rounded-lg px-3 py-1 shadow-md">
        <span className="text-sm font-medium text-gray-600">
          {Math.round(animatedIntensity)}% · {kmh.toFixed(2)} km/h
        </span>
      </div>
    </div>
  );
}
