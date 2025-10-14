/**
 * Axiom SMS Gateway Integration
 * Sends SMS via LTFS Axiom API
 */

export interface AxiomSendSmsParams {
  phone: string;
  message: string;
}

export interface AxiomSmsResponse {
  success: boolean;
  messageid?: string;
  responseid?: string;
  errCode?: number;
  errDescription?: string;
  error?: string;
}

/**
 * Send SMS via Axiom Gateway
 */
export async function sendAxiomSms(
  params: AxiomSendSmsParams & { otp?: string }
): Promise<AxiomSmsResponse> {
  // PRODUCTION credentials as fallback (PM2 env issues)
  const AXIOM_API_URL = process.env.AXIOM_API_URL || 'https://apicloud.ltfs.com/ltfs/api/Axiom_json6listener';
  const AXIOM_CLIENT_ID = process.env.AXIOM_CLIENT_ID || '24b81a0a-b42f-40bb-b293-89373caf6fc8';
  const AXIOM_CLIENT_SECRET = process.env.AXIOM_CLIENT_SECRET || 'E3uT1jA6lG0pU1oH4tT4tX2rO0iK8iV1qS4dI8tX8sF8uQ8yP1';
  const AXIOM_DCODE = process.env.AXIOM_DCODE || 'HLCHTBRD';
  const AXIOM_SUBUID = process.env.AXIOM_SUBUID || 'HLCHTBRDOTP';
  const AXIOM_PWD = process.env.AXIOM_PWD || 'U595vdOamkgE/pGveHUBsA==';
  const AXIOM_SENDER = process.env.AXIOM_SENDER || 'LNTFIN';

  const { phone, message, otp } = params;

  // Build Axiom request payload
  // Note: freefield1 contains the OTP value that replaces {#var#} in the message template
  const payload = {
    dCode: AXIOM_DCODE,
    subuid: AXIOM_SUBUID,
    pwd: AXIOM_PWD,
    sender: AXIOM_SENDER,
    ctype: '1',
    pno: phone,
    msgtxt: message,
    intflag: '1',
    msgtype: 'S',
    alert: '1',
    freefield1: otp || '',
  };

  console.log('[Axiom SMS] Sending to:', phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'));
  console.log('[Axiom SMS] Message preview:', message.substring(0, 50) + '...');
  console.log('[Axiom SMS] Using URL:', AXIOM_API_URL);

  try {
    const response = await fetch(AXIOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-IBM-Client-Id': AXIOM_CLIENT_ID,
        'X-IBM-Client-Secret': AXIOM_CLIENT_SECRET,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log('[Axiom SMS] Full Response:', {
      status: response.status,
      ok: response.ok,
      data: data,
    });

    // Axiom returns errCode: 0 for success
    // Check if request succeeded
    if (data.errCode === 0 && data.messageid) {
      console.log('[Axiom SMS] ✅ Success - MessageID:', data.messageid);
      return {
        success: true,
        messageid: data.messageid,
        responseid: data.responseid,
        errCode: data.errCode,
      };
    }

    // If we got here, something went wrong
    const errorMsg = data.errDescription || data.errDescritption || data.error || `Axiom error code: ${data.errCode}`;
    console.error('[Axiom SMS] ❌ Failed:', errorMsg);
    
    return {
      success: false,
      error: errorMsg,
      errCode: data.errCode,
    };
  } catch (error: any) {
    console.error('[Axiom SMS] Error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
    };
  }
}

/**
 * Get SMS template for OTP
 * NOTE: Axiom uses {#var#} as placeholder, NOT the actual OTP value!
 */
export function getOtpTemplate(otp: string, template: 'bowl' | 'poster' = 'bowl'): string {
  if (template === 'bowl') {
    return `Dear Customer, {#var#} is the one-time password (OTP) for your Bowl Like Bumrah activation by L&T Finance.`;
  } else {
    return `Dear Customer, {#var#} is the one-time password (OTP) for your Poster with Bumrah by L&T Finance Business Loans.`;
  }
}

