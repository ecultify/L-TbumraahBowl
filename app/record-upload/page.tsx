'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { VideoRecorder } from '@/components/VideoRecorder';
import { useRouter, useSearchParams } from 'next/navigation';
import { clearAnalysisSessionStorage, clearVideoSessionStorage } from '@/lib/utils/sessionCleanup';
import { AnalysisLoader } from '@/components/AnalysisLoader';
import { GlassBackButton } from '@/components/GlassBackButton';

export default function RecordUploadPage() {
  const [activeMode, setActiveMode] = useState<'none' | 'record' | 'upload'>('record');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);

  // Analysis state
  const [state, setState] = useState({
    isAnalyzing: false,
    progress: 0
  });

  // Check URL parameters and device type on component mount
  useEffect(() => {
    const mode = searchParams?.get('mode');
    if (mode === 'record') {
      setActiveMode('record');
    } else if (mode === 'upload') {
      setActiveMode('upload');
    }
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
      // Clear any existing analysis data to ensure fresh analysis
      console.log('🧹 Clearing old analysis data for fresh recording...');
      sessionStorage.removeItem('analysisVideoData');
      sessionStorage.removeItem('benchmarkDetailedData');
      sessionStorage.removeItem('detailsCompleted');
      sessionStorage.removeItem('noBowlingActionDetected');
      sessionStorage.removeItem('pendingLeaderboardEntry');
      
      const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
      const generatedName = `recording-${timestamp}.${extension}`;

      sessionStorage.setItem('uploadedVideoUrl', url);
      sessionStorage.setItem('uploadedFileName', generatedName);
      sessionStorage.setItem('uploadedSource', 'record');
      sessionStorage.setItem('uploadedMimeType', mimeType);
      sessionStorage.setItem('uploadedFileSize', blob.size.toString());
      
      // Store the video data for persistence - handle storage quota errors
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const base64Data = e.target.result as string;
            try {
              sessionStorage.setItem('uploadedVideoData', base64Data);
              console.log('✅ Recorded video data stored in sessionStorage');
            } catch (storageError) {
              console.warn('⚠️ SessionStorage quota exceeded, video will use blob URL only:', storageError);
              // Video will still work through the blob URL stored above
            }
          }
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('❌ Error reading recorded video data:', error);
      }
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

  const handleFileUpload = async (file: File) => {
    // Clear any existing analysis data to ensure fresh analysis
    if (typeof window !== 'undefined') {
      console.log('🧹 Clearing old analysis data for fresh upload...');
      sessionStorage.removeItem('analysisVideoData');
      sessionStorage.removeItem('benchmarkDetailedData');
      sessionStorage.removeItem('detailsCompleted');
      sessionStorage.removeItem('noBowlingActionDetected');
      sessionStorage.removeItem('pendingLeaderboardEntry');
    }

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

    // Store the file reference immediately for better persistence
    if (typeof window !== 'undefined') {
      // Clear any existing temp file
      if ((window as any).tempVideoFile) {
        delete (window as any).tempVideoFile;
      }
      // Store the new file reference
      (window as any).tempVideoFile = file;
      console.log('✅ File reference stored for persistence');
    }

    // Store the file data in sessionStorage for persistence across navigation
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const base64Data = e.target.result as string;
          try {
            sessionStorage.setItem('uploadedVideoData', base64Data);
            console.log('✅ Video file data stored in sessionStorage');
          } catch (storageError) {
            console.warn('⚠️ SessionStorage quota exceeded, using file reference:', storageError);
            // Store a flag indicating we have a file reference
            sessionStorage.setItem('uploadedVideoData', 'file-reference-available');
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('❌ Error reading video data:', error);
    }
  };

  const handleBrowseFiles = () => {
    // First try to use the ref-based input (more reliable)
    if (fileInputRef.current) {
      fileInputRef.current.click();
      return;
    }
    
    // Fallback to ID-based input for mobile compatibility
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
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

  const handleContinueWithUpload = async () => {
    if (uploadedVideoUrl && uploadedFile) {
      console.log('🚀 Preparing video data for navigation...');
      
      // Store metadata
      sessionStorage.setItem('uploadedFileName', uploadedFile.name);
      sessionStorage.setItem('uploadedSource', 'upload');
      sessionStorage.setItem('uploadedMimeType', uploadedFile.type || 'video/mp4');
      sessionStorage.setItem('uploadedFileSize', uploadedFile.size.toString());
      
      // Skip heavy base64 storage for faster navigation - use file reference instead
      try {
        // Only store a lightweight reference instead of full base64 data
        sessionStorage.setItem('uploadedVideoData', 'file-reference-available');
        console.log('✅ Video file reference stored (fast method)');
      } catch (error) {
        console.error('❌ Error storing video reference:', error);
      }
      
      // Store the actual file object reference for immediate use
      // This is the most reliable method for same-session navigation
      if (typeof window !== 'undefined') {
        // Clear any existing temp file
        if ((window as any).tempVideoFile) {
          delete (window as any).tempVideoFile;
        }
        // Store the new file reference
        (window as any).tempVideoFile = uploadedFile;
        console.log('✅ Temporary file reference stored in window object');
      }
      
      // Store a fresh blob URL as backup
      const freshBlobUrl = URL.createObjectURL(uploadedFile);
      sessionStorage.setItem('uploadedVideoUrl', freshBlobUrl);
      console.log('✅ Fresh blob URL created and stored');
      
      // Additional validation to ensure data was stored correctly
      const testVideoUrl = sessionStorage.getItem('uploadedVideoUrl');
      const testVideoData = sessionStorage.getItem('uploadedVideoData');
      const testTempFile = (window as any).tempVideoFile;
      
      if (!testVideoUrl && !testVideoData && !testTempFile) {
        console.error('❌ Failed to store video data properly. Retrying...');
        alert('Error storing video data. Please try again.');
        return;
      }
      
      console.log('✅ Video data storage validated successfully');
      
      // Navigate to video-preview page (non-blocking)
      setTimeout(() => {
        router.push('/video-preview');
      }, 50); // Small delay ensures storage operations complete without blocking UI
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
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: "url(/images/instructions/Instructions%20bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-col" style={{
        minHeight: "100vh",
        backgroundImage: 'url("/images/desktop bg (1).png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}>
        {/* Logo in top left corner */}
        <div className="absolute top-6 left-6 z-20">
          <div
            onClick={() => {
              // Clear all session data and reload page
              console.log('🏠 Homepage logo clicked - clearing session data and reloading...');
              if (typeof window !== 'undefined') {
                sessionStorage.clear();
                window.location.href = '/';
              }
            }}
          >
            <img
              src="/images/newhomepage/Bowling%20Campaign%20Logo.png"
              alt="Bowling Campaign Logo"
              className="w-64 lg:w-72"
              style={{ height: "auto", cursor: "pointer" }}
            />
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex items-stretch relative" style={{ minHeight: '85vh' }}>
          {/* Left side - Loan Approved Image */}
          <div className="flex-1 relative">
            <img
              src="/images/loanapprovednew.png"
              alt="Loan Approved"
              style={{ 
                position: 'absolute',
                bottom: '-20px',
                left: '60%',
                transform: 'translateX(-50%)',
                width: '480px', 
                height: '580px', 
                margin: 0,
                padding: 0,
                display: 'block',
                objectFit: 'contain',
                zIndex: 10
              }}
            />
          </div>

          {/* Right side - Large Glass Box Container */}
          <div className="flex-1 flex justify-end items-stretch" style={{ paddingLeft: '60px' }}>
            <div className="relative" style={{ width: 900, height: '100%' }}>
              {/* Large Glass Box Background */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5)), url(/images/ballsglass.png)",
                  backgroundRepeat: "no-repeat, no-repeat",
                  backgroundPosition: "center, center",
                  backgroundSize: "100% 100%, contain",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: "inset 0 0 0 1px #FFFFFF",
                  borderTopLeftRadius: 60,
                  borderBottomLeftRadius: 60,
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  zIndex: 1,
                }}
              />

              {/* Back Button - Top Left Corner of Large Glass Box */}
              <div
                style={{
                  position: "absolute",
                  top: "24px",
                  left: "24px",
                  width: "60px",
                  height: "60px",
                  borderRadius: "20px",
                  backgroundColor: "#0095D740",
                  border: "2px solid #0095D74D",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 10,
                  transition: "all 0.2s ease"
                }}
                onClick={() => window.history.back()}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#0095D760";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#0095D740";
                }}
              >
                {/* Left Arrow Icon */}
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path 
                    d="M15 18L9 12L15 6" 
                    stroke="#0095D7" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Record Upload Glass Box - Centered */}
              <div className="relative flex flex-col items-center justify-center" style={{ height: '100%', paddingTop: 40, paddingBottom: 40, zIndex: 2 }}>
                <div
                  className="w-full"
                  style={{
                    maxWidth: 500,
                    borderRadius: 18,
                    backgroundColor: "#FFFFFF80",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    boxShadow: "inset 0 0 0 1px #FFFFFF",
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {/* Headline */}
                  <div className="mb-3 text-center">
                    <div
                      style={{
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: 800,
                        fontStyle: "italic",
                        fontSize: 22, // Increased from 20 to 22 (+2)
                        color: "#000000",
                        lineHeight: 1.1,
                        marginBottom: 2,
                        marginLeft: "10px",
                      }}
                    >
                      LIGHTS, CAMERA, BOWL!
                    </div>
                    <p
                      style={{
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: 400,
                        fontSize: 16, // Increased from 14 to 16 (+2)
                        color: "#000000",
                        lineHeight: 1.3,
                        margin: 0,
                      }}
                    >
                      Capture your action or upload your video now.
                    </p>
                  </div>

                  {/* Mode Selection Buttons */}
                  <div 
                    className="relative mb-4 w-full" 
                    style={{
                      width: '350px',
                      height: '45px',
                      borderRadius: '25px',
                      backgroundColor: '#FFFFFF99',
                      padding: '3px'
                    }}
                  >
                      {/* Sliding Highlight */}
                      <div 
                        className="absolute transition-all duration-300 ease-in-out"
                        style={{
                          width: '170px',
                          height: '39px',
                          borderRadius: '22px',
                          backgroundColor: '#FFCA04',
                          top: '3px',
                          left: activeMode === 'record' ? '3px' : '177px'
                        }}
                      />
                      
                      {/* Record Button */}
                      <button
                        onClick={handleRecordClick}
                        className="absolute flex items-center justify-center transition-all duration-300"
                        style={{
                          left: '3px',
                          top: '3px',
                          width: '170px',
                          height: '39px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '22px',
                          fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                          fontWeight: 600,
                          fontSize: '14px',
                          color: activeMode === 'record' ? '#000' : '#666',
                          zIndex: 2
                        }}
                      >
                        <svg 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          className="mr-2"
                        >
                          <path d="M23 7L16 12L23 17V7Z" fill={activeMode === 'record' ? '#000' : '#666'}/>
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" stroke={activeMode === 'record' ? '#000' : '#666'} strokeWidth="2" fill="none"/>
                        </svg>
                        Record
                      </button>
                      
                      {/* Upload Button */}
                      <button
                        onClick={handleUploadClick}
                        className="absolute flex items-center justify-center transition-all duration-300"
                        style={{
                          right: '3px',
                          top: '3px',
                          width: '170px',
                          height: '39px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '22px',
                          fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                          fontWeight: 600,
                          fontSize: '14px',
                          color: activeMode === 'upload' ? '#000' : '#666',
                          zIndex: 2
                        }}
                      >
                        <svg 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          className="mr-2"
                        >
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke={activeMode === 'upload' ? '#000' : '#666'} strokeWidth="2"/>
                          <polyline points="7,10 12,15 17,10" stroke={activeMode === 'upload' ? '#000' : '#666'} strokeWidth="2"/>
                          <line x1="12" y1="15" x2="12" y2="3" stroke={activeMode === 'upload' ? '#000' : '#666'} strokeWidth="2"/>
                        </svg>
                        Upload
                      </button>
                    </div>

                  {/* Record Mode Content */}
                  {activeMode === 'record' && (
                    <div className="w-full flex justify-center">
                      <div 
                        className="flex items-center justify-center border-2 border-dashed"
                        style={{
                          width: '400px',
                          height: '240px',
                          borderRadius: '20px',
                          borderWidth: '2px',
                          borderColor: '#3B82F6',
                          borderStyle: 'dashed',
                          backgroundColor: '#F8FAFF',
                          padding: '30px'
                        }}
                      >
                        <div className="text-center flex flex-col items-center">
                          <div className="mb-4">
                            <img 
                              src="/frontend-images/homepage/icons/fluent_video-recording-20-filled.svg" 
                              alt="Video Recording" 
                              width="48" 
                              height="48"
                              style={{ filter: 'brightness(0) saturate(100%)' }}
                            />
                          </div>
                          <h3 
                            className="font-semibold mb-3"
                            style={{
                              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                              fontWeight: 600,
                              fontSize: '22px', // Increased from 20 to 22 (+2)
                              color: '#000000',
                              lineHeight: 1.2
                            }}
                          >
                            Start Recording
                          </h3>
                          <p 
                            className="mb-5"
                            style={{
                              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                              fontWeight: 400,
                              fontSize: '15px', // Increased from 13 to 15 (+2)
                              color: '#666666',
                              lineHeight: 1.3,
                              textAlign: 'center',
                              maxWidth: '280px'
                            }}
                          >
                            Use your device camera to record bowling action
                          </p>
                          <button
                            onClick={handleStartCamera}
                            style={{
                              backgroundColor: "#FFC315",
                              borderRadius: '25px',
                              padding: "12px 28px",
                              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                              fontWeight: 700,
                              fontSize: '16px', // Increased from 14 to 16 (+2)
                              color: "black",
                              border: "none",
                              cursor: "pointer",
                              minWidth: '160px'
                            }}
                          >
                            Start Camera
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Upload Mode Content */}
                  {activeMode === 'upload' && (
                    <div className="w-full flex justify-center">
                      {!uploadedFile ? (
                        <div
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onClick={handleBrowseFiles}
                          className="border-2 border-dashed transition-colors duration-300 flex items-center justify-center cursor-pointer"
                          style={{
                            width: '400px',
                            height: '240px',
                            borderRadius: '20px',
                            borderWidth: '2px',
                            borderColor: isDragOver ? '#3B82F6' : '#9CA3AF',
                            borderStyle: 'dashed',
                            backgroundColor: isDragOver ? '#EFF6FF' : '#F9FAFB',
                            padding: '30px'
                          }}
                        >
                          <div className="text-center flex flex-col items-center">
                            <div className="mb-4">
                              <img 
                                src="/frontend-images/homepage/icons/uplaod.svg" 
                                alt="Upload" 
                                width="48" 
                                height="48"
                                style={{ filter: 'brightness(0) saturate(100%)' }}
                              />
                            </div>
                            <h3 
                              className="font-semibold mb-3"
                              style={{
                                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                                fontWeight: 600,
                                fontSize: '22px', // Increased from 20 to 22 (+2)
                                color: '#000000',
                                lineHeight: 1.2
                              }}
                            >
                              Drop video here
                            </h3>
                            <p 
                              className="mb-5"
                              style={{
                                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                                fontWeight: 400,
                                fontSize: '15px', // Increased from 13 to 15 (+2)
                                color: '#666666',
                                lineHeight: 1.3,
                                textAlign: 'center',
                                maxWidth: '280px'
                              }}
                            >
                              or click to browse files
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent event bubbling
                                handleBrowseFiles();
                              }}
                              style={{
                                backgroundColor: "#FFC315",
                                borderRadius: '25px',
                                padding: "12px 28px",
                                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                                fontWeight: 700,
                                fontSize: '16px', // Increased from 14 to 16 (+2)
                                color: "black",
                                border: "none",
                                cursor: "pointer",
                                minWidth: '160px'
                              }}
                            >
                              Choose File
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-4">
                          <div className="relative">
                            <video
                              ref={videoRef}
                              src={uploadedVideoUrl}
                              controls
                              className="object-cover rounded-lg bg-black"
                              style={{
                                width: '400px',
                                height: '240px',
                                borderRadius: '20px'
                              }}
                            />
                            <button
                              onClick={handleRemoveFile}
                              className="absolute top-3 right-3 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center text-lg hover:bg-red-600 transition-colors duration-300"
                            >
                              ×
                            </button>
                          </div>
                          <div className="text-center">
                            <p 
                              className="mb-4"
                              style={{
                                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                                fontWeight: 400,
                                fontSize: '16px', // Increased from 14 to 16 (+2)
                                color: '#666666'
                              }}
                            >
                              <strong>{uploadedFile.name}</strong>
                              <br />
                              {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                            <button
                              onClick={handleContinueWithUpload}
                              style={{
                                backgroundColor: "#FFC315",
                                borderRadius: '25px',
                                padding: "12px 28px",
                                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                                fontWeight: 700,
                                fontSize: '16px', // Increased from 14 to 16 (+2)
                                color: "black",
                                border: "none",
                                cursor: "pointer",
                                minWidth: '180px'
                              }}
                            >
                              Continue with this video
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Supported Formats Text - Below Record Upload Box */}
                <div className="text-center mt-3">
                  <p
                    style={{
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: 400,
                      fontSize: '13px', // Increased from 11 to 13 (+2)
                      color: "#000000",
                      lineHeight: 1.3,
                      margin: 0,
                    }}
                  >
                    Supported formats: MP4, MOV, AVI (Max 50MB)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Footer */}
        <footer className="w-full bg-black px-4 md:px-8 pt-4 pb-6 relative z-20">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
            {/* Copyright Text */}
            <div className="text-center">
              <p 
                className="text-white text-xs"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: 'clamp(10px, 2vw, 14px)',
                  lineHeight: '1.4'
                }}
              >
                © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833 | <a href="/terms-and-conditions" className="text-blue-300 hover:text-blue-200 underline">Terms and Conditions</a>
              </p>
            </div>
            
            {/* Social Media Icons */}
            <div className="flex items-center gap-3">
              <span 
                className="text-white text-xs mr-2"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: 'clamp(10px, 2vw, 14px)'
                }}
              >
                Connect with us
              </span>
              
              {/* Social Icons */}
              <div className="flex gap-3 md:gap-4">
                {/* Facebook */}
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </div>
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </div>
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden min-h-screen flex flex-col">
        <main className="flex-1 px-6 pt-20 pb-8 flex justify-center relative z-10">
          <div className="relative mx-auto" style={{ width: "100%", maxWidth: 400, marginTop: 4 }}>
            {/* Mobile Logo */}
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16, paddingLeft: 4 }}>
              <div onClick={() => {
                console.log('🏠 Homepage logo clicked - clearing session data and reloading...');
                if (typeof window !== 'undefined') {
                  sessionStorage.clear();
                  window.location.href = '/';
                }
              }}>
                <img
                  src="/images/newhomepage/Bowling%20Campaign%20Logo.png"
                  alt="Bowling Campaign Logo"
                  style={{ width: 208, height: "auto", cursor: "pointer" }}
                />
              </div>
            </div>

            <div style={{ position: "relative", width: "100%" }}>
              {/* Loan Approved Decoration */}
              <img
                src="/images/instructions/loanapproved.png"
                alt="Loan Approved"
                style={{ 
                  position: "absolute", 
                  top: -170, 
                  right: -8, 
                  width: 150, 
                  height: "auto", 
                  zIndex: 1, 
                  pointerEvents: "none" 
                }}
              />

              {/* Glass Box Container */}
              <div
                className="w-full max-w-sm mx-auto"
                style={{
                  position: "relative",
                  borderRadius: 18,
                  backgroundColor: "#FFFFFF80",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: "inset 0 0 0 1px #FFFFFF",
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  zIndex: 2,
                  marginTop: 20,
                }}
              >
                {/* Universal Back Arrow Box - Top Left */}
                <GlassBackButton />

                {/* Headline */}
                <div className="mb-3 text-center">
                  <div
                    style={{
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: 800,
                      fontStyle: "italic",
                      fontSize: "clamp(20px, 5vw, 24px)",
                      color: "#000000",
                      lineHeight: 1.1,
                      marginBottom: 2,
                      marginLeft: "10px",
                    }}
                  >
                    LIGHTS, CAMERA, BOWL!
                  </div>
                  <p
                    style={{
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: 400,
                      fontSize: "clamp(14px, 3vw, 16px)",
                      color: "#000000",
                      lineHeight: 1.3,
                      margin: 0,
                    }}
                  >
                    Capture your action or upload your video now.
                  </p>
                </div>

                {/* Mode Selection Buttons */}
                <div 
                  className="relative mb-4 w-full" 
                  style={{
                    width: '273.23px',
                    height: '35.61px',
                    borderRadius: '23.22px',
                    backgroundColor: '#FFFFFF99',
                    padding: '2px'
                  }}
                >
                  {/* Sliding Highlight */}
                  <div 
                    className="absolute transition-all duration-300 ease-in-out"
                    style={{
                      width: '130.81px',
                      height: '31.73px',
                      borderRadius: '19.83px',
                      backgroundColor: '#FFCA04',
                      top: '2px',
                      left: activeMode === 'record' ? '2px' : '138.42px'
                    }}
                  />
                  
                  {/* Record Button */}
                  <button
                    onClick={handleRecordClick}
                    className="absolute flex items-center justify-center transition-all duration-300"
                    style={{
                      left: '2px',
                      top: '2px',
                      width: '130.81px',
                      height: '31.73px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '19.83px',
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: 600,
                      fontSize: '12px',
                      color: activeMode === 'record' ? '#000' : '#666',
                      zIndex: 2
                    }}
                  >
                    <svg 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      className="mr-1"
                    >
                      <path d="M23 7L16 12L23 17V7Z" fill={activeMode === 'record' ? '#000' : '#666'}/>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" stroke={activeMode === 'record' ? '#000' : '#666'} strokeWidth="2" fill="none"/>
                    </svg>
                    Record
                  </button>
                  
                  {/* Upload Button */}
                  <button
                    onClick={handleUploadClick}
                    className="absolute flex items-center justify-center transition-all duration-300"
                    style={{
                      right: '2px',
                      top: '2px',
                      width: '130.81px',
                      height: '31.73px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '19.83px',
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: 600,
                      fontSize: '12px',
                      color: activeMode === 'upload' ? '#000' : '#666',
                      zIndex: 2
                    }}
                  >
                    <svg 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      className="mr-1"
                    >
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke={activeMode === 'upload' ? '#000' : '#666'} strokeWidth="2"/>
                      <polyline points="7,10 12,15 17,10" stroke={activeMode === 'upload' ? '#000' : '#666'} strokeWidth="2"/>
                      <line x1="12" y1="15" x2="12" y2="3" stroke={activeMode === 'upload' ? '#000' : '#666'} strokeWidth="2"/>
                    </svg>
                    Upload
                  </button>
                </div>

                {/* Record Mode Content */}
                {activeMode === 'record' && (
                  <div className="w-full flex justify-center">
                    <div 
                      className="flex items-center justify-center border-2 border-dashed"
                      style={{
                        width: '315.37px',
                        height: '185.83px',
                        borderRadius: '17.87px',
                        borderWidth: '1.79px',
                        borderColor: '#3B82F6',
                        borderStyle: 'dashed',
                        backgroundColor: '#F8FAFF',
                        padding: '20px'
                      }}
                    >
                      <div className="text-center flex flex-col items-center">
                        <div className="mb-3">
                          <img 
                            src="/frontend-images/homepage/icons/fluent_video-recording-20-filled.svg" 
                            alt="Video Recording" 
                            width="40" 
                            height="40"
                            style={{ filter: 'brightness(0) saturate(100%)' }}
                          />
                        </div>
                        <h3 
                          className="font-semibold mb-2"
                          style={{
                            fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                            fontWeight: 600,
                            fontSize: '16px',
                            color: '#000000',
                            lineHeight: 1.2
                          }}
                        >
                          Start Recording
                        </h3>
                        <p 
                          className="mb-3"
                          style={{
                            fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                            fontWeight: 400,
                            fontSize: '15px',
                            color: '#666666',
                            lineHeight: 1.3,
                            textAlign: 'center',
                            maxWidth: '200px'
                          }}
                        >
                          Use your device camera to record bowling action
                        </p>
                        <button
                          onClick={handleStartCamera}
                          style={{
                            backgroundColor: "#FFC315",
                            borderRadius: '20px',
                            padding: "8px 20px",
                            fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                            fontWeight: 700,
                            fontSize: '12px',
                            color: "black",
                            border: "none",
                            cursor: "pointer",
                            minWidth: '120px',
                            marginBottom: '12px'
                          }}
                        >
                          Start Camera
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Mode Content */}
                {activeMode === 'upload' && (
                  <div className="w-full flex justify-center">
                    {!uploadedFile ? (
                      <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={handleBrowseFiles}
                        className="border-2 border-dashed transition-colors duration-300 flex items-center justify-center cursor-pointer"
                        style={{
                          width: '315.37px',
                          height: '185.83px',
                          borderRadius: '17.87px',
                          borderWidth: '1.79px',
                          borderColor: isDragOver ? '#3B82F6' : '#9CA3AF',
                          borderStyle: 'dashed',
                          backgroundColor: isDragOver ? '#EFF6FF' : '#F9FAFB',
                          padding: '20px'
                        }}
                      >
                        <div className="text-center flex flex-col items-center">
                          <div className="mb-3">
                            <img 
                              src="/frontend-images/homepage/icons/uplaod.svg" 
                              alt="Upload" 
                              width="40" 
                              height="40"
                              style={{ filter: 'brightness(0) saturate(100%)' }}
                            />
                          </div>
                          <h3 
                            className="font-semibold mb-2"
                            style={{
                              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                              fontWeight: 600,
                              fontSize: '16px',
                              color: '#000000',
                              lineHeight: 1.2
                            }}
                          >
                            Drop video here
                          </h3>
                          <p 
                            className="mb-3"
                            style={{
                              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                              fontWeight: 400,
                              fontSize: '15px',
                              color: '#666666',
                              lineHeight: 1.3,
                              textAlign: 'center',
                              maxWidth: '200px'
                            }}
                          >
                            or click to browse files
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent event bubbling
                              handleBrowseFiles();
                            }}
                            style={{
                              backgroundColor: "#FFC315",
                              borderRadius: '20px',
                              padding: "8px 20px",
                              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                              fontWeight: 700,
                              fontSize: '12px',
                              color: "black",
                              border: "none",
                              cursor: "pointer",
                              minWidth: '120px',
                              marginBottom: '12px'
                            }}
                          >
                            Choose File
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="relative">
                          <video
                            ref={videoRef}
                            src={uploadedVideoUrl}
                            controls
                            className="object-cover rounded-lg bg-black"
                            style={{
                              width: '315.37px',
                              height: '185px',
                              borderRadius: '17.87px'
                            }}
                          />
                          <button
                            onClick={handleRemoveFile}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors duration-300"
                          >
                            ×
                          </button>
                        </div>
                        <div className="text-center">
                          <p 
                            className="mb-3"
                            style={{
                              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                              fontWeight: 400,
                              fontSize: '12px',
                              color: '#666666'
                            }}
                          >
                            <strong>{uploadedFile.name}</strong>
                            <br />
                            {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                          <button
                            onClick={handleContinueWithUpload}
                            style={{
                              backgroundColor: "#FFC315",
                              borderRadius: '20px',
                              padding: "8px 20px",
                              fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                              fontWeight: 700,
                              fontSize: '12px',
                              color: "black",
                              border: "none",
                              cursor: "pointer",
                              minWidth: '140px'
                            }}
                          >
                            Continue with this video
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Supported Formats Text */}
              <div className="text-center mt-3">
                <p
                  style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: 400,
                    fontSize: "clamp(10px, 2vw, 11px)",
                    color: "#FFFFFF",
                    lineHeight: 1.3,
                    margin: 0,
                  }}
                >
                  Supported formats: MP4, MOV, AVI (Max 50MB)
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Mobile Footer */}
        <footer className="mt-auto w-full bg-black px-4 md:px-8 pt-4 pb-6">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
            {/* Copyright Text */}
            <div className="text-center">
              <p 
                className="text-white text-xs"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: 'clamp(10px, 2vw, 14px)',
                  lineHeight: '1.4'
                }}
              >
                © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833 | <a href="/terms-and-conditions" className="text-blue-300 hover:text-blue-200 underline">Terms and Conditions</a>
              </p>
            </div>
            
            {/* Social Media Icons */}
            <div className="flex items-center gap-3">
              <span 
                className="text-white text-xs mr-2"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '400',
                  fontSize: 'clamp(10px, 2vw, 14px)'
                }}
              >
                Connect with us
              </span>
              
              {/* Social Icons */}
              <div className="flex gap-3 md:gap-4">
                {/* Facebook */}
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                
                {/* Instagram */}
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
                  </svg>
                </div>
                
                {/* Twitter */}
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </div>
                
                {/* YouTube */}
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        id="file-input"
        className="hidden"
        accept="video/mp4,video/mov,video/avi,video/quicktime"
        onChange={handleFileSelect}
      />

      {/* Video Recorder Overlay */}
      {isRecorderOpen && (
        <VideoRecorder
          onRecordingComplete={handleRecordingComplete}
          onVideoReady={handleRecorderReady}
          autoSubmitOnStop={true}
        />
      )}

      {/* Analysis Loader Overlay */}
      {state.isAnalyzing && (
        <AnalysisLoader
          progress={state.progress}
          isVisible={state.isAnalyzing}
        />
      )}
    </div>
  );
}
