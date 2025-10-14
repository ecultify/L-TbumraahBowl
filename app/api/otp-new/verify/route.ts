import { NextRequest, NextResponse } from 'next/server';
import { validateOTPFormat, validatePhoneFormat } from '@/lib/utils/otpGenerator';
import { verifyAndMarkOTP } from '@/lib/utils/otpStorage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp } = body;

    // Validate inputs
    if (!phone || !validatePhoneFormat(phone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    if (!otp || !validateOTPFormat(otp)) {
      return NextResponse.json(
        { success: false, error: 'Invalid OTP format. Must be 6 digits.' },
        { status: 400 }
      );
    }

    console.log('[OTP Verify] Attempt for:', phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'));

    // Verify OTP
    const result = await verifyAndMarkOTP(phone, otp);

    if (!result.success) {
      console.log('[OTP Verify] Failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    console.log('[OTP Verify] Success for:', phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'));

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error: any) {
    console.error('[OTP Verify] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

