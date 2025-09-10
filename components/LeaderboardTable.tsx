'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Row = {
  id: string;
  created_at: string;
  name?: string | null;
  display_name?: string | null;
  predicted_kmh: number;
  similarity_percent: number;
  speed_class: 'Slow' | 'Fast' | 'Zooooom';
};

export default function LeaderboardTable({ limit = 10 }: { limit?: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let { data, error } = await supabase
          .from('leaderboard_all_time')
          .select('*')
          .order('predicted_kmh', { ascending: false })
          .order('similarity_percent', { ascending: false })
          .limit(limit);
        if (error) {
          const fb = await supabase
            .from('bowling_attempts')
            .select('*')
            .order('predicted_kmh', { ascending: false })
            .order('similarity_percent', { ascending: false })
            .limit(limit);
          if (fb.error) throw fb.error;
          data = fb.data as any;
        }
        if (!cancelled) setRows((data || []) as any);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load leaderboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [limit]);

  const pretty = (n: number | null | undefined, digits = 2) =>
    typeof n === 'number' ? n.toFixed(digits) : '—';

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Leaderboard</h2>
        <span className="text-sm text-gray-500">Top {limit}</span>
      </div>
      <div className="overflow-x-auto rounded-md border max-h-96 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">km/h</TableHead>
              <TableHead className="text-right">Similarity %</TableHead>
              <TableHead className="text-right">Class</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-red-600">{error}</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No entries yet.</TableCell>
              </TableRow>
            ) : (
              rows.map((r, idx) => {
                const name = (r as any).name ?? r.display_name ?? 'Anonymous';
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell>{name}</TableCell>
                    <TableCell className="text-right font-semibold">{pretty(r.predicted_kmh, 2)}</TableCell>
                    <TableCell className="text-right">{pretty(r.similarity_percent, 1)}</TableCell>
                    <TableCell className="text-right">{r.speed_class}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          <TableCaption className="text-xs">All-time top speeds</TableCaption>
        </Table>
      </div>
    </div>
  );
}
