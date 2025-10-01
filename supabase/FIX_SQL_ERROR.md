# Fix for Supabase SQL Error

## The Error You Saw

```
ERROR: 42P16: cannot change name of view column "meta" to "avatar_url"
HINT: Use ALTER VIEW ... RENAME COLUMN ... to change name of view column instead.
```

## What This Means

The error occurs because:
1. Your Supabase database already has views created (`leaderboard_all_time`, etc.)
2. The SQL tried to use `CREATE OR REPLACE VIEW` 
3. Postgres doesn't allow changing column order in a view with `CREATE OR REPLACE`

## ✅ Solution: Use the Fixed SQL File

### Use This File Instead:
**`supabase/add_avatar_storage_simple.sql`**

This fixed version:
- ✅ Drops existing views first
- ✅ Recreates them with avatar_url
- ✅ Handles all edge cases
- ✅ Provides clear success messages

### How to Run It:

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in sidebar
   - Click "New Query"

3. **Copy & Paste**
   - Open `supabase/add_avatar_storage_simple.sql`
   - Copy ALL contents
   - Paste into SQL Editor

4. **Run**
   - Click "Run" button
   - Wait for completion (5-10 seconds)

5. **Check Results**
   - Look for success messages in output
   - Should see: "✅ Avatar Storage Migration Complete!"

### What Gets Created:

✅ **Storage Bucket:** `bowling-avatars` (public, 5MB limit)  
✅ **Column:** `avatar_url` in `bowling_attempts` table  
✅ **Index:** On `avatar_url` for fast queries  
✅ **Views:** 3 leaderboard views updated with avatar column  
✅ **Policies:** 4 storage policies for read/write access  

## Verify It Worked

### Check Storage:
1. Go to **Storage** tab
2. Confirm `bowling-avatars` bucket exists
3. Should show as "Public"

### Check Table:
1. Go to **Table Editor**
2. Select `bowling_attempts` table
3. Scroll right - you should see `avatar_url` column

### Check Views:
1. Go to **SQL Editor**
2. Run: `SELECT * FROM leaderboard_all_time LIMIT 1;`
3. Should include `avatar_url` in results

## If You Still Get Errors

### Error: "relation already exists"
**Solution:** The bucket already exists, this is fine. The script handles it.

### Error: "policy already exists"
**Solution:** Run this first to clean up:
```sql
DROP POLICY IF EXISTS "Public avatar read access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload for all users" ON storage.objects;
DROP POLICY IF EXISTS "Update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Delete own avatars" ON storage.objects;
```
Then run the full script again.

### Error: "permission denied"
**Check:** Make sure you're logged in as the project owner or have admin rights.

## After Successful Migration

Your app will now:
1. ✅ Auto-submit to leaderboard when analysis completes
2. ✅ Include avatar URL if available
3. ✅ Store all analysis metrics
4. ✅ Display on leaderboard

## Test It:

1. Complete a bowling analysis
2. Go to analyze page
3. Check browser console for:
   ```
   📤 Submitting analysis results to Supabase leaderboard...
   ✅ Successfully saved to leaderboard with ID: xxx-xxx-xxx
   ```
4. Check Supabase Table Editor
5. See your new entry in `bowling_attempts` table!

---

**Need Help?** Check `SUPABASE_QUICK_START.md` for full setup guide.
