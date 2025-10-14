require('dotenv').config();

const {renderMediaOnLambda, getRenderProgress} = require('@remotion/lambda/client');

(async () => {
  try {
    const region = process.env.REMOTION_AWS_REGION || process.env.AWS_REGION || 'ap-south-1';
    const functionName = process.env.REMOTION_FUNCTION_NAME;
    const serveUrl = process.env.REMOTION_SERVE_URL;
    const bucketName = process.env.REMOTION_SITE_BUCKET;

    if (!functionName) throw new Error('REMOTION_FUNCTION_NAME is not set');
    if (!serveUrl) throw new Error('REMOTION_SERVE_URL is not set');

    const inputProps = {
      analysisData: {
        intensity: 86,
        speedClass: 'Zooooom',
        kmh: 86,
        similarity: 90,
        phases: {runUp: 50, delivery: 60, followThrough: 71},
        technicalMetrics: {armSwing: 49, bodyMovement: 69, rhythm: 49, releasePoint: 69},
        recommendations: ['Focus on arm swing technique and timing'],
        playerName: 'CLI Test',
      },
    };

    console.log('[lambda-test] Starting render...');
    const {renderId} = await renderMediaOnLambda({
      functionName,
      region,
      serveUrl,
      composition: 'first-frame',
      inputProps,
      codec: 'h264',
      imageFormat: 'jpeg',
      outName: `test-render-${Date.now()}.mp4`,
      privacy: 'public',
    });

    console.log('[lambda-test] Render started:', renderId);
    console.log('[lambda-test] Polling for completion...');

    // Poll for completion
    let attempts = 0;
    while (attempts < 120) { // 4 minutes max
      await new Promise(r => setTimeout(r, 2000));
      
      const progress = await getRenderProgress({
        functionName,
        bucketName,
        region,
        renderId,
      });

      if (progress.done) {
        if (progress.type === 'success') {
          console.log('[lambda-test] Render complete!');
          console.log(JSON.stringify({success: true, url: progress.url, sizeInBytes: progress.sizeInBytes}));
          process.exit(0);
        } else {
          const error = progress.errors?.[0]?.message || 'Render failed';
          console.error('[lambda-test] Error:', error);
          console.log(JSON.stringify({success: false, error}));
          process.exit(1);
        }
      }

      const pct = progress.overallProgress ? Math.round(progress.overallProgress * 100) : 0;
      console.log(`[lambda-test] Progress: ${pct}%`);
      attempts++;
    }

    console.error('[lambda-test] Timeout waiting for render');
    process.exit(1);
  } catch (err) {
    console.error('[lambda-test] Error:', err);
    console.log(JSON.stringify({success: false, error: err.message}));
    process.exit(1);
  }
})();