import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqzukyxnnjnstrecybzx.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxenVreXhubmpuc3RyZWN5Ynp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTM4OTIsImV4cCI6MjA3MzA2OTg5Mn0.-FaJuxBuwxk5L-WCYKv--Vmq0g_aPBjGOTBKgwTrcOI';

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Starting video upload to Supabase...');
    
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    console.log('📊 File details:', {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      type: file.type
    });

    // Convert file to ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer();
    
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Generate unique filename
    const timestamp = Date.now();
    const origName = file.name || 'uploaded-video.mp4';
    const ext = origName.split('.').pop()?.toLowerCase() || 'mp4';
    const safeExt = ['mp4', 'mov', 'webm', 'ogg'].includes(ext) ? ext : 'mp4';
    const filename = `user-uploads/user-video-${timestamp}.${safeExt}`;

    console.log('📦 Uploading to Supabase Storage:', filename);

    // Upload to Supabase Storage (using bowling-avatars bucket that already exists)
    const { data, error } = await supabase.storage
      .from('bowling-avatars')
      .upload(filename, arrayBuffer, {
        contentType: file.type || 'video/mp4',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      return NextResponse.json({ 
        success: false, 
        error: `Supabase upload failed: ${error.message}` 
      }, { status: 500 });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('bowling-avatars')
      .getPublicUrl(filename);

    const publicUrl = publicUrlData.publicUrl;

    console.log('✅ Video uploaded successfully to Supabase:', publicUrl);

    return NextResponse.json({ 
      success: true, 
      publicPath: publicUrl,
      supabaseUrl: publicUrl,
      filename: filename
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to upload file' 
    }, { status: 500 });
  }
}

