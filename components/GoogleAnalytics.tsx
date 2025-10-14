'use client';

import Script from 'next/script';

/**
 * Google Analytics Component
 * 
 * Usage: Add your GA4 Measurement ID to .env.local:
 * NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
 */

export default function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  // Don't load GA if no measurement ID is provided
  if (!measurementId) {
    console.log('Google Analytics: No measurement ID found');
    return null;
  }

  return (
    <>
      {/* Google Analytics Script */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

/**
 * Custom event tracking helper functions
 * Import these in your components to track specific events
 */

// Track page views
export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

// Track custom events
export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, eventParams);
  }
};

// Specific event trackers for your app
export const analytics = {
  // Track video upload
  videoUploaded: (fileSize: number, duration: number) => {
    trackEvent('video_uploaded', {
      file_size: fileSize,
      video_duration: duration,
    });
  },

  // Track analysis completion
  analysisCompleted: (score: number, similarity: number) => {
    trackEvent('analysis_completed', {
      accuracy_score: score,
      similarity_percent: similarity,
    });
  },

  // Track video rendering
  videoRendered: (renderTime: number) => {
    trackEvent('video_rendered', {
      render_time_seconds: renderTime,
    });
  },

  // Track downloads
  downloadStarted: (fileType: 'composite_card' | 'video') => {
    trackEvent('download_started', {
      file_type: fileType,
    });
  },

  // Track WhatsApp sharing
  whatsappShared: () => {
    trackEvent('whatsapp_shared');
  },

  // Track button clicks
  buttonClicked: (buttonName: string, location: string) => {
    trackEvent('button_clicked', {
      button_name: buttonName,
      page_location: location,
    });
  },

  // Track user registration/OTP
  otpRequested: (phoneNumber: string) => {
    trackEvent('otp_requested', {
      phone_number_hash: phoneNumber.slice(-4), // Only last 4 digits for privacy
    });
  },

  otpVerified: () => {
    trackEvent('otp_verified');
  },

  // Track retries
  userRetried: (retryCount: number) => {
    trackEvent('user_retried', {
      retry_count: retryCount,
    });
  },

  // Track errors
  errorOccurred: (errorType: string, errorMessage: string) => {
    trackEvent('error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
    });
  },
};

