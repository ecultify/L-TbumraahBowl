import { createClient } from '@supabase/supabase-js';

/**
 * 🔐 WHATSAPP TOKEN MANAGER
 * 
 * Manages WhatsApp access token with automatic refresh from Supabase
 * - Stores token in Supabase table (persistent, shared across services)
 * - Auto-refreshes when token expires in < 1 hour
 * - Reduces auth API calls from once-per-message to once-per-9-hours
 */

// Supabase configuration
const SUPABASE_URL = 'https://hqzukyxnnjnstrecybzx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxenVreXhubmpuc3RyZWN5Ynp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTM4OTIsImV4cCI6MjA3MzA2OTg5Mn0.-FaJuxBuwxk5L-WCYKv--Vmq0g_aPBjGOTBKgwTrcOI';

// Sinch WhatsApp auth configuration
const SINCH_AUTH_CONFIG = {
  AUTH_URL: 'https://auth.aclwhatsapp.com/realms/ipmessaging/protocol/openid-connect/token',
  CLIENT_ID: 'ipmessaging-client',
  GRANT_TYPE: 'password',
  USERNAME: 'ltfspd13',
  PASSWORD: 'Sinch@918097367357'
};

// Token refresh threshold (refresh if expires in < 1 hour)
const REFRESH_THRESHOLD_HOURS = 1;

/**
 * Get valid WhatsApp access token (from cache or refresh)
 */
export async function getWhatsAppToken(): Promise<string> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 1. Check if we have a valid cached token in Supabase
    const { data: tokenData, error: fetchError } = await supabase
      .from('whatsapp_tokens')
      .select('*')
      .eq('id', 1)
      .single();

    if (fetchError) {
      console.error('❌ [Token Manager] Error fetching token from Supabase:', fetchError);
      // If table doesn't exist or is empty, fetch fresh token
      return await refreshWhatsAppToken();
    }

    // 2. Check if token is still valid (expires in > 1 hour)
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    console.log(`[Token Manager] Token expires in ${hoursUntilExpiry.toFixed(2)} hours`);

    // 3. If token is valid, return it
    if (hoursUntilExpiry > REFRESH_THRESHOLD_HOURS) {
      console.log('✅ [Token Manager] Using cached token from Supabase');
      return tokenData.access_token;
    }

    // 4. Token is expiring soon or expired, refresh it
    console.log('🔄 [Token Manager] Token expiring soon, refreshing...');
    return await refreshWhatsAppToken();

  } catch (err) {
    console.error('❌ [Token Manager] Unexpected error:', err);
    // Fallback: try to get fresh token
    return await refreshWhatsAppToken();
  }
}

/**
 * Refresh WhatsApp access token from Sinch API and store in Supabase
 */
export async function refreshWhatsAppToken(): Promise<string> {
  try {
    console.log('🔄 [Token Manager] Fetching new access token from Sinch API...');

    // 1. Request new token from Sinch
    const formData = new URLSearchParams();
    formData.append('grant_type', SINCH_AUTH_CONFIG.GRANT_TYPE);
    formData.append('client_id', SINCH_AUTH_CONFIG.CLIENT_ID);
    formData.append('username', SINCH_AUTH_CONFIG.USERNAME);
    formData.append('password', SINCH_AUTH_CONFIG.PASSWORD);

    const response = await fetch(SINCH_AUTH_CONFIG.AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'cache-control': 'no-cache'
      },
      body: formData.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const accessToken = data.access_token;
    const expiresIn = data.expires_in || 36000; // Default 10 hours

    if (!accessToken) {
      throw new Error('No access token in response');
    }

    console.log(`✅ [Token Manager] Got new token, expires in ${expiresIn / 3600} hours`);

    // 2. Calculate expiry time
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // 3. Store in Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { error: updateError } = await supabase
      .from('whatsapp_tokens')
      .update({
        access_token: accessToken,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
        token_source: 'auto_refresh',
        refresh_count: supabase.rpc('increment', { row_id: 1 })
      })
      .eq('id', 1);

    if (updateError) {
      console.error('❌ [Token Manager] Failed to store token in Supabase:', updateError);
      // Continue anyway, we still have the token
    } else {
      console.log('✅ [Token Manager] Token stored in Supabase successfully');
    }

    return accessToken;

  } catch (err) {
    console.error('❌ [Token Manager] Failed to refresh token:', err);
    throw new Error(`Token refresh failed: ${err}`);
  }
}

/**
 * Initialize token on server start (optional)
 * Call this when your server starts to ensure a fresh token
 */
export async function initializeWhatsAppToken(): Promise<void> {
  try {
    console.log('🚀 [Token Manager] Initializing WhatsApp token...');
    await getWhatsAppToken();
    console.log('✅ [Token Manager] Token initialized successfully');
  } catch (err) {
    console.error('❌ [Token Manager] Failed to initialize token:', err);
    // Don't throw - token will be fetched on first use
  }
}

/**
 * Force refresh token (useful for testing or manual refresh)
 */
export async function forceRefreshToken(): Promise<string> {
  console.log('🔄 [Token Manager] Force refreshing token...');
  return await refreshWhatsAppToken();
}

