'use client';

/**
 * New OTP Service using Axiom SMS Gateway
 * This is the client-side wrapper for the new OTP API
 */

export interface OTPSendResponse {
  success: boolean;
  message?: string;
  error?: string;
  expiresIn?: number;
  messageid?: string;
  attemptsCount?: number;
  nextAllowedAt?: string;
}

export interface OTPVerifyResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Send OTP using new Axiom implementation
 */
export async function sendOTPNew(
  phone: string,
  template: 'bowl' | 'poster' = 'bowl'
): Promise<OTPSendResponse> {
  try {
    console.log('[OTP New] Sending OTP to:', phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'));
    
    const response = await fetch('/api/otp-new/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, template }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[OTP New] Send failed:', data.error);
      return {
        success: false,
        error: data.error || 'Failed to send OTP',
        attemptsCount: data.attemptsCount,
        nextAllowedAt: data.nextAllowedAt,
      };
    }

    console.log('[OTP New] OTP sent successfully');
    return data;
  } catch (error: any) {
    console.error('[OTP New] Send error:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

/**
 * Verify OTP using new Axiom implementation
 */
export async function verifyOTPNew(phone: string, otp: string): Promise<OTPVerifyResponse> {
  try {
    console.log('[OTP New] Verifying OTP for:', phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'));
    
    const response = await fetch('/api/otp-new/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[OTP New] Verify failed:', data.error);
      return {
        success: false,
        error: data.error || 'Failed to verify OTP',
      };
    }

    console.log('[OTP New] OTP verified successfully');
    return data;
  } catch (error: any) {
    console.error('[OTP New] Verify error:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

