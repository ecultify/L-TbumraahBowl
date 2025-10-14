# Page Protection - Quick Reference Guide

## What Was Implemented

A comprehensive page protection system that:
1. Requires OTP verification for all pages after details
2. Enforces sequential flow (users can't skip steps)
3. Shows 404 error for unauthorized access
4. Handles returning users gracefully
5. Clears on browser close (no persistent sessions)

---

## Protected Pages

All pages after details page are now protected:

| Page | Route | Required Previous Steps |
|------|-------|------------------------|
| Record Upload | `/record-upload` | details |
| Video Preview | `/video-preview` | details → record-upload |
| Analyze | `/analyze` | details → record-upload → video-preview OR returning user |
| Download Video | `/download-video` | details → record-upload → video-preview → analyze |
| Leaderboard | `/leaderboard` | details → ... → analyze |
| Gallery | `/gallery` | details → ... → leaderboard |

---

## How To Test

### Test 1: Unauthorized Access
```javascript
// In browser console:
sessionStorage.clear();
window.location.href = '/analyze';

// Expected: 404 "Page Not Found" screen
```

### Test 2: Normal Flow
```
1. Go to home page
2. Click "Bowl Like Bumrah"
3. Enter name + phone + OTP
4. Should go to /record-upload ✅
5. Record/upload video
6. Should go to /video-preview ✅
7. Continue through analyze → leaderboard → gallery ✅
```

### Test 3: Returning User
```
1. Enter existing phone number
2. Verify OTP
3. Should go directly to /analyze ✅
4. Can access leaderboard/gallery ✅
```

### Test 4: Skip Flow (Should Fail)
```
1. Complete details + OTP
2. Manually navigate to /leaderboard
3. Expected: 404 "Page Not Found" ❌
```

---

## Session Storage Keys

Check these in browser console:

```javascript
// View current session data
console.log({
  otpVerified: sessionStorage.getItem('otpVerified'),
  detailsCompleted: sessionStorage.getItem('detailsCompleted'),
  userFlow: sessionStorage.getItem('userFlow'),
  isReturningUser: sessionStorage.getItem('isReturningUser')
});

// Expected after completing details:
// {
//   otpVerified: 'true',
//   detailsCompleted: 'true',
//   userFlow: 'details',
//   isReturningUser: null or 'true'
// }
```

---

## Console Logs To Look For

### Successful Access
```
[Page Protection] Checking access for: record-upload
[Page Protection] Flow check for record-upload: {currentFlow: 'details', authorized: true}
[Page Protection] Updated flow: details,record-upload
```

### Failed Access
```
[Page Protection] Checking access for: leaderboard
[Page Protection] Missing required step: analyze
[Page Protection] ❌ Flow check failed
```

### Returning User
```
[Page Protection] ✅ Returning user accessing analyze page
```

---

## Troubleshooting

### Issue: "Loading..." stuck on screen
**Cause**: Hook is checking authorization  
**Fix**: Check if `otpVerified` and `detailsCompleted` are set in sessionStorage

### Issue: Always shows 404
**Cause**: OTP not verified or flow not completed  
**Fix**: 
```javascript
// Manually fix for testing:
sessionStorage.setItem('otpVerified', 'true');
sessionStorage.setItem('detailsCompleted', 'true');
sessionStorage.setItem('userFlow', 'details,record-upload,video-preview,analyze');
```

### Issue: Can access pages out of order
**Cause**: Flow tracking not working  
**Fix**: Check console logs for flow updates

---

## Files To Check If Issues Arise

1. `lib/hooks/usePageProtection.ts` - Core protection logic
2. `components/UnauthorizedAccess.tsx` - 404 page
3. `app/details/page.tsx` - Flow initialization
4. Any protected page - Check if hook is imported and used correctly

---

## Quick Fixes

### Remove Protection (Emergency Only)
```typescript
// In any protected page, comment out:
// const isAuthorized = usePageProtection('page-name');
// if (isAuthorized === null) return <Loading />;
// if (isAuthorized === false) return <UnauthorizedAccess />;
```

### Manually Set Flow (Testing Only)
```javascript
// In browser console:
sessionStorage.setItem('otpVerified', 'true');
sessionStorage.setItem('detailsCompleted', 'true');
sessionStorage.setItem('userFlow', 'details,record-upload,video-preview,analyze,leaderboard');
sessionStorage.setItem('playerName', 'Test User');
sessionStorage.setItem('playerPhone', '9999999999');
```

---

## Important Notes

- ✅ Protection is client-side (sufficient for this use case)
- ✅ Session clears on browser/tab close (by design)
- ✅ Returning users bypass record-upload/video-preview
- ✅ All protection checks are logged to console
- ⚠️ Don't remove sessionStorage items manually in production
- ⚠️ Each page must have the hook at the top of the component

---

## Status Indicators

When testing, look for these in the browser:

| What You See | Meaning |
|-------------|---------|
| "Loading..." (black screen) | Authorization check in progress (should be quick) |
| "404 Page Not Found" | Unauthorized access blocked ✅ |
| Page content loads | Authorized access granted ✅ |

---

## Quick Commands

```bash
# Check if files were created
ls lib/hooks/usePageProtection.ts
ls components/UnauthorizedAccess.tsx

# Search for protection usage
grep -r "usePageProtection" app/

# Build and test
npm run build
npm run dev
```

---

**Protection system is now active! Test thoroughly before deployment.**

