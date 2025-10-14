# Video Rendering Issues - Complete Fix Deployment Guide

## 🎯 Overview

This guide covers deployment of fixes for three critical video rendering issues:

- **Issue A**: Cross-user face frame contamination
- **Issue B**: Polling/Progress not updating after server restart
- **Issue C**: Malformed URLs being saved to database

---

## 📋 Pre-Deployment Checklist

### 1. Run Database Migration

First, create the `video_render_jobs` table in your Supabase database:

```bash
# On your VPS
cd /var/www/html/bowling-project
```

Execute the SQL migration in Supabase SQL Editor:
- Go to your Supabase project dashboard
- Navigate to SQL Editor
- Copy and paste the contents of `supabase/migrations/create_video_render_jobs.sql`
- Click "Run"

Or use the Supabase CLI:
```bash
supabase db push
```

### 2. Verify Database Table Created

Run this SQL query in Supabase SQL Editor to confirm:

```sql
SELECT * FROM video_render_jobs LIMIT 1;
```

You should see the table structure (it will be empty initially).

---

## 🚀 Deployment Steps

### Step 1: Deploy Code Changes

```bash
# On your VPS terminal
cd /var/www/html/bowling-project

# Pull latest changes (or upload modified files)
git pull origin main

# Install any new dependencies (if needed)
npm install

# Build the Next.js application
npm run build
```

### Step 2: Restart Render Server

The render server needs to be restarted to load the new database persistence code:

```bash
# Find the render server process
pm2 list

# Restart the render server
pm2 restart render-video

# Check logs to verify it started correctly
pm2 logs render-video --lines 50
```

### Step 3: Restart Next.js Application

```bash
# Restart the main application
pm2 restart bowling-project

# Or if using a different name
pm2 restart all

# Check status
pm2 status
```

---

## ✅ Verification Steps

### Test Issue C Fix (Malformed URLs)

1. Upload a new video and complete the analysis
2. Check the server logs for the validation messages:

```bash
pm2 logs render-video --lines 100 | grep "DB Update"
```

You should see:
```
✅ [DB Update] URL validated, proceeding with database save
✅ [DB Update] Final URL: https://hqzukyxnnjnstrecybzx.supabase.co/...
```

You should NOT see:
```
❌ [DB Update] CRITICAL ERROR: URL contains bowllikebumrah.com!
```

3. Query the database to verify URL format:

```sql
SELECT id, video_url, created_at 
FROM bowling_attempts 
WHERE video_url IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 5;
```

All URLs should start with `https://hqzukyxnnjnstrecybzx.supabase.co/storage/...`

### Test Issue B Fix (Polling Recovery)

1. Start a video render
2. While rendering is in progress, restart the render server:
   ```bash
   pm2 restart render-video
   ```
3. The polling should continue and eventually show the completed video
4. Check that the render job was persisted:

```sql
SELECT render_id, render_status, render_progress, video_url 
FROM video_render_jobs 
ORDER BY created_at DESC 
LIMIT 5;
```

### Test Issue A Fix (Face Frame Contamination)

1. User A uploads a video and completes face detection
2. Check browser console - you should see:
   ```
   🧹 Clearing face detection data for new upload...
   ✅ Face detection data cleared
   ```
3. User B (or same user in incognito) uploads a different video
4. Check browser console - localStorage should be cleared:
   ```
   🧹 Clearing localStorage to prevent cross-user contamination...
   ✅ Face detection data cleared from both storages
   ```
5. Verify User B's rendered video uses their own face, not User A's

---

## 📊 What Changed

### Server-Side Changes (`server/render-video.js`)

1. **Enhanced URL Validation**:
   - Added comprehensive logging before database save
   - Added validation to reject malformed URLs containing `bowllikebumrah.com`
   - Only allows URLs matching Supabase pattern

2. **Database Persistence**:
   - Render status is now saved to `video_render_jobs` table
   - Survives server restarts
   - Enables polling recovery

3. **Status Endpoint Enhancement**:
   - Now checks database as fallback if in-memory status not found
   - Restores status to memory for future queries

### Client-Side Changes

#### `app/video-preview/page.tsx`
- Added localStorage cleanup on page mount
- Clears `userVideoThumbnail` and `torsoVideoUrl` to prevent cross-user contamination

#### `app/record-upload/page.tsx`
- Added face detection cleanup in `handleRecordingComplete`
- Added face detection cleanup in `handleFileUpload`
- Ensures fresh face detection for each new video

#### `lib/utils/sessionCleanup.ts`
- Added `ANALYSIS_LOCALSTORAGE_KEYS` array
- Enhanced `clearAnalysisSessionStorage()` to also clear localStorage
- Prevents cross-user data contamination

### Database Changes

New table: `video_render_jobs`
- Tracks all render jobs with full status
- Enables polling recovery after server restarts
- Links to `bowling_attempts` via `bowling_attempt_id`

---

## 🐛 Troubleshooting

### Issue: "Relation video_render_jobs does not exist"

**Solution**: Run the database migration:
```sql
-- Copy and execute supabase/migrations/create_video_render_jobs.sql
```

### Issue: Polling still not working after restart

**Check**:
1. Server logs for database errors:
   ```bash
   pm2 logs render-video | grep "database"
   ```
2. Verify table exists in Supabase
3. Check RLS policies allow public access (for testing)

### Issue: URLs still malformed

**Check**:
1. Server logs for validation messages:
   ```bash
   pm2 logs render-video | grep "ABORT"
   ```
2. If you see ABORT messages, the URL is being rejected - check where it's coming from
3. Look for string concatenation in any custom code

### Issue: Face frames still contaminating

**Check**:
1. Browser console for cleanup messages
2. Verify localStorage is actually cleared:
   ```javascript
   // In browser console
   localStorage.getItem('userVideoThumbnail')
   // Should return null after cleanup
   ```
3. Clear browser cache and try in incognito mode

---

## 🔍 Monitoring

### Key Log Messages to Watch

**Successful URL Save**:
```
✅ [DB Update] URL validated, proceeding with database save
✅ [DB Update] Successfully updated video_url in database!
```

**Render Status Persisted**:
```
✅ [Render Server] Render job persisted to database: local-1234567890
✅ [Render Server] Database updated with completion status
```

**Face Frame Cleanup**:
```
🧹 Clearing localStorage to prevent cross-user contamination...
✅ Face detection data cleared from both storages
```

### Database Queries for Monitoring

**Check recent renders**:
```sql
SELECT 
  render_id,
  render_status,
  render_progress,
  video_url,
  created_at
FROM video_render_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

**Check for malformed URLs**:
```sql
SELECT id, video_url, created_at
FROM bowling_attempts
WHERE video_url LIKE '%bowllikebumrah.comhttps%'
ORDER BY created_at DESC;
```

**Check render success rate**:
```sql
SELECT 
  render_status,
  COUNT(*) as count
FROM video_render_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY render_status;
```

---

## 📝 Post-Deployment Validation

After deployment, run through this complete test:

1. ✅ Upload new video as User A
2. ✅ Complete analysis and face detection
3. ✅ Verify correct face appears in rendered video
4. ✅ Check video URL in database is well-formed
5. ✅ Restart render server during a render
6. ✅ Verify polling recovers and shows video
7. ✅ Upload video as User B (different session/browser)
8. ✅ Verify User B sees their own face, not User A's

---

## 🎉 Success Criteria

- ✅ No malformed URLs in `bowling_attempts.video_url`
- ✅ Polling recovers after server restart
- ✅ Each user sees only their own face in rendered videos
- ✅ All renders tracked in `video_render_jobs` table
- ✅ Clean logs with validation messages

---

## 📞 Support

If issues persist after deployment:

1. Collect logs:
   ```bash
   pm2 logs render-video --lines 200 > render-logs.txt
   pm2 logs bowling-project --lines 200 > app-logs.txt
   ```

2. Export recent database records:
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM video_render_jobs 
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```

3. Check browser console for client-side errors

4. Provide all of the above for debugging

---

## 🔐 Security Notes

The `video_render_jobs` table currently has public RLS policies for testing. 

**Production TODO**: Tighten RLS policies to:
- Only allow users to see their own render jobs
- Restrict updates to server service role only

```sql
-- Example tightened policy (implement after testing)
DROP POLICY "Allow public read access" ON video_render_jobs;
DROP POLICY "Allow public update access" ON video_render_jobs;

CREATE POLICY "Users can read own renders" ON video_render_jobs
  FOR SELECT USING (user_phone = current_setting('request.jwt.claims', true)::json->>'phone');
```

---

**Deployment Date**: _[To be filled]_  
**Deployed By**: _[To be filled]_  
**Version**: 1.0.0

