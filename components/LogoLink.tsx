'use client';

import React from 'react';
import { navigateWithReload } from '@/lib/utils/sessionCleanup';

interface LogoLinkProps {
  /** Custom CSS classes */
  className?: string;
  /** Image width */
  width?: number;
  /** Image height */
  height?: number;
  /** Alt text for the logo */
  alt?: string;
  /** Logo image source */
  src?: string;
}

export function LogoLink({ 
  className = '', 
  width = 120,
  height = 48,
  alt = 'JustZoom Logo',
  src = '/frontend-images/homepage/justzoom logo.png'
}: LogoLinkProps) {
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigateWithReload('/');
  };

  return (
    <a 
      href="/" 
      onClick={handleLogoClick}
      className={`cursor-pointer ${className}`}
    >
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="cursor-pointer"
      />
    </a>
  );
}

export default LogoLink;