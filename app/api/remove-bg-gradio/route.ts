import { NextRequest, NextResponse } from 'next/server';

// Simplified: Just skip background removal for now in local dev
// The PHP version will handle this on production (Hostinger)

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ success: false, error: 'image is required' }, { status: 400 });
    }

    console.log('[GRADIO BG REMOVAL] Skipping in local dev - just returning original image');
    console.log('[GRADIO BG REMOVAL] On production (Hostinger), use the PHP version for actual background removal');

    // Just return the original image for local dev
    // The Hostinger PHP version will do actual background removal
    return NextResponse.json({ 
      success: true, 
      imageUrl: image,
      note: 'Local dev: Returned original image. Deploy to Hostinger for actual background removal.'
    });

  } catch (e: any) {
    console.error('[GRADIO BG REMOVAL] Error:', e);
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
    service: 'Gradio BG Removal (Production only)',
    note: 'This endpoint works on Hostinger with PHP. Local dev returns original image.'
  });
}

