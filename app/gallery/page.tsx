'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassBackButton } from '@/components/GlassBackButton';

export default function GalleryPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Add multiple report cards if you have them, for now using the same one
  const reportCards = [
    '/images/newhomepage/Report Card.png',
    '/images/newhomepage/Report Card.png',
    '/images/newhomepage/Report Card.png',
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % reportCards.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + reportCards.length) % reportCards.length);
  };

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: "url(/images/instructions/Instructions%20bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <main className="flex-1 px-6 pt-20 pb-8 flex justify-center relative z-10">
        <div className="relative mx-auto max-w-md md:max-w-2xl lg:max-w-4xl" style={{ width: "100%", maxWidth: 400, marginTop: 4 }}>
          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16, paddingLeft: 4 }}>
            <Link href="/">
              <img
                src="/images/newhomepage/Bowling%20Campaign%20Logo.png"
                alt="Bowling Campaign Logo"
                className="w-52 md:w-64 lg:w-72"
                style={{ height: "auto", cursor: "pointer" }}
              />
            </Link>
          </div>

          <div style={{ position: "relative", width: "100%" }}>
            {/* Loan Approved Image */}
            <img
              src="/images/instructions/loanapproved.png"
              alt="Loan Approved"
              style={{ position: "absolute", top: -170, right: -8, width: 150, height: "auto", zIndex: 1, pointerEvents: "none" }}
            />

            {/* Glass Box Container */}
            <div
              className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto"
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
                gap: 12,
                zIndex: 2,
                marginTop: 20,
              }}
            >
              {/* Universal Back Arrow Box - Top Left */}
              <GlassBackButton />

              {/* Gallery Title Image */}
              <div className="w-full flex justify-center mb-4" style={{ marginTop: 20 }}>
                <img
                  src="/images/newhomepage/Group 1437254106 (1).png"
                  alt="Gallery"
                  style={{ width: "auto", maxWidth: "100%", height: "auto" }}
                />
              </div>

              {/* Subline Text */}
              <p
                style={{
                  fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                  fontWeight: 400,
                  fontSize: "clamp(11px, 2.5vw, 12px)",
                  lineHeight: "14px",
                  color: "#000000",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                Fill in your details so we can send you your personalised bowling analysis.
              </p>

              {/* Report Card Carousel */}
              <div className="w-full relative" style={{ marginTop: 12 }}>
                {/* Carousel Container */}
                <div style={{ position: "relative", width: "100%", overflow: "hidden", borderRadius: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      transition: "transform 0.3s ease-in-out",
                      transform: `translateX(-${currentSlide * 100}%)`,
                    }}
                  >
                    {reportCards.map((card, index) => (
                      <div
                        key={index}
                        style={{
                          minWidth: "100%",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <img
                          src={card}
                          alt={`Report Card ${index + 1}`}
                          style={{
                            width: "100%",
                            height: "auto",
                            borderRadius: 12,
                            objectFit: "contain",
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Previous Button */}
                  <button
                    onClick={prevSlide}
                    style={{
                      position: "absolute",
                      left: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      backdropFilter: "blur(4px)",
                      border: "none",
                      borderRadius: "50%",
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      zIndex: 10,
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
                    }}
                  >
                    <ChevronLeft size={20} color="black" />
                  </button>

                  {/* Next Button */}
                  <button
                    onClick={nextSlide}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      backdropFilter: "blur(4px)",
                      border: "none",
                      borderRadius: "50%",
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      zIndex: 10,
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
                    }}
                  >
                    <ChevronRight size={20} color="black" />
                  </button>
                </div>

                {/* Carousel Indicators */}
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
                  {reportCards.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        border: "none",
                        backgroundColor: currentSlide === index ? "#FDC217" : "#FFFFFF80",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 12, width: "100%", justifyContent: "center", marginTop: 16 }}>
                <button
                  onClick={() => {
                    window.location.href = '/';
                  }}
                  style={{
                    backgroundColor: "#CCEAF7",
                    borderRadius: "25.62px",
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: "700",
                    fontSize: "clamp(12px, 2.5vw, 14px)",
                    color: "black",
                    width: "157.78px",
                    height: "36px",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9 21 9 18 9 16C9 14 10 14 12 14C14 14 15 14 15 16V21M9 21H15" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Home
                </button>

                <button
                  onClick={() => {
                    window.location.href = '/leaderboard';
                  }}
                  style={{
                    backgroundColor: "#FDC217",
                    borderRadius: "25.62px",
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: "700",
                    fontSize: "clamp(12px, 2.5vw, 14px)",
                    color: "black",
                    width: "157.78px",
                    height: "36px",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 13H15L21 7V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V13Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18 7V2H6V7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Leaderboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto w-full bg-black py-6 px-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
          <div className="text-left">
            <p className="text-white text-xs" style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 10, lineHeight: 1.4 }}>
              Copyright L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white text-xs mr-2" style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 10 }}>
              Connect with us
            </span>
            <div className="flex gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/></svg>
              </div>
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              </div>
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
