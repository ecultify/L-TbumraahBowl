import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const execAsync = promisify(exec);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqzukyxnnjnstrecybzx.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxenVreXhubmpuc3RyZWN5Ynp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTM4OTIsImV4cCI6MjA3MzA2OTg5Mn0.-FaJuxBuwxk5L-WCYKv--Vmq0g_aPBjGOTBKgwTrcOI';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysisData, thumbnailDataUrl, userVideoPublicPath, uploadedVideoData } = body || {};

    if (!analysisData) {
      return NextResponse.json(
        { success: false, error: 'Analysis data is required' },
        { status: 400 }
      );
    }

    console.log('Starting video generation with data:', analysisData);

    // Server-side gating: Only allow rendering if similarity > 85
    const similarity = Number(analysisData?.similarity ?? NaN);
    if (!Number.isFinite(similarity) || similarity <= 85) {
      return NextResponse.json(
        { success: false, error: 'Rendering is available only for scores above 85%.' },
        { status: 403 }
      );
    }

    // Ensure output directory exists
    const outputDir = path.join(process.cwd(), 'public', 'generated-videos');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `analysis-video-${timestamp}.mp4`);
    const publicUrl = `/generated-videos/analysis-video-${timestamp}.mp4`;

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }

    // Resolve user video path
    let userVideoRelPath: string | null = null; // path relative to public/, e.g. 'uploads/abc.mp4' OR Supabase URL
    if (typeof userVideoPublicPath === 'string' && userVideoPublicPath.trim()) {
      // Check if it's a Supabase URL
      if (userVideoPublicPath.startsWith('http://') || userVideoPublicPath.startsWith('https://')) {
        // It's a remote URL (Supabase) - pass it directly to Remotion
        userVideoRelPath = userVideoPublicPath;
        console.log('✅ Using Supabase video URL:', userVideoPublicPath.substring(0, 80) + '...');
      } else {
        // It's a local path - check if file exists
        const cleaned = userVideoPublicPath.replace(/^\/?public\//, '').replace(/^\//, '');
        const fullCheck = path.join(process.cwd(), 'public', cleaned);
        if (existsSync(fullCheck)) {
          userVideoRelPath = cleaned;
          console.log('✅ Using local video path:', cleaned);
        } else {
          console.warn('⚠️ Local video path does not exist on disk:', fullCheck);
        }
      }
    }

    // If not provided, try to decode uploadedVideoData (data URL)
    if (!userVideoRelPath && typeof uploadedVideoData === 'string' && uploadedVideoData.startsWith('data:')) {
      try {
        const match = uploadedVideoData.match(/^data:(.+?);base64,(.*)$/);
        if (!match) {
          throw new Error('Invalid uploadedVideoData format');
        }
        const mime = match[1] || 'video/mp4';
        const base64 = match[2];
        const buffer = Buffer.from(base64, 'base64');
        const ext = mime.includes('quicktime') ? 'mov' : (mime.split('/')[1] || 'mp4');
        const userVideoFilename = `user-upload-${timestamp}.${ext}`;
        const userVideoFullPath = path.join(uploadsDir, userVideoFilename);
        writeFileSync(userVideoFullPath, buffer);
        userVideoRelPath = path.join('uploads', userVideoFilename).replace(/\\/g, '/');
        console.log('Saved uploaded user video to:', userVideoRelPath);
      } catch (e) {
        console.error('Failed to save uploadedVideoData:', e);
      }
    }

    // Generate default frameIntensities if not provided
    let frameIntensities = analysisData.frameIntensities || [];
    
    if (!frameIntensities || frameIntensities.length === 0) {
      console.warn('⚠️ No frameIntensities provided, generating default motion data...');
      // Generate realistic bowling motion data based on analysis
      const duration = 3.5; // Total bowling action duration
      const frameCount = 35; // Number of data points
      const finalIntensity = analysisData.similarity || analysisData.intensity || 86;
      
      for (let i = 0; i < frameCount; i++) {
        const timestamp = (i / (frameCount - 1)) * duration;
        const progress = i / (frameCount - 1);
        
        // Simulate bowling motion phases with realistic curve
        let intensity;
        if (progress < 0.3) {
          // Run-up phase: gradual increase
          intensity = finalIntensity * 0.2 + (finalIntensity * 0.3 * (progress / 0.3));
        } else if (progress < 0.6) {
          // Delivery phase: rapid increase
          const deliveryProgress = (progress - 0.3) / 0.3;
          intensity = finalIntensity * 0.5 + (finalIntensity * 0.5 * deliveryProgress);
        } else {
          // Follow-through: maintain high intensity
          intensity = finalIntensity * (0.95 + 0.05 * Math.random());
        }
        
        frameIntensities.push({
          timestamp: Number(timestamp.toFixed(3)),
          intensity: Number(intensity.toFixed(3))
        });
      }
      console.log('✅ Generated', frameIntensities.length, 'default frame intensities');
    }
    
    // Prepare props for Remotion CLI
    const props = {
      analysisData: {
        intensity: analysisData.intensity || 86,
        speedClass: analysisData.speedClass || 'Zooooom',
        kmh: analysisData.kmh || 86,
        similarity: analysisData.similarity || 86,
        frameIntensities: frameIntensities, // Include frame intensities (generated or provided)
        phases: {
          runUp: analysisData.phases?.runUp || 50,
          delivery: analysisData.phases?.delivery || 60,
          followThrough: analysisData.phases?.followThrough || 71
        },
        technicalMetrics: {
          armSwing: analysisData.technicalMetrics?.armSwing || 49,
          bodyMovement: analysisData.technicalMetrics?.bodyMovement || 69,
          rhythm: analysisData.technicalMetrics?.rhythm || 49,
          releasePoint: analysisData.technicalMetrics?.releasePoint || 69
        },
        recommendations: analysisData.recommendations || ['Focus on arm swing technique and timing'],
        playerName: analysisData.playerName || 'Player'
      },
      // Additional props for Remotion
      userVideoSrc: userVideoRelPath || undefined,
      thumbnailDataUrl: typeof thumbnailDataUrl === 'string' && thumbnailDataUrl.startsWith('data:')
        ? thumbnailDataUrl
        : undefined,
    };

    // Write props to temporary file
    const propsPath = path.join(process.cwd(), `temp-props-${timestamp}.json`);
    writeFileSync(propsPath, JSON.stringify(props));

    console.log('Rendering video with Remotion CLI...');

    const remotionBin = process.platform === 'win32'
      ? path.join(process.cwd(), 'node_modules', '.bin', 'remotion.cmd')
      : path.join(process.cwd(), 'node_modules', '.bin', 'remotion');

    if (!existsSync(remotionBin)) {
      throw new Error('Remotion CLI not found. Please run `npm install` to install dependencies.');
    }

    const command = `"${remotionBin}" render remotion/index.ts first-frame "${outputPath}" --props="${propsPath}"`;
    
    console.log('Executing Remotion command:', command);
    
    let stdout, stderr;
    try {
      const result = await execAsync(command, {
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 120000, // 2 minute timeout
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execError: any) {
      console.error('Remotion CLI execution failed:', execError);
      
      // Clean up temporary props file
      try {
        require('fs').unlinkSync(propsPath);
      } catch (e) {
        console.warn('Could not delete temp props file:', e);
      }
      
      // Provide detailed error information
      const errorDetails = {
        message: execError.message || 'Unknown error',
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
        code: execError.code
      };
      
      console.error('Remotion error details:', errorDetails);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Remotion render failed: ${execError.message || 'Unknown error'}`,
          details: errorDetails
        },
        { status: 500 }
      );
    }

    // Clean up temporary props file
    try {
      require('fs').unlinkSync(propsPath);
    } catch (e) {
      console.warn('Could not delete temp props file:', e);
    }

    // Log all output for debugging
    if (stderr) {
      console.log('Remotion CLI stderr:', stderr);
    }
    console.log('Remotion CLI stdout:', stdout);

    // Verify the output file was actually created
    if (!existsSync(outputPath)) {
      console.error('Output video file was not created at:', outputPath);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Video file was not created. Remotion render may have failed silently.',
          stdout: stdout,
          stderr: stderr
        },
        { status: 500 }
      );
    }

    // Verify the file has content (not empty)
    const fs = require('fs');
    const stats = fs.statSync(outputPath);
    if (stats.size === 0) {
      console.error('Output video file is empty:', outputPath);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Generated video file is empty',
          stdout: stdout,
          stderr: stderr
        },
        { status: 500 }
      );
    }

    console.log('✅ Video rendered successfully:', publicUrl, `(${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

    // Upload generated video to Supabase Storage
    let supabaseVideoUrl = publicUrl; // Fallback to local URL
    try {
      console.log('📤 Uploading generated video to Supabase...');
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      const videoBuffer = readFileSync(outputPath);
      const supabaseFilename = `generated-videos/analysis-video-${timestamp}.mp4`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-videos')
        .upload(supabaseFilename, videoBuffer, {
          contentType: 'video/mp4',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.warn('⚠️ Supabase upload failed, using local URL:', uploadError.message);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('user-videos')
          .getPublicUrl(supabaseFilename);
        
        supabaseVideoUrl = publicUrlData.publicUrl;
        console.log('✅ Video uploaded to Supabase:', supabaseVideoUrl);
      }
    } catch (supabaseError) {
      console.warn('⚠️ Supabase upload error, using local URL:', supabaseError);
    }

    return NextResponse.json({
      success: true,
      videoUrl: supabaseVideoUrl, // Use Supabase URL if available
      localUrl: publicUrl, // Keep local URL as backup
      message: 'Video generated successfully',
      fileSize: stats.size
    });

  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Video generation failed' 
      },
      { status: 500 }
    );
  }
}
