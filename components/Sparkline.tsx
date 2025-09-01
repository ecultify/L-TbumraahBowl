'use client';

import React, { useRef, useEffect } from 'react';
import { FrameIntensity } from '@/context/AnalysisContext';

interface SparklineProps {
  frameIntensities: FrameIntensity[];
  currentTime?: number;
  width?: number;
  height?: number;
}

export function Sparkline({ frameIntensities, currentTime = 0, width = 400, height = 60 }: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frameIntensities.length === 0) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size for high DPI
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find min/max for scaling
    const intensities = frameIntensities.map(f => f.intensity);
    const minIntensity = Math.min(...intensities);
    const maxIntensity = Math.max(...intensities);
    const range = maxIntensity - minIntensity || 1;

    // Draw background
    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw intensity line
    if (frameIntensities.length > 1) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.beginPath();

      frameIntensities.forEach((frame, index) => {
        const x = (index / (frameIntensities.length - 1)) * width;
        const normalizedIntensity = (frame.intensity - minIntensity) / range;
        const y = height - (normalizedIntensity * (height - 10)) - 5;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Fill area under curve
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.beginPath();
      frameIntensities.forEach((frame, index) => {
        const x = (index / (frameIntensities.length - 1)) * width;
        const normalizedIntensity = (frame.intensity - minIntensity) / range;
        const y = height - (normalizedIntensity * (height - 10)) - 5;

        if (index === 0) {
          ctx.moveTo(x, height);
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
    }

    // Draw current time indicator
    if (currentTime > 0 && frameIntensities.length > 0) {
      const maxTime = Math.max(...frameIntensities.map(f => f.timestamp));
      const timeRatio = currentTime / maxTime;
      const x = timeRatio * width;

      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Time indicator dot
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(x, 5, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [frameIntensities, currentTime, width, height]);

  return (
    <div className="bg-white rounded-lg p-4 shadow-md">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Motion Intensity Over Time</h3>
      <canvas
        ref={canvasRef}
        className="w-full border border-gray-200 rounded"
        style={{ maxWidth: width }}
      />
    </div>
  );
}