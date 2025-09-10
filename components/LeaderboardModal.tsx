'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase/client';
import { SpeedClass } from '@/context/AnalysisContext';

type LeaderboardRow = {
  id: string;
  created_at: string;
  name?: string | null;
  display_name?: string | null;
  user_id?: string | null;
  predicted_kmh: number;
  similarity_percent: number;
  intensity_percent: number;
  speed_class: SpeedClass;
};

interface LeaderboardModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  highlightId?: string | null;
}

export function LeaderboardModal({ open, onOpenChange, highlightId }: LeaderboardModalProps) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Prefer the all-time view if it exists
        let q = supabase
          .from('leaderboard_all_time')
          .select('*')
          .order('predicted_kmh', { ascending: false })
          .order('similarity_percent', { ascending: false })
          .limit(10);

        let { data, error: err } = await q;
        // Fallback to raw table if the view is not present
        if (err) {
          const { data: data2, error: err2 } = await supabase
            .from('bowling_attempts')
            .select('*')
            .order('predicted_kmh', { ascending: false })
            .order('similarity_percent', { ascending: false })
            .limit(10);
          if (err2) throw err2;
          data = data2 as any;
        }
        if (!cancelled) {
          setRows((data || []) as any);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load leaderboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const pretty = (n: number | null | undefined, digits = 2) =>
    (typeof n === 'number' ? n.toFixed(digits) : '—');

  const withRank = useMemo(() => rows.map((r, i) => ({ ...r, rank: i + 1 })), [rows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Leaderboard</DialogTitle>
          <DialogDescription>Top speeds and similarity, updated live</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-sm text-red-600 mb-2">{error}</div>
        )}

        <div className="overflow-x-auto rounded-md border max-h-[50vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">km/h</TableHead>
                <TableHead className="text-right">Similarity %</TableHead>
                <TableHead className="text-right">Class</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : withRank.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No entries yet. Be the first!
                  </TableCell>
                </TableRow>
              ) : (
                withRank.map((r) => {
                  const name = (r as any).name ?? r.display_name ?? 'Anonymous';
                  const isHighlight = highlightId && r.id === highlightId;
                  return (
                    <TableRow key={r.id} className={isHighlight ? 'bg-green-50' : ''}>
                      <TableCell className="font-medium">{(r as any).rank}</TableCell>
                      <TableCell>{name}</TableCell>
                      <TableCell className="text-right font-semibold">{pretty(r.predicted_kmh, 2)}</TableCell>
                      <TableCell className="text-right">{pretty(r.similarity_percent, 1)}</TableCell>
                      <TableCell className="text-right">{r.speed_class}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            <TableCaption className="text-xs">Ordered by km/h, then similarity</TableCaption>
          </Table>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LeaderboardModal;
