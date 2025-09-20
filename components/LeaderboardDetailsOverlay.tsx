'use client';

import { useState } from 'react';
import { DetailsCard, type DetailsCardSubmitPayload } from './DetailsCard';

interface LeaderboardDetailsOverlayProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: DetailsCardSubmitPayload) => Promise<void>;
  loading?: boolean;
}

export function LeaderboardDetailsOverlay({
  open,
  onClose,
  onSubmit,
  loading = false,
}: LeaderboardDetailsOverlayProps) {
  if (!open) return null;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (payload: DetailsCardSubmitPayload) => {
    setIsSubmitting(true);
    try {
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-md w-full px-4">
        <div className="relative">
          <button
            type="button"
            className="absolute top-6 right-8 z-10 text-white/70 hover:text-white"
            onClick={onClose}
            disabled={loading || isSubmitting}
            aria-label="Close"
          >
            ✕
          </button>
          <DetailsCard
            onSubmit={handleSubmit}
            loading={loading || isSubmitting}
            className="relative"
          />
        </div>
      </div>
    </div>
  );
}
