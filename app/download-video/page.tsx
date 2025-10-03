'use client';

import React from 'react';
import Link from 'next/link';
import { GlassBackButton } from '@/components/GlassBackButton';

export default function DownloadVideoPage() {
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load video URL from sessionStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedVideoUrl = window.sessionStorage.getItem('generatedVideoUrl');
      if (storedVideoUrl) {
        setVideoUrl(storedVideoUrl);
        console.log('📹 Video URL loaded:', storedVideoUrl);
      } else {
        console.warn('⚠️ No video URL found in sessionStorage');
      }
      setIsLoading(false);
    }
  }, []);

  const handleDownloadVideo = () => {
    if (!videoUrl) {
      alert('No video available to download');
      return;
    }

    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `bowling-analysis-${new Date().getTime()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('⬇️ Video download initiated');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4">Loading video...</p>
        </div>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No video found.</p>
          <Link href="/record-upload" className="text-blue-600 hover:underline">
            Go back to upload a video
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Layout */}
      <div
        className="md:hidden min-h-screen flex flex-col relative"
        style={{
          backgroundImage: "url(/images/instructions/Instructions%20bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <main className="flex-1 px-6 pt-20 pb-8 flex justify-center relative z-10">
          <div className="relative mx-auto" style={{ width: 400, marginTop: 4 }}>
            
            {/* Logo */}
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16, paddingLeft: 4 }}>
              <div
                onClick={() => {
                  console.log('🏠 Homepage logo clicked - clearing session data and reloading...');
                  if (typeof window !== 'undefined') {
                    sessionStorage.clear();
                    window.location.href = '/';
                  }
                }}
              >
                <img
                  src="/images/newhomepage/Bowling%20Campaign%20Logo.png"
                  alt="Bowling Campaign Logo"
                  style={{ width: 208, height: "auto", cursor: "pointer" }}
                />
              </div>
            </div>

            <div style={{ position: "relative", width: "100%" }}>
              
              {/* Loan Approved Decoration */}
              <img
                src="/images/instructions/loanapproved.png"
                alt="Loan Approved"
                style={{ 
                  position: "absolute", 
                  top: -170, 
                  right: -8, 
                  width: 150, 
                  height: "auto", 
                  zIndex: 1, 
                  pointerEvents: "none" 
                }}
              />

              {/* Glass Box Container */}
              <div
                style={{
                  position: "relative",
                  borderRadius: 18,
                  backgroundColor: "#FFFFFF80",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: "inset 0 0 0 1px #FFFFFF",
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  zIndex: 2,
                  marginTop: 20,
                }}
              >
                {/* Universal Back Arrow Box - Top Left */}
                <GlassBackButton />
                
                {/* Headline */}
                <div className="mb-3 text-center">
                  <div
                    style={{
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: 800,
                      fontStyle: "italic",
                      fontSize: 17.5,
                      color: "#000000",
                      lineHeight: 1.1,
                      marginBottom: 2,
                    }}
                  >
                    Your #BumrahKiSpeedPar<br />Video is Ready!
                  </div>
                </div>

                {/* Video Container */}
                <div style={{ 
                  width: '100%',
                  maxWidth: 346,
                  margin: '0 auto',
                  position: 'relative',
                  aspectRatio: '9 / 16', // Portrait video ratio
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: '#000'
                }}>
                  <video
                    src={videoUrl}
                    controls
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                
                {/* Action Buttons */}
                <div className="mb-3" style={{ width: '100%', marginTop: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link href="/leaderboard" style={{ flex: 1 }}>
                        <button
                          className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                          style={{
                            width: "100%",
                            backgroundColor: '#CCEAF7',
                            borderRadius: '25.62px',
                            fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                            fontWeight: '700',
                            fontSize: '14px',
                            color: 'black',
                            padding: '10px 16px',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8
                          }}
                        >
                          <img
                            src="/frontend-images/homepage/Vector.svg"
                            alt="Leaderboard"
                            style={{ width: 16, height: 16 }}
                          />
                          Leaderboard
                        </button>
                      </Link>

                      <button
                        className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                        style={{
                          flex: 1,
                          backgroundColor: '#FDC217',
                          borderRadius: '25.62px',
                          fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                          fontWeight: '700',
                          fontSize: '14px',
                          color: 'black',
                          padding: '10px 16px',
                          border: 'none'
                        }}
                        onClick={handleDownloadVideo}
                      >
                        Download Video
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Mobile Footer */}
        <footer className="md:hidden mt-auto w-full bg-black px-4 md:px-8 pt-4 pb-6">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
            <div className="text-left">
              <p 
                className="text-white text-xs"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: 'clamp(10px, 2vw, 14px)',
                  lineHeight: '1.4'
                }}
              >
                © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833 | <a href="/terms-and-conditions" className="text-blue-300 hover:text-blue-200 underline">Terms and Conditions</a>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span 
                className="text-white text-xs mr-2"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: 'clamp(10px, 2vw, 14px)'
                }}
              >
                Connect with us
              </span>
              <div className="flex gap-3 md:gap-4">
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <a href="https://m.facebook.com/LnTFS?wtsid=rdr_0GljAOcj6obaXQY93" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <a href="https://www.instagram.com/lntfinance?igsh=a3ZvY2JxaWdnb25s" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <a href="https://x.com/LnTFinance" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                  </a>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <a href="https://x.com/LnTFinance" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Desktop Layout - Same structure but for desktop */}
      <div className="hidden md:flex flex-col" style={{
        minHeight: "100vh",
        backgroundImage: "url(/images/instructions/Instructions%20bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}>
        <main className="flex-1 flex justify-center items-center relative z-10 px-8 py-12">
          <div className="relative mx-auto" style={{ width: 420 }}>
            
            {/* Logo */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <div
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    sessionStorage.clear();
                    window.location.href = '/';
                  }
                }}
              >
                <img
                  src="/images/newhomepage/Bowling%20Campaign%20Logo.png"
                  alt="Bowling Campaign Logo"
                  style={{ width: 240, height: "auto", cursor: "pointer" }}
                />
              </div>
            </div>

            <div style={{ position: "relative" }}>
              
              {/* Loan Approved Decoration */}
              <img
                src="/images/instructions/loanapproved.png"
                alt="Loan Approved"
                style={{ 
                  position: "absolute", 
                  top: -180, 
                  right: -40, 
                  width: 180, 
                  height: "auto", 
                  zIndex: 1, 
                  pointerEvents: "none" 
                }}
              />

              {/* Glass Box Container */}
              <div
                style={{
                  position: "relative",
                  borderRadius: 18,
                  backgroundColor: "#FFFFFF80",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: "inset 0 0 0 1px #FFFFFF",
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 20,
                  zIndex: 2,
                }}
              >
                {/* Universal Back Arrow Box - Top Left */}
                <GlassBackButton />
                
                {/* Headline */}
                <div className="mb-4 text-center">
                  <div
                    style={{
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: 800,
                      fontStyle: "italic",
                      fontSize: 20,
                      color: "#000000",
                      lineHeight: 1.1,
                    }}
                  >
                    Your #BumrahKiSpeedPar<br />Video is Ready!
                  </div>
                </div>

                {/* Video Container */}
                <div style={{ 
                  width: '100%',
                  maxWidth: 346,
                  margin: '0 auto',
                  position: 'relative',
                  aspectRatio: '9 / 16',
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: '#000'
                }}>
                  <video
                    src={videoUrl}
                    controls
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                
                {/* Action Buttons */}
                <div style={{ width: '100%', marginTop: '12px' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Link href="/leaderboard" style={{ flex: 1 }}>
                      <button
                        className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                        style={{
                          width: "100%",
                          backgroundColor: '#80CAEB',
                          borderRadius: '22px',
                          fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                          fontWeight: '700',
                          fontSize: '14px',
                          color: 'black',
                          padding: '10px 16px',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8
                        }}
                      >
                        <img
                          src="/frontend-images/homepage/Vector.svg"
                          alt="Leaderboard"
                          style={{ width: 16, height: 16 }}
                        />
                        Leaderboard
                      </button>
                    </Link>

                    <button
                      className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                      style={{
                        flex: 1,
                        backgroundColor: '#FDC217',
                        borderRadius: '22px',
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: '700',
                        fontSize: '14px',
                        color: 'black',
                        padding: '10px 16px',
                        border: 'none'
                      }}
                      onClick={handleDownloadVideo}
                    >
                      Download Video
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Desktop Footer */}
        <footer className="w-full bg-black px-4 md:px-8 pt-4 pb-6 relative z-20">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
            <div className="text-left">
              <p 
                className="text-white text-xs"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: 'clamp(10px, 2vw, 14px)',
                  lineHeight: '1.4'
                }}
              >
                © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833 | <a href="/terms-and-conditions" className="text-blue-300 hover:text-blue-200 underline">Terms and Conditions</a>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span 
                className="text-white text-xs mr-2"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: 'clamp(10px, 2vw, 14px)'
                }}
              >
                Connect with us
              </span>
              <div className="flex gap-3 md:gap-4">
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
