import { NextRequest, NextResponse } from 'next/server';

// Expects REMOVEBG_API_KEY in environment
const REMOVEBG_ENDPOINT = 'https://api.remove.bg/v1.0/removebg';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.REMOVEBG_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'REMOVE_BG_API_KEY not configured' }, { status: 500 });
    }

    const { image } = await req.json();
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'image is required' }, { status: 400 });
    }

    // Build multipart/form-data for remove.bg
    const form = new FormData();
    // Prefer PNG with transparency
    form.set('size', 'auto');
    form.set('format', 'png');

    if (image.startsWith('data:')) {
      // Strip data URL prefix and send base64
      const idx = image.indexOf('base64,');
      const b64 = idx !== -1 ? image.substring(idx + 7) : image;
      form.set('image_file_b64', b64);
    } else {
      form.set('image_url', image);
    }

    const r = await fetch(REMOVEBG_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: form as any,
    });

    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json(
        { error: `remove.bg error: ${r.status} ${text}` },
        { status: r.status }
      );
    }

    const buf = await r.arrayBuffer();
    // remove.bg returns image binary (PNG by default)
    const b64out = Buffer.from(buf).toString('base64');
    const dataUrl = `data:image/png;base64,${b64out}`;

    return NextResponse.json({ success: true, imageUrl: dataUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'remove.bg proxy failed' }, { status: 500 });
  }
}

