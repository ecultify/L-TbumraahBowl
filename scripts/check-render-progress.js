#!/usr/bin/env node

/**
 * Check Remotion Lambda Render Progress
 * Usage: node scripts/check-render-progress.js [renderId]
 */

// Load environment variables from .env file
require('dotenv').config();

const { getRenderProgress } = require('@remotion/lambda/client');

// Your render details
const RENDER_ID = process.argv[2] || 'zprenwuqh1';
const BUCKET_NAME = 'remotionlambda-apsouth1-fp5224pnxc';
const FUNCTION_NAME = 'remotion-render-4-0-353-mem3008mb-disk2048mb-600sec';
const REGION = 'ap-south-1';

async function checkProgress() {
  try {
    console.log('\n🔍 Checking render progress...');
    console.log(`Render ID: ${RENDER_ID}\n`);

    const progress = await getRenderProgress({
      renderId: RENDER_ID,
      bucketName: BUCKET_NAME,
      functionName: FUNCTION_NAME,
      region: REGION,
    });

    // Display status
    if (progress.done) {
      console.log('✅ Status: COMPLETE!\n');
      console.log('📊 Results:');
      console.log(`   Video URL: ${progress.outputFile || 'N/A'}`);
      console.log(`   File Size: ${progress.outputSizeInBytes ? `${(progress.outputSizeInBytes / 1024 / 1024).toFixed(2)} MB` : 'N/A'}`);
      console.log(`   Render Time: ${progress.timeToFinish ? `${Math.round(progress.timeToFinish / 1000)}s` : 'N/A'}`);
      
      if (progress.costs) {
        console.log(`   Estimated Cost: $${progress.costs.estimatedCost?.toFixed(4) || '0.00'}`);
      }
    } else if (progress.fatalErrorEncountered) {
      console.log('❌ Status: FAILED\n');
      console.log('Errors:');
      progress.errors?.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.message}`);
        if (err.stack) console.log(`      ${err.stack.split('\n')[0]}`);
      });
    } else {
      console.log('🔄 Status: RENDERING...\n');
      console.log('📊 Progress:');
      console.log(`   Overall: ${progress.overallProgress ? `${Math.round(progress.overallProgress * 100)}%` : '0%'}`);
      console.log(`   Chunks: ${progress.chunks?.length || 0} total`);
      console.log(`   Rendered: ${progress.renderedFrameCount || 0} frames`);
      console.log(`   Encoded: ${progress.encodedFrameCount || 0} frames`);
      
      const elapsed = progress.renderMetadata?.startedDate 
        ? Math.round((Date.now() - progress.renderMetadata.startedDate) / 1000)
        : 0;
      console.log(`   Elapsed: ${elapsed}s`);

      // Show chunk progress
      if (progress.chunks && progress.chunks.length > 0) {
        const doneChunks = progress.chunks.filter(c => c.status === 'done').length;
        console.log(`   Chunks Done: ${doneChunks}/${progress.chunks.length}`);
      }
    }

    console.log('\n');
    process.exit(progress.done ? 0 : 1);
  } catch (error) {
    console.error('❌ Error checking progress:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

checkProgress();

