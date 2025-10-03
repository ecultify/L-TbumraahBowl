'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useIntersectionObserver } from '../hooks/use-intersection-observer';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';

export default function Home() {
  // Intersection observers for each section
  const heroSection = useIntersectionObserver({ threshold: 0.3, freezeOnceVisible: true });
  const secondSection = useIntersectionObserver({ threshold: 0.5, freezeOnceVisible: true });
  const thirdSection = useIntersectionObserver({ threshold: 0.5, freezeOnceVisible: true });
  const fourthSection = useIntersectionObserver({ threshold: 0.5, freezeOnceVisible: true });
  const fifthSection = useIntersectionObserver({ threshold: 0.5, freezeOnceVisible: true });
  const footerSection = useIntersectionObserver({ threshold: 0.3, freezeOnceVisible: true });

  // Carousel state for dots
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [selectedDot, setSelectedDot] = useState(0);
  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setSelectedDot(carouselApi.selectedScrollSnap());
    carouselApi.on('select', onSelect);
    onSelect();
    return () => {
      try { carouselApi.off('select', onSelect); } catch {}
    };
  }, [carouselApi]);

  // Video modal state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Video box states
  const [isDesktopVideoPlaying, setIsDesktopVideoPlaying] = useState(false);
  const [isMobileVideoPlaying, setIsMobileVideoPlaying] = useState(false);
  const desktopVideoRef = useRef<HTMLVideoElement | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Attempt autoplay when modal opens (muted + playsInline to satisfy mobile policies)
  useEffect(() => {
    if (isVideoModalOpen && videoRef.current) {
      try {
        const v = videoRef.current;
        v.muted = true;
        const p = v.play();
        if (p && typeof p.then === 'function') {
          p.catch(() => {
            // ignore autoplay rejection; user can press play
          });
        }
      } catch {
        // no-op
      }
    }
  }, [isVideoModalOpen]);

  // Hero background container (bottom corners rounded)
  const heroContainerStyle: CSSProperties = {
    minHeight: 740,
    paddingTop: 20, // reduced from 44 to pull content up
    backgroundImage: 'url("/images/newhomepage/front%20bg.jpg")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
    // Clip to rounded corners so the curve is visible
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  };

  const responsiveHeroStageStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: 340,
    minHeight: 740,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    textAlign: 'center',
    zIndex: 1, // Keep main hero content above decorative background elements
  };

  const campaignLogoStyle: CSSProperties = {
    width: 155,
    height: 75,
    objectFit: 'contain',
  };

  const heroTaglineStyle: CSSProperties = {
    width: 272.145885145891,
    height: 80.1699098927113,
    transform: 'rotate(-0.49deg)',
    transformOrigin: 'center',
    marginTop: -12,
    objectFit: 'contain',
  };

  const heroSubtextStyle: CSSProperties = {
    width: 330.00000933969835,
    height: 51,
    color: '#FFFFFF',
    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
    fontWeight: 800,
    fontSize: 24,
    lineHeight: 1.2,
    fontStyle: 'italic',
    marginTop: -10, // pushed down a bit
  };

  const yellowPanelStyle: CSSProperties = {
    width: 254.712646484375,
    maxWidth: '100%',
    height: 352.0151062011719,
    borderRadius: 22.04,
    backgroundColor: '#FFC315',
    opacity: 0.5,
    mixBlendMode: 'luminosity',
    border: 0,
    boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(60.61px)',
    position: 'relative',
    overflow: 'hidden',
    padding: 0,
    marginTop: 2, // further reduced from 8 to bring it even closer to the text above
  };

  const heroCopyStyle: CSSProperties = {
    width: 186.99998885393143,
    maxWidth: '100%',
    textAlign: 'center',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 14,
    lineHeight: 1.3,
    color: '#003358',
  };

  const heroButtonStyle: CSSProperties = {
    backgroundColor: '#FFC315',
    borderRadius: 25.62,
    fontFamily: 'Frutiger, Inter, sans-serif',
    fontWeight: 700,
    fontSize: 16,
    color: 'black',
    width: 261,
    height: 41,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12, // reduced from -4 to bring button closer to yellow panel
  };

  // Hero "WIN" word (replaces image), styled like TAKE CHALLENGE
  const winWordStyle: CSSProperties = {
    display: 'inline-block',
    position: 'relative',
    marginTop: 12,
    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
    fontWeight: 700,
    fontStyle: 'italic',
    fontSize: 22,
    color: '#FFFFFF',
    lineHeight: 1.05,
    textTransform: 'uppercase',
    alignSelf: 'center',
  };
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#80CBEB' }}>
      {/* Unified Responsive Hero Section */}
      <div className="" ref={heroSection.ref} style={{ position: 'relative' }}>
        <div
          className={`relative flex justify-center items-start pb-12 md:hidden`}
          style={heroContainerStyle}
        >
          <div style={responsiveHeroStageStyle}>
            <Link href="/">
              <img
                src="/images/newhomepage/Bowling%20Campaign%20Logo.png"
                alt="Bowling Campaign Logo"
                style={{...campaignLogoStyle, cursor: "pointer"}}
                className={`animate-fadeInDown ${heroSection.isIntersecting ? 'animate-on-scroll' : ''}`}
              />
            </Link>
            <img
              src="/images/bowlkarbumrahkispeedpar.png"
              alt="Bowl Kar Bumraah Ki Speed Par"
              style={heroTaglineStyle}
              className={`animate-fadeInUp animate-delay-200 ${heroSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            />
            {/* Subtext below the tagline */}
            <div
              style={heroSubtextStyle}
              className={`animate-fadeInUp animate-delay-300 ${heroSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            >
              <div style={{ transform: 'rotate(-0.5deg)', transformOrigin: 'center', display: 'flex', justifyContent: 'center', marginTop: '-15px' }}>
                <img
                  src="/images/showoff.png"
                  alt="Bowl Like Me and Get a Chance to Meet Me"
                  style={{
                    width: 'auto',
                    height: 'auto',
                    maxWidth: '120%',
                    maxHeight: '120px'
                  }}
                />
              </div>
            </div>
            <div
              style={yellowPanelStyle}
              className={`animate-scaleIn animate-delay-400 ${heroSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            >
              <img
                src="/images/newhomepage/Bumrah%20Ball%20in%20Hand%201.png"
                alt="Bumrah ball in hand"
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '-5px', // increased negative value to close the gap
                  transform: 'translateX(-50%)',
                  height: '100%', // fill height to eliminate any bottom gap
                  width: 'auto',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center bottom',
                  display: 'block',
                  margin: 0,
                  padding: 0,
                }}
              />
            </div>
            <Link
              href="/instructions"
              className={`inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 animate-bounceIn animate-delay-800 ${heroSection.isIntersecting ? 'animate-on-scroll' : ''}`}
              style={heroButtonStyle}
            >
              Get Started
            </Link>

            {/* And also Win word with woosh icon attached to A */}
            <div style={{...winWordStyle, marginTop: 8}}>
              <img
                src="/images/andalsowinasterisk.png"
                alt="And Also Win"
                style={{
                  height: 24,
                  width: 'auto',
                  pointerEvents: 'none',
                }}
              />
            </div>
            
            {/* Additional text after WIN */}
            <div 
              style={{
                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                fontWeight: 400,
                fontSize: 'clamp(16px, 3.5vw, 20px)', // increased from clamp(12px, 3vw, 16px)
                color: '#000000',
                lineHeight: 1.1, // reduced from 1.2 for tighter spacing
                textAlign: 'center',
                marginTop: -15 // reduced from -10 for closer spacing
              }}
            >
              Bumrah's signed gears & vouchers*
            </div>
          </div>
        </div>
        {/* Decorative element below hero - hidden on desktop */}
        <img
          src="/images/newhomepage/Vector%2011.png"
          alt=""
          aria-hidden
          className="md:hidden"
          style={{
            position: 'absolute',
            left: '50%',
            top: '100%', // start right below hero container
            transform: 'translate(-50%, -90px)', // adjusted to match reduced hero height
            width: '100vw', // cover entire screen width
            height: 'auto',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />

        {/* Gratifications image straddling the hero bottom border - hidden on desktop */}
        <img
          src="/images/gratificationnew.png"
          alt="Gratifications"
          aria-hidden
          className="md:hidden"
          style={{
            position: 'absolute',
            left: '50%',
            top: '100%',
            transform: 'translate(-50%, -40%)', // moved up by 10px (from -30% to -40%)
            width: 320,
            height: 140,
            zIndex: 2, // above hero background so upper half is in front
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Desktop Hero Section - Integrated */}
      <div className="hidden md:block" style={{ position: 'relative' }}>
        {/* Desktop Hero Content */}
        <div 
          className="relative overflow-hidden"
          style={{
            backgroundImage: 'url(/images/Landing%20page%20BG.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            borderBottomLeftRadius: '40px',
            borderBottomRightRadius: '40px',
            zIndex: 1
          }}
        >
          
          <div className="relative z-10 max-w-7xl mx-auto px-8 pt-6 pb-16">
            {/* Logo at the top */}
            <div className="mb-8" style={{ marginLeft: '-45px' }}>
              <Link href="/">
              <img 
                src="/images/newhomepage/Bowling%20Campaign%20Logo.png" 
                alt="Bowling Campaign Logo" 
                  className="h-20 md:h-24 w-auto cursor-pointer"
              />
              </Link>
            </div>

            {/* Hero Content Grid */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left Column - Content */}
              <div className="space-y-6">
                {/* Main Heading */}
                <div 
                  className="space-y-2"
                  style={{
                    marginTop: '10px'
                  }}
                >
                  <img
                    src="/images/bowlkarbumrahkispeedpar.png"
                    alt="Bowl Kar Bumraah Ki Speed Par"
                    className="h-20 md:h-24 lg:h-32 w-auto"
                  />
                  <div
                    className="text-white leading-tight"
                    style={{
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: 800,
                      fontStyle: 'italic',
                      fontSize: '36px',
                      lineHeight: 1.2,
                      textTransform: 'uppercase',
                      transform: 'rotate(-3.48deg)',
                      transformOrigin: 'center',
                      maxWidth: '500px',
                      marginTop: '-10px'
                    }}
                  >
                    SHOW OFF YOUR BOWLING STYLE AND GET A CHANCE TO MEET ME
                  </div>
                </div>

                {/* CTA Button */}
                <div className="flex gap-4">
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
                      padding: '12px 40px'
                    }}
                  >
                    <strong>Get Started</strong>
                  </Link>
                </div>

                {/* WIN Section replaced with andalsowin + subline + desktop gratifications (Desktop only) */}
                <div 
                  className="hidden md:flex flex-col items-start gap-2"
                  style={{ marginTop: 'calc(4rem + 85px)' }}
                >
                  {/* And Also Win banner */}
                  <img
                    src="/images/andalsowindesktop2.png"
                    alt="And Also Win"
                    style={{ height: 27, width: 'auto', marginLeft: '-30px' }}
                  />
                  {/* Subline from mobile */}
                  <div 
                    style={{
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: 400,
                      fontSize: '21px',
                      color: '#FFFFFF',
                      lineHeight: 1.1,
                      textTransform: 'none',
                      marginTop: '-2px'
                    }}
                  >
                    Bumrah's signed gears & vouchers*
                  </div>
                  {/* Desktop gratifications visual */}
                  <img
                    src="/images/desktop%20gratifiecation.png"
                    alt="Gratifications"
                    style={{ width: 520, height: 'auto', marginTop: '10px' }}
                  />
                </div>
              </div>

              {/* Right Column - Visual */}
              <div className="relative flex items-center justify-center">
                {/* Image positioned to extend beyond container */}
                  <img
                    src="/images/newhomepage/Bumrah%20Ball%20in%20Hand%201.png"
                    alt="Bumrah ball in hand"
                    style={{
                      position: 'absolute',
                      left: '50%',
                    bottom: '-5px',
                      transform: 'translateX(-50%)',
                    height: 'auto',
                    width: '85%',
                      objectFit: 'contain',
                      objectPosition: 'center bottom',
                      display: 'block',
                      margin: 0,
                    padding: 0,
                    zIndex: 2
                  }}
                />
                {/* Container positioned behind the image */}
                <div
                  style={{
                    width: 460,
                    height: 560,
                    borderRadius: 22.04,
                    backgroundColor: '#FFC315',
                    border: 0,
                    boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                    padding: 0,
                    zIndex: 1
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

        {/* Herosection Image - Following same behavior as Vector 11 on mobile */}
        <img
          src="/images/herosection image.png"
          alt=""
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: '100%',
            transform: 'translate(-50%, -220px)',
            width: '100vw',
            height: 'auto',
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Responsive Analysis Steps Section */}
      <div className="md:hidden w-full px-4 py-12" ref={secondSection.ref} style={{ marginTop: 80, paddingBottom: 'calc(3rem + 60px)' }}>
        {/* Section Title */}
        <div className="text-center mb-4">
          {/* Take challenge image */}
          <div className={`mb-2 animate-fadeInUp ${secondSection.isIntersecting ? 'animate-on-scroll' : ''}`}>
            <img 
              src="/images/newhomepage/takechallenge.png" 
              alt="Take Challenge" 
              className="w-auto h-auto mx-auto"
              style={{ maxHeight: '50px' }}
              loading="eager"
            />
          </div>
        </div>

        {/* Glass box container with decorative balls */}
        <div className="relative mx-auto mb-8" style={{ width: 350 }}>
          {/* Left Ball - Partially hidden behind vector */}
          <img 
            src="/frontend-images/homepage/ball.png" 
            alt="Cricket Ball" 
            className={`absolute z-0 animate-bowlingLeft animate-delay-500 ${secondSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              width: '64.78px',
              height: '55.22px',
              top: '32px',
              left: '-45px',
              opacity: 0.5
            }}
          />
          
          {/* Right Ball - Bottom positioning */}
          <img 
            src="/frontend-images/homepage/ball.png" 
            alt="Cricket Ball" 
            className={`absolute bottom-0 z-0 animate-bowlingRight animate-delay-700 ${secondSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{
              width: '81.81px',
              height: '69.73px',
              right: '-40px',
              opacity: 0.5
            }}
          />

          {/* Glassmorphism container below headline */}
          <div
            className={`${secondSection.isIntersecting ? 'animate-on-scroll animate-fadeInUp animate-delay-300' : ''} relative z-10`}
            style={{
              width: 350,
              height: 220,
              borderRadius: 22,
              backgroundColor: '#FFFFFF80',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: 'inset 0 0 0 1px #FFFFFF',
              border: 'none',
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'flex-start',
            }}
          >
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '16px 18px', gap: 18, alignItems: 'flex-start', justifyContent: 'center' }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Left circle per step */}
                <div
                  style={{
                    width: 34.22657012939453,
                    height: 34.22657012939453,
                    borderRadius: '50%',
                    backgroundColor: '#0095D7',
                    boxShadow: '0 0 0 4.82px rgba(0,149,215,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: '0 0 auto',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: 300,
                      fontSize: 'clamp(8px, 2vw, 9px)',
                      lineHeight: 1.18,
                      color: '#FFFFFF',
                      textTransform: 'uppercase',
                    }}
                  >
                    STEP
                  </div>
                  <div
                    style={{
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: 700,
                      fontSize: 'clamp(16px, 4vw, 20px)',
                      lineHeight: 1,
                      color: '#FFFFFF',
                      textTransform: 'uppercase',
                      marginTop: -2,
                    }}
                  >
                    {n}
                  </div>
                </div>

                {/* Right-aligned text vertically centered to circle */}
                <div style={{ marginLeft: 2, textAlign: 'left', display: 'flex', alignItems: 'center', minHeight: 34.22657012939453, flex: 1 }}>
                  {n === 1 && (
                    <div style={{ fontFamily: "'FrutigerLT Pro', Inter, sans-serif", fontWeight: 400, fontSize: 'clamp(16px, 4vw, 20px)', lineHeight: 1.2, color: '#0A0A0A' }}>
                      Upload your Bowling Video
                    </div>
                  )}
                  {n === 2 && (
                    <div style={{ fontFamily: "'FrutigerLT Pro', Inter, sans-serif", fontWeight: 400, fontSize: 'clamp(16px, 4vw, 20px)', lineHeight: 1.2, color: '#0A0A0A' }}>
                      Get a Personalized Analysis Matched with Bumrah
                    </div>
                  )}
                  {n === 3 && (
                    <div style={{ fontFamily: "'FrutigerLT Pro', Inter, sans-serif", fontWeight: 400, color: '#0A0A0A' }}>
                      <div style={{ fontSize: 'clamp(16px, 4vw, 20px)', lineHeight: 1.2 }}>Share your Analysis on Instagram with <span style={{ color: '#000000', fontWeight: 700 }}>#BumrahKiSpeedPar</span>, Tag <span style={{ color: '#000000', fontWeight: 700 }}>@LNTFinance</span>, and Hit Follow.</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>

        {/* Wall of Fame Image */}
        <div className="mx-auto mb-6 flex justify-center">
          <img
            src="/images/newhomepage/walloffame.png"
            alt="Wall of Fame"
            className="w-auto h-auto"
            style={{ maxHeight: '120px' }}
          />
        </div>

        {/* Report card carousel */}
        <div className="mx-auto w-full flex flex-col items-center">
          <Carousel
            opts={{ align: 'center', loop: true, skipSnaps: false }}
            setApi={setCarouselApi}
            className="w-full max-w-[400px]"
          >
            <CarouselContent className="-ml-3 md:-ml-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <CarouselItem key={i} className="pl-3 md:pl-4 basis-1/2">
                  <div className="flex items-center justify-center">
                    <img
                      src="/images/newhomepage/Report Card.png"
                      alt={`Report card ${i + 1}`}
                      className="w-full h-auto object-contain rounded-xl"
                      style={{ maxWidth: 250, aspectRatio: '185/325' }}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {/* Optional arrows hidden on mobile; uncomment if needed */}
            <CarouselPrevious className="hidden" />
            <CarouselNext className="hidden" />
          </Carousel>
          <div className="mt-3 flex justify-center gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: i === selectedDot ? '#FFC315' : 'rgba(255,255,255,0.6)',
                  display: 'inline-block',
                }}
              />)
            )}
          </div>
        </div>

        {/* Remove legacy second section content */}
        {/* Two Column Layout (hidden) */}
        <div style={{display:'none'}} />

        {/* Two Column Layout (legacy) */}
        <div className="flex justify-center items-center gap-6 w-full" style={{display: 'none'}}>
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

      {/* Desktop Features Section */}
      <div className="hidden md:block relative" style={{ marginTop: '180px' }}>
        {/* Take Challenge Image - Positioned on top of vector image */}
        <div className="absolute left-1/2 transform -translate-x-1/2" style={{ top: '-100px', zIndex: 5 }}>
          <img 
            src="/images/takethechallenge.png" 
            alt="Take The Challenge" 
            className="w-auto h-auto mx-auto"
            style={{ maxHeight: '280px' }}
            loading="eager"
          />
        </div>

         <div className="w-full px-8 py-16" style={{ paddingTop: '120px' }}>
           {/* Glass box container with decorative balls */}
           <div className="relative mx-auto mb-8" style={{ width: 1100 }}>
            {/* Left Ball - Far left corner */}
            <img 
              src="/images/ball1.png" 
              alt="Cricket Ball" 
              className="absolute z-0"
              style={{
                width: '220px',
                height: '187px',
                top: '-295px',
                left: '-360px',
                opacity: 0.5
              }}
            />
            
            {/* Right Ball - Far right corner */}
            <img 
              src="/images/ball1.png" 
              alt="Cricket Ball" 
              className="absolute z-0"
              style={{
                width: '250px',
                height: '212px',
                bottom: '215px',
                right: '-180px',
                opacity: 0.5
              }}
            />

             {/* Glassmorphism container */}
             <div
               className="relative z-10"
               style={{
                 width: 1100,
                 height: 450,
                 borderRadius: 40,
                 backgroundColor: '#FFFFFF80',
                 backdropFilter: 'blur(12px)',
                 WebkitBackdropFilter: 'blur(12px)',
                 boxShadow: 'inset 0 0 0 1px #FFFFFF',
                 border: 'none',
                 display: 'flex',
                 alignItems: 'stretch',
                 justifyContent: 'flex-start',
               }}
             >
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '50px 60px', gap: 40, alignItems: 'flex-start', justifyContent: 'center' }}>
                {[1, 2, 3].map((n) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
                    {/* Left circle per step */}
                    <div
              style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        backgroundColor: '#0095D7',
                        boxShadow: '0 0 0 10px rgba(0,149,215,0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: '0 0 auto',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                          fontWeight: 300,
                          fontSize: '14px',
                          lineHeight: 1.18,
                          color: '#FFFFFF',
                          textTransform: 'uppercase',
                        }}
                      >
                        STEP
          </div>
              <div 
                style={{
                          fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                          fontWeight: 700,
                          fontSize: '36px',
                          lineHeight: 1,
                          color: '#FFFFFF',
                          textTransform: 'uppercase',
                          marginTop: -2,
                        }}
                      >
                        {n}
                      </div>
                    </div>

                    {/* Right-aligned text vertically centered to circle */}
                    <div style={{ marginLeft: 8, textAlign: 'left', display: 'flex', alignItems: 'center', minHeight: 80, flex: 1 }}>
                      {n === 1 && (
                        <div style={{ fontFamily: "'FrutigerLT Pro', Inter, sans-serif", fontWeight: 400, fontSize: '26px', lineHeight: 1.3, color: '#0A0A0A' }}>
                          Upload your Bowling Video
                        </div>
                      )}
                      {n === 2 && (
                        <div style={{ fontFamily: "'FrutigerLT Pro', Inter, sans-serif", fontWeight: 400, fontSize: '26px', lineHeight: 1.3, color: '#0A0A0A' }}>
                          Get a Personalized Analysis Matched with Bumrah
                        </div>
                      )}
                       {n === 3 && (
                         <div style={{ fontFamily: "'FrutigerLT Pro', Inter, sans-serif", fontWeight: 400, color: '#0A0A0A' }}>
                           <div style={{ fontSize: '26px', lineHeight: 1.3, maxWidth: '900px' }}>Share your Analysis on Instagram with <span style={{ color: '#000000', fontWeight: 700 }}>#BumrahKiSpeedPar</span>, Tag <span style={{ color: '#000000', fontWeight: 700 }}>@LNTFinance</span>, and Hit Follow.</div>
                         </div>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Spacer to push Wall of Fame and carousel down on desktop */}
          <div className="hidden md:block" style={{ height: '200px' }} />

           {/* Wall of Fame Image - pushed further down to clear vector boundary */}
           <div className="mx-auto mb-12 flex justify-center" style={{ marginTop: '50px' }}>
             <img
               src="/images/newhomepage/walloffame.png"
               alt="Wall of Fame"
               className="w-auto h-auto"
               style={{ maxHeight: '240px' }}
                 />
               </div>

          {/* Report card carousel */}
          <div className="mx-auto w-full flex flex-col items-center" style={{ marginTop: '70px' }}>
            <Carousel
              opts={{ align: 'center', loop: true, skipSnaps: false }}
              setApi={setCarouselApi}
              className="w-full max-w-[1320px]"
            >
              <CarouselContent className="ml-0">
                {Array.from({ length: 4 }).map((_, i) => (
                  <CarouselItem key={i} className="pl-0 basis-1/4">
                    <div className="flex items-center justify-center">
                      <img
                        src="/images/newhomepage/Report Card.png"
                        alt={`Report card ${i + 1}`}
                        className="w-full h-auto object-contain rounded-xl"
                        style={{ maxWidth: 300, aspectRatio: '185/325' }}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden" />
              <CarouselNext className="hidden" />
            </Carousel>
            <div className="mt-6 flex justify-center gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <span
                  key={i}
                style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: i === selectedDot ? '#FFC315' : 'rgba(255,255,255,0.6)',
                    display: 'inline-block',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

    {/* Desktop Watch How Section (desktop-only) */}
    <div className="hidden md:block w-full relative" style={{ marginTop: 80 }}>
      <div className="relative w-full">
        {/* Full-width image to avoid stretching and side gaps */}
        <img
          src="/images/watchdesktop.png"
          alt=""
          aria-hidden
          className="w-full h-auto block"
          style={{ display: 'block' }}
        />
        {/* Overlay content */}
        <div className="absolute inset-0">
          <div className="mx-auto px-8 h-full flex items-center" style={{ maxWidth: '1600px' }}>
            <div className="grid grid-cols-12 items-center w-full gap-2 py-12">
            {/* Left: Watch How title and subline */}
            <div className="col-span-12 lg:col-span-6 flex flex-col items-center text-center" style={{ marginTop: '-30px' }}>
              <div className="mb-8">
                <img 
                  src="/images/newhomepage/watchhow.png" 
                  alt="Watch How"
                  className="w-auto h-auto"
                  style={{ maxHeight: '240px' }}
                />
              </div>
              <p 
                style={{
                  fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                  fontWeight: 700,
                  fontSize: '28px',
                  color: '#FFFFFF',
                  lineHeight: 1.2,
                }}
              >
                Your quick guide to bowling,<br />sharing & winning.
              </p>
              {/* Moved Get Started button under subline (from right column) */}
              <div className="mt-8">
                <a
                  href="/instructions"
                  className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl text-center"
                  style={{
                    backgroundColor: '#FFC315',
                    borderRadius: 25,
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: 700,
                    fontSize: 18,
                    color: 'black',
                    display: 'block',
                    padding: '12px 32px'
                  }}
                >
                  Get Started
                </a>
              </div>
            </div>

            {/* Right: Vertical video box */}
            <div className="col-span-12 lg:col-span-6 flex justify-end" style={{ marginLeft: '-130px' }}>
              <div className="flex flex-col items-end gap-8">
                <div 
                  className="relative"
                  style={{ width: 460, height: 640 }}
                >
                {/* Background shadow box */}
                <div 
                  className="absolute w-full h-full"
                style={{
                    borderRadius: 20,
                    backgroundColor: '#5BA6DB',
                      top: 16,
                      left: 16,
                    zIndex: 1,
                  }}
                />

                {/* Main video box - Now with inline video player */}
                <div 
                  className="relative w-full h-full block"
                style={{
                    borderRadius: 20,
                    overflow: 'hidden',
                    zIndex: 2,
                    backgroundColor: '#000'
                  }}
                >
                  {/* Thumbnail with Play Button Overlay */}
                  {!isDesktopVideoPlaying && (
                    <div 
                      onClick={() => {
                        console.log('🎬 [DESKTOP] Play button clicked - starting video');
                        setIsDesktopVideoPlaying(true);
                        setTimeout(() => {
                          if (desktopVideoRef.current) {
                            desktopVideoRef.current.play();
                          }
                        }, 100);
                      }}
                      className="absolute inset-0 cursor-pointer group z-10"
                      style={{
                        backgroundImage: 'url(/images/thumbnail.png)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRadius: 20
                      }}
                    >
                      {/* Play Button */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div 
                          className="flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                          style={{
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            backgroundColor: '#FFD42D'
                          }}
                        >
                          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 4 }}>
                            <path d="M8 5.14v13.72L19 12L8 5.14z" fill="none" stroke="rgba(0, 0, 0, 0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Actual Video Element */}
                  <video
                    ref={desktopVideoRef}
                    className="w-full h-full object-cover"
                    controls={isDesktopVideoPlaying}
                    playsInline
                    onClick={(e) => {
                      console.log('🎬 [DESKTOP] Video clicked');
                      e.stopPropagation();
                    }}
                    onPlay={() => {
                      console.log('▶️ Desktop inline video playback started');
                      setIsDesktopVideoPlaying(true);
                    }}
                    onPause={() => {
                      console.log('⏸️ Desktop inline video paused');
                    }}
                    onEnded={() => {
                      console.log('🏁 Desktop video ended');
                      setIsDesktopVideoPlaying(false);
                    }}
                    style={{
                      borderRadius: 20,
                      objectFit: 'cover'
                    }}
                  >
                    <source src="/how%20to%20video.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
            </div>

                {/* Get Started button removed from under the video on desktop as requested */}
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Desktop About Section (desktop-only) */}
    <div className="hidden md:block w-full relative" style={{ marginTop: 80 }}>
      <div className="relative w-full">
        {/* Full-width image to avoid stretching and side gaps */}
        <img
          src="/images/aboutdesktop.png"
          alt=""
          aria-hidden
          className="w-full h-auto block"
          style={{ display: 'block' }}
        />
        {/* Overlay content */}
        <div className="absolute inset-0">
          <div className="mx-auto px-8 h-full flex items-center" style={{ maxWidth: '1600px' }}>
            <div className="w-full text-center py-16">
              {/* About LNT PNG */}
              <div className="mb-8">
                <img 
                  src="/images/newhomepage/aboutlnt.png" 
                  alt="About LNT" 
                  className="w-auto h-auto mx-auto"
                  style={{ maxHeight: 230 }}
                />
              </div>
              
              {/* Text Content */}
              <div className="max-w-6xl mx-auto space-y-6">
                {/* First paragraph - Header text */}
                <p 
                style={{
                    color: 'white', 
                    fontSize: '39px',
                    fontFamily: "'Frutiger LT Pro', Inter, sans-serif", 
                  fontWeight: '700',
                    fontStyle: 'normal',
                    lineHeight: 1.2,
                    marginBottom: 16,
                  }}
                >
                  Think you can bowl like Bumrah?<br/>Here's your chance!
                </p>
                
                {/* Second paragraph - Record and analysis */}
                <p 
                style={{
                    color: 'white', 
                    fontSize: '35px',
                    fontFamily: "'Frutiger LT Pro', Inter, sans-serif", 
                  fontWeight: '400',
                    fontStyle: 'normal',
                    lineHeight: 1.2,
                    marginBottom: 16,
                  }}
                >
                  Record your bowling action, upload it,<br/>and get a personalized analysis report.
                </p>
                
                {/* Third paragraph - Climb leaderboard with hashtag */}
                <p 
                  style={{
                    color: 'white', 
                    fontSize: '35px',
                    fontFamily: "'Frutiger LT Pro', Inter, sans-serif", 
                    fontWeight: '400',
                    fontStyle: 'normal',
                    lineHeight: 1.2,
                    marginBottom: 16,
                  }}
                >
                  Climb the leaderboard by sharing your video,<br/>tagging & following L&T Finance on Instagram with{' '}
                  <span style={{ color: '#FFC315', fontWeight: 700 }}>#BumrahKiSpeedPar</span><span style={{ color: '#FFC315' }}>.</span>
                </p>
                
                {/* Fourth paragraph - Win prizes */}
                <p 
                  style={{
                    color: 'white', 
                    fontSize: '35px',
                    fontFamily: "'Frutiger LT Pro', Inter, sans-serif", 
                    fontWeight: '400',
                    fontStyle: 'normal',
                    lineHeight: 1.2,
                  }}
                >
                  Get a chance to meet Bumrah,<br/>& also win Bumrah's signed gears,<br/>and exciting vouchers!
                </p>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Video Section - Watch How Speed Works */}
      <div className="md:hidden w-full relative" style={{ minHeight: 700, marginTop: -40 }}>
        {/* Vector 13 background */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(/images/newhomepage/Vector%2013.png)',
            backgroundSize: 'contain',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat',
            pointerEvents: 'none'
          }}
        />
        
        <div className="relative z-20 flex flex-col items-center justify-start text-center px-4 pt-8 pb-12">
          {/* Watch How PNG */}
          <div className="mb-4">
            <img 
              src="/images/newhomepage/watchhow.png" 
              alt="Watch How" 
              className="w-auto h-auto mx-auto"
              style={{ maxHeight: '120px' }}
            />
          </div>
          
          {/* Text line */}
          <p 
            style={{
              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(14px, 3.5vw, 16px)', // increased from clamp(12px, 3vw, 14.29px)
              color: '#FFFFFF',
              lineHeight: 1.2,
              marginBottom: 24
            }}
          >
            Your quick guide to bowling, sharing & winning.
          </p>

          {/* Video Box Container - Moved from next section */}
          <div 
            className="relative mb-8 mx-auto"
            style={{
              width: 260,
              height: 380,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 25
            }}
          >
            {/* Background Box - positioned diagonally behind */}
            <div 
              className="absolute w-full h-full"
              style={{
                borderRadius: '20px',
                backgroundColor: '#5BA6DB',
                top: '10px',
                left: '10px',
                zIndex: 26
              }}
            />
            
            {/* Main Video Box - Now with inline video player */}
            <div 
              className="relative w-full h-full block"
              style={{
                borderRadius: '20px',
                overflow: 'hidden',
                zIndex: 27,
                top: '0',
                left: '0',
                backgroundColor: '#000'
              }}
            >
              {/* Thumbnail with Play Button Overlay */}
              {!isMobileVideoPlaying && (
                <div 
                  onClick={() => {
                    console.log('🎬 [MOBILE] Play button clicked - starting video');
                    setIsMobileVideoPlaying(true);
                    setTimeout(() => {
                      if (mobileVideoRef.current) {
                        mobileVideoRef.current.play();
                      }
                    }, 100);
                  }}
                  className="absolute inset-0 cursor-pointer group z-10"
                  style={{
                    backgroundImage: 'url(/images/thumbnail.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {/* Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: '#FFD42D'
                      }}
                    >
                      {/* Play Icon */}
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
              )}
              
              {/* Actual Video Element */}
              <video
                ref={mobileVideoRef}
                className="w-full h-full object-cover"
                controls={isMobileVideoPlaying}
                playsInline
                onClick={(e) => {
                  console.log('🎬 [MOBILE] Video clicked');
                  e.stopPropagation();
                }}
                onPlay={() => {
                  console.log('▶️ Mobile inline video playback started');
                  setIsMobileVideoPlaying(true);
                }}
                onPause={() => {
                  console.log('⏸️ Mobile inline video paused');
                }}
                onEnded={() => {
                  console.log('🏁 Mobile video ended');
                  setIsMobileVideoPlaying(false);
                }}
                style={{
                  borderRadius: '20px',
                  objectFit: 'cover'
                }}
              >
                <source src="/how%20to%20video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          {/* Get Started Button - Moved from next section */}
          <Link
            href="/instructions"
            className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105"
            style={{
              backgroundColor: '#FFC315',
              borderRadius: '25.62px',
              fontFamily: 'Frutiger, Inter, sans-serif',
              fontWeight: '700',
              fontSize: 'clamp(14px, 3vw, 16px)',
              color: 'black',
              width: 'clamp(200px, 60vw, 261px)',
              height: '41px',
              position: 'relative',
              zIndex: 25
            }}
          >
            Get Started
          </Link>
        </div>
      </div>


      {/* Desktop Demo Section removed per request */}

      {/* Responsive About Section */}
      <div className="md:hidden w-full relative overflow-hidden" style={{ minHeight: 'auto', marginTop: -40, paddingBottom: '0px', marginBottom: 0 }} ref={fourthSection.ref}>
        {/* Vector 10 background */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(/images/newhomepage/Vector%2010.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat',
            pointerEvents: 'none'
          }}
        />
        
        <div className="relative z-20 flex flex-col items-center justify-start text-center px-4 pt-8 pb-4">
          {/* About LNT PNG */}
          <div className={`mb-6 animate-fadeInUp ${fourthSection.isIntersecting ? 'animate-on-scroll' : ''}`}>
            <img 
              src="/images/newhomepage/aboutlnt.png" 
              alt="About LNT" 
              className="w-auto h-auto mx-auto"
              style={{ maxHeight: '80px' }}
            />
          </div>
          
          {/* New Text Content */}
          <div 
            className={`animate-fadeInUp animate-delay-300 ${fourthSection.isIntersecting ? 'animate-on-scroll' : ''}`}
            style={{ width: '100%', textAlign: 'center', maxWidth: '340px', margin: '-10px auto 0 auto' }}
          >
            {/* First paragraph - Header text */}
            <p 
              style={{
                color: 'white', 
                fontSize: 'clamp(16px, 4vw, 20px)', // increased from clamp(14px, 3vw, 16px)
                fontFamily: "'Frutiger LT Pro', Inter, sans-serif", 
                fontWeight: '700',
                fontStyle: 'normal',
                lineHeight: 1.2,
                marginBottom: 12,
                margin: '0 0 12px 0'
              }}
            >
              Think you can bowl like Bumrah?<br/>Here's your chance!
            </p>
            
            {/* Second paragraph - Record and analysis */}
            <p 
              style={{
                color: 'white', 
                fontSize: 'clamp(14px, 3.5vw, 18px)', // increased from clamp(12px, 2.5vw, 14px)
                fontFamily: "'Frutiger LT Pro', Inter, sans-serif", 
                fontWeight: '400',
                fontStyle: 'normal',
                lineHeight: 1.2,
                marginBottom: 12,
                margin: '0 0 12px 0'
              }}
            >
              Record your bowling action, upload it,<br/>and get a personalized analysis report.
            </p>
            
            {/* Third paragraph - Climb leaderboard with hashtag */}
            <p 
              style={{
                color: 'white', 
                fontSize: 'clamp(14px, 3.5vw, 18px)', // increased from clamp(12px, 2.5vw, 14px)
                fontFamily: "'Frutiger LT Pro', Inter, sans-serif", 
                fontWeight: '400',
                fontStyle: 'normal',
                lineHeight: 1.2,
                marginBottom: 12,
                margin: '0 0 12px 0'
              }}
            >
              Climb the leaderboard by sharing your video,<br/>tagging & following L&T Finance on Instagram with{' '}
              <span style={{ color: '#FFC315', fontWeight: 700 }}>#BumrahKiSpeedPar</span>.
            </p>
            
            {/* Fourth paragraph - Win prizes */}
            <p 
              style={{
                color: 'white', 
                fontSize: 'clamp(14px, 3.5vw, 18px)', // increased from clamp(12px, 2.5vw, 14px)
                fontFamily: "'Frutiger LT Pro', Inter, sans-serif", 
                fontWeight: '400',
                fontStyle: 'normal',
                lineHeight: 1.2,
                margin: '0'
              }}
            >
              Get a chance to meet Bumrah,<br/>& also win Bumrah's signed gears,<br/>and exciting vouchers!
            </p>
          </div>
        </div>
      </div>

      {/* New Section - Group Image Background */}
      <div className="w-full relative" style={{ marginBottom: 0, marginTop: 0 }}>
        {/* Group 1437254115 background */}
        <img 
          src="/images/newhomepage/Group%201437254115.png"
          alt="L&T Finance"
          className="w-full h-auto block"
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: 'block'
          }}
        />
      </div>
      {/* Unified Responsive Footer */}
      <footer className="w-full bg-black px-4 md:px-8 pt-4 pb-6" ref={footerSection.ref}>
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
          {/* Copyright Text */}
          <div className={`text-center animate-fadeInLeft ${footerSection.isIntersecting ? 'animate-on-scroll' : ''}`}>
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
          
          {/* Social Media Icons */}
          <div className={`flex items-center gap-3 animate-fadeInRight animate-delay-200 ${footerSection.isIntersecting ? 'animate-on-scroll' : ''}`}>
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
            
            {/* Social Icons */}
            <div className="flex gap-3 md:gap-4">
              {/* Facebook */}
              <a href="https://m.facebook.com/LnTFS?wtsid=rdr_0GljAOcj6obaXQY93" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              
              {/* Instagram */}
              <a href="https://www.instagram.com/lntfinance?igsh=a3ZvY2JxaWdnb25s" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>

              {/* Twitter */}
              <a href="https://x.com/LnTFinance" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>

              {/* YouTube */}
              <a href="https://www.youtube.com/@LnTFinance" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Legacy Desktop Code - Removed for unified responsive design */}
      <div style={{ display: 'none' }}>
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
                src="/images/newhomepage/Bowling%20Campaign%20Logo.png" 
                alt="Bowling Campaign Logo" 
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
          
          <div className="relative z-10 max-w-7xl mx-auto px-8 py-16">
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
                    href="/instructions"
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

              {/* Right Column - Visual */}
              <div className="relative flex items-center justify-center">
                <img 
                  src="/frontend-images/homepage/bumraahdesktoppic.png" 
                  alt="Bumraah Desktop" 
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
                © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833 | <a href="/terms-and-conditions" className="text-blue-300 hover:text-blue-200 underline">Terms and Conditions</a> | <a href="/terms-and-conditions" className="text-blue-300 hover:text-blue-200 underline">Terms and Conditions</a>
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

        {/* Video Modal */}
        {isVideoModalOpen && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-90"
            onClick={() => {
              console.log('❌ Video modal background clicked - closing modal');
              setIsVideoModalOpen(false);
            }}
          >
            <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 md:m-8">
              {/* Close button */}
              <button
                onClick={() => {
                  console.log('❌ Close button clicked - closing modal');
                  setIsVideoModalOpen(false);
                }}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-[10000]"
                style={{ fontSize: '36px', lineHeight: 1 }}
              >
                ×
              </button>
              
              {/* Video content - Local video file */}
              <div 
                className="relative w-full h-full"
                onClick={(e) => {
                  console.log('🎥 Video content area clicked (propagation stopped)');
                  e.stopPropagation();
                }}
              >
                {/* Local video file - Works perfectly on all devices */}
                <video ref={videoRef}
                  className="w-full h-full rounded-lg"
                  controls
                  playsInline
                  muted
                  autoPlay
                  onCanPlayCapture={() => {
                    try {
                      if (videoRef.current) {
                        const v = videoRef.current;
                        v.muted = true;
                        const p = v.play();
                        if (p && typeof (p as any).then === 'function') {
                          (p as Promise<void>).catch(() => {});
                        }
                      }
                    } catch {}
                  }}
                  style={{ border: 'none', objectFit: 'contain', backgroundColor: '#000' }}
                  onPlay={() => {
                    console.log('▶️ Video playback started');
                  }}
                  onPause={() => {
                    console.log('⏸️ Video paused');
                  }}
                  onLoadStart={() => {
                    console.log('🎬 Video loading started from local file...');
                  }}
                  onLoadedMetadata={() => {
                    console.log('✅ Video metadata loaded successfully');
                  }}
                  onCanPlay={() => {
                    console.log('✅ Video is ready to play');
                  }}
                  onError={(e) => {
                    console.error('❌ Video failed to load');
                    console.error('Error details:', e.currentTarget.error);
                  }}
                >
                  <source src="/how%20to%20video.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
