import { randomInt } from 'crypto';

/**
 * Generate a cryptographically secure 6-digit OTP
 */
export function generateOTP(): string {
  // Generate a random number between 100000 and 999999
  const otp = randomInt(100000, 1000000);
  return otp.toString();
}

/**
 * Validate OTP format
 */
export function validateOTPFormat(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

/**
 * Validate phone number format (Indian 10-digit)
 */
export function validatePhoneFormat(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

