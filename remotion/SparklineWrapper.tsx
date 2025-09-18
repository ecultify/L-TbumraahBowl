import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

interface FrameIntensity {
  timestamp: number;
  intensity: number;
}

interface SparklineWrapperProps {
  frameIntensities: FrameIntensity[];
  width?: number;
  height?: number;
  animated?: boolean;
}

export const SparklineWrapper: React.FC<SparklineWrapperProps> = ({
  frameIntensities,
  width = 820,
  height = 180,
  animated = true,
}) => {
  const frame = useCurrentFrame();
  
  // If no data, show a placeholder
  if (!frameIntensities || frameIntensities.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 16,
          fontFamily: 'system-ui, sans-serif'
        }}
      >
        No motion data
      </div>
    );
  }

  // Calculate chart dimensions
  const chartPadding = 40;
  const chartWidth = width - chartPadding * 2;
  const chartHeight = height - 80; // More space for title

  // Animation progress for drawing the line
  const animationProgress = animated 
    ? interpolate(frame, [0, 60], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  // Find min/max for scaling (matching your original Sparkline logic)
  const intensities = frameIntensities.map(f => f.intensity);
  const minIntensity = Math.min(...intensities);
  const maxIntensity = Math.max(...intensities);
  const range = maxIntensity - minIntensity || 1;

  // Generate SVG path for the intensity line (matching Canvas drawing logic)
  const generatePath = () => {
    if (frameIntensities.length < 2) return '';
    
    const visiblePoints = Math.floor(frameIntensities.length * animationProgress);
    const points = frameIntensities.slice(0, Math.max(1, visiblePoints));
    
    let path = '';
    
    points.forEach((frameData, index) => {
      const x = (index / (frameIntensities.length - 1)) * chartWidth;
      const normalizedIntensity = (frameData.intensity - minIntensity) / range;
      const y = chartHeight - (normalizedIntensity * (chartHeight - 10)) - 5; // Match your original logic
      
      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    });
    
    return path;
  };

  // Generate area fill path (matching your original Sparkline)
  const generateAreaPath = () => {
    if (frameIntensities.length < 2) return '';
    
    const visiblePoints = Math.floor(frameIntensities.length * animationProgress);
    const points = frameIntensities.slice(0, Math.max(1, visiblePoints));
    
    let path = '';
    
    if (points.length > 0) {
      // Start from bottom
      path += `M 0 ${chartHeight}`;
      
      points.forEach((frameData, index) => {
        const x = (index / (frameIntensities.length - 1)) * chartWidth;
        const normalizedIntensity = (frameData.intensity - minIntensity) / range;
        const y = chartHeight - (normalizedIntensity * (chartHeight - 10)) - 5;
        
        if (index === 0) {
          path += ` L ${x} ${y}`;
        } else {
          path += ` L ${x} ${y}`;
        }
      });
      
      // Close the area
      const lastX = ((points.length - 1) / (frameIntensities.length - 1)) * chartWidth;
      path += ` L ${lastX} ${chartHeight} Z`;
    }
    
    return path;
  };

  return (
    <div
      style={{
        width,
        height,
        background: 'transparent', // Transparent background
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Chart area - just the graph, no decorations */}
      <svg 
        width={chartWidth} 
        height={chartHeight} 
        style={{ 
          width: '100%', 
          height: '100%',
        }}
      >
        {/* Transparent background */}
        <rect width={chartWidth} height={chartHeight} fill="transparent" />
        
        {/* Area fill under curve - matching original rgba(59, 130, 246, 0.1) */}
        <path
          d={generateAreaPath()}
          fill="rgba(59, 130, 246, 0.15)"
          stroke="none"
        />
        
        {/* Main intensity line - matching original #3B82F6 with strokeWidth 2 */}
        <path
          d={generatePath()}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
