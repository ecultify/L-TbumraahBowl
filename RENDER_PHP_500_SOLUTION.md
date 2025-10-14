# PHP 500 Error Solution - Complete Guide

## 🔴 **Current Issue**

```
POST https://darkgoldenrod-alligator-916124.hostingersite.com/api/render-start.php 500 (Internal Server Error)
```

**Analysis data is ready:**
- ✅ Similarity: 86.35%
- ✅ Video URL available
- ✅ Thumbnail captured
- ❌ PHP render fails with 500

---

## 🔍 **Step 1: Debug the Real Error**

I've created a debug endpoint to see what's actually failing.

### **Upload and Test:**

1. **Rebuild:**
   ```bash
   npm run build:hostinger
   ```

2. **Upload these files to Hostinger:**
   - `out/` → everything
   - `public/api/config.php` (UPDATED)
   - `public/api/render-start-debug.php` (NEW)

3. **Test debug endpoint:**
   ```
   POST https://yoursite.com/api/render-start-debug.php
   
   Body:
   {
     "analysisData": {
       "similarity": 86,
       "intensity": 86,
       "...": "..."
     }
   }
   ```

This will show you EXACTLY what's failing:
- Is config.php loading?
- Are env vars set?
- Is cURL available?
- What's the actual error?

---

## 🎯 **Most Likely Issues & Fixes**

### **Issue 1: config.php Not Updated on Server** ⚠️

**Problem:** You accepted the changes locally but haven't uploaded to Hostinger yet.

**Solution:**
1. Rebuild: `npm run build:hostinger`
2. Upload entire `out/` folder
3. **CRITICAL:** Make sure `public/api/config.php` has the updated version with fallbacks

**Verify on server:**
```php
// config.php should start with:
<?php
// Load env.php first to ensure environment variables are set
require_once __DIR__ . '/../env.php';

// Then have fallback values like:
'aws_key' => getenv('AWS_ACCESS_KEY_ID') ?: 'AKIAXNGUVUQNZZTOGQ2J',
```

---

### **Issue 2: cURL Not Enabled**

**Problem:** Hostinger might have cURL disabled.

**Check:**
Create `public/test-curl.php`:
```php
<?php
if (function_exists('curl_init')) {
  echo "cURL is available!";
} else {
  echo "cURL is NOT available - contact Hostinger support";
}
?>
```

Visit: `https://yoursite.com/test-curl.php`

**If cURL is disabled:**
Contact Hostinger support to enable it OR use alternative approach below.

---

### **Issue 3: PHP Errors Being Hidden**

**Problem:** Hostinger hides PHP errors by default.

**Fix:**
Add to top of `public/api/render-start.php`:
```php
<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// rest of code...
```

---

## 🚀 **Alternative Solution: Simplified Lambda Call**

If config issues persist, here's a simpler approach using **direct HTTP POST** to Lambda Function URL (no AWS SDK needed).

### **Step 1: Get Lambda Function URL**

Run locally:
```bash
npx remotion lambda functions ls --region=ap-south-1
```

Look for "Function URL" in output. If none exists, create one:
```bash
npx remotion lambda functions create-url remotion-render-4-0-353-mem3008mb-disk2048mb-600sec --region=ap-south-1 --auth-type=NONE
```

### **Step 2: Create Simplified PHP Script**

```php
<?php
// public/api/render-simple.php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$raw = file_get_contents('php://input');
$json = json_decode($raw, true);

$analysis = $json['analysisData'];
$userVideoUrl = $json['userVideoPublicPath'] ?? null;
$thumbnailDataUrl = $json['thumbnailDataUrl'] ?? null;

// Direct Lambda Function URL (no signing needed)
$lambdaUrl = 'https://YOUR-LAMBDA-URL-HERE.lambda-url.ap-south-1.on.aws/';

$payload = [
  'type' => 'start',
  'serveUrl' => 's3://remotionlambda-apsouth1-fp5224pnxc/sites/bowling-analysis-site',
  'composition' => 'first-frame',
  'inputProps' => [
    'analysisData' => $analysis,
    'userVideoUrl' => $userVideoUrl,
    'thumbnailDataUrl' => $thumbnailDataUrl
  ],
  'codec' => 'h264',
  'outName' => 'video-' . date('YmdHis') . '.mp4',
  'privacy' => 'public'
];

$ch = curl_init($lambdaUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode >= 200 && $httpCode < 300) {
  $result = json_decode($response, true);
  echo json_encode([
    'success' => true,
    'renderId' => $result['renderId'] ?? 'unknown'
  ]);
} else {
  echo json_encode([
    'success' => false,
    'error' => 'Lambda call failed',
    'details' => $response
  ]);
}
```

This approach:
- ✅ No AWS SDK needed
- ✅ No signing needed (if auth-type=NONE)
- ✅ Simple cURL call
- ✅ Much easier to debug

---

## 🎯 **Recommended Action Plan**

### **Plan A: Debug Current Setup (5 minutes)**

1. Rebuild: `npm run build:hostinger`
2. Upload to Hostinger (make sure config.php is updated)
3. Test: `POST /api/render-start-debug.php`
4. Read the error message
5. Fix based on specific error

### **Plan B: Lambda Function URL (10 minutes)**

1. Create Lambda Function URL (command above)
2. Create `render-simple.php` with your Function URL
3. Update frontend to use `/api/render-simple.php`
4. Test

### **Plan C: Manual Trigger (Temporary)**

While fixing, add a "Manual Render" button that:
1. Downloads analysis JSON
2. User runs locally: `npx remotion lambda render ... --props=downloaded.json`
3. Gets video URL from S3

---

## 📝 **What To Check Right Now**

1. **Is config.php updated on server?**
   - Check file modification date
   - Verify it has `require_once __DIR__ . '/../env.php';`
   - Verify it has fallback values

2. **Is env.php uploaded?**
   - Should be at `public/env.php`
   - Contains all AWS credentials

3. **Test debug endpoint:**
   - Upload `render-start-debug.php`
   - Call it with analysis data
   - Read the detailed error

---

## 💡 **Quick Win: Use Lambda Function URL**

This is honestly the BEST solution:

**Advantages:**
- No AWS signing complexity
- Simple HTTP POST
- Easy to debug
- Works with basic cURL
- No config issues

**To implement:**
```bash
# 1. Create Function URL
npx remotion lambda functions create-url remotion-render-4-0-353-mem3008mb-disk2048mb-600sec --region=ap-south-1 --auth-type=NONE

# 2. Copy the URL shown

# 3. Use in render-simple.php (code above)

# 4. Done!
```

---

## 🔧 **Next Steps**

**Choose ONE:**

1. ⏰ **5 min:** Debug with `render-start-debug.php`
2. ⏰ **10 min:** Create Lambda Function URL + simple PHP
3. ⏰ **2 min:** Test if cURL is available

**Let me know which approach you want and I'll help you implement it!**

The Lambda Function URL approach is honestly the cleanest solution - no complex AWS signing, just a simple HTTP POST! 🚀

