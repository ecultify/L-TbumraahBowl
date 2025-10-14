'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook to protect pages that require OTP verification
 * Redirects to /details if OTP is not verified
 */
export function useOtpProtection() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const otpVerified = window.sessionStorage.getItem('otpVerified');
    const detailsCompleted = window.sessionStorage.getItem('detailsCompleted');
    
    console.log('[OTP Protection] Checking verification status:', {
      otpVerified,
      detailsCompleted
    });

    // Redirect to details page if OTP is not verified
    if (otpVerified !== 'true' || detailsCompleted !== 'true') {
      console.warn('[OTP Protection] ❌ OTP not verified or details not completed - redirecting to /details');
      router.replace('/details');
    } else {
      console.log('[OTP Protection] ✅ OTP verified and details completed');
    }
  }, [router]);
}

