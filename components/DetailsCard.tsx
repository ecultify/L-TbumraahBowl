'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [showOtpBoxes, setShowOtpBoxes] = useState(false);
  const [remainingTime, setRemainingTime] = useState(59);
  const [otpValues, setOtpValues] = useState<string[]>(() => Array(OTP_BOX_COUNT).fill(''));
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setRemainingTime(59);
    setIsTimerActive(false);
  }, []);

  const handleGetOtp = useCallback(() => {
    setShowOtpBoxes(true);
    setIsTimerActive(true);
    setRemainingTime(59);
    setOtpValues(Array(OTP_BOX_COUNT).fill(''));
  }, []);

  const handleResend = useCallback(() => {
    setRemainingTime(59);
    setIsTimerActive(true);
    setOtpValues(Array(OTP_BOX_COUNT).fill(''));
  }, []);

  const handleOtpChange = useCallback((index: number, value: string) => {
    if (value.length > 1) return;
    setOtpValues((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });

    if (value && index < OTP_BOX_COUNT - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  }, []);

  const isSubmitDisabled = loading || submitting;

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      if (!onSubmit) return;
      event.preventDefault();

      const trimmedName = name.trim();
      if (!trimmedName) {
        setError('Please enter your full name.');
        return;
      }

      setSubmitting(true);
      setError(null);

      try {
        await onSubmit({
          name: trimmedName,
          phone: phone.trim() || undefined,
          consent,
          otpValues,
        });
        setName('');
        setPhone('');
        setConsent(false);
        setShowOtpBoxes(false);
        resetOtp();
      } catch (submitError: any) {
        const message = submitError?.message || 'Something went wrong. Please try again.';
        setError(message);
      } finally {
        setSubmitting(false);
      }
    },
    [consent, name, onSubmit, otpValues, phone, resetOtp]
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
          {isSubmitDisabled ? 'Submitting…' : submitLabel}
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
  }, [isSubmitDisabled, onSubmit, submitHref, submitLabel]);

  const CardContent = (
    <>
      <div className="mb-6 text-center">
        {/* ALMOST THERE headline with woosh */}
        <div
          style={{
            position: "relative",
            fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
            fontWeight: 800,
            fontStyle: "italic",
            fontSize: "clamp(16px, 4vw, 19.65px)",
            color: "#000000",
            lineHeight: 1.1,
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
        >
          <span style={{ position: "relative" }}>
            <img
              src="/images/newhomepage/woosh.svg"
              alt=""
              aria-hidden
              style={{
                position: "absolute",
                left: -22,
                top: "40%",
                transform: "translateY(-50%)",
                height: 18,
                filter: "brightness(0) saturate(100%)"
              }}
            />
            ALMOST
          </span>
          <span>THERE</span>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
            fontWeight: 400,
            fontStyle: "normal",
            fontSize: "clamp(11px, 2.5vw, 12px)",
            lineHeight: "14px",
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
            disabled={isSubmitDisabled && !!onSubmit}
            required={!!onSubmit}
          />
        </div>
      </div>

      <div className="mb-4 flex justify-center">
        <div className="w-full max-w-xs md:max-w-sm flex gap-2">
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
              onChange={(event) => setPhone(event.target.value)}
              className="w-full h-full pl-12 pr-4 text-black placeholder-black bg-white border border-gray-400 focus:border-blue-500 focus:outline-none"
              style={{
                borderRadius: '20px',
                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                fontWeight: '400',
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                color: 'black'
              }}
              disabled={isSubmitDisabled && !!onSubmit}
            />
          </div>

          <button
            type="button"
            onClick={handleGetOtp}
            disabled={(showOtpBoxes && isTimerActive) || (isSubmitDisabled && !!onSubmit)}
            className="text-black font-bold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            style={{
              minWidth: '70px',
              height: '40px',
              backgroundColor: '#FFC315',
              borderRadius: '20px',
              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
              fontWeight: '700',
              fontSize: 'clamp(10px, 2vw, 12px)',
              color: 'black',
              padding: '0 12px'
            }}
          >
            {showOtpBoxes && isTimerActive ? 'OTP Sent' : 'Get OTP'}
          </button>
        </div>
      </div>

      {showOtpBoxes && (
        <div className="mb-4">
          <div className="flex gap-2 justify-center mb-3">
            {otpValues.map((value, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength={1}
                value={value}
                onChange={(event) => handleOtpChange(index, event.target.value)}
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
                disabled={isSubmitDisabled && !!onSubmit}
              />
            ))}
          </div>

          <div className="flex justify-between items-center text-black text-xs" style={{ fontFamily: "'FrutigerLT Pro', Inter, sans-serif", fontWeight: '400', color: 'black' }}>
            <span>Remaining time: {remainingTime}s</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={isTimerActive || (isSubmitDisabled && !!onSubmit)}
              className="text-black underline disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-600"
              style={{ fontFamily: "'FrutigerLT Pro', Inter, sans-serif", fontWeight: '400', color: 'black' }}
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
              className="mt-1 w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500 flex-shrink-0"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              disabled={isSubmitDisabled && !!onSubmit}
            />
            <span
              className="text-black text-sm leading-relaxed"
              style={{
                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                fontWeight: '400',
                fontSize: 'clamp(10px, 2.5vw, 12px)',
                lineHeight: '1.5',
                color: 'black'
              }}
            >
              I agree to the terms and conditions and privacy policy. I consent to receive communications about this service.
            </span>
          </label>
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

  return (
    <div className={`${className} p-6 relative overflow-hidden`}>
      {onSubmit ? (
        <form onSubmit={handleSubmit} noValidate>
          {CardContent}
        </form>
      ) : (
        CardContent
      )}
    </div>
  );
}

export type { DetailsCardSubmitPayload };

