// Local Remotion rendering (for localhost development and VPS)
'use client';

const LOCAL_RENDER_SERVER = process.env.NEXT_PUBLIC_LOCAL_RENDER_SERVER || 'http://localhost:3001';

// Get both HTTPS and HTTP versions for fallback
function getRenderServerUrls(): string[] {
  const baseUrl = LOCAL_RENDER_SERVER;
  if (baseUrl.startsWith('https://')) {
    const httpUrl = baseUrl.replace('https://', 'http://');
    return [baseUrl, httpUrl]; // Try HTTPS first, then HTTP
  }
  return [baseUrl]; // Already HTTP or localhost
}

export type RenderVideoParams = {
  analysisData: any;
  userVideoUrl?: string;
  thumbnailDataUrl?: string;
};

export async function startLocalRender(params: RenderVideoParams): Promise<{
  success: boolean;
  renderId?: string;
  videoUrl?: string;
  error?: string;
}> {
  const urls = getRenderServerUrls();
  
  for (const serverUrl of urls) {
    try {
      console.log('[LocalRender] 🚀 Trying render server at:', serverUrl);
      console.log('[LocalRender] Analysis data:', params.analysisData);
      
      // Get leaderboardId and phoneNumber from sessionStorage
      const leaderboardId = typeof window !== 'undefined' 
        ? window.sessionStorage.getItem('leaderboardEntryId') 
        : null;
      const phoneNumber = typeof window !== 'undefined'
        ? window.sessionStorage.getItem('playerPhone')
        : null;
      
      console.log('[LocalRender] Leaderboard ID:', leaderboardId);
      console.log('[LocalRender] Phone:', phoneNumber);
      
      const response = await fetch(`${serverUrl}/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          leaderboardId: leaderboardId, // Pass to server
          phoneNumber: phoneNumber,      // Pass to server
        }),
      });
      
      console.log('[LocalRender] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LocalRender] Server error:', errorText);
        throw new Error(`Render server returned ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('[LocalRender] ✅ Render started at:', serverUrl);
      
      if (!result.success || !result.renderId) {
        throw new Error(result.error || 'No renderId returned');
      }
      
      // Store the working URL for status checks
      (window as any).__RENDER_SERVER_URL__ = serverUrl;
      
      // Return renderId immediately (render happens in background)
      return {
        success: true,
        renderId: result.renderId,
      };
      
    } catch (error: any) {
      console.warn(`[LocalRender] ⚠️ Failed with ${serverUrl}:`, error.message);
      // Continue to next URL
    }
  }
  
  // All URLs failed
  console.error('[LocalRender] ❌ All render server URLs failed');
  return {
    success: false,
    error: 'Failed to connect to render server (tried HTTPS and HTTP)',
  };
}

// Check render status (uses the working URL from startLocalRender, or tries all)
export async function checkLocalRenderStatus(renderId: string): Promise<{
  done: boolean;
  progress?: number;
  percentage?: number;
  videoUrl?: string;
  error?: string;
}> {
  // Try the working URL first (stored during startLocalRender)
  const workingUrl = (window as any).__RENDER_SERVER_URL__;
  const urls = workingUrl ? [workingUrl] : getRenderServerUrls();
  
  for (const serverUrl of urls) {
    try {
      const response = await fetch(`${serverUrl}/status/${renderId}`);
      
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Status check failed');
      }
      
      return {
        done: result.done,
        progress: result.progress,
        percentage: result.percentage,
        videoUrl: result.videoUrl ? `${serverUrl}${result.videoUrl}` : undefined,
        error: result.error,
      };
      
    } catch (error: any) {
      console.warn(`[LocalRender] Status check failed at ${serverUrl}:`, error.message);
      // Continue to next URL
    }
  }
  
  // All URLs failed
  return {
    done: false,
    error: 'Failed to check render status (tried all URLs)',
  };
}

// Check if local render server is running (tries HTTPS, then HTTP fallback)
export async function checkLocalRenderServer(): Promise<boolean> {
  const urls = getRenderServerUrls();
  
  for (const url of urls) {
    try {
      console.log('[LocalRender] Checking render server at:', url);
      const response = await fetch(`${url}/health`, {
        method: 'GET',
      });
      if (response.ok) {
        console.log('[LocalRender] ✅ Render server available at:', url);
        return true;
      }
    } catch (error) {
      console.warn(`[LocalRender] ⚠️ Server not available at ${url}:`, error);
      // Continue to next URL
    }
  }
  
  console.error('[LocalRender] ❌ Render server not available at any URL');
  return false;
}

