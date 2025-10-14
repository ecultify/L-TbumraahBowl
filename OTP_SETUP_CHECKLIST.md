# 🎯 OTP 5-Minute Timeout - Quick Setup Checklist

## ✅ Step-by-Step Setup

### **Step 1: Run Database Migration**
- [ ] Open Supabase Dashboard
- [ ] Go to **SQL Editor**
- [ ] Open file: `supabase/add_otp_verified_column.sql`
- [ ] Copy all SQL code
- [ ] Paste and run in Supabase SQL Editor
- [ ] Verify success: Should see "Success. No rows returned"

### **Step 2: Verify Database Changes**
Run this query to check if columns were added:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'bowling_attempts' 
AND column_name IN ('otp_verified', 'otp_phone');
```

**Expected Output:**
```
column_name   | data_type | is_nullable | column_default
otp_verified  | boolean   | NO          | false
otp_phone     | varchar   | YES         | NULL
```

### **Step 3: Test the Changes**
- [ ] Restart your Next.js server: `npm run dev`
- [ ] Navigate to: `http://localhost:3000/details`
- [ ] Check if OTP elements are visible (not hidden)
- [ ] Check if timer shows "5:00" (not "0:59")

### **Step 4: Test OTP Flow**
- [ ] Enter name and phone number
- [ ] Click "Get OTP"
- [ ] Verify timer counts down from 300 seconds (5 minutes)
- [ ] Enter the 6-digit OTP
- [ ] Verify OTP is accepted
- [ ] Complete bowling action
- [ ] Check if analysis submission works

### **Step 5: Verify Database Entry**
After completing a bowling attempt:
```sql
SELECT 
  display_name,
  phone_number,
  otp_verified,
  otp_phone,
  created_at
FROM bowling_attempts
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
- `otp_verified` should be `true` (if OTP was verified)
- `otp_phone` should show the phone number used

### **Step 6: Test OTP Expiry (Optional)**
- [ ] Request OTP
- [ ] Wait 5+ minutes OR manually expire in database:
  ```sql
  UPDATE otp_verification 
  SET expires_at = NOW() - INTERVAL '1 minute'
  WHERE phone = 'your_test_phone';
  ```
- [ ] Try to verify the expired OTP
- [ ] Should show error: "No active OTP found or OTP expired"

---

## 📊 Quick Analytics Queries

### **Check Verification Rate Today:**
```sql
SELECT * FROM otp_verification_analytics 
WHERE date = CURRENT_DATE;
```

### **See Recent OTP Attempts:**
```sql
SELECT * FROM otp_verification 
ORDER BY created_at DESC 
LIMIT 10;
```

### **Check Bowling Attempts with OTP Status:**
```sql
SELECT 
  display_name,
  otp_verified,
  created_at
FROM bowling_attempts
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## ⚠️ Troubleshooting

### **Issue: OTP elements not showing**
**Solution:** Check `components/DetailsCard.tsx` line 34:
```typescript
const OTP_DISABLED = false; // Must be false
```

### **Issue: Timer still shows 59 seconds**
**Solution:** Clear browser cache or hard reload (Ctrl+Shift+R)

### **Issue: Column already exists error**
**Solution:** The column was added in a previous migration. Skip Step 1.

### **Issue: OTP not saving to database**
**Solution:** Check browser console for errors. Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`

---

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ Details page shows OTP input fields
2. ✅ Timer counts down from 5:00 (300 seconds)
3. ✅ OTP verification works
4. ✅ Database has `otp_verified` and `otp_phone` columns
5. ✅ New bowling attempts show `otp_verified = true`
6. ✅ Analytics view returns data

---

## 📝 Files Modified

- ✅ `supabase/add_otp_verified_column.sql` (NEW)
- ✅ `components/DetailsCard.tsx` (Modified)
- ✅ `app/analyze/page.tsx` (Modified)
- ✅ `OTP_5MIN_TIMEOUT_IMPLEMENTATION.md` (NEW - Documentation)
- ✅ `OTP_SETUP_CHECKLIST.md` (NEW - This file)

---

## 🎉 Done!

Once all checkboxes are checked, your OTP system is fully operational with:
- 5-minute timeout
- Automatic expiry
- Verification tracking
- Analytics capabilities

**Total Setup Time:** ~5 minutes

