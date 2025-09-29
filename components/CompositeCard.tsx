'use client';

import React, { useEffect, useState } from 'react';
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

  // Load generated torso image from session storage
  useEffect(() => {
    const torsoImage = getGeneratedTorsoImage();
    if (torsoImage) {
      setGeneratedTorsoImage(torsoImage);
      console.log('✅ Loaded generated torso image for composite card');
    }
  }, []);
  return (
    <div 
      id="composite-card" 
      className="composite-card-container"
      style={{ 
        position: "relative", 
        width: "100%", 
        marginBottom: 16,
        isolation: "isolate",
        transform: "translateZ(0)",
        willChange: "auto"
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
      {generatedTorsoImage && (
        <img
          src={generatedTorsoImage}
          alt="Generated Cricket Player Torso"
          style={{
            position: "absolute",
            top: "102px", // 102px from top of upperpart
            right: "10px", // 10px from right edge
            width: "auto",
            height: "auto",
            maxWidth: "150px", // Reasonable max width for chest-level portrait
            maxHeight: "200px", // Reasonable max height
            display: "block",
            zIndex: 1.5, // Between upperpart (z:1) and bottompart (z:2)
            borderRadius: "8px", // Slight rounding for better integration
            objectFit: "contain"
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
          top: "98.39px",
          left: "16px",
          fontFamily: "Helvetica Condensed",
          fontWeight: 700,
          fontSize: "32.18px",
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
          top: "144px",
          left: "16px",
          width: "75px",
          height: "21px",
          backgroundColor: "#114F80",
          borderTopLeftRadius: "10.5px",
          borderBottomLeftRadius: "10.5px",
          borderTopRightRadius: "0px",
          borderBottomRightRadius: "0px",
          zIndex: 3,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "2px",
            left: "14px",
            width: "42px",
            height: "18px",
            fontFamily: "Helvetica Condensed",
            fontWeight: 700,
            fontStyle: "normal",
            fontSize: "14px",
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
        { label: "RUN-UP", score: runUpScore, top: "215px" },
        { label: "DELIVERY", score: deliveryScore, top: "255px" },
        { label: "FOLLOW THRU", score: followThroughScore, top: "295px" },
      ].map(({ label, score, top }) => (
        <React.Fragment key={label}>
          {/* Percentage */}
          <div
            style={{
              position: "absolute",
              top,
              left: "16px",
              width: "63.31px",
              fontFamily: "Helvetica Condensed",
              fontWeight: 700,
              fontSize: "13.56px",
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
              top: `${parseInt(top) + 20}px`,
              left: "16px",
              width: "63.31px",
              height: "14.27px",
              backgroundColor: "#FFCA04",
              borderRadius: "7.23px",
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
                fontSize: "8.14px",
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
          top: "403.06px",
          left: "16px",
          fontFamily: "Helvetica Condensed",
          fontWeight: 400,
          fontSize: "16px",
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
          top: "399.44px",
          left: "256.16px",
          width: "77.76px",
          height: "61.94px",
          zIndex: 3,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: "4px",
        }}
      >
        <div
          style={{
            fontFamily: "Helvetica Condensed",
            fontWeight: 700,
            fontSize: "36.17px",
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
            fontSize: "9.04px",
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
          top: "466.38px",
          left: "256.16px",
          width: "77.76px",
          zIndex: 3,
        }}
      >
        {[
          { label: 'ARM SWING', value: armSwingScore },
          { label: 'BODY MOVEMENT', value: bodyMovementScore },
          { label: 'RHYTHM', value: rhythmScore },
          { label: 'RELEASE POINT', value: releasePointScore }
        ].map((metric, index) => (
          <div key={metric.label} style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <div
                style={{
                  fontFamily: "Helvetica Condensed",
                  fontWeight: 400,
                  fontSize: "6px",
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
                  fontSize: "8.14px",
                  fontStyle: "bold",
                  color: "white",
                }}
              >
                {Math.min(metric.value, 100)}%
              </div>
            </div>
            <div style={{ 
              width: '100%', 
              height: '3px', 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              borderRadius: '1.5px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${Math.min(metric.value, 100)}%`, 
                height: '100%', 
                backgroundColor: '#FFC315',
                borderRadius: '1.5px'
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div
        style={{
          position: "absolute",
          top: "465px",
          left: "16px",
          width: "160px",
          zIndex: 3,
        }}
      >
        <div
          style={{
            fontFamily: "Helvetica Condensed",
            fontWeight: 700,
            fontSize: "10px",
            fontStyle: "bold",
            textTransform: "uppercase",
            color: "white",
            marginBottom: "4px",
          }}
        >
          RECOMMENDATIONS
        </div>
        
        <div
          style={{
            fontFamily: "Helvetica Condensed",
            fontWeight: 400,
            fontSize: "8px",
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
          top: "433.06px",
          left: "16px",
          fontFamily: "Helvetica Condensed",
          fontWeight: 700,
          fontSize: "8px",
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
          top: "445px",
          left: "16px",
          display: "flex",
          gap: "1px",
          zIndex: 3,
        }}
      >
        {["#FCF0C4", "#F6E49E", "#FFCA04", "#118DC9", "#0F76A8"].map((color, i) => (
          <div
            key={i}
            style={{
              width: "30.32px",
              height: "5.35px",
              backgroundColor: color,
            }}
          />
        ))}
      </div>

      {/* Accuracy percentage above blocks */}
      <div
        style={{
          position: "absolute",
          top: "430px",
          left: "111px",
          fontFamily: "Helvetica Condensed",
          fontWeight: 700,
          fontSize: "12px",
          fontStyle: "bold",
          textTransform: "uppercase",
          color: "white",
          zIndex: 4,
          textAlign: "center",
          width: "30px",
        }}
      >
        {accuracyDisplay}%
      </div>

      {/* White line with ticker */}
      <div
        style={{
          position: "absolute",
          top: "453.35px",
          left: "16px",
          width: "157.82px",
          height: "0.89px",
          backgroundColor: "white",
          zIndex: 3,
        }}
      />

      <img
        src="/images/Vector 8.svg"
        alt="Ticker"
        style={{
          position: "absolute",
          top: "448.85px",
          left: `${16 + (157.82 * (accuracyDisplay / 100)) - 1.475}px`,
          width: "2.95px",
          height: "9.85px",
          zIndex: 4,
        }}
      />
    </div>
  );
};