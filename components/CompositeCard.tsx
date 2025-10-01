'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getGeneratedTorsoImage } from '@/lib/utils/geminiService';

interface CompositeCardProps {
  accuracyDisplay: number;
  runUpScore: number;
  deliveryScore: number;
  followThroughScore: number;
  playerName: string;
  kmhValue: number;
  armSwingScore: number;
  bodyMovementScore: number;
  rhythmScore: number;
  releasePointScore: number;
  recommendations: string;
}

export const CompositeCard: React.FC<CompositeCardProps> = ({
  accuracyDisplay,
  runUpScore,
  deliveryScore,
  followThroughScore,
  playerName,
  kmhValue,
  armSwingScore,
  bodyMovementScore,
  rhythmScore,
  releasePointScore,
  recommendations
}) => {
  const [generatedTorsoImage, setGeneratedTorsoImage] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [scale, setScale] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load generated torso image from session storage
  useEffect(() => {
    const torsoImage = getGeneratedTorsoImage();
    if (torsoImage) {
      // Validate image data URL before setting
      if (torsoImage.startsWith('data:image/')) {
        setGeneratedTorsoImage(torsoImage);
        console.log('✅ Loaded generated torso image for composite card');
      } else {
        console.error('❌ Invalid torso image data URL format');
        setImageLoadError(true);
      }
    } else {
      console.warn('⚠️ No generated torso image found in session storage');
    }
  }, []);

  // Calculate scale based on actual card width (reference: 346px at 430x932 viewport)
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        // Get parent container width
        const parent = containerRef.current.parentElement;
        const cardWidth = parent ? parent.offsetWidth : containerRef.current.offsetWidth;
        
        // Fallback to offsetWidth if parent width is 0
        const actualWidth = cardWidth > 0 ? cardWidth : containerRef.current.offsetWidth;
        
        const referenceWidth = 346; // Perfect layout width from 430x932 viewport
        const newScale = actualWidth / referenceWidth;
        
        console.log('📏 CompositeCard scale calculation:', {
          parentWidth: parent?.offsetWidth,
          containerWidth: containerRef.current.offsetWidth,
          actualWidth,
          referenceWidth,
          newScale
        });
        
        setScale(newScale);
        
        // Store scale as data attribute for html2canvas cloning
        containerRef.current.setAttribute('data-scale', newScale.toString());
        
        // Mark as ready after scale calculation and small delay for rendering
        setTimeout(() => {
          setIsReady(true);
          containerRef.current?.setAttribute('data-ready', 'true');
          console.log('✅ CompositeCard ready with scale:', newScale);
        }, 150);
      }
    };

    // Initial calculation with multiple attempts to ensure proper measurement
    const timer1 = setTimeout(updateScale, 50);
    const timer2 = setTimeout(updateScale, 200);
    const timer3 = setTimeout(updateScale, 500);
    
    window.addEventListener('resize', updateScale);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  const torsoImageTopOffset = 105;
  const torsoImageRightOffset = -5;
  const torsoImageWidth = 260;
  const torsoImageMaxHeight = 340;

  return (
    <div 
      id="composite-card" 
      ref={containerRef}
      className="composite-card-container"
      style={{ 
        position: "relative", 
        width: "100%", 
        marginBottom: 16,
        isolation: "isolate",
        transform: "translateZ(0)",
        willChange: "auto",
        overflow: "visible"
      }}
    >
      {/* Upper part */}
      <img
        src="/frontend-images/homepage/upperpart.png"
        alt="Upper Part"
        style={{
          width: "100%",
          display: "block",
          zIndex: 1,
        }}
      />
      {/* Generated Torso Image - positioned between upper and bottom parts */}
      {generatedTorsoImage && !imageLoadError && (
        <img
          src={generatedTorsoImage}
          alt="Generated Cricket Player Torso"
          style={{
            position: "absolute",
            top: `${torsoImageTopOffset * scale}px`,
            right: `${torsoImageRightOffset * scale}px`,
            width: `${torsoImageWidth * scale}px`,
            height: 'auto',
            maxHeight: `${torsoImageMaxHeight * scale}px`,
            display: "block",
            zIndex: 1.5,
            objectFit: "contain",
            objectPosition: "center top"
          }}
          onError={(e) => {
            console.error('❌ Failed to load torso image in composite card');
            setImageLoadError(true);
            // Hide the image element
            e.currentTarget.style.display = 'none';
          }}
          onLoad={() => {
            console.log('✅ Torso image loaded successfully in composite card');
          }}
        />
      )}
      
      {/* Bottom part on top */}
      <img
        src="/frontend-images/homepage/bottompart.png"
        alt="Bottom Part"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          display: "block",
          zIndex: 2,
        }}
      />
      
      {/* Main percentage value */}
      <div
        style={{
          position: "absolute",
          top: `${98.39 * scale}px`,
          left: `${16 * scale}px`,
          fontFamily: "Helvetica Condensed",
          fontWeight: 700,
          fontSize: `${32.18 * scale}px`,
          fontStyle: "normal",
          textTransform: "uppercase",
          color: "white",
          zIndex: 3,
        }}
      >
        {accuracyDisplay}%
      </div>

      {/* Blue background box */}
      <div
        style={{
          position: "absolute",
          top: `${144 * scale}px`,
          left: `${16 * scale}px`,
          width: `${75 * scale}px`,
          height: `${21 * scale}px`,
          backgroundColor: "#114F80",
          borderTopLeftRadius: `${10.5 * scale}px`,
          borderBottomLeftRadius: `${10.5 * scale}px`,
          borderTopRightRadius: "0px",
          borderBottomRightRadius: "0px",
          zIndex: 3,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: `${2 * scale}px`,
            left: `${14 * scale}px`,
            width: `${42 * scale}px`,
            height: `${18 * scale}px`,
            fontFamily: "Helvetica Condensed",
            fontWeight: 700,
            fontStyle: "normal",
            fontSize: `${14 * scale}px`,
            textTransform: "uppercase",
            color: "#FFCA04",
            display: "flex",
            alignItems: "center",
          }}
        >
          MATCH
        </div>
      </div>

      {/* Phase scores */}
      {[
        { label: "RUN-UP", score: runUpScore, top: 215 },
        { label: "DELIVERY", score: deliveryScore, top: 255 },
        { label: "FOLLOW THRU", score: followThroughScore, top: 295 },
      ].map(({ label, score, top }) => (
        <React.Fragment key={label}>
          {/* Percentage */}
          <div
            style={{
              position: "absolute",
              top: `${top * scale}px`,
              left: `${16 * scale}px`,
              width: `${63.31 * scale}px`,
              fontFamily: "Helvetica Condensed",
              fontWeight: 700,
              fontSize: `${13.56 * scale}px`,
              fontStyle: "bold",
              textTransform: "uppercase",
              color: "white",
              zIndex: 3,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {Math.min(score, 100)}%
          </div>

          {/* Label Box */}
          <div
            style={{
              position: "absolute",
              top: `${(top + 20) * scale}px`,
              left: `${16 * scale}px`,
              width: `${63.31 * scale}px`,
              height: `${14.27 * scale}px`,
              backgroundColor: "#FFCA04",
              borderRadius: `${7.23 * scale}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 3,
            }}
          >
            <div
              style={{
                fontFamily: "Helvetica Condensed",
                fontWeight: 700,
                fontStyle: "bold",
                fontSize: `${8.14 * scale}px`,
                textTransform: "uppercase",
                color: "#13264A",
              }}
            >
              {label}
            </div>
          </div>
        </React.Fragment>
      ))}

      {/* User Name */}
      <div
        style={{
          position: "absolute",
          top: `${403.06 * scale}px`,
          left: `${16 * scale}px`,
          fontFamily: "Helvetica Condensed",
          fontWeight: 400,
          fontSize: `${16 * scale}px`,
          fontStyle: "normal",
          textTransform: "uppercase",
          color: "white",
          zIndex: 3,
        }}
      >
        {playerName || "PLAYER NAME"}
      </div>

      {/* Speed */}
      <div
        style={{
          position: "absolute",
          top: `${399.44 * scale}px`,
          left: `${256.16 * scale}px`,
          width: `${77.76 * scale}px`,
          height: `${61.94 * scale}px`,
          zIndex: 3,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: `${4 * scale}px`,
        }}
      >
        <div
          style={{
            fontFamily: "Helvetica Condensed",
            fontWeight: 700,
            fontSize: `${36.17 * scale}px`,
            fontStyle: "bold",
            textTransform: "uppercase",
            color: "white",
            lineHeight: 1,
          }}
        >
          {kmhValue}
        </div>
        <div
          style={{
            fontFamily: "Helvetica Condensed",
            fontWeight: 700,
            fontSize: `${9.04 * scale}px`,
            fontStyle: "bold",
            textTransform: "lowercase",
            color: "white",
          }}
        >
          kmph
        </div>
      </div>

      {/* Technical Breakdown */}
      <div
        style={{
          position: "absolute",
          top: `${466.38 * scale}px`,
          left: `${256.16 * scale}px`,
          width: `${77.76 * scale}px`,
          zIndex: 3,
        }}
      >
        {[
          { label: 'ARM SWING', value: armSwingScore },
          { label: 'BODY MOVEMENT', value: bodyMovementScore },
          { label: 'RHYTHM', value: rhythmScore },
          { label: 'RELEASE POINT', value: releasePointScore }
        ].map((metric, index) => (
          <div key={metric.label} style={{ marginBottom: `${8 * scale}px` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: `${2 * scale}px` }}>
              <div
                style={{
                  fontFamily: "Helvetica Condensed",
                  fontWeight: 400,
                  fontSize: `${6 * scale}px`,
                  fontStyle: "normal",
                  textTransform: "uppercase",
                  color: "white",
                }}
              >
                {metric.label}
              </div>
              <div
                style={{
                  fontFamily: "Helvetica Condensed",
                  fontWeight: 700,
                  fontSize: `${8.14 * scale}px`,
                  fontStyle: "bold",
                  color: "white",
                }}
              >
                {Math.min(metric.value, 100)}%
              </div>
            </div>
            <div style={{ 
              width: '100%', 
              height: `${3 * scale}px`, 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              borderRadius: `${1.5 * scale}px`,
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${Math.min(metric.value, 100)}%`, 
                height: '100%', 
                backgroundColor: '#FFC315',
                borderRadius: `${1.5 * scale}px`
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div
        style={{
          position: "absolute",
          top: `${465 * scale}px`,
          left: `${16 * scale}px`,
          width: `${160 * scale}px`,
          zIndex: 3,
        }}
      >
        <div
          style={{
            fontFamily: "Helvetica Condensed",
            fontWeight: 700,
            fontSize: `${10 * scale}px`,
            fontStyle: "bold",
            textTransform: "uppercase",
            color: "white",
            marginBottom: `${4 * scale}px`,
          }}
        >
          RECOMMENDATIONS
        </div>
        
        <div
          style={{
            fontFamily: "Helvetica Condensed",
            fontWeight: 400,
            fontSize: `${8 * scale}px`,
            fontStyle: "normal",
            color: "white",
            lineHeight: "1.2",
          }}
        >
          {recommendations || "Great technique! Keep practicing to maintain consistency."}
        </div>
      </div>

      {/* Speed meter elements */}
      <div
        style={{
          position: "absolute",
          top: `${433.06 * scale}px`,
          left: `${16 * scale}px`,
          fontFamily: "Helvetica Condensed",
          fontWeight: 700,
          fontSize: `${8 * scale}px`,
          fontStyle: "bold",
          textTransform: "uppercase",
          color: "white",
          zIndex: 3,
        }}
      >
        SPEED METER ANALYSIS
      </div>

      {/* Color blocks */}
      <div
        style={{
          position: "absolute",
          top: `${445 * scale}px`,
          left: `${16 * scale}px`,
          display: "flex",
          gap: `${1 * scale}px`,
          zIndex: 3,
        }}
      >
        {["#FCF0C4", "#F6E49E", "#FFCA04", "#118DC9", "#0F76A8"].map((color, i) => (
          <div
            key={i}
            style={{
              width: `${30.32 * scale}px`,
              height: `${5.35 * scale}px`,
              backgroundColor: color,
            }}
          />
        ))}
      </div>

      {/* Accuracy percentage above blocks */}
      <div
        style={{
          position: "absolute",
          top: `${430 * scale}px`,
          left: `${(16 + (30.32 * 4) + (1 * 4)) * scale}px`, // Position on last (5th) block
          fontFamily: "Helvetica Condensed",
          fontWeight: 700,
          fontSize: `${12 * scale}px`,
          fontStyle: "bold",
          textTransform: "uppercase",
          color: "white",
          zIndex: 4,
          textAlign: "center",
          width: `${30.32 * scale}px`,
        }}
      >
        {accuracyDisplay}%
      </div>

      {/* White line with ticker */}
      <div
        style={{
          position: "absolute",
          top: `${453.35 * scale}px`,
          left: `${16 * scale}px`,
          width: `${157.82 * scale}px`,
          height: `${0.89 * scale}px`,
          backgroundColor: "white",
          zIndex: 3,
        }}
      />

      <img
        src="/images/Vector 8.svg"
        alt="Ticker"
        style={{
          position: "absolute",
          top: `${448.85 * scale}px`,
          left: `${(16 + (157.82 * (accuracyDisplay / 100)) - 1.475) * scale}px`,
          width: `${2.95 * scale}px`,
          height: `${9.85 * scale}px`,
          zIndex: 4,
        }}
      />
    </div>
  );
};