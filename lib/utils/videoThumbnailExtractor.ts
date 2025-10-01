'use client';

import { FaceDetectionService } from './faceDetection';

export interface VideoThumbnailResult {
  thumbnailDataUrl: string;
  position: number;
  brightness: number;
}

/**
 * Extract an optimal thumbnail from a video file using face detection
 * @param videoFile The video file to extract thumbnail from
 * @returns Promise with thumbnail data URL and metadata
 */
export async function extractOptimalVideoThumbnail(
  videoFile: File | Blob | string
): Promise<VideoThumbnailResult | null> {
  return new Promise((resolve, reject) => {
    // Create video element
    const video = document.createElement('video');
    video.style.display = 'none';
    video.preload = 'auto';
    video.muted = true;
    document.body.appendChild(video);

    let videoUrl: string;

    // Set video source
    if (typeof videoFile === 'string') {
      videoUrl = videoFile;
      video.src = videoUrl;
    } else {
      videoUrl = URL.createObjectURL(videoFile);
      video.src = videoUrl;
    }

    // Initialize face detection service
    const faceDetectionService = new FaceDetectionService();
    faceDetectionService.setVideoElement(video);

    const cleanup = () => {
      video.pause();
      video.src = '';
      if (typeof videoFile !== 'string') {
        URL.revokeObjectURL(videoUrl);
      }
      document.body.removeChild(video);
    };

    video.onloadedmetadata = async () => {
      try {
        console.log('📹 Video metadata loaded, starting thumbnail extraction...');
        
        // Find the optimal frame using face detection
        const optimalFrame = await faceDetectionService.findOptimalFrame();
        
        if (!optimalFrame) {
          console.error('❌ Could not find optimal frame');
          cleanup();
          resolve(null);
          return;
        }

        console.log('✅ Optimal thumbnail extracted:', {
          position: optimalFrame.position,
          brightness: optimalFrame.brightness
        });

        cleanup();

        resolve({
          thumbnailDataUrl: optimalFrame.frameData,
          position: optimalFrame.position,
          brightness: optimalFrame.brightness
        });

      } catch (error) {
        console.error('❌ Error extracting thumbnail:', error);
        cleanup();
        reject(error);
      }
    };

    video.onerror = (error) => {
      console.error('❌ Video loading error:', error);
      cleanup();
      reject(new Error('Failed to load video'));
    };

    // Timeout fallback
    setTimeout(() => {
      if (video.readyState < 2) {
        console.error('❌ Video loading timeout');
        cleanup();
        reject(new Error('Video loading timeout'));
      }
    }, 30000); // 30 second timeout
  });
}

/**
 * Extract a quick thumbnail from middle of video without face detection (fallback)
 * @param videoFile The video file to extract thumbnail from
 * @returns Promise with thumbnail data URL
 */
export async function extractQuickThumbnail(
  videoFile: File | Blob | string
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.style.display = 'none';
    video.preload = 'metadata';
    video.muted = true;
    document.body.appendChild(video);

    let videoUrl: string;

    if (typeof videoFile === 'string') {
      videoUrl = videoFile;
      video.src = videoUrl;
    } else {
      videoUrl = URL.createObjectURL(videoFile);
      video.src = videoUrl;
    }

    const cleanup = () => {
      video.pause();
      video.src = '';
      if (typeof videoFile !== 'string') {
        URL.revokeObjectURL(videoUrl);
      }
      document.body.removeChild(video);
    };

    video.onloadedmetadata = () => {
      // Seek to middle of video
      video.currentTime = video.duration / 2;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        cleanup();
        resolve(thumbnailDataUrl);
      } catch (error) {
        console.error('Error extracting quick thumbnail:', error);
        cleanup();
        reject(error);
      }
    };

    video.onerror = (error) => {
      console.error('Video loading error:', error);
      cleanup();
      reject(new Error('Failed to load video'));
    };
  });
}

/**
 * Save thumbnail to localStorage for Remotion access
 * @param thumbnailDataUrl The thumbnail data URL
 * @param key Storage key (default: 'userVideoThumbnail')
 */
export function saveVideoThumbnail(thumbnailDataUrl: string, key = 'userVideoThumbnail') {
  try {
    localStorage.setItem(key, thumbnailDataUrl);
    console.log('✅ Thumbnail saved to localStorage');
  } catch (error) {
    console.error('❌ Error saving thumbnail to localStorage:', error);
  }
}

/**
 * Retrieve thumbnail from localStorage
 * @param key Storage key (default: 'userVideoThumbnail')
 * @returns The thumbnail data URL or null
 */
export function getVideoThumbnail(key = 'userVideoThumbnail'): string | null {
  try {
    const thumbnail = localStorage.getItem(key);
    return thumbnail;
  } catch (error) {
    console.error('❌ Error retrieving thumbnail from localStorage:', error);
    return null;
  }
}
