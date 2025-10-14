'use client';

/**
 * Sinch ACL WhatsApp API Integration
 * Documentation: https://docs.aclwhatsapp.com/wa/Getting%20Started/Before%20You%20Start
 */

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  'not-before-policy': number;
  session_state: string;
  scope: string;
}

interface WhatsAppMessageParams {
  phoneNumber: string; // Phone number with country code (e.g., "919876543210")
  userName: string; // {1} - User name
  videoLink: string; // {2} - Video link
}

// Sinch WhatsApp API credentials (these should be in env variables for production)
const SINCH_CONFIG = {
  // Production endpoints
  AUTH_URL: 'https://auth.aclwhatsapp.com/realms/ipmessaging/protocol/openid-connect/token',
  MESSAGE_URL: 'https://api.aclwhatsapp.com/pull-platform-receiver/v2/wa/messages',
  
  // Credentials (should be moved to env variables)
  USERNAME: process.env.NEXT_PUBLIC_SINCH_USERNAME || 'ltfspd13',
  PASSWORD: process.env.NEXT_PUBLIC_SINCH_PASSWORD || 'Sinch@918097367357',
  CLIENT_ID: 'ipmessaging-client',
  GRANT_TYPE: 'password',
  
  // Template details
  TEMPLATE_ID: 'blbumrah_3_091025',
  HEADER_IMAGE_URL: 'https://bowllikebumrah.com/images/newhomepage/Group%201437254115.png',
  // Template: Hi {1}! Your #BumrahKiSpeedPar video is ready: {2} share on Instagram with #BumrahKiSpeedPar, Tag & Follow @LNTFinanace to join the leaderboard.
  // {1} - User name, {2} - Video Link
};

/**
 * Get access token from Sinch WhatsApp API
 */
export async function getSinchAccessToken(): Promise<string> {
  console.log('[WhatsApp] 🔑 Requesting access token from Sinch API...');
  
  try {
    const formData = new URLSearchParams();
    formData.append('grant_type', SINCH_CONFIG.GRANT_TYPE);
    formData.append('client_id', SINCH_CONFIG.CLIENT_ID);
    formData.append('username', SINCH_CONFIG.USERNAME);
    formData.append('password', SINCH_CONFIG.PASSWORD);

    const response = await fetch(SINCH_CONFIG.AUTH_URL, {
      method: 'POST',
      headers: {
        'cache-control': 'no-cache',
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WhatsApp] ❌ Token request failed:', response.status, errorText);
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
    }

    const data: TokenResponse = await response.json();
    
    console.log('[WhatsApp] ✅ Access token received');
    console.log('[WhatsApp] 📊 Token expires in:', data.expires_in, 'seconds');
    console.log('[WhatsApp] 🔄 Refresh token expires in:', data.refresh_expires_in, 'seconds');
    
    return data.access_token;
  } catch (error: any) {
    console.error('[WhatsApp] ❌ Error getting access token:', error);
    throw error;
  }
}

/**
 * Send WhatsApp message using template
 */
export async function sendWhatsAppVideoLink(params: WhatsAppMessageParams): Promise<boolean> {
  console.log('[WhatsApp] 📤 Preparing to send video link via WhatsApp...');
  console.log('[WhatsApp] 📱 Phone:', params.phoneNumber);
  console.log('[WhatsApp] 👤 User:', params.userName);
  console.log('[WhatsApp] 🎥 Video link:', params.videoLink);

  try {
    // Step 1: Get access token
    const accessToken = await getSinchAccessToken();
    
    // Step 2: Prepare message payload
    // Format: Working format based on successful test
    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: params.phoneNumber,
      type: 'template',
      template: {
        name: SINCH_CONFIG.TEMPLATE_ID,
        language: {
          code: 'en'
        },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: {
                  link: SINCH_CONFIG.HEADER_IMAGE_URL
                }
              }
            ]
          },
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: params.userName // {1} - User name
              },
              {
                type: 'text',
                text: params.videoLink // {2} - Video link
              }
            ]
          }
        ]
      }
    };

    console.log('[WhatsApp] 📦 Message payload:', JSON.stringify(messagePayload, null, 2));

    // Step 3: Send message
    const response = await fetch(SINCH_CONFIG.MESSAGE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    });

    const responseText = await response.text();
    let responseData: any = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log('[WhatsApp] 📥 Response status:', response.status);
    console.log('[WhatsApp] 📥 Response data:', responseData);

    if (!response.ok) {
      console.error('[WhatsApp] ❌ Failed to send message:', response.status, responseData);
      throw new Error(`Failed to send WhatsApp message: ${response.status} ${JSON.stringify(responseData)}`);
    }

    console.log('[WhatsApp] ✅ WhatsApp message sent successfully!');
    return true;
  } catch (error: any) {
    console.error('[WhatsApp] ❌ Error sending WhatsApp message:', error);
    throw error;
  }
}

/**
 * Test function to verify credentials and get token
 */
export async function testSinchConnection(): Promise<void> {
  console.log('[WhatsApp] 🧪 Testing Sinch WhatsApp API connection...');
  console.log('[WhatsApp] 🔧 Auth URL:', SINCH_CONFIG.AUTH_URL);
  console.log('[WhatsApp] 👤 Username:', SINCH_CONFIG.USERNAME);
  console.log('[WhatsApp] 🔑 Password:', '***' + SINCH_CONFIG.PASSWORD.slice(-4));
  
  try {
    const token = await getSinchAccessToken();
    console.log('[WhatsApp] ✅ Connection test successful!');
    console.log('[WhatsApp] 🎫 Token preview:', token.substring(0, 50) + '...');
    return;
  } catch (error) {
    console.error('[WhatsApp] ❌ Connection test failed:', error);
    throw error;
  }
}

