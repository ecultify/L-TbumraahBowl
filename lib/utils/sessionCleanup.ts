/**
 * Utility functions to manage and clear analysis-related session storage
 */

// All session storage keys used by the analysis system
// NOTE: This should only include analysis-specific data, NOT user identity or authentication data
const ANALYSIS_STORAGE_KEYS = [
  'analysisVideoData',
  'benchmarkDetailedData',
  'pendingLeaderboardEntry',
  'uploadedVideoUrl',
  'uploadedFileName',
  'uploadedSource',
  'uploadedMimeType',
  'uploadedFileSize',
  'analysisGeneratedVideoUrl',
  'lastVideoPlayerName',
  'analysisPlayerPhone',
  'analysisVideoData_backup',
  'analysisVideoData_timestamp',
  'noBowlingActionDetected',
  'detectedFrameDataUrl', // 🆕 Face detection frame (prevent cross-user contamination)
  'generatedVideoUrl'     // 🆕 Generated video URL
  // Excluded to preserve user identity across retries:
  // - 'playerName' (needed for composite card and database association)
  // - 'playerPhone' (needed for returning user lookup and database association)
  // - 'detailsCompleted' (authentication state)
];

// 🆕 LocalStorage keys that need cleanup (face frames should NOT persist across users)
const ANALYSIS_LOCALSTORAGE_KEYS = [
  'userVideoThumbnail',  // Face detection frame stored in localStorage
  'torsoVideoUrl'        // Torso generation data
];

/**
 * Clear all analysis-related data from session storage AND localStorage
 * This ensures a fresh start for new analysis and prevents cross-user contamination
 */
export function clearAnalysisSessionStorage(): void {
  if (typeof window === 'undefined') return;
  
  console.log('🧹 Clearing analysis session storage for fresh start');
  
  // Clear sessionStorage
  ANALYSIS_STORAGE_KEYS.forEach(key => {
    if (window.sessionStorage.getItem(key)) {
      window.sessionStorage.removeItem(key);
      console.log(`   ✓ Cleared sessionStorage: ${key}`);
    }
  });
  
  // 🆕 Clear localStorage (CRITICAL for preventing cross-user face frame contamination)
  console.log('🧹 Clearing face detection data from localStorage...');
  ANALYSIS_LOCALSTORAGE_KEYS.forEach(key => {
    if (window.localStorage.getItem(key)) {
      window.localStorage.removeItem(key);
      console.log(`   ✓ Cleared localStorage: ${key}`);
    }
  });
  
  console.log('✅ Analysis session storage and localStorage cleared');
}

/**
 * Force page reload for complete fresh start
 * More thorough than just clearing session storage
 */
export function reloadPageForFreshStart(): void {
  if (typeof window === 'undefined') return;
  
  console.log('🔄 Reloading page for complete fresh start');
  window.location.reload();
}

/**
 * Navigate to URL with forced reload (no SPA navigation)
 * Ensures complete state reset
 */
export function navigateWithReload(url: string): void {
  if (typeof window === 'undefined') return;
  
  console.log(`🔄 Navigating to ${url} with full reload`);
  window.location.href = url;
}

/**
 * Clear specific keys related to video upload/recording
 * Used when starting a new video upload/recording process
 */
export function clearVideoSessionStorage(): void {
  if (typeof window === 'undefined') return;
  
  console.log('🎥 Clearing video session storage');
  
  const videoKeys = [
    'uploadedVideoUrl',
    'uploadedFileName',
    'uploadedSource',
    'uploadedMimeType', 
    'uploadedFileSize'
  ];
  
  videoKeys.forEach(key => {
    if (window.sessionStorage.getItem(key)) {
      window.sessionStorage.removeItem(key);
      console.log(`   Cleared: ${key}`);
    }
  });
}

/**
 * Check if there's existing analysis data in session storage
 * Useful for debugging and understanding state
 */
export function hasExistingAnalysisData(): boolean {
  if (typeof window === 'undefined') return false;
  
  return ANALYSIS_STORAGE_KEYS.some(key => 
    window.sessionStorage.getItem(key) !== null
  );
}

/**
 * Get debug info about current session storage state
 */
export function getSessionStorageDebugInfo(): Record<string, string | null> {
  if (typeof window === 'undefined') return {};
  
  const debug: Record<string, string | null> = {};
  ANALYSIS_STORAGE_KEYS.forEach(key => {
    const value = window.sessionStorage.getItem(key);
    if (value) {
      debug[key] = value.length > 100 ? `${value.substring(0, 100)}...` : value;
    }
  });
  
  return debug;
}