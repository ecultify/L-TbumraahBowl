'use client';

import { useState, useEffect } from 'react';

export function usePageProtection(requiredPage: string) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const otpVerified = window.sessionStorage.getItem('otpVerified');
    const detailsCompleted = window.sessionStorage.getItem('detailsCompleted');
    const isReturningUser = window.sessionStorage.getItem('isReturningUser');

    console.log(`[Page Protection] Checking access for: ${requiredPage}`, {
      otpVerified,
      detailsCompleted,
      isReturningUser
    });

    // Check OTP verification
    const hasOtpAccess = otpVerified === 'true' && detailsCompleted === 'true';

    if (!hasOtpAccess) {
      console.warn(`[Page Protection] ❌ No OTP access for ${requiredPage}`);
      setIsAuthorized(false);
      return;
    }

    // Returning users can access analyze page and download-video directly
    if (isReturningUser === 'true' && (requiredPage === 'analyze' || requiredPage === 'download-video')) {
      console.log(`[Page Protection] ✅ Returning user accessing ${requiredPage} page`);
      setIsAuthorized(true);
      updateUserFlow(requiredPage);
      return;
    }

    // Check sequential flow
    const currentFlow = window.sessionStorage.getItem('userFlow') || '';
    const authorized = isFlowValid(requiredPage, currentFlow);

    console.log(`[Page Protection] Flow check for ${requiredPage}:`, {
      currentFlow,
      authorized
    });

    setIsAuthorized(authorized);

    // Update flow if authorized
    if (authorized) {
      updateUserFlow(requiredPage);
    }
  }, [requiredPage]);

  return isAuthorized;
}

function isFlowValid(requiredPage: string, currentFlow: string): boolean {
  // Define essential prerequisites for each page
  // These are the MINIMUM required steps, not all sequential steps
  const prerequisites: { [key: string]: string[] } = {
    'details': [], // No prerequisites
    'record-upload': ['details'],
    'video-preview': ['details', 'record-upload'],
    'analyze': ['details', 'record-upload'], // video-preview is optional
    'download-video': ['details', 'record-upload', 'analyze'],
    'leaderboard': ['details', 'record-upload', 'analyze'], // Can access after analyze
    'gallery': ['details', 'record-upload', 'analyze'] // Can access after analyze
  };

  const requiredSteps = prerequisites[requiredPage];
  
  if (!requiredSteps) {
    console.warn(`[Page Protection] Unknown page: ${requiredPage}`);
    return false;
  }

  // Check if user has completed all essential prerequisites
  for (const step of requiredSteps) {
    if (!currentFlow.includes(step)) {
      console.warn(`[Page Protection] Missing required step: ${step} for ${requiredPage}`);
      return false;
    }
  }

  return true;
}

function updateUserFlow(page: string) {
  const currentFlow = window.sessionStorage.getItem('userFlow') || '';
  if (!currentFlow.includes(page)) {
    const newFlow = currentFlow ? `${currentFlow},${page}` : page;
    window.sessionStorage.setItem('userFlow', newFlow);
    console.log(`[Page Protection] Updated flow: ${newFlow}`);
  }
}

