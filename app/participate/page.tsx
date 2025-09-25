'use client';

import Link from 'next/link';
import { useIntersectionObserver } from '../../hooks/use-intersection-observer';
import { BackButton } from '@/components/BackButton';

export default function HowToParticipatePage() {
  // Intersection observers for animations
  const titleSection = useIntersectionObserver({ threshold: 0.1, freezeOnceVisible: true });
  const videoSection = useIntersectionObserver({ threshold: 0.1, freezeOnceVisible: true });
  const descriptionSection = useIntersectionObserver({ threshold: 0.1, freezeOnceVisible: true });
  const featuresSection = useIntersectionObserver({ threshold: 0.1, freezeOnceVisible: true });

  return (
    <div>
      {/* Mobile View */}
      <div 
        className="md:hidden min-h-screen" 
        style={{ 
          backgroundImage: 'url(/frontend-images/homepage/bowlbg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
      {/* Header with Back Button */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-6 px-4">
        <BackButton label="Back to Home" />
      </div>

      {/* Main Content */}
      <div className="pt-20 pb-12">
        {/* Title Section */}
        <div className="text-center px-4 mb-12" ref={titleSection.ref}>
          <h1 
            className={`mb-2 animate-fadeInUp ${titleSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              fontFamily: 'Frutiger, Inter, sans-serif',
              fontWeight: '700', // Frutiger Bold
              fontSize: '24px',
              color: '#FDC217',
              lineHeight: '1.2'
            }}
          >
            How To Participate
          </h1>
          <p 
            className={`animate-fadeInUp animate-delay-200 ${titleSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              fontFamily: 'Frutiger, Inter, sans-serif',
              fontWeight: '400', // Frutiger Regular
              fontSize: '12px',
              color: 'white',
              lineHeight: '1.3'
            }}
          >
            Learn the process in under 2 minutes
          </p>
        </div>

        {/* Video Box Section */}
        <div className="flex justify-center px-4 mb-12" ref={videoSection.ref}>
          <div 
            className={`relative animate-scaleIn ${videoSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              width: '370px',
              height: '230px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Background Box - positioned diagonally behind */}
            <div 
              className="absolute"
              style={{
                width: '360px',
                height: '220px',
                borderRadius: '20px',
                backgroundColor: '#5BA6DB',
                top: '10px',
                left: '10px',
                zIndex: 1
              }}
            />
            
            {/* Main Video Box */}
            <div 
              className="relative"
              style={{
                width: '360px',
                height: '220px',
                borderRadius: '20px',
                background: 'linear-gradient(180deg, #1E75B3 0%, #014F87 100%)',
                overflow: 'hidden',
                zIndex: 2,
                top: '0',
                left: '0'
              }}
            >
              {/* Play Button */}
              <div className="w-full h-full flex items-center justify-center">
                <div 
                  className="flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-300"
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: '#FFD42D'
                  }}
                >
                  {/* Play Icon with Rounded Corners */}
                  <svg 
                    width="40" 
                    height="40" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    style={{ marginLeft: '3px' }}
                  >
                    <path 
                      d="M8 5.14v13.72L19 12L8 5.14z" 
                      fill="none"
                      stroke="rgba(0, 0, 0, 0.2)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Glass Blur Box Section */}
        <div className="px-4 mb-8" ref={descriptionSection.ref}>
          <div 
            className={`max-w-md mx-auto p-6 backdrop-blur-md relative overflow-hidden animate-fadeInUp ${descriptionSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
            }}
          >
            <p 
              className="text-white text-left mb-6"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '400',
                fontSize: '14px',
                lineHeight: '1.5'
              }}
            >
              Record or upload your bowling video and our advanced AI will analyze your speed with professional accuracy.
            </p>

            {/* Feature Points inside glass box */}
            <div className="space-y-4 mb-6">
              {/* Point 1 */}
              <div 
                className={`flex items-start gap-3 animate-fadeInLeft animate-delay-200 ${descriptionSection.isIntersecting ? 'animate-on-scroll' : ''}`}
              >
                <div 
                  className="flex-shrink-0 relative"
                  style={{
                    width: '16px',  // radius 8 * 2
                    height: '16px'  // radius 8 * 2
                  }}
                >
                  {/* Outer white circle */}
                  <div 
                    className="absolute rounded-full"
                    style={{
                      width: '16px',   // radius 8 * 2
                      height: '16px',  // radius 8 * 2
                      backgroundColor: 'white',
                      top: '0',
                      left: '0'
                    }}
                  />
                  {/* Inner black circle */}
                  <div 
                    className="absolute rounded-full"
                    style={{
                      width: '6px',    // radius 2 * 2
                      height: '6px',   
                      backgroundColor: 'black',
                      top: '5px',      // (16-6)/2 to center
                      left: '5px'      // (16-6)/2 to center
                    }}
                  />
                </div>
                <p 
                  className="text-white"
                  style={{
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '400',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}
                >
                  Works with any cricket bowling video - fast or spin bowling
                </p>
              </div>

              {/* Point 2 */}
              <div 
                className={`flex items-start gap-3 animate-fadeInLeft animate-delay-300 ${descriptionSection.isIntersecting ? 'animate-on-scroll' : ''}`}
              >
                <div 
                  className="flex-shrink-0 relative"
                  style={{
                    width: '16px',  // radius 8 * 2
                    height: '16px'  // radius 8 * 2
                  }}
                >
                  {/* Outer white circle */}
                  <div 
                    className="absolute rounded-full"
                    style={{
                      width: '16px',   // radius 8 * 2
                      height: '16px',  // radius 8 * 2
                      backgroundColor: 'white',
                      top: '0',
                      left: '0'
                    }}
                  />
                  {/* Inner black circle */}
                  <div 
                    className="absolute rounded-full"
                    style={{
                      width: '6px',    
                      height: '6px',   
                      backgroundColor: 'black',
                      top: '5px',      // (16-6)/2 to center
                      left: '5px'      // (16-6)/2 to center
                    }}
                  />
                </div>
                <p 
                  className="text-white"
                  style={{
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '400',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}
                >
                  Get instant results with detailed analysis report
                </p>
              </div>
            </div>

          </div>
        </div>

            {/* Get Started Button outside glass box */}
        <div className="flex justify-center px-4">
          <Link 
            href="/instructions"
            className={`inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 animate-bounceIn animate-delay-400 ${descriptionSection.isIntersecting ? 'animate-on-scroll' : ''}`}
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
            Get it, continue.
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
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </footer>
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex md:flex-col md:min-h-screen" style={{ backgroundColor: '#032743' }}>
        {/* Desktop Header */}
        <header 
          className="relative overflow-hidden"
          style={{
            backgroundImage: 'url(/frontend-images/homepage/bumrah 1.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, #0084B7 0%, #004E87 100%)',
              opacity: '0.85'
            }}
          />
          
          <div className="relative z-10 flex items-center justify-center max-w-7xl mx-auto px-8 py-6">
            <div className="flex items-center">
              <Link href="/">
                <img 
                  src="/frontend-images/homepage/justzoom logo.png" 
                  alt="JustZoom Logo" 
                  className="h-16 w-auto cursor-pointer"
                />
              </Link>
            </div>
            <div className="absolute left-8 flex items-center gap-4">
              <BackButton label="Back to Home" />
            </div>
          </div>
        </header>

        {/* Desktop Main Content */}
        <div className="flex-1 max-w-7xl mx-auto px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column - Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 
                  className="text-white"
                  style={{
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '700',
                    fontSize: '3rem',
                    color: '#FDC217',
                    lineHeight: '1.2'
                  }}
                >
                  How To Participate
                </h1>
                
                <p 
                  className="text-white text-xl leading-relaxed"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '400',
                    fontSize: '18px',
                    lineHeight: '1.6'
                  }}
                >
                  Follow these simple steps to analyze your bowling speed and compete with others. 
                  Record your bowling action and get instant AI-powered analysis.
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                    style={{ backgroundColor: '#FFC315' }}
                  >
                    <span className="text-black font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg mb-2">Record Your Action</h3>
                    <p className="text-white/80">Use your camera or upload a video of your bowling delivery</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                    style={{ backgroundColor: '#FFC315' }}
                  >
                    <span className="text-black font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg mb-2">AI Analysis</h3>
                    <p className="text-white/80">Our advanced AI analyzes your motion and calculates speed</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                    style={{ backgroundColor: '#FFC315' }}
                  >
                    <span className="text-black font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg mb-2">Get Results</h3>
                    <p className="text-white/80">View your speed analysis and share with friends</p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="pt-8">
                <Link 
                  href="/instructions"
                  className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                  style={{
                    backgroundColor: '#FFC315',
                    borderRadius: '25px',
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '700',
                    fontSize: '18px',
                    color: 'black',
                    padding: '16px 48px'
                  }}
                >
                  Get it, continue.
                </Link>
              </div>
            </div>

            {/* Right Column - Visual */}
            <div className="relative flex items-center justify-center">
              <div 
                className="relative"
                style={{
                  width: '500px',
                  height: '350px',
                  borderRadius: '24px',
                  background: 'linear-gradient(180deg, #1E75B3 0%, #014F87 100%)',
                  overflow: 'hidden'
                }}
              >
                {/* Video placeholder with bowling illustration */}
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div 
                      className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#FFC315' }}
                    >
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                        <path 
                          d="M8 5.14v13.72L19 12L8 5.14z" 
                          fill="black"
                        />
                      </svg>
                    </div>
                    <p className="text-white font-semibold">Watch Demo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Footer */}
        <footer className="w-full bg-black px-8 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
            <div className="text-left">
              <p 
                className="text-white text-sm"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  lineHeight: '1.4'
                }}
              >
                © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              <span 
                className="text-white text-sm"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400'
                }}
              >
                Connect with us
              </span>
              
              <div className="flex gap-4">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
                  </svg>
                </div>
                
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </div>
                
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
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
