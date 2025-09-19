'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import styles from './index.module.css';
import { supabase } from '@/lib/supabase/client';
import type { SpeedClass } from '@/context/AnalysisContext';
import { LeaderboardDetailsOverlay } from '@/components/LeaderboardDetailsOverlay';

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
  entry.name || entry.display_name || `Bowler ${index + 1}`;

export default function LeaderboardClient() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pendingAttempt, setPendingAttempt] = useState<LeaderboardEntry | null>(null);

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
    const stored = window.sessionStorage.getItem('lastLeaderboardEntryId');
    if (stored) {
      setPendingEntryId(stored);
    }
  }, []);

  const ranked = useMemo<RankedEntry[]>(
    () => entries.map((entry, index) => ({ ...entry, rank: index + 1 })),
    [entries]
  );

  const fetchAttempt = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('bowling_attempts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.warn('Failed to load attempt details', error);
      setPendingAttempt(null);
      return null;
    }
    setPendingAttempt((data || null) as LeaderboardEntry | null);
    return data ?? null;
  }, []);

  useEffect(() => {
    if (!pendingEntryId) return;
    (async () => {
      const attempt = await fetchAttempt(pendingEntryId);
      if (!attempt) return;
      const hasName = !!(attempt.display_name && attempt.display_name !== 'Anonymous');
      if (!hasName) {
        setDetailsOpen(true);
      } else if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('lastLeaderboardEntryId');
        setPendingEntryId(null);
      }
    })();
  }, [pendingEntryId, fetchAttempt]);

  const backgroundStyle = {
    backgroundImage: 'url(/frontend-images/homepage/bowlbg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  } as const;

  return (
    <div className={`${styles.page} min-h-screen relative`} style={backgroundStyle}>
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
          {pendingEntryId && (
            <button
              type="button"
              className={styles.ctaSecondary}
              onClick={() => setDetailsOpen(true)}
            >
              Verify &amp; Submit Details
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
        open={detailsOpen && !!pendingEntryId}
        onClose={() => setDetailsOpen(false)}
        initialName={pendingAttempt?.display_name}
        initialPhone={typeof pendingAttempt?.meta === 'object' ? pendingAttempt?.meta?.contact_phone : undefined}
        onSubmit={async ({ name, phone }) => {
          if (!pendingEntryId) return;
          const existingMeta = (typeof pendingAttempt?.meta === 'object' && pendingAttempt?.meta) ? pendingAttempt?.meta : {};
          const updatedMeta = {
            ...existingMeta,
            contact_phone: phone,
            verified: true,
          };

          const { error: updateError } = await supabase
            .from('bowling_attempts')
            .update({ display_name: name, meta: updatedMeta })
            .eq('id', pendingEntryId);

          if (updateError) {
            throw updateError;
          }

          if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem('lastLeaderboardEntryId');
          }
          setPendingEntryId(null);
          setPendingAttempt(null);
          setDetailsOpen(false);
          await loadLeaderboard();
        }}
      />
    </div>
  );
}
