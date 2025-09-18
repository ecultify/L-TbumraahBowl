'use client';

import Link from 'next/link';
import { ArrowLeft, User, Phone } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useIntersectionObserver } from '../../hooks/use-intersection-observer';

export default function DetailsPage() {
  const [showOtpBoxes, setShowOtpBoxes] = useState(false);
  const [remainingTime, setRemainingTime] = useState(59);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Intersection observers for animations
  const formSection = useIntersectionObserver({ threshold: 0.1, freezeOnceVisible: true });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime((time) => time - 1);
      }, 1000);
    } else if (remainingTime === 0) {
      setIsTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, remainingTime]);

  const handleGetOtp = () => {
    setShowOtpBoxes(true);
    setIsTimerActive(true);
    setRemainingTime(59);
  };

  const handleResend = () => {
    setRemainingTime(59);
    setIsTimerActive(true);
    setOtpValues(['', '', '', '', '', '']);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1) {
      const newOtpValues = [...otpValues];
      newOtpValues[index] = value;
      setOtpValues(newOtpValues);
      
      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col" 
      style={{ 
        backgroundImage: 'url(/frontend-images/homepage/bowlbg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Header with Back Button */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-6 px-4">
        <Link 
          href="/"
          className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 pt-20 pb-12 px-4 flex items-center justify-center">
        {/* Glass Box Form Section */}
        <div className="max-w-md w-full" ref={formSection.ref}>
          <div 
            className={`p-6 backdrop-blur-md relative overflow-hidden animate-fadeInUp ${formSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
            }}
          >
            {/* Title Section */}
            <div className="mb-6 text-center">
              <h1 
                className="text-white mb-1"
                style={{
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '24px',
                  lineHeight: '1.2'
                }}
              >
                Your details
              </h1>
              <p 
                className="text-white"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '12px',
                  lineHeight: '1.3'
                }}
              >
                Complete your submission
              </p>
            </div>

            {/* Full Name Input */}
            <div className="mb-4 flex justify-center">
              <div 
                className="relative"
                style={{
                  width: '308px',
                  height: '40px'
                }}
              >
                <User 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full h-full pl-12 pr-4 text-black placeholder-gray-500 bg-white border border-gray-400 focus:border-blue-500 focus:outline-none"
                  style={{
                    borderRadius: '20px',
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Phone Number Input with OTP Button */}
            <div className="mb-4 flex justify-center">
              <div className="flex gap-2">
                <div 
                  className="relative"
                  style={{
                    width: '223px',
                    height: '40px'
                  }}
                >
                  <Phone 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                    size={20}
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    className="w-full h-full pl-12 pr-4 text-black placeholder-gray-500 bg-white border border-gray-400 focus:border-blue-500 focus:outline-none"
                    style={{
                      borderRadius: '20px',
                      fontFamily: 'Frutiger, Inter, sans-serif',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <button
                  onClick={handleGetOtp}
                  disabled={showOtpBoxes && isTimerActive}
                  className="text-black font-bold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    width: '82px',
                    height: '40px',
                    backgroundColor: '#FFC315',
                    borderRadius: '20px',
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '700',
                    fontSize: '12px',
                    color: 'black'
                  }}
                >
                  Get OTP
                </button>
              </div>
            </div>

            {/* OTP Section */}
            {showOtpBoxes && (
              <div className="mb-4">
                {/* OTP Input Boxes */}
                <div className="flex gap-2 justify-center mb-3">
                  {otpValues.map((value, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      maxLength={1}
                      value={value}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      className="text-center text-black font-bold border-0 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      style={{
                        width: '34.06px',
                        height: '34.06px',
                        borderRadius: '7.57px',
                        backgroundColor: 'white',
                        fontFamily: 'Frutiger, Inter, sans-serif',
                        fontSize: '16px'
                      }}
                    />
                  ))}
                </div>
                
                {/* Timer and Resend */}
                <div className="flex justify-between items-center text-white text-xs">
                  <span style={{ fontFamily: 'Inter, sans-serif' }}>
                    Remaining time: {remainingTime}s
                  </span>
                  <button
                    onClick={handleResend}
                    disabled={isTimerActive}
                    className="text-white underline disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-300"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Didn't get the code? Resend
                  </button>
                </div>
              </div>
            )}

            {/* Consent Checkbox */}
            <div className="mb-6 flex justify-center">
              <div style={{ width: '308px' }}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <span 
                    className="text-white text-sm leading-relaxed"
                    style={{
                      fontFamily: 'Frutiger, Inter, sans-serif',
                      fontSize: '12px',
                      lineHeight: '1.5'
                    }}
                  >
                    I agree to the terms and conditions and privacy policy. I consent to receive communications about this service.
                  </span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <Link 
                href="/participate"
                className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105"
                style={{
                  backgroundColor: '#FFC315',
                  borderRadius: '20px',
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '16px',
                  color: 'black',
                  width: '261px',
                  height: '41px'
                }}
              >
                Submit
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full bg-black px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 max-w-6xl mx-auto">
          {/* Copyright Text */}
          <div className="text-left">
            <p 
              className="text-white text-xs"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '400',
                fontSize: '10px',
                lineHeight: '1.4'
              }}
            >
              © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833
            </p>
          </div>
          
          {/* Social Media Icons */}
          <div className="flex items-center gap-3">
            <span 
              className="text-white text-xs mr-2"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '400',
                fontSize: '10px'
              }}
            >
              Connect with us
            </span>
            
            {/* Social Icons */}
            <div className="flex gap-3">
              {/* Facebook */}
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              
              {/* Instagram */}
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              
              {/* Twitter */}
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </div>
              
              {/* YouTube */}
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.30 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
