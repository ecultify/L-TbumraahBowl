# Social Media Sharing Metadata Updated ✅

## Changes Made

Updated the website's metadata for social media sharing (WhatsApp, Facebook, Twitter, LinkedIn, etc.) to promote the Bowl Like Bumrah Contest with L&T Finance branding.

## File Modified

`app/layout.tsx`

## What Changed

### 1. **Page Title**
- **Before:** "Cricket Bowling Speed Meter"
- **After:** "Bowl Like Bumrah Contest - L&T Finance"

### 2. **Description**
- **Before:** "Analyze your cricket bowling action and visualize speed intensity"
- **After:** "Join the Bowl Like Bumrah Contest! Analyze your cricket bowling action, compare it with Jasprit Bumrah, and win exciting prizes. Powered by L&T Finance."

### 3. **Open Graph Tags (Facebook, WhatsApp, LinkedIn)**
Added comprehensive Open Graph metadata:
```typescript
openGraph: {
  title: 'Bowl Like Bumrah Contest - L&T Finance',
  description: 'Join the Bowl Like Bumrah Contest! Analyze your cricket bowling action, compare it with Jasprit Bumrah, and win exciting prizes. Powered by L&T Finance.',
  url: 'https://bowllikebumrah.com',
  siteName: 'Bowl Like Bumrah Contest',
  images: [
    {
      url: '/images/newhomepage/Bowling Campaign Logo.png',  // ← L&T Finance logo
      width: 1200,
      height: 630,
      alt: 'L&T Finance - Bowl Like Bumrah Contest',
    },
  ],
  locale: 'en_IN',
  type: 'website',
}
```

### 4. **Twitter Card Tags**
Added Twitter-specific metadata:
```typescript
twitter: {
  card: 'summary_large_image',
  title: 'Bowl Like Bumrah Contest - L&T Finance',
  description: 'Join the Bowl Like Bumrah Contest! Analyze your cricket bowling action, compare it with Jasprit Bumrah, and win exciting prizes.',
  images: ['/images/newhomepage/Bowling Campaign Logo.png'],  // ← L&T Finance logo
  creator: '@LntFinance',
}
```

## How It Looks When Shared

### WhatsApp / Facebook / LinkedIn
When someone shares a link to `bowllikebumrah.com`:
- **Image:** L&T Finance Bowling Campaign Logo (large banner)
- **Title:** Bowl Like Bumrah Contest - L&T Finance
- **Description:** Join the Bowl Like Bumrah Contest! Analyze your cricket bowling action, compare it with Jasprit Bumrah, and win exciting prizes. Powered by L&T Finance.

### Twitter
- **Card Type:** Large image card (1200x630px)
- **Image:** L&T Finance Bowling Campaign Logo
- **Title:** Bowl Like Bumrah Contest - L&T Finance
- **Description:** Join the Bowl Like Bumrah Contest! Analyze your cricket bowling action, compare it with Jasprit Bumrah, and win exciting prizes.
- **Creator:** @LntFinance

## Logo Used

**File:** `public/images/newhomepage/Bowling Campaign Logo.png`

This is the official L&T Finance logo for the Bowl Like Bumrah Contest campaign.

## Testing Social Media Previews

After deploying, you can test how the link preview looks:

1. **Facebook/LinkedIn:** https://developers.facebook.com/tools/debug/
2. **Twitter:** https://cards-dev.twitter.com/validator
3. **General:** https://www.opengraph.xyz/

Simply paste your URL and it will show you the preview.

## Deployment

Upload `app/layout.tsx` to VPS and rebuild:
```bash
npm run build && pm2 restart bowling-web
```

**Note:** After deployment, you may need to:
1. Clear social media caches (using the debug tools above)
2. Wait 5-10 minutes for social platforms to refresh their cache
3. Share a test link to verify the new preview appears correctly

## SEO Benefits

✅ **Professional branding** with L&T Finance logo
✅ **Clear contest messaging** to attract participants
✅ **Optimized for Indian market** (locale: en_IN)
✅ **Large image cards** for better visibility in social feeds
✅ **Consistent branding** across all social platforms

