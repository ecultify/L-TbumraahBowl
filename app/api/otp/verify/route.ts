import { NextRequest, NextResponse } from 'next/server';
import { aesEncryptBase64, aesDecryptBase64 } from '@/lib/utils/ltfsCrypto';

const VERIFY_URL = process.env.LTFS_OTP_VERIFY_URL || 'https://apiclouduat.ltfs.com:1132/LTFSME/api/verifyOtps';
const FLS_ID = process.env.LTFS_FLS_ID || '';
const LEND_TOKEN = process.env.LTFS_LEND_TOKEN || '';
const PRODUCT_TYPE = process.env.LTFS_PRODUCT_TYPE || 'SME';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone: string | undefined = body?.phone;
    const otp: string | undefined = body?.otp;
    const payloadOverride: any = body?.payload; // optional custom plaintext

    if (!FLS_ID || !LEND_TOKEN) {
      return NextResponse.json({ success: false, error: 'Server OTP credentials not configured' }, { status: 500 });
    }

    if ((!phone || !otp) && !payloadOverride) {
      return NextResponse.json({ success: false, error: 'phone+otp or payload is required' }, { status: 400 });
    }

    const plaintextObj = payloadOverride ?? { mobileNumber: phone, otp };
    const plaintext = typeof plaintextObj === 'string' ? plaintextObj : JSON.stringify(plaintextObj);
    const encrypted = aesEncryptBase64(plaintext);

    const upstream = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'flsId': FLS_ID,
        'lendToken': LEND_TOKEN,
        'producttype': PRODUCT_TYPE,
      },
      body: JSON.stringify({ body: encrypted }),
    });

    const text = await upstream.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    let decrypted: any = null;
    if (json && typeof json.body === 'string') {
      try {
        const dec = aesDecryptBase64(json.body);
        try { decrypted = JSON.parse(dec); } catch { decrypted = dec; }
      } catch {}
    }

    return NextResponse.json({ success: upstream.ok, status: upstream.status, json, decrypted });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'OTP verify failed' }, { status: 500 });
  }
}

