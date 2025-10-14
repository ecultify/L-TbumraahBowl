import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const body = await request.json();
    const { phone } = body;

    // Feature flag: Disable OTP rate limiting entirely when set
    if (process.env.OTP_RATE_LIMIT_DISABLED === 'true') {
      return NextResponse.json({
        success: true,
        isBlocked: false,
        attemptsCount: 0,
        unblockAt: null,
        hoursRemaining: 0,
        message: 'Rate limiting disabled by OTP_RATE_LIMIT_DISABLED'
      });
    }

    // Validate phone number
    if (!phone || !/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Valid 10-digit phone number is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[OTP Rate Limit] Supabase not configured');
      // Return not blocked to allow OTP flow
      return NextResponse.json({
        isBlocked: false,
        attemptCount: 0,
        maxAttempts: 3,
        message: 'Rate limit service unavailable'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the rate limit check function
    const { data, error } = await supabase.rpc('check_otp_rate_limit', {
      p_phone: phone
    });

    if (error) {
      console.error('[OTP Rate Limit] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to check rate limit' },
        { status: 500 }
      );
    }

    // Extract result (function returns array with single row)
    const result = data && data.length > 0 ? data[0] : null;

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to check rate limit' },
        { status: 500 }
      );
    }

    const {
      is_blocked,
      attempts_count,
      unblock_at,
      hours_remaining
    } = result;

    // Return the result
    return NextResponse.json({
      success: true,
      isBlocked: is_blocked,
      attemptsCount: attempts_count,
      unblockAt: unblock_at,
      hoursRemaining: hours_remaining ? parseFloat(hours_remaining.toFixed(2)) : 0,
      message: is_blocked
        ? `You've reached the maximum OTP attempts (3 per 24 hours). Please try again in ${Math.ceil(hours_remaining)} hours.`
        : `${attempts_count}/3 OTP attempts used in the last 24 hours.`
    });

  } catch (error: any) {
    console.error('[OTP Rate Limit] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

