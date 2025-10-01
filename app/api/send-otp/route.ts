import { NextRequest, NextResponse } from 'next/server';

// Configure runtime to use Node.js instead of Edge
export const runtime = 'nodejs';

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
    
    const { body } = requestData;

    if (!body) {
      console.error('❌ [API - SEND OTP] Missing body in request');
      return NextResponse.json(
        { error: 'Missing encrypted phone number in request body' },
        { status: 400 }
      );
    }

    const apiUrl = 'https://apiclouduat.ltfs.com:1132/LTFSME/api/sendBumraPosterOtp';
    const headers = {
      'flsId': 'VEN03799',
      'lendToken': 'eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI1MDA2NDA2MyIsImlhdCI6MTcxOTMxMDI1Nywic3ViIjoiSldUIFRlc3QiLCJpc3MiOiJMVCIsImV4cCI6MTcxOTMzOTA1N30.tiz1dlY7KvYf7Y9xxWZ2JqZAWnJCfiOzsSfJqWTNuGw',
      'producttype': 'SME',
      'Content-Type': 'application/json',
    };
    const requestBody = { body };

    console.log('📤 [API - SEND OTP] Calling external API:', apiUrl);
    console.log('📋 [API - SEND OTP] Headers:', headers);
    console.log('📦 [API - SEND OTP] Body:', requestBody);

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
    
    let data;
    try {
      data = await response.json();
      console.log('📥 [API - SEND OTP] Response data:', data);
    } catch (jsonError: any) {
      console.error('❌ [API - SEND OTP] Failed to parse response JSON:', jsonError);
      return NextResponse.json(
        { error: 'Invalid response from OTP service' },
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
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ [API - SEND OTP] Unexpected error:', error);
    console.error('❌ [API - SEND OTP] Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

