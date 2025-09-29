'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useBackNavigation, getBackRoute } from '@/hooks/use-back-navigation';
import { usePathname } from 'next/navigation';
import { navigateWithReload } from '@/lib/utils/sessionCleanup';

interface BackButtonProps {
  /** Custom fallback route if provided */
  fallbackRoute?: string;
  /** Custom label text */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Custom click handler (overrides default behavior) */
  onClick?: () => void;
}

export function BackButton({ 
  fallbackRoute, 
  label = 'Back', 
  className = '',
  onClick 
}: BackButtonProps) {
  const pathname = usePathname();
  const defaultFallbackRoute = fallbackRoute || getBackRoute(pathname || '/');
  const { goBack } = useBackNavigation(defaultFallbackRoute);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // ALWAYS use page reload for analysis-related pages to clear console and memory
    const analysisPages = ['/analyze', '/video-preview', '/leaderboard', '/quick-analysis'];
    const currentPath = pathname || '/';
    const shouldReload = analysisPages.some(page => currentPath.startsWith(page));
    
    if (shouldReload) {
      const backRoute = getBackRoute(currentPath);
      console.log(`🔄 BackButton: Reloading from ${currentPath} to ${backRoute}`);
      navigateWithReload(backRoute);
    } else if (onClick) {
      onClick();
    } else {
      goBack();
    }
  };

  return (
    <button 
      onClick={handleClick}
      className={`flex items-center gap-2 text-white hover:text-gray-200 transition-colors ${className}`}
    >
      <ArrowLeft className="w-5 h-5" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

export default BackButton;