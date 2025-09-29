import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = 'AIzaSyBRyKCamJ5jwSbzGS_lHt1hz6xVuaMbPa8';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent';

export async function POST(request: NextRequest) {
  try {
    console.log('Testing exact curl format...');

    // Use your exact curl request format
    const requestBody = {
      "contents": [{
        "parts": [{
          "text": "Generate an image of a futuristic robot reading a newspaper in a cozy coffee shop"
        }]
      }]
    };

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      return NextResponse.json({ error: `API error: ${response.status} - ${errorText}` }, { status: response.status });
    }

    const responseData = await response.json();
    console.log('SUCCESS! Full response structure:');
    console.log(JSON.stringify(responseData, null, 2));

    // Try to find where the image data is
    if (responseData.candidates && responseData.candidates.length > 0) {
      const candidate = responseData.candidates[0];
      console.log('Candidate content:', JSON.stringify(candidate.content, null, 2));
      
      if (candidate.content && candidate.content.parts) {
        candidate.content.parts.forEach((part: any, index: number) => {
          console.log(`Part ${index}:`, JSON.stringify(part, null, 2));
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: responseData,
      message: 'Check console logs for full response structure'
    });

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
