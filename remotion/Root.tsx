import React from 'react';
import {Composition} from 'remotion';
import {FirstFrame} from './FirstFrame';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="first-frame"
        component={FirstFrame}
        durationInFrames={276}
        fps={12}
        width={1080}
        height={1440}
        defaultProps={{
          analysisData: {
            intensity: 86,
            speedClass: 'Zooooom' as const,
            kmh: 86,
            similarity: 86,
            frameIntensities: [],
            phases: {
              runUp: 50,
              delivery: 60,
              followThrough: 71
            },
            technicalMetrics: {
              armSwing: 49,
              bodyMovement: 69,
              rhythm: 49,
              releasePoint: 69
            },
            recommendations: ['Focus on arm swing technique and timing'],
            playerName: 'Player'
          }
        }}
      />
    </>
  );
};

