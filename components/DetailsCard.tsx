'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { requestOtp, verifyOtp } from '@/lib/utils/otpService';
import { normalizeVideoUrl } from '@/lib/utils/urlNormalization';
import { Phone, User } from 'lucide-react';

interface DetailsCardSubmitPayload {
  name: string;
  phone?: string;
  consent: boolean;
  otpValues: string[];
}

interface DetailsCardProps {
  submitLabel?: string;
  submitHref?: string;
  onSubmit?: (payload: DetailsCardSubmitPayload) => Promise<void> | void;
  loading?: boolean;
  className?: string;
}

const OTP_BOX_COUNT = 6;

export function DetailsCard({
  submitLabel = 'View Analysis',
  submitHref,
  onSubmit,
  loading = false,
  className = '',
}: DetailsCardProps) {
  // OTP flow is now ENABLED with 1-minute timeout
  const OTP_DISABLED = false;
  const [showOtpBoxes, setShowOtpBoxes] = useState(false);
  const [remainingTime, setRemainingTime] = useState(60); // 1 minute = 60 seconds
  const [otpValues, setOtpValues] = useState<string[]>(() => Array(OTP_BOX_COUNT).fill(''));
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false); // Requires OTP verification

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isTimerActive) {
      return;
    }

    if (remainingTime <= 0) {
      setIsTimerActive(false);
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingTime((time) => time - 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isTimerActive, remainingTime]);

  const resetOtp = useCallback(() => {
    setOtpValues(Array(OTP_BOX_COUNT).fill(''));
    setRemainingTime(60); // 1 minute = 60 seconds
    setIsTimerActive(false);
    setOtpVerified(false);
  }, []);

  // Removed handleGetOtp simulation function - now using handleGetOtpReal

  const handleResend = useCallback(async () => {
    if (!phone || phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    try {
      setOtpSending(true);
      setError(null);
      if (OTP_DISABLED) {
        console.log('[OTP] Resend suppressed (testing mode enabled)');
      } else {
        await requestOtp(phone);
      }
      setShowOtpBoxes(true);
      setIsTimerActive(true);
      setRemainingTime(60) // 1 minute;
      setOtpValues(Array(OTP_BOX_COUNT).fill(''));
      setOtpVerified(false);
      if (!OTP_DISABLED && typeof window !== 'undefined') alert('OTP sent successfully');
      if (OTP_DISABLED) console.log('[OTP] Showing OTP boxes without sending (testing mode)');
    } catch (e: any) {
      const msg = e?.message || 'Failed to send OTP';
      setError(msg);
      if (typeof window !== 'undefined') alert(msg);
    } finally {
      setOtpSending(false);
    }
  }, [phone]);

  const handleGetOtpReal = useCallback(async () => {
    if (!phone || phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    try {
      setOtpSending(true);
      setError(null);

      // Check if phone exists in database (returning user check)
      console.log('[Phone Lookup] Checking if phone exists in database:', phone);
      try {
        const lookupResponse = await fetch('/api/lookup-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone })
        });

        const lookupData = await lookupResponse.json();
        console.log('[Phone Lookup] Result:', lookupData);

        if (lookupData.exists) {
          // Store existing record info in session
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('existingRecordId', lookupData.recordId);
            window.sessionStorage.setItem('isReturningUser', 'true');
            window.sessionStorage.setItem('hasCompositeCard', lookupData.hasCompositeCard.toString());
            window.sessionStorage.setItem('hasVideo', lookupData.hasVideo.toString());
            window.sessionStorage.setItem('existingSimilarityPercent', lookupData.similarityPercent?.toString() || '0');
            
            // 🆕 Store composite card record ID for UPDATE operations
            if (lookupData.compositeCardRecordId) {
              window.sessionStorage.setItem('existingCompositeCardRecordId', lookupData.compositeCardRecordId);
              console.log('[Phone Lookup] Stored composite card record ID:', lookupData.compositeCardRecordId);
            }
            
            if (lookupData.hasCompositeCard) {
              const normalizedCompositeUrl = normalizeVideoUrl(lookupData.compositeCardUrl) || lookupData.compositeCardUrl;
              window.sessionStorage.setItem('existingCompositeCardUrl', normalizedCompositeUrl);
            }
            if (lookupData.hasVideo) {
              const normalizedVideoUrl = normalizeVideoUrl(lookupData.videoUrl) || lookupData.videoUrl;
              window.sessionStorage.setItem('existingVideoUrl', normalizedVideoUrl);
              console.log('[Phone Lookup] Stored normalized video URL');
            }
            
            console.log('[Phone Lookup] Returning user detected - stored session data');
            console.log('[Phone Lookup] Similarity score:', lookupData.similarityPercent);
          }
        } else {
          // Clear any existing session flags for new users
          if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem('isReturningUser');
            window.sessionStorage.removeItem('existingRecordId');
            window.sessionStorage.removeItem('existingCompositeCardRecordId'); // 🆕 Clear composite card record ID too
            window.sessionStorage.removeItem('hasCompositeCard');
            window.sessionStorage.removeItem('hasVideo');
            window.sessionStorage.removeItem('existingCompositeCardUrl');
            window.sessionStorage.removeItem('existingVideoUrl');
            window.sessionStorage.removeItem('existingSimilarityPercent');
            console.log('[Phone Lookup] New user - cleared session flags');
          }
        }
      } catch (lookupError) {
        console.error('[Phone Lookup] Error checking phone:', lookupError);
        // Continue with OTP flow even if lookup fails
      }

      // ⚠️ Rate limiting disabled - proceeding directly with OTP send
      if (OTP_DISABLED) {
        console.log('[OTP] Send suppressed (testing mode enabled)');
      } else {
        await requestOtp(phone);
      }

      setShowOtpBoxes(true);
      setIsTimerActive(true);
      setRemainingTime(60) // 1 minute;
      setOtpValues(Array(OTP_BOX_COUNT).fill(''));
      setOtpVerified(false);
      if (!OTP_DISABLED && typeof window !== 'undefined') alert('OTP sent successfully');
      if (OTP_DISABLED) console.log('[OTP] Showing OTP boxes without sending (testing mode)');
    } catch (e) {
      const msg = (e as any)?.message || 'Failed to send OTP';
      setError(msg);
      if (typeof window !== 'undefined') alert(msg);
    } finally {
      setOtpSending(false);
    }
  }, [phone]);

  const handleOtpChange = useCallback((index: number, value: string) => {
    if (value.length > 1) return;
    const newOtpValues = [...otpValues];
    newOtpValues[index] = value;
    setOtpValues(newOtpValues);

    if (value && index < OTP_BOX_COUNT - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      (nextInput as HTMLInputElement | null)?.focus();
    }
    // No auto-verify - user must click "Verify OTP" button
  }, [otpValues]);

  const handleVerifyOtp = useCallback(async () => {
    const otpString = otpValues.join('');
    
    if (otpString.length !== 6) {
      setError('Please enter complete 6-digit OTP');
      return;
    }

    if (!phone || phone.length !== 10) {
      setError('Enter a valid phone number first');
      return;
    }

    try {
      setOtpSending(true);
      setError(null);
      
      if (OTP_DISABLED) {
        console.log('[OTP] Verify suppressed (testing mode). Entered:', otpString);
        setOtpVerified(true);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('otpVerified', 'true');
        }

      } else {
        await verifyOtp(phone, otpString);
        setOtpVerified(true);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('otpVerified', 'true');
          alert('OTP verified successfully!');
        }
      }
    } catch (e) {
      setOtpVerified(false);
      const msg = (e as any)?.message || 'Invalid OTP';
      setError(msg);
      if (typeof window !== 'undefined') alert(msg);
    } finally {
      setOtpSending(false);
    }
  }, [otpValues, phone]);

  const isSubmitDisabled = loading || submitting || !otpVerified || !consent;
  const isFormDisabled = loading || submitting; // Don't disable form fields, only submit button

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      if (!onSubmit) return;
      event.preventDefault();

      console.log('🔵 [SUBMIT] Form submission started');
      console.log('📋 [SUBMIT] Form data:', { name, phone, consent, otpVerified, otpValues });

      // Validation
      const trimmedName = name.trim();
      if (!trimmedName) {
        console.log('❌ [SUBMIT] Validation failed - name is empty');
        setError('Please enter your full name.');
        if (typeof window !== 'undefined') {
          alert('Please enter your full name.');
        }
        return;
      }

      if (!phone || phone.length !== 10) {
        console.log('❌ [SUBMIT] Validation failed - invalid phone:', phone?.length);
        setError('Please enter a valid 10-digit phone number.');
        if (typeof window !== 'undefined') {
          alert('Please enter a valid 10-digit phone number.');
        }
        return;
      }

      if (!consent) {
        console.log('❌ [SUBMIT] Validation failed - consent not accepted');
        setError('Please accept the Terms & Conditions to proceed.');
        if (typeof window !== 'undefined') {
          alert('Please accept the Terms & Conditions to proceed.');
        }
        return;
      }
      // OTP verification is now REQUIRED
      if (!otpVerified) {
        console.log('❌ [SUBMIT] Validation failed - OTP not verified');
        setError("Please verify OTP before proceeding.");
        if (typeof window !== "undefined") alert("Please verify OTP before proceeding.");
        return;
      }
      setSubmitting(true);
      setError(null);

      try {
        const payload = {
          name: trimmedName,
          phone: phone.trim(),
          consent,
          otpValues,
        };
        console.log('📤 [SUBMIT] Calling onSubmit with payload:', payload);
        
        await onSubmit(payload);
        
        console.log('✅ [SUBMIT] onSubmit completed successfully');
        
        // Mark details as completed in sessionStorage
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('detailsCompleted', 'true');
          window.sessionStorage.setItem('playerName', trimmedName);
          window.sessionStorage.setItem('playerPhone', phone.trim());
          window.sessionStorage.setItem('otpVerifiedForBowling', otpVerified ? 'true' : 'false');
          console.log('📝 [SUBMIT] Details marked as completed in sessionStorage');
          console.log('📝 [SUBMIT] OTP verification status:', otpVerified);
        }
        
        setName('');
        setPhone('');
        setConsent(false);
        setShowOtpBoxes(false);
        resetOtp();
      } catch (submitError: any) {
        console.error('❌ [SUBMIT] Error:', submitError);
        console.error('❌ [SUBMIT] Error message:', submitError.message);
        const message = submitError?.message || 'Something went wrong. Please try again.';
        setError(message);
        if (typeof window !== 'undefined') {
          alert(message);
        }
      } finally {
        setSubmitting(false);
        console.log('🔵 [SUBMIT] Form submission completed');
      }
    },
    [consent, name, onSubmit, otpValues, otpVerified, phone, resetOtp]
  );

  const renderSubmitControl = useMemo(() => {
    if (onSubmit) {
      return (
        <button
          type="submit"
          className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 disabled:opacity-60 w-full max-w-xs md:max-w-sm"
          style={{
            height: '41px',
            backgroundColor: '#FFC315',
            borderRadius: '20px',
            fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
            fontWeight: '700',
            fontSize: 'clamp(14px, 3vw, 16px)',
            color: 'black',
          }}
          disabled={isSubmitDisabled}
        >
          {submitting ? 'Submitting…' : submitLabel}
        </button>
      );
    }

    if (submitHref) {
      return (
        <Link
          href={submitHref}
          className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 w-full max-w-xs md:max-w-sm"
          style={{
            height: '41px',
            backgroundColor: '#FFC315',
            borderRadius: '20px',
            fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
            fontWeight: '700',
            fontSize: 'clamp(14px, 3vw, 16px)',
            color: 'black',
          }}
        >
          {submitLabel}
        </Link>
      );
    }

    return null;
  }, [isSubmitDisabled, submitting, onSubmit, submitHref, submitLabel]);

  const CardContent = (
    <>
      <div className="mb-6 text-center" style={{ marginTop: '30px' }}>
        {/* ALMOST THERE headline image */}
        <div style={{ marginBottom: 6, display: "flex", justifyContent: "center" }}>
          <img
            src="/images/newhomepage/Almost there.png"
            alt="Almost There"
            style={{ width: "85%", maxWidth: "360px", height: "auto" }}
          />
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
            fontWeight: 400,
            fontStyle: "normal",
            fontSize: "18px",
            lineHeight: "16px",
            color: "#000000",
          }}
        >
          Fill in your details so we can send you your personalised bowling analysis.
        </p>
      </div>

      <div className="mb-4 flex justify-center">
        <div
          className="relative w-full max-w-xs md:max-w-sm"
          style={{
            height: '40px'
          }}
        >
          <User
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black"
            size={20}
          />
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full h-full pl-12 pr-4 text-black placeholder-black bg-white border border-gray-400 focus:border-blue-500 focus:outline-none"
            style={{
              borderRadius: '20px',
              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
              fontWeight: '400',
              fontSize: 'clamp(12px, 2.5vw, 14px)',
              color: 'black'
            }}
            disabled={isFormDisabled && !!onSubmit}
            required={!!onSubmit}
          />
        </div>
      </div>

      {/* Phone Number and Get OTP/Verify OTP Button in Same Row */}
      <div className="mb-4 flex justify-center">
        <div className="flex gap-2 w-full max-w-xs md:max-w-sm">
          {/* Phone Input Field */}
          <div
            className="relative flex-1"
            style={{
              height: '40px'
            }}
          >
            <Phone
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black"
              size={20}
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={phone}
              onChange={(event) => {
                const value = event.target.value.replace(/\D/g, ''); // Only numbers
                if (value.length <= 10) {
                  setPhone(value);
                }
              }}
              maxLength={10}
              className="w-full h-full pl-12 pr-4 text-black placeholder-black bg-white border border-gray-400 focus:border-blue-500 focus:outline-none"
              style={{
                borderRadius: '20px',
                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                fontWeight: '400',
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                color: 'black'
              }}
              disabled={isFormDisabled && !!onSubmit}
              required={!!onSubmit}
            />
          </div>

          {/* Get OTP / Verify OTP Button */}
          <button
            type="button"
            onClick={showOtpBoxes ? handleVerifyOtp : handleGetOtpReal}
            disabled={!phone || phone.length !== 10 || otpSending || (showOtpBoxes && otpValues.join('').length !== 6) || (isFormDisabled && !!onSubmit)}
            className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 disabled:opacity-60 flex-shrink-0"
            style={{
              height: '40px',
              width: '95px',
              backgroundColor: '#FFC315',
              borderRadius: '20px',
              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
              fontWeight: '700',
              fontSize: '11px',
              cursor: (!phone || phone.length !== 10 || otpSending || (showOtpBoxes && otpValues.join('').length !== 6)) ? 'not-allowed' : 'pointer'
            }}
          >
            {otpSending ? 'Sending...' : showOtpBoxes ? 'Verify OTP' : 'Get OTP'}
          </button>
        </div>
      </div>

      {/* OTP Input Boxes */}
      {showOtpBoxes && (
        <div className="mb-4">
          <div className="flex gap-2 justify-center mb-3">
            {otpValues.map((value, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={value}
                onChange={(event) => {
                  const val = event.target.value.replace(/\D/g, ''); // Only numbers
                  handleOtpChange(index, val);
                }}
                className="text-center text-black font-bold border-0 focus:outline-none focus:ring-2 focus:ring-blue-300"
                style={{
                  width: '34.06px',
                  height: '34.06px',
                  borderRadius: '7.57px',
                  backgroundColor: 'white',
                  fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                  fontWeight: '400',
                  fontSize: 'clamp(14px, 3vw, 16px)',
                  color: 'black'
                }}
                disabled={isFormDisabled && !!onSubmit}
                title={OTP_DISABLED ? 'Testing mode: OTP not verified' : undefined}
              />
            ))}
          </div>

          <div className="flex justify-between items-center text-black text-xs" style={{ fontFamily: "'FrutigerLT Pro', Inter, sans-serif", fontWeight: '400', color: 'black' }}>
            <span>Remaining time: {remainingTime}s</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={isTimerActive || (isFormDisabled && !!onSubmit)}
              className="text-black underline disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-600"
              style={{ fontFamily: "'FrutigerLT Pro', Inter, sans-serif", fontWeight: '400', color: 'black' }}
              title={OTP_DISABLED ? 'Testing mode: Resend suppressed' : undefined}
            >
              Didn't get the code? Resend
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 flex justify-center">
        <div className="w-full max-w-xs md:max-w-sm">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 mt-1 rounded border-gray-400 text-blue-600 focus:ring-blue-500 flex-shrink-0"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              disabled={isFormDisabled && !!onSubmit}
            />
            <span
              className="text-black text-sm leading-relaxed"
              style={{
                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                fontWeight: '400',
                fontSize: 'clamp(10px, 2.5vw, 12px)',
                lineHeight: '1.4',
                color: 'black'
              }}
            >
              I hereby consent to L&T Finance, along with its affiliates, representatives, and authorized partners, to use, edit, adapt, reproduce, and publish my photographs, videos, audio recordings, contact details, social media handles, and any AI-generated or campaign-related content featuring me or submitted by me, in connection with "Bowl kar Bumrah Ki Speed Par" campaign. Such content may be used for marketing, promotional, publicity, and other commercial purposes across any media platforms, including but not limited to digital, print, outdoor, and broadcast, without any compensation, prior notice, further approval, or consequences. I understand that LTF will exercise this right responsibly and in good faith.
            </span>
          </label>
          <div className="mt-2 flex items-start gap-3">
            <div className="w-4 flex-shrink-0"></div>
            <span
              style={{
                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                fontWeight: '400',
                fontSize: 'clamp(10px, 2.5vw, 12px)',
                color: 'black'
              }}
            >
              By continuing, I accept the{' '}
              <Link
                href="/terms-and-conditions"
                className="underline hover:no-underline"
                style={{
                  fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                  fontWeight: '400',
                  fontSize: 'clamp(10px, 2.5vw, 12px)',
                  color: '#0066cc'
                }}
              >
                Terms & Conditions
              </Link>
            </span>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center mb-4" style={{ fontFamily: "'FrutigerLT Pro', Inter, sans-serif", fontWeight: '400', color: 'black' }}>
          {error}
        </p>
      )}

      <div className="flex justify-center">
        {renderSubmitControl}
      </div>
    </>
  );
  const termsModal = showTermsModal && isMounted && (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowTermsModal(false);
      }}
    >
      <div
        className="relative bg-white mx-4"
        style={{
          width: '353px',
          height: '319px',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 32px)',
          borderRadius: '20px',
          border: '0.8px solid #000000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '24px',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Header with terms.png */}
        <div className="mb-4 flex-shrink-0">
          <img
            src="/images/newhomepage/terms.png"
            alt="Terms & Conditions"
            className="w-auto h-auto"
            style={{ maxHeight: '40px' }}
          />
        </div>

        {/* Terms Text */}
        <div
          className="flex-1 overflow-y-auto mb-4"
          style={{
            fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
            fontWeight: '400',
            fontSize: '12px',
            lineHeight: '1.4',
            color: '#000000',
            textAlign: 'left',
            width: '100%',
            padding: '0 4px'
          }}
        >
          I hereby consent to L&T Finance, along with its affiliates, representatives, and authorized partners, to use, edit, adapt, reproduce, and publish my photographs, videos, audio recordings, contact details, social media handles, and any AI-generated or campaign-related content featuring me or submitted by me, in connection with "Bowl kar Bumrah Ki Speed Par" campaign. Such content may be used for marketing, promotional, publicity, and other commercial purposes across any media platforms, including but not limited to digital, print, outdoor, and broadcast, without any compensation, prior notice, further approval, or consequences. I understand that LTF will exercise this right responsibly and in good faith.
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowTermsModal(false);
            }}
            className="flex-1 font-bold transition-all duration-300 transform hover:scale-105"
            style={{
              height: '36px',
              backgroundColor: '#CCEAF7',
              borderRadius: '22.89px',
              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
              fontWeight: '700',
              fontSize: '14px',
              color: '#000000',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setConsent(true);
              setShowTermsModal(false);
            }}
            className="flex-1 font-bold transition-all duration-300 transform hover:scale-105"
            style={{
              height: '36px',
              backgroundColor: '#FFCA04',
              borderRadius: '22.89px',
              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
              fontWeight: '700',
              fontSize: '14px',
              color: '#000000',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className={`${className} p-6 relative overflow-hidden`}>
        {onSubmit ? (
          <form onSubmit={handleSubmit} noValidate>
            {CardContent}
          </form>
        ) : (
          CardContent
        )}
      </div>

      {/* Render modal using portal to document.body */}
      {isMounted && typeof document !== 'undefined' && termsModal && 
        createPortal(termsModal, document.body)
      }
    </>
  );
}

export type { DetailsCardSubmitPayload };





