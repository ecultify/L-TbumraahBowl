# Supabase Leaderboard & Avatar - Quick Start Guide

## ✅ What's Been Implemented

### 1. Automatic Leaderboard Submission
- Analysis results automatically save to Supabase when user views analyze page
- No duplicate submissions (protected by state flag)
- Includes all metrics: speed, similarity, phases, technical scores

### 2. Gemini Avatar Storage
- Upload function ready: `uploadGeminiAvatar()`
- Avatars stored in Supabase Storage bucket
- Public URLs returned for display

### 3. Files Created/Modified

**Modified:**
- ✅ `app/analyze/page.tsx` - Added Supabase submission logic
- ✅ `lib/supabase/client.ts` - Already configured

**Created:**
- ✅ `lib/utils/avatarUpload.ts` - Avatar upload utilities
- ✅ `supabase/add_avatar_storage.sql` - Database migration
- ✅ `SUPABASE_LEADERBOARD_AVATAR_INTEGRATION.md` - Full documentation

## 🚀 Setup Steps (5 minutes)

### Step 1: Run SQL Migration (2 min)

1. Open Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor**
4. Open the file: `supabase/add_avatar_storage.sql`
5. Copy all contents and paste in SQL Editor
6. Click **Run**

**What this does:**
- Creates `bowling-avatars` storage bucket
- Sets up permissions
- Adds indexes for performance
- Updates leaderboard views

### Step 2: Verify Storage (1 min)

1. In Supabase Dashboard, go to **Storage**
2. Confirm you see `bowling-avatars` bucket
3. Click on it - should be **Public**

### Step 3: Test It! (2 min)

1. Run your app
2. Complete a bowling analysis
3. Go to analyze page
4. Check browser console for:
   ```
   📤 Submitting analysis results to Supabase leaderboard...
   ✅ Successfully saved to leaderboard with ID: xxx
   ```
5. Check Supabase **Table Editor** → `bowling_attempts`
6. See your new entry!

## 📊 What Data Gets Saved

Every analysis automatically saves:
```typescript
{
  display_name: "Player Name"       // From input
  predicted_kmh: 86.5               // Predicted speed
  similarity_percent: 92.3          // Similarity score
  speed_class: "Zooooom"            // Speed classification
  avatar_url: "https://..."         // Gemini avatar (if available)
  meta: {
    phases: { runUp, delivery, followThrough }
    technicalMetrics: { armSwing, bodyMovement, rhythm, releasePoint }
    recommendations: [...]
  }
}
```

## 🖼️ Adding Gemini Avatar Integration

### When Gemini Generates Avatar

**Option A: In your Gemini API call**
```typescript
import { uploadGeminiAvatar } from '@/lib/utils/avatarUpload';

// After Gemini generates the image
const geminiImageUrl = response.imageUrl; // or base64 data URL
const playerName = 'John Doe';

// Upload to Supabase
const publicUrl = await uploadGeminiAvatar(geminiImageUrl, playerName);
// ✅ Avatar automatically saved to sessionStorage
// ✅ Will be included in leaderboard submission
```

**Where to add this:**
- In `app/details/page.tsx` after analysis completes
- OR in a separate Gemini service file
- OR wherever you call Gemini image generation

### Example Integration
```typescript
// After analysis completes and Gemini generates avatar
const generateAndUploadAvatar = async () => {
  try {
    // 1. Generate with Gemini
    const prompt = `Cricket bowling avatar for ${playerName}`;
    const geminiResponse = await fetch('YOUR_GEMINI_API', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
    const { imageUrl } = await geminiResponse.json();
    
    // 2. Upload to Supabase
    const avatarUrl = await uploadGeminiAvatar(imageUrl, playerName);
    
    // 3. Done! It's now in sessionStorage and will be submitted
    console.log('Avatar ready:', avatarUrl);
  } catch (error) {
    console.error('Avatar upload failed:', error);
    // Analysis still works without avatar
  }
};
```

## 📍 Displaying Avatars in Leaderboard

### Current Components to Update

**1. LeaderboardClient.tsx** (line ~220)
```tsx
// Add this in your player name cell
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  {/* Avatar */}
  {entry.avatar_url ? (
    <img
      src={entry.avatar_url}
      alt={entry.name}
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        objectFit: 'cover'
      }}
    />
  ) : (
    <div style={{ 
      width: 40, 
      height: 40, 
      borderRadius: '50%',
      background: '#ccc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      👤
    </div>
  )}
  <span>{entry.name}</span>
</div>
```

## 🔍 Testing Checklist

- [ ] SQL migration completed
- [ ] Storage bucket exists
- [ ] Test analysis submission
- [ ] Check browser console logs
- [ ] Verify entry in Supabase table
- [ ] (Optional) Test avatar upload
- [ ] (Optional) Display avatar in leaderboard

## 🐛 Troubleshooting

### No entry in database
**Check:**
1. Browser console for errors
2. Supabase API keys in `.env`
3. RLS policies are set correctly

### Avatar not uploading
**Check:**
1. Storage bucket is **public**
2. File size < 5MB
3. Image format is JPEG/PNG/WebP

### Duplicate entries
This shouldn't happen due to `hasSubmittedToLeaderboard` flag.

**If it does:**
```typescript
// In analyze page, check this state exists:
const [hasSubmittedToLeaderboard, setHasSubmittedToLeaderboard] = useState(false);
```

## 📚 Full Documentation

For complete details, see:
- `SUPABASE_LEADERBOARD_AVATAR_INTEGRATION.md` - Full guide
- `lib/utils/avatarUpload.ts` - API reference
- `supabase/add_avatar_storage.sql` - Database schema

## 🎯 Next Steps

1. **Run the SQL migration** ← Start here
2. **Test leaderboard submission** ← Works automatically
3. **Integrate Gemini avatar upload** ← Add where you call Gemini
4. **Update leaderboard UI** ← Display avatars

## 💡 Pro Tips

1. **Avatar generation is optional** - leaderboard works without it
2. **Use WebP format** - smallest file size
3. **Cache avatars** - they're public URLs, cache for 1 hour
4. **Compress before upload** - faster uploads, less storage

---

**Need help?** Check the full documentation or Supabase dashboard logs.

**Status:** ✅ Ready to use  
**Time to setup:** ~5 minutes  
**Complexity:** Low (mostly SQL migration)
