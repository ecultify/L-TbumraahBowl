'use client';

import Link from 'next/link';
import { useIntersectionObserver } from '../../hooks/use-intersection-observer';

export default function HomeGif() {
  // Intersection observers for each section
  const heroSection = useIntersectionObserver({ threshold: 0.3, freezeOnceVisible: true });
  const secondSection = useIntersectionObserver({ threshold: 0.5, freezeOnceVisible: true });
  const thirdSection = useIntersectionObserver({ threshold: 0.5, freezeOnceVisible: true });
  const fourthSection = useIntersectionObserver({ threshold: 0.5, freezeOnceVisible: true });
  const fifthSection = useIntersectionObserver({ threshold: 0.5, freezeOnceVisible: true });
  const footerSection = useIntersectionObserver({ threshold: 0.3, freezeOnceVisible: true });
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#80CBEB' }}>
      {/* Mobile Hero Section */}
      <div className="md:hidden" ref={heroSection.ref}>
        {/* Logo positioned at the very top */}
        <div className="absolute top-0 left-0 right-0 z-10 pt-12 flex justify-center">
          <img 
            src="/frontend-images/homepage/justzoom logo.png" 
            alt="JustZoom Logo" 
            className={`w-auto h-20 mx-auto animate-fadeInDown ${heroSection.isIntersecting ? 'animate-on-scroll' : ''}`}
          />
        </div>
        
        <div 
          className="flex flex-col items-center justify-between text-center relative rounded-b-[35px] overflow-hidden w-full"
          style={{
            height: '720px',
            backgroundImage: 'url(/frontend-images/homepage/bowlbg.jpg), linear-gradient(180deg, #0084B7 38%, #004E87 100%)',
            backgroundSize: 'cover, cover',
            backgroundPosition: 'center, center',
            backgroundRepeat: 'no-repeat, no-repeat'
          }}
        >
          {/* Top section with text elements */}
          <div className="pt-40 px-6">
            {/* JUST ZOOM Text */}
            <h1 
              className={`text-white mb-3 animate-fadeInUp animate-delay-200 ${heroSection.isIntersecting ? 'animate-on-scroll' : ''}`}
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '800',
                fontStyle: 'italic',
                fontSize: '48px',
                lineHeight: '1.1'
              }}
            >
              JUST ZOOM
            </h1>
            
            {/* Bumraah Text Image */}
            <div className={`mb-6 animate-fadeInUp animate-delay-400 ${heroSection.isIntersecting ? 'animate-on-scroll' : ''}`}>
              <img 
                src="/frontend-images/homepage/bumraahtext.png" 
                alt="Bumraah Text" 
                className="w-auto h-auto mx-auto"
              />
            </div>
          </div>
          
          {/* Bumraah Hero Image replaced with GIF */}
          <div className={`flex items-center justify-center px-6 animate-scaleIn animate-delay-600 ${heroSection.isIntersecting ? 'animate-on-scroll' : ''}`} style={{ marginTop: '-45px' }}>
            <img 
              src="/7 (1).gif" 
              alt="Hero GIF" 
              className="w-auto h-auto max-w-full object-contain"
            />
          </div>
          
          {/* Bottom section with description and CTA */}
          <div className="pb-8 px-6 mt-auto">
            <p 
              className={`text-white mb-4 animate-fadeInUp animate-delay-700 ${heroSection.isIntersecting ? 'animate-on-scroll' : ''}`}
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '400',
                fontSize: '12px',
                lineHeight: '1.4'
              }}
            >
              Measure your bowling speed with precision
            </p>
            
            {/* Get Started Button */}
            <Link 
              href="/participate"
              className={`inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 animate-bounceIn animate-delay-800 ${heroSection.isIntersecting ? 'animate-on-scroll' : ''}`}
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
              Get Started
            </Link>
          </div>
        </div>
      </div>

      {/* Second Section - Analysis Steps */}
      <div className="md:hidden w-full px-4 py-12" ref={secondSection.ref}>
        {/* Section Title */}
        <div className="text-center mb-10">
          <h2 
            className={`text-white mb-2 animate-fadeInUp ${secondSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              fontFamily: 'Frutiger, Inter, sans-serif',
              fontWeight: '700',
              fontStyle: 'italic',
              fontSize: '22px',
              textTransform: 'uppercase',
              lineHeight: '1.2'
            }}
          >
            GET YOUR ANALYSIS
          </h2>
          <p 
            className={`mb-8 animate-fadeInUp animate-delay-200 ${secondSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              fontFamily: 'Frutiger, Inter, sans-serif',
              fontWeight: '500',
              fontSize: '18px',
              color: '#FFCB03',
              lineHeight: '1.3'
            }}
          >
            in 3 simple steps
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="flex justify-center items-center gap-6 w-full">
          {/* Left Column - Steps */}
          <div 
            className={`flex flex-col items-center justify-between animate-fadeInLeft animate-delay-300 ${secondSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              width: '91.93px',
              height: '195.36px'
            }}
          >
            {/* Step 1 */}
            <div 
              className="flex flex-col items-center justify-center relative overflow-hidden"
              style={{
                width: '91.17px',
                height: '51.84px',
                backgroundColor: '#FFC315',
                borderRadius: '9.5px',
                border: '2px solid transparent',
                backgroundImage: 'linear-gradient(#FFC315, #FFC315), linear-gradient(180deg, #FFFFFF 0%, #999999 100%)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'content-box, border-box'
              }}
            >
              <img 
                src="/frontend-images/homepage/icons/Vector (1).svg" 
                alt="Upload Icon" 
                className="w-5 h-5 mb-1"
              />
               <span 
                 className="text-black font-medium"
                 style={{ fontSize: '8.98px' }}
               >
                 Upload
               </span>
            </div>

            {/* Connector Line 1 */}
            <div 
              className="bg-white"
              style={{
                width: '2px',
                height: '20px'
              }}
            ></div>

            {/* Step 2 */}
            <div 
              className="flex flex-col items-center justify-center relative overflow-hidden"
              style={{
                width: '91.17px',
                height: '51.84px',
                backgroundColor: '#FFC315',
                borderRadius: '9.5px',
                border: '2px solid transparent',
                backgroundImage: 'linear-gradient(#FFC315, #FFC315), linear-gradient(180deg, #FFFFFF 0%, #999999 100%)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'content-box, border-box'
              }}
            >
              <img 
                src="/frontend-images/homepage/icons/Vector (2).svg" 
                alt="Analysis Icon" 
                className="w-5 h-5 mb-1"
              />
               <span 
                 className="text-black font-medium"
                 style={{ fontSize: '8.98px' }}
               >
                 Get Analysis
               </span>
            </div>

            {/* Connector Line 2 */}
            <div 
              className="bg-white"
              style={{
                width: '2px',
                height: '20px'
              }}
            ></div>

            {/* Step 3 */}
            <div 
              className="flex flex-col items-center justify-center relative overflow-hidden"
              style={{
                width: '91.17px',
                height: '51.84px',
                backgroundColor: '#FFC315',
                borderRadius: '9.5px',
                border: '2px solid transparent',
                backgroundImage: 'linear-gradient(#FFC315, #FFC315), linear-gradient(180deg, #FFFFFF 0%, #999999 100%)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'content-box, border-box'
              }}
            >
              <img 
                src="/frontend-images/homepage/icons/Vector (3).svg" 
                alt="Share Icon" 
                className="w-5 h-5 mb-1"
              />
               <span 
                 className="text-black font-medium"
                 style={{ fontSize: '8.98px' }}
               >
                 Share
               </span>
            </div>
          </div>

          {/* Right Column - Report Preview */}
          <div className={`relative animate-fadeInRight animate-delay-400 ${secondSection.isIntersecting ? 'animate-on-scroll' : ''}`} style={{ marginLeft: '12px' }}>
            {/* Top Left Ball */}
            <img 
              src="/frontend-images/homepage/ball.png" 
              alt="Cricket Ball" 
              className={`absolute z-10 animate-bowlingLeft animate-delay-500 ${secondSection.isIntersecting ? 'animate-on-scroll' : ''}`}
              style={{
                width: '64.78px',
                height: '55.22px',
                top: '32px',
                left: '-35px'
              }}
            />
            
            {/* Bottom Right Ball - further to the right */}
            <img 
              src="/frontend-images/homepage/ball.png" 
              alt="Cricket Ball" 
              className={`absolute bottom-0 z-0 animate-bowlingRight animate-delay-700 ${secondSection.isIntersecting ? 'animate-on-scroll' : ''}`}
              style={{
                width: '81.81px',
                height: '69.73px',
                right: '-30px'
              }}
            />

             {/* Blur Report Box */}
             <div 
               className="p-4 backdrop-blur-md relative z-10 overflow-hidden"
               style={{
                 width: '202px',
                 height: '243px',
                 borderRadius: '17.53px',
                 backgroundColor: 'rgba(255, 255, 255, 0.1)',
                 border: '1px solid rgba(255, 255, 255, 0.2)',
                 boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
               }}
             >
              {/* Report Title */}
              <h3 
                className="text-white text-center mb-4"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: '15.3px',
                  textTransform: 'uppercase',
                  lineHeight: '1.2'
                }}
              >
                YOUR REPORT
              </h3>

              {/* Score Circle */}
              <div 
                className="mx-auto mb-4 flex flex-col items-center justify-center"
                style={{
                  width: '108.81px',
                  height: '108.81px',
                  borderRadius: '50%',
                  background: 'linear-gradient(180deg, #40A5EF 0%, #0A526E 100%)'
                }}
              >
                <span 
                  className="text-white"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '700',
                    fontSize: '46.53px',
                    lineHeight: '1'
                  }}
                >
                  68
                </span>
                <span 
                  className="text-white"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '400',
                    fontSize: '11.47px',
                    lineHeight: '1.2',
                    marginTop: '4px'
                  }}
                >
                  /100kmph
                </span>
              </div>

              {/* Great Text */}
              <p 
                className="text-center mb-1"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '700',
                  fontStyle: 'italic',
                  fontSize: '14px',
                  color: '#FFC315',
                  textTransform: 'uppercase',
                  lineHeight: '1.2'
                }}
              >
                GREAT
              </p>

              {/* Description */}
              <p 
                className="text-white text-center"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: '9.67px',
                  lineHeight: '1.4',
                  marginTop: '-4px'
                }}
              >
                Your score is perfect. Congrats! You are eligible for a two wheeler loan.
              </p>

              {/* Bumraah Ki Speed Image */}
              <div className="text-center" style={{ marginTop: '2px' }}>
                <img 
                  src="/frontend-images/homepage/bumraahkispeed.svg" 
                  alt="Bumraah Ki Speed" 
                  className="w-auto mx-auto block"
                  style={{ maxWidth: '65%', height: '12px', objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Third Section - Video Box */}
      <div className="md:hidden w-full px-4 py-12" ref={thirdSection.ref}>
        <div className="flex flex-col items-center justify-center">
          {/* Single Video Box Container - Centered */}
          <div 
            className={`relative mb-8 mx-auto animate-scaleIn ${thirdSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              width: '370px', // Larger container
              height: '230px', // Larger container
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

          {/* Get Started Button - Same as hero section */}
          <Link 
            href="/participate"
            className={`inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 animate-bounceIn animate-delay-300 ${thirdSection.isIntersecting ? 'animate-on-scroll' : ''}`}
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
            Get Started
          </Link>
        </div>
      </div>

      {/* Fourth Section - Pitch Text */}
      <div className="md:hidden w-full px-4 py-12 relative" ref={fourthSection.ref}>
        {/* Zooming Ball - positioned in bottom right corner */}
        <div className={`absolute bottom-0 right-0 z-10 animate-bounceIn animate-delay-600 ${fourthSection.isIntersecting ? 'animate-on-scroll' : ''}`}>
          <img 
            src="/frontend-images/homepage/zoomingball.png" 
            alt="Zooming Ball" 
            className="w-16 h-16 object-contain"
          />
        </div>
        
        <div className="flex flex-col items-center justify-center text-center">
          {/* Pitch Text Image */}
          <div className={`mb-6 animate-fadeInUp ${fourthSection.isIntersecting ? 'animate-on-scroll' : ''}`}>
            <img 
              src="/frontend-images/homepage/pitchtext.png" 
              alt="Pitch Text" 
              className="w-47 h-7 mx-auto"
            />
          </div>
          
          {/* Lorem Ipsum Text */}
          <p 
            className={`text-white max-w-sm mx-auto animate-fadeInUp animate-delay-300 ${fourthSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: '400',
              fontSize: '14px',
              lineHeight: '1.5',
              textAlign: 'center'
            }}
          >
            Lorem ipsum dolor sit amet consectetur. Auctor mauris ornare metus sociis ullamcorper porttitor dolor sed. Vel aenean lorem dolor fames diam justo ut. Gravida urna dolor adipiscing ultricies.
          </p>
        </div>
      </div>

      {/* Fifth Section - L&T Ad */}
      <div className="md:hidden w-full px-4 py-12" ref={fifthSection.ref}>
        <div className="flex flex-col items-center justify-center">
          {/* L&T Ad Image */}
          <div className={`w-full animate-scaleIn ${fifthSection.isIntersecting ? 'animate-on-scroll' : ''}`}>
            <img 
              src="/frontend-images/homepage/l&tad.png" 
              alt="L&T Finance Ad" 
              className="w-full h-auto mx-auto"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="md:hidden w-full bg-black px-4 py-6" ref={footerSection.ref}>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Copyright Text */}
          <div className={`text-left animate-fadeInLeft ${footerSection.isIntersecting ? 'animate-on-scroll' : ''}`}>
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
          <div className={`flex items-center gap-3 animate-fadeInRight animate-delay-200 ${footerSection.isIntersecting ? 'animate-on-scroll' : ''}`}>
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

      {/* Desktop View - New Design */}
      <div className="hidden md:block min-h-screen" style={{ backgroundColor: '#80CBEB' }}>
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
          {/* Gradient Overlay */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, #0084B7 0%, #004E87 100%)',
              opacity: '0.85'
            }}
          />
          
          <div className="relative z-10 flex items-center justify-start max-w-7xl mx-auto px-8 py-6">
            <div className="flex items-center">
              <img 
                src="/frontend-images/homepage/justzoom logo.png" 
                alt="JustZoom Logo" 
                className="h-24 w-auto"
              />
            </div>
          </div>
        </header>

        {/* Desktop Hero Section */}
        <div 
          className="relative overflow-hidden"
          style={{
            backgroundImage: 'url(/frontend-images/homepage/bumrah 1.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            borderBottomLeftRadius: '40px',
            borderBottomRightRadius: '40px'
          }}
        >
          {/* Gradient Overlay */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, #0084B7 0%, #004E87 100%)',
              opacity: '0.85'
            }}
          />
          
          <div className="relative z-10 max-w-7xl mx-auto px-8 py-12">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left Column - Content */}
              <div className="space-y-8">
                {/* Main Heading */}
                <div className="space-y-4">
                  <h1 
                    className="text-white leading-tight"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: '800',
                      fontStyle: 'italic',
                      fontSize: '4rem',
                      lineHeight: '1.1'
                    }}
                  >
                    JUST ZOOM
                  </h1>
                  
                  <div className="mb-8">
                    <img 
                      src="/frontend-images/homepage/bumraahtext.png" 
                      alt="Bumraah Text" 
                      className="h-16 w-auto"
                    />
                  </div>
                </div>

                {/* Description */}
                <p 
                  className="text-white text-xl leading-relaxed max-w-lg"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '400',
                    fontSize: '18px',
                    lineHeight: '1.6'
                  }}
                >
                  Measure your bowling speed with precision using AI-powered motion detection. 
                  Get instant analysis and see if you're bowling slow, fast, or absolutely zooming!
                </p>

                {/* CTA Buttons */}
                <div className="flex gap-4">
                  <Link 
                    href="/participate" 
                    className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                    style={{
                      backgroundColor: '#FFC315',
                      borderRadius: '25px',
                      fontFamily: 'Frutiger, Inter, sans-serif',
                      fontWeight: '700',
                      fontSize: '18px',
                      color: 'black',
                      padding: '16px 32px'
                    }}
                  >
                    Get Started
                  </Link>
                  
                </div>
              </div>

              {/* Right Column - Visual replaced with GIF */}
              <div className="relative flex items-center justify-center" style={{ marginTop: '-64px' }}>
                <img 
                  src="/7 (1).gif" 
                  alt="Hero GIF" 
                  className="w-full max-w-lg h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-8 py-16">
          <div className="text-center mb-16">
            <h2 
              className="text-white mb-4"
              style={{
                fontFamily: 'Frutiger, Inter, sans-serif',
                fontWeight: '700',
                fontSize: '36px',
                lineHeight: '1.2'
              }}
            >
              How It Works
            </h2>
            <p 
              className="text-white/70 text-lg max-w-2xl mx-auto"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '400'
              }}
            >
              Get professional bowling analysis in just 3 simple steps
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center group">
              <div 
                className="w-20 h-20 mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                style={{
                  backgroundColor: '#FFC315',
                  borderRadius: '20px',
                  border: '3px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <img 
                  src="/frontend-images/homepage/icons/Vector (1).svg" 
                  alt="Upload Icon" 
                  className="w-8 h-8"
                />
              </div>
              <h3 
                className="text-white mb-3"
                style={{
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '20px'
                }}
              >
                Upload or Record
              </h3>
              <p 
                className="text-white/70"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}
              >
                Upload your bowling video or record live with your camera for instant analysis
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center group">
              <div 
                className="w-20 h-20 mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                style={{
                  backgroundColor: '#FFC315',
                  borderRadius: '20px',
                  border: '3px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <img 
                  src="/frontend-images/homepage/icons/Vector (2).svg" 
                  alt="Analysis Icon" 
                  className="w-8 h-8"
                />
              </div>
              <h3 
                className="text-white mb-3"
                style={{
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '20px'
                }}
              >
                AI Analysis
              </h3>
              <p 
                className="text-white/70"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}
              >
                Our advanced AI analyzes your bowling motion and calculates speed with high precision
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <div 
                className="w-20 h-20 mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                style={{
                  backgroundColor: '#FFC315',
                  borderRadius: '20px',
                  border: '3px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <img 
                  src="/frontend-images/homepage/icons/Vector (3).svg" 
                  alt="Share Icon" 
                  className="w-8 h-8"
                />
              </div>
              <h3 
                className="text-white mb-3"
                style={{
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '20px'
                }}
              >
                Get Results
              </h3>
              <p 
                className="text-white/70"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}
              >
                View your speed analysis and share your results with friends and coaches
              </p>
            </div>
          </div>
        </div>

        {/* Demo Section */}
        <div className="max-w-7xl mx-auto px-8 py-16">
          <div className="text-center mb-12">
            <h2 
              className="text-white mb-4"
              style={{
                fontFamily: 'Frutiger, Inter, sans-serif',
                fontWeight: '700',
                fontSize: '36px',
                lineHeight: '1.2'
              }}
            >
              See It In Action
            </h2>
            <p 
              className="text-white/70 text-lg"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '400'
              }}
            >
              Watch how professional bowlers get analyzed
            </p>
          </div>

          {/* Video Demo Container */}
          <div className="flex justify-center">
            <div 
              className="relative group cursor-pointer"
              style={{
                width: '600px',
                height: '350px'
              }}
            >
              {/* Background Shadow */}
              <div 
                className="absolute"
                style={{
                  width: '600px',
                  height: '350px',
                  borderRadius: '24px',
                  backgroundColor: '#5BA6DB',
                  top: '12px',
                  left: '12px',
                  zIndex: 1
                }}
              />
              
              {/* Main Video Container */}
              <div 
                className="relative"
                style={{
                  width: '600px',
                  height: '350px',
                  borderRadius: '24px',
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
                    className="flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      backgroundColor: '#FFD42D'
                    }}
                  >
                    <svg 
                      width="50" 
                      height="50" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      style={{ marginLeft: '4px' }}
                    >
                      <path 
                        d="M8 5.14v13.72L19 12L8 5.14z" 
                        fill="none"
                        stroke="rgba(0, 0, 0, 0.8)"
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
          
          {/* Get Started Button */}
          <div className="flex justify-center mt-12">
            <Link 
              href="/participate" 
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
              Get Started
            </Link>
          </div>
        </div>

        {/* 4th Section */}
        <div className="w-full py-16">
          <div className="max-w-7xl mx-auto px-8">
            <img 
              src="/frontend-images/homepage/4thsection.png" 
              alt="L&T Finance Two-Wheeler Loans" 
              className="w-full h-auto object-contain rounded-3xl"
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full bg-black px-8 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
            {/* Left - Copyright */}
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
            
            {/* Right - Social Media */}
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
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.40s.645 1.40 1.441 1.40c.795 0 1.439-.645 1.439-1.40s-.644-1.40-1.439-1.40z"/>
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
