# OTP Protection Implementation

## Summary
All pages after the details page are now protected and require OTP verification. Users cannot access protected pages without completing OTP verification.

---

## Changes Made

### 1. **Created OTP Protection Hook**
**File:** `lib/hooks/useOtpProtection.ts`

- Custom React hook that checks OTP verification status
- Redirects to `/details` if OTP is not verified or details are not completed
- Logs protection status for debugging

```typescript
export function useOtpProtection() {
  // Checks sessionStorage for:
  // - otpVerified: 'true'
  // - detailsCompleted: 'true'
  // Redirects to /details if either is missing
}
```

---

### 2. **Updated DetailsCard Component**
**File:** `components/DetailsCard.tsx`

**Changes:**
- ✅ Enabled OTP flow (`OTP_DISABLED = false`)
- ✅ Re-enabled OTP verification requirement before form submission
- ✅ Stores `detailsCompleted` flag in sessionStorage after successful submission
- ✅ Stores `playerName` and `playerPhone` in sessionStorage

**What happens:**
1. User fills in name and phone
2. Clicks "Get OTP" → OTP sent via `/proxy.php`
3. Enters 6-digit OTP → Auto-verifies
4. Accepts Terms & Conditions
5. Clicks "View Analysis" → Sets `detailsCompleted='true'` in sessionStorage

---

### 3. **Protected Pages**

#### a. **Analyze Page**
**File:** `app/analyze/page.tsx`
- Added `useOtpProtection()` hook
- Page is now protected - redirects to `/details` if OTP not verified

#### b. **Video Preview Page**
**File:** `app/video-preview/page.tsx`
- Added `useOtpProtection()` hook
- Page is now protected - redirects to `/details` if OTP not verified

#### c. **Download Video Page**
**File:** `app/download-video/page.tsx`
- Added `useOtpProtection()` hook
- Page is now protected - redirects to `/details` if OTP not verified

---

### 4. **Updated OTP Service**
**File:** `lib/utils/otpService.ts`

**Changes:**
- ✅ Added `/proxy.php?endpoint=sendPosterOtp` as PRIMARY endpoint
- ✅ Added `/proxy.php?endpoint=verifyOtps` as PRIMARY endpoint
- ✅ Updated all encrypted OTP functions to use `/proxy.php`

---

## How It Works

### Flow Diagram:
```
User → /details (Enter name, phone, OTP)
  ↓
  OTP Verified ✅ + Form Submitted ✅
  ↓
  sessionStorage set:
    - otpVerified: 'true'
    - detailsCompleted: 'true'
    - playerName: '...'
    - playerPhone: '...'
  ↓
Protected Pages (/analyze, /video-preview, /download-video)
  ↓
  useOtpProtection() checks sessionStorage
  ↓
  If verified ✅ → Allow access
  If NOT verified ❌ → Redirect to /details
```

---

## SessionStorage Keys Used

| Key | Value | Set By | Checked By |
|-----|-------|--------|------------|
| `otpVerified` | `'true'` | `DetailsCard` (on OTP verify) | `useOtpProtection` |
| `detailsCompleted` | `'true'` | `DetailsCard` (on form submit) | `useOtpProtection` |
| `playerName` | User's name | `DetailsCard` (on form submit) | Various pages |
| `playerPhone` | User's phone | `DetailsCard` (on form submit) | Various pages |

---

## Testing Instructions

### 1. **Test Protection (User NOT verified)**
1. Clear sessionStorage: `sessionStorage.clear()`
2. Try to navigate directly to `/analyze`
3. **Expected:** Redirect to `/details`

### 2. **Test Protection (User verified)**
1. Go to `/details`
2. Fill in name and phone
3. Click "Get OTP"
4. Enter OTP and verify
5. Accept Terms & Conditions
6. Click "View Analysis"
7. **Expected:** Navigate to `/analyze` successfully
8. Try navigating to `/video-preview` or `/download-video`
9. **Expected:** Pages load successfully

### 3. **Test Direct URL Access**
1. After completing OTP verification
2. Try accessing `/analyze` directly via URL
3. **Expected:** Page loads (because sessionStorage has valid flags)
4. Clear sessionStorage and refresh
5. **Expected:** Redirect to `/details`

---

## Console Logs

When protection is checked, you'll see:
```
[OTP Protection] Checking verification status: { otpVerified: 'true', detailsCompleted: 'true' }
[OTP Protection] ✅ OTP verified and details completed
```

OR

```
[OTP Protection] Checking verification status: { otpVerified: null, detailsCompleted: null }
[OTP Protection] ❌ OTP not verified or details not completed - redirecting to /details
```

---

## Files Modified

1. ✅ `lib/hooks/useOtpProtection.ts` (NEW)
2. ✅ `components/DetailsCard.tsx`
3. ✅ `lib/utils/otpService.ts`
4. ✅ `app/analyze/page.tsx`
5. ✅ `app/video-preview/page.tsx`
6. ✅ `app/download-video/page.tsx`

---

## Deployment

### Sync to VPS:
```bash
# Upload these files via SFTP:
lib/hooks/useOtpProtection.ts
components/DetailsCard.tsx
lib/utils/otpService.ts
app/analyze/page.tsx
app/video-preview/page.tsx
app/download-video/page.tsx
```

### Rebuild:
```bash
cd /var/www/html/bowling-project
npm run build
pm2 restart bowling-web
```

---

## Security Notes

- ✅ Protection is client-side via sessionStorage
- ✅ OTP verification happens server-side via `/proxy.php`
- ✅ All OTP communication uses encrypted payloads
- ✅ FLS credentials are injected server-side (not exposed to client)
- ⚠️ SessionStorage is cleared when browser/tab is closed
- ⚠️ User must complete OTP verification in the same browser session

---

**Status:** ✅ Complete
**Date:** 2025-10-08

