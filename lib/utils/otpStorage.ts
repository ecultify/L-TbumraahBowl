import { createClient } from '@supabase/supabase-js';

// Hardcoded credentials as fallback (PM2 env issues)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yyaxqunbbvmftdlhlxaq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5YXhxdW5iYnZtZnRkbGhseGFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDI2OTgwMywiZXhwIjoyMDQ5ODQ1ODAzfQ.wKWv3bIHmhc_XtJ3Qn9r0H5xIXMmKLHD_HF2bSr-LrI';

// Use service role client to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface OTPRecord {
  id?: string;
  phone: string;
  otp: string;
  created_at?: string;
  expires_at?: string;
  is_verified?: boolean;
  attempts?: number;
}

/**
 * Store OTP in database
 */
export async function storeOTP(phone: string, otp: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Calculate expiry (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('otp_verification')
      .insert({
        phone,
        otp,
        expires_at: expiresAt,
        is_verified: false,
        attempts: 0,
      });

    if (error) {
      console.error('[OTP Storage] Error:', error);
      return { success: false, error: error.message };
    }

    console.log('[OTP Storage] Stored OTP for:', phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'));
    return { success: true };
  } catch (error: any) {
    console.error('[OTP Storage] Exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get active OTP for phone number
 */
export async function getActiveOTP(phone: string): Promise<OTPRecord | null> {
  try {
    const { data, error } = await supabase
      .from('otp_verification')
      .select('*')
      .eq('phone', phone)
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('[OTP Storage] Error getting OTP:', error);
      return null;
    }

    return data;
  } catch (error: any) {
    console.error('[OTP Storage] Exception:', error);
    return null;
  }
}

/**
 * Verify OTP and mark as verified
 * 
 * ⚠️ ATTEMPT LIMIT DISABLED - Unlimited verification attempts allowed
 */
export async function verifyAndMarkOTP(
  phone: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const record = await getActiveOTP(phone);

    if (!record) {
      return { success: false, error: 'No active OTP found or OTP expired' };
    }

    const attempts = record.attempts || 0;

    // ⚠️ DISABLED: No attempt limit enforcement
    // if (attempts >= 3) {
    //   return { success: false, error: 'Maximum verification attempts exceeded' };
    // }

    // Check if OTP matches
    if (record.otp !== otp) {
      // Increment attempts (for logging purposes only, no enforcement)
      await supabase
        .from('otp_verification')
        .update({ attempts: attempts + 1 })
        .eq('id', record.id);

      return { success: false, error: 'Invalid OTP' };
    }

    // Mark as verified
    const { error } = await supabase
      .from('otp_verification')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    if (error) {
      console.error('[OTP Storage] Error marking verified:', error);
      return { success: false, error: error.message };
    }

    console.log('[OTP Storage] OTP verified for:', phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'));
    return { success: true };
  } catch (error: any) {
    console.error('[OTP Storage] Exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check rate limit for sending OTP
 * 
 * ⚠️ RATE LIMITING DISABLED - Always returns allowed
 */
export async function checkRateLimit(phone: string): Promise<{
  allowed: boolean;
  attemptsCount: number;
  nextAllowedAt?: string;
}> {
  console.log('[Rate Limit] ⚠️ Rate limiting disabled - allowing OTP send for:', phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'));
  return { allowed: true, attemptsCount: 0 };
}

