import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, environment = 'uat' } = body;

    // Environment-specific credentials
    const config = environment === 'prod' 
      ? {
          AXIOM_API_URL: 'https://apicloud.ltfs.com/ltfs/api/Axiom_json6listener',
          AXIOM_CLIENT_ID: '24b81a0a-b42f-40bb-b293-89373caf6fc8',
          AXIOM_CLIENT_SECRET: 'E3uT1jA6lG0pU1oH4tT4tX2rO0iK8iV1qS4dI8tX8sF8uQ8yP1',
          dCode: 'HLCHTBRD',
          subuid: 'HLCHTBRDOTP',
          pwd: 'U595vdOamkgE/pGveHUBsA==',
        }
      : {
          AXIOM_API_URL: 'https://apiclouduat.ltfs.com/ltfs/api/Axiom_json6listener',
          AXIOM_CLIENT_ID: 'a1837041-2f11-4d80-8651-bdca0be6f51c',
          AXIOM_CLIENT_SECRET: 'wO5xL0fO3kT1fI4tM3nT7pB3yM7rF3uY6mH8vV6tS1fV7uW8iN',
          dCode: 'CollectionApp',
          subuid: 'CollectionApp',
          pwd: '$z6!oNv5R',
        };

    const testOtp = '123456';

    const payload = {
      dCode: config.dCode,
      subuid: config.subuid,
      pwd: config.pwd,
      sender: 'LNTFIN',
      ctype: '1',
      pno: phone,
      msgtxt: `Dear Customer, ${testOtp} is the one-time password (OTP) for your Bowl Like Bumrah activation by L&T Finance.`,
      intflag: '1',
      msgtype: 'S',
      alert: '1',
      freefield1: '',
    };

    console.log('=== AXIOM TEST REQUEST ===');
    console.log('Environment:', environment.toUpperCase());
    console.log('URL:', config.AXIOM_API_URL);
    console.log('Headers:', {
      'Content-Type': 'application/json',
      'X-IBM-Client-Id': config.AXIOM_CLIENT_ID,
      'X-IBM-Client-Secret': config.AXIOM_CLIENT_SECRET.substring(0, 10) + '...',
    });
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(config.AXIOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-IBM-Client-Id': config.AXIOM_CLIENT_ID,
        'X-IBM-Client-Secret': config.AXIOM_CLIENT_SECRET,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('=== AXIOM RESPONSE ===');
    console.log('Status:', response.status);
    console.log('Response Text:', responseText);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { raw: responseText, parseError: 'Failed to parse JSON' };
    }

    const result = {
      testInfo: `Direct Axiom API call from Next.js server (${environment.toUpperCase()})`,
      environment: environment.toUpperCase(),
      request: {
        url: config.AXIOM_API_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IBM-Client-Id': config.AXIOM_CLIENT_ID,
          'X-IBM-Client-Secret': config.AXIOM_CLIENT_SECRET,
        },
        payload,
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        body: data,
        rawText: responseText.substring(0, 500),
      },
      analysis: {
        isSuccess: data.errCode === 0,
        hasMessageId: !!data.messageid,
        errorCode: data.errCode,
        errorMessage: data.errDescription || data.errDescritption || data.error,
      }
    };

    console.log('=== RESULT ===');
    console.log(JSON.stringify(result, null, 2));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Test Axiom] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

