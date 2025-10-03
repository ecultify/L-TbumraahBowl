'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Camera, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { navigateWithReload } from '@/lib/utils/sessionCleanup';

interface NoBowlingActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoBowlingActionModal({ open, onOpenChange }: NoBowlingActionModalProps) {
  const handleUploadNewVideo = () => {
    onOpenChange(false);
    navigateWithReload('/record-upload?mode=upload');
  };

  const handleRecordAgain = () => {
    onOpenChange(false);
    navigateWithReload('/record-upload?mode=record');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent 
        className="sm:max-w-md border-0 p-0 overflow-hidden mx-4 sm:mx-0"
        style={{
          backgroundColor: 'transparent',
          backgroundImage: 'url(/frontend-images/homepage/bowlbg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          borderRadius: '20px',
          maxWidth: 'calc(100vw - 32px)',
          width: '100%'
        }}
      >
        {/* Glass morphism container */}
        <div 
          className="p-6 backdrop-blur-xl border border-white/20 relative"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.14)',
            borderRadius: '20px',
            boxShadow: '0 6px 20px rgba(253, 194, 23, 0.18)',
            overflow: 'hidden'
          }}
        >
          {/* Close button */}
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            {/* Warning icon with golden background */}
            <div 
              className="mx-auto flex items-center justify-center w-16 h-16 mb-4 rounded-full"
              style={{
                backgroundColor: 'rgba(253, 194, 23, 0.2)',
                border: '2px solid #FDC217'
              }}
            >
              <AlertTriangle className="w-8 h-8" style={{ color: '#FDC217' }} />
            </div>
            
            {/* Title */}
            <h2 
              className="mb-3"
              style={{
                fontFamily: 'Frutiger, Inter, sans-serif',
                fontWeight: '700',
                fontSize: '24px',
                color: '#FDC217',
                lineHeight: '1.2'
              }}
            >
              No Bowling Action Detected
            </h2>
            
            {/* Subtitle */}
            <p 
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '400',
                fontSize: '14px',
                color: 'white',
                lineHeight: '1.4'
              }}
            >
              We couldn't detect any bowling movements in your video.
            </p>
          </div>

          {/* Requirements */}
          <div 
            className="mb-6 p-4 backdrop-blur-sm border border-white/10"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '12px'
            }}
          >
            <p 
              className="text-white mb-3 text-center"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '500',
                fontSize: '12px'
              }}
            >
              Please ensure your video includes:
            </p>
            <ul className="space-y-2">
              {[
                'Clear view of the bowler in action',
                'Visible arm movements and body motion',
                'Good lighting and stable camera',
                'Complete bowling motion (run-up to follow-through)'
              ].map((requirement, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div 
                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                    style={{ backgroundColor: '#FDC217' }}
                  ></div>
                  <span 
                    className="text-white/80"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: '400',
                      fontSize: '11px',
                      lineHeight: '1.3'
                    }}
                  >
                    {requirement}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* Primary Button - Upload New Video */}
            <button 
              onClick={handleUploadNewVideo}
              className="w-full inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105"
              style={{
                backgroundColor: '#FFC315',
                borderRadius: '25.62px',
                fontFamily: 'Frutiger, Inter, sans-serif',
                fontWeight: '700',
                fontSize: '14px',
                color: 'black',
                height: '41px'
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload New Video
            </button>
            
            {/* Secondary Button - Record Again */}
            <button 
              onClick={handleRecordAgain}
              className="w-full inline-flex items-center justify-center font-bold transition-all duration-300 transform hover:scale-105 backdrop-blur-sm border border-white/20"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '25.62px',
                fontFamily: 'Frutiger, Inter, sans-serif',
                fontWeight: '700',
                fontSize: '14px',
                color: 'white',
                height: '41px'
              }}
            >
              <Camera className="w-4 h-4 mr-2" />
              Record Again
            </button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default NoBowlingActionModal;