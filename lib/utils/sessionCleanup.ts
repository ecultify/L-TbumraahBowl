/**
 * Utility functions to manage and clear analysis-related session storage
 */

// All session storage keys used by the analysis system
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
  'noBowlingActionDetected'
];

/**
 * Clear all analysis-related data from session storage
 * This ensures a fresh start for new analysis
 */
export function clearAnalysisSessionStorage(): void {
  if (typeof window === 'undefined') return;
  
  console.log('🧹 Clearing analysis session storage for fresh start');
  
  ANALYSIS_STORAGE_KEYS.forEach(key => {
    if (window.sessionStorage.getItem(key)) {
      window.sessionStorage.removeItem(key);
      console.log(`   Cleared: ${key}`);
    }
  });
  
  console.log('✅ Analysis session storage cleared');
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