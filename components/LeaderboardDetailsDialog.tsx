'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';

interface LeaderboardDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attemptId: string | null;
  currentEntry?: {
    display_name?: string | null;
    meta?: any;
  };
  onSubmitted?: () => void;
}

export function LeaderboardDetailsDialog({
  open,
  onOpenChange,
  attemptId,
  currentEntry,
  onSubmitted,
}: LeaderboardDetailsDialogProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(null);
      const existingName = currentEntry?.display_name && currentEntry.display_name !== 'Anonymous'
        ? currentEntry.display_name
        : '';
      setName(existingName || '');
      const metaPhone = typeof currentEntry?.meta === 'object' && currentEntry?.meta
        ? (currentEntry?.meta.contact_phone as string | undefined)
        : undefined;
      setPhone(metaPhone || '');
    }
  }, [open, currentEntry]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!attemptId) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const currentMeta = (typeof currentEntry?.meta === 'object' && currentEntry?.meta) ? currentEntry?.meta : {};
      const updatedMeta = {
        ...currentMeta,
        contact_phone: phone.trim() || undefined,
        verified: true,
      };

      const { error: updateError } = await supabase
        .from('bowling_attempts')
        .update({
          display_name: trimmedName,
          meta: updatedMeta,
        })
        .eq('id', attemptId);

      if (updateError) {
        throw updateError;
      }

      setSuccess('Details saved!');
      onSubmitted?.();
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to save details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Your Details</DialogTitle>
          <DialogDescription>
            Add your name (and optionally a contact number) to appear on the leaderboard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="E.g. Jasprit Bumrah"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Phone Number <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Enter phone number"
              inputMode="tel"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !attemptId}>
              {loading ? 'Saving…' : 'Save Details'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
