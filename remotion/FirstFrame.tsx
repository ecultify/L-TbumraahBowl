"use client";

import React from 'react';
import {interpolate, staticFile, useCurrentFrame, useVideoConfig, Sequence, Video, delayRender, continueRender} from 'remotion';
import {loadFont} from '@remotion/google-fonts/RobotoCondensed';
import {getVideoMetadata} from '@remotion/media-utils';
import {SpeedMeter} from './SpeedMeter';
import {getVideoThumbnail} from '../lib/utils/videoThumbnailExtractor';

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
  // Relative to public/ when used with staticFile, e.g. 'uploads/user-video.mp4'
  userVideoSrc?: string;
  // Absolute remote URL (e.g., Supabase public URL). Takes precedence over userVideoSrc.
  userVideoUrl?: string;
  // Data URL for the captured frame to show in frames 3/4/5
  thumbnailDataUrl?: string;
}

const {fontFamily: condensedFontFamily} = loadFont();

type VideoMetadata = Awaited<ReturnType<typeof getVideoMetadata>>;

const useVideoMetadataCompat = (src: string | null) => {
  const handleRef = React.useRef<number | null>(null);
  const [metadata, setMetadata] = React.useState<VideoMetadata | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    if (!src) {
      setMetadata(null);
      return;
    }

    const handle = delayRender(`metadata-${src}`);
    handleRef.current = handle;

    getVideoMetadata(src)
      .then((meta) => {
        if (!cancelled) {
          setMetadata(meta);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMetadata(null);
        }
      })
      .then(() => {
        if (handleRef.current !== null) {
          continueRender(handleRef.current);
          handleRef.current = null;
        }
      });

    return () => {
      cancelled = true;
      if (handleRef.current !== null) {
        continueRender(handleRef.current);
        handleRef.current = null;
      }
    };
  }, [src]);

  return metadata;
};

export const FirstFrame: React.FC<FirstFrameProps> = ({ analysisData, userVideoSrc: userVideoSrcProp, userVideoUrl, thumbnailDataUrl }) => {
  // Load video thumbnail from localStorage
  const [videoThumbnail, setVideoThumbnail] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (thumbnailDataUrl) {
      setVideoThumbnail(thumbnailDataUrl);
      return;
    }
    const thumbnail = getVideoThumbnail();
    setVideoThumbnail(thumbnail);
  }, [thumbnailDataUrl]);

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

  // Slide in from the right and fade in over ~1s
  const slide = interpolate(frame, [0, fps], [140, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fade = interpolate(frame, [0, fps * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Phone hero scale-down effect (starts oversize and eases to 1)
  const phoneScale = interpolate(frame, [0, fps * 0.6], [1.3, 1], {
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

  const portraitVideoGap = 0; // No gap between videos
  const maxPortraitWidth = (width * 0.6) / 2; // Reduce total width to 60% of screen
  const maxPortraitHeight = height * 0.85; // Increased height from 0.70 to 0.85
  const portraitVideoWidth = Math.min(maxPortraitWidth, maxPortraitHeight * (9 / 16));
  const portraitVideoHeight = portraitVideoWidth * (16 / 9);
  const videoRowWidth = portraitVideoWidth * 2 + portraitVideoGap;
  const videoRowLeft = (width - videoRowWidth) / 2;
  const videoRowTop = (height - portraitVideoHeight) / 2;

  const CARD_STACK_WIDTH = Math.min(800, width - 120);
  const cardStackLeft = (width - CARD_STACK_WIDTH) / 2;
  const cardStackTop = height * 0.05;
  const CARD_GAP = 20;

  const cardImageBorderRadius = 0; // Removed rounded corners

  const userVideoSrc = userVideoUrl && (userVideoUrl.startsWith('http://') || userVideoUrl.startsWith('https://'))
    ? userVideoUrl
    : (userVideoSrcProp ? staticFile(userVideoSrcProp) : staticFile('VID-20250923-WA0000.mp4'));
  const benchmarkVideoSrc = staticFile('benchmark-bowling-action.mp4');
  const cardTopSrc = staticFile('card-2.png');
  const cardBaseSrc = staticFile('cards.png');
  const sponsoredVideoSrc = staticFile('lnt-finance-6sec-clean-9x16.mp4');

  const userVideoMetadata = useVideoMetadataCompat(userVideoSrc);
  const clipDurationSeconds = 2;
  const userClip = React.useMemo(() => {
    if (!userVideoMetadata || !userVideoMetadata.durationInSeconds || 
        isNaN(userVideoMetadata.durationInSeconds) || 
        userVideoMetadata.durationInSeconds <= 0) {
      return {startFrom: 0, endAt: undefined};
    }
    // Use default fps if not available
    const fps = 30; // Default fps value
    const totalFrames = Math.max(0, Math.round(userVideoMetadata.durationInSeconds * fps));
    if (totalFrames === 0 || isNaN(totalFrames)) {
      return {startFrom: 0, endAt: undefined};
    }
    const desiredFrames = Math.max(1, Math.round(clipDurationSeconds * fps));
    const clipFrames = Math.min(totalFrames, desiredFrames);
    const startFrom = Math.max(0, Math.floor((totalFrames - clipFrames) / 2));
    
    // Ensure values are valid numbers
    if (isNaN(startFrom) || !isFinite(startFrom) || startFrom < 0) {
      return {startFrom: 0, endAt: undefined};
    }
    const endAt = startFrom + clipFrames;
    if (isNaN(endAt) || !isFinite(endAt) || endAt < 0) {
      return {startFrom: 0, endAt: undefined};
    }
    
    return {startFrom, endAt};
  }, [userVideoMetadata]);

  const playerClipOwner = data.playerName ?? 'Player';
  const comparisonVideos = [
    {
      key: 'user',
      src: userVideoSrc,
      title: `${playerClipOwner}'s Clip`,
      caption: 'Middle 2s highlight',
      startFrom: (userClip.startFrom != null && !isNaN(userClip.startFrom) && isFinite(userClip.startFrom) && userClip.startFrom >= 0) ? userClip.startFrom : 0,
      endAt: (userClip.endAt != null && !isNaN(userClip.endAt) && isFinite(userClip.endAt) && userClip.endAt >= 0) ? userClip.endAt : undefined,
    },
    {
      key: 'benchmark',
      src: benchmarkVideoSrc,
      title: 'Benchmark Clip',
      caption: 'Bumrah bowling action',
      startFrom: 0,
      endAt: undefined,
    },
  ];

  const phases = [
    {label: 'Run-up', value: Math.round(data.phases.runUp)},
    {label: 'Delivery', value: Math.round(data.phases.delivery)},
    {label: 'Follow-through', value: Math.round(data.phases.followThrough)},
  ];

  const technicalRows = [
    {label: 'Arm Swing', value: data.technicalMetrics.armSwing, scheme: 'blue'},
    {label: 'Body Movement', value: data.technicalMetrics.bodyMovement, scheme: 'yellow'},
    {label: 'Rhythm', value: data.technicalMetrics.rhythm, scheme: 'blue'},
    {label: 'Release Point', value: data.technicalMetrics.releasePoint, scheme: 'yellow'},
  ];

  const recommendationsText = data.recommendations?.[0] ?? 'Focus on arm swing technique and timing';

  const similarityValue = Math.round(data.similarity);
  const topSpeedValue = Math.round(data.kmh);

  const shineCycleDuration = Math.max(1, Math.round(fps * 1.8));

  // Third frame timing
  const THIRD_START = fps * 8; // start ~8s in
  const intoThird = Math.max(0, frame - THIRD_START);
  const thirdAppear = interpolate(intoThird, [0, Math.round(fps * 0.6)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const thirdShineTranslate = interpolate(
    (intoThird % shineCycleDuration),
    [0, shineCycleDuration],
    [-200, 200],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  const thirdMetricProgress = Math.min(1, intoThird / (fps * 1.2));
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
  const fourthMetricProgress = Math.min(1, intoFourth / (fps * 1.1));
  const animatedTopSpeed = Math.round(topSpeedValue * fourthMetricProgress);
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
  const topCardScaleInFifth = interpolate(intoFifth, [0, Math.round(fps * 0.6)], [1, 1.12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const recommendationsLift = Math.min(1, intoFifth / (fps * 0.8));
  const fourthFadeOut2 = interpolate(
    frame,
    [FIFTH_START - Math.round(fps * 0.6), FIFTH_START],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  // Final frames timing
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
      {/* Background video */}
      <Video
        src={staticFile('BG.mp4')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#000',
        }}
        muted
        loop
        delayRenderTimeoutInMilliseconds={120000}
      />

      {/* Top-left Zoom logo (bigger) */}
      <img
        src={staticFile('images/newhomepage/Bowling Campaign Logo.png')}
        alt="Bowling Campaign Logo"
        style={{
          position: 'absolute',
          top: 70,
          left: 80,
          width: 240,
          height: 'auto',
          opacity: topLeftLogoFade,
          transform: `translateY(${topLeftLogoSlideY}px)`
        }}
      />

      {/* Phone image bottom-right, fades out to the right before scene 2 */}
      <img
        src={staticFile('images/bumraahnewpic.png')}
        alt="Phone"
        style={{
          position: 'absolute',
          right: 0,
          bottom: 30,
          transform: `scale(${phoneScale * 0.85})`,
          transformOrigin: '100% 100%',
          width: Math.min(650, width * 0.6),
          height: 'auto',
          opacity: fade * fadeOut,
          zIndex: 1, // Behind the bar
        }}
      />

      {/* Text elements positioned and sliding in from the left */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          bottom: height * 0.45 + 40, // Adjust for new height
          transform: `translateX(${-slide - slideOut}px)`,
          opacity: fade * fadeOut,
          zIndex: 2,
          textAlign: 'left',
        }}
      >
        {/* Player name and "Bowling Analysis with" */}
        <div
          style={{
            fontFamily: condensedFontFamily,
            fontSize: 75,
            fontWeight: 400,
            fontStyle: 'italic',
            color: 'white',
            textShadow: '3px 3px 6px #FFCB03',
            lineHeight: 0.92,
            marginBottom: 4,
            width: 600,
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
            width: 400,
            height: 88,
            marginBottom: 4,
          }}
        />
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
          opacity: barFade * Math.max(0, Math.min(1, fifthFadeOut3)),
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
          src={staticFile('images/newhomepage/Bowling Campaign Logo.png')}
          alt="Bowling Campaign Logo"
          style={{
            position: 'absolute',
            left: 20,
            top: 'calc(50% - 65px)',
            transform: `translateY(-50%) translateX(${barLogoSlideX}px)`,
            width: 180,
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
            top: 'calc(50% - 75px)',
            transform: `translateY(-50%) translateX(${barBikeSlideX}px)`,
            width: 200,
            height: 'auto',
            zIndex: 3,
            opacity: barItemsFade,
          }}
        />
      </div>

      {/* Second frame: Dual video comparison */}
      <Sequence from={SECOND_START}>
        <div
          style={{
            position: 'absolute',
            left: videoRowLeft,
            top: videoRowTop,
            width: videoRowWidth,
            height: portraitVideoHeight,
            display: 'flex',
            gap: portraitVideoGap,
            justifyContent: 'space-between',
            alignItems: 'center',
            opacity: secondAppear * secondFadeOut,
            zIndex: 6,
          }}
        >
          {comparisonVideos.map((video) => (
            <div
              key={video.key}
              style={{
                position: 'relative',
                width: portraitVideoWidth,
                height: portraitVideoHeight,
                borderRadius: cardImageBorderRadius,
                overflow: 'hidden',
                background: 'linear-gradient(180deg, rgba(14,26,42,0.9) 0%, rgba(14,26,42,0.4) 100%)',
                boxShadow: '0 35px 90px rgba(0,0,0,0.55)',
              }}
            >
              <Video
                src={video.src}
                muted
                playsInline
                loop
                startFrom={video.startFrom}
                endAt={video.endAt}
                delayRenderTimeoutInMilliseconds={120000}
                delayRenderRetries={2}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: '16px 20px',
                  background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 100%)',
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  fontFamily: condensedFontFamily,
                }}
              >
                <span style={{fontWeight: 700, fontSize: 26, letterSpacing: 0.5}}>{video.title}</span>
                <span style={{fontWeight: 400, fontSize: 16, opacity: 0.75}}>{video.caption}</span>
              </div>
            </div>
          ))}
        </div>
      </Sequence>

      {/* Third frame: Detailed analysis & technical breakdown */}
      <Sequence from={THIRD_START}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: width,
            height: height,
            display: 'flex',
            flexDirection: 'column',
            gap: 40,
            opacity: thirdAppear * thirdFadeOut2,
            pointerEvents: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 60px',
          }}
        >
          {/* User video thumbnail box at the top - slide in from right */}
          <div
            style={{
              width: '234px',
              height: '234px',
              backgroundColor: videoThumbnail ? '#000' : 'transparent',
              border: videoThumbnail ? 'none' : '2px dashed rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              borderRadius: '8px',
              transform: `translateX(${interpolate(intoThird, [0, Math.round(fps * 0.5)], [100, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`,
              opacity: interpolate(intoThird, [0, Math.round(fps * 0.5)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
            }}
          >
            {videoThumbnail && (
              <img
                src={videoThumbnail}
                alt="User video thumbnail"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
          </div>

          {/* First Card - Detailed Analysis - slide in from right */}
          <div style={{position: 'relative', width: '60%', maxWidth: '650px', transform: `translateX(${interpolate(intoThird, [Math.round(fps * 0.2), Math.round(fps * 0.7)], [100, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`, opacity: interpolate(intoThird, [Math.round(fps * 0.2), Math.round(fps * 0.7)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
            <img
              src={cardBaseSrc}
              alt="First card"
              style={{width: '100%', height: 'auto', display: 'block'}}
            />
            {/* Shine effect */}
            <div style={{position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'}}>
              <div style={{position: 'absolute', top: '-50%', bottom: '-50%', width: '40%', background: 'linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)', transform: `translateX(${interpolate((frame - THIRD_START) % Math.round(fps * 3), [0, Math.round(fps * 3)], [-100, 300], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}%) rotate(18deg)`, opacity: 0.6}} />
            </div>
            <div style={{position: 'absolute', inset: 0, padding: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15}}>
              <div style={{fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 700, fontStyle: 'italic', fontSize: 28, color: '#fff', textAlign: 'center', textTransform: 'uppercase'}}>Detailed Analysis</div>
              <div style={{background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(10px)', borderRadius: 10, padding: '15px 25px', textAlign: 'center'}}>
                <div style={{fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 700, fontStyle: 'italic', fontSize: 38, color: '#fff'}}>{similarityValue}%</div>
                <div style={{fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: 12, color: '#fff', marginTop: 3}}>Overall similarity to benchmark</div>
              </div>
              <div style={{fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 600, fontSize: 16, color: '#fff', textAlign: 'center', marginTop: 5}}>Bowling Phases</div>
              <div style={{display: 'flex', gap: 8, width: '100%', justifyContent: 'space-around'}}>
                {phases.map((phase) => (
                  <div key={phase.label} style={{background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(10px)', borderRadius: 10, padding: '12px 15px', textAlign: 'center', flex: 1}}>
                    <div style={{fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 700, fontStyle: 'italic', fontSize: 24, color: '#fff'}}>{phase.value}%</div>
                    <div style={{fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: 11, color: '#fff', marginTop: 2}}>{phase.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Second Card - Technical Breakdown - slide in from right */}
          <div style={{position: 'relative', width: '60%', maxWidth: '650px', transform: `translateX(${interpolate(intoThird, [Math.round(fps * 0.4), Math.round(fps * 0.9)], [100, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`, opacity: interpolate(intoThird, [Math.round(fps * 0.4), Math.round(fps * 0.9)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
            <img
              src={cardBaseSrc}
              alt="Second card"
              style={{width: '100%', height: 'auto', display: 'block'}}
            />
            {/* Shine effect */}
            <div style={{position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'}}>
              <div style={{position: 'absolute', top: '-50%', bottom: '-50%', width: '40%', background: 'linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)', transform: `translateX(${interpolate((frame - THIRD_START + 30) % Math.round(fps * 3), [0, Math.round(fps * 3)], [-100, 300], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}%) rotate(18deg)`, opacity: 0.6}} />
            </div>
            <div style={{position: 'absolute', inset: 0, padding: '35px 45px', display: 'flex', flexDirection: 'column', gap: 18}}>
              <div style={{fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 700, fontStyle: 'italic', fontSize: 28, color: '#fff', textAlign: 'center', textTransform: 'uppercase', marginBottom: 5}}>Technical Breakdown</div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
                {technicalRows.map((row) => {
                  const barFill = Math.min(100, Math.max(0, row.value * thirdMetricProgress));
                  const currentValue = Math.round(row.value * thirdMetricProgress);
                  const gradient = row.scheme === 'blue' ? 'linear-gradient(90deg, #0F62B0 0%, #1178D9 100%)' : 'linear-gradient(90deg, #F9B233 0%, #FFD180 100%)';
                  return (
                    <div key={row.label} style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 500, fontSize: 16, color: '#fff'}}>
                        <span>{row.label}</span>
                        <span>{currentValue}%</span>
                      </div>
                      <div style={{width: '100%', height: 14, borderRadius: 8, background: 'rgba(255, 255, 255, 0.2)', overflow: 'hidden'}}>
                        <div style={{width: `${barFill}%`, height: '100%', background: gradient, transition: 'width 0.3s ease'}} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Sequence>

      {/* Fourth frame: Speed Meter Analysis */}
      <Sequence from={FOURTH_START}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: width,
            height: height,
            display: 'flex',
            flexDirection: 'column',
            gap: 40,
            opacity: fourthAppear * fourthFadeOut2,
            pointerEvents: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 60px',
          }}
        >
          {/* User video thumbnail box at the top */}
          <div
            style={{
              width: '234px',
              height: '234px',
              backgroundColor: videoThumbnail ? '#000' : 'transparent',
              border: videoThumbnail ? 'none' : '2px dashed rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              borderRadius: '8px',
            }}
          >
            {videoThumbnail && (
              <img
                src={videoThumbnail}
                alt="User video thumbnail"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
          </div>

          {/* First Card - Speed Meter Analysis - slide in from right */}
          <div style={{position: 'relative', width: '60%', maxWidth: '650px', transform: `translateX(${interpolate(intoFourth, [0, Math.round(fps * 0.5)], [100, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`, opacity: interpolate(intoFourth, [0, Math.round(fps * 0.5)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
            <img
              src={cardBaseSrc}
              alt="First card"
              style={{width: '100%', height: 'auto', display: 'block'}}
            />
            {/* Shine effect */}
            <div style={{position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'}}>
              <div style={{position: 'absolute', top: '-50%', bottom: '-50%', width: '40%', background: 'linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)', transform: `translateX(${interpolate((frame - FOURTH_START) % Math.round(fps * 3), [0, Math.round(fps * 3)], [-100, 300], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}%) rotate(18deg)`, opacity: 0.6}} />
            </div>
            <div style={{position: 'absolute', inset: 0, padding: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
              <div style={{fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 700, fontStyle: 'italic', fontSize: 30, color: '#fff', textAlign: 'center', textTransform: 'uppercase', marginBottom: 35}}>Speed Meter Analysis</div>
              
              {/* Speed meter container - bigger and properly centered */}
              <div style={{position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                {/* Accuracy percentage above last block */}
                <div style={{position: 'absolute', top: -28, left: (75 * 4) + (4 * 4), width: 75, fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 700, fontStyle: 'italic', fontSize: 22, color: '#fff', textAlign: 'center'}}>
                  {similarityValue}%
                </div>
                
                {/* Color blocks - bigger */}
                <div style={{display: 'flex', gap: 4, position: 'relative', zIndex: 2}}>
                  {['#FCF0C4', '#F6E49E', '#FFCA04', '#118DC9', '#0F76A8'].map((color, i) => (
                    <div key={i} style={{width: 75, height: 12, backgroundColor: color}} />
                  ))}
                </div>
                
                {/* White line below blocks - bigger */}
                <div style={{position: 'relative', width: (75 * 5) + (4 * 4), height: 2.5, backgroundColor: 'white', marginTop: 5, zIndex: 1}}>
                  {/* Ticker on the white line */}
                  <div style={{position: 'absolute', top: -8, left: `${(similarityValue / 100) * 100}%`, width: 6, height: 18, backgroundColor: '#fff', transform: 'translateX(-50%)', borderRadius: 1}} />
                </div>
              </div>
            </div>
          </div>

          {/* Second Card - Predicted Speed - slide in from right */}
          <div style={{position: 'relative', width: '60%', maxWidth: '650px', transform: `translateX(${interpolate(intoFourth, [Math.round(fps * 0.2), Math.round(fps * 0.7)], [100, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`, opacity: interpolate(intoFourth, [Math.round(fps * 0.2), Math.round(fps * 0.7)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
            <img
              src={cardBaseSrc}
              alt="Second card"
              style={{width: '100%', height: 'auto', display: 'block'}}
            />
            {/* Shine effect */}
            <div style={{position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'}}>
              <div style={{position: 'absolute', top: '-50%', bottom: '-50%', width: '40%', background: 'linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)', transform: `translateX(${interpolate((frame - FOURTH_START + 30) % Math.round(fps * 3), [0, Math.round(fps * 3)], [-100, 300], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}%) rotate(18deg)`, opacity: 0.6}} />
            </div>
            <div style={{position: 'absolute', inset: 0, padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20}}>
              <div style={{fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 700, fontStyle: 'italic', fontSize: 28, color: '#fff', textAlign: 'center', textTransform: 'uppercase'}}>Predicted Speed</div>
              <div style={{background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)', borderRadius: 10, padding: '25px 45px', textAlign: 'center', display: 'flex', alignItems: 'baseline', gap: 10}}>
                <div style={{fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 700, fontStyle: 'italic', fontSize: 56, color: '#fff'}}>{animatedTopSpeed}</div>
                <div style={{fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: 24, color: '#fff'}}>km/h</div>
              </div>
            </div>
          </div>
        </div>
      </Sequence>

      {/* Fifth frame: First card slides away, image box grows as square downward */}
      <Sequence from={FIFTH_START}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: width,
            height: height,
            opacity: fifthAppear * fifthFadeOut3,
            pointerEvents: 'none',
          }}
        >
          {/* User video thumbnail grows as square - stays centered horizontally, top fixed, grows downward */}
          <div
            style={{
              position: 'absolute',
              left: (width - interpolate(intoFifth, [0, Math.round(fps * 0.8)], [234, 500], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })) / 2,
              top: 320,
              width: interpolate(intoFifth, [0, Math.round(fps * 0.8)], [234, 500], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              height: interpolate(intoFifth, [0, Math.round(fps * 0.8)], [234, 500], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              backgroundColor: videoThumbnail ? '#000' : 'transparent',
              border: videoThumbnail ? 'none' : '2px dashed rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              borderRadius: '8px',
            }}
          >
            {videoThumbnail && (
              <img
                src={videoThumbnail}
                alt="User video thumbnail"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
          </div>

          {/* First Cards.png - slides away to the left */}
          <img
            src={cardBaseSrc}
            alt="First card"
            style={{
              position: 'absolute',
              left: '50%',
              top: 594,
              transform: `translate(-50%, 0) translateX(${interpolate(intoFifth, [0, Math.round(fps * 0.8)], [0, -width], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}px)`,
              width: '60%',
              maxWidth: '650px',
              height: 'auto',
              opacity: interpolate(intoFifth, [0, Math.round(fps * 0.5)], [1, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          />

          {/* Second Card - Recommendations - slide in from bottom */}
          <div style={{position: 'absolute', left: '50%', top: 868, transform: `translate(-50%, 0) translateY(${interpolate(intoFifth, [0, Math.round(fps * 0.6)], [100, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`, width: '60%', maxWidth: '650px', opacity: interpolate(intoFifth, [0, Math.round(fps * 0.6)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
            <img
              src={cardBaseSrc}
              alt="Second card"
              style={{width: '100%', height: 'auto', display: 'block'}}
            />
            {/* Shine effect */}
            <div style={{position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'}}>
              <div style={{position: 'absolute', top: '-50%', bottom: '-50%', width: '40%', background: 'linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)', transform: `translateX(${interpolate((frame - FIFTH_START) % Math.round(fps * 3), [0, Math.round(fps * 3)], [-100, 300], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}%) rotate(18deg)`, opacity: 0.6}} />
            </div>
            <div style={{position: 'absolute', inset: 0, padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20}}>
              <div style={{fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 700, fontStyle: 'italic', fontSize: 28, color: '#fff', textAlign: 'center', textTransform: 'uppercase'}}>Recommendations</div>
              <div style={{background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(10px)', borderRadius: 10, padding: '20px 30px', textAlign: 'center', width: '90%'}}>
                <div style={{fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 400, fontSize: 16, color: '#fff', lineHeight: 1.5}}>{recommendationsText}</div>
              </div>
            </div>
          </div>
        </div>
      </Sequence>

      {/* Final frame: Sponsored clip */}
      <Sequence from={SIXTH_START}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: sixthAppear,
            zIndex: 10,
          }}
        >
          <Video
            src={sponsoredVideoSrc}
            muted
            playsInline
            delayRenderTimeoutInMilliseconds={120000}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      </Sequence>

    </div>
  );
};

export default FirstFrame;
