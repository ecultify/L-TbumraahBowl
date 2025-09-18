"use client";

import React from 'react';
import {interpolate, staticFile, useCurrentFrame, useVideoConfig, Sequence} from 'remotion';
import {SpeedMeter} from './SpeedMeter';
import {SparklineWrapper} from './SparklineWrapper';

interface FrameIntensity {
  timestamp: number;
  intensity: number;
}

interface AnalysisData {
  intensity: number;
  speedClass: 'Slow' | 'Fast' | 'Zooooom';
  kmh: number;
  similarity: number;
  frameIntensities?: FrameIntensity[];
  phases: {
    runUp: number;
    delivery: number;
    followThrough: number;
  };
  technicalMetrics: {
    armSwing: number;
    bodyMovement: number;
    rhythm: number;
    releasePoint: number;
  };
  recommendations: string[];
  playerName?: string;
}

interface FirstFrameProps {
  analysisData?: AnalysisData;
}

export const FirstFrame: React.FC<FirstFrameProps> = ({ analysisData }) => {
  // Use dynamic data or fallback to static values
  const data: AnalysisData = analysisData || {
    intensity: 86,
    speedClass: 'Zooooom',
    kmh: 86,
    similarity: 86,
    frameIntensities: (() => {
      // Generate realistic bowling motion data based on actual bowling phases
      const duration = 3.5; // Total bowling action duration
      const frameCount = 35; // Number of data points  
      const finalIntensity = 86;
      const data: FrameIntensity[] = [];
      
      for (let i = 0; i < frameCount; i++) {
        const timestamp = (i / (frameCount - 1)) * duration;
        let intensity = 0;
        
        // Simulate realistic bowling phases based on your analyzer
        if (timestamp < 1.0) {
          // Run-up phase: Low to medium intensity, gradual increase
          intensity = 10 + (timestamp / 1.0) * 25; // 10-35
        } else if (timestamp < 1.8) {
          // Delivery phase: Rapid increase to peak
          const deliveryProgress = (timestamp - 1.0) / 0.8;
          const peakIntensity = finalIntensity * 1.1; // Peak during delivery
          intensity = 35 + deliveryProgress * (peakIntensity - 35);
        } else if (timestamp < 2.5) {
          // Release point: Peak intensity
          intensity = finalIntensity;
        } else {
          // Follow-through: Gradual decrease
          const followProgress = (timestamp - 2.5) / 1.0;
          intensity = finalIntensity * (1 - followProgress * 0.6); // Decay to 40% of peak
        }
        
        // Add some realistic variation
        const noise = (Math.random() - 0.5) * 6;
        intensity = Math.max(5, Math.min(100, intensity + noise));
        
        data.push({ timestamp: Number(timestamp.toFixed(2)), intensity: Number(intensity.toFixed(1)) });
      }
      
      return data;
    })(),
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
    playerName: 'Pawan'
  };
  const frame = useCurrentFrame();
  const {fps, height, width} = useVideoConfig();

  // Horizontal-only entrance (no vertical rise)
  const rise = 0;

  // Slide in from the right and fade in over ~1s
  const slide = interpolate(frame, [0, fps], [140, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fade = interpolate(frame, [0, fps * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Intro animations for static elements (they stick after)
  const introDur = fps * 0.7;
  const topLeftLogoSlideY = interpolate(frame, [0, introDur], [-30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const topLeftLogoFade = interpolate(frame, [0, introDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const barSlideY = interpolate(frame, [0, introDur], [90, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const barFade = interpolate(frame, [0, introDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const barLogoSlideX = interpolate(frame, [0, fps * 0.9], [-40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const barBikeSlideX = interpolate(frame, [0, fps * 0.9], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const barItemsFade = interpolate(frame, [0, fps * 0.6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const BAR_WIDTH = width; // Full-bleed in portrait
  const BAR_HEIGHT = 75;

  // Second frame timing
  const SECOND_START = fps * 5; // start ~5s in to keep scene 1 longer
  const intoSecond = Math.max(0, frame - SECOND_START);
  const secondAppear = interpolate(intoSecond, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Fade the phone out to the right just before the 2nd scene
  const OUT_START = SECOND_START - fps; // 1s window before scene 2
  const slideOut = interpolate(frame, [OUT_START, SECOND_START], [0, 220], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(frame, [OUT_START, SECOND_START], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Rounded box specs
  const BOX_W = 957;
  const BOX_H = 757;
  const boxLeft = (width - BOX_W) / 2;
  const boxTop = (height - BOX_H) / 2;
  const boxRight = boxLeft + BOX_W;

  // Top view image emerges near the top-right of the box but stays in-frame
  const TOP_VIEW_W = 460;
  const TOP_VIEW_SRC = staticFile('images/bumraahtopview.png');
  // Base left so the image sits just inside the box initially, towards top-right
  const topViewBaseLeft = Math.min(
    Math.max(boxRight - TOP_VIEW_W + 20, 20),
    width - TOP_VIEW_W - 20
  );

  // Horizontal reveal from behind the box to outside
  const topViewSlideX = interpolate(intoSecond, [0, fps], [-60, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const topViewSlideY = 0;
  const topViewFade = interpolate(intoSecond, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Third frame timing
  const THIRD_START = fps * 8; // start ~8s in
  const intoThird = Math.max(0, frame - THIRD_START);
  const thirdAppear = interpolate(intoThird, [0, Math.round(fps * 0.6)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const secondFadeOut = interpolate(
    frame,
    [THIRD_START - Math.round(fps * 0.6), THIRD_START],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  // Fourth frame timing
  const FOURTH_START = fps * 11; // start ~11s in
  const intoFourth = Math.max(0, frame - FOURTH_START);
  const fourthAppear = interpolate(intoFourth, [0, Math.round(fps * 0.6)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const thirdFadeOut2 = interpolate(
    frame,
    [FOURTH_START - Math.round(fps * 0.6), FOURTH_START],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  // Fifth frame timing
  const FIFTH_START = fps * 14; // start ~14s in
  const intoFifth = Math.max(0, frame - FIFTH_START);
  const fifthAppear = interpolate(intoFifth, [0, Math.round(fps * 0.6)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fourthFadeOut2 = interpolate(
    frame,
    [FIFTH_START - Math.round(fps * 0.6), FIFTH_START],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  // Sixth frame timing
  const SIXTH_START = fps * 17; // start ~17s in
  const intoSixth = Math.max(0, frame - SIXTH_START);
  const sixthAppear = interpolate(intoSixth, [0, Math.round(fps * 0.6)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fifthFadeOut3 = interpolate(
    frame,
    [SIXTH_START - Math.round(fps * 0.6), SIXTH_START],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        backgroundColor: '#000',
      }}
    >
      {/* Background image */}
      <img
        src={staticFile('images/videobg.png')}
        alt="background"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* Linear color overlay */}
      <img
        src={staticFile('images/linearcoloroverlay.png')}
        alt="overlay"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
        }}
      />

      {/* Top-left Zoom logo (bigger) */}
      <img
        src={staticFile('images/zoomlogo.png')}
        alt="Zoom logo"
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          width: 360,
          height: 'auto',
          opacity: topLeftLogoFade,
          transform: `translateY(${topLeftLogoSlideY}px)`
        }}
      />

      {/* Phone image bottom-right, fades out to the right before scene 2 */}
      <img
        src={staticFile('images/bumraahphonepic.png')}
        alt="Phone"
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          transform: `translateX(${slide + slideOut}px)`,
          width: Math.min(940, width * 0.85),
          height: 'auto',
          opacity: fade * fadeOut,
          zIndex: 1, // Behind the bar
        }}
      />

      {/* Text elements positioned and sliding in from the left */}
      <div
        style={{
          position: 'absolute',
          left: 80, // Push a little bit more to the right
          bottom: height * 0.55, // Move up significantly
          transform: `translateX(${-slide - slideOut}px)`, // Slide in from left (opposite of phone)
          opacity: fade * fadeOut,
          zIndex: 2,
          textAlign: 'left',
        }}
      >
        {/* Player name and "Bowling Analysis with" */}
        <div
          style={{
            fontFamily: 'Poppins, Arial, Helvetica, sans-serif',
            fontSize: 72,
            fontWeight: 400,
            color: 'white',
            textShadow: '3px 3px 6px #FFCB03',
            lineHeight: 0.9,
            marginBottom: 10, // Reduced from 20 to 10
            width: 750, // Increased from 649 to 750 for longer names
            height: 200,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {data.playerName}'s Bowling
          <br />
          Analysis with
        </div>

        {/* Just Zoom logo */}
        <img
          src={staticFile('images/justzoom.png')}
          alt="Just Zoom"
          style={{
            width: 422,
            height: 93,
            marginBottom: 12, // Reduced from 24 to 12
          }}
        />

        {/* "Your Results Are In..." */}
        <div
          style={{
            fontFamily: 'Poppins, Arial, Helvetica, sans-serif',
            fontSize: 55,
            fontWeight: 400,
            color: 'white',
            lineHeight: 1.2,
            width: 600, // Increased from 534 to 600 for better spacing
            height: 83,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          Your Results Are In…
        </div>
      </div>

      {/* Bottom bar cluster (full-bleed portrait, touching bottom) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          width: BAR_WIDTH,
          height: BAR_HEIGHT,
          zIndex: 5,
          opacity: barFade,
          transform: `translateY(${barSlideY}px)`
        }}
      >
        {/* Yellow bar in the front */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: '#FFCB03',
            borderRadius: 6,
            zIndex: 2,
          }}
        />

        {/* Zoom logo at left edge on top of bar */}
        <img
          src={staticFile('images/zoomlogo.png')}
          alt="Zoom on bar left"
          style={{
            position: 'absolute',
            left: 20,
            top: 'calc(50% - 50px)',
            transform: `translateY(-50%) translateX(${barLogoSlideX}px)`,
            width: 220,
            height: 'auto',
            zIndex: 3,
            opacity: barItemsFade,
          }}
        />

        {/* Bike at right edge on top of bar */}
        <img
          src={staticFile('images/bike.png')}
          alt="Bike on bar right"
          style={{
            position: 'absolute',
            right: 20,
            top: 'calc(50% - 95px)',
            transform: `translateY(-50%) translateX(${barBikeSlideX}px)`,
            width: 260,
            height: 'auto',
            zIndex: 3,
            opacity: barItemsFade,
          }}
        />
      </div>

      {/* Second frame additions */}
      <Sequence from={SECOND_START}>
        {/* Box image (replaces coded blur box) */}
        <img
          src={staticFile('images/thebox.png')}
          alt="Box"
          style={{
            position: 'absolute',
            left: boxLeft,
            top: boxTop,
            width: BOX_W,
            height: BOX_H,
            borderRadius: 30,
            objectFit: 'cover',
            opacity: secondAppear,
            zIndex: 6,
          }}
        />

        {/* Content inside the box */}
        <div
          style={{
            position: 'absolute',
            left: boxLeft,
            top: boxTop,
            width: BOX_W,
            height: BOX_H,
            borderRadius: 30,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: 56,
            gap: 36,
            opacity: secondAppear * secondFadeOut,
            zIndex: 7,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'Frutiger, Poppins, Arial, Helvetica, sans-serif',
              fontWeight: 700,
              fontSize: 50,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#225884',
              textAlign: 'center',
            }}
          >
            SPEED METER ANALYSIS
          </div>

          <div
            style={{
              width: 490,
              height: 103,
              borderRadius: 20,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 24px',
              boxShadow: 'none',
              marginTop: 16,
            }}
          >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
              fontFamily: 'Poppins, Arial, Helvetica, sans-serif',
              color: '#0A0A0A',
            }}
          >
            <span style={{fontWeight: 500, fontSize: 27}}>Percentage:</span>
            <span style={{fontWeight: 600, fontSize: 60}}>{Math.round(data.similarity)}%</span>
          </div>
          </div>

          {/* Speed meter graphic below the percentage box */}
          <div style={{width: 560, height: 300, position: 'relative', marginTop: 64}}>
            <SpeedMeter 
              intensity={data.intensity}
              speedClass={data.speedClass}
              animated={true}
            />
          </div>
        </div>

        {/* Pitch to Road image to the left of Bumraah top-view */}
        <img
          src={staticFile('images/pitchtoroad.png')}
          alt="Pitch to Road"
          style={{
            position: 'absolute',
            left: Math.max(20, topViewBaseLeft - 480 - 70), // Push 70px further left
            top: boxTop - 150, // Move up by 150px
            transform: `translateY(-100%)`,
            width: 520, // Increased from 460 to 520
            height: 'auto',
            opacity: topViewFade, // Same fade timing as top view
            zIndex: 5,
          }}
        />

        {/* Bumraah top-view above the box at top-right (bottom touches box top, emerges from behind) */}
        <img
          src={TOP_VIEW_SRC}
          alt="Bumraah top view"
          style={{
            position: 'absolute',
            left: topViewBaseLeft,
            top: boxTop,
            // Align bottom to box top, then slide horizontally
            transform: `translateY(-100%) translateX(${topViewSlideX}px)`,
            width: TOP_VIEW_W,
            height: 'auto',
            opacity: topViewFade,
            zIndex: 5, // Behind the box so it emerges from behind
          }}
        />
      </Sequence>

      {/* Fifth frame: Technical Breakdown with animated bars */}
      <Sequence from={FIFTH_START}>
        {/* Pitch to Road image for frame 5 */}
        <img
          src={staticFile('images/pitchtoroad.png')}
          alt="Pitch to Road"
          style={{
            position: 'absolute',
            left: Math.max(20, topViewBaseLeft - 480 - 70), // Push 70px further left
            top: boxTop - 150, // Move up by 150px
            transform: `translateY(-100%)`,
            width: 520, // Increased from 460 to 520
            height: 'auto',
            opacity: fifthAppear * fifthFadeOut3,
            zIndex: 5,
          }}
        />

        {/* Bumraah top-view for frame 5 */}
        <img
          src={TOP_VIEW_SRC}
          alt="Bumraah top view"
          style={{
            position: 'absolute',
            left: topViewBaseLeft,
            top: boxTop,
            transform: `translateY(-100%)`,
            width: TOP_VIEW_W,
            height: 'auto',
            opacity: fifthAppear * fifthFadeOut3,
            zIndex: 5,
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: boxLeft,
            top: boxTop,
            width: BOX_W,
            height: BOX_H,
            borderRadius: 30,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 24px',
            gap: 20,
            opacity: fifthAppear * fifthFadeOut3,
            zIndex: 7,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'Frutiger, Poppins, Arial, Helvetica, sans-serif',
              fontWeight: 700,
              fontSize: 52,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#225884',
              textAlign: 'center',
            }}
          >
            TECHNICAL BREAKDOWN
          </div>

          {[
            {label: 'Arm Swing', target: data.technicalMetrics.armSwing, scheme: 'blue'},
            {label: 'Body Movement', target: data.technicalMetrics.bodyMovement, scheme: 'yellow'},
            {label: 'Rhythm', target: data.technicalMetrics.rhythm, scheme: 'blue'},
            {label: 'Release Point', target: data.technicalMetrics.releasePoint, scheme: 'yellow'},
          ].map((row, i) => {
            const anim = Math.min(1, intoFifth / (fps * 1.2));
            const fillPct = (row.target / 100) * anim;
            const number = Math.round(row.target * anim);
            const trackColor = 'rgba(255,255,255,0.45)';
            const fillGradient =
              row.scheme === 'blue'
                ? 'linear-gradient(90deg, #0F62B0 0%, #1178D9 100%)'
                : 'linear-gradient(90deg, #F9B233 0%, #FFD180 100%)';
            return (
              <div
                key={row.label}
                style={{
                  width: BOX_W - 80,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  paddingLeft: 24,
                  paddingRight: 24,
                }}
              >
                <div style={{color: '#225884', fontFamily: 'Poppins, Arial, Helvetica, sans-serif', fontWeight: 500, fontSize: 28, textAlign: 'left'}}>
                  {row.label}
                </div>
                <div style={{width: '100%', display: 'flex', alignItems: 'center', gap: 24}}>
                  <div style={{flex: 1, height: 26, borderRadius: 14, background: trackColor, overflow: 'hidden'}}>
                    <div style={{width: `${Math.max(0, Math.min(100, fillPct * 100))}%`, height: '100%', background: fillGradient, borderRadius: 12}} />
                  </div>
                  <div style={{width: 110, textAlign: 'right', color: '#225884', fontFamily: 'Poppins, Arial, Helvetica, sans-serif', fontWeight: 700, fontSize: 36}}>
                    {number}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Sequence>

      {/* Sixth frame: Recommendations */}
      <Sequence from={SIXTH_START}>
        {/* Pitch to Road image for frame 6 */}
        <img
          src={staticFile('images/pitchtoroad.png')}
          alt="Pitch to Road"
          style={{
            position: 'absolute',
            left: Math.max(20, topViewBaseLeft - 480 - 70), // Push 70px further left
            top: boxTop - 150, // Move up by 150px
            transform: `translateY(-100%)`,
            width: 520, // Increased from 460 to 520
            height: 'auto',
            opacity: sixthAppear,
            zIndex: 5,
          }}
        />

        {/* Bumraah top-view for frame 6 */}
        <img
          src={TOP_VIEW_SRC}
          alt="Bumraah top view"
          style={{
            position: 'absolute',
            left: topViewBaseLeft,
            top: boxTop,
            transform: `translateY(-100%)`,
            width: TOP_VIEW_W,
            height: 'auto',
            opacity: sixthAppear,
            zIndex: 5,
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: boxLeft,
            top: boxTop,
            width: BOX_W,
            height: BOX_H,
            borderRadius: 30,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            paddingTop: 32,
            gap: 16,
            opacity: sixthAppear,
            zIndex: 7,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'Frutiger, Poppins, Arial, Helvetica, sans-serif',
              fontWeight: 700,
              fontSize: 52,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#225884',
              textAlign: 'center',
            }}
          >
            RECOMMENDATIONS
          </div>

          <div
            style={{
              width: 620,
              minHeight: 220,
              borderRadius: 24,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 24px',
              textAlign: 'center',
              marginTop: -100, // Move even closer to recommendations title
            }}
          >
            <span
              style={{
                fontFamily: 'Poppins, Arial, Helvetica, sans-serif',
                color: '#225884',
                fontWeight: 600,
                fontSize: 38,
                lineHeight: 1.4,
              }}
            >
              {data.recommendations[0] || 'Focus on arm swing technique and timing'}
            </span>
          </div>
        </div>
      </Sequence>
      {/* Third frame additions: Change box content only */}
      <Sequence from={THIRD_START}>
        {/* Pitch to Road image for frame 3 */}
        <img
          src={staticFile('images/pitchtoroad.png')}
          alt="Pitch to Road"
          style={{
            position: 'absolute',
            left: Math.max(20, topViewBaseLeft - 480 - 70), // Push 70px further left
            top: boxTop - 150, // Move up by 150px
            transform: `translateY(-100%)`,
            width: 520, // Increased from 460 to 520
            height: 'auto',
            opacity: thirdAppear * thirdFadeOut2,
            zIndex: 5,
          }}
        />

        {/* Bumraah top-view for frame 3 */}
        <img
          src={TOP_VIEW_SRC}
          alt="Bumraah top view"
          style={{
            position: 'absolute',
            left: topViewBaseLeft,
            top: boxTop,
            transform: `translateY(-100%)`,
            width: TOP_VIEW_W,
            height: 'auto',
            opacity: thirdAppear * thirdFadeOut2,
            zIndex: 5,
          }}
        />

        {/* Title inside the box */}
        <div
          style={{
            position: 'absolute',
            left: boxLeft,
            top: boxTop,
            width: BOX_W,
            height: BOX_H,
            borderRadius: 30,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 24px',
            gap: 48,
            opacity: thirdAppear * thirdFadeOut2,
            zIndex: 7,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'Frutiger, Poppins, Arial, Helvetica, sans-serif',
              fontWeight: 700,
              fontSize: 48,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#225884',
              textAlign: 'center',
            }}
          >
            YOUR TOP SPEED
          </div>


          {/* Speed readout box (km/h) */}
          <div
            style={{
              width: 640,
              height: 200,
              borderRadius: 20,
              background:
                'linear-gradient(90deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 24px',
              marginTop: 12,
            }}
          >
            <span
              style={{
                fontFamily: 'Poppins, Arial, Helvetica, sans-serif',
                color: '#225884',
                fontWeight: 600,
                fontSize: 60,
              }}
            >
              {Math.round(data.kmh)} kmph
            </span>
          </div>
        </div>
      </Sequence>

      {/* Fourth frame additions: Detailed analysis + phases */}
      <Sequence from={FOURTH_START}>
        {/* Pitch to Road image for frame 4 */}
        <img
          src={staticFile('images/pitchtoroad.png')}
          alt="Pitch to Road"
          style={{
            position: 'absolute',
            left: Math.max(20, topViewBaseLeft - 480 - 70), // Push 70px further left
            top: boxTop - 150, // Move up by 150px
            transform: `translateY(-100%)`,
            width: 520, // Increased from 460 to 520
            height: 'auto',
            opacity: fourthAppear * fourthFadeOut2,
            zIndex: 5,
          }}
        />

        {/* Bumraah top-view for frame 4 */}
        <img
          src={TOP_VIEW_SRC}
          alt="Bumraah top view"
          style={{
            position: 'absolute',
            left: topViewBaseLeft,
            top: boxTop,
            transform: `translateY(-100%)`,
            width: TOP_VIEW_W,
            height: 'auto',
            opacity: fourthAppear * fourthFadeOut2,
            zIndex: 5,
          }}
        />

          <div
            style={{
              position: 'absolute',
              left: boxLeft,
              top: boxTop,
              width: BOX_W,
              height: BOX_H,
              borderRadius: 30,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingTop: 80,
              paddingLeft: 24,
              paddingRight: 24,
              paddingBottom: 24,
              gap: 24,
            opacity: fourthAppear * fourthFadeOut2,
              zIndex: 7,
              pointerEvents: 'none',
            }}
          >
          {/* Title */}
          <div
            style={{
              fontFamily: 'Frutiger, Poppins, Arial, Helvetica, sans-serif',
              fontWeight: 700,
              fontSize: 44,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#225884',
              textAlign: 'center',
            }}
          >
            DETAILED ANALYSIS
          </div>

          {/* Overall similarity pill */}
          <div
            style={{
              marginTop: 8,
              width: 540,
              height: 120,
              borderRadius: 20,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 24px',
            }}
          >
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
              <span style={{fontFamily: 'Poppins, Arial, Helvetica, sans-serif', color: '#225884', fontWeight: 700, fontSize: 64}}>{Math.round(data.similarity)}%</span>
              <span style={{fontFamily: 'Poppins, Arial, Helvetica, sans-serif', color: '#225884', fontWeight: 500, fontSize: 20}}>Overall Similarity to Benchmark</span>
            </div>
          </div>

          {/* Phases heading */}
          <div
            style={{
              marginTop: 32,
              fontFamily: 'Frutiger, Poppins, Arial, Helvetica, sans-serif',
              fontWeight: 700,
              fontSize: 44,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#225884',
            }}
          >
            BOWLING PHASES
          </div>

          {/* Phase cards row */}
          <div
            style={{
              width: 860,
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 12,
              gap: 20,
            }}
          >
            {[
              {p: `${Math.round(data.phases.runUp)}%`, l: 'Run - up'}, 
              {p: `${Math.round(data.phases.delivery)}%`, l: 'Delivery'}, 
              {p: `${Math.round(data.phases.followThrough)}%`, l: 'Follow - through'}
            ].map((ph, idx) => (
              <div
                key={idx}
                style={{
                  flex: '0 0 272px',
                  height: 120,
                  borderRadius: 20,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px 24px',
                }}
              >
                <div style={{fontFamily: 'Poppins, Arial, Helvetica, sans-serif', color: '#225884', fontWeight: 700, fontSize: 64}}>{ph.p}</div>
                <div style={{fontFamily: 'Poppins, Arial, Helvetica, sans-serif', color: '#225884', fontWeight: 500, fontSize: 20}}>{ph.l}</div>
              </div>
            ))}
          </div>
        </div>
      </Sequence>
    </div>
  );
};

export default FirstFrame;
