'use client';

import { useEffect, useState } from 'react';
import { User, Phone } from 'lucide-react';

interface LeaderboardDetailsOverlayProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; phone?: string }) => Promise<void>;
  loading?: boolean;
}

export function LeaderboardDetailsOverlay({
  open,
  onClose,
  onSubmit,
  loading = false,
}: LeaderboardDetailsOverlayProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName('');
      setPhone('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

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
      setSubmitting(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-md w-full px-4">
        <div
          className="relative p-6 backdrop-blur-md overflow-hidden"
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

          <div className="mb-6 text-center">
            <h1
              className="text-white mb-1"
              style={{
                fontFamily: 'Frutiger, Inter, sans-serif',
                fontWeight: '700',
                fontSize: '24px',
                lineHeight: '1.2'
              }}
            >
              Your details
            </h1>
            <p
              className="text-white"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '700',
                fontSize: '12px',
                lineHeight: '1.3'
              }}
            >
              Complete your submission
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4 flex justify-center">
              <div
                className="relative"
                style={{
                  width: '308px',
                  height: '40px'
                }}
              >
                <User
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-full pl-12 pr-4 text-black placeholder-gray-500 bg-white border border-gray-400 focus:border-blue-500 focus:outline-none"
                  style={{
                    borderRadius: '20px',
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontSize: '14px'
                  }}
                  disabled={submitting || loading}
                  required
                />
              </div>
            </div>

            <div className="mb-6 flex justify-center">
              <div
                className="relative"
                style={{
                  width: '308px',
                  height: '40px'
                }}
              >
                <Phone
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-full pl-12 pr-4 text-black placeholder-gray-500 bg-white border border-gray-400 focus:border-blue-500 focus:outline-none"
                  style={{
                    borderRadius: '20px',
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontSize: '14px'
                  }}
                  disabled={submitting || loading}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-300 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
                {error}
              </p>
            )}

            <div className="flex justify-center">
              <button
                type="submit"
                className="text-black font-bold transition-all duration-300 transform hover:scale-105 disabled:opacity-60"
                style={{
                  width: '261px',
                  height: '40px',
                  backgroundColor: '#FFC315',
                  borderRadius: '20px',
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontSize: '14px'
                }}
                disabled={submitting || loading}
              >
                {submitting || loading ? 'Saving…' : 'Save Details'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
