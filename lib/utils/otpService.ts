'use client';

import { encrypt } from '@/lib/utils/encryption';

export async function requestOtp(phone: string) {
  const BASE = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || '';
  const EXT = process.env.NEXT_PUBLIC_BACKEND_EXT || '';
  const PHP_PROXY = process.env.NEXT_PUBLIC_PHP_PROXY_URL || '';
  const candidates = [
    `/api/otp-new/send`, // PRIMARY: New Axiom SMS Gateway (no encryption needed)
    `/proxy.php?endpoint=sendPosterOtp`, // FALLBACK: Old LTFS encrypted endpoint
    `${PHP_PROXY}/api/proxy.php?endpoint=sendPosterOtp`,
    `${BASE}/api/proxy.php?endpoint=sendPosterOtp`,
    `${PHP_PROXY}/api/send-otp`, // PHP proxy server
    `${BASE}/api/send-otp.php`,
    `${BASE}/api/send-otp${EXT}`,
    `${BASE}/api/send-otp`,
  ].filter((v, i, a) => v && a.indexOf(v) === i);
  
  try {
    console.log('[OTP] requestOtp start', { BASE, EXT, candidates, phone });
  } catch {}
  
  let lastErr: any = null;
  for (const url of candidates) {
    try {
      console.log('[OTP] requestOtp attempt', { url, payload: { phone } });
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      console.log('[OTP] requestOtp response status', resp.status, 'url', url);
      const text = await resp.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      console.log('[OTP] requestOtp response body', data);
      if (resp.ok && data?.success) {
        console.log('[OTP] requestOtp SUCCESS via URL:', url);
        const eff = (data && data.proxyDebug && (data.proxyDebug.effectiveUrl || (data.proxyDebug.configLoaded && data.proxyDebug.configLoaded.targetUrl))) || null;
        if (eff) console.log('[OTP] Upstream endpoint used:', eff);
        return data;
      }
      lastErr = new Error(data?.error || `Failed to send OTP (status ${resp.status})`);
    } catch (e) { 
      console.error('[OTP] requestOtp error for url', url, e);
      lastErr = e; 
    }
  }
  throw (lastErr || new Error('Failed to send OTP'));
}

export async function verifyOtp(phone: string, otp: string) {
  const BASE = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || '';
  const EXT = process.env.NEXT_PUBLIC_BACKEND_EXT || '';
  const PHP_PROXY = process.env.NEXT_PUBLIC_PHP_PROXY_URL || '';
  const candidates = [
    `/api/otp-new/verify`, // PRIMARY: New Axiom SMS Gateway verification
    `/proxy.php?endpoint=verifyOtps`, // FALLBACK: Old LTFS encrypted endpoint
    `${PHP_PROXY}/api/proxy.php?endpoint=verifyOtps`,
    `${BASE}/api/proxy.php?endpoint=verifyOtps`,
    `${PHP_PROXY}/api/verify-otp`, // PHP proxy server
    `${BASE}/api/verify-otp.php`,
    `${BASE}/api/verify-otp${EXT}`,
    `${BASE}/api/verify-otp`,
  ].filter((v, i, a) => v && a.indexOf(v) === i);
  
  try { 
    console.log('[OTP] verifyOtp start', { BASE, EXT, candidates, phone, otp }); 
  } catch {}
  
  let lastErr: any = null;
  for (const url of candidates) {
    try {
      console.log('[OTP] verifyOtp attempt', { url, payload: { phone, otp } });
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });
      console.log('[OTP] verifyOtp response status', resp.status, 'url', url);
      const text = await resp.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      console.log('[OTP] verifyOtp response body', data);
      if (resp.ok && data?.success) {
        console.log('[OTP] verifyOtp SUCCESS via URL:', url);
        const eff = (data && data.proxyDebug && (data.proxyDebug.effectiveUrl || (data.proxyDebug.configLoaded && data.proxyDebug.configLoaded.targetUrl))) || null;
        if (eff) console.log('[OTP] Upstream endpoint used:', eff);
        return data;
      }
      lastErr = new Error(data?.error || `Failed to verify OTP (status ${resp.status})`);
    } catch (e) { 
      console.error('[OTP] verifyOtp error for url', url, e);
      lastErr = e; 
    }
  }
  throw (lastErr || new Error('Failed to verify OTP'));
}

// Optional: Client-side encryption flow with FLS placeholder injection
export async function requestOtpViaSingleProxyEncrypted(phone: string, customerName?: string, loanApplicationId?: string) {
  const BASE = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || '';
  const PHP_PROXY = process.env.NEXT_PUBLIC_PHP_PROXY_URL || '';
  const url = (PHP_PROXY || BASE || '') + '/proxy.php?endpoint=sendPosterOtp';
  const payload = {
    number: phone,
    Customer_Name: customerName || 'Test User',
    Loan_Application_Id: loanApplicationId || `BL${Date.now()}`,
    flsId: 'SECURED_VIA_PROXY',
  };
  console.log('[OTP] [EncryptedFlow] Building plaintext for send:', payload);
  const b64 = encrypt(JSON.stringify(payload));
  if (!b64) throw new Error('Encryption failed');
  console.log('[OTP] [EncryptedFlow] Encrypted body length:', b64.length);
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: b64 }) });
  const text = await resp.text();
  let data: any; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  console.log('[OTP] [EncryptedFlow] Proxy response:', data);
  if (!resp.ok) throw new Error(data?.error || `Send failed (${resp.status})`);
  return data;
}

export async function verifyOtpViaSingleProxyEncrypted(phone: string, otp: string, customerName?: string, loanApplicationId?: string) {
  const BASE = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || '';
  const PHP_PROXY = process.env.NEXT_PUBLIC_PHP_PROXY_URL || '';
  const url = (PHP_PROXY || BASE || '') + '/proxy.php?endpoint=verifyOtps';
  const payload = {
    number: phone,
    otp,
    Customer_Name: customerName || 'Test User',
    Loan_Application_Id: loanApplicationId || `BL${Date.now()}`,
    flsId: 'SECURED_VIA_PROXY',
  };
  console.log('[OTP] [EncryptedFlow] Building plaintext for verify:', { ...payload, otp: '******' });
  const b64 = encrypt(JSON.stringify(payload));
  if (!b64) throw new Error('Encryption failed');
  console.log('[OTP] [EncryptedFlow] Encrypted body length:', b64.length);
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: b64 }) });
  const text = await resp.text();
  let data: any; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  console.log('[OTP] [EncryptedFlow] Proxy response:', data);
  if (!resp.ok) throw new Error(data?.error || `Verify failed (${resp.status})`);
  return data;
}
