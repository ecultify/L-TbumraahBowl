import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppToken } from '@/lib/utils/whatsappTokenManager';

/**
 * Server-side WhatsApp API endpoint
 * Sends video link via Sinch WhatsApp API
 * 
 * ✅ Uses cached token from Supabase (refreshed every 9 hours)
 */

const SINCH_CONFIG = {
  MESSAGE_URL: 'https://api.aclwhatsapp.com/pull-platform-receiver/v2/wa/messages',
  TEMPLATE_ID: 'blbumrah_3_091025', // Updated template
  HEADER_IMAGE_URL: 'https://bowllikebumrah.com/images/newhomepage/Group%201437254115.avif',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, userName, videoLink } = body;

    console.log('[WhatsApp API] 📤 Sending WhatsApp message...');
    console.log('[WhatsApp API] 📱 Phone:', phoneNumber);
    console.log('[WhatsApp API] 👤 User:', userName);
    console.log('[WhatsApp API] 🎥 Video:', videoLink);

    // Validate inputs
    if (!phoneNumber || !userName || !videoLink) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: phoneNumber, userName, videoLink' },
        { status: 400 }
      );
    }

    // Get access token (from Supabase cache or refresh if needed)
    const accessToken = await getWhatsAppToken();
    console.log('[WhatsApp API] ✅ Token retrieved from cache');

    // Prepare WhatsApp template message
    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
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
                text: userName // {1}
              },
              {
                type: 'text',
                text: videoLink // {2}
              }
            ]
          }
        ]
      }
    };

    console.log('[WhatsApp API] 📦 Payload:', JSON.stringify(messagePayload, null, 2));

    // Send message
    const messageResponse = await fetch(SINCH_CONFIG.MESSAGE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    });

    const responseText = await messageResponse.text();
    let responseData: any = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log('[WhatsApp API] 📥 Response:', responseData);

    if (!messageResponse.ok) {
      console.error('[WhatsApp API] ❌ Failed:', responseData);
      return NextResponse.json(
        { success: false, error: 'Failed to send WhatsApp message', details: responseData },
        { status: messageResponse.status }
      );
    }

    console.log('[WhatsApp API] ✅ Message sent successfully!');
    return NextResponse.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      data: responseData,
    });
  } catch (error: any) {
    console.error('[WhatsApp API] ❌ Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


