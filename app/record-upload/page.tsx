'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { VideoRecorder } from '@/components/VideoRecorder';
import { BackButton } from '@/components/BackButton';
import { useRouter, useSearchParams } from 'next/navigation';
import { clearAnalysisSessionStorage, clearVideoSessionStorage } from '@/lib/utils/sessionCleanup';

export default function RecordUploadPage() {
  const [activeMode, setActiveMode] = useState<'none' | 'record' | 'upload'>('none');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);

  // Check URL parameters and device type on component mount
  useEffect(() => {
    // Clear all analysis-related session storage for fresh start
    clearAnalysisSessionStorage();
    
    const mode = searchParams.get('mode');
    if (mode === 'record') {
      setActiveMode('record');
    } else if (mode === 'upload') {
      setActiveMode('upload');
    }
    // Note: For desktop, we keep 'none' as default to show the choice screen
    // The desktop layout handles the 'none' state by showing record/upload options
  }, [searchParams]);

  useEffect(() => {
    setIsClient(true);

    const updateView = () => {
      if (typeof window === 'undefined') {
        return;
      }
      setIsMobileView(window.innerWidth < 768);
    };

    updateView();
    window.addEventListener('resize', updateView);
    return () => window.removeEventListener('resize', updateView);
  }, []);

  useEffect(() => {
    if (activeMode !== 'record') {
      setIsRecorderOpen(false);
    }
  }, [activeMode]);

  const handleVideoReady = useCallback((videoUrl: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('uploadedVideoUrl', videoUrl);

      if (!sessionStorage.getItem('uploadedFileName')) {
        sessionStorage.setItem('uploadedFileName', 'uploaded-video.mp4');
      }

      if (!sessionStorage.getItem('uploadedSource')) {
        sessionStorage.setItem('uploadedSource', 'record');
      }
    }

    router.push('/video-preview');
  }, [router]);

  const handleRecorderReady = useCallback((videoUrl: string) => {
    setIsRecorderOpen(false);
    handleVideoReady(videoUrl);
  }, [handleVideoReady]);

  const handleRecordingComplete = useCallback(({ url, mimeType, blob, extension }: { url: string; mimeType: string; blob: Blob; extension: string; }) => {
    if (typeof window !== 'undefined') {
      const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
      const generatedName = `recording-${timestamp}.${extension}`;

      sessionStorage.setItem('uploadedVideoUrl', url);
      sessionStorage.setItem('uploadedFileName', generatedName);
      sessionStorage.setItem('uploadedSource', 'record');
      sessionStorage.setItem('uploadedMimeType', mimeType);
      sessionStorage.setItem('uploadedFileSize', blob.size.toString());
    }
  }, []);

  const handleRecordClick = () => {
    setActiveMode('record');
  };

  const handleUploadClick = () => {
    setActiveMode('upload');
  };

  const handleStartCamera = () => {
    // Switch to record mode and open the recorder overlay
    setActiveMode('record');
    setIsRecorderOpen(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = (file: File) => {
    // Validate file type
    const validTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid video file (MP4, MOV, AVI)');
      return;
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      alert('File size must be less than 50MB');
      return;
    }

    setUploadedFile(file);
    
    // Create a URL for the uploaded video
    const videoUrl = URL.createObjectURL(file);
    setUploadedVideoUrl(videoUrl);
  };

  const handleBrowseFiles = () => {
    // Use the hidden file input for mobile
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
      return;
    }
    
    // Fallback to ref for desktop
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleContinueWithUpload = () => {
    if (uploadedVideoUrl && uploadedFile) {
      // Store video data in sessionStorage for the preview page
      sessionStorage.setItem('uploadedVideoUrl', uploadedVideoUrl);
      sessionStorage.setItem('uploadedFileName', uploadedFile.name);
      sessionStorage.setItem('uploadedSource', 'upload');
      sessionStorage.setItem('uploadedMimeType', uploadedFile.type || 'video/mp4');
      sessionStorage.setItem('uploadedFileSize', uploadedFile.size.toString());
      
      // Navigate to video preview page
      router.push('/video-preview');
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (uploadedVideoUrl) {
      URL.revokeObjectURL(uploadedVideoUrl);
      setUploadedVideoUrl('');
    }
  };

  return (
    <div>
      {/* Mobile View */}
      <div 
        className="md:hidden min-h-screen flex flex-col" 
        style={{ 
          backgroundImage: 'url(/frontend-images/homepage/bowlbg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute top-4 left-0 right-0 z-20 flex justify-center">
          <Link href="/">
            <img
              src="/frontend-images/homepage/justzoom logo.png"
              alt="JustZoom logo"
              className="h-12 w-auto cursor-pointer"
            />
          </Link>
        </div>
      {/* Header with Back Button */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-6 px-4">
        <BackButton />
      </div>

      {/* Main Content */}
      <div className="flex-1 pt-20 pb-12 px-4">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 
            className="mb-2"
            style={{
              fontFamily: 'Frutiger, Inter, sans-serif',
              fontWeight: '700',
              fontSize: '24px',
              color: '#FDC217',
              lineHeight: '1.2'
            }}
          >
            Record or Upload
          </h1>
          <p 
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: '400',
              fontSize: '12px',
              color: 'white',
              lineHeight: '1.3'
            }}
          >
            Choose how you want to submit your bowling video
          </p>
        </div>

        {/* Main Action Buttons Container */}
        <div className="flex justify-center mb-8">
          <div 
            className="backdrop-blur-md border border-white/20 flex overflow-hidden relative"
            style={{
              width: '353px',
              height: '46px',
              borderRadius: '25.62px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
            }}
          >
            {/* Yellow highlight container for Record */}
            {activeMode === 'record' && (
              <div 
                className="absolute left-1 top-1/2 transform -translate-y-1/2"
                style={{
                  width: '169px',
                  height: '41px',
                  backgroundColor: '#FDC217',
                  borderRadius: '25.62px',
                  zIndex: 1
                }}
              />
            )}

            {/* Yellow highlight container for Upload */}
            {activeMode === 'upload' && (
              <div 
                className="absolute right-1 top-1/2 transform -translate-y-1/2"
                style={{
                  width: '169px',
                  height: '41px',
                  backgroundColor: '#FDC217',
                  borderRadius: '25.62px',
                  zIndex: 1
                }}
              />
            )}

            {/* Record Button */}
            <button
              onClick={handleRecordClick}
              className="flex-1 flex items-center justify-center gap-2 transition-all duration-300 hover:brightness-110 relative z-10"
              style={{
                backgroundColor: 'transparent',
                fontFamily: 'Frutiger, Inter, sans-serif',
                fontWeight: '500',
                fontSize: '14px',
                color: activeMode === 'record' ? 'black' : 'white',
                border: 'none'
              }}
            >
              <img 
                src="/frontend-images/homepage/icons/mynaui_video-solid.svg" 
                alt="Record"
                className="w-5 h-5"
                style={{
                  filter: activeMode === 'record' ? 'brightness(0)' : 'brightness(0) invert(1)'
                }}
              />
              Record
            </button>

            {/* Upload Button */}
            <button
              onClick={handleUploadClick}
              className="flex-1 flex items-center justify-center gap-2 transition-all duration-300 hover:brightness-110 relative z-10"
              style={{
                backgroundColor: 'transparent',
                fontFamily: 'Frutiger, Inter, sans-serif',
                fontWeight: '500',
                fontSize: '14px',
                color: activeMode === 'upload' ? 'black' : 'white',
                border: 'none'
              }}
            >
              <img 
                src="/frontend-images/homepage/icons/Vector (1).svg" 
                alt="Upload"
                className="w-4 h-4"
                style={{
                  filter: activeMode === 'upload' ? 'brightness(0)' : 'brightness(0) invert(1)'
                }}
              />
              Upload
            </button>
          </div>
        </div>

        {/* Camera Recording Section */}
        {activeMode === 'none' && (
          <div className="max-w-sm mx-auto mb-8">
            <div 
              className="backdrop-blur-md border border-white/20 p-6 text-center"
              style={{
                borderRadius: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
              }}
            >
              {/* Camera Icon */}
              <div className="flex justify-center mb-4">
                <img 
                  src="/frontend-images/homepage/icons/fluent_video-recording-20-filled.svg" 
                  alt="Camera"
                  className="w-12 h-12"
                />
              </div>

              {/* Text */}
              <p 
                className="mb-2"
                style={{
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '14px',
                  color: 'white',
                  lineHeight: '1.4'
                }}
              >
                Start Recording
              </p>
              <p 
                className="mb-6"
                style={{
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '12px',
                  color: 'white',
                  lineHeight: '1.4'
                }}
              >
                Use your device camera to record bowling action
              </p>

              {/* Start Camera Button */}
              <button
                onClick={handleStartCamera}
                className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                style={{
                  backgroundColor: '#FDC217',
                  borderRadius: '25.62px',
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '14px',
                  color: 'black',
                  padding: '10px 24px',
                  border: 'none'
                }}
              >
                Start Camera
              </button>
            </div>
          </div>
        )}

        {/* Upload Mode Default Interface */}
        {activeMode === 'upload' && !uploadedFile && (
          <div className="max-w-sm mx-auto mb-8">
            <div 
              className={`backdrop-blur-md border transition-all duration-300 p-6 text-center ${
                isDragOver 
                  ? 'border-yellow-400 bg-yellow-400/10' 
                  : 'border-white/20'
              }`}
              style={{
                borderRadius: '20px',
                backgroundColor: isDragOver 
                  ? 'rgba(255, 195, 21, 0.1)' 
                  : 'rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Upload Icon */}
              <div className="flex justify-center mb-4">
                <img 
                  src="/frontend-images/homepage/icons/mynaui_video-solid.svg" 
                  alt="Upload"
                  className="w-12 h-12"
                />
              </div>

              {/* Text */}
              <p 
                className="mb-2"
                style={{
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '14px',
                  color: isDragOver ? '#FDC217' : 'white',
                  lineHeight: '1.4'
                }}
              >
                {isDragOver ? 'Drop video here' : 'Drop video here'}
              </p>
              <p 
                className="mb-6"
                style={{
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '12px',
                  color: 'white',
                  lineHeight: '1.4'
                }}
              >
                or click to browse files
              </p>

              {/* Browse Files Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBrowseFiles();
                }}
                className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                style={{
                  backgroundColor: '#FDC217',
                  borderRadius: '25.62px',
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '14px',
                  color: 'black',
                  padding: '10px 24px',
                  border: 'none'
                }}
              >
                Browse Files
              </button>

              {/* Hidden file input */}
              <input
                id="file-input"
                type="file"
                accept="video/mp4,video/mov,video/avi,video/quicktime"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        )}

        {/* Upload Mode - File Selected Interface */}
        {activeMode === 'upload' && uploadedFile && (
          <div className="max-w-sm mx-auto mb-8">
            <div 
              className="backdrop-blur-md border border-white/20 p-6"
              style={{
                borderRadius: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
              }}
            >
              {/* Video Preview */}
              <div className="mb-4">
                <video
                  src={uploadedVideoUrl}
                  controls
                  className="w-full rounded-lg"
                  style={{ maxHeight: '200px' }}
                />
              </div>

              {/* File Info */}
              <div className="mb-4 text-left">
                <p 
                  className="text-white text-sm mb-1"
                  style={{
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '700'
                  }}
                >
                  {uploadedFile.name}
                </p>
                <p 
                  className="text-white text-xs"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '400'
                  }}
                >
                  Size: {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleContinueWithUpload}
                  className="flex-1 transition-all duration-300 hover:brightness-110 hover:scale-105"
                  style={{
                    backgroundColor: '#FDC217',
                    borderRadius: '20px',
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '700',
                    fontSize: '14px',
                    color: 'black',
                    padding: '10px 16px',
                    border: 'none'
                  }}
                >
                  Continue
                </button>
                <button
                  onClick={handleRemoveFile}
                  className="px-4 py-2 text-white border border-white/30 rounded-lg transition-all duration-300 hover:bg-white/10"
                  style={{
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '700',
                    fontSize: '14px',
                    backgroundColor: 'transparent'
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Recording Interface */}
        {activeMode === 'record' && (
          <div className="max-w-sm mx-auto mb-8">
            <div 
              className="backdrop-blur-md border border-white/20 p-6 text-center"
              style={{
                borderRadius: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
              }}
            >
              {/* Camera Icon */}
              <div className="flex justify-center mb-4">
                <img 
                  src="/frontend-images/homepage/icons/fluent_video-recording-20-filled.svg" 
                  alt="Camera"
                  className="w-12 h-12"
                />
              </div>

              {/* Text */}
              <p 
                className="mb-2"
                style={{
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '14px',
                  color: 'white',
                  lineHeight: '1.4'
                }}
              >
                Start Recording
              </p>
              <p 
                className="mb-6"
                style={{
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '12px',
                  color: 'white',
                  lineHeight: '1.4'
                }}
              >
                Use your device camera to record bowling action
              </p>

              {/* Start Camera Button */}
              <button
                onClick={handleStartCamera}
                className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                style={{
                  backgroundColor: '#FDC217',
                  borderRadius: '25.62px',
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '14px',
                  color: 'black',
                  padding: '10px 24px',
                  border: 'none'
                }}
              >
                Start Camera
              </button>
            </div>
          </div>
        )}


        {/* Reference Examples Section */}
        {(activeMode === 'none' || activeMode === 'upload' || activeMode === 'record') && (
          <div className={activeMode === 'upload' ? 'mb-4' : 'mb-8'}>
            <h3 
              className="mb-4 text-left"
              style={{
                fontFamily: 'Frutiger, Inter, sans-serif',
                fontWeight: '400',
                fontSize: '16px',
                color: 'white',
                lineHeight: '1.4'
              }}
            >
              Reference Examples
            </h3>

            {/* Video Container */}
            <div className="max-w-md mx-auto mb-6">
              <div 
                className="relative overflow-hidden"
                style={{
                  borderRadius: '20px',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  aspectRatio: '16/9'
                }}
              >
                <video
                  src="https://ik.imagekit.io/qm7ltbkkk/bumrah%20bowling%20action.mp4?updatedAt=1756728336742"
                  controls
                  preload="metadata"
                  className="w-full h-full object-cover"
                  poster="https://ik.imagekit.io/qm7ltbkkk/bumrah%20bowling%20action.mp4/ik-thumbnail.jpg"
                  style={{ borderRadius: '20px' }}
                />
              </div>
            </div>

            {/* File Format Info - Only show in upload mode */}
            {activeMode === 'upload' && (
              <div className="flex justify-center">
                <div 
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    width: '352px',
                    height: '60px',
                    borderRadius: '16px',
                    backgroundColor: '#FDC217',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
                  }}
                >
                  {/* File Icon */}
                  <img 
                    src="/frontend-images/homepage/icons/file.svg" 
                    alt="File"
                    className="w-6 h-6 flex-shrink-0"
                    style={{
                      filter: 'brightness(0)'
                    }}
                  />
                  
                  {/* Text */}
                  <div>
                    <p 
                      style={{
                        fontFamily: 'Frutiger, Inter, sans-serif',
                        fontWeight: '700',
                        fontSize: '14px',
                        color: 'black',
                        lineHeight: '1.4',
                        margin: 0
                      }}
                    >
                      Supported formats:
                    </p>
                    <p 
                      style={{
                        fontFamily: 'Frutiger, Inter, sans-serif',
                        fontWeight: '700',
                        fontSize: '12px',
                        color: 'black',
                        lineHeight: '1.4',
                        margin: 0
                      }}
                    >
                      MP4, MOV, AVI (Max 50MB)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Container Styling (if needed for additional elements) */}
        {activeMode === 'none' && (
          <div className="flex justify-center">
            <div 
              className="backdrop-blur-md border border-white/20 flex overflow-hidden"
              style={{
                width: '353px',
                height: '46px',
                borderRadius: '25.62px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                opacity: '0.5' // Just for visual reference, remove if not needed
              }}
            >
              {/* This matches the design from the image */}
              <div className="flex-1 flex items-center justify-center">
                <span className="text-white text-sm">Record & Upload Interface</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {isClient && isMobileView && isRecorderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4">
          <div className="w-full max-w-md">
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setIsRecorderOpen(false)}
                className="text-white text-sm uppercase tracking-wide"
                style={{
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  letterSpacing: '0.08em'
                }}
              >
                Close
              </button>
            </div>
            <div className="bg-black rounded-3xl p-4 border border-white/20">
              <VideoRecorder
                orientation="portrait"
                autoSubmitOnStop
                onRecordingComplete={handleRecordingComplete}
                onVideoReady={handleRecorderReady}
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-black px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 max-w-6xl mx-auto">
          {/* Copyright Text */}
          <div className="text-left">
            <p 
              className="text-white text-xs"
              style={{
                fontFamily: 'Frutiger, Inter, sans-serif',
                fontWeight: '400',
                fontSize: '10px',
                lineHeight: '1.4'
              }}
            >
              © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833
            </p>
          </div>
          
          {/* Social Media Icons */}
          <div className="flex items-center gap-3">
            <span 
              className="text-white text-xs mr-2"
              style={{
                fontFamily: 'Frutiger, Inter, sans-serif',
                fontWeight: '400',
                fontSize: '10px'
              }}
            >
              Connect with us
            </span>
            
            {/* Social Icons */}
            <div className="flex gap-3">
              {/* Facebook */}
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              
              {/* Instagram */}
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              
              {/* Twitter */}
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </div>
              
              {/* YouTube */}
              <div className="w-8 h-8 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </footer>
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex md:flex-col md:min-h-screen" style={{ backgroundColor: '#032743' }}>
        {/* Desktop Header */}
        <header 
          className="relative overflow-hidden"
          style={{
            backgroundImage: 'url(/frontend-images/homepage/bumrah 1.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, #0084B7 0%, #004E87 100%)',
              opacity: '0.85'
            }}
          />
          
          <div className="relative z-10 flex items-center justify-center max-w-7xl mx-auto px-8 py-6">
            <div className="flex items-center">
              <Link href="/">
                <img 
                  src="/frontend-images/homepage/justzoom logo.png" 
                  alt="JustZoom Logo" 
                  className="h-16 w-auto cursor-pointer"
                />
              </Link>
            </div>
            <div className="absolute left-8 flex items-center gap-4">
              <BackButton />
            </div>
          </div>
        </header>

        {/* Desktop Main Content */}
        <div className="flex-1 max-w-7xl mx-auto px-8 py-16">
          {activeMode === 'none' && (
            <div className="text-center mb-16">
              <h1 
                className="text-white mb-6"
                style={{
                  fontFamily: 'Frutiger, Inter, sans-serif',
                  fontWeight: '700',
                  fontSize: '3rem',
                  color: '#FDC217',
                  lineHeight: '1.2'
                }}
              >
                Record or Upload
              </h1>
              
              <p 
                className="text-white text-xl max-w-3xl mx-auto mb-12"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: '18px',
                  lineHeight: '1.6'
                }}
              >
                Choose how you'd like to capture your bowling action for analysis
              </p>

              {/* Mode Selection Cards */}
              <div className="grid lg:grid-cols-2 gap-12 max-w-4xl mx-auto">
                {/* Record Mode */}
                <div 
                  className="relative group cursor-pointer"
                  onClick={handleRecordClick}
                >
                  <div 
                    className="p-8 rounded-3xl border-2 border-yellow-400/30 group-hover:border-yellow-400 transition-all duration-300 group-hover:scale-105"
                    style={{ backgroundColor: 'rgba(255, 195, 21, 0.1)' }}
                  >
                    <div 
                      className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#FFC315' }}
                    >
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="black" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="3" fill="black"/>
                      </svg>
                    </div>
                    <h3 className="text-white font-bold text-2xl mb-4">Record with Camera</h3>
                    <p className="text-white/80 text-lg leading-relaxed">
                      Use your device camera to record your bowling action live
                    </p>
                  </div>
                </div>

                {/* Upload Mode */}
                <div 
                  className="relative group cursor-pointer"
                  onClick={handleUploadClick}
                >
                  <div 
                    className="p-8 rounded-3xl border-2 border-yellow-400/30 group-hover:border-yellow-400 transition-all duration-300 group-hover:scale-105"
                    style={{ backgroundColor: 'rgba(255, 195, 21, 0.1)' }}
                  >
                    <div 
                      className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#FFC315' }}
                    >
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="7,10 12,15 17,10" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="12" y1="15" x2="12" y2="3" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <h3 className="text-white font-bold text-2xl mb-4">Upload Video</h3>
                    <p className="text-white/80 text-lg leading-relaxed">
                      Upload an existing video file of your bowling action
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Record Mode Desktop */}
          {activeMode === 'record' && (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h1 
                  className="text-white mb-4"
                  style={{
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '700',
                    fontSize: '2.5rem',
                    color: '#FDC217',
                    lineHeight: '1.2'
                  }}
                >
                  Record Your Bowling
                </h1>
                
                <p 
                  className="text-white text-lg"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '400',
                    lineHeight: '1.6'
                  }}
                >
                  Position yourself and start recording when ready
                </p>
              </div>

              <div className="bg-white/5 rounded-3xl p-8 backdrop-blur-sm border border-white/10">
                {isClient && !isMobileView ? (
                  <VideoRecorder
                    autoSubmitOnStop
                    onRecordingComplete={handleRecordingComplete}
                    onVideoReady={handleVideoReady}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-white/80 py-20">
                    <p
                      style={{
                        fontFamily: 'Frutiger, Inter, sans-serif',
                        fontWeight: '700',
                        fontSize: '20px',
                        lineHeight: '1.4'
                      }}
                    >
                      Preparing camera...
                    </p>
                    <p
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: '400',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        maxWidth: '420px',
                        textAlign: 'center',
                        marginTop: '12px'
                      }}
                    >
                      Please allow camera permissions when prompted. If the camera does not start, refresh the page and try again.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setActiveMode('none')}
                  className="px-8 py-3 text-white/80 hover:text-white transition-colors"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '500'
                  }}
                >
                  ← Back to options
                </button>
              </div>
            </div>
          )}

          {/* Upload Mode Desktop */}
          {activeMode === 'upload' && !uploadedFile && (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h1 
                  className="text-white mb-4"
                  style={{
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '700',
                    fontSize: '2.5rem',
                    color: '#FDC217',
                    lineHeight: '1.2'
                  }}
                >
                  Upload Your Video
                </h1>
                
                <p 
                  className="text-white text-lg"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '400',
                    lineHeight: '1.6'
                  }}
                >
                  Select a video file from your device
                </p>
              </div>

              {/* Upload Area */}
              <div 
                className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ${
                  isDragOver 
                    ? 'border-yellow-400 bg-yellow-400/10' 
                    : 'border-white/30 bg-white/5'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div 
                  className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#FFC315' }}
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="7,10 12,15 17,10" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="15" x2="12" y2="3" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>

                <h3 className="text-white font-bold text-2xl mb-4">
                  Drag & Drop Your Video
                </h3>
                
                <p className="text-white/80 text-lg mb-6">
                  or click to browse files
                </p>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBrowseFiles();
                  }}
                  className="inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                  style={{
                    backgroundColor: '#FFC315',
                    borderRadius: '25px',
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '700',
                    fontSize: '18px',
                    color: 'black',
                    padding: '16px 32px'
                  }}
                >
                  Browse Files
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <p className="text-white/60 text-sm mt-6">
                  Supports MP4, MOV, AVI files up to 100MB
                </p>
              </div>

              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setActiveMode('none')}
                  className="px-8 py-3 text-white/80 hover:text-white transition-colors"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '500'
                  }}
                >
                  ← Back to options
                </button>
              </div>
            </div>
          )}

          {/* Upload Mode with Selected File Desktop */}
          {activeMode === 'upload' && uploadedFile && (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h1 
                  className="text-white mb-4"
                  style={{
                    fontFamily: 'Frutiger, Inter, sans-serif',
                    fontWeight: '700',
                    fontSize: '2.5rem',
                    color: '#FDC217',
                    lineHeight: '1.2'
                  }}
                >
                  Video Preview
                </h1>
                
                <p 
                  className="text-white text-lg"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '400',
                    lineHeight: '1.6'
                  }}
                >
                  Review your uploaded video before analysis
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-12 items-start">
                {/* Video Preview */}
                <div className="space-y-6">
                  <div className="relative rounded-3xl overflow-hidden bg-black/50">
                    <video
                      src={uploadedVideoUrl}
                      controls
                      preload="metadata"
                      className="w-full h-auto max-h-96 object-contain"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>

                  {/* File Info */}
                  <div 
                    className="p-6 rounded-2xl"
                    style={{ backgroundColor: 'rgba(255, 195, 21, 0.1)' }}
                  >
                    <h3 className="text-white font-bold text-lg mb-2">File Information</h3>
                    <p className="text-white/80">
                      <span className="font-medium">Name:</span> {uploadedFile.name}
                    </p>
                    <p className="text-white/80">
                      <span className="font-medium">Size:</span> {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-6">
                  <div 
                    className="p-8 rounded-3xl text-center"
                    style={{ backgroundColor: 'rgba(255, 195, 21, 0.1)' }}
                  >
                    <div 
                      className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#FFC315' }}
                    >
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12l2 2 4-4" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="10" stroke="black" strokeWidth="2"/>
                      </svg>
                    </div>
                    
                    <h3 className="text-white font-bold text-xl mb-4">Ready for Analysis</h3>
                    <p className="text-white/80 mb-6">
                      Your video looks good! Click continue to start the AI analysis.
                    </p>

                    <div className="space-y-4">
                      <button
                        onClick={handleContinueWithUpload}
                        className="w-full inline-flex items-center justify-center text-black font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                        style={{
                          backgroundColor: '#FFC315',
                          borderRadius: '25px',
                          fontFamily: 'Frutiger, Inter, sans-serif',
                          fontWeight: '700',
                          fontSize: '18px',
                          color: 'black',
                          padding: '16px 32px'
                        }}
                      >
                        Continue to Analysis
                      </button>

                      <button
                        onClick={handleRemoveFile}
                        className="w-full px-8 py-3 text-white/80 hover:text-white transition-colors border border-white/30 rounded-2xl hover:border-white/50"
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: '500'
                        }}
                      >
                        Remove & Select Another
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setActiveMode('none')}
                  className="px-8 py-3 text-white/80 hover:text-white transition-colors"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '500'
                  }}
                >
                  ← Back to options
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Footer */}
        <footer className="w-full bg-black px-8 py-8 mt-auto">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
            <div className="text-left">
              <p 
                className="text-white text-sm"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  lineHeight: '1.4'
                }}
              >
                © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              <span 
                className="text-white text-sm"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400'
                }}
              >
                Connect with us
              </span>
              
              <div className="flex gap-4">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
                  </svg>
                </div>
                
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </div>
                
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
