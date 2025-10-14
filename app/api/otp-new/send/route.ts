import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, validatePhoneFormat } from '@/lib/utils/otpGenerator';
import { storeOTP, checkRateLimit } from '@/lib/utils/otpStorage';
import { sendAxiomSmsCurl, getOtpTemplate } from '@/lib/utils/axiomSmsCurl';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, template = 'bowl' } = body;

    // Validate phone
    if (!phone || !validatePhoneFormat(phone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format. Must be 10 digits.' },
        { status: 400 }
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(phone);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          attemptsCount: rateLimit.attemptsCount,
          nextAllowedAt: rateLimit.nextAllowedAt,
        },
        { status: 429 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    console.log('[OTP Send] Generated OTP for:', phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'));

    // Store in database
    const storeResult = await storeOTP(phone, otp);
    if (!storeResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to store OTP' },
        { status: 500 }
      );
    }

    // Send SMS via Axiom (using curl since fetch has auth issues)
    const message = getOtpTemplate(otp, template as 'bowl' | 'poster');
    const smsResult = await sendAxiomSmsCurl({ phone, message, otp });

    if (!smsResult.success) {
      return NextResponse.json(
        { success: false, error: smsResult.error || 'Failed to send SMS' },
        { status: 500 }
      );
    }

    console.log('[OTP Send] Success:', {
      phone: phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'),
      messageid: smsResult.messageid,
    });

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn: 300, // 5 minutes
      messageid: smsResult.messageid,
    });
  } catch (error: any) {
    console.error('[OTP Send] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

