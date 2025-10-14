const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, {recursive: true});
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

const outDir = path.join(process.cwd(), 'out');
const deployDir = path.join(process.cwd(), 'deploy');
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, {recursive: true, force: true});
}
fs.mkdirSync(deployDir, {recursive: true});

// Copy static export
copyRecursive(outDir, deployDir);

// Ensure PHP backend is present under /api
const phpApiSrc = path.join(process.cwd(), 'public', 'api');
const phpApiDest = path.join(deployDir, 'api');
copyRecursive(phpApiSrc, phpApiDest);

console.log('[deploy:prepare] Prepared deploy/ with static site and PHP backend');

