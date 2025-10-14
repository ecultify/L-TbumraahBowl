"use client";

import React from 'react';
import {interpolate, staticFile, useCurrentFrame, useVideoConfig, Sequence, Video, delayRender, continueRender, Audio} from 'remotion';
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
const FONT_FAMILY = '"Helvetica Condensed"'; // Use Helvetica Condensed throughout

type VideoMetadata = Awaited<ReturnType<typeof getVideoMetadata>>;

const useVideoMetadataCompat = (src: string | null) => {
  const handleRef = React.useRef<number | null>(null);
  const [metadata, setMetadata] = React.useState<VideoMetadata | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let timeoutId: NodeJS.Timeout | null = null;

    if (!src) {
      setMetadata(null);
      return;
    }

    const handle = delayRender(`metadata-${src}`);
    handleRef.current = handle;

    // Set a timeout to ensure we don't hang the render
    timeoutId = setTimeout(() => {
      if (!cancelled && handleRef.current !== null) {
        console.warn(`⚠️ [FirstFrame] Video metadata loading timed out after 30s: ${src.substring(0, 100)}`);
        setMetadata(null); // Use null metadata on timeout
        continueRender(handleRef.current);
        handleRef.current = null;
      }
    }, 30000); // 30 second timeout

    getVideoMetadata(src)
      .then((meta) => {
        if (!cancelled) {
          console.log(`✅ [FirstFrame] Video metadata loaded successfully: ${src.substring(0, 100)}`);
          setMetadata(meta);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(`❌ [FirstFrame] Failed to load video metadata: ${error.message}`);
          setMetadata(null);
        }
      })
      .then(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (handleRef.current !== null) {
          continueRender(handleRef.current);
          handleRef.current = null;
        }
      });

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
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

  // NOTE: This composition works at 12 FPS (288 total frames = 24 seconds)
  // All timing calculations are FPS-independent using fps variable
  
  // Slide in from the right and fade in over ~1s
  const slide = interpolate(frame, [0, fps * 1], [140, 0], {
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
  const maxPortraitWidth = (width * 0.85) / 2; // Increased from 0.75 to 0.85 for even bigger videos
  const maxPortraitHeight = height * 0.95; // Increased from 0.90 to 0.95
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
  // Use LOCAL files with staticFile() - Remotion's proper way to reference public/ assets
  const benchmarkVideoSrc = 'https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/bowling-avatars/remotion-assets/benchmark-bowling-action.mp4';
  const bgVideoSrc = staticFile('BG.mp4'); // Local file from public/BG.mp4
  const sponsoredVideoSrc = staticFile('lnt-finance-6sec-clean-9x16.mp4'); // Local file from public/
  
  // Use staticFile() for images
  const cardTopSrc = staticFile('card-2.png');
  const cardBaseSrc = staticFile('cards.png');

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
      {/* Load Helvetica Condensed fonts from public/fonts */}
      <style>{`
        @font-face {
          font-family: 'Helvetica Condensed';
          src: url('${staticFile('fonts/Helvetica Condensed/Helvetica Condensed Regular/Helvetica Condensed Regular.ttf')}') format('truetype');
          font-weight: 400;
          font-style: normal;
        }
        @font-face {
          font-family: 'Helvetica Condensed';
          src: url('${staticFile('fonts/Helvetica Condensed/Helvetica Condensed Bold/Helvetica Condensed Bold.otf')}') format('opentype');
          font-weight: 700;
          font-style: normal;
        }
        @font-face {
          font-family: 'Helvetica Condensed';
          src: url('${staticFile('fonts/Helvetica Condensed/Helvetica Condensed Italic/Helvetica Condensed Italic.ttf')}') format('truetype');
          font-weight: 400;
          font-style: italic;
        }
        @font-face {
          font-family: 'Helvetica Condensed';
          src: url('${staticFile('fonts/Helvetica Condensed/Helvetica Condensed Bold Oblique/Helvetica Condensed Bold Oblique.otf')}') format('opentype');
          font-weight: 700;
          font-style: italic;
        }
        @font-face {
          font-family: 'Helvetica Condensed';
          src: url('${staticFile('fonts/Helvetica Condensed/Helvetica Condensed Medium/Helvetica Condensed Medium.otf')}') format('opentype');
          font-weight: 500;
          font-style: normal;
        }
      `}</style>

      {/* Background audio - stops when sponsored video starts */}
      <Audio
        src={staticFile('v.5 (0_19).wav')}
        volume={0.5}
        endAt={SIXTH_START}
      />

      {/* Background video */}
      <Video
        src={bgVideoSrc}
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
        delayRenderTimeoutInMilliseconds={300000}
        delayRenderRetries={5}
        onError={(error) => {
          console.error('[FirstFrame] Background video error:', error);
        }}
      />

      {/* Top-left Zoom logo (bigger) */}
      <img
        src={staticFile('images/newhomepage/Bowling Campaign Logo.avif')}
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
        src={staticFile('images/bumraahnewpic.avif')}
        alt="Phone"
        style={{
          position: 'absolute',
          right: 0,
          bottom: 30,
          transform: `scale(${phoneScale * 1.15})`, // Increased from 0.85 to 1.15 for bigger small version
          transformOrigin: '100% 100%',
          width: Math.min(650, width * 0.6),
          height: 'auto',
          opacity: fade * fadeOut,
          zIndex: 1, // Behind the bar
        }}
      />

      {/* Slanted countdown number from 6 to 1 */}
      <div
        style={{
          position: 'absolute',
          right: 525, // Moved 85px more left (440 + 85)
          bottom: 400, // Moved 300px up from 100
          fontFamily: FONT_FAMILY,
          fontSize: 80, // Reduced from 180
          fontWeight: 700,
          fontStyle: 'italic',
          color: '#000000', // Changed to black
          textShadow: '2px 2px 4px rgba(255,255,255,0.3)',
          transform: 'rotate(-15deg)',
          opacity: fade * fadeOut,
          zIndex: 3,
        }}
      >
        {Math.max(1, 6 - Math.floor((frame / (SECOND_START - 1)) * 6))}
      </div>

      {/* Text elements positioned and sliding in from the left */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          bottom: height * 0.50 + 80, // Pushed higher up
          transform: `translateX(${-slide - slideOut}px)`,
          opacity: fade * fadeOut,
          zIndex: 2,
          textAlign: 'left',
        }}
      >
        {/* Player name and "Bowling Analysis with" */}
        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 95, // Increased from 75
            fontWeight: 400,
            fontStyle: 'italic',
            color: 'white',
            textShadow: '3px 3px 6px #FFCB03',
            lineHeight: 0.92,
            marginBottom: 4,
            width: 700, // Increased width to accommodate larger text
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
            width: 480, // Increased from 400
            height: 105, // Increased from 88
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
          src={staticFile('images/newhomepage/Bowling Campaign Logo.avif')}
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
          {comparisonVideos.map((video, index) => (
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
              {/* Left side (user's clip): Show thumbnail instead of video */}
              {index === 0 ? (
                <img
                  src={videoThumbnail || staticFile('bowling-frame-2025-10-07T00-19-33-547Z.jpg')}
                  alt="User video thumbnail"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                // Right side (benchmark): Show video
                <Video
                  src={video.src}
                  muted
                  playsInline
                  loop
                  startFrom={video.startFrom}
                  endAt={video.endAt}
                  delayRenderTimeoutInMilliseconds={300000}
                  delayRenderRetries={5}
                  onError={(error) => {
                    console.error('[FirstFrame] Benchmark video error:', error);
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              )}
              
              {/* Grid and scanning animation - only on left video (user's video) */}
              {index === 0 && (
                <>
                  {/* Grid overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `
                        repeating-linear-gradient(0deg, transparent, transparent 19px, #B8860B 19px, #B8860B 20px),
                        repeating-linear-gradient(90deg, transparent, transparent 19px, #B8860B 19px, #B8860B 20px)
                      `,
                      opacity: 0.3,
                      zIndex: 9,
                    }}
                  />
                  
                  {/* Scanning animation */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: `${interpolate(
                        (frame - SECOND_START) % 60,
                        [0, 30, 60],
                        [0, 100, 0],
                        {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
                      )}%`,
                      height: '4px',
                      background: 'linear-gradient(90deg, transparent 0%, #DAA520 50%, transparent 100%)',
                      boxShadow: '0 0 20px #DAA520, 0 0 40px #DAA520',
                      zIndex: 10,
                    }}
                  />
                  
                  {/* Yellow corner borders */}
                  <svg
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                      zIndex: 11,
                    }}
                  >
                    {/* Top-left corner */}
                    <line x1="0" y1="0" x2="60" y2="0" stroke="#FFCB03" strokeWidth="1.5" />
                    <line x1="0" y1="0" x2="0" y2="60" stroke="#FFCB03" strokeWidth="1.5" />
                    
                    {/* Top-right corner */}
                    <line x1={portraitVideoWidth} y1="0" x2={portraitVideoWidth - 60} y2="0" stroke="#FFCB03" strokeWidth="1.5" />
                    <line x1={portraitVideoWidth} y1="0" x2={portraitVideoWidth} y2="60" stroke="#FFCB03" strokeWidth="1.5" />
                    
                    {/* Bottom-left corner */}
                    <line x1="0" y1={portraitVideoHeight} x2="60" y2={portraitVideoHeight} stroke="#FFCB03" strokeWidth="1.5" />
                    <line x1="0" y1={portraitVideoHeight} x2="0" y2={portraitVideoHeight - 60} stroke="#FFCB03" strokeWidth="1.5" />
                    
                    {/* Bottom-right corner */}
                    <line x1={portraitVideoWidth} y1={portraitVideoHeight} x2={portraitVideoWidth - 60} y2={portraitVideoHeight} stroke="#FFCB03" strokeWidth="1.5" />
                    <line x1={portraitVideoWidth} y1={portraitVideoHeight} x2={portraitVideoWidth} y2={portraitVideoHeight - 60} stroke="#FFCB03" strokeWidth="1.5" />
                  </svg>
                </>
              )}
              
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
                  fontFamily: FONT_FAMILY,
                }}
              >
                <span style={{fontWeight: 700, fontStyle: 'italic', fontSize: 26, letterSpacing: 0.5}}>{video.title}</span>
                <span style={{fontWeight: 700, fontStyle: 'italic', fontSize: 16, opacity: 0.75}}>{video.caption}</span>
              </div>
            </div>
          ))}
        </div>
        
        {/* TRACKING text with 3-dot animation in center */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: FONT_FAMILY,
            fontSize: 36, // Reduced from 48
            fontWeight: 700,
            fontStyle: 'italic', // Made italic
            color: '#FFFFFF', // Changed to white
            textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
            opacity: secondAppear * secondFadeOut,
            zIndex: 7,
            display: 'flex',
            alignItems: 'center',
            gap: 6, // Reduced from 8
          }}
        >
          TRACKING
          <span style={{display: 'flex', gap: 3}}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  opacity: interpolate(
                    (frame - SECOND_START + i * 10) % 30,
                    [0, 15, 30],
                    [0.3, 1, 0.3],
                    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
                  ),
                }}
              >
                .
              </span>
            ))}
          </span>
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
          {/* User video thumbnail box at the top - static, no animation */}
          <div
            style={{
              width: '260px',
              height: '462px', // Portrait 9:16 ratio (260 * 16/9)
              backgroundColor: videoThumbnail ? '#000' : 'transparent',
              border: videoThumbnail ? 'none' : '2px dashed rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              borderRadius: '8px',
            }}
          >
            <img
              src={videoThumbnail || staticFile('bowling-frame-2025-10-07T00-19-33-547Z.jpg')}
              alt="User video thumbnail"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain', // Changed to contain to show full frame
              }}
            />
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
              <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontStyle: 'italic', fontSize: 28, color: '#fff', textAlign: 'center', textTransform: 'uppercase'}}>Detailed Analysis</div>
              <div style={{background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(10px)', borderRadius: 10, padding: '15px 25px', textAlign: 'center'}}>
                <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontStyle: 'italic', fontSize: 38, color: '#fff'}}>{similarityValue}%</div>
                <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontStyle: 'italic', fontSize: 12, color: '#fff', marginTop: 3}}>Overall similarity to benchmark</div>
              </div>
              <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontStyle: 'italic', fontSize: 16, color: '#fff', textAlign: 'center', marginTop: 5}}>Bowling Phases</div>
              <div style={{display: 'flex', gap: 8, width: '100%', justifyContent: 'space-around'}}>
                {phases.map((phase) => (
                  <div key={phase.label} style={{background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(10px)', borderRadius: 10, padding: '12px 15px', textAlign: 'center', flex: 1}}>
                    <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontStyle: 'italic', fontSize: 24, color: '#fff'}}>{phase.value}%</div>
                    <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontStyle: 'italic', fontSize: 11, color: '#fff', marginTop: 2}}>{phase.label}</div>
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
              <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontStyle: 'italic', fontSize: 28, color: '#fff', textAlign: 'center', textTransform: 'uppercase', marginBottom: 5}}>Technical Breakdown</div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
                {technicalRows.map((row) => {
                  const barFill = Math.min(100, Math.max(0, row.value * thirdMetricProgress));
                  const currentValue = Math.round(row.value * thirdMetricProgress);
                  const gradient = row.scheme === 'blue' ? 'linear-gradient(90deg, #0F62B0 0%, #1178D9 100%)' : 'linear-gradient(90deg, #F9B233 0%, #FFD180 100%)';
                  return (
                    <div key={row.label} style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: FONT_FAMILY, fontWeight: 700, fontStyle: 'italic', fontSize: 16, color: '#fff'}}>
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
              width: '260px',
              height: '462px', // Portrait 9:16 ratio (260 * 16/9)
              backgroundColor: videoThumbnail ? '#000' : 'transparent',
              border: videoThumbnail ? 'none' : '2px dashed rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              borderRadius: '8px',
            }}
          >
            <img
              src={videoThumbnail || staticFile('bowling-frame-2025-10-07T00-19-33-547Z.jpg')}
              alt="User video thumbnail"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain', // Changed to contain to show full frame
              }}
            />
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
            <div style={{position: 'absolute', inset: 0, padding: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 25}}>
              <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontStyle: 'italic', fontSize: 30, color: '#fff', textAlign: 'center', textTransform: 'uppercase'}}>Speed Meter Analysis</div>
              
              {/* Accuracy box above speed meter */}
              <div style={{background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)', borderRadius: 10, padding: '15px 35px', textAlign: 'center', display: 'flex', alignItems: 'baseline', gap: 8}}>
                <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontStyle: 'italic', fontSize: 20, color: '#fff'}}>Accuracy</div>
                <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontStyle: 'italic', fontSize: 42, color: '#fff'}}>{similarityValue}%</div>
              </div>
              
              {/* Speed meter container - bigger and properly centered */}
              <div style={{position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
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

          {/* Second Card - Motion Intensity Overtime - slide in from right */}
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
              <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontStyle: 'italic', fontSize: 28, color: '#fff', textAlign: 'center', textTransform: 'uppercase'}}>Motion Intensity Overtime</div>
              <div style={{background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)', borderRadius: 10, padding: '25px 45px', textAlign: 'center', display: 'flex', alignItems: 'baseline', gap: 10}}>
                <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontStyle: 'italic', fontSize: 56, color: '#fff'}}>{animatedTopSpeed}</div>
                <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontStyle: 'italic', fontSize: 24, color: '#fff'}}>km/h</div>
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
          {/* User video thumbnail grows as portrait - stays centered horizontally, top fixed, grows downward */}
          <div
            style={{
              position: 'absolute',
              left: (width - interpolate(intoFifth, [0, Math.round(fps * 0.8)], [260, 350], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })) / 2,
              top: 240,
              width: interpolate(intoFifth, [0, Math.round(fps * 0.8)], [260, 350], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              height: interpolate(intoFifth, [0, Math.round(fps * 0.8)], [462, 622], {
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
            <img
              src={videoThumbnail || staticFile('bowling-frame-2025-10-07T00-19-33-547Z.jpg')}
              alt="User video thumbnail"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain', // Changed to contain to show full frame
              }}
            />
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
              <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontStyle: 'italic', fontSize: 28, color: '#fff', textAlign: 'center', textTransform: 'uppercase'}}>Recommendations</div>
              <div style={{background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(10px)', borderRadius: 10, padding: '20px 30px', textAlign: 'center', width: '90%'}}>
                <div style={{fontFamily: FONT_FAMILY, fontWeight: 700, fontStyle: 'italic', fontSize: 20, color: '#fff', lineHeight: 1.5}}>{recommendationsText}</div>
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
            playsInline
            loop
            delayRenderTimeoutInMilliseconds={300000}
            delayRenderRetries={5}
            onError={(error) => {
              console.error('[FirstFrame] Sponsored video error:', error);
            }}
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
