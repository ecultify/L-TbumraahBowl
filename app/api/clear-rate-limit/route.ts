import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yyaxqunbbvmftdlhlxaq.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5YXhxdW5iYnZtZnRkbGhseGFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDI2OTgwMywiZXhwIjoyMDQ5ODQ1ODAzfQ.wKWv3bIHmhc_XtJ3Qn9r0H5xIXMmKLHD_HF2bSr-LrI';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete all OTP records for this phone
    const { error: otpError } = await supabase
      .from('otp_verification')
      .delete()
      .eq('phone', phone);

    // Delete all rate limit records for this phone
    const { error: rateLimitError } = await supabase
      .from('otp_rate_limit')
      .delete()
      .eq('phone', phone);

    return NextResponse.json({
      success: true,
      message: 'Rate limit cleared for phone: ' + phone,
      errors: {
        otp: otpError?.message || null,
        rateLimit: rateLimitError?.message || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

