'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import styles from './index.module.css';
import { supabase } from '@/lib/supabase/client';
import type { SpeedClass } from '@/context/AnalysisContext';
import { useToast } from '@/components/Toast';
import { clearAnalysisSessionStorage } from '@/lib/utils/sessionCleanup';

const VIDEO_INTENSITY_THRESHOLD = 85;
const isEligibleForVideo = (value?: number | null) =>
  typeof value === 'number' && value >= VIDEO_INTENSITY_THRESHOLD;

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

type AnalysisVideoData = {
  intensity: number;
  speedClass: SpeedClass | null;
  kmh: number;
  similarity: number;
  frameIntensities?: { timestamp: number; intensity: number }[];
  phases: {
    runUp: number;
    delivery: number;
    followThrough: number;
  };
  technicalMetrics: {
    armSwing: number;
    bodyMovement: number;
    rhythm: number;
    releasePoint: number;
  };
  recommendations: string[];
  playerName?: string;
  playerPhone?: string;
  createdAt?: string;
};

interface ProcessingModalProps {
  message: string;
}

function ProcessingModal({ message }: ProcessingModalProps) {
  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        <div className={styles.modalSpinner} aria-hidden="true" />
        <p className={styles.modalTitle}>Rendering your video…</p>
        <p className={styles.modalBody}>{message}</p>
      </div>
    </div>
  );
}

interface VideoResultModalProps {
  videoUrl: string;
  onClose: () => void;
  onDownload?: () => void;
}

function VideoResultModal({ videoUrl, onClose, onDownload }: VideoResultModalProps) {
  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close video modal">
          Close
        </button>
        <p className={styles.modalTitle}>Your analysis video is ready</p>
        <video className={styles.modalVideo} src={videoUrl} controls playsInline autoPlay>
          Your browser does not support the video tag.
        </video>
        <div className={styles.modalActions}>
          <a
            href={videoUrl}
            download="bowling-analysis-video.mp4"
            className={styles.modalButtonPrimary}
            onClick={onDownload}
          >
            Download Video
          </a>
          <button type="button" className={styles.modalButtonSecondary} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const formatNumber = (value: number | null | undefined, digits = 1) =>
  typeof value === 'number' ? value.toFixed(digits) : '—';

const fallbackName = (entry: LeaderboardEntry, index: number) =>
  entry.name ||
  entry.display_name ||
  entry.meta?.display_name ||
  entry.meta?.player_name ||
  entry.meta?.playerName ||
  `Bowler ${index + 1}`;

export default function LeaderboardClient() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Removed pendingEntry and detailsOpen as details modal moved to analyze page
  const [videoData, setVideoData] = useState<AnalysisVideoData | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const { addToast, ToastContainer } = useToast();
  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('leaderboard_all_time')
        .select('*')
        .order('predicted_kmh', { ascending: false })
        .order('similarity_percent', { ascending: false })
        .limit(5);

      let { data, error: queryError } = await query;

      if (queryError) {
        const fallback = await supabase
          .from('bowling_attempts')
          .select('*')
          .order('predicted_kmh', { ascending: false })
          .order('similarity_percent', { ascending: false })
          .limit(5);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    console.log('=== LEADERBOARD PAGE RETRIEVAL ===');
    console.log('All session storage keys:', Object.keys(window.sessionStorage));
    console.log('All session storage values:', Object.entries(window.sessionStorage));
    
    console.log('Checking sessionStorage for analysisVideoData...');
    let storedVideo = window.sessionStorage.getItem('analysisVideoData');
    console.log('Retrieved from sessionStorage (primary):', storedVideo);
    
    // Try backup if primary is null
    if (!storedVideo) {
      console.log('Primary key failed, trying backup key...');
      storedVideo = window.sessionStorage.getItem('analysisVideoData_backup');
      console.log('Retrieved from backup key:', storedVideo);
      
      // If backup exists, restore to primary
      if (storedVideo) {
        console.log('Restoring backup to primary key...');
        window.sessionStorage.setItem('analysisVideoData', storedVideo);
      }
    }
    
    console.log('Type of retrieved data:', typeof storedVideo);
    
    // Check timestamp to see when data was stored
    const timestamp = window.sessionStorage.getItem('analysisVideoData_timestamp');
    if (timestamp) {
      const timeAgo = Date.now() - parseInt(timestamp);
      console.log('Data was stored', timeAgo, 'ms ago');
    }
    if (storedVideo) {
      try {
        const parsedVideo = JSON.parse(storedVideo) as AnalysisVideoData;
        console.log('Parsed video data:', parsedVideo);
        if (!parsedVideo.playerName) {
          parsedVideo.playerName = 'Player';
        }
        if (parsedVideo.playerPhone === undefined && typeof window !== 'undefined') {
          const storedPhone = window.sessionStorage.getItem('analysisPlayerPhone');
          if (storedPhone) {
            parsedVideo.playerPhone = storedPhone;
          }
        }
        
        // Check if this is a fresh analysis (no existing generated video URL for this analysis)
        const currentGeneratedUrl = window.sessionStorage.getItem('analysisGeneratedVideoUrl');
        if (currentGeneratedUrl) {
          // Check if the generated video was for this specific analysis
          // If player name changed, it's likely a new analysis, so clear the old video URL
          const lastVideoPlayerName = window.sessionStorage.getItem('lastVideoPlayerName');
          if (lastVideoPlayerName !== parsedVideo.playerName) {
            console.log('New analysis detected (different player), clearing old video URL');
            window.sessionStorage.removeItem('analysisGeneratedVideoUrl');
            window.sessionStorage.setItem('lastVideoPlayerName', parsedVideo.playerName || 'Player');
          }
        } else {
          // Store player name to track when analysis changes
          window.sessionStorage.setItem('lastVideoPlayerName', parsedVideo.playerName || 'Player');
        }
        
        console.log('Setting videoData to:', parsedVideo);
        setVideoData(parsedVideo);
      } catch (error) {
        console.warn('Invalid analysis video data', error);
        window.sessionStorage.removeItem('analysisVideoData');
      }
    } else {
      console.log('No analysisVideoData found in sessionStorage');
    }
    const storedGeneratedUrl = window.sessionStorage.getItem('analysisGeneratedVideoUrl');
    if (storedGeneratedUrl) {
      setGeneratedVideoUrl(storedGeneratedUrl);
    }
    // Pending entry handling moved to analyze page
  }, []);

  // Auto-show details modal logic moved to analyze page

  const ranked = useMemo<RankedEntry[]>(
    () => entries.map((entry, index) => ({ ...entry, rank: index + 1 })),
    [entries]
  );

  const runVideoGeneration = useCallback(
    async (rawData: AnalysisVideoData | null) => {
      if (!rawData) {
        addToast({
          type: 'error',
          title: 'Analysis missing',
          message: 'Complete a fresh analysis to generate your video.',
        });
        return false;
      }

      if (!isEligibleForVideo(rawData.intensity)) {
        addToast({
          type: 'info',
          title: 'Not eligible yet',
          message: 'Generate a faster delivery (85%+) to unlock the video.',
        });
        return false;
      }

      const playerName = rawData.playerName?.trim();
      if (!playerName || playerName === 'Player') {
        addToast({
          type: 'info',
          title: 'Add your name',
          message: 'Complete your analysis details first.',
        });
        return false;
      }

      const previousUrl = generatedVideoUrl;

      try {
        setShowVideoModal(false);
        setGeneratedVideoUrl(null);
        setShowProcessingModal(true);

        const analysisData = {
          ...rawData,
          speedClass: rawData.speedClass ?? 'Slow',
          playerName,
        } as AnalysisVideoData;

        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('analysisVideoData', JSON.stringify(analysisData));
          window.sessionStorage.removeItem('analysisGeneratedVideoUrl');
        }

        const response = await fetch('/api/generate-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ analysisData }),
        });

        if (!response.ok) {
          throw new Error('Video generation failed');
        }

        const result = await response.json();
        if (result.success && result.videoUrl) {
          setGeneratedVideoUrl(result.videoUrl);
          setShowProcessingModal(false);
          setShowVideoModal(true);
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('analysisGeneratedVideoUrl', result.videoUrl);
          }
          return true;
        }

        throw new Error(result.error || 'Video generation failed');
      } catch (error) {
        console.error('Video generation failed:', error);
        addToast({
          type: 'error',
          title: 'Video generation failed',
          message: 'Please try again in a moment.',
        });
        if (previousUrl) {
          setGeneratedVideoUrl(previousUrl);
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('analysisGeneratedVideoUrl', previousUrl);
          }
        }
        return false;
      } finally {
        setShowProcessingModal(false);
      }
    },
    [addToast, generatedVideoUrl]
  );

  // handleDetailsSubmit moved to analyze page

  const handleVideoModalClose = useCallback(() => {
    setShowVideoModal(false);
  }, []);

  const handleViewVideo = useCallback(() => {
    if (!generatedVideoUrl) return;
    setShowVideoModal(true);
  }, [generatedVideoUrl]);


  const backgroundStyle = {
    backgroundImage: 'url(/frontend-images/homepage/bowlbg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  } as const;

  return (
    <div className={`${styles.page} min-h-screen relative`} style={backgroundStyle}>
      <ToastContainer />
      {showProcessingModal && (
        <ProcessingModal message="Give us a moment while we render your highlights." />
      )}
      {showVideoModal && generatedVideoUrl && (
        <VideoResultModal videoUrl={generatedVideoUrl} onClose={handleVideoModalClose} />
      )}
      <header className={styles.header}>
        <div className={styles.headerBar}>
          <Link href="/analyze" className={styles.backLink}>
            <ArrowLeft className={styles.backIcon} />
            <span>Back</span>
          </Link>
          <div className="flex-1 flex justify-center">
            <Link href="/">
              <Image
                src="/frontend-images/homepage/justzoom logo.png"
                alt="JustZoom"
                width={120}
                height={48}
                className={styles.brand}
                priority
              />
            </Link>
          </div>
          <div className="w-[76px]"></div> {/* Spacer to balance the back button */}
        </div>
        <div className={styles.heroCopy}>
          <h1 className={styles.title}>Congratulations!</h1>
          <p className={styles.subtitle}>Your bowling analysis is complete</p>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.summaryCard}>
          <p className={styles.summaryHeadline}>Thank You for Participating!</p>
          <p className={styles.summaryBody}>
            Your bowling data helps improve our AI analysis and contributes to cricket analytics research.
          </p>
        </section>

        <section className={styles.boardSection}>
          <h2 className={styles.boardTitle}>Current Top 5</h2>
          {error && <div className={styles.error}>{error}</div>}
          {loading ? (
            <div className={styles.loading}>Loading leaderboard…</div>
          ) : ranked.length === 0 ? (
            <div className={styles.empty}>No entries yet. Complete an analysis to claim the top spot!</div>
          ) : (
            <ol className={styles.boardList}>
              {ranked.slice(0, 5).map((entry) => {
                const name = fallbackName(entry as LeaderboardEntry, entry.rank - 1);
                return (
                  <li key={entry.id} className={styles.boardRow}>
                    <div className={styles.rowLeft}>
                      <span className={styles.boardRank}>#{entry.rank}</span>
                      <span className={styles.boardName}>{name}</span>
                    </div>
                    <span className={styles.boardSpeed}>{formatNumber(entry.predicted_kmh, 1)} km/h</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className={styles.actions}>
          <Link href="/quick-analysis" className={styles.ctaPrimary}>
            <Image
              src="/frontend-images/homepage/icons/ooui_image-gallery.svg"
              alt="Gallery icon"
              width={20}
              height={20}
            />
            View Gallery
          </Link>
          <Link 
            href="/record-upload?mode=record" 
            className={styles.ctaSecondary}
            onClick={(e) => {
              clearAnalysisSessionStorage();
            }}
          >
            <Image
              src="/frontend-images/homepage/icons/ri_reset-left-line.svg"
              alt="Retry icon"
              width={20}
              height={20}
            />
            Retry Analysis
          </Link>
          {/* Verify & Submit Details button removed - now handled in analyze page */}
          {/* Video Generation for High Performance Users */}
          {videoData && isEligibleForVideo(videoData.similarity || videoData.intensity) && (
            <div>
              {!generatedVideoUrl ? (
                <button
                  type="button"
                  className={styles.ctaPrimary}
                  onClick={() => runVideoGeneration(videoData)}
                  style={{ backgroundColor: '#4CAF50', color: 'white' }}
                >
                  🎥 Generate Analysis Video
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.ctaPrimary}
                  onClick={handleViewVideo}
                  style={{ backgroundColor: '#FF6B35', color: 'white' }}
                >
                  🎥 Watch Analysis Video
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="relative bg-black px-4 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-left">
            <p
              className="text-xs text-white"
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

          <div className="flex items-center gap-3">
            <span
              className="mr-2 text-xs text-white"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '400',
                fontSize: '10px'
              }}
            >
              Connect with us
            </span>

            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>

              <div className="flex h-8 w-8 items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>

              <div className="flex h-8 w-8 items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </div>

              <div className="flex h-8 w-8 items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
