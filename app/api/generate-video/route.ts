import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { mkdirSync, existsSync, writeFileSync } from 'fs';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { analysisData } = await request.json();

    if (!analysisData) {
      return NextResponse.json(
        { success: false, error: 'Analysis data is required' },
        { status: 400 }
      );
    }

    console.log('Starting video generation with data:', analysisData);

    // Ensure output directory exists
    const outputDir = path.join(process.cwd(), 'public', 'generated-videos');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `analysis-video-${timestamp}.mp4`);
    const publicUrl = `/generated-videos/analysis-video-${timestamp}.mp4`;

    // Prepare props for Remotion CLI
    const props = {
      analysisData: {
        intensity: analysisData.intensity || 86,
        speedClass: analysisData.speedClass || 'Zooooom',
        kmh: analysisData.kmh || 86,
        similarity: analysisData.similarity || 86,
        frameIntensities: analysisData.frameIntensities || [], // Include frame intensities
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
      }
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

    return NextResponse.json({
      success: true,
      videoUrl: publicUrl,
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
