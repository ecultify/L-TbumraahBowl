# 📱 OTP System - Complete Flow Explanation

## ❓ QUESTION 1: Which Template is Being Used?

### **Answer: Currently using the OLD LTFS API (which uses "Poster with Bumrah" template internally)**

**Current Implementation:**
- ✅ Using **OLD LTFS encrypted API**: `sendBumraPosterOtp`
- ✅ Endpoint: `https://apiclouduat.ltfs.com:1132/LTFSME/api/sendBumraPosterOtp/`
- ⚠️ **NOT using the new Axiom SMS gateway yet**

**Evidence from Code:**

```typescript
// lib/utils/otpService.ts - Line 10
const candidates = [
  `/proxy.php?endpoint=sendPosterOtp`, // PRIMARY endpoint
  // ... other fallbacks
];
```

```php
// public/proxy.php - Lines 26-27
$sendUrl = 'https://apiclouduat.ltfs.com:1132/LTFSME/api/sendBumraPosterOtp/';
```

**What Template Does This Send?**

The `sendBumraPosterOtp` endpoint name suggests it's the **"Poster with Bumrah"** template, which would send:

> "Dear Customer, {OTP} is the one-time password (OTP) for your **Poster with Bumrah** by L&T Finance Business Loans."

---

### 🔄 **To Use "Bowl Like Bumrah" Template:**

You have TWO options:

#### **Option 1: Switch to New Axiom API (Recommended)**

Use the new implementation I created earlier:

```typescript
// In components/DetailsCard.tsx - Replace handleGetOtpReal
import { sendOTPNew } from '@/lib/utils/otpServiceNew';

await sendOTPNew(phone, 'bowl'); // Uses "Bowl Like Bumrah" template
```

**New Axiom Templates:**
- `'bowl'` → "Bowl Like Bumrah activation by L&T Finance"
- `'poster'` → "Poster with Bumrah by L&T Finance Business Loans"

#### **Option 2: Change Old API Endpoint (Not Recommended)**

The old LTFS API endpoint name (`sendBumraPosterOtp`) is hardcoded. You would need LTFS to provide a different endpoint like `sendBumrahBowlOtp` if one exists.

---

## ❓ QUESTION 2: OTP Verification Flow on "View Analysis" Button

### **Answer: YES, OTP MUST be verified BEFORE analysis can start**

**Complete Flow:**

```
1. User clicks "View Analysis" button
   ↓
2. Form validation checks (in order):
   ├─ Name entered? ❌ → Show error, STOP
   ├─ Phone valid (10 digits)? ❌ → Show error, STOP
   ├─ Terms accepted? ❌ → Show error, STOP
   └─ OTP verified? ❌ → Show error "Please verify OTP", STOP
   ↓
3. ALL validations passed ✅
   ↓
4. Store details in sessionStorage
   ↓
5. Navigate to analysis page
   ↓
6. Analysis starts
```

---

### 🔒 **Detailed Code Flow:**

**File:** `components/DetailsCard.tsx`

#### **Step 1: Button is Disabled Until OTP Verified**
```typescript
// Line 184
const isSubmitDisabled = loading || submitting || !otpVerified;

// The "View Analysis" button is disabled if:
// - Loading or submitting
// - OR otpVerified === false
```

#### **Step 2: OTP Verification Check on Submit**
```typescript
// Lines 222-228 in handleSubmit
if (!otpVerified) {
  console.log('❌ [SUBMIT] Validation failed - OTP not verified');
  setError("Please verify OTP before proceeding.");
  alert("Please verify OTP before proceeding.");
  return; // ← STOPS EXECUTION HERE
}
```

#### **Step 3: Only Proceeds if OTP Verified**
```typescript
// Lines 229-241 - Only runs if otpVerified === true
setSubmitting(true);

const payload = {
  name: trimmedName,
  phone: phone.trim(),
  consent,
  otpValues,
};

await onSubmit(payload); // ← Navigates to analysis page
```

---

### 📊 **Verification Sequence Diagram:**

```
User Actions                    System Checks                Result
─────────────────────────────────────────────────────────────────────

1. Enter name & phone
2. Click "Get OTP"           → Sends OTP via API
3. Timer starts (5:00)       → Countdown begins
4. Enter 6-digit OTP         → Auto-verifies OTP
   ↓
   Correct OTP?              → YES ✅
   ↓                            ├─ setOtpVerified(true)
   Button enabled               └─ Button becomes enabled
   
5. Accept Terms
6. Click "View Analysis"     → Validation starts
   ↓
   Name valid?               → Check #1 ✅
   Phone valid?              → Check #2 ✅
   Terms accepted?           → Check #3 ✅
   OTP verified?             → Check #4 ✅
   ↓
   ALL CHECKS PASSED         → Proceed to analysis
   ↓
   Navigate to /analyze      → Analysis page loads
   ↓
   Analysis starts           → Video processing begins
```

---

### ⚠️ **What Happens if OTP Not Verified?**

```
User Actions                    System Response
─────────────────────────────────────────────────────

1. Skip OTP verification
2. Accept Terms
3. Click "View Analysis"     → Button is DISABLED (grayed out)
   ↓
   (If somehow bypassed)
   ↓
4. handleSubmit() called     → Validation check fails
   ↓
   if (!otpVerified)         → TRUE (OTP not verified)
   ↓
   Shows error message       → "Please verify OTP before proceeding."
   ↓
   return;                   → STOPS EXECUTION
   ↓
   User stays on details page → Analysis DOES NOT start
```

---

## 🎯 **Summary**

### **Question 1: Template Being Used**

| Current Status | Template Used | API Used |
|----------------|---------------|----------|
| ✅ **Active** | "Poster with Bumrah" | Old LTFS `sendBumraPosterOtp` |
| ❌ Not Active | "Bowl Like Bumrah" | New Axiom `bowl` template |

**To switch to "Bowl Like Bumrah":**
- Use the new Axiom implementation I created
- Change `sendOTPNew(phone, 'bowl')`

---

### **Question 2: OTP Verification Before Analysis**

| Step | Required | What Happens if Skipped |
|------|----------|------------------------|
| 1. Enter name | ✅ Yes | Cannot proceed, alert shown |
| 2. Enter phone | ✅ Yes | Cannot proceed, alert shown |
| 3. **Verify OTP** | **✅ YES** | **Button disabled, cannot proceed** |
| 4. Accept Terms | ✅ Yes | Cannot proceed, alert shown |
| 5. View Analysis | Enabled only after all above | Analysis starts |

**Answer:** YES, OTP MUST be verified before analysis can start. The "View Analysis" button is:
1. **Disabled** (grayed out) until OTP is verified
2. **Blocks submission** if somehow clicked without OTP verification
3. **Shows alert** "Please verify OTP before proceeding"
4. **Prevents navigation** to analysis page

---

## 🔄 **Migration Path (If Needed)**

If you want to switch from "Poster" to "Bowl Like Bumrah" template:

### **Option A: Use New Axiom System (5 minutes)**

1. Run database migration: `supabase/otp_system.sql`
2. Add environment variables (see `ENV_AXIOM_SETUP.md`)
3. Update `DetailsCard.tsx`:
   ```typescript
   import { sendOTPNew } from '@/lib/utils/otpServiceNew';
   
   // Replace in handleGetOtpReal:
   await sendOTPNew(phone, 'bowl'); // Uses "Bowl Like Bumrah"
   ```

### **Option B: Keep Old System, Just Change Template**

Ask LTFS if they have a different endpoint for "Bowl Like Bumrah" template, or if they can configure `sendBumraPosterOtp` to send the "bowl" template instead.

---

## ✅ **Conclusion**

1. **Template:** Currently using "Poster with Bumrah" (old LTFS API)
2. **OTP Verification:** **REQUIRED** before analysis - button disabled and validation prevents proceeding without OTP
3. **Security:** Multi-layer protection ensures OTP is verified before any analysis starts

Would you like me to help you switch to the "Bowl Like Bumrah" template using the new Axiom system?

