/*
  Post-export helper: Ensure auxiliary static folders (like `otp-test`) are copied
  into the `out/` directory when building with `NEXT_OUTPUT_EXPORT=true`.

  This is useful for Hostinger/static hosting where you want to ship a raw
  HTML+PHP test harness that lives outside of `public/`.
*/

const fs = require('fs');
const path = require('path');

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function copyDir(src, dest) {
  if (!exists(src)) return false;
  fs.mkdirSync(dest, {recursive: true});
  for (const entry of fs.readdirSync(src, {withFileTypes: true})) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
  return true;
}

function main() {
  if (process.env.NEXT_OUTPUT_EXPORT !== 'true') {
    console.log('[post-export] NEXT_OUTPUT_EXPORT is not true; skipping.');
    return;
  }

  const outDir = path.join(process.cwd(), 'out');
  if (!exists(outDir)) {
    console.warn('[post-export] out/ directory not found; nothing to copy.');
    return;
  }

  // Copy otp-test into out/otp-test if present at repo root
  const srcOtp = path.join(process.cwd(), 'otp-test');
  const dstOtp = path.join(outDir, 'otp-test');
  if (copyDir(srcOtp, dstOtp)) {
    console.log('[post-export] Copied otp-test/ -> out/otp-test/');
  } else {
    console.log('[post-export] otp-test/ not found; nothing to copy.');
  }
}

main();

