require('dotenv').config();
const {getRenderProgress} = require('@remotion/lambda/client');

const renderId = process.argv[2] || '1luqirfxtc';

(async () => {
  const progress = await getRenderProgress({
    functionName: process.env.REMOTION_FUNCTION_NAME,
    bucketName: process.env.REMOTION_SITE_BUCKET,
    region: process.env.AWS_REGION,
    renderId,
  });

  if (progress.done) {
    if (progress.type === 'success') {
      console.log('✅ RENDER COMPLETE!');
      console.log('Video URL:', progress.url);
      console.log('Size:', progress.sizeInBytes, 'bytes');
    } else {
      console.log('❌ RENDER FAILED');
      console.log('Error:', progress.errors?.[0]?.message || 'Unknown error');
    }
  } else {
    const pct = progress.overallProgress ? Math.round(progress.overallProgress * 100) : 0;
    console.log(`⏳ Rendering... ${pct}% complete`);
  }
})();