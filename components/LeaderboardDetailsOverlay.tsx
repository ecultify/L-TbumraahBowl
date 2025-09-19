'use client';

import { useEffect, useState } from 'react';
import { User, Phone } from 'lucide-react';

interface LeaderboardDetailsOverlayProps {
  open: boolean;
  onClose: () => void;
  initialName?: string | null;
  initialPhone?: string | null;
  loading?: boolean;
  onSubmit: (payload: { name: string; phone?: string }) => Promise<void>;
}

export function LeaderboardDetailsOverlay({
  open,
  onClose,
  initialName,
  initialPhone,
  loading = false,
  onSubmit,
}: LeaderboardDetailsOverlayProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName && initialName !== 'Anonymous' ? initialName : '');
      setPhone(initialPhone ?? '');
      setError(null);
    }
  }, [open, initialName, initialPhone]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name: trimmed, phone: phone.trim() || undefined });
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
      <div
        className="relative w-[90%] max-w-md p-6 text-white"
        style={{
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
        }}
      >
        <button
          type="button"
          className="absolute top-4 right-4 text-white/70 hover:text-white"
          onClick={onClose}
          disabled={submitting || loading}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <h2
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: 'Frutiger, Inter, sans-serif' }}
          >
            Your details
          </h2>
          <p className="text-sm text-white/70">
            Add your name so it appears on the leaderboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={18} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full bg-white text-black rounded-full pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FDC217]"
              style={{ fontFamily: 'Frutiger, Inter, sans-serif' }}
              disabled={submitting || loading}
              required
            />
          </div>

          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={18} />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number (optional)"
              className="w-full bg-white text-black rounded-full pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FDC217]"
              style={{ fontFamily: 'Frutiger, Inter, sans-serif' }}
              disabled={submitting || loading}
            />
          </div>

          {error && <p className="text-sm text-red-300 text-center">{error}</p>}

          <button
            type="submit"
            className="w-full bg-[#FDC217] text-black font-bold rounded-full py-3 transition-transform duration-200 hover:scale-105 disabled:opacity-60"
            style={{ fontFamily: 'Frutiger, Inter, sans-serif' }}
            disabled={submitting || loading}
          >
            {submitting || loading ? 'Saving…' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
