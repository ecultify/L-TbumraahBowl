import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeVideoUrl } from '@/lib/utils/urlNormalization';

// Initialize Supabase client
const supabaseUrl = 'https://hqzukyxnnjnstrecybzx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxenVreXhubmpuc3RyZWN5Ynp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTM4OTIsImV4cCI6MjA3MzA2OTg5Mn0.-FaJuxBuwxk5L-WCYKv--Vmq0g_aPBjGOTBKgwTrcOI';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 🔗 SHORT URL REDIRECT ENDPOINT
 * 
 * Converts branded short URLs like:
 *   https://bowllikebumrah.com/v/a8533329-1234-5678-9abc-def012345678
 * 
 * To actual Supabase video URLs like:
 *   https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/rendered-videos/analysis-abhinav-1760014770590.mp4
 * 
 * Benefits:
 * ✅ Professional branded URLs in WhatsApp
 * ✅ Shorter URLs (73 chars vs 140+ chars)
 * ✅ Trackable (can add analytics later)
 * ✅ Database-driven (video URL can be updated without changing the short link)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`[Short URL Redirect] Looking up video for ID: ${id}`);

    // Query database for video URL
    const { data, error } = await supabase
      .from('bowling_attempts')
      .select('video_url, display_name')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Short URL Redirect] Database error:', error);
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    if (!data || !data.video_url) {
      console.error('[Short URL Redirect] No video URL found for ID:', id);
      return NextResponse.json(
        { error: 'Video URL not available yet. Please try again in a few moments.' },
        { status: 404 }
      );
    }

    // 🔧 NORMALIZE URL to fix malformed URLs (e.g., https// → https://)
    const normalizedUrl = normalizeVideoUrl(data.video_url);
    
    if (!normalizedUrl) {
      console.error('[Short URL Redirect] Invalid video URL after normalization:', data.video_url);
      return NextResponse.json(
        { error: 'Invalid video URL format' },
        { status: 500 }
      );
    }

    console.log(`[Short URL Redirect] Original URL: ${data.video_url.substring(0, 80)}...`);
    console.log(`[Short URL Redirect] Normalized URL: ${normalizedUrl.substring(0, 80)}...`);
    console.log(`[Short URL Redirect] Redirecting to normalized URL`);

    // Return 308 Permanent Redirect (tells browsers/WhatsApp to cache the redirect)
    return NextResponse.redirect(normalizedUrl, 308);

  } catch (err) {
    console.error('[Short URL Redirect] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

