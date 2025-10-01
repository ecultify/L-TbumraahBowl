'use client';

import { supabase } from '@/lib/supabase/client';

/**
 * Upload Gemini-generated avatar image to Supabase storage
 * @param imageUrl - The Gemini image URL or base64 data URL
 * @param playerName - Player name for organizing files
 * @returns Public URL of uploaded avatar or null if failed
 */
export async function uploadGeminiAvatar(
  imageUrl: string,
  playerName: string = 'anonymous'
): Promise<string | null> {
  try {
    console.log('📤 Starting Gemini avatar upload to Supabase...');

    // Fetch the image data
    let imageBlob: Blob;
    
    if (imageUrl.startsWith('data:')) {
      // Handle base64 data URL
      const response = await fetch(imageUrl);
      imageBlob = await response.blob();
    } else if (imageUrl.startsWith('http')) {
      // Handle external URL (Gemini API response)
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image from URL');
      }
      imageBlob = await response.blob();
    } else {
      throw new Error('Invalid image URL format');
    }

    console.log('✅ Image blob created, size:', imageBlob.size, 'bytes');

    // Generate unique filename
    const timestamp = new Date().getTime();
    const sanitizedName = playerName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileExtension = imageBlob.type.split('/')[1] || 'png';
    const fileName = `${sanitizedName}-${timestamp}.${fileExtension}`;
    const filePath = `avatars/${fileName}`;

    console.log('📁 Uploading to path:', filePath);

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('bowling-avatars')
      .upload(filePath, imageBlob, {
        contentType: imageBlob.type,
        cacheControl: '3600', // Cache for 1 hour
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      console.error('❌ Supabase storage upload error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Upload succeeded but no data returned');
    }

    console.log('✅ Upload successful, file path:', data.path);

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('bowling-avatars')
      .getPublicUrl(data.path);

    const publicUrl = publicUrlData.publicUrl;
    console.log('🌐 Public URL:', publicUrl);

    // Store in sessionStorage for immediate use
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('geminiAvatarUrl', publicUrl);
      console.log('💾 Avatar URL saved to sessionStorage');
    }

    return publicUrl;

  } catch (error) {
    console.error('❌ Failed to upload Gemini avatar:', error);
    return null;
  }
}

/**
 * Get Gemini avatar URL from sessionStorage
 * @returns Avatar URL or null if not available
 */
export function getGeminiAvatarUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage.getItem('geminiAvatarUrl');
}

/**
 * Delete avatar from Supabase storage
 * @param avatarUrl - Public URL of the avatar to delete
 * @returns True if successful, false otherwise
 */
export async function deleteGeminiAvatar(avatarUrl: string): Promise<boolean> {
  try {
    // Extract file path from public URL
    const urlParts = avatarUrl.split('/bowling-avatars/');
    if (urlParts.length !== 2) {
      throw new Error('Invalid avatar URL format');
    }

    const filePath = urlParts[1];
    console.log('🗑️ Deleting avatar:', filePath);

    const { error } = await supabase.storage
      .from('bowling-avatars')
      .remove([filePath]);

    if (error) {
      console.error('❌ Delete error:', error);
      throw error;
    }

    console.log('✅ Avatar deleted successfully');
    
    // Clear from sessionStorage
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('geminiAvatarUrl');
    }

    return true;

  } catch (error) {
    console.error('❌ Failed to delete avatar:', error);
    return false;
  }
}

/**
 * Check if avatar exists in storage
 * @param avatarUrl - Public URL to check
 * @returns True if exists, false otherwise
 */
export async function checkAvatarExists(avatarUrl: string): Promise<boolean> {
  try {
    const response = await fetch(avatarUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
