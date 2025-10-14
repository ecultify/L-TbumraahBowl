#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase credentials
const SUPABASE_URL = 'https://hqzukyxnnjnstrecybzx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxenVreXhubmpuc3RyZWN5Ynp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTM4OTIsImV4cCI6MjA3MzA2OTg5Mn0.-FaJuxBuwxk5L-WCYKv--Vmq0g_aPBjGOTBKgwTrcOI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Videos to upload
const videosToUpload = [
  { file: 'public/BG.mp4', storagePath: 'remotion-assets/BG.mp4' },
  { file: 'public/benchmark-bowling-action.mp4', storagePath: 'remotion-assets/benchmark-bowling-action.mp4' },
];

async function uploadVideo(filePath, storagePath) {
  console.log(`\n📤 Uploading ${filePath}...`);
  
  try {
    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const fileStats = fs.statSync(filePath);
    const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`   Size: ${fileSizeMB} MB`);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('bowling-avatars')
      .upload(storagePath, fileBuffer, {
        contentType: 'video/mp4',
        upsert: true, // Overwrite if exists
      });

    if (error) {
      console.error(`   ❌ Error uploading ${fileName}:`, error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('bowling-avatars')
      .getPublicUrl(storagePath);

    console.log(`   ✅ Uploaded successfully!`);
    console.log(`   📍 Public URL: ${urlData.publicUrl}`);
    
    return urlData.publicUrl;
  } catch (err) {
    console.error(`   ❌ Error:`, err.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting video upload to Supabase...\n');
  console.log(`📦 Supabase URL: ${SUPABASE_URL}`);
  console.log(`📂 Storage bucket: bowling-avatars`);
  
  const results = {};
  
  for (const video of videosToUpload) {
    const url = await uploadVideo(video.file, video.storagePath);
    if (url) {
      const key = path.basename(video.file);
      results[key] = url;
    }
  }
  
  console.log('\n\n✅ Upload complete!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 URLS TO USE IN YOUR CODE:');
  console.log('═══════════════════════════════════════════════════════\n');
  
  Object.entries(results).forEach(([file, url]) => {
    console.log(`${file}:`);
    console.log(`  ${url}\n`);
  });
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n💡 TIP: Copy these URLs and use them in your Remotion composition');
  console.log('    instead of staticFile() to avoid bundling large videos.\n');
}

main().catch(console.error);

