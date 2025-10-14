# Phone Lookup Not Working - Fix Instructions

## Problem
Phone lookup, OTP rate limiting, and OTP logging are returning 500 errors because `SUPABASE_SERVICE_ROLE_KEY` environment variable is not set.

## Solution 1: Add Service Role Key (Recommended)

### Step 1: Get Your Supabase Service Role Key

1. Go to https://supabase.com/dashboard
2. Select your bowling project
3. Navigate to **Settings** → **API**
4. Find the **service_role** key (NOT the anon/public key)
5. Copy the key (starts with `eyJ...`)

### Step 2: Add to VPS Environment

SSH into your VPS:

```bash
ssh root@srv1051076
cd /var/www/html/bowling-project
```

Create/edit `.env.local`:

```bash
nano .env.local
```

Add this line (replace with YOUR key):

```bash
# Supabase Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_actual_service_role_key_here

# Public keys (should already be set)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Save (Ctrl+X, Y, Enter)

### Step 3: Restart Application

```bash
npm run build && pm2 restart bowling-web
```

### Step 4: Verify

Check the logs:

```bash
pm2 logs bowling-web --lines 50
```

You should see:
- ✅ No more "Supabase not configured" errors
- ✅ Phone lookup working
- ✅ OTP rate limiting working
- ✅ OTP logging working

---

## Solution 2: Use Anon Key (Quick Test Only - NOT Recommended for Production)

If you need to test immediately without the service role key, I can modify the APIs to use the public anon key. However, this is:

❌ **Less secure** - Anyone can access these endpoints  
❌ **Limited permissions** - Row Level Security might block queries  
⚠️ **For testing only** - Don't use in production  

Let me know if you want me to implement this temporary solution.

---

## Solution 3: Disable Phone Lookup Features (Not Recommended)

If you don't want to use these features at all, I can:

1. Comment out phone lookup calls in DetailsCard
2. Remove returning user flow
3. Disable OTP rate limiting and logging

But this will remove important functionality:
- Returning users won't see their previous results
- No rate limiting on OTP requests
- No analytics on OTP usage

---

## Current Status

The APIs are already modified to:
- ✅ Return graceful fallbacks when service key is missing
- ✅ Not block the OTP flow
- ✅ Allow the app to work (but without phone lookup features)

However, **phone lookup won't actually work** until you add the service role key.

---

## Which Solution Do You Want?

1. **Add service role key** (Recommended) - Full functionality
2. **Use anon key** (Quick test only) - Temporary fix
3. **Disable features** (Not recommended) - Removes functionality

Let me know which option you prefer!

