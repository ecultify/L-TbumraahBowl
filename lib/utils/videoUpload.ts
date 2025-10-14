'use client';

import { supabase } from '@/lib/supabase/client';

/**
 * Upload a user video file to Supabase storage and return the public URL.
 * Also stores `uploadedVideoPublicPath` in sessionStorage on success.
 */
export async function uploadUserVideoToSupabase(file: File): Promise<string | null> {
  try {
    if (!(file instanceof File) || file.size === 0) {
      console.warn('uploadUserVideoToSupabase: invalid file');
      return null;
    }

    const origName = file.name || 'uploaded-video.mp4';
    const ext = (origName.split('.').pop() || 'mp4').toLowerCase();
    const safeExt = ['mp4', 'mov', 'webm', 'ogg'].includes(ext) ? ext : 'mp4';
    const timestamp = Date.now();
    const path = `user-uploads/user-video-${timestamp}.${safeExt}`;

    const { data, error } = await supabase.storage
      .from('bowling-avatars')
      .upload(path, file, {
        contentType: file.type || 'video/mp4',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase video upload error:', error);
      return null;
    }

    // Resolve public URL
    const { data: publicUrlData } = supabase.storage
      .from('bowling-avatars')
      .getPublicUrl(data?.path || path);

    const publicUrl = publicUrlData.publicUrl;

    if (typeof window !== 'undefined' && publicUrl) {
      window.sessionStorage.setItem('uploadedVideoPublicPath', publicUrl);
    }

    return publicUrl || null;
  } catch (e) {
    console.error('uploadUserVideoToSupabase failed:', e);
    return null;
  }
}

/**
 * Upload a thumbnail from a data URL (base64) to Supabase storage and return the public URL.
 * This reduces payload size when sending to Lambda.
 */
export async function uploadThumbnailToSupabase(dataUrl: string): Promise<string | null> {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      console.warn('uploadThumbnailToSupabase: invalid data URL');
      return null;
    }

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    // Create File object
    const timestamp = Date.now();
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const filename = `user-thumbnail-${timestamp}.${ext}`;
    const file = new File([blob], filename, { type: blob.type });

    const path = `user-thumbnails/${filename}`;

    console.log('[uploadThumbnailToSupabase] Uploading thumbnail:', path, `(${blob.size} bytes)`);

    const { data, error } = await supabase.storage
      .from('bowling-avatars')
      .upload(path, file, {
        contentType: blob.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase thumbnail upload error:', error);
      return null;
    }

    // Resolve public URL
    const { data: publicUrlData } = supabase.storage
      .from('bowling-avatars')
      .getPublicUrl(data?.path || path);

    const publicUrl = publicUrlData.publicUrl;
    console.log('[uploadThumbnailToSupabase] ✅ Thumbnail uploaded:', publicUrl);

    if (typeof window !== 'undefined' && publicUrl) {
      window.sessionStorage.setItem('uploadedThumbnailUrl', publicUrl);
    }

    return publicUrl || null;
  } catch (e) {
    console.error('uploadThumbnailToSupabase failed:', e);
    return null;
  }
}

