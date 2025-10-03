import { NextRequest, NextResponse } from 'next/server';

// Configure runtime to use Node.js instead of Edge
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('🔵 [API - VERIFY OTP] Request received');
  
  try {
    let requestData;
    try {
      requestData = await request.json();
      console.log('📦 [API - VERIFY OTP] Request data:', requestData);
    } catch (parseError: any) {
      console.error('❌ [API - VERIFY OTP] Failed to parse request JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid request format', details: parseError.message },
        { status: 400 }
      );
    }
    
    const { body } = requestData;

    if (!body) {
      console.error('❌ [API - VERIFY OTP] Missing body in request');
      return NextResponse.json(
        { error: 'Missing encrypted OTP in request body' },
        { status: 400 }
      );
    }

    const apiUrl = 'https://apiclouduat.ltfs.com:1132/LTFSME/api/verifyOtps';
    const headers = {
      'flsId': 'VEN03799',
      'lendToken': 'eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI1MDA2NDA2MyIsImlhdCI6MTcxOTMxMDI1Nywic3ViIjoiSldUIFRlc3QiLCJpc3MiOiJMVCIsImV4cCI6MTcxOTMzOTA1N30.tiz1dlY7KvYf7Y9xxWZ2JqZAWnJCfiOzsSfJqWTNuGw',
      'producttype': 'SME',
      'Content-Type': 'application/json',
    };
    const requestBody = { body };

    console.log('📤 [API - VERIFY OTP] Calling external API:', apiUrl);
    console.log('📋 [API - VERIFY OTP] Headers:', headers);
    console.log('📦 [API - VERIFY OTP] Body:', requestBody);

    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
    } catch (fetchError: any) {
      console.error('❌ [API - VERIFY OTP] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to connect to OTP verification service', details: fetchError.message },
        { status: 503 }
      );
    }

    console.log('📥 [API - VERIFY OTP] Response status:', response.status);
    console.log('📥 [API - VERIFY OTP] Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Get response text first to see what we're actually getting
    const responseText = await response.text();
    console.log('📥 [API - VERIFY OTP] Raw response text:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('📥 [API - VERIFY OTP] Parsed response data:', data);
    } catch (jsonError: any) {
      console.error('❌ [API - VERIFY OTP] Failed to parse response JSON:', jsonError);
      console.error('❌ [API - VERIFY OTP] Response was not valid JSON. First 500 chars:', responseText.substring(0, 500));
      return NextResponse.json(
        { 
          error: 'Invalid response from OTP verification service', 
          details: 'Response was not valid JSON',
          responsePreview: responseText.substring(0, 200)
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.log('❌ [API - VERIFY OTP] Request failed:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to verify OTP', details: data },
        { status: response.status }
      );
    }

    console.log('✅ [API - VERIFY OTP] Request successful');
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ [API - VERIFY OTP] Unexpected error:', error);
    console.error('❌ [API - VERIFY OTP] Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

