import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const origName = (file as any).name || 'uploaded-video.mp4';
    const ext = path.extname(origName) || '.mp4';
    const safeExt = ext.toLowerCase().includes('mov') ? '.mov' : (ext || '.mp4');
    const filename = `user-upload-${timestamp}${safeExt}`;
    const fullPath = path.join(uploadsDir, filename);
    writeFileSync(fullPath, buffer);

    const publicPath = `/uploads/${filename}`;
    return NextResponse.json({ success: true, publicPath });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload file' }, { status: 500 });
  }
}

