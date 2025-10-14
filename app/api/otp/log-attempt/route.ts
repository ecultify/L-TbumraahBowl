import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const body = await request.json();
    const {
      phone,
      attemptType, // 'send' or 'verify'
      success,
      errorMessage = null
    } = body;

    // Feature flag: Skip logging when rate limit is disabled
    if (process.env.OTP_RATE_LIMIT_DISABLED === 'true') {
      return NextResponse.json({
        success: true,
        message: 'OTP logging skipped (rate limiting disabled)'
      });
    }

    // Validate inputs
    if (!phone || !/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Valid 10-digit phone number is required' },
        { status: 400 }
      );
    }

    if (!attemptType || !['send', 'verify'].includes(attemptType)) {
      return NextResponse.json(
        { error: 'Invalid attempt type. Must be "send" or "verify"' },
        { status: 400 }
      );
    }

    if (typeof success !== 'boolean') {
      return NextResponse.json(
        { error: 'Success must be a boolean' },
        { status: 400 }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[OTP Log] Supabase not configured - logging disabled');
      // Return success to not block OTP flow
      return NextResponse.json({
        success: true,
        message: 'Logging service unavailable'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Log the attempt
    const { data, error } = await supabase.rpc('log_otp_attempt', {
      p_phone: phone,
      p_attempt_type: attemptType,
      p_success: success,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_error_message: errorMessage
    });

    if (error) {
      console.error('[OTP Log] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to log attempt' },
        { status: 500 }
      );
    }

    // If this was a failed 3rd send attempt, log violation
    if (attemptType === 'send' && !success) {
      const { data: checkData } = await supabase.rpc('check_otp_rate_limit', {
        p_phone: phone
      });

      const result = checkData && checkData.length > 0 ? checkData[0] : null;

      if (result && result.is_blocked) {
        // Log the violation
        await supabase.rpc('log_rate_limit_violation', {
          p_phone: phone,
          p_attempts_count: result.attempts_count,
          p_ip_address: ipAddress
        });
      }
    }

    return NextResponse.json({
      success: true,
      attemptId: data,
      message: 'Attempt logged successfully'
    });

  } catch (error: any) {
    console.error('[OTP Log] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

