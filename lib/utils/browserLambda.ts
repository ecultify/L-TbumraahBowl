// Browser-side Remotion rendering using PHP proxy on Hostinger
// The PHP proxy properly invokes Remotion Lambda with AWS SDK
'use client';

// PHP Proxy endpoint (works on Hostinger static hosting!)
const PHP_PROXY_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? '/api/remotion-render.php' // Production (Hostinger)
  : 'http://localhost:3000/api/remotion-render.php'; // Dev (falls back to direct Lambda if needed)

const REMOTION_BUCKET = 'remotionlambda-apsouth1-fp5224pnxc';
const AWS_REGION = 'ap-south-1';

export type RenderVideoParams = {
  analysisData: any;
  userVideoUrl?: string;
  thumbnailDataUrl?: string;
};

export async function startRemotionRender(params: RenderVideoParams): Promise<{
  success: boolean;
  renderId?: string;
  bucketName?: string;
  error?: string;
}> {
  try {
    console.log('[BrowserLambda] 🚀 Starting Remotion render via PHP proxy...');
    console.log('[BrowserLambda] PHP Proxy URL:', PHP_PROXY_URL);
    console.log('[BrowserLambda] Analysis data:', params.analysisData);
    console.log('[BrowserLambda] User video URL:', params.userVideoUrl?.substring(0, 80));
    console.log('[BrowserLambda] Thumbnail URL:', params.thumbnailDataUrl?.substring(0, 80));
    
    // Prepare payload for PHP proxy
    const payload = {
      action: 'start',
      analysisData: params.analysisData,
      userVideoUrl: params.userVideoUrl,
      thumbnailDataUrl: params.thumbnailDataUrl,
    };
    
    const payloadSize = JSON.stringify(payload).length;
    console.log('[BrowserLambda] 📊 Payload size:', payloadSize, 'bytes (~' + Math.round(payloadSize / 1024) + ' KB)');
    
    // Call PHP proxy
    const response = await fetch(PHP_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log('[BrowserLambda] PHP proxy response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[BrowserLambda] PHP proxy error:', errorText);
      throw new Error(`PHP proxy returned ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('[BrowserLambda] ✅ PHP proxy response:', result);
    
    if (!result.success) {
      throw new Error(result.error || 'PHP proxy returned success=false');
    }
    
    const renderId = result.renderId;
    
    if (!renderId) {
      console.error('[BrowserLambda] No renderId in response:', result);
      throw new Error('No renderId returned from PHP proxy');
    }
    
    console.log('[BrowserLambda] ✅ Got renderId:', renderId);
    
    return {
      success: true,
      renderId: renderId,
      bucketName: result.bucketName || REMOTION_BUCKET,
    };
    
  } catch (error: any) {
    console.error('[BrowserLambda] ❌ Error calling PHP proxy:', error);
    return {
      success: false,
      error: error.message || 'Failed to start render',
    };
  }
}

// Check render status via PHP proxy
export async function checkRenderStatus(renderId: string): Promise<{
  done: boolean;
  progress?: number;
  url?: string;
  error?: string;
  overallProgress?: number;
  currentStep?: string;
}> {
  try {
    console.log('[BrowserLambda] Checking render status for:', renderId);
    
    // Call PHP proxy to check status
    const response = await fetch(PHP_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'status',
        renderId: renderId,
      }),
    });
    
    if (!response.ok) {
      console.error('[BrowserLambda] PHP proxy status check failed:', response.status);
      // Fallback: try direct S3 check
      const s3Url = `https://${REMOTION_BUCKET}.s3.${AWS_REGION}.amazonaws.com/renders/${renderId}/out.mp4`;
      const s3Response = await fetch(s3Url, { method: 'HEAD' });
      
      if (s3Response.ok) {
        return {
          done: true,
          progress: 1,
          url: s3Url,
          overallProgress: 100,
          currentStep: 'Complete',
        };
      }
      
      return {
        done: false,
        progress: 0.5,
        overallProgress: 50,
        currentStep: 'Rendering...',
      };
    }
    
    const result = await response.json();
    console.log('[BrowserLambda] Status check result:', result);
    
    return result;
    
  } catch (error: any) {
    console.error('[BrowserLambda] Error checking status:', error);
    return {
      done: false,
      error: error.message,
      progress: 0,
      overallProgress: 0,
      currentStep: 'Error',
    };
  }
}

