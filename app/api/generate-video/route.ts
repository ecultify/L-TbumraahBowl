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
    
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    });

    // Clean up temporary props file
    try {
      require('fs').unlinkSync(propsPath);
    } catch (e) {
      console.warn('Could not delete temp props file:', e);
    }

    if (stderr && !stderr.includes('Warning')) {
      console.error('Remotion CLI stderr:', stderr);
    }

    console.log('Remotion CLI stdout:', stdout);
    console.log('Video rendered successfully:', publicUrl);

    return NextResponse.json({
      success: true,
      videoUrl: publicUrl,
      message: 'Video generated successfully'
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
