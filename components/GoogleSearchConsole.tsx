/**
 * Google Search Console Verification Component
 * 
 * Usage: Add your verification code to .env.local:
 * NEXT_PUBLIC_GSC_VERIFICATION_CODE=your-verification-code
 * 
 * This component will add the verification meta tag to your site's <head>
 */

export default function GoogleSearchConsole() {
  const verificationCode = process.env.NEXT_PUBLIC_GSC_VERIFICATION_CODE;

  // Don't render if no verification code is provided
  if (!verificationCode) {
    return null;
  }

  return (
    <meta name="google-site-verification" content={verificationCode} />
  );
}

