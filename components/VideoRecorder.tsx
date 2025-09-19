'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Camera, Square, Play, Loader2 } from 'lucide-react';

interface VideoRecorderProps {
  onVideoReady: (videoUrl: string) => void;
}

export function VideoRecorder({ onVideoReady }: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const initializeCamera = useCallback(async () => {
    setIsInitializing(true);
    try {
      // Stop previous stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      let stream: MediaStream | null = null;
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        // Fallback for devices that do not support environment camera selection
        console.warn('Environment camera unavailable, falling back to default camera', err);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn('Autoplay failed, awaiting user interaction', playError);
        }
      }

      streamRef.current = stream;
      setHasPermission(true);
    } catch (error) {
      console.error('Camera access denied:', error);
      setHasPermission(false);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!videoRef.current?.srcObject) {
      initializeCamera();
      return;
    }

    const stream = videoRef.current.srcObject as MediaStream;
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    });

    chunksRef.current = [];
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
    };

    mediaRecorder.start();
    setIsRecording(true);

    // Auto-stop after 20 seconds
    setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        stopRecording();
      }
    }, 20000);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const useRecording = useCallback(() => {
    if (recordedVideoUrl) {
      onVideoReady(recordedVideoUrl);
    }
  }, [recordedVideoUrl, onVideoReady]);

  const retakeVideo = useCallback(() => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
  }, [recordedVideoUrl]);

  // Clean up stream on unmount
  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Camera Preview */}
      <div className="relative bg-black rounded-2xl overflow-hidden aspect-video max-w-2xl mx-auto">
        {!hasPermission && !isInitializing && (
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

        {hasPermission === false && !isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8 text-center">
            <div className="text-red-400 mb-4">❌</div>
            <p className="text-lg mb-2">Camera permission denied</p>
            <p className="text-sm opacity-75 mb-4">
              Please enable camera access in your browser settings and refresh the page
            </p>
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
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        {!recordedVideoUrl ? (
          <>
            <button
              onClick={startRecording}
              disabled={!hasPermission || isRecording}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
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
            <button
              onClick={useRecording}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
            >
              <Play className="w-5 h-5" />
              Analyze This Recording
            </button>
            <button
              onClick={retakeVideo}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
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
            className="w-full max-w-md mx-auto rounded-xl"
          />
        </div>
      )}
    </div>
  );
}
