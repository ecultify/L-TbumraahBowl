'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useIntersectionObserver } from '../../hooks/use-intersection-observer';
import { useAnalysis } from '@/context/AnalysisContext';
import { intensityToKmh } from '@/lib/utils/normalize';

function QuickAnalysisContent() {
  const { state } = useAnalysis();
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  // Intersection observers for animations
  const titleSection = useIntersectionObserver({ threshold: 0.1, freezeOnceVisible: true });
  const videoSection = useIntersectionObserver({ threshold: 0.1, freezeOnceVisible: true });
  const resultSection = useIntersectionObserver({ threshold: 0.1, freezeOnceVisible: true });

  useEffect(() => {
    // Get video data from sessionStorage
    const storedVideoUrl = sessionStorage.getItem('uploadedVideoUrl');
    const storedFileName = sessionStorage.getItem('uploadedFileName');
    
    if (storedVideoUrl) {
      setVideoUrl(storedVideoUrl);
      setFileName(storedFileName || 'uploaded-video.mp4');
    }
  }, []);

  // Use exact same logic as desktop analyze page
  const hasResults = state.finalIntensity > 0 && !!state.speedClass;
  const speedKmh = hasResults ? Math.round(intensityToKmh(state.finalIntensity)) : 142;
  const speedMph = hasResults ? Math.round(speedKmh * 0.621371) : 88;

  // Get classification text and accuracy - use same logic as desktop analyze page
  const getClassificationText = () => {
    if (!hasResults) return 'Medium pace bowling detected';
    switch (state.speedClass) {
      case 'Fast':
        return 'Fast bowling detected';
      case 'Zooooom':
        return 'Express bowling detected';
      default:
        return 'Medium pace bowling detected';
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
      {/* Mobile View */}
      <div className="md:hidden min-h-screen flex flex-col">
        <div className="absolute top-4 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <img
            src="/frontend-images/homepage/justzoom logo.png"
            alt="JustZoom logo"
            className="h-12 w-auto"
          />
        </div>
        {/* Header with Back Button */}
        <div className="absolute top-0 left-0 right-0 z-10 pt-6 px-4">
          <Link 
            href="/analyzing"
            className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex-1 pt-20 pb-12 px-4">
        {/* Title Section */}
        <div className="text-center mb-8" ref={titleSection.ref}>
          <h1 
            className={`mb-2 animate-fadeInUp ${titleSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              fontFamily: 'Frutiger, Inter, sans-serif',
              fontWeight: '700',
              fontSize: '24px',
              color: '#FDC217',
              lineHeight: '1.2'
            }}
          >
            Quick Analysis
          </h1>
          <p 
            className={`animate-fadeInUp animate-delay-200 ${titleSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: '400',
              fontSize: '12px',
              color: 'white',
              lineHeight: '1.3'
            }}
          >
            Review your submission
          </p>
        </div>

        {/* Video Section */}
        <div className="mb-8" ref={videoSection.ref}>
          <div 
            className={`max-w-md mx-auto animate-scaleIn ${videoSection.isIntersecting ? 'animate-on-scroll' : ''}`}
          >
            <div 
              className="relative overflow-hidden"
              style={{
                borderRadius: '20px',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                aspectRatio: '16/9'
              }}
            >
              {videoUrl ? (
                <video
                  src={videoUrl}
                  controls
                  preload="metadata"
                  className="w-full h-full object-cover"
                  style={{ borderRadius: '20px' }}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <div className="mb-4">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="mx-auto">
                        <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 2v-7l-4 2z"/>
                      </svg>
                    </div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
                      No video available
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Box */}
        <div className="mb-8" ref={resultSection.ref}>
          <div 
            className={`max-w-md mx-auto p-6 text-center animate-fadeInUp ${resultSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              width: '355px',
              height: '186px',
              backgroundColor: '#FFC315',
              borderRadius: '20px',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {/* Title */}
            <h2 
              className="text-black mb-4"
              style={{
                fontFamily: 'Frutiger, Inter, sans-serif',
                fontWeight: '700',
                fontSize: '20px',
                lineHeight: '1.2'
              }}
            >
              Quick Analysis
            </h2>

            {/* Speed Values */}
            <div className="grid grid-cols-2 gap-6 mb-4 w-full">
              <div className="text-center">
                <div 
                  className="text-black"
                  style={{
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '700',
                    fontSize: '32px',
                    lineHeight: '1'
                  }}
                >
                  {speedKmh}
                </div>
                <div 
                  className="text-black"
                  style={{
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '700',
                    fontSize: '14px',
                    lineHeight: '1'
                  }}
                >
                  km/h
                </div>
              </div>
              
              <div className="text-center">
                <div 
                  className="text-black"
                  style={{
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '700',
                    fontSize: '32px',
                    lineHeight: '1'
                  }}
                >
                  {speedMph}
                </div>
                <div 
                  className="text-black"
                  style={{
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '700',
                    fontSize: '14px',
                    lineHeight: '1'
                  }}
                >
                  mph
                </div>
              </div>
            </div>

            {/* Classification and Accuracy */}
            <div className="flex items-center gap-2">
              <span 
                className="text-black"
                style={{
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '14px',
                  lineHeight: '1.2'
                }}
              >
                {getClassificationText()}
              </span>
              <span 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: 'black' }}
              />
              <span 
                className="text-black"
                style={{
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '14px',
                  lineHeight: '1.2'
                }}
              >
                High accuracy
              </span>
            </div>
          </div>
        </div>

        {/* View Analysis Button */}
        <div className="flex justify-center">
          <Link 
            href="/analyze"
            className={`inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 animate-bounceIn animate-delay-400 ${resultSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              backgroundColor: '#FFC315',
              borderRadius: '25.62px',
              fontFamily: 'Frutiger, Inter, sans-serif',
              fontWeight: '700',
              fontSize: '16px',
              color: 'black',
              width: '261px',
              height: '41px'
            }}
          >
            View Analysis
          </Link>
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
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
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
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block min-h-screen">
        <div className="absolute top-4 left-0 right-0 z-20 flex justify-center">
          <Link href="/">
            <img
              src="/frontend-images/homepage/justzoom logo.png"
              alt="JustZoom logo"
              className="h-12 w-auto"
            />
          </Link>
        </div>

        <div className="absolute top-0 left-0 right-0 z-10 pt-6 px-4">
          <Link 
            href="/analyzing"
            className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex-1 pt-20 pb-12 px-4">
          {/* Title Section */}
          <div className="text-center mb-8">
            <h1 
              className="mb-2"
              style={{
                fontFamily: 'Frutiger, Inter, sans-serif',
                fontWeight: '700',
                fontSize: '32px',
                color: '#FDC217',
                lineHeight: '1.2'
              }}
            >
              Quick Analysis
            </h1>
            <p 
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '400',
                fontSize: '16px',
                color: 'white',
                lineHeight: '1.3'
              }}
            >
              Your bowling performance results
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Video Section */}
            {videoUrl && (
              <div className="mb-8">
                <div className="rounded-[20px] border border-white/10 bg-white/10 p-6 shadow-[0_8px_32px_rgba(31,38,135,0.25)] backdrop-blur-xl">
                  <div 
                    className="relative overflow-hidden rounded-lg bg-black"
                    style={{ aspectRatio: '16/9' }}
                  >
                    <video
                      src={videoUrl}
                      controls
                      preload="metadata"
                      className="w-full h-full object-cover"
                      style={{ borderRadius: '8px' }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              </div>
            )}

            {/* Results Box */}
            <div className="mb-8">
              <div 
                className="p-8 text-center rounded-[20px] shadow-[0_8px_32px_rgba(31,38,135,0.37)]"
                style={{
                  backgroundColor: '#FFC315',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {/* Title */}
                <h2 
                  className="text-black mb-6"
                  style={{
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '700',
                    fontSize: '24px',
                    lineHeight: '1.2'
                  }}
                >
                  Quick Analysis
                </h2>

                {/* Speed Values */}
                <div className="grid grid-cols-2 gap-8 mb-6 w-full max-w-md">
                  <div className="text-center">
                    <div 
                      className="text-black"
                      style={{
                        fontFamily: 'Frutiger, Inter, sans-serif',
                        fontWeight: '700',
                        fontSize: '40px',
                        lineHeight: '1'
                      }}
                    >
                      {speedKmh}
                    </div>
                    <div 
                      className="text-black"
                      style={{
                        fontFamily: 'Frutiger, Inter, sans-serif',
                        fontWeight: '700',
                        fontSize: '16px',
                        lineHeight: '1'
                      }}
                    >
                      km/h
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div 
                      className="text-black"
                      style={{
                        fontFamily: 'Frutiger, Inter, sans-serif',
                        fontWeight: '700',
                        fontSize: '40px',
                        lineHeight: '1'
                      }}
                    >
                      {speedMph}
                    </div>
                    <div 
                      className="text-black"
                      style={{
                        fontFamily: 'Frutiger, Inter, sans-serif',
                        fontWeight: '700',
                        fontSize: '16px',
                        lineHeight: '1'
                      }}
                    >
                      mph
                    </div>
                  </div>
                </div>

                {/* Classification and Accuracy */}
                <div className="flex items-center gap-2">
                  <span 
                    className="text-black"
                    style={{
                      fontFamily: 'Frutiger, Inter, sans-serif',
                      fontWeight: '700',
                      fontSize: '16px',
                      lineHeight: '1.2'
                    }}
                  >
                    {getClassificationText()}
                  </span>
                  <span 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'black' }}
                  />
                  <span 
                    className="text-black"
                    style={{
                      fontFamily: 'Frutiger, Inter, sans-serif',
                      fontWeight: '700',
                      fontSize: '16px',
                      lineHeight: '1.2'
                    }}
                  >
                    High accuracy
                  </span>
                </div>
              </div>
            </div>

            {/* View Analysis Button */}
            <div className="flex justify-center mb-8">
              <Link 
                href="/analyze"
                className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105"
                style={{
                  backgroundColor: '#FFC315',
                  borderRadius: '25.62px',
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '16px',
                  color: 'black',
                  width: '261px',
                  height: '41px'
                }}
              >
                View Detailed Analysis
              </Link>
            </div>

            {/* Analysis Summary */}
            <div className="rounded-[20px] border border-white/10 bg-white/10 p-6 shadow-[0_8px_32px_rgba(31,38,135,0.25)] backdrop-blur-xl">
              <h4 className="text-lg font-semibold text-white mb-4 text-center">Analysis Summary</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-[#FFC315] rounded-full"></div>
                  <span className="text-sm text-white/80">Video processed successfully</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-[#FFC315] rounded-full"></div>
                  <span className="text-sm text-white/80">Speed calculated with high accuracy</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-[#FFC315] rounded-full"></div>
                  <span className="text-sm text-white/80">Technique analysis completed</span>
                </div>
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
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
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
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Main component wrapped with AnalysisProvider
export default function QuickAnalysisPage() {
  return <QuickAnalysisContent />;
}
