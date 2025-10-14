/**
 * Upload Rendered Video to Supabase Storage
 * 
 * This utility uploads generated analysis videos to Supabase Storage
 * and returns the public URL for saving to the database.
 */

import { supabase } from '@/lib/supabase/client';
import { normalizeVideoUrl } from '@/lib/utils/urlNormalization';

export interface UploadRenderedVideoResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

/**
 * Upload a rendered video file to Supabase Storage
 * 
 * @param videoUrl - The URL of the rendered video (can be blob URL or S3 URL)
 * @param playerName - Name of the player (used in filename)
 * @param renderId - Unique render ID (optional)
 * @returns Result object with success status and public URL
 */
export async function uploadRenderedVideoToSupabase(
  videoUrl: string,
  playerName: string = 'anonymous',
  renderId?: string
): Promise<UploadRenderedVideoResult> {
  try {
    console.log('📤 [Supabase Upload] Starting rendered video upload...');
    console.log('📤 [Supabase Upload] Video URL:', videoUrl.substring(0, 100) + '...');
    console.log('📤 [Supabase Upload] Player:', playerName);
    
    // Fetch the video file from the URL
    console.log('📥 [Supabase Upload] Fetching video from URL...');
    const response = await fetch(videoUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const fileSizeMB = (blob.size / 1024 / 1024).toFixed(2);
    
    console.log(`📊 [Supabase Upload] Video size: ${fileSizeMB} MB`);
    console.log(`📊 [Supabase Upload] Video type: ${blob.type}`);
    
    // Sanitize player name for filename
    const sanitizedPlayerName = playerName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50); // Limit length
    
    // Create unique filename
    const timestamp = Date.now();
    const randomId = renderId || Math.random().toString(36).substring(2, 10);
    const filename = `analysis-${sanitizedPlayerName}-${timestamp}-${randomId}.mp4`;
    
    console.log(`📝 [Supabase Upload] Filename: ${filename}`);
    
    // Upload to Supabase Storage
    console.log('📤 [Supabase Upload] Uploading to Supabase Storage bucket: rendered-videos');
    
    const { data, error } = await supabase.storage
      .from('rendered-videos')
      .upload(filename, blob, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('❌ [Supabase Upload] Upload failed:', error);
      throw error;
    }
    
    console.log('✅ [Supabase Upload] Upload successful!');
    console.log('📄 [Supabase Upload] Storage path:', data.path);
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('rendered-videos')
      .getPublicUrl(filename);
    
    let publicUrl = publicUrlData.publicUrl;
    
    // 🔧 NORMALIZE URL to fix malformed URLs (e.g., https// → https://)
    const normalizedUrl = normalizeVideoUrl(publicUrl);
    if (normalizedUrl) {
      publicUrl = normalizedUrl;
      console.log('✅ [Supabase Upload] URL normalized successfully');
    } else {
      console.warn('⚠️ [Supabase Upload] URL normalization failed, using original');
    }
    
    console.log('✅ [Supabase Upload] Public URL:', publicUrl);
    
    return {
      success: true,
      publicUrl: publicUrl
    };
    
  } catch (error: any) {
    console.error('❌ [Supabase Upload] Error uploading video:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during upload'
    };
  }
}

/**
 * Upload a video blob directly to Supabase Storage
 * 
 * @param videoBlob - The video blob to upload
 * @param playerName - Name of the player (used in filename)
 * @param renderId - Unique render ID (optional)
 * @returns Result object with success status and public URL
 */
export async function uploadRenderedVideoBlobToSupabase(
  videoBlob: Blob,
  playerName: string = 'anonymous',
  renderId?: string
): Promise<UploadRenderedVideoResult> {
  try {
    console.log('📤 [Supabase Upload] Starting blob upload...');
    
    const fileSizeMB = (videoBlob.size / 1024 / 1024).toFixed(2);
    console.log(`📊 [Supabase Upload] Video size: ${fileSizeMB} MB`);
    
    // Sanitize player name for filename
    const sanitizedPlayerName = playerName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    
    // Create unique filename
    const timestamp = Date.now();
    const randomId = renderId || Math.random().toString(36).substring(2, 10);
    const filename = `analysis-${sanitizedPlayerName}-${timestamp}-${randomId}.mp4`;
    
    console.log(`📝 [Supabase Upload] Filename: ${filename}`);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('rendered-videos')
      .upload(filename, videoBlob, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('❌ [Supabase Upload] Upload failed:', error);
      throw error;
    }
    
    console.log('✅ [Supabase Upload] Upload successful!');
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('rendered-videos')
      .getPublicUrl(filename);
    
    let publicUrl = publicUrlData.publicUrl;
    
    // 🔧 NORMALIZE URL to fix malformed URLs (e.g., https// → https://)
    const normalizedUrl = normalizeVideoUrl(publicUrl);
    if (normalizedUrl) {
      publicUrl = normalizedUrl;
      console.log('✅ [Supabase Upload] URL normalized successfully');
    } else {
      console.warn('⚠️ [Supabase Upload] URL normalization failed, using original');
    }
    
    console.log('✅ [Supabase Upload] Public URL:', publicUrl);
    
    return {
      success: true,
      publicUrl: publicUrl
    };
    
  } catch (error: any) {
    console.error('❌ [Supabase Upload] Error uploading video blob:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during upload'
    };
  }
}

