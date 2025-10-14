/**
 * URL Normalization Utility for Server-Side (Node.js)
 * 
 * Fixes common issues with video URLs like:
 * - Missing colon in https:// (becomes https//)
 * - Extra whitespace
 * - Invalid URL formats
 */

/**
 * Normalize and validate video URLs
 * Fixes common issues like missing colons in https://
 * 
 * @param {string|null|undefined} url - The URL to normalize
 * @returns {string|null} Normalized URL or null if invalid
 */
function normalizeVideoUrl(url) {
  if (!url) {
    console.warn('⚠️ [URL Normalization] No URL provided');
    return null;
  }
  
  // Remove any whitespace
  url = url.trim();
  
  console.log('[URL Normalization] Original URL:', url.substring(0, 100));
  
  // 🔧 FIX: Remove incorrectly prepended domain (e.g., "https://bowllikebumrah.comhttps://supabase...")
  // This happens when a full URL is treated as a relative path and has the domain prepended
  if (url.match(/^https?:\/\/[^/]+https?:\/\//)) {
    const originalUrl = url;
    // Extract the second URL (the correct one)
    const match = url.match(/(https?:\/\/.+?)?(https?:\/\/.+)/);
    if (match && match[2]) {
      url = match[2];
      console.warn('⚠️ [URL Normalization] Fixed double-domain URL');
      console.log('[URL Normalization] Before:', originalUrl.substring(0, 100));
      console.log('[URL Normalization] After:', url.substring(0, 100));
    }
  }
  
  // Fix missing protocol entirely (e.g., "hqzukyxnnjnstrecybzx.supabase.co/..." → "https://hqzukyxnnjnstrecybzx.supabase.co/...")
  if (!url.startsWith('https://') && !url.startsWith('http://') && !url.startsWith('//')) {
    // Check if it looks like a domain name (contains supabase.co or other domain patterns)
    if (url.includes('supabase.co') || url.match(/^[a-z0-9.-]+\.[a-z]{2,}\//i)) {
      const originalUrl = url;
      url = 'https://' + url;
      console.warn('⚠️ [URL Normalization] Fixed URL: added missing https:// protocol');
      console.log('[URL Normalization] Before:', originalUrl.substring(0, 100));
      console.log('[URL Normalization] After:', url.substring(0, 100));
    }
  }
  
  // Fix protocol-relative URLs (e.g., "//hqzukyxnnjnstrecybzx.supabase.co/..." → "https://hqzukyxnnjnstrecybzx.supabase.co/...")
  if (url.startsWith('//')) {
    const originalUrl = url;
    url = 'https:' + url;
    console.warn('⚠️ [URL Normalization] Fixed URL: converted protocol-relative URL to https://');
    console.log('[URL Normalization] Before:', originalUrl.substring(0, 100));
    console.log('[URL Normalization] After:', url.substring(0, 100));
  }
  
  // Fix missing colon in https//
  if (url.includes('https//') && !url.includes('https://')) {
    const originalUrl = url;
    url = url.replace(/https\/\//g, 'https://');
    console.warn('⚠️ [URL Normalization] Fixed malformed URL: added colon after https');
    console.log('[URL Normalization] Before:', originalUrl.substring(0, 100));
    console.log('[URL Normalization] After:', url.substring(0, 100));
  }
  
  // Fix missing colon in http// (less common but possible)
  if (url.includes('http//') && !url.includes('http://') && !url.includes('https://')) {
    const originalUrl = url;
    url = url.replace(/http\/\//g, 'http://');
    console.warn('⚠️ [URL Normalization] Fixed malformed URL: added colon after http');
    console.log('[URL Normalization] Before:', originalUrl.substring(0, 100));
    console.log('[URL Normalization] After:', url.substring(0, 100));
  }
  
  // Validate URL format after all fixes
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    console.error('❌ [URL Normalization] Invalid URL format after normalization (must start with https:// or http://):', url.substring(0, 100));
    return null;
  }
  
  // Additional validation for Supabase URLs
  if (url.includes('supabase.co')) {
    // Ensure proper Supabase storage URL format
    if (!url.includes('/storage/v1/object/public/')) {
      console.error('❌ [URL Normalization] Malformed Supabase URL (missing /storage/v1/object/public/):', url.substring(0, 100));
      // Don't return null - it might still be valid
    }
  }
  
  console.log('✅ [URL Normalization] URL validated:', url.substring(0, 80) + '...');
  return url;
}

/**
 * Validate if a URL is properly formed
 * 
 * @param {string} url - The URL to validate
 * @returns {boolean} true if valid, false otherwise
 */
function isValidVideoUrl(url) {
  const normalizedUrl = normalizeVideoUrl(url);
  return normalizedUrl !== null;
}

module.exports = {
  normalizeVideoUrl,
  isValidVideoUrl
};

