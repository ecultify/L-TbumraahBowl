#!/usr/bin/env node

/**
 * Watch Remotion Lambda Render Progress (Auto-refresh)
 * Usage: node scripts/watch-render.js [renderId]
 * Press Ctrl+C to stop
 */

// Load environment variables from .env file
require('dotenv').config();

const { getRenderProgress } = require('@remotion/lambda/client');

// Your render details
const RENDER_ID = process.argv[2] || 'zprenwuqh1';
const BUCKET_NAME = 'remotionlambda-apsouth1-fp5224pnxc';
const FUNCTION_NAME = 'remotion-render-4-0-353-mem3008mb-disk2048mb-600sec';
const REGION = 'ap-south-1';
const REFRESH_INTERVAL = 3000; // 3 seconds

let checkCount = 0;

async function checkProgress() {
  try {
    checkCount++;
    
    // Clear screen (Windows compatible)
    console.clear();
    
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║         🎬 REMOTION LAMBDA RENDER PROGRESS MONITOR          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log(`📍 Render ID: ${RENDER_ID}`);
    console.log(`🔄 Check #${checkCount} - Refreshing every ${REFRESH_INTERVAL/1000}s`);
    console.log(`⏱️  Current time: ${new Date().toLocaleTimeString()}\n`);
    console.log('─────────────────────────────────────────────────────────────────\n');

    const progress = await getRenderProgress({
      renderId: RENDER_ID,
      bucketName: BUCKET_NAME,
      functionName: FUNCTION_NAME,
      region: REGION,
    });

    // Display status
    if (progress.done) {
      console.log('✅ STATUS: COMPLETE!\n');
      console.log('📊 RESULTS:');
      console.log(`   🎥 Video URL:`);
      console.log(`      ${progress.outputFile || 'N/A'}\n`);
      console.log(`   📦 File Size: ${progress.outputSizeInBytes ? `${(progress.outputSizeInBytes / 1024 / 1024).toFixed(2)} MB` : 'N/A'}`);
      console.log(`   ⏱️  Render Time: ${progress.timeToFinish ? `${Math.round(progress.timeToFinish / 1000)}s` : 'N/A'}`);
      console.log(`   💰 Estimated Cost: $${progress.costs?.estimatedCost?.toFixed(4) || '0.00'}`);
      
      console.log('\n─────────────────────────────────────────────────────────────────');
      console.log('🎉 Render complete! Stopping monitor...\n');
      process.exit(0);
    } else if (progress.fatalErrorEncountered) {
      console.log('❌ STATUS: FAILED\n');
      console.log('🚨 ERRORS:');
      progress.errors?.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.message}`);
        if (err.stack) console.log(`      ${err.stack.split('\n')[0]}`);
      });
      console.log('\n─────────────────────────────────────────────────────────────────');
      console.log('⚠️  Render failed! Stopping monitor...\n');
      process.exit(1);
    } else {
      console.log('🔄 STATUS: RENDERING...\n');
      
      const overallPercent = Math.round((progress.overallProgress || 0) * 100);
      const progressBar = createProgressBar(overallPercent);
      
      console.log('📊 OVERALL PROGRESS:');
      console.log(`   ${progressBar} ${overallPercent}%\n`);
      
      console.log('📈 DETAILS:');
      console.log(`   🎞️  Rendered Frames: ${progress.renderedFrameCount || 0}`);
      console.log(`   🔧 Encoded Frames: ${progress.encodedFrameCount || 0}`);
      console.log(`   📦 Chunks: ${progress.chunks?.length || 0} total`);
      
      if (progress.chunks && progress.chunks.length > 0) {
        const doneChunks = progress.chunks.filter(c => c.status === 'done').length;
        const chunkPercent = Math.round((doneChunks / progress.chunks.length) * 100);
        console.log(`   ✓  Chunks Done: ${doneChunks}/${progress.chunks.length} (${chunkPercent}%)`);
      }
      
      const elapsed = progress.renderMetadata?.startedDate 
        ? Math.round((Date.now() - progress.renderMetadata.startedDate) / 1000)
        : 0;
      console.log(`   ⏱️  Time Elapsed: ${formatTime(elapsed)}`);
      
      // Estimate remaining time
      if (overallPercent > 0 && elapsed > 0) {
        const estimatedTotal = elapsed / (overallPercent / 100);
        const remaining = Math.max(0, estimatedTotal - elapsed);
        console.log(`   ⏳ Est. Remaining: ${formatTime(Math.round(remaining))}`);
      }
      
      console.log('\n─────────────────────────────────────────────────────────────────');
      console.log(`⏳ Waiting ${REFRESH_INTERVAL/1000}s before next check... (Press Ctrl+C to stop)`);
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('⚠️  Will retry in 3 seconds...');
  }
}

function createProgressBar(percent, width = 40) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

// Initial check
console.log('Starting render progress monitor...\n');
checkProgress();

// Set up interval for continuous checking
const interval = setInterval(checkProgress, REFRESH_INTERVAL);

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('\n\n👋 Monitor stopped by user. Goodbye!\n');
  process.exit(0);
});

