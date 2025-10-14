import { NextRequest, NextResponse } from 'next/server';
import { encrypt, decrypt } from '@/lib/utils/encryption';

// Only force dynamic in development/server mode, not during static export
export const runtime = process.env.NEXT_OUTPUT_EXPORT === 'true' ? undefined : 'nodejs';
export const dynamic = process.env.NEXT_OUTPUT_EXPORT === 'true' ? undefined : 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('🔵 [API - SEND OTP] Request received');
  
  try {
    let requestData;
    try {
      requestData = await request.json();
      console.log('📦 [API - SEND OTP] Request data:', requestData);
    } catch (parseError: any) {
      console.error('❌ [API - SEND OTP] Failed to parse request JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid request format', details: parseError.message },
        { status: 400 }
      );
    }
    
    const { phone } = requestData;

    if (!phone) {
      console.error('❌ [API - SEND OTP] Missing phone in request');
      return NextResponse.json(
        { error: 'Missing phone number in request' },
        { status: 400 }
      );
    }

    // Validate phone number format
    if (!/^\d{10}$/.test(phone)) {
      console.error('❌ [API - SEND OTP] Invalid phone format:', phone);
      return NextResponse.json(
        { error: 'Phone number must be 10 digits' },
        { status: 400 }
      );
    }

    // Create payload in the correct format (matching client's format)
    const payload = {
      number: phone,
      Customer_Name: "Test User", // You might want to get this from request or use a default
      Loan_Application_Id: `BL${Date.now()}`, // Generate a unique ID
      flsId: "VEN03799"
    };

    console.log('📋 [API - SEND OTP] Payload to encrypt:', payload);

    // Encrypt using CryptoJS (matching client's implementation)
    const plaintext = JSON.stringify(payload);
    const encrypted = encrypt(plaintext);
    
    if (!encrypted) {
      console.error('❌ [API - SEND OTP] Encryption failed');
      return NextResponse.json(
        { error: 'Failed to encrypt phone number' },
        { status: 500 }
      );
    }

    console.log('🔐 [API - SEND OTP] Encrypted payload length:', encrypted.length);

    const apiUrl = 'https://apiclouduat.ltfs.com:1132/LTFSME/api/sendBumraPosterOtp';
    const headers = {
      'flsId': 'VEN03799',
      'lendToken': 'eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI1MDA2NDA2MyIsImlhdCI6MTcxOTMxMDI1Nywic3ViIjoiSldUIFRlc3QiLCJpc3MiOiJMVCIsImV4cCI6MTcxOTMzOTA1N30.tiz1dlY7KvYf7Y9xxWZ2JqZAWnJCfiOzsSfJqWTNuGw',
      'producttype': 'SME',
      'Content-Type': 'application/json',
    };
    const requestBody = { body: encrypted };

    console.log('📤 [API - SEND OTP] Calling external API:', apiUrl);
    console.log('📋 [API - SEND OTP] Headers:', headers);
    console.log('📦 [API - SEND OTP] Body length:', requestBody.body.length);

    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
    } catch (fetchError: any) {
      console.error('❌ [API - SEND OTP] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to connect to OTP service', details: fetchError.message },
        { status: 503 }
      );
    }

    console.log('📥 [API - SEND OTP] Response status:', response.status);
    console.log('📥 [API - SEND OTP] Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Get response text first to see what we're actually getting
    const responseText = await response.text();
    console.log('📥 [API - SEND OTP] Raw response text:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('📥 [API - SEND OTP] Parsed response data:', data);
    } catch (jsonError: any) {
      console.error('❌ [API - SEND OTP] Failed to parse response JSON:', jsonError);
      console.error('❌ [API - SEND OTP] Response was not valid JSON. First 500 chars:', responseText.substring(0, 500));
      return NextResponse.json(
        { 
          error: 'Invalid response from OTP service', 
          details: 'Response was not valid JSON',
          responsePreview: responseText.substring(0, 200)
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.log('❌ [API - SEND OTP] Request failed:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to send OTP', details: data },
        { status: response.status }
      );
    }

    console.log('✅ [API - SEND OTP] Request successful');
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ [API - SEND OTP] Unexpected error:', error);
    console.error('❌ [API - SEND OTP] Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

