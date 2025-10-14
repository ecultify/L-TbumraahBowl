import { NextRequest, NextResponse } from 'next/server';

// Background removal using Segmind Bria API
const SEGMIND_API_KEY = 'SG_c7a0d229dc5d25b4';
const SEGMIND_API_URL = 'https://api.segmind.com/v1/bria-remove-background';

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ success: false, error: 'image is required' }, { status: 400 });
    }

    // Convert data URL to base64 (remove data:image prefix if present)
    let base64Image = image;
    if (image.startsWith('data:')) {
      const base64Match = image.match(/^data:image\/[a-z]+;base64,(.+)$/);
      if (base64Match && base64Match[1]) {
        base64Image = base64Match[1];
      }
    }

    console.log('[SEGMIND BG REMOVAL] Calling Segmind Bria API...');

    // Call Segmind Bria API
    const response = await fetch(SEGMIND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SEGMIND_API_KEY
      },
      body: JSON.stringify({
        image: base64Image,
        preserve_alpha: true,
        visual_input_content_moderation: false,
        visual_output_content_moderation: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = 'Segmind Bria API error';
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMsg = errorJson.error;
        }
      } catch (e) {
        // Keep generic error message
      }

      console.error('[SEGMIND BG REMOVAL] Error:', errorMsg);
      return NextResponse.json(
        { success: false, error: errorMsg, detail: errorText },
        { status: response.status }
      );
    }

    // Segmind returns the image binary directly (PNG with transparency)
    const imageBuffer = await response.arrayBuffer();
    const base64ImageResult = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:image/png;base64,${base64ImageResult}`;

    console.log('[SEGMIND BG REMOVAL] Success! Background removed using Segmind Bria API');

    return NextResponse.json({ 
      success: true, 
      imageUrl: dataUrl 
    });

  } catch (e: any) {
    console.error('[SEGMIND BG REMOVAL] Error:', e);
    return NextResponse.json(
      { success: false, error: e?.message || 'Background removal failed' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    service: 'Segmind Bria Background Removal',
    model: 'bria-remove-background',
    status: 'ready'
  });
}

