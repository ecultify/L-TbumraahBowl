# Video Render Tab Close Problem & Solution

## 🚨 **The Problem**

### **Current Behavior:**

When a user closes their browser tab during video rendering:

1. ❌ **Video is lost** - No way to retrieve the rendered video
2. ❌ **Wasted resources** - Lambda/server completes render but nobody gets it
3. ❌ **Poor UX** - User must re-upload video and re-analyze
4. ❌ **No persistence** - Render ID stored in `sessionStorage` is cleared

### **Why This Happens:**

```javascript
// Render ID is stored in sessionStorage (cleared on tab close)
window.sessionStorage.setItem('videoRenderId', renderId);
window.sessionStorage.setItem('videoRenderStatus', 'rendering');

// Polling happens in client (stops when tab closes)
for (let attempt = 0; attempt < 150; attempt++) {
  const status = await checkRenderStatus(renderId);
  // User closes tab here → polling stops
  await new Promise(resolve => setTimeout(resolve, 4000));
}
```

The render continues on Lambda/server, but:
- Client-side polling stops
- `sessionStorage` is cleared
- Video URL is generated but lost
- No database record exists

---

## ✅ **The Solution**

### **1. Create Render Tracking Table**

Run the SQL migration: `supabase/ADD_VIDEO_RENDER_TRACKING.sql`

This creates:
- ✅ `video_render_jobs` table - Persists render status
- ✅ Indexes - Fast lookups by render_id, phone, status
- ✅ Views - Monitor in-progress and completed renders
- ✅ Cleanup function - Removes old failed renders

### **2. Save Render Info to Database**

**Before (current code):**
```typescript
// Only saved to sessionStorage (lost on tab close)
window.sessionStorage.setItem('videoRenderId', renderId);
```

**After (solution):**
```typescript
// Save to database AND sessionStorage
const { data: renderJob } = await supabase
  .from('video_render_jobs')
  .insert({
    render_id: renderId,
    bowling_attempt_id: leaderboardEntryId,
    render_status: 'rendering',
    render_progress: 0,
    render_type: isLocalhost ? 'local' : 'lambda',
    user_phone: playerPhone,
    user_name: playerName
  })
  .select()
  .single();
```

### **3. Update Progress in Database**

**During polling:**
```typescript
// Update database with progress
await supabase
  .from('video_render_jobs')
  .update({
    render_progress: progressValue,
    render_status: 'rendering',
  })
  .eq('render_id', renderId);
```

### **4. Save Final Video URL**

**When render completes:**
```typescript
// Save video URL to database
await supabase
  .from('video_render_jobs')
  .update({
    render_status: 'completed',
    render_progress: 100,
    video_url: supabaseVideoUrl,
    render_completed_at: new Date().toISOString()
  })
  .eq('render_id', renderId);

// Also update bowling_attempts table
await supabase
  .from('bowling_attempts')
  .update({ video_url: supabaseVideoUrl })
  .eq('id', leaderboardEntryId);
```

---

## 🔄 **Recovery Flow**

### **Scenario: User Closes Tab**

```
1. User starts video render
   ↓
2. renderId saved to database
   ✓ video_render_jobs table created
   ✓ user_phone stored
   ↓
3. User closes tab
   ❌ Client polling stops
   ✓ But database record remains!
   ↓
4. Lambda continues rendering
   ✓ Completes successfully
   ✓ Video uploaded to Supabase
   ↓
5. Background job updates database
   ✓ video_url saved
   ✓ render_status = 'completed'
   ↓
6. User returns later
   ✓ Query by phone number
   ✓ Retrieve video URL
   ✓ Display video!
```

### **Recovery Query:**

```sql
-- Find user's completed videos by phone number
SELECT 
  vr.video_url,
  vr.render_completed_at,
  vr.user_name,
  ba.predicted_kmh,
  ba.similarity_percent
FROM 
  video_render_jobs vr
LEFT JOIN 
  bowling_attempts ba ON vr.bowling_attempt_id = ba.id
WHERE 
  vr.user_phone = '8169921886'
  AND vr.render_status = 'completed'
  AND vr.video_url IS NOT NULL
ORDER BY 
  vr.render_completed_at DESC
LIMIT 1;
```

---

## 📊 **Monitoring Queries**

### **Check In-Progress Renders:**
```sql
SELECT * FROM video_renders_in_progress;
```

Shows:
- Current rendering jobs
- Progress percentage
- Time elapsed
- User details

### **Check Completed Renders:**
```sql
SELECT * FROM video_renders_completed;
```

Shows:
- All completed videos
- Video URLs
- User details
- Bowling scores

### **Find Stuck Renders:**
```sql
-- Renders stuck for > 15 minutes
SELECT 
  render_id,
  user_name,
  user_phone,
  render_started_at,
  extract(epoch from (now() - render_started_at))::integer / 60 as minutes_elapsed
FROM 
  video_render_jobs
WHERE 
  render_status = 'rendering'
  AND render_started_at < now() - interval '15 minutes';
```

---

## 🛠️ **Implementation Steps**

### **Step 1: Run SQL Migration**
```bash
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy/paste: supabase/ADD_VIDEO_RENDER_TRACKING.sql
4. Run migration
5. Verify: SELECT * FROM video_render_jobs;
```

### **Step 2: Update Code** 
Update `app/analyze/page.tsx` to:
1. Insert render job when starting
2. Update progress during polling
3. Save video URL when complete
4. Add recovery logic on page load

### **Step 3: Add Recovery UI**
On analyze page load:
```typescript
useEffect(() => {
  const checkPendingRender = async () => {
    const phone = sessionStorage.getItem('playerPhone');
    
    // Check if user has completed render waiting
    const { data } = await supabase
      .from('video_render_jobs')
      .select('*')
      .eq('user_phone', phone)
      .eq('render_status', 'completed')
      .not('video_url', 'is', null)
      .order('render_completed_at', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      // Show notification: "Your video is ready!"
      // Provide download link
    }
  };
  
  checkPendingRender();
}, []);
```

---

## 🎯 **Benefits**

| Before | After |
|--------|-------|
| ❌ Tab close = video lost | ✅ Video persists in database |
| ❌ Must restart from scratch | ✅ Can retrieve video anytime |
| ❌ Wasted Lambda costs | ✅ Video delivered to user |
| ❌ No monitoring | ✅ Full visibility of renders |
| ❌ No recovery possible | ✅ Recovery by phone number |

---

## 📱 **User Experience**

### **Scenario 1: Normal Flow**
```
User uploads video → Analysis → Render starts
→ Progress bar shows 50%
→ Video completes
→ WhatsApp sent ✅
```

### **Scenario 2: Tab Closed During Render**
```
User uploads video → Analysis → Render starts
→ Progress bar shows 30%
→ ❌ User closes tab
→ Render completes in background
→ User returns next day
→ 🎉 "Your video is ready!" notification
→ Download video
→ WhatsApp sent ✅
```

### **Scenario 3: Network Disconnected**
```
User uploads video → Analysis → Render starts
→ ⚠️ Network disconnects
→ Polling stops
→ Render completes anyway
→ User reconnects WiFi
→ System detects completed render
→ Auto-download video ✅
```

---

## 🔍 **Debugging**

### **Check Render Status:**
```sql
SELECT 
  render_id,
  render_status,
  render_progress,
  user_name,
  video_url,
  created_at,
  updated_at
FROM 
  video_render_jobs
ORDER BY 
  created_at DESC
LIMIT 10;
```

### **Find User's Renders:**
```sql
SELECT * 
FROM video_render_jobs
WHERE user_phone = '8169921886'
ORDER BY created_at DESC;
```

### **Count Renders by Status:**
```sql
SELECT 
  render_status,
  COUNT(*) as count,
  AVG(render_progress) as avg_progress
FROM 
  video_render_jobs
GROUP BY 
  render_status;
```

---

## 🚀 **Next Steps**

1. ✅ Run `ADD_VIDEO_RENDER_TRACKING.sql` in Supabase
2. ⏳ Update `app/analyze/page.tsx` with database tracking
3. ⏳ Add recovery UI for completed renders
4. ⏳ Add background job to check render status
5. ⏳ Add notification when video is ready

---

**Summary:** By persisting render status to Supabase, users can close their tab and still retrieve their video later. The render continues in the background and is available whenever they return!

