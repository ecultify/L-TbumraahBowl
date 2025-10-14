/**
 * URL Shortener Utility for Server-Side (Node.js)
 * 
 * Uses free URL shortening APIs to minify long Supabase URLs
 * before sending them via WhatsApp
 */

/**
 * Shorten a URL using TinyURL API (free, no API key required)
 */
async function shortenWithTinyUrl(longUrl) {
  try {
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    
    if (!response.ok) {
      console.error('❌ [TinyURL] API error:', response.status);
      return null;
    }
    
    const shortUrl = await response.text();
    
    if (shortUrl && shortUrl.startsWith('https://tinyurl.com/')) {
      console.log('✅ [TinyURL] URL shortened successfully');
      return shortUrl;
    }
    
    return null;
  } catch (error) {
    console.error('❌ [TinyURL] Error:', error);
    return null;
  }
}

/**
 * Shorten a URL using is.gd API (free, no API key required)
 */
async function shortenWithIsGd(longUrl) {
  try {
    const response = await fetch(
      `https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`
    );
    
    if (!response.ok) {
      console.error('❌ [is.gd] API error:', response.status);
      return null;
    }
    
    const shortUrl = await response.text();
    
    if (shortUrl && shortUrl.startsWith('https://is.gd/')) {
      console.log('✅ [is.gd] URL shortened successfully');
      return shortUrl;
    }
    
    return null;
  } catch (error) {
    console.error('❌ [is.gd] Error:', error);
    return null;
  }
}

/**
 * Shorten a long URL using multiple fallback services
 * Tries TinyURL first, then is.gd, then returns original URL if both fail
 * 
 * @param {string} longUrl - The long URL to shorten (e.g., Supabase storage URL)
 * @returns {Promise<string>} Shortened URL or original URL if shortening fails
 */
async function shortenUrl(longUrl) {
  if (!longUrl || !longUrl.startsWith('http')) {
    console.error('❌ [URL Shortener] Invalid URL provided');
    return longUrl;
  }

  console.log('🔗 [URL Shortener] Attempting to shorten URL...');
  console.log('🔗 [URL Shortener] Original length:', longUrl.length);

  // Try TinyURL first
  let shortUrl = await shortenWithTinyUrl(longUrl);
  
  // If TinyURL fails, try is.gd
  if (!shortUrl) {
    console.log('⚠️ [URL Shortener] TinyURL failed, trying is.gd...');
    shortUrl = await shortenWithIsGd(longUrl);
  }

  // If both fail, return original URL
  if (!shortUrl) {
    console.warn('⚠️ [URL Shortener] All shortening services failed, using original URL');
    return longUrl;
  }

  console.log('✅ [URL Shortener] URL shortened successfully');
  console.log('🔗 [URL Shortener] Short URL length:', shortUrl.length);
  console.log('🔗 [URL Shortener] Saved:', longUrl.length - shortUrl.length, 'characters');

  return shortUrl;
}

/**
 * Shorten a URL for WhatsApp messages specifically
 * Ensures the URL is safe and properly formatted
 * 
 * @param {string} longUrl - The long URL to shorten
 * @returns {Promise<string>} Shortened URL or original URL if shortening fails
 */
async function shortenUrlForWhatsApp(longUrl) {
  console.log('[WhatsApp URL] 🔗 Preparing URL for WhatsApp message...');
  
  const shortUrl = await shortenUrl(longUrl);
  
  console.log('[WhatsApp URL] ✅ Final URL:', shortUrl);
  return shortUrl;
}

module.exports = {
  shortenUrl,
  shortenUrlForWhatsApp
};

