'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { GlassBackButton } from '@/components/GlassBackButton';

export default function GalleryPage() {
  // Grid height is computed so exactly 1 row (2 cards) is visible
  const gridWrapperRef = useRef<HTMLDivElement | null>(null);
  const [gridHeight, setGridHeight] = useState<number | undefined>(undefined);
  const [cardRatio, setCardRatio] = useState<number>(1.6); // height / width
  const [desktopGridHeight, setDesktopGridHeight] = useState<number | undefined>(undefined);
  
  // Add multiple report cards if you have them, for now using the same one
  const reportCards = Array.from({ length: 24 }, () => '/images/newhomepage/Report Card.png');

  // Load the first image to estimate the card aspect ratio (height/width)
  useEffect(() => {
    if (!reportCards.length) return;
    const img = new Image();
    img.src = reportCards[0];
    img.onload = () => {
      if (img.naturalWidth > 0) {
        setCardRatio(img.naturalHeight / img.naturalWidth);
      }
    };
  }, []);

  // Compute a height that shows 1 row in a 2-column grid (2 cards visible)
  useEffect(() => {
    const GAP = 12; // must match the CSS gap used in the grid below
    const measure = () => {
      const el = gridWrapperRef.current;
      if (!el) return;
      const width = el.clientWidth;
      // Two columns -> card width is (totalWidth - gap)/2
      const cardWidth = Math.max(0, (width - GAP) / 2);
      // One row visible exactly -> height = cardWidth * aspectRatio
      const height = Math.round(cardWidth * cardRatio);
      setGridHeight(height);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [cardRatio]);

  // Desktop: compute a height that shows exactly 2 rows in a 6-column grid
  useEffect(() => {
    const GAP = 16; // match desktop grid gap
    const COLS = 6;
    const measureDesktop = () => {
      if (typeof window === 'undefined' || window.innerWidth < 768) {
        setDesktopGridHeight(undefined);
        return;
      }
      const el = gridWrapperRef.current;
      if (!el) return;
      // Try element width; if not ready, fall back to parent width
      const width = el.clientWidth > 0 ? el.clientWidth : (el.parentElement ? el.parentElement.clientWidth : 0);
      if (width <= 0) return;
      const columnWidth = Math.max(0, (width - GAP * (COLS - 1)) / COLS);
      const cardHeightPx = columnWidth * cardRatio; // aspectRatio: 1/cardRatio -> height = width * cardRatio
      const computedHeight = Math.round(cardHeightPx * 2 + GAP); // 2 rows + one gap
      const MIN_VISIBLE = 500; // ensure two full rows are visible
      setDesktopGridHeight(Math.max(computedHeight, MIN_VISIBLE));
    };
    measureDesktop();
    window.addEventListener('resize', measureDesktop);
    return () => window.removeEventListener('resize', measureDesktop);
  }, [cardRatio]);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-col" style={{
        minHeight: '100vh',
        backgroundImage: 'url("/images/analyzepagebg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
        {/* Logo in top left corner */}
        <div className="absolute top-6 left-6 z-20">
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
              className="w-64 lg:w-72"
              style={{ height: 'auto', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Main content area - Full width glass container */}
        <div className="flex-1 flex justify-center items-end relative" style={{ padding: '0 8%', paddingTop: '60px' }}>
          <div className="relative" style={{ width: '75%', height: 'calc(100vh - 180px)' }}>
            {/* Large Glass Box Background */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5)), url(/images/ballsglass.png)',
                backgroundRepeat: 'no-repeat, no-repeat',
                backgroundPosition: 'center, center',
                backgroundSize: '100% 100%, contain',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: 'inset 0 0 0 1px #FFFFFF',
                borderTopLeftRadius: 60,
                borderTopRightRadius: 60,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                zIndex: 1,
              }}
            />

            {/* Back Button - Top Left Corner of Large Glass Box */}
            <div
              style={{
                position: 'absolute',
                top: '24px',
                left: '24px',
                width: '60px',
                height: '60px',
                borderRadius: '20px',
                backgroundColor: '#0095D740',
                border: '2px solid #0095D74D',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                transition: 'all 0.2s ease',
              }}
              onClick={() => window.history.back()}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0095D760';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0095D740';
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="#0095D7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Gallery Content - Directly in Large Glass Container */}
            <div className="relative flex flex-col" style={{ height: '100%', paddingTop: 40, paddingBottom: 0, zIndex: 2 }}>
              {/* Title Row - centered */}
              <div className="w-full flex justify-center mb-2" style={{ padding: '0 40px' }}>
                  <img src="/images/newhomepage/Group 1437254106 (1).png" alt="Gallery" style={{ width: '200px', height: 'auto' }} />
                </div>
                
              {/* Dropdown Row - right aligned */}
              <div className="w-full flex justify-end items-center mb-6" style={{ padding: '0 40px' }}>
                  <select
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #0000004D',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: '500',
                      color: '#000000',
                      outline: 'none',
                      cursor: 'pointer',
                      minWidth: '180px'
                    }}
                    defaultValue="report-analysis"
                  >
                    <option value="report-analysis">Report Analysis</option>
                    <option value="video-analysis">Video Analysis</option>
                  </select>
              </div>

              {/* Gallery Grid - vertical scroll, 6 items per row; exactly two rows visible */}
              <div className="w-full" style={{ padding: '0 40px 0 40px', flex: 1, display: 'flex', minHeight: 0 }}>
                <div
                  ref={gridWrapperRef}
                  className="custom-scrollbar"
                  style={{
                    width: '100%',
                    overflowX: 'hidden',
                    overflowY: 'auto',
                    borderRadius: 0,
                    height: desktopGridHeight ? desktopGridHeight : '100%',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
                      gap: 16,
                      paddingBottom: 0,
                    }}
                  >
                    {reportCards.map((card, index) => (
                      <div
                        key={index}
                        style={{
                          width: '100%',
                          aspectRatio: `1 / ${cardRatio}`,
                          borderRadius: 12,
                          overflow: 'hidden',
                          boxShadow: 'inset 0 0 0 1px #FFFFFF',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <img
                          src={card}
                          alt={`Report Card ${index + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Footer */}
        <footer className="w-full bg-black px-4 md:px-8 pt-0 pb-6 relative z-20" style={{ marginTop: 0 }}>
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
            <div className="text-center">
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

      {/* Mobile Layout (original) */}
      <div
        className="md:hidden min-h-screen flex flex-col relative"
        style={{
          backgroundImage: 'url(/images/instructions/Instructions%20bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <main className="flex-1 px-6 pt-20 pb-8 flex justify-center relative z-10">
          <div className="relative mx-auto max-w-md md:max-w-2xl lg:max-w-4xl" style={{ width: '100%', maxWidth: 400, marginTop: 4 }}>
            {/* Logo */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16, paddingLeft: 4 }}>
              <Link href="/">
                <img src="/images/newhomepage/Bowling%20Campaign%20Logo.png" alt="Bowling Campaign Logo" className="w-52" style={{ height: 'auto', cursor: 'pointer' }} />
              </Link>
            </div>

            <div style={{ position: 'relative', width: '100%' }}>
              {/* Loan Approved Image */}
              <img src="/images/instructions/loanapproved.png" alt="Loan Approved" style={{ position: 'absolute', top: -170, right: -8, width: 150, height: 'auto', zIndex: 1, pointerEvents: 'none' }} />

              {/* Glass Box Container */}
              <div
                className="w-full max-w-sm mx-auto"
                style={{
                  position: 'relative',
                  borderRadius: 18,
                  backgroundColor: '#FFFFFF80',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: 'inset 0 0 0 1px #FFFFFF',
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  zIndex: 2,
                  marginTop: 20,
                }}
              >
                {/* Universal Back Arrow Box - Top Left */}
                <GlassBackButton />

                {/* Gallery Title Image */}
                <div className="w-full flex justify-center mb-1" style={{ marginTop: 5 }}>
                  <img src="/images/newhomepage/Group 1437254106 (1).png" alt="Gallery" style={{ width: '70%', height: 'auto' }} />
                </div>

                {/* Grid */}
                <div className="w-full" style={{ marginTop: 12 }}>
                  <div
                    ref={gridWrapperRef}
                    className="custom-scrollbar"
                    style={{
                      width: '100%',
                      overflowY: 'auto',
                      borderRadius: 12,
                      // If gridHeight is known, lock the height so exactly 1 row is visible
                      height: gridHeight ? gridHeight : undefined,
                      maxHeight: gridHeight ? gridHeight : undefined,
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 12,
                        paddingBottom: 2,
                      }}
                    >
                      {reportCards.map((card, index) => (
                        <div
                          key={index}
                          style={{
                            width: '100%',
                            // Use measured aspect ratio so full card is visible without cropping
                            aspectRatio: `1 / ${cardRatio}`,
                            borderRadius: 12,
                            overflow: 'hidden',
                            boxShadow: 'inset 0 0 0 1px #FFFFFF',
                            backgroundColor: '#ffffff',
                          }}
                        >
                          <img src={card} alt={`Report Card ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Mobile Footer */}
        <footer className="md:hidden mt-auto w-full bg-black px-4 md:gap-8 pt-4 pb-6">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
            <div className="text-center">
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
    </div>
  );
}

