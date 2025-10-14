# Restored Session Feature - Existing User Composite Card Display

## Overview

When an existing user re-enters their phone number, the system now:
1. ✅ Detects they already have data in the database
2. ✅ Loads their OLD composite card from the URL (no regeneration)
3. ✅ Downloads their OLD card when they click "Download Report"
4. ✅ Skips leaderboard submission (no duplicate entries)
5. ✅ Skips composite card generation (no unnecessary uploads)

---

## How It Works

### 1️⃣ **Details Page - Restoration** (app/details/page.tsx)

When user submits phone number:

```typescript
// Check if user exists in database
const existingUser = await supabase
  .from('bowling_attempts')
  .select('*')
  .eq('phone_number', phone)
  .maybeSingle();

if (existingUser && existingUser.composite_card_url) {
  // Restore session data
  window.sessionStorage.setItem('compositeCardUrl', existingUser.composite_card_url);
  window.sessionStorage.setItem('leaderboardEntryId', existingUser.id);
  window.sessionStorage.setItem('restoredSession', 'true'); // ← Flag!
  
  // Restore analysis data
  window.sessionStorage.setItem('benchmarkDetailedData', JSON.stringify(existingUser.meta));
  
  // Redirect to analyze page
  router.push('/analyze');
}
```

**Key:** The `restoredSession` flag tells the analyze page this is an existing user.

---

### 2️⃣ **Analyze Page - Skip Submissions** (app/analyze/page.tsx)

#### Skip Leaderboard Submission
```typescript
React.useEffect(() => {
  const isRestoredSession = window.sessionStorage.getItem('restoredSession') === 'true';
  
  if (isRestoredSession) {
    console.log('⏭️ Restored session - skipping leaderboard submission');
    setHasSubmittedToLeaderboard(true); // Prevent duplicate
    return;
  }
  
  // Only submit for NEW users
  submitToLeaderboard();
}, [sessionAnalysisData, hasSubmittedToLeaderboard]);
```

#### Skip Composite Card Generation
```typescript
React.useEffect(() => {
  const isRestoredSession = window.sessionStorage.getItem('restoredSession') === 'true';
  
  if (isRestoredSession) {
    console.log('⏭️ Restored session - skipping composite card generation');
    console.log('✅ Using existing composite card from database');
    return;
  }
  
  // Only generate for NEW users
  uploadCompositeCard();
}, [sessionAnalysisData, benchmarkDetailedData, leaderboardEntryId]);
```

---

### 3️⃣ **CompositeCard Component - Display from URL** (components/CompositeCard.tsx)

#### Check for Restored Session
```typescript
const [isRestoredSession, setIsRestoredSession] = useState(false);
const [restoredCompositeUrl, setRestoredCompositeUrl] = useState<string | null>(null);

useEffect(() => {
  const restoredFlag = window.sessionStorage.getItem('restoredSession');
  const compositeUrl = window.sessionStorage.getItem('compositeCardUrl');
  
  if (restoredFlag === 'true' && compositeUrl) {
    console.log('🔄 Restored session - displaying existing composite card');
    setIsRestoredSession(true);
    setRestoredCompositeUrl(compositeUrl);
  }
}, []);
```

#### Conditional Rendering
```typescript
// If restored session, just show the image from URL
if (isRestoredSession && restoredCompositeUrl) {
  return (
    <div id="composite-card" ref={containerRef}>
      <img
        src={restoredCompositeUrl}
        alt="Your Composite Card"
        crossOrigin="anonymous"
        style={{ width: "100%", height: "auto" }}
      />
    </div>
  );
}

// Otherwise, generate the composite card as usual (NEW users)
return (
  <div id="composite-card">
    {/* All the layers, images, text, etc. */}
  </div>
);
```

---

### 4️⃣ **Download Button - Download from URL** (app/analyze/page.tsx)

```typescript
const downloadCompositeCard = async () => {
  const isRestoredSession = window.sessionStorage.getItem('restoredSession') === 'true';
  const compositeCardUrl = window.sessionStorage.getItem('compositeCardUrl');
  
  if (isRestoredSession && compositeCardUrl) {
    console.log('📥 Downloading existing composite card from URL...');
    
    // Fetch and download the existing image
    const response = await fetch(compositeCardUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${playerName}-composite-card.png`;
    a.click();
    
    console.log('✅ Existing composite card downloaded');
    return;
  }
  
  // Otherwise, regenerate and download (NEW users)
  await downloadCompositeCardManual({...});
};
```

---

## User Flow Comparison

### NEW User (First Time)
```
1. Upload video → Generate torso
2. Enter phone number (NOT in database)
3. Navigate to analyze page
4. Auto-submit to leaderboard ✅
5. Auto-generate composite card ✅
6. Auto-upload to Supabase ✅
7. Update database with URL ✅
8. Display NEW composite card
9. Click "Download Report" → Regenerate and download
```

### EXISTING User (Returning)
```
1. Upload video → Generate torso (but won't use it)
2. Enter phone number (EXISTS in database)
3. Restore old data from database ✅
4. Set 'restoredSession' flag ✅
5. Navigate to analyze page
6. Skip leaderboard submission ✅ (no duplicate)
7. Skip composite card generation ✅ (already exists)
8. Display OLD composite card from URL ✅
9. Click "Download Report" → Download from URL ✅
```

---

## Console Logs to Look For

### Restored Session (Existing User)
```
📞 Checking for existing user with phone: 8169921886
✅ Found existing user! Checking data completeness...
📊 Existing user data: {id: '...', composite_card_url: '...'}
✅ User has complete data - restoring session...
🚀 Redirecting to analyze page with restored data...

[Analyze Page]
⏭️ Restored session detected - skipping leaderboard submission
✅ Using existing leaderboard entry from database
⏭️ Restored session detected - skipping composite card generation
✅ Using existing composite card from database

[CompositeCard Component]
🔄 Restored session detected - displaying existing composite card
🔗 Composite URL: https://...supabase.co/.../reports/john-doe-123.png
⏭️ Skipping torso image load - using restored composite card
✅ Restored composite card loaded successfully

[Download Button]
📥 Downloading existing composite card from URL...
🔗 URL: https://...supabase.co/.../reports/john-doe-123.png
✅ Existing composite card downloaded successfully
```

### New Session (First Time User)
```
📞 Checking for existing user with phone: 9876543210
👤 New user - proceeding with analysis

[Analyze Page]
📤 Submitting analysis results to Supabase leaderboard...
✅ Successfully saved to leaderboard with ID: {...}
🎨 Auto-uploading composite card to Supabase...
📤 Starting composite card upload to Supabase...
✅ Image uploaded to storage successfully
📊 Updating bowling_attempts with composite card URL...
✅ Composite card URL saved to database!

[CompositeCard Component]
✅ Loaded generated torso image for composite card
🎨 Drew Gemini torso at x: 41 size: 285

[Download Button]
🎨 Generating new composite card for download...
✅ Composite card generated and downloaded
```

---

## Key Benefits

1. **No Duplicate Entries:** Existing users don't create new leaderboard entries
2. **No Unnecessary Generation:** Skip expensive composite card generation
3. **Faster Load:** Just display image from URL (instant)
4. **Consistent Experience:** Users see their original card, not a new one
5. **Bandwidth Savings:** Download from URL instead of regenerating
6. **Database Integrity:** One entry per user's best attempt

---

## Testing

### Test 1: New User Flow
1. Clear all session storage
2. Upload a video
3. Enter a NEW phone number (not in database)
4. Verify:
   - ✅ Composite card is generated
   - ✅ Leaderboard entry created
   - ✅ Database updated with URL
   - ✅ Download works

### Test 2: Existing User Flow
1. Clear session storage
2. Upload a video
3. Enter an EXISTING phone number (in database with composite_card_url)
4. Verify:
   - ✅ Old composite card is displayed
   - ✅ No new leaderboard entry created
   - ✅ No new composite card generated
   - ✅ Download downloads OLD card from URL
   - ✅ Console shows "Restored session" logs

### Test 3: Existing User Without Composite Card
1. User exists but `composite_card_url` is NULL
2. Should proceed as NEW user (generate new card)

---

## Related Files

| File | Purpose |
|------|---------|
| `app/details/page.tsx` | Detects existing user, sets `restoredSession` flag |
| `app/analyze/page.tsx` | Skips submissions for restored sessions |
| `components/CompositeCard.tsx` | Displays from URL for restored sessions |
| `app/analyze/page.tsx` (download) | Downloads from URL for restored sessions |

---

## Summary

**The feature is now complete!**

✅ Existing users see their OLD composite card  
✅ Existing users download their OLD card  
✅ No duplicate leaderboard entries  
✅ No unnecessary regeneration or uploads  
✅ Faster, more efficient, better UX  

🎉 **Problem solved!**

