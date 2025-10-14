'use client';

import React from 'react';

interface ProcessingModalProps {
  isOpen: boolean;
  message?: string;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({ 
  isOpen, 
  message = "Finding the best frame from your video." 
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="relative"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '40px 48px',
          maxWidth: '420px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Loading Spinner */}
        <div className="flex justify-center mb-6">
          <div
            className="animate-spin rounded-full border-4 border-gray-200"
            style={{
              width: '60px',
              height: '60px',
              borderTopColor: '#0095D7',
            }}
          />
        </div>

        {/* Message */}
        <p
          className="text-center"
          style={{
            fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
            fontWeight: 600,
            fontSize: 18,
            color: '#0A0A0A',
            lineHeight: 1.4,
          }}
        >
          {message.includes('from your video') ? (
            <>
              {message.replace(' from your video.', '').replace(' from your video', '')}
              <br />
              from your video.
            </>
          ) : (
            message
          )}
        </p>

        {/* Optional sub-message */}
        <p
          className="text-center mt-3"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            fontSize: 14,
            color: '#666666',
            lineHeight: 1.4,
          }}
        >
          This may take a few moments...
        </p>
      </div>
    </div>
  );
};
