'use client';

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Camera, Square, Play, Loader2 } from 'lucide-react';

interface RecordingCompletePayload {
  url: string;
  blob: Blob;
  mimeType: string;
  extension: string;
}

interface VideoRecorderProps {
  onVideoReady: (videoUrl: string) => void;
  autoStart?: boolean;
  orientation?: 'landscape' | 'portrait';
  autoSubmitOnStop?: boolean;
  onRecordingComplete?: (payload: RecordingCompletePayload) => void;
  facingMode?: 'user' | 'environment'; // ✅ ADD THIS LINE
}

const FALLBACK_MIME_TYPE = 'video/webm';

const inferExtensionFromMime = (mimeType: string): string => {
  const type = mimeType.toLowerCase();
  if (type.includes('mp4')) return 'mp4';
  if (type.includes('quicktime')) return 'mov';
  if (type.includes('ogg')) return 'ogv';
  return 'webm';
};

const resolvePreferredMimeType = (): string => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }

  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=h264',
    'video/mp4',
  ];

  for (const candidate of candidates) {
    try {
      const isSupported = typeof (MediaRecorder as any).isTypeSupported === 'function'
        ? (MediaRecorder as any).isTypeSupported(candidate)
        : false;
      if (isSupported) {
        return candidate;
      }
    } catch {
      // Ignore and fall back to next candidate
    }
  }

  return '';
};

export function VideoRecorder({
  onVideoReady,
  autoStart = true,
  orientation = 'landscape',
  autoSubmitOnStop = false,
  onRecordingComplete,
  facingMode = 'environment', // ✅ ADD THIS LINE - default to back camera
}: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const isPortrait = orientation === 'portrait';
  const preferredMimeType = useMemo(resolvePreferredMimeType, []);

  // ✅ REPLACE THE ENTIRE initializeCamera FUNCTION WITH THIS:
  const initializeCamera = useCallback(async () => {
    console.log('🎥 Initializing camera with facingMode:', facingMode);
    setIsInitializing(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        console.error('❌ MediaDevices API not available');
        throw new Error('MediaDevices API not available');
      }

      // Stop previous stream if any
      if (streamRef.current) {
        console.log('🛑 Stopping previous stream...');
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      let stream: MediaStream | null = null;

      // Detect if mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      console.log('📱 Is Mobile Device:', isMobile);

      // Try with exact facing mode first (if specified)
      const exactConstraints: MediaStreamConstraints = {
        video: {
          width: isPortrait ? { ideal: 720 } : { ideal: 1280 },
          height: isPortrait ? { ideal: 1280 } : { ideal: 720 },
          facingMode: isMobile ? { exact: facingMode } : facingMode,
        },
        audio: false,
      };

      try {
        console.log('📹 Trying exact facingMode:', facingMode);
        stream = await navigator.mediaDevices.getUserMedia(exactConstraints);
        console.log('✅ Got stream with exact facingMode');
      } catch (err) {
        console.log('⚠️ Exact facingMode failed, trying ideal mode...');
        
        // Fallback: try with ideal (less strict)
        const idealConstraints: MediaStreamConstraints = {
          video: {
            width: isPortrait ? { ideal: 720 } : { ideal: 1280 },
            height: isPortrait ? { ideal: 1280 } : { ideal: 720 },
            facingMode: facingMode, // Direct string is more compatible
          },
          audio: false,
        };

        try {
          stream = await navigator.mediaDevices.getUserMedia(idealConstraints);
          console.log('✅ Got stream with ideal facingMode');
        } catch (fallbackErr) {
          console.error('⚠️ Facing mode constraint failed, using default camera:', fallbackErr);
          
          // Last fallback for devices that do not support camera selection
          stream = await navigator.mediaDevices.getUserMedia({
            video: isPortrait
              ? { width: 720, height: 1280 }
              : { width: 1280, height: 720 },
            audio: false,
          });
          console.log('✅ Got stream with basic constraints');
        }
      }

      // Verify which camera we got
      try {
        const track = stream?.getVideoTracks?.()?.[0];
        const settings = track?.getSettings?.();
        const actualFacingMode = settings?.facingMode as string | undefined;
        console.log('📷 Camera Settings:', {
          requestedFacing: facingMode,
          actualFacing: actualFacingMode,
          width: settings?.width,
          height: settings?.height,
        });

        // If we didn't get the requested camera and we're on mobile, try device enumeration
        if (isMobile && actualFacingMode !== facingMode && facingMode === 'environment') {
          console.log('🔄 Attempting to switch to rear camera via device enumeration...');
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter((d) => d.kind === 'videoinput');
            console.log('📷 Available cameras:', videoInputs.map(d => ({ label: d.label, id: d.deviceId })));
            
            const rearCamera =
              videoInputs.find((d) => /back|rear|environment|facing back/i.test(d.label)) ||
              videoInputs[videoInputs.length - 1]; // Last camera is often rear
            
            if (rearCamera?.deviceId) {
              console.log('🔄 Switching to:', rearCamera.label);
              const rearStream = await navigator.mediaDevices.getUserMedia({
                video: {
                  deviceId: { exact: rearCamera.deviceId },
                  width: isPortrait ? { ideal: 720 } : { ideal: 1280 },
                  height: isPortrait ? { ideal: 1280 } : { ideal: 720 },
                },
                audio: false,
              });
              
              // Stop previous and switch
              stream?.getTracks().forEach((t) => t.stop());
              stream = rearStream;
              console.log('✅ Successfully switched to rear camera');
            }
          } catch (switchErr) {
            console.warn('⚠️ Could not switch to rear camera via enumeration:', switchErr);
          }
        }
      } catch (verifyErr) {
        console.warn('⚠️ Could not verify camera settings:', verifyErr);
      }

      // Attach final stream to video element
      if (videoRef.current && stream) {
        console.log('✅ Attaching stream to video element...');
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
          console.log('✅ Video playing successfully');
        } catch (playError) {
          console.warn('⚠️ Autoplay failed, awaiting user interaction', playError);
        }
      } else {
        console.error('❌ Video ref or stream not available', { 
          hasVideoRef: !!videoRef.current, 
          hasStream: !!stream 
        });
      }

      streamRef.current = stream || null;
      setHasPermission(true);
      console.log('✅ Camera initialized successfully');
    } catch (error) {
      console.error('❌ Camera access denied:', error);
      setHasPermission(false);
    } finally {
      setIsInitializing(false);
    }
  }, [isPortrait, facingMode]); // ✅ ADD facingMode to dependencies

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const startRecording = useCallback(() => {
    if (!videoRef.current?.srcObject) {
      initializeCamera();
      return;
    }

    const stream = videoRef.current.srcObject as MediaStream;
    const mediaRecorder = preferredMimeType
      ? new MediaRecorder(stream, { mimeType: preferredMimeType })
      : new MediaRecorder(stream);

    chunksRef.current = [];
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const rawMime = preferredMimeType || mediaRecorder.mimeType || chunksRef.current[0]?.type || FALLBACK_MIME_TYPE;
      const blob = new Blob(chunksRef.current, { type: rawMime || FALLBACK_MIME_TYPE });
      const url = URL.createObjectURL(blob);
      const extension = inferExtensionFromMime(blob.type || rawMime || FALLBACK_MIME_TYPE);

      onRecordingComplete?.({
        url,
        blob,
        mimeType: blob.type || rawMime || FALLBACK_MIME_TYPE,
        extension,
      });

      setRecordedVideoUrl(url);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (autoSubmitOnStop) {
        onVideoReady(url);
      }
    };

    mediaRecorder.start();
    setIsRecording(true);

    // Auto-stop after 20 seconds
    setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        stopRecording();
      }
    }, 20000);
  }, [autoSubmitOnStop, initializeCamera, onRecordingComplete, onVideoReady, preferredMimeType, stopRecording]);

  const useRecording = useCallback(() => {
    if (autoSubmitOnStop) {
      return;
    }

    if (recordedVideoUrl) {
      onVideoReady(recordedVideoUrl);
    }
  }, [autoSubmitOnStop, recordedVideoUrl, onVideoReady]);

  const retakeVideo = useCallback(() => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
  }, [recordedVideoUrl]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (autoStart && hasPermission === null && !isInitializing) {
      console.log('🎥 VideoRecorder: Auto-starting camera...');
      initializeCamera();
    }
  }, [autoStart, hasPermission, isInitializing, initializeCamera]);
  
  // Force camera initialization when component mounts if autoStart is true
  useEffect(() => {
    if (autoStart) {
      console.log('🎥 VideoRecorder: Component mounted with autoStart=true');
      initializeCamera();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = {
    aspectRatio: isPortrait ? '9 / 16' : '16 / 9',
  } as React.CSSProperties;

  const containerClasses = isPortrait
    ? 'relative bg-black rounded-2xl overflow-hidden mx-auto max-w-sm w-full'
    : 'relative bg-black rounded-2xl overflow-hidden mx-auto max-w-2xl w-full';

  return (
    <div className="space-y-6">
      {/* Camera Preview */}
      <div className={containerClasses} style={containerStyle}>
        {hasPermission === false && !isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8 text-center">
            <Camera className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg mb-4">Camera access needed for recording</p>
            <button
              onClick={initializeCamera}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              Enable Camera
            </button>
          </div>
        )}

        {isInitializing && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Recording...</span>
          </div>
        )}

        {/* ✅ ADD CAMERA MODE INDICATOR */}
        {hasPermission && !recordedVideoUrl && (
          <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
            📷 {facingMode === 'environment' ? 'Back Camera' : 'Front Camera'}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        {!recordedVideoUrl ? (
          <>
            <button
              onClick={startRecording}
              disabled={!hasPermission || isRecording}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
              style={{
                backgroundColor: '#FDC217',
                color: 'black',
              }}
            >
              <Camera className="w-5 h-5" />
              {isRecording ? 'Recording...' : 'Start Recording'}
            </button>
            
            {isRecording && (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
              >
                <Square className="w-5 h-5" />
                Stop
              </button>
            )}
          </>
        ) : (
          <div className="flex gap-4">
            {!autoSubmitOnStop && (
              <button
                onClick={useRecording}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
              >
                <Play className="w-5 h-5" />
                Analyze This Recording
              </button>
            )}
            <button
              onClick={retakeVideo}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-semold transition-all duration-200"
            >
              <Camera className="w-5 h-5" />
              Record Again
            </button>
          </div>
        )}
      </div>

      {/* Recorded Video Preview */}
      {recordedVideoUrl && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Your Recording</h3>
          <video
            src={recordedVideoUrl}
            controls
            className="w-full mx-auto rounded-xl"
            style={isPortrait ? { aspectRatio: '9 / 16', maxWidth: '360px' } : {}}
          />
        </div>
      )}
    </div>
  );
}