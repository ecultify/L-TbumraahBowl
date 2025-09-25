'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Custom hook for intelligent back navigation
 * Handles browser history and fallback routes properly
 */
export function useBackNavigation(fallbackRoute: string = '/') {
  const router = useRouter();

  const goBack = useCallback(() => {
    // Check if there's history to go back to
    if (typeof window !== 'undefined') {
      // Check if we have navigation history in this session
      const hasHistory = window.history.length > 1;
      
      // Check if the user came from another page in our app
      const referrer = document.referrer;
      const isInternalReferrer = referrer && (
        referrer.includes(window.location.origin) || 
        referrer.includes('localhost') ||
        referrer === ''
      );

      // If we have history and came from within our app, use browser back
      if (hasHistory && isInternalReferrer && window.history.length > 2) {
        window.history.back();
      } else {
        // Otherwise, navigate to the fallback route
        router.push(fallbackRoute);
      }
    } else {
      // Server-side fallback
      router.push(fallbackRoute);
    }
  }, [router, fallbackRoute]);

  return { goBack };
}

/**
 * Get the appropriate back route based on the current page
 */
export function getBackRoute(currentPath: string): string {
  // Define the navigation flow
  const navigationFlow: Record<string, string> = {
    '/participate': '/',
    '/instructions': '/',
    '/record-upload': '/participate',
    '/video-preview': '/record-upload',
    '/analyzing': '/video-preview',
    '/quick-analysis': '/analyzing',
    '/analyze': '/analyzing',
    '/details': '/',
    '/about': '/',
    '/leaderboard': '/',
  };

  return navigationFlow[currentPath] || '/';
}