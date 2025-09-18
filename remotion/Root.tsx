import React from 'react';
import {Composition} from 'remotion';
import {FirstFrame} from './FirstFrame';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="first-frame"
        component={FirstFrame}
        durationInFrames={600}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          analysisData: {
            intensity: 86,
            speedClass: 'Zooooom' as const,
            kmh: 86,
            similarity: 86,
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
            playerName: 'Saharsh'
          }
        }}
      />
    </>
  );
};
