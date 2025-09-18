import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {imgGroup32, imgVector, imgVector1, imgVector2, imgVector3} from './svg-yg5wt';

const ABS_IMG_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
};

interface SpeedMeterProps {
  intensity?: number; // 0-100
  speedClass?: 'Slow' | 'Fast' | 'Zooooom';
  animated?: boolean;
}

export const SpeedMeter: React.FC<SpeedMeterProps> = ({ 
  intensity = 86, 
  speedClass = 'Zooooom', 
  animated = true 
}) => {
  const frame = useCurrentFrame();
  
  // Calculate proper angles based on actual label positions
  // Analyzing the label positions relative to speedometer center:
  // Slow: left: 5, top: 151.15 -> bottom-left -> approximately -135°
  // Fast: left: 280, top: -20 -> top-center -> approximately 0°  
  // Zooom: left: 512, top: 128 -> bottom-right -> approximately +135°
  
  // Calculate angles based on actual label positions
  // Slow: left: 5, top: 151.15 (bottom-left) ≈ 225° (down-left diagonal)
  // Fast: left: 280, top: -20 (top-center) ≈ 270° (straight up)  
  // Zoom: left: 512, top: 128 (bottom-right) ≈ 315° (down-right diagonal)
  const slowAngle = 225;     // 225° = Slow (points down-left to match label position)
  const fastAngle = 270;     // 270° = Fast (points straight up)
  const zoomAngle = 315;     // 315° = Zoom (points down-right to match label position)
  
  // Map based on speedClass - needle should stop exactly at the label
  let targetRotation: number;
  
  switch (speedClass) {
    case 'Slow':
      // Point exactly at Slow text
      targetRotation = slowAngle;
      break;
    case 'Fast':
      // Point exactly at Fast text  
      targetRotation = fastAngle;
      break;
    case 'Zooooom':
      // Point exactly at Zooom text
      targetRotation = zoomAngle;
      break;
    default:
      // Fallback: linear mapping across full range
      targetRotation = slowAngle + (intensity / 100) * (zoomAngle - slowAngle);
  }
  
  // Always start from Slow position
  const slowPosition = slowAngle;
  const needleRotation = animated 
    ? interpolate(frame, [0, 60], [slowPosition, targetRotation], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: (t) => 1 - Math.pow(1 - t, 3), // Ease-out cubic for smooth deceleration
      })
    : targetRotation;

  return (
    <div style={{position: 'relative', width: '100%', height: '100%'}}>
      {/* Original static gauge design with vertical stretch */}
      <div style={{position: 'absolute', inset: 0, transform: 'scaleY(1.15)', transformOrigin: '50% 60%'}}>
        {/* Group33: overlay image */}
        <div style={{position: 'absolute', top: '10.23%', right: '5.8%', bottom: '28.36%', left: '9.57%'}}>
          <img src={imgGroup32} alt="Group32" style={ABS_IMG_STYLE} />
        </div>

        {/* Vector overlays */}
        <div style={{position: 'absolute', top: '37.46%', right: '27.1%', bottom: 0, left: '30.79%'}}>
          <div style={{position: 'absolute', top: '-11.34%', right: '-13.09%', bottom: '-14.83%', left: '-13.09%'}}>
            <img src={imgVector} alt="Vector" style={ABS_IMG_STYLE} />
          </div>
        </div>
        <div style={{position: 'absolute', top: '55.91%', right: '39.54%', bottom: '18.47%', left: '43.22%'}}>
          <img src={imgVector1} alt="Vector1" style={ABS_IMG_STYLE} />
        </div>
        
        {/* Dynamic Needle - replaces static needle with rotating one */}
        <div style={{
          position: 'absolute', 
          top: '37.63%', 
          right: '24.38%', 
          bottom: '27.5%', 
          left: '49.28%',
          transformOrigin: 'center center', // Set origin to center for rotation
        }}>
          <img 
            src={imgVector2} 
            alt="Dynamic Needle" 
            style={{
              ...ABS_IMG_STYLE,
              transform: `rotate(${needleRotation}deg)`,
              transformOrigin: '8% 95%', // Rotate from very bottom of thick end
            }} 
          />
        </div>
        
        <div style={{position: 'absolute', top: '62.28%', right: '43.83%', bottom: '24.85%', left: '47.5%'}}>
          <img src={imgVector3} alt="Vector3" style={ABS_IMG_STYLE} />
        </div>
      </div>

      {/* Labels */}
      <div style={{position: 'absolute', left: 5, top: 151.15, width: 39.112, height: 56.058, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{transform: 'rotate(284.183deg)'}}>
          <div style={{color: '#225884', fontSize: 23.481, lineHeight: 1}}>Slow</div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 280, top: -20, color: '#225884', fontSize: 23.481, lineHeight: 1}}>Fast</div>
      <div style={{position: 'absolute', left: 512, top: 128, width: 56.043, height: 77.804, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{transform: 'rotate(64.731deg)'}}>
          <div style={{color: '#225884', fontSize: 23.481, lineHeight: 1}}>Zooom</div>
        </div>
      </div>
    </div>
  );
};

export default SpeedMeter;
