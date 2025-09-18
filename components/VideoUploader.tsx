'use client';

import React, { useCallback, useState } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';

interface VideoUploaderProps {
  onVideoReady: (videoUrl: string) => void;
}

export function VideoUploader({ onVideoReady }: VideoUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('video/')) {
      return 'Please upload a video file (MP4, WebM, MOV)';
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return 'File size too large. Please upload a video under 50MB';
    }

    return null;
  };

  const checkVideoDuration = (video: HTMLVideoElement): Promise<boolean> => {
    return new Promise((resolve) => {
      video.addEventListener('loadedmetadata', () => {
        resolve(video.duration <= 20);
      });
    });
  };

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const url = URL.createObjectURL(file);
    
    // Check duration
    const tempVideo = document.createElement('video');
    tempVideo.src = url;
    
    const isValidDuration = await checkVideoDuration(tempVideo);
    if (!isValidDuration) {
      URL.revokeObjectURL(url);
      setError('Video duration should be 20 seconds or less');
      return;
    }

    setUploadedVideoUrl(url);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const removeVideo = useCallback(() => {
    if (uploadedVideoUrl) {
      URL.revokeObjectURL(uploadedVideoUrl);
      setUploadedVideoUrl(null);
    }
    setError(null);
  }, [uploadedVideoUrl]);

  const useVideo = useCallback(() => {
    if (uploadedVideoUrl) {
      onVideoReady(uploadedVideoUrl);
    }
  }, [uploadedVideoUrl, onVideoReady]);

  return (
    <div className="space-y-6">
      {!uploadedVideoUrl ? (
        <>
          {/* Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
          >
            <Upload className={`w-16 h-16 mx-auto mb-4 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
            <h3 className="text-xl font-semibold mb-2 text-gray-800">
              Upload your bowling video
            </h3>
            <p className="text-gray-600 mb-6">
              Or click to browse files (MP4, WebM, MOV • Max 20 seconds • Under 50MB)
            </p>
            
            <label 
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-200 transform hover:scale-105"
              onClick={(e) => e.stopPropagation()}
            >
              <Upload className="w-5 h-5" />
              Choose File
              <input
                type="file"
                accept="video/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </>
      ) : (
        /* Video Preview */
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Uploaded Video</h3>
            <button
              onClick={removeVideo}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <video
            src={uploadedVideoUrl}
            controls
            className="w-full max-w-md mx-auto rounded-xl mb-4"
          />
          
          <div className="flex justify-center">
            <button
              onClick={useVideo}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
            >
              <Upload className="w-5 h-5" />
              Analyze This Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
