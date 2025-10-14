/**
 * Local Remotion Video Rendering Server
 * 
 * This Node.js server handles video rendering locally using Remotion.
 * Run with: node server/render-video.js
 */

const express = require('express');
const cors = require('cors');
const {bundle} = require('@remotion/bundler');
const {renderMedia, selectComposition} = require('@remotion/renderer');
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3');
const {createClient} = require('@supabase/supabase-js');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const {shortenUrlForWhatsApp} = require('./utils/urlShortener');
const {normalizeVideoUrl} = require('./utils/urlNormalizer');

// Configure AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// S3 Configuration
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'bowling-analysis-videos';
const S3_REGION = process.env.AWS_REGION || 'ap-south-1';

// Supabase Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqzukyxnnjnstrecybzx.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxenVreXhubmpuc3RyZWN5Ynp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTM4OTIsImV4cCI6MjA3MzA2OTg5Mn0.-FaJuxBuwxk5L-WCYKv--Vmq0g_aPBjGOTBKgwTrcOI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// WhatsApp Configuration
const SINCH_CONFIG = {
  AUTH_URL: 'https://auth.aclwhatsapp.com/realms/ipmessaging/protocol/openid-connect/token',
  MESSAGE_URL: 'https://api.aclwhatsapp.com/pull-platform-receiver/v2/wa/messages',
  USERNAME: 'ltfspd13',
  PASSWORD: 'Sinch@918097367357',
  CLIENT_ID: 'ipmessaging-client',
  GRANT_TYPE: 'password',
  TEMPLATE_ID: 'blbumrah_3_091025', // Updated template
  HEADER_IMAGE_URL: 'https://bowllikebumrah.com/images/newhomepage/Group%201437254115.png'
};

// Token refresh threshold (refresh if expires in < 1 hour)
const TOKEN_REFRESH_THRESHOLD_HOURS = 1;

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({limit: '50mb'})); // Allow large payloads

// Ensure output directory exists
const OUTPUT_DIR = path.join(__dirname, '../public/renders');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, {recursive: true});
}

// Ensure temp directory exists for downloaded videos
const TEMP_DIR = path.join(__dirname, '../public/temp-videos');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, {recursive: true});
}

// Helper function to download video to local disk
async function downloadVideo(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`📥 [Download] Downloading video from: ${url.substring(0, 80)}...`);
    
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with status ${response.statusCode}`));
        return;
      }
      
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
        if (downloadedSize % (1024 * 1024) < 8192) { // Log every ~1MB
          console.log(`📥 [Download] Progress: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(1)}MB / ${(totalSize / 1024 / 1024).toFixed(1)}MB)`);
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ [Download] Video downloaded successfully to ${outputPath}`);
        resolve(outputPath);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
    
    file.on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

// Helper function to upload video to Supabase Storage
async function uploadToSupabase(filePath, playerName, renderId) {
  try {
    console.log(`📤 [Supabase Upload] Starting upload to Supabase...`);
    console.log(`📤 [Supabase Upload] File: ${filePath}`);
    console.log(`📤 [Supabase Upload] Player: ${playerName}`);
    
    // Read file
    const fileContent = fs.readFileSync(filePath);
    const fileStats = fs.statSync(filePath);
    const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
    
    console.log(`📤 [Supabase Upload] File size: ${fileSizeMB} MB`);
    
    // Sanitize player name for filename
    const sanitizedPlayerName = (playerName || 'anonymous')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Create filename
    const timestamp = Date.now();
    const filename = `analysis-${sanitizedPlayerName}-${timestamp}-${renderId}.mp4`;
    
    console.log(`📤 [Supabase Upload] Filename: ${filename}`);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('rendered-videos')
      .upload(filename, fileContent, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error(`❌ [Supabase Upload] Upload failed:`, error);
      throw error;
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('rendered-videos')
      .getPublicUrl(filename);
    
    let supabaseUrl = publicUrlData.publicUrl;
    
    console.log(`🔍 [Supabase Upload] RAW URL from getPublicUrl:`, supabaseUrl);
    console.log(`🔍 [Supabase Upload] URL type:`, typeof supabaseUrl);
    console.log(`🔍 [Supabase Upload] URL length:`, supabaseUrl?.length);
    
    // 🔧 NORMALIZE URL to fix any malformed URLs (e.g., https// → https://)
    const originalUrl = supabaseUrl;
    supabaseUrl = normalizeVideoUrl(supabaseUrl);
    
    if (!supabaseUrl) {
      console.error(`❌ [Supabase Upload] Generated URL is invalid after normalization!`);
      console.error(`❌ [Supabase Upload] Original URL was:`, originalUrl);
      throw new Error('Generated URL is invalid after normalization');
    }
    
    if (originalUrl !== supabaseUrl) {
      console.warn(`⚠️ [Supabase Upload] URL was modified during normalization`);
      console.log(`📋 [Supabase Upload] Original: ${originalUrl}`);
      console.log(`📋 [Supabase Upload] Normalized: ${supabaseUrl}`);
    }
    
    console.log(`✅ [Supabase Upload] Upload complete!`);
    console.log(`✅ [Supabase Upload] Final Supabase URL: ${supabaseUrl}`);
    
    return supabaseUrl;
  } catch (error) {
    console.error(`❌ [Supabase Upload] Upload failed:`, error);
    throw error;
  }
}

// Helper function to upload video to S3 (kept for backward compatibility, but not used)
async function uploadToS3(filePath, playerName, renderId) {
  try {
    console.log(`📤 [S3 Upload] Starting upload to S3...`);
    console.log(`📤 [S3 Upload] File: ${filePath}`);
    console.log(`📤 [S3 Upload] Player: ${playerName}`);
    
    // Read file
    const fileContent = fs.readFileSync(filePath);
    const fileStats = fs.statSync(filePath);
    const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
    
    console.log(`📤 [S3 Upload] File size: ${fileSizeMB} MB`);
    
    // Sanitize player name for filename (remove special characters)
    const sanitizedPlayerName = (playerName || 'anonymous')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Create S3 key (filename in bucket)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const s3Key = `rendered-videos/${sanitizedPlayerName}-${timestamp}.mp4`;
    
    console.log(`📤 [S3 Upload] S3 Key: ${s3Key}`);
    
    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'video/mp4',
      ACL: 'public-read', // Make video publicly accessible
    });
    
    await s3Client.send(command);
    
    // Construct S3 URL
    const s3Url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${s3Key}`;
    
    console.log(`✅ [S3 Upload] Upload complete!`);
    console.log(`✅ [S3 Upload] S3 URL: ${s3Url}`);
    
    return s3Url;
  } catch (error) {
    console.error(`❌ [S3 Upload] Upload failed:`, error);
    throw error;
  }
}

// Helper function to update bowling_attempts table with video URL
async function updateBowlingAttemptsVideoUrl(leaderboardId, videoUrl) {
  try {
    if (!leaderboardId || !videoUrl) {
      console.warn(`⚠️ [DB Update] Missing leaderboardId or videoUrl, skipping database update`);
      return false;
    }
    
    console.log(`📊 [DB Update] ========== FINAL DATABASE UPDATE ==========`);
    console.log(`📊 [DB Update] Leaderboard ID: ${leaderboardId}`);
    console.log(`📊 [DB Update] Video URL (FULL): ${videoUrl}`);
    console.log(`📊 [DB Update] URL length: ${videoUrl.length}`);
    console.log(`📊 [DB Update] Starts with https://: ${videoUrl.startsWith('https://')}`);
    console.log(`📊 [DB Update] Contains bowllikebumrah.com: ${videoUrl.includes('bowllikebumrah.com')}`);
    console.log(`📊 [DB Update] Contains supabase.co: ${videoUrl.includes('supabase.co')}`);
    
    // FINAL VALIDATION before database write
    if (videoUrl.includes('bowllikebumrah.com')) {
      console.error(`❌❌❌ [DB Update] ABORT: Attempted to save corrupted URL to database!`);
      console.error(`❌❌❌ [DB Update] Corrupted URL: ${videoUrl}`);
      return false;
    }
    
    if (!videoUrl.startsWith('https://hqzukyxnnjnstrecybzx.supabase.co/storage/v1/object/public/')) {
      console.error(`❌❌❌ [DB Update] ABORT: URL doesn't match expected Supabase pattern!`);
      console.error(`❌❌❌ [DB Update] Invalid URL: ${videoUrl}`);
      return false;
    }
    
    console.log(`📊 [DB Update] Executing UPDATE query...`);
    
    const { error, data } = await supabase
      .from('bowling_attempts')
      .update({ video_url: videoUrl })
      .eq('id', leaderboardId)
      .select();
    
    if (error) {
      console.error(`❌ [DB Update] Failed to update video_url:`, error);
      return false;
    }
    
    console.log(`✅ [DB Update] Successfully updated video_url in database!`);
    console.log(`✅ [DB Update] Updated record:`, JSON.stringify(data));
    console.log(`📊 [DB Update] ===================================================`);
    return true;
  } catch (error) {
    console.error(`❌ [DB Update] Exception:`, error);
    return false;
  }
}

// Helper function to get Sinch WhatsApp access token (with Supabase caching)
async function getSinchAccessToken() {
  try {
    console.log('[Token Manager] 🔑 Getting WhatsApp access token...');

    // 1. Check if we have a valid cached token in Supabase
    const { data: tokenData, error: fetchError } = await supabase
      .from('whatsapp_tokens')
      .select('*')
      .eq('id', 1)
      .single();

    if (!fetchError && tokenData) {
      // 2. Check if token is still valid (expires in > 1 hour)
      const expiresAt = new Date(tokenData.expires_at);
      const now = new Date();
      const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      console.log(`[Token Manager] Token expires in ${hoursUntilExpiry.toFixed(2)} hours`);

      // 3. If token is valid, return it
      if (hoursUntilExpiry > TOKEN_REFRESH_THRESHOLD_HOURS) {
        console.log('✅ [Token Manager] Using cached token from Supabase');
        return tokenData.access_token;
      }
    }

    // 4. Token is expiring soon, expired, or doesn't exist - refresh it
    console.log('🔄 [Token Manager] Token needs refresh, fetching new one...');
    return await refreshSinchAccessToken();
  } catch (error) {
    console.error('❌ [Token Manager] Error getting token:', error);
    // Fallback: try to get fresh token
    return await refreshSinchAccessToken();
  }
}

// Helper function to refresh WhatsApp access token
async function refreshSinchAccessToken() {
  try {
    console.log('🔄 [Token Manager] Fetching new access token from Sinch API...');

    const formData = new URLSearchParams();
    formData.append('grant_type', SINCH_CONFIG.GRANT_TYPE);
    formData.append('client_id', SINCH_CONFIG.CLIENT_ID);
    formData.append('username', SINCH_CONFIG.USERNAME);
    formData.append('password', SINCH_CONFIG.PASSWORD);

    const response = await fetch(SINCH_CONFIG.AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'cache-control': 'no-cache'
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const accessToken = data.access_token;
    const expiresIn = data.expires_in || 36000; // Default 10 hours

    if (!accessToken) {
      throw new Error('No access token in response');
    }

    console.log(`✅ [Token Manager] Got new token, expires in ${expiresIn / 3600} hours`);

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Store in Supabase
    const { error: updateError } = await supabase
      .from('whatsapp_tokens')
      .upsert({
        id: 1,
        access_token: accessToken,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
        token_source: 'auto_refresh'
      }, {
        onConflict: 'id'
      });

    if (updateError) {
      console.error('❌ [Token Manager] Failed to store token in Supabase:', updateError);
      // Continue anyway, we still have the token
    } else {
      console.log('✅ [Token Manager] Token stored in Supabase successfully');
    }

    return accessToken;
  } catch (error) {
    console.error('❌ [Token Manager] Failed to refresh token:', error);
    throw error;
  }
}

// Helper function to send WhatsApp message
async function sendWhatsAppMessage(phoneNumber, userName, videoLink) {
  try {
    if (!phoneNumber || !userName || !videoLink) {
      console.warn(`⚠️ [WhatsApp] Missing required fields, skipping WhatsApp message`);
      return false;
    }
    
    console.log(`📱 [WhatsApp] Sending message to ${phoneNumber}...`);
    console.log(`📱 [WhatsApp] User: ${userName}`);
    console.log(`📱 [WhatsApp] Video: ${videoLink.substring(0, 100)}...`);
    
    // Get access token
    const accessToken = await getSinchAccessToken();
    
    // Prepare message payload
    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'template',
      template: {
        name: SINCH_CONFIG.TEMPLATE_ID,
        language: {
          code: 'en'
        },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: {
                  link: SINCH_CONFIG.HEADER_IMAGE_URL
                }
              }
            ]
          },
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: userName
              },
              {
                type: 'text',
                text: videoLink
              }
            ]
          }
        ]
      }
    };
    
    // Send message
    const response = await fetch(SINCH_CONFIG.MESSAGE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    });
    
    const responseText = await response.text();
    let responseData = {};
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw: responseText };
    }
    
    if (!response.ok) {
      console.error(`❌ [WhatsApp] Send failed:`, responseData);
      return false;
    }
    
    console.log(`✅ [WhatsApp] Message sent successfully!`, responseData);
    return true;
  } catch (error) {
    console.error(`❌ [WhatsApp] Exception:`, error);
    return false;
  }
}

// Helper function to update whatsapp_sent flag in database
async function updateWhatsAppSentFlag(leaderboardId, sent) {
  try {
    if (!leaderboardId) {
      console.warn(`⚠️ [DB Update] Missing leaderboardId, skipping whatsapp_sent update`);
      return false;
    }
    
    console.log(`📊 [DB Update] Updating whatsapp_sent flag to ${sent}...`);
    
    const { error } = await supabase
      .from('bowling_attempts')
      .update({ whatsapp_sent: sent })
      .eq('id', leaderboardId);
    
    if (error) {
      console.error(`❌ [DB Update] Failed to update whatsapp_sent:`, error);
      return false;
    }
    
    console.log(`✅ [DB Update] Successfully updated whatsapp_sent to ${sent}!`);
    return true;
  } catch (error) {
    console.error(`❌ [DB Update] Exception:`, error);
    return false;
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({status: 'ok', message: 'Remotion rendering server is running'});
});

// Store active renders
const activeRenders = new Map();

// 🆕 RENDER QUEUE - Prevent resource exhaustion from concurrent renders
const MAX_CONCURRENT_RENDERS = 2; // Only allow 2 renders at a time
const renderQueue = [];
let currentlyRenderingCount = 0;

// Process next item in queue
async function processRenderQueue() {
  if (currentlyRenderingCount >= MAX_CONCURRENT_RENDERS || renderQueue.length === 0) {
    return; // Can't process more right now
  }
  
  const nextRender = renderQueue.shift();
  if (!nextRender) return;
  
  currentlyRenderingCount++;
  console.log(`🎬 [Queue] Starting render ${nextRender.renderId} (${currentlyRenderingCount}/${MAX_CONCURRENT_RENDERS} active, ${renderQueue.length} queued)`);
  
  try {
    await nextRender.execute();
  } catch (error) {
    console.error(`❌ [Queue] Render ${nextRender.renderId} failed:`, error);
  } finally {
    currentlyRenderingCount--;
    console.log(`✅ [Queue] Completed render ${nextRender.renderId} (${currentlyRenderingCount}/${MAX_CONCURRENT_RENDERS} active, ${renderQueue.length} queued)`);
    
    // Process next in queue
    setImmediate(() => processRenderQueue());
  }
}

// Add render to queue
function queueRender(renderId, executeFunction) {
  const queuePosition = renderQueue.length + 1;
  
  renderQueue.push({
    renderId,
    queuedAt: Date.now(),
    execute: executeFunction
  });
  
  console.log(`📋 [Queue] Render ${renderId} queued at position ${queuePosition}`);
  console.log(`📊 [Queue] Status: ${currentlyRenderingCount}/${MAX_CONCURRENT_RENDERS} active, ${renderQueue.length} total queued`);
  
  // Update render status to show queue position
  const renderStatus = activeRenders.get(renderId);
  if (renderStatus) {
    renderStatus.queuePosition = queuePosition;
    renderStatus.status = queuePosition > MAX_CONCURRENT_RENDERS ? 'queued' : 'rendering';
  }
  
  // Try to process queue
  processRenderQueue();
}

// Render video endpoint (starts render and returns immediately)
app.post('/render', async (req, res) => {
  try {
    console.log('🎬 [Render Server] Received render request');
    console.log('📊 [Render Server] Analysis data:', req.body.analysisData);

    const {analysisData, userVideoUrl, thumbnailDataUrl, leaderboardId, phoneNumber} = req.body;

    if (!analysisData) {
      return res.status(400).json({
        success: false,
        error: 'analysisData is required'
      });
    }

    // Generate unique render ID
    const renderId = 'local-' + Date.now();
    const outputPath = path.join(OUTPUT_DIR, `${renderId}.mp4`);
    
    // Store render status in memory
    activeRenders.set(renderId, {
      status: 'rendering',
      progress: 0,
      startTime: Date.now(),
      outputPath,
      leaderboardId, // Store for later use
      phoneNumber,   // Store for WhatsApp
    });
    
    // 🆕 PERSIST render status to database (survives server restarts)
    try {
      const playerName = analysisData?.playerName || 'Player';
      await supabase
        .from('video_render_jobs')
        .insert({
          render_id: renderId,
          bowling_attempt_id: leaderboardId || null,
          render_status: 'rendering',
          render_progress: 0,
          render_type: 'local',
          user_phone: phoneNumber || null,
          user_name: playerName
        });
      console.log(`✅ [Render Server] Render job persisted to database: ${renderId}`);
    } catch (dbError) {
      console.error('⚠️ [Render Server] Failed to persist render job to database:', dbError);
      // Continue anyway - in-memory tracking still works
    }
    
    // Return immediately with renderId
    res.json({
      success: true,
      renderId,
      message: 'Render queued, poll /status endpoint for progress',
      queuePosition: renderQueue.length + 1,
      currentlyRendering: currentlyRenderingCount
    });
    
    // 🆕 Add to render queue instead of starting immediately
    queueRender(renderId, async () => {
      try {
        await renderInBackground(renderId, analysisData, userVideoUrl, thumbnailDataUrl, outputPath, leaderboardId, phoneNumber);
      } catch (err) {
        console.error('[Render Server] Background render failed:', err);
        activeRenders.set(renderId, {
          status: 'failed',
          error: err.message,
          progress: 0,
        });
        
        // UPDATE database with failure status
        try {
          await supabase
            .from('video_render_jobs')
            .update({
              render_status: 'failed',
              error_message: err.message,
              render_completed_at: new Date().toISOString()
            })
            .eq('render_id', renderId);
          console.log(`✅ [Render Server] Database updated with failure status for ${renderId}`);
        } catch (dbError) {
          console.error('⚠️ [Render Server] Failed to update database with failure:', dbError);
        }
        throw err; // Re-throw so queue handler knows it failed
      }
    });
    
  } catch (error) {
    console.error('❌ [Render Server] Render failed:', error);
    console.error('❌ [Render Server] Error stack:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack,
    });
  }
});

// Background rendering function
async function renderInBackground(renderId, analysisData, userVideoUrl, thumbnailDataUrl, outputPath, leaderboardId, phoneNumber) {
  try {

    console.log('🚀 [Render Server] Starting render process...');
    
    // STEP 1: PRE-DOWNLOAD VIDEOS TO LOCAL DISK
    // This is CRITICAL for speed - loading videos from Supabase during render causes timeouts!
    let localUserVideoPath = userVideoUrl;
    
    if (userVideoUrl && userVideoUrl.startsWith('http')) {
      console.log('📥 [Render Server] Pre-downloading user video from Supabase...');
      console.log('📥 [Render Server] URL:', userVideoUrl.substring(0, 100));
      const tempVideoPath = path.join(TEMP_DIR, `${renderId}-user-video.mov`);
      
      try {
        await downloadVideo(userVideoUrl, tempVideoPath);
        // Use local file path instead of Supabase URL
        localUserVideoPath = tempVideoPath;
        console.log('✅ [Render Server] User video cached locally!');
      } catch (err) {
        console.warn('⚠️ [Render Server] Failed to download user video, will use Supabase URL:', err.message);
        localUserVideoPath = userVideoUrl; // Fallback to Supabase URL
      }
    }
    
    console.log('📦 [Render Server] Bundling Remotion project...');
    
    // Bundle the Remotion project
    const bundleLocation = await bundle({
      entryPoint: path.join(__dirname, '../remotion/index.ts'),
      // webpackOverride: (config) => config, // Optional: customize webpack
    });

    console.log('✅ [Render Server] Bundle created at:', bundleLocation);
    console.log('🎥 [Render Server] Selecting composition...');

    // Get composition
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'first-frame',
      inputProps: {
        analysisData,
        userVideoUrl: localUserVideoPath, // Use local path instead of Supabase URL!
        thumbnailDataUrl,
      },
    });

    console.log('✅ [Render Server] Composition selected:', composition.id);
    console.log('📐 [Render Server] Composition settings:',{
      width: composition.width,
      height: composition.height,
      fps: composition.fps,
      durationInFrames: composition.durationInFrames,
    });

    console.log('🎬 [Render Server] Starting render...');
    console.log('📁 [Render Server] Output path:', outputPath);

    // Render the video
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: {
        analysisData,
        userVideoUrl: localUserVideoPath, // Use local path instead of Supabase URL!
        thumbnailDataUrl,
      },
      onProgress: ({progress, renderedFrames, encodedFrames}) => {
        // Calculate ACTUAL percentage based on rendered + encoded frames
        // Rendering is 70% of the work, encoding is 30%
        const renderProgress = (renderedFrames / composition.durationInFrames) * 0.7;
        const encodeProgress = (encodedFrames / composition.durationInFrames) * 0.3;
        const actualProgress = renderProgress + encodeProgress;
        const percentage = Math.round(actualProgress * 100);
        
        // Log every 10 frames and especially near the end
        if (renderedFrames % 10 === 0 || renderedFrames > composition.durationInFrames - 10) {
          console.log(`⏳ [Render Server] Progress: ${percentage}% (rendered: ${renderedFrames}/${composition.durationInFrames}, encoded: ${encodedFrames}/${composition.durationInFrames})`);
        }
        
        // Special logging for frames 280-288 (the problematic area!)
        if (renderedFrames >= 280) {
          console.log(`🔍 [Render Server] NEAR END: Rendered ${renderedFrames}/${composition.durationInFrames}, Encoded ${encodedFrames}/${composition.durationInFrames} = ${percentage}%`);
        }
        
        // Update render status
        const renderStatus = activeRenders.get(renderId);
        if (renderStatus) {
          renderStatus.progress = actualProgress;
          renderStatus.percentage = percentage;
          renderStatus.renderedFrames = renderedFrames;
          renderStatus.encodedFrames = encodedFrames;
          renderStatus.totalFrames = composition.durationInFrames;
        }
      },
      // Timeout - needs to be VERY high for video loading
      timeoutInMilliseconds: 300000, // 5 minutes per frame (videos can take time to load!)
      // Chromium options (no GL issues locally!)
      chromiumOptions: {
        // Local rendering usually works fine without special GL settings
      },
      // Performance options
      concurrency: null, // Auto-detect CPU cores (local files are fast!)
      verbose: true,
    });

    console.log('✅ [Render Server] Render complete!');
    console.log('📹 [Render Server] Video saved to:', outputPath);

    // 🆕 UPLOAD TO SUPABASE (instead of S3)
    let supabaseUrl;
    try {
      const playerName = analysisData?.playerName || 'Anonymous';
      console.log(`📤 [Render Server] Uploading video to Supabase for player: ${playerName}`);
      
      supabaseUrl = await uploadToSupabase(outputPath, playerName, renderId);
      
      console.log(`✅ [Render Server] Video uploaded to Supabase: ${supabaseUrl}`);
      
      // Delete local rendered file after successful upload
      try {
        fs.unlinkSync(outputPath);
        console.log('🗑️ [Render Server] Deleted local rendered video after Supabase upload');
      } catch (err) {
        console.warn('⚠️ [Render Server] Failed to delete local rendered video:', err.message);
      }
    } catch (err) {
      console.error('❌ [Render Server] Supabase upload failed, keeping local file:', err.message);
      // If Supabase upload fails, fall back to local URL
      supabaseUrl = `/renders/${renderId}.mp4`;
    }

    // 🆕 UPDATE DATABASE WITH VIDEO URL
    if (supabaseUrl && supabaseUrl.startsWith('https://') && leaderboardId) {
      // 🔧 CRITICAL VALIDATION: Check URL before database save
      console.log(`🔍 [DB Update] ========== PRE-DATABASE SAVE VALIDATION ==========`);
      console.log(`🔍 [DB Update] URL to save:`, supabaseUrl);
      console.log(`🔍 [DB Update] URL length:`, supabaseUrl.length);
      console.log(`🔍 [DB Update] URL starts with https://:`, supabaseUrl.startsWith('https://'));
      console.log(`🔍 [DB Update] URL contains bowllikebumrah.com:`, supabaseUrl.includes('bowllikebumrah.com'));
      console.log(`🔍 [DB Update] URL contains supabase.co:`, supabaseUrl.includes('supabase.co'));
      
      // CRITICAL: Reject if URL looks malformed
      if (supabaseUrl.includes('bowllikebumrah.com')) {
        console.error(`❌ [DB Update] CRITICAL ERROR: URL contains bowllikebumrah.com!`);
        console.error(`❌ [DB Update] This indicates URL corruption. NOT saving to database.`);
        console.error(`❌ [DB Update] Corrupted URL:`, supabaseUrl);
      } else {
        // 🔧 DOUBLE-CHECK: Normalize URL before saving to database
        const finalNormalizedUrl = normalizeVideoUrl(supabaseUrl) || supabaseUrl;
        
        console.log(`✅ [DB Update] URL validated, proceeding with database save`);
        console.log(`✅ [DB Update] Final URL:`, finalNormalizedUrl);
        console.log(`🔍 [DB Update] ===================================================`);
        
        await updateBowlingAttemptsVideoUrl(leaderboardId, finalNormalizedUrl);
      }
    }

    // 🆕 SEND WHATSAPP MESSAGE
    if (supabaseUrl && supabaseUrl.startsWith('https://') && phoneNumber && leaderboardId) {
      const playerName = analysisData?.playerName || 'Player';
      const formattedPhone = phoneNumber.startsWith('91') ? phoneNumber : `91${phoneNumber}`;
      
      // 🔗 SHORTEN SUPABASE URL using URL shortening service
      console.log(`🔗 [WhatsApp] Shortening URL...`);
      const shortenedUrl = await shortenUrlForWhatsApp(supabaseUrl);
      
      console.log(`🔗 [WhatsApp] Original URL: ${supabaseUrl.substring(0, 80)}...`);
      console.log(`🔗 [WhatsApp] Shortened URL: ${shortenedUrl}`);
      
      // Send WhatsApp with the shortened URL
      const whatsappSent = await sendWhatsAppMessage(formattedPhone, playerName, shortenedUrl);
      
      // Update whatsapp_sent flag
      if (whatsappSent) {
        await updateWhatsAppSentFlag(leaderboardId, true);
      }
    }

    // Clean up temporary video files
    if (localUserVideoPath && localUserVideoPath.includes('temp-videos')) {
      try {
        fs.unlinkSync(localUserVideoPath);
        console.log('🗑️ [Render Server] Cleaned up temp video file');
      } catch (err) {
        console.warn('⚠️ [Render Server] Failed to delete temp file:', err.message);
      }
    }

    // Mark render as complete with Supabase URL
    console.log(`🎯 [Render Server] Setting render status with video URL: ${supabaseUrl}`);
    console.log(`🎯 [Render Server] URL validation - starts with https://: ${supabaseUrl.startsWith('https://')}`);
    
    activeRenders.set(renderId, {
      status: 'done',
      progress: 1,
      percentage: 100,
      videoUrl: supabaseUrl,
      supabaseUrl: supabaseUrl.startsWith('https://') ? supabaseUrl : null,
      localPath: supabaseUrl.startsWith('/') ? outputPath : null,
      completedAt: Date.now(),
    });
    
    console.log(`✅ [Render Server] Render status updated for ${renderId}`);
    
    // 🆕 UPDATE database with completion status
    try {
      await supabase
        .from('video_render_jobs')
        .update({
          render_status: 'completed',
          render_progress: 100,
          video_url: supabaseUrl.startsWith('https://') ? supabaseUrl : null,
          render_completed_at: new Date().toISOString()
        })
        .eq('render_id', renderId);
      console.log(`✅ [Render Server] Database updated with completion status for ${renderId}`);
    } catch (dbError) {
      console.error('⚠️ [Render Server] Failed to update database with completion:', dbError);
      // Continue anyway - in-memory status is updated
    }

  } catch (error) {
    console.error('❌ [Render Server] Background render failed:', error);
    console.error('❌ [Render Server] Error stack:', error.stack);
    throw error; // Will be caught by renderInBackground catch
  }
}

// Status check endpoint
app.get('/status/:renderId', async (req, res) => {
  const {renderId} = req.params;
  let renderStatus = activeRenders.get(renderId);
  
  // 🆕 If not in memory, check database (handles server restarts)
  if (!renderStatus) {
    console.log(`⚠️ [Render Server] Render ${renderId} not in memory, checking database...`);
    
    try {
      const { data, error } = await supabase
        .from('video_render_jobs')
        .select('*')
        .eq('render_id', renderId)
        .single();
      
      if (error || !data) {
        console.error(`❌ [Render Server] Render not found in database:`, error);
        return res.status(404).json({
          success: false,
          error: 'Render not found',
        });
      }
      
      console.log(`✅ [Render Server] Found render in database:`, data);
      
      // Convert database format to in-memory format
      renderStatus = {
        status: data.render_status,
        progress: (data.render_progress || 0) / 100,
        percentage: data.render_progress || 0,
        videoUrl: data.video_url,
        error: data.error_message,
      };
      
      // Restore to memory for faster future lookups
      activeRenders.set(renderId, renderStatus);
      
    } catch (dbError) {
      console.error(`❌ [Render Server] Database error:`, dbError);
      return res.status(404).json({
        success: false,
        error: 'Render not found',
      });
    }
  }
  
  const responseUrl = renderStatus.videoUrl;
  console.log(`📤 [Render Server] Sending status response for ${renderId}`);
  console.log(`📤 [Render Server] Status: ${renderStatus.status}`);
  console.log(`📤 [Render Server] Video URL being sent: ${responseUrl}`);
  console.log(`📤 [Render Server] URL type: ${typeof responseUrl}`);
  
  res.json({
    success: true,
    done: renderStatus.status === 'done' || renderStatus.status === 'completed',
    status: renderStatus.status,
    progress: renderStatus.progress || 0,
    percentage: renderStatus.percentage || 0,
    videoUrl: responseUrl,
    url: responseUrl, // Also send as 'url' for compatibility
    error: renderStatus.error,
    queuePosition: renderStatus.queuePosition || 0, // 🆕 Show queue position
    queuedCount: renderQueue.length, // 🆕 Total queued
    activeRenders: currentlyRenderingCount // 🆕 Currently rendering
  });
});

// 🆕 Queue status endpoint
app.get('/queue-status', (req, res) => {
  res.json({
    success: true,
    activeRenders: currentlyRenderingCount,
    maxConcurrent: MAX_CONCURRENT_RENDERS,
    queuedRenders: renderQueue.length,
    totalActiveAndQueued: currentlyRenderingCount + renderQueue.length,
    queue: renderQueue.map((item, index) => ({
      renderId: item.renderId,
      position: index + 1,
      queuedAt: item.queuedAt,
      waitingTime: Date.now() - item.queuedAt
    }))
  });
});

// Serve rendered videos
app.use('/renders', express.static(OUTPUT_DIR));

// Start server
app.listen(PORT, () => {
  console.log('🚀 Remotion Rendering Server started!');
  console.log(`📡 Server running at: http://localhost:${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`🎬 Render endpoint: http://localhost:${PORT}/render`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log('');
  console.log('✅ Ready to render videos!');
});

