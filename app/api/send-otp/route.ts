import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🔵 [API - SEND OTP] Request received');
  
  try {
    const requestData = await request.json();
    console.log('📦 [API - SEND OTP] Request data:', requestData);
    
    const { body } = requestData;

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

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    console.log('📥 [API - SEND OTP] Response status:', response.status);
    console.log('📥 [API - SEND OTP] Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📥 [API - SEND OTP] Response data:', data);

    if (!response.ok) {
      console.log('❌ [API - SEND OTP] Request failed:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to send OTP' },
        { status: response.status }
      );
    }

    console.log('✅ [API - SEND OTP] Request successful');
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ [API - SEND OTP] Error:', error);
    console.error('❌ [API - SEND OTP] Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

