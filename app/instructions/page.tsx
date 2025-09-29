"use client";

import Link from "next/link";
import { GlassBackButton } from '@/components/GlassBackButton';

const bulletPoints = [
  "Camera at crease level, steady.",
  "Release point must be visible.",
  "Record in landscape mode.",
  "Capture full run-up to follow-through.",
  "Good lighting = accurate speed.",
];

export default function InstructionsPage() {
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
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-col min-h-screen" style={{
        backgroundImage: "url(/images/Desktop.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}>
        {/* Logo in top left corner */}
        <div className="absolute top-6 left-6 z-20">
          <Link href="/">
            <img
              src="/images/newhomepage/Bowling%20Campaign%20Logo.png"
              alt="Bowling Campaign Logo"
              className="w-64 lg:w-72"
              style={{ height: "auto", cursor: "pointer" }}
            />
          </Link>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex items-stretch px-8 relative">
          {/* Left side - Bumrah Image */}
          <div className="flex-1 relative">
            <img
              src="/images/Bumrah%205.png"
              alt="Bumrah"
              style={{ 
                position: 'absolute',
                bottom: 0,
                left: '60%',
                transform: 'translateX(-50%)',
                width: '500px', 
                height: '600px', 
                margin: 0,
                padding: 0,
                display: 'block',
                objectFit: 'contain',
                zIndex: 10
              }}
            />
          </div>

          {/* Right side - Glass Box Content */}
          <div className="flex-1 flex justify-center items-center py-16" style={{ marginTop: '50px' }}>
            <div className="relative" style={{ maxWidth: 420 }}>
              <div
                className="w-full"
                style={{
                  position: "relative",
                  borderRadius: 16,
                  backgroundColor: "#FFFFFF80",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: "inset 0 0 0 1px #FFFFFF",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  zIndex: 2,
                }}
              >
                {/* Universal Back Arrow Box - Top Left */}
                <GlassBackButton />
                <div
                  style={{
                    position: "relative",
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: 800,
                    fontStyle: "italic",
                    fontSize: 16,
                    textTransform: "uppercase",
                    color: "#0A0A0A",
                    lineHeight: 1.1,
                    marginBottom: 3,
                  }}
                >
                  <img
                    src="/images/newhomepage/woosh.svg"
                    alt=""
                    aria-hidden
                    style={{ position: "absolute", left: -18, top: "50%", transform: "translateY(-50%)", height: 14, filter: "brightness(0) saturate(100%)" }}
                  />
                  INSTRUCTIONS
                </div>

                <div className="grid grid-cols-2 gap-2 w-full">
                  <img src="/images/instructions/good.png" alt="Good" className="w-full h-auto rounded-md" />
                  <img src="/images/instructions/failed.png" alt="Failed" className="w-full h-auto rounded-md" />
                </div>

                <ul style={{ width: "100%", paddingInlineStart: 14, margin: 0, listStyle: "disc", color: "#0A0A0A" }}>
                  {bulletPoints.map((text) => (
                    <li
                      key={text}
                      style={{
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: 400,
                        fontSize: 11,
                        lineHeight: "14px",
                        marginBottom: 3,
                      }}
                    >
                      {text}
                    </li>
                  ))}
                </ul>

                <div
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    backgroundColor: "rgba(0, 149, 215, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: "8px 10px",
                  }}
                >
                  <span style={{ fontFamily: "'FrutigerLT Pro', Inter, sans-serif", fontWeight: 700, fontSize: 10, color: "#000", lineHeight: "12px" }}>
                    Pro Tip: Higher video quality means more precise speed and action analysis — avoid camera shake for the best results!
                  </span>
                </div>

                <Link
                  href="/record-upload"
                  className="w-full mt-1"
                  style={{
                    backgroundColor: "#FFC315",
                    borderRadius: 20,
                    height: 38,
                    padding: 0,
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "black",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  I'm Ready, Proceed
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Footer */}
        <footer className="w-full bg-black py-6 px-6 relative z-20">
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
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

      {/* Mobile Layout */}
      <div className="md:hidden">
        <main className="flex-1 px-6 pt-20 pb-8 flex justify-center relative z-10">
          <div className="relative mx-auto max-w-md md:max-w-2xl lg:max-w-4xl" style={{ width: "100%", maxWidth: 400, marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16, paddingLeft: 4 }}>
              <Link href="/">
                <img
                  src="/images/newhomepage/Bowling%20Campaign%20Logo.png"
                  alt="Bowling Campaign Logo"
                  className="w-52"
                  style={{ height: "auto", cursor: "pointer" }}
                />
              </Link>
            </div>

            <div style={{ position: "relative", width: "100%" }}>
              <img
                src="/images/newhomepage/Bumrah%20Ball%20in%20Hand%201.png"
                alt="Bumrah Ball in Hand"
                style={{ position: "absolute", top: -170, right: -8, width: 150, height: "auto", zIndex: 1, pointerEvents: "none" }}
              />

              <div
                className="w-full max-w-sm mx-auto"
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
                <div
                  style={{
                    position: "relative",
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: 800,
                    fontStyle: "italic",
                    fontSize: "clamp(16px, 4vw, 19.65px)",
                    textTransform: "uppercase",
                    color: "#0A0A0A",
                    lineHeight: 1.1,
                    marginBottom: 6,
                  }}
                >
                  <img
                    src="/images/newhomepage/woosh.svg"
                    alt=""
                    aria-hidden
                    style={{ position: "absolute", left: -22, top: "50%", transform: "translateY(-50%)", height: 18, filter: "brightness(0) saturate(100%)" }}
                  />
                  INSTRUCTIONS
                </div>

                <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                  <img src="/images/instructions/good.png" alt="Good" className="w-full h-auto rounded-lg" />
                  <img src="/images/instructions/failed.png" alt="Failed" className="w-full h-auto rounded-lg" />
                </div>

                <ul style={{ width: "100%", paddingInlineStart: 18, margin: 0, listStyle: "disc", color: "#0A0A0A" }}>
                  {bulletPoints.map((text) => (
                    <li
                      key={text}
                      style={{
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: 400,
                        fontSize: "clamp(11px, 2.5vw, 12px)",
                        lineHeight: "16px",
                        marginBottom: 4,
                      }}
                    >
                      {text}
                    </li>
                  ))}
                </ul>

                <div
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    backgroundColor: "rgba(0, 149, 215, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: "10px 12px",
                  }}
                >
                  <span style={{ fontFamily: "'FrutigerLT Pro', Inter, sans-serif", fontWeight: 700, fontSize: "clamp(9px, 2vw, 10px)", color: "#000", lineHeight: "14px" }}>
                    Pro Tip: Higher video quality means more precise speed and action analysis — avoid camera shake for the best results!
                  </span>
                </div>

                <Link
                  href="/record-upload"
                  className="w-full max-w-xs mt-2"
                  style={{
                    backgroundColor: "#FFC315",
                    borderRadius: 24,
                    height: 41,
                    padding: 0,
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: 700,
                    fontSize: "clamp(14px, 3vw, 16px)",
                    color: "black",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  I'm Ready, Proceed
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>

      <footer className="md:hidden mt-auto w-full bg-black py-6 px-6">
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
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


