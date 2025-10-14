# 🔐 OTP Implementation - Complete Technical Details

## 📋 Table of Contents
1. [Payload Variables](#payload-variables)
2. [Encryption/Decryption Details](#encryptiondecryption-details)
3. [Request Flow](#request-flow)
4. [Configuration Values](#configuration-values)
5. [API Endpoints](#api-endpoints)
6. [Code Flow Diagram](#code-flow-diagram)

---

## 1. Payload Variables

### 📤 **Variables Sent in OTP Payload (Before Encryption)**

The payload is a JSON object with the following fields:

```json
{
  "number": "9876543210",              // 10-digit phone number
  "Customer_Name": "Test User",        // Customer name (default: "Test User")
  "Loan_Application_Id": "BL1234567890", // Unique loan ID (format: BL + timestamp)
  "flsId": "VEN03799"                  // Fixed FLS ID
}
```

| Variable | Type | Source | Description | Example |
|----------|------|--------|-------------|---------|
| `number` | string | User Input | 10-digit phone number | `"9876543210"` |
| `Customer_Name` | string | User Input / Default | Customer's name | `"Test User"` |
| `Loan_Application_Id` | string | Generated | Unique ID (BL + timestamp) | `"BL1733481332"` |
| `flsId` | string | Config | Fixed franchise/location ID | `"VEN03799"` |

### 📍 **Variable Sources in Code**

**Frontend (components/DetailsCard.tsx):**
```typescript
// User inputs
const [name, setName] = useState('');     // Customer name
const [phone, setPhone] = useState('');   // Phone number
```

**Hostinger PHP (public/api/send-otp.php - lines 50-61):**
```php
$customerName = isset($input['customerName']) && is_string($input['customerName']) && $input['customerName'] !== ''
  ? $input['customerName']
  : 'Test User';  // Default if not provided

$loanId = isset($input['loanApplicationId']) && is_string($input['loanApplicationId']) && $input['loanApplicationId'] !== ''
  ? $input['loanApplicationId']
  : ('BL' . time());  // Generate with timestamp

$plaintextObj = [
  'number' => $phone,
  'Customer_Name' => $customerName,
  'Loan_Application_Id' => $loanId,
  'flsId' => $flsId,  // From env.php: 'VEN03799'
];
```

---

## 2. Encryption/Decryption Details

### 🔐 **Encryption Algorithm**

**Algorithm:** AES-256-CBC with PKCS7 padding

### 🔑 **Encryption Keys & Parameters**

| Parameter | Value | Length | Format |
|-----------|-------|--------|--------|
| **AES Key** | `njCYgvlucmiQoeWydE32jjTTrdpB9Wg8` | 32 bytes | UTF-8 String |
| **IV (Initialization Vector)** | `VFoEgjZNsT1pAtXS` | 16 bytes | UTF-8 String |
| **Cipher Mode** | CBC | - | AES-256-CBC |
| **Padding** | PKCS7 | - | Standard |
| **Output Encoding** | Base64 | Variable | Standard Base64 |

### 📝 **Encryption Process**

#### **Step 1: Create JSON Payload**
```javascript
const payload = {
  number: "9876543210",
  Customer_Name: "Test User",
  Loan_Application_Id: "BL1733481332",
  flsId: "VEN03799"
};
const plaintext = JSON.stringify(payload);
```

#### **Step 2: Encrypt with AES-256-CBC**

**JavaScript/TypeScript (lib/utils/encryption.ts):**
```typescript
import CryptoJS from 'crypto-js';

const KEY_MAIN = "njCYgvlucmiQoeWydE32jjTTrdpB9Wg8";
const INIT_VECTOR = "VFoEgjZNsT1pAtXS";

export const encrypt = (value: string): string | null => {
  const plaintextWordArray = CryptoJS.enc.Utf8.parse(value);
  const key = CryptoJS.enc.Utf8.parse(KEY_MAIN);
  const iv = CryptoJS.enc.Utf8.parse(INIT_VECTOR);
  
  const encrypted = CryptoJS.AES.encrypt(plaintextWordArray, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return encrypted.toString(); // Base64 encoded
};
```

**PHP (otp-test/lib/encryption.php):**
```php
define('AES_KEY', 'njCYgvlucmiQoeWydE32jjTTrdpB9Wg8');
define('AES_IV', 'VFoEgjZNsT1pAtXS');

function encrypt($plaintext) {
  $key = AES_KEY;  // 32 bytes
  $iv = AES_IV;    // 16 bytes
  
  $encrypted = openssl_encrypt(
    $plaintext,
    'AES-256-CBC',
    $key,
    OPENSSL_RAW_DATA,
    $iv
  );
  
  return base64_encode($encrypted);
}
```

#### **Step 3: Output**
The encrypted payload is a Base64-encoded string (example):
```
"U2FsdGVkX1+Abc123...xyz789==" // Actual length varies (~200-300 chars)
```

### 🔓 **Decryption Process**

**JavaScript/TypeScript:**
```typescript
export const decrypt = (encrypted: string): string | null => {
  const key = CryptoJS.enc.Utf8.parse(KEY_MAIN);
  const iv = CryptoJS.enc.Utf8.parse(INIT_VECTOR);
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return decrypted.toString(CryptoJS.enc.Utf8);
};
```

**PHP:**
```php
function decrypt($encrypted) {
  $key = AES_KEY;
  $iv = AES_IV;
  
  $encryptedData = base64_decode($encrypted, true);
  
  $decrypted = openssl_decrypt(
    $encryptedData,
    'AES-256-CBC',
    $key,
    OPENSSL_RAW_DATA,
    $iv
  );
  
  return $decrypted;
}
```

---

## 3. Request Flow

### 🔄 **Complete Flow: Frontend → Hostinger → LTFS**

```
┌─────────────────┐
│   User Browser  │
│  (React/Next.js)│
└────────┬────────┘
         │ 1. User enters phone number
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Frontend (components/DetailsCard.tsx)                  │
│  - Calls: requestOtp(phone)                            │
└────────┬────────────────────────────────────────────────┘
         │ 2. POST { phone: "9876543210" }
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Hostinger PHP Server (public/api/send-otp.php)        │
│                                                         │
│  Step 1: Load Configuration                            │
│    - flsId = "VEN03799"                                │
│    - lendToken = "eyJhbGciOiJIUzI1NiJ9..."             │
│    - aesKey = "njCYgvlucmiQoeWydE32jjTTrdpB9Wg8"       │
│    - aesIv = "VFoEgjZNsT1pAtXS"                        │
│                                                         │
│  Step 2: Create Payload                                │
│    {                                                    │
│      "number": "9876543210",                           │
│      "Customer_Name": "Test User",                     │
│      "Loan_Application_Id": "BL1733481332",            │
│      "flsId": "VEN03799"                               │
│    }                                                    │
│                                                         │
│  Step 3: Encrypt Payload                               │
│    - Algorithm: AES-256-CBC                            │
│    - Key: aesKey (32 bytes)                            │
│    - IV: aesIv (16 bytes)                              │
│    - Output: Base64 string                             │
│                                                         │
│  Step 4: Prepare LTFS Request                          │
│    URL: https://apiclouduat.ltfs.com:1132/LTFSME/api/  │
│         sendBumraPosterOtp/                            │
│                                                         │
│    Headers:                                             │
│      Content-Type: application/json                    │
│      flsId: VEN03799                                   │
│      lendToken: eyJhbGciOiJIUzI1NiJ9...                │
│      producttype: SME                                  │
│                                                         │
│    Body:                                                │
│      {                                                  │
│        "body": "<base64_encrypted_payload>"            │
│      }                                                  │
└────────┬────────────────────────────────────────────────┘
         │ 3. HTTPS POST Request
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  LTFS API Server                                        │
│  https://apiclouduat.ltfs.com:1132                     │
│                                                         │
│  Endpoint: /LTFSME/api/sendBumraPosterOtp/             │
│                                                         │
│  Step 1: Validate Headers                              │
│    - Check flsId: "VEN03799"                           │
│    - Verify lendToken (JWT)                            │
│    - Check producttype: "SME"                          │
│                                                         │
│  Step 2: Decrypt Request Body                          │
│    - Extract "body" field                              │
│    - Decrypt using AES-256-CBC                         │
│    - Parse JSON payload                                │
│                                                         │
│  Step 3: Send OTP                                       │
│    - Generate 6-digit OTP                              │
│    - Send SMS to phone number                          │
│    - Store OTP for verification                        │
│                                                         │
│  Step 4: Encrypt Response                              │
│    - Create response payload                           │
│    - Encrypt with same AES key/IV                      │
│    - Return as { "body": "encrypted_response" }        │
└────────┬────────────────────────────────────────────────┘
         │ 4. Response: { "body": "encrypted_data" }
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Hostinger PHP Server (public/api/send-otp.php)        │
│                                                         │
│  Step 5: Process LTFS Response                         │
│    - Receive response                                  │
│    - Extract "body" field                              │
│    - Decrypt response                                  │
│    - Parse decrypted JSON                              │
│                                                         │
│  Step 6: Return to Frontend                            │
│    {                                                    │
│      "success": true,                                  │
│      "status": 200,                                    │
│      "json": { ... }                                   │
│    }                                                    │
└────────┬────────────────────────────────────────────────┘
         │ 5. JSON Response
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Frontend (components/DetailsCard.tsx)                  │
│  - Show OTP input boxes                                │
│  - Start 60-second timer                               │
│  - Enable OTP verification                             │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Configuration Values

### 🔧 **Hostinger Configuration (public/env.php)**

```php
$serverDefaults = [
  // LTFS OTP Credentials
  'LTFS_FLS_ID'         => 'VEN03799',
  'LTFS_LEND_TOKEN'     => 'eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJWZW4wMzc5OSIsImlhdCI6MTczMzQ4MTMzMiwic3ViIjoiSldUIFRlc3QiLCJpc3MiOiJMVCIsImV4cCI6MTczMzUxMDEzMn0.cIQrN0l6U1c1RW5aZkhJYnfGTQrm1BUlPdp4MzVvcDk',
  'LTFS_PRODUCT_TYPE'   => 'SME',
  
  // AES Encryption Parameters
  'LTFS_AES_KEY'        => 'njCYgvlucmiQoeWydE32jjTTrdpB9Wg8',
  'LTFS_AES_IV'         => 'VFoEgjZNsT1pAtXS',
  
  // LTFS API Endpoints
  'LTFS_OTP_SEND_URL'   => 'https://apiclouduat.ltfs.com:1132/LTFSME/api/sendBumraPosterOtp/',
  'LTFS_OTP_VERIFY_URL' => 'https://apiclouduat.ltfs.com:1132/LTFSME/api/verifyOtps',
];
```

### 📍 **Configuration Details**

| Configuration | Value | Description | Source |
|---------------|-------|-------------|--------|
| **LTFS_FLS_ID** | `VEN03799` | Franchise/Location ID | Provided by LTFS |
| **LTFS_LEND_TOKEN** | `eyJhbGci...` | JWT authentication token | Provided by LTFS (expires periodically) |
| **LTFS_PRODUCT_TYPE** | `SME` | Product category | Fixed value |
| **LTFS_AES_KEY** | `njCYgvlucmiQoeWydE32jjTTrdpB9Wg8` | 32-byte encryption key | Provided by LTFS |
| **LTFS_AES_IV** | `VFoEgjZNsT1pAtXS` | 16-byte initialization vector | Provided by LTFS |
| **LTFS_OTP_SEND_URL** | `https://apiclouduat.ltfs.com:1132/...` | OTP send endpoint | LTFS UAT environment |
| **LTFS_OTP_VERIFY_URL** | `https://apiclouduat.ltfs.com:1132/...` | OTP verify endpoint | LTFS UAT environment |

---

## 5. API Endpoints

### 📡 **Hostinger Application Endpoints**

#### **1. Send OTP Endpoint**
```
POST https://your-hostinger-domain.com/api/send-otp.php
```

**Request:**
```json
{
  "phone": "9876543210",
  "customerName": "Test User",           // Optional (defaults to "Test User")
  "loanApplicationId": "BL1733481332"   // Optional (auto-generated if not provided)
}
```

**Response (Success):**
```json
{
  "success": true,
  "status": 200,
  "json": {
    "body": "encrypted_ltfs_response"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message",
  "status": 400
}
```

#### **2. Verify OTP Endpoint**
```
POST https://your-hostinger-domain.com/api/verify-otp.php
```

**Request:**
```json
{
  "phone": "9876543210",
  "otp": "123456"
}
```

---

### 🌐 **LTFS Domain Endpoints**

#### **1. Send OTP (LTFS)**
```
POST https://apiclouduat.ltfs.com:1132/LTFSME/api/sendBumraPosterOtp/
```

**Headers:**
```
Content-Type: application/json
flsId: VEN03799
lendToken: eyJhbGciOiJIUzI1NiJ9...
producttype: SME
```

**Body:**
```json
{
  "body": "U2FsdGVkX1+Abc123...xyz789=="
}
```
*Note: The "body" field contains the Base64-encoded AES-encrypted payload*

**Encrypted Payload (before encryption):**
```json
{
  "number": "9876543210",
  "Customer_Name": "Test User",
  "Loan_Application_Id": "BL1733481332",
  "flsId": "VEN03799"
}
```

#### **2. Verify OTP (LTFS)**
```
POST https://apiclouduat.ltfs.com:1132/LTFSME/api/verifyOtps
```

**Headers:** Same as Send OTP

**Body:**
```json
{
  "body": "encrypted_verification_payload"
}
```

**Encrypted Verification Payload (before encryption):**
```json
{
  "number": "9876543210",
  "otp": "123456",
  "flsId": "VEN03799"
}
```

---

## 6. Code Flow Diagram

### 🔄 **Detailed Code Flow**

```
┌────────────────────────────────────────────────────────────────┐
│ 1. FRONTEND (User Action)                                      │
│    File: components/DetailsCard.tsx                            │
│    Line: 108-135 (handleGetOtpReal)                           │
│                                                                 │
│    - User enters phone number                                  │
│    - User clicks "Get OTP"                                     │
│    - Calls: requestOtp(phone)                                  │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ 2. OTP SERVICE LAYER                                           │
│    File: lib/utils/otpService.ts                              │
│    Function: requestOtp(phone: string)                        │
│    Lines: 5-49                                                │
│                                                                 │
│    - Constructs fetch request                                  │
│    - Tries multiple endpoint candidates:                       │
│      1. /api/proxy.php?endpoint=sendPosterOtp                 │
│      2. /api/send-otp.php                                     │
│      3. /api/send-otp                                         │
│    - Sends: { "phone": "9876543210" }                         │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. HOSTINGER PHP ENDPOINT                                      │
│    File: public/api/send-otp.php                              │
│    Lines: 1-145                                               │
│                                                                 │
│    Line 2:  require_once __DIR__ . '/../env.php';            │
│             - Loads LTFS credentials & encryption keys         │
│                                                                 │
│    Lines 7-12: Load Configuration                             │
│    $flsId = getenv('LTFS_FLS_ID') ?: '';                     │
│    $lendToken = getenv('LTFS_LEND_TOKEN') ?: '';             │
│    $aesKey = getenv('LTFS_AES_KEY') ?: '...';                │
│    $aesIv = getenv('LTFS_AES_IV') ?: '...';                  │
│                                                                 │
│    Lines 40-42: Parse Request                                 │
│    $input = json_decode(file_get_contents('php://input'));   │
│    $phone = $input['phone'];                                  │
│                                                                 │
│    Lines 50-61: Build Payload                                 │
│    $plaintextObj = [                                          │
│      'number' => $phone,                                      │
│      'Customer_Name' => $customerName,                        │
│      'Loan_Application_Id' => 'BL' . time(),                 │
│      'flsId' => $flsId                                        │
│    ];                                                          │
│                                                                 │
│    Line 21-24: Encrypt Payload                                │
│    function aes_encrypt_b64($plaintext, $key, $iv) {         │
│      $encrypted = openssl_encrypt(                            │
│        $plaintext, 'AES-256-CBC', $key,                       │
│        OPENSSL_RAW_DATA, $iv                                  │
│      );                                                        │
│      return base64_encode($encrypted);                        │
│    }                                                           │
│                                                                 │
│    Line 63: Encrypt                                            │
│    $encrypted = aes_encrypt_b64($plaintext, $aesKey, $aesIv);│
│                                                                 │
│    Lines 92-103: Send to LTFS                                 │
│    $ch = curl_init();                                         │
│    curl_setopt($ch, CURLOPT_URL, $sendUrl);                  │
│    curl_setopt($ch, CURLOPT_HTTPHEADER, [                    │
│      'Content-Type: application/json',                        │
│      'flsId: ' . $flsId,                                      │
│      'lendToken: ' . $lendToken,                             │
│      'producttype: SME'                                       │
│    ]);                                                         │
│    curl_setopt($ch, CURLOPT_POSTFIELDS,                      │
│      json_encode(['body' => $encrypted])                     │
│    );                                                          │
│    $result = curl_exec($ch);                                  │
│                                                                 │
│    Lines 124-130: Decrypt LTFS Response                       │
│    if (isset($json['body'])) {                                │
│      $dec = aes_decrypt_b64($json['body'], $aesKey, $aesIv);│
│      $decrypted = json_decode($dec, true);                   │
│    }                                                           │
│                                                                 │
│    Lines 132-140: Return Response                             │
│    echo json_encode([                                         │
│      'success' => true,                                       │
│      'status' => $status,                                     │
│      'json' => $json                                          │
│    ]);                                                         │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ 4. LTFS API SERVER                                             │
│    URL: https://apiclouduat.ltfs.com:1132/LTFSME/api/         │
│         sendBumraPosterOtp/                                    │
│                                                                 │
│    - Receives encrypted request                                │
│    - Validates headers (flsId, lendToken, producttype)        │
│    - Decrypts payload                                          │
│    - Generates & sends OTP via SMS                            │
│    - Encrypts response                                         │
│    - Returns: { "body": "encrypted_response" }                │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ 5. RESPONSE BACK TO FRONTEND                                   │
│                                                                 │
│    Hostinger PHP → OTP Service → React Component              │
│                                                                 │
│    - Frontend shows OTP input boxes                            │
│    - Starts 60-second countdown timer                          │
│    - User enters OTP                                           │
│    - Same flow for verification                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. File Locations

### 📁 **Key Files**

| File | Purpose | Key Functions |
|------|---------|---------------|
| `public/env.php` | Configuration | Stores LTFS credentials & encryption keys |
| `public/api/send-otp.php` | OTP Sending | Encrypts payload, calls LTFS API |
| `public/api/verify-otp.php` | OTP Verification | Verifies OTP with LTFS |
| `lib/utils/encryption.ts` | Encryption (JS) | encrypt(), decrypt() functions |
| `otp-test/lib/encryption.php` | Encryption (PHP) | encrypt(), decrypt() functions |
| `lib/utils/otpService.ts` | OTP Service | requestOtp(), verifyOtp() |
| `components/DetailsCard.tsx` | UI Component | User interaction, form handling |

---

## 8. Security Notes

### 🔒 **Important Security Considerations**

1. **Encryption Keys**
   - Keys are stored in `public/env.php` (server-side only)
   - Never exposed to frontend JavaScript
   - Matching keys required on both sides

2. **LTFS Lend Token**
   - JWT token with expiration
   - Current token expires: 1733510132 (Unix timestamp)
   - Get new token from LTFS when expired

3. **HTTPS Required**
   - All communication uses HTTPS
   - LTFS endpoint: `https://apiclouduat.ltfs.com:1132`

4. **Request Body Format**
   - Encrypted data MUST be in `{ "body": "..." }` wrapper
   - Direct encrypted string won't work

---

## 9. Testing

### 🧪 **Test OTP Flow**

**Using cURL:**
```bash
curl -X POST https://your-domain.com/api/send-otp.php \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210"}'
```

**Using Browser Console:**
```javascript
fetch('/api/send-otp.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '9876543210' })
})
.then(r => r.json())
.then(console.log);
```

---

## 10. Troubleshooting

### ⚠️ **Common Issues**

| Error | Cause | Solution |
|-------|-------|----------|
| BadPaddingException | Key/IV mismatch | Verify AES_KEY and AES_IV match exactly |
| 401 Unauthorized | Expired token | Update LTFS_LEND_TOKEN in env.php |
| Invalid request format | Wrong body structure | Ensure `{ "body": "..." }` wrapper |
| Encryption failed | Key length wrong | Verify KEY is 32 bytes, IV is 16 bytes |

---

## ✅ Summary

**The OTP implementation flow:**

1. **User Input** → Phone number entered in frontend
2. **Frontend Call** → `requestOtp(phone)` from `otpService.ts`
3. **Hostinger PHP** → Receives phone, creates payload
4. **Encryption** → AES-256-CBC encrypts payload with shared key
5. **LTFS API Call** → Sends encrypted data to LTFS endpoint
6. **LTFS Processing** → Decrypts, generates OTP, sends SMS
7. **Response** → Encrypted response sent back
8. **Decryption** → Hostinger decrypts response
9. **Frontend Update** → Shows OTP input, starts timer

**Key Variables Sent:**
- `number`: Phone number (10 digits)
- `Customer_Name`: User's name (default: "Test User")
- `Loan_Application_Id`: Unique ID (BL + timestamp)
- `flsId`: Fixed ID "VEN03799"

**Encryption:**
- Algorithm: AES-256-CBC
- Key: `njCYgvlucmiQoeWydE32jjTTrdpB9Wg8` (32 bytes)
- IV: `VFoEgjZNsT1pAtXS` (16 bytes)
- Output: Base64-encoded string

**Endpoint:**
- LTFS: `https://apiclouduat.ltfs.com:1132/LTFSME/api/sendBumraPosterOtp/`
- Headers: flsId, lendToken, producttype
- Body: `{ "body": "encrypted_payload" }`

