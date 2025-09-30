'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import type { SpeedClass } from '@/context/AnalysisContext';

type LeaderboardEntry = {
  id: string;
  created_at: string;
  name?: string | null;
  display_name?: string | null;
  predicted_kmh: number | null;
  similarity_percent: number | null;
  intensity_percent: number | null;
  speed_class: SpeedClass | null;
  meta?: any;
};

type RankedEntry = LeaderboardEntry & { rank: number };

const formatNumber = (value: number | null | undefined, digits = 1) =>
  typeof value === 'number' ? value.toFixed(digits) : '—';

const fallbackName = (entry: LeaderboardEntry, index: number) =>
  entry.name ||
  entry.display_name ||
  entry.meta?.display_name ||
  entry.meta?.player_name ||
  entry.meta?.playerName ||
  `PLAYER ${index + 1}`;

export default function LeaderboardClient() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('leaderboard_all_time')
        .select('*')
        .order('predicted_kmh', { ascending: false })
        .order('similarity_percent', { ascending: false })
        .limit(3);

      let { data, error: queryError } = await query;

      if (queryError) {
        const fallback = await supabase
          .from('bowling_attempts')
          .select('*')
          .order('predicted_kmh', { ascending: false })
          .order('similarity_percent', { ascending: false })
          .limit(3);

        if (fallback.error) throw fallback.error;
        data = fallback.data as LeaderboardEntry[];
      }

      setEntries((data || []) as LeaderboardEntry[]);
    } catch (err: any) {
      setError(err?.message || 'Unable to load leaderboard right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const ranked = React.useMemo<RankedEntry[]>(
    () => entries.map((entry, index) => ({ ...entry, rank: index + 1 })),
    [entries]
  );

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
            <img
              src="/images/instructions/loanapproved.png"
              alt="Loan Approved"
              style={{ position: "absolute", top: -170, right: -8, width: 150, height: "auto", zIndex: 1, pointerEvents: "none" }}
            />

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
                gap: 6,
                zIndex: 2,
                marginTop: 20,
              }}
            >
              {/* Universal Back Arrow Box - Top Left */}
              <div
                onClick={() => {
                  window.history.back();
                }}
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  width: "30px",
                  height: "30px",
                  border: "1px solid white",
                  borderRadius: "4px",
                  backgroundColor: "rgba(0,0,0,0.1)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 10,
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.1)";
                }}
              >
                {/* Left Arrow Icon (without stem) - Even Bigger */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path 
                    d="M15 18L9 12L15 6" 
                    stroke="white" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              {/* Headline and Subheadline */}
              <div className="mb-3 text-center">
                <div
                  style={{
                    position: "relative",
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: 800,
                    fontStyle: "italic",
                    fontSize: "clamp(16px, 4vw, 19.65px)",
                    color: "#000000",
                    lineHeight: 1.1,
                    marginBottom: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  Leaderboard = Rewards!
                </div>

                <p
                  style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: 400,
                    fontStyle: "normal",
                    fontSize: "clamp(12px, 3vw, 14px)", // increased from clamp(10px, 2.5vw, 12px)
                    color: "#000000",
                    lineHeight: 1.3,
                    margin: 0
                  }}
                >
                  Higher the rank, closer you are to meeting<br />Bumrah & winning signed gear.
                </p>
              </div>

              {/* Leaderboard Table */}
              <div
                className="w-full max-w-sm md:max-w-md mx-auto"
                style={{
                  minHeight: 310,
                  background: "linear-gradient(180deg, #1E75B3 0%, #014F87 100%)",
                  borderRadius: 18,
                  padding: 20,
                  marginBottom: 10
                }}
              >
                {/* Table Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 16
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Helvetica Neue Condensed', 'Arial Narrow', sans-serif",
                      fontWeight: 800,
                      fontStyle: "italic",
                      fontSize: "clamp(12px, 3vw, 16px)",
                      color: "white",
                      flex: "0 0 120px"
                    }}
                  >
                    PLAYER
                  </span>
                  <span
                    style={{
                      fontFamily: "'Helvetica Neue Condensed', 'Arial Narrow', sans-serif",
                      fontWeight: 800,
                      fontStyle: "italic",
                      fontSize: "clamp(12px, 3vw, 16px)",
                      color: "white",
                      flex: "0 0 80px",
                      textAlign: "center"
                    }}
                  >
                    SPEED
                  </span>
                  <span
                    style={{
                      fontFamily: "'Helvetica Neue Condensed', 'Arial Narrow', sans-serif",
                      fontWeight: 800,
                      fontStyle: "italic",
                      fontSize: "clamp(12px, 3vw, 16px)",
                      color: "white",
                      flex: "0 0 80px",
                      textAlign: "center"
                    }}
                  >
                    MATCH
                  </span>
                </div>

                {/* Table Entries */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {loading ? (
                    <div
                      style={{
                        fontFamily: "'Helvetica Neue Condensed', 'Arial Narrow', sans-serif",
                        fontWeight: 800,
                        fontStyle: "italic",
                        fontSize: 16,
                        color: "white",
                        textAlign: "center",
                        paddingTop: 40
                      }}
                    >
                      Loading...
                    </div>
                  ) : error ? (
                    <div
                      style={{
                        fontFamily: "'Helvetica Neue Condensed', 'Arial Narrow', sans-serif",
                        fontWeight: 800,
                        fontStyle: "italic",
                        fontSize: 16,
                        color: "white",
                        textAlign: "center",
                        paddingTop: 40
                      }}
                    >
                      Unable to load
                    </div>
                  ) : ranked.length === 0 ? (
                    <div
                      style={{
                        fontFamily: "'Helvetica Neue Condensed', 'Arial Narrow', sans-serif",
                        fontWeight: 800,
                        fontStyle: "italic",
                        fontSize: 16,
                        color: "white",
                        textAlign: "center",
                        paddingTop: 40
                      }}
                    >
                      No entries yet
                    </div>
                  ) : (
                    ranked.slice(0, 3).map((entry, index) => {
                      const name = fallbackName(entry as LeaderboardEntry, index);
                      return (
                        <div
                          key={entry.id}
                          style={{
                            position: "relative",
                            marginBottom: 12
                          }}
                        >
                          {/* Avatar Box - Positioned First */}
                          <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-40%)", zIndex: 2 }}>
                            <div style={{ position: "relative" }}>
                              {/* Avatar Box with Border */}
                              <div
                                style={{
                                  width: 50,
                                  height: 50,
                                  borderRadius: 5.48,
                                  background: "linear-gradient(180deg, #7FCAEB 0%, #3B98C0 100%)",
                                  padding: 3.91,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  position: "relative"
                                }}
                              >
                                {/* Inner content box */}
                                <div
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    borderRadius: "calc(5.48px - 3.91px)",
                                    backgroundColor: "#1970AC",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                  }}
                                >
                                  <img
                                    src="/images/el_user.svg"
                                    alt="User"
                                    style={{
                                      width: 20,
                                      height: 20,
                                      filter: "brightness(0) invert(1)"
                                    }}
                                  />
                                </div>
                              </div>
                              
                              {/* Ranking Badge - Middle aligned to bottom boundary */}
                              <div
                                style={{
                                  position: "absolute",
                                  bottom: 0,
                                  left: "50%",
                                  transform: "translateX(-50%) translateY(50%)",
                                  width: 18,
                                  height: 18,
                                  borderRadius: "50%",
                                  background: "linear-gradient(180deg, #7FCAEB 0%, #3B98C0 100%)",
                                  padding: 1.56,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                              >
                                <div
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    borderRadius: "50%",
                                    backgroundColor: "#1970AC",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily: "'Helvetica Neue Condensed', 'Arial Narrow', sans-serif",
                                      fontWeight: 800,
                                      fontStyle: "italic",
                                      fontSize: 10,
                                      color: "white",
                                      lineHeight: 1
                                    }}
                                  >
                                    {entry.rank}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Player Record Box - Overlapping Avatar */}
                          <div
                            className="flex-1 min-w-0"
                            style={{
                              height: 32.86,
                              position: "relative",
                              marginLeft: 25,
                              marginTop: 8.57, // (50 - 32.86) / 2 to center vertically with avatar
                              background: "#FFFFFF26",
                              borderRadius: 3.13,
                              clipPath: "polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)",
                              border: "1px solid",
                              borderImage: "linear-gradient(180deg, #7FCAEB 0%, #3B98C0 100%) 1",
                              display: "flex",
                              alignItems: "center",
                              paddingLeft: 35,
                              paddingRight: 30,
                              zIndex: 1
                            }}
                          >
                            {/* Content aligned under column headers */}
                            <div style={{ 
                              display: "flex", 
                              width: "100%", 
                              alignItems: "center"
                            }}>
                              {/* Player Name - positioned after avatar with line breaks */}
                              <div style={{ flex: "0 0 85px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                {(() => {
                                  const words = name.split(' ');
                                  if (words.length > 1) {
                                    const midPoint = Math.ceil(words.length / 2);
                                    const firstLine = words.slice(0, midPoint).join(' ');
                                    const secondLine = words.slice(midPoint).join(' ');
                                    return (
                                      <>
                                        <span
                                          style={{
                                            fontFamily: "'Helvetica Neue Condensed', 'Arial Narrow', sans-serif",
                                            fontWeight: 800,
                                            fontStyle: "italic",
                                            fontSize: 10,
                                            color: "white",
                                            textTransform: "uppercase",
                                            lineHeight: 1,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap"
                                          }}
                                        >
                                          {firstLine}
                                        </span>
                                        <span
                                          style={{
                                            fontFamily: "'Helvetica Neue Condensed', 'Arial Narrow', sans-serif",
                                            fontWeight: 800,
                                            fontStyle: "italic",
                                            fontSize: 10,
                                            color: "white",
                                            textTransform: "uppercase",
                                            lineHeight: 1,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap"
                                          }}
                                        >
                                          {secondLine}
                                        </span>
                                      </>
                                    );
                                  } else {
                                    return (
                                      <span
                                        style={{
                                          fontFamily: "'Helvetica Neue Condensed', 'Arial Narrow', sans-serif",
                                          fontWeight: 800,
                                          fontStyle: "italic",
                                          fontSize: 12,
                                          color: "white",
                                          textTransform: "uppercase",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap"
                                        }}
                                      >
                                        {name}
                                      </span>
                                    );
                                  }
                                })()}
                              </div>

                              {/* Speed - aligned under SPEED column */}
                              <div style={{ flex: "0 0 70px", textAlign: "left" }}>
                                <span
                                  style={{
                                    fontFamily: "'Helvetica Neue Condensed', 'Arial Narrow', sans-serif",
                                            fontWeight: 800,
                                            fontStyle: "italic",
                                            fontSize: "clamp(14px, 3.5vw, 18px)",
                                            color: "white"
                                  }}
                                >
                                  {formatNumber(entry.predicted_kmh, 0)}kmph
                                </span>
                              </div>

                              {/* Match - aligned under MATCH column */}
                              <div style={{ flex: "0 0 60px", textAlign: "left", paddingLeft: "8px" }}>
                                <span
                                  style={{
                                    fontFamily: "'Helvetica Neue Condensed', 'Arial Narrow', sans-serif",
                                            fontWeight: 800,
                                            fontStyle: "italic",
                                            fontSize: "clamp(14px, 3.5vw, 18px)",
                                            color: "white"
                                  }}
                                >
                                  {formatNumber(entry.similarity_percent, 0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* View More Link - Inside blue box */}
                {ranked.length > 0 && (
                  <div
                    style={{
                      marginTop: 20,
                      textAlign: "center"
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Helvetica Neue Condensed', 'Arial Narrow', sans-serif",
                        fontWeight: 800,
                        fontStyle: "italic",
                        fontSize: 14,
                        color: "white",
                        textDecoration: "underline",
                        cursor: "pointer"
                      }}
                      onClick={() => {
                        // Could navigate to full leaderboard or show modal
                        console.log('View more clicked');
                      }}
                    >
                      VIEW MORE..
                    </span>
                  </div>
                )}
              </div>

              {/* Missed Your Mark Section */}
              <div className="mt-2 text-center" style={{ marginTop: 2 }}>
                <div
                  style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: 800,
                    fontStyle: "normal",
                    fontSize: "clamp(14px, 3vw, 16px)", // increased from clamp(12px, 2.5vw, 14px)
                    color: "#13264A",
                    lineHeight: 1.2,
                    marginBottom: 4 // increased from 2
                  }}
                >
                  Missed your mark?
                </div>
                <div
                  style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: 400,
                    fontStyle: "normal",
                    fontSize: "clamp(13px, 3vw, 15px)", // increased from clamp(11px, 2.5vw, 14px)
                    color: "#13264A",
                    lineHeight: 1.2,
                    marginBottom: 16
                  }}
                >
                  Don't worry, just hit retry and try again!
                </div>

                {/* Action Buttons */}
                <div className="flex flex-row gap-3 justify-center w-full max-w-xs mx-auto">
                  {/* Retry Button */}
                  <button
                    onClick={() => {
                      window.location.href = '/record-upload?mode=record';
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
                    <img
                      src="/frontend-images/homepage/icons/ri_reset-left-line.svg"
                      alt="Retry"
                      style={{ width: 16, height: 16, filter: "brightness(0)" }}
                    />
                    Retry
                  </button>

                  {/* View Gallery Button */}
                  <button
                    onClick={() => {
                      window.location.href = '/gallery';
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
                    <img
                      src="/frontend-images/homepage/icons/ooui_image-gallery.svg"
                      alt="Gallery"
                      style={{ width: 16, height: 16, filter: "brightness(0)" }}
                    />
                    View Gallery
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

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
