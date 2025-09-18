import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

interface FrameIntensity {
  timestamp: number;
  intensity: number;
}

interface MotionIntensityChartProps {
  frameIntensities: FrameIntensity[];
  width?: number;
  height?: number;
  animated?: boolean;
}

export const MotionIntensityChart: React.FC<MotionIntensityChartProps> = ({
  frameIntensities,
  width = 820,
  height = 180,
  animated = true,
}) => {
  const frame = useCurrentFrame();
  
  // If no data, show a placeholder that matches your app's style
  if (!frameIntensities || frameIntensities.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          background: 'white',
          borderRadius: 8,
          padding: 16,
          border: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <h3 style={{
          fontSize: 14,
          fontWeight: 500,
          color: '#374151',
          margin: 0,
          fontFamily: 'system-ui, sans-serif'
        }}>Motion Intensity Over Time</h3>
        <div style={{
          width: '100%',
          height: height - 60,
          background: '#F3F4F6',
          borderRadius: 4,
          border: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6B7280',
          fontSize: 14,
        }}>
          No motion data available
        </div>
      </div>
    );
  }

  // Find min/max for scaling
  const intensities = frameIntensities.map(f => f.intensity);
  const minIntensity = Math.min(...intensities);
  const maxIntensity = Math.max(...intensities);
  const range = maxIntensity - minIntensity || 1;

  // Animation progress
  const animationProgress = animated 
    ? interpolate(frame, [0, 60], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  // Calculate chart dimensions with padding
  const chartPadding = 40;
  const chartWidth = width - chartPadding * 2;
  const chartHeight = height - chartPadding * 2;

  // Generate SVG path for the intensity line
  const generatePath = () => {
    if (frameIntensities.length < 2) return '';
    
    const visiblePoints = Math.floor(frameIntensities.length * animationProgress);
    const points = frameIntensities.slice(0, Math.max(1, visiblePoints));
    
    let path = '';
    
    points.forEach((frame, index) => {
      const x = (index / (frameIntensities.length - 1)) * chartWidth;
      const normalizedIntensity = (frame.intensity - minIntensity) / range;
      const y = chartHeight - (normalizedIntensity * chartHeight);
      
      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    });
    
    return path;
  };

  // Generate area fill path
  const generateAreaPath = () => {
    if (frameIntensities.length < 2) return '';
    
    const visiblePoints = Math.floor(frameIntensities.length * animationProgress);
    const points = frameIntensities.slice(0, Math.max(1, visiblePoints));
    
    let path = '';
    
    // Start from bottom left
    if (points.length > 0) {
      path += `M 0 ${chartHeight}`;
      
      points.forEach((frame, index) => {
        const x = (index / (frameIntensities.length - 1)) * chartWidth;
        const normalizedIntensity = (frame.intensity - minIntensity) / range;
        const y = chartHeight - (normalizedIntensity * chartHeight);
        
        if (index === 0) {
          path += ` L ${x} ${y}`;
        } else {
          path += ` L ${x} ${y}`;
        }
      });
      
      // Close the area at bottom right
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
        background: 'white',
        borderRadius: 8,
        padding: 16,
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <h3 style={{
        fontSize: 14,
        fontWeight: 500,
        color: '#374151',
        margin: 0,
        fontFamily: 'system-ui, sans-serif'
      }}>Motion Intensity Over Time</h3>
      
      <div style={{
        width: '100%',
        height: height - 60,
        position: 'relative',
      }}>
        <svg width={chartWidth} height={chartHeight} style={{ 
          width: '100%', 
          height: '100%',
          border: '1px solid #E5E7EB',
          borderRadius: 4,
          background: '#F3F4F6',
        }}>
          {/* Grid lines - matching original Sparkline */}
          <defs>
            <pattern id="sparklineGrid" width="20" height={chartHeight / 4} patternUnits="userSpaceOnUse">
              <path d={`M 20 0 L 0 0 0 ${chartHeight / 4}`} fill="none" stroke="#E5E7EB" strokeWidth="1"/>
            </pattern>
          </defs>
          
          <rect width={chartWidth} height={chartHeight} fill="url(#sparklineGrid)" />
          
          {/* Horizontal grid lines */}
          {[1, 2, 3].map((i) => (
            <line
              key={i}
              x1={0}
              y1={(chartHeight / 4) * i}
              x2={chartWidth}
              y2={(chartHeight / 4) * i}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
          ))}
          
          {/* Area fill under curve - exactly like original */}
          <path
            d={generateAreaPath()}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="none"
          />
          
          {/* Main intensity line - matching original style */}
          <path
            d={generatePath()}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};
