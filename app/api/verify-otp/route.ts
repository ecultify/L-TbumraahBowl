import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🔵 [API - VERIFY OTP] Request received');
  
  try {
    const requestData = await request.json();
    console.log('📦 [API - VERIFY OTP] Request data:', requestData);
    
    const { body } = requestData;

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

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    console.log('📥 [API - VERIFY OTP] Response status:', response.status);
    console.log('📥 [API - VERIFY OTP] Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📥 [API - VERIFY OTP] Response data:', data);

    if (!response.ok) {
      console.log('❌ [API - VERIFY OTP] Request failed:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to verify OTP' },
        { status: response.status }
      );
    }

    console.log('✅ [API - VERIFY OTP] Request successful');
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ [API - VERIFY OTP] Error:', error);
    console.error('❌ [API - VERIFY OTP] Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

