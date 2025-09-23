'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import styles from './index.module.css';
import { supabase } from '@/lib/supabase/client';
import type { SpeedClass } from '@/context/AnalysisContext';
import { LeaderboardDetailsOverlay } from '@/components/LeaderboardDetailsOverlay';
import { useToast } from '@/components/Toast';
import type { DetailsCardSubmitPayload } from '@/components/DetailsCard';

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
  type PendingEntryData = {
    predicted_kmh: number;
    similarity_percent: number;
    intensity_percent: number;
    speed_class: SpeedClass | null;
    meta?: any;
  };

  const [pendingEntry, setPendingEntry] = useState<PendingEntryData | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
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
    const storedVideo = window.sessionStorage.getItem('analysisVideoData');
    if (storedVideo) {
      try {
        const parsedVideo = JSON.parse(storedVideo) as AnalysisVideoData;
        if (!parsedVideo.playerName) {
          parsedVideo.playerName = 'Player';
        }
        if (parsedVideo.playerPhone === undefined && typeof window !== 'undefined') {
          const storedPhone = window.sessionStorage.getItem('analysisPlayerPhone');
          if (storedPhone) {
            parsedVideo.playerPhone = storedPhone;
          }
        }
        setVideoData(parsedVideo);
      } catch (error) {
        console.warn('Invalid analysis video data', error);
        window.sessionStorage.removeItem('analysisVideoData');
      }
    }
    const storedGeneratedUrl = window.sessionStorage.getItem('analysisGeneratedVideoUrl');
    if (storedGeneratedUrl) {
      setGeneratedVideoUrl(storedGeneratedUrl);
    }
    const stored = window.sessionStorage.getItem('pendingLeaderboardEntry');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPendingEntry(parsed);
        setDetailsOpen(true);
      } catch (error) {
        console.warn('Invalid pending leaderboard entry', error);
        window.sessionStorage.removeItem('pendingLeaderboardEntry');
      }
    }
  }, []);

  useEffect(() => {
    if (!videoData) return;
    if (pendingEntry) return;
    if (!videoData.playerName || videoData.playerName === 'Player') {
      setDetailsOpen(true);
    }
  }, [videoData, pendingEntry]);

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
          message: 'Save your details so we can personalize the video.',
        });
        setDetailsOpen(true);
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

  const handleDetailsSubmit = useCallback(
    async ({ name, phone, consent }: DetailsCardSubmitPayload) => {
      if (!consent) {
        throw new Error('Please accept the consent checkbox to continue.');
      }
      if (!pendingEntry) return;

      const trimmedName = name.trim();
      const trimmedPhone = phone?.trim() ?? '';

      const payload: Record<string, any> = {
        display_name: trimmedName,
        predicted_kmh: pendingEntry.predicted_kmh,
        similarity_percent: pendingEntry.similarity_percent,
        intensity_percent: pendingEntry.intensity_percent,
        speed_class: pendingEntry.speed_class,
        meta: {
          ...(pendingEntry.meta || {}),
          contact_phone: trimmedPhone || null,
          display_name: trimmedName,
          player_name: trimmedName,
          verified: true,
        },
      };

      const { error: insertError } = await supabase
        .from('bowling_attempts')
        .insert(payload);

      if (insertError) {
        throw insertError;
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('pendingLeaderboardEntry');
      }

      let resolvedVideoData: AnalysisVideoData | null = videoData;
      setVideoData((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          playerName: trimmedName || 'Player',
          playerPhone: trimmedPhone || prev.playerPhone,
        };
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('analysisVideoData', JSON.stringify(updated));
          if (trimmedPhone) {
            window.sessionStorage.setItem('analysisPlayerPhone', trimmedPhone);
          }
        }
        resolvedVideoData = updated;
        return updated;
      });

      setPendingEntry(null);
      setDetailsOpen(false);
      const leaderboardPromise = loadLeaderboard();

      if (resolvedVideoData && isEligibleForVideo(resolvedVideoData.intensity)) {
        await runVideoGeneration(resolvedVideoData);
      }

      await leaderboardPromise;
    },
    [pendingEntry, loadLeaderboard, runVideoGeneration, videoData]
  );

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
          <Image
            src="/frontend-images/homepage/justzoom logo.png"
            alt="JustZoom"
            width={120}
            height={48}
            className={styles.brand}
            priority
          />
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
          <Link href="/analyze" className={styles.ctaSecondary}>
            <Image
              src="/frontend-images/homepage/icons/ri_reset-left-line.svg"
              alt="Retry icon"
              width={20}
              height={20}
            />
            Retry Analysis
          </Link>
          {pendingEntry && (
            <button
              type="button"
              className={styles.ctaSecondary}
              onClick={() => setDetailsOpen(true)}
            >
              Verify &amp; Submit Details
            </button>
          )}
          {generatedVideoUrl && (
            <button
              type="button"
              className={styles.ctaPrimary}
              onClick={handleViewVideo}
            >
              Watch Analysis Video
            </button>
          )}
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.footerCopy}>
            © L&amp;T Finance Limited (formerly known as L&amp;T Finance Holdings Limited) | CIN: L67120MH2008PLC181833
          </p>
          <div className={styles.footerSocial}>
            <span>Connect with us</span>
            <div className={styles.socialDots}>
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </footer>
      <LeaderboardDetailsOverlay
        open={detailsOpen && !!pendingEntry}
        onClose={() => setDetailsOpen(false)}
        onSubmit={handleDetailsSubmit}
      />
    </div>
  );
}
