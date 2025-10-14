/**
 * Axiom SMS Gateway using curl (since Node.js fetch has auth issues)
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AxiomSendSmsParams {
  phone: string;
  message: string;
  otp?: string;
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
 * Send SMS via Axiom Gateway using curl
 * (Workaround for Node.js fetch authentication issues)
 */
export async function sendAxiomSmsCurl(
  params: AxiomSendSmsParams
): Promise<AxiomSmsResponse> {
  const { phone, message, otp } = params;

  // PRODUCTION credentials
  const AXIOM_API_URL = 'https://apicloud.ltfs.com/ltfs/api/Axiom_json6listener';
  const AXIOM_CLIENT_ID = '24b81a0a-b42f-40bb-b293-89373caf6fc8';
  const AXIOM_CLIENT_SECRET = 'E3uT1jA6lG0pU1oH4tT4tX2rO0iK8iV1qS4dI8tX8sF8uQ8yP1';

  const payload = {
    dCode: 'HLCHTBRD',
    subuid: 'HLCHTBRDOTP',
    pwd: 'U595vdOamkgE/pGveHUBsA==',
    sender: 'LNTFIN',
    ctype: '1',
    pno: phone,
    msgtxt: message,
    intflag: '1',
    msgtype: 'S',
    alert: '1',
    freefield1: '',
  };

  console.log('[Axiom SMS CURL] Sending to:', phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'));
  console.log('[Axiom SMS CURL] Message:', message.substring(0, 50) + '...');

  try {
    // Build curl command
    const curlCommand = `curl --location '${AXIOM_API_URL}' \\
      --header 'X-IBM-Client-Id: ${AXIOM_CLIENT_ID}' \\
      --header 'X-IBM-Client-Secret: ${AXIOM_CLIENT_SECRET}' \\
      --header 'Content-Type: application/json' \\
      --data '${JSON.stringify(payload).replace(/'/g, "'\\''")}'`;

    console.log('[Axiom SMS CURL] Executing curl...');

    const { stdout, stderr } = await execAsync(curlCommand);

    if (stderr && !stdout) {
      console.error('[Axiom SMS CURL] Error:', stderr);
      return {
        success: false,
        error: stderr,
      };
    }

    const data = JSON.parse(stdout);

    console.log('[Axiom SMS CURL] Response:', {
      errCode: data.errCode,
      messageid: data.messageid,
      success: data.success,
    });

    // Check if successful
    if (data.errCode === 0 && data.messageid) {
      console.log('[Axiom SMS CURL] ✅ Success - MessageID:', data.messageid);
      return {
        success: true,
        messageid: data.messageid,
        responseid: data.responseid,
        errCode: data.errCode,
      };
    }

    // Failed
    const errorMsg = data.errDescription || data.errDescritption || data.error || `Axiom error code: ${data.errCode}`;
    console.error('[Axiom SMS CURL] ❌ Failed:', errorMsg);
    
    return {
      success: false,
      error: errorMsg,
      errCode: data.errCode,
    };
  } catch (error: any) {
    console.error('[Axiom SMS CURL] Exception:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
    };
  }
}

/**
 * Get SMS template for OTP
 */
export function getOtpTemplate(otp: string, template: 'bowl' | 'poster' = 'bowl'): string {
  if (template === 'bowl') {
    return `Dear Customer, ${otp} is the one-time password (OTP) for your Bowl Like Bumrah activation by L&T Finance.`;
  } else {
    return `Dear Customer, ${otp} is the one-time password (OTP) for your Poster with Bumrah by L&T Finance Business Loans.`;
  }
}

