'use client';

import React from 'react';

interface GlassBackButtonProps {
  /** Custom click handler (overrides default behavior) */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function GlassBackButton({ onClick, className = '' }: GlassBackButtonProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.history.back();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`${className}`}
      style={{
        position: "absolute",
        top: "10px",
        left: "10px",
        width: "30px",
        height: "30px",
        border: "1px solid white",
        borderRadius: "4px",
        backgroundColor: "rgba(0,0,0,0.1)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 10,
        transition: "all 0.2s ease"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.1)";
      }}
    >
      {/* Left Arrow Icon */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path 
          d="M15 18L9 12L15 6" 
          stroke="white" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default GlassBackButton;