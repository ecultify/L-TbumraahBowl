import './globals.css';
import type { Metadata } from 'next';
import { AppProviders } from './providers';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import GoogleSearchConsole from '@/components/GoogleSearchConsole';

export const metadata: Metadata = {
  title: 'Bowl Like Bumrah Contest - L&T Finance',
  description: 'Join the Bowl Like Bumrah Contest! Analyze your cricket bowling action, compare it with Jasprit Bumrah, and win exciting prizes. Powered by L&T Finance.',
  // Favicon & app icons from public/favicon_io
  icons: {
    icon: [
      { url: '/favicon_io/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon_io/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon_io/favicon.ico' },
    ],
    apple: [
      { url: '/favicon_io/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon_io/favicon.ico'],
  },
  manifest: '/favicon_io/site.webmanifest',
  // Open Graph metadata for social media sharing
  openGraph: {
    title: 'Bowl Like Bumrah Contest - L&T Finance',
    description: 'Join the Bowl Like Bumrah Contest! Analyze your cricket bowling action, compare it with Jasprit Bumrah, and win exciting prizes. Powered by L&T Finance.',
    url: 'https://bowllikebumrah.com',
    siteName: 'Bowl Like Bumrah Contest',
    images: [
      {
        url: 'https://bowllikebumrah.com/images/og-share-image.avif',
        width: 1200,
        height: 630,
        alt: 'L&T Finance - Bowl Like Bumrah Contest',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  // Twitter Card metadata
  twitter: {
    card: 'summary_large_image',
    title: 'Bowl Like Bumrah Contest - L&T Finance',
    description: 'Join the Bowl Like Bumrah Contest! Analyze your cricket bowling action, compare it with Jasprit Bumrah, and win exciting prizes.',
    images: ['https://bowllikebumrah.com/images/og-share-image.avif'],
    creator: '@LntFinance',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <GoogleSearchConsole />
        
        {/* Performance Optimizations - Preconnect to critical origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Preload LCP (Largest Contentful Paint) image for faster loading */}
        <link 
          rel="preload" 
          href="/images/newhomepage/front bg.avif" 
          as="image" 
          fetchPriority="high"
        />
        
        {/* Google Analytics - gtag.js */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-0E16JF6RQ4"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-0E16JF6RQ4');
            `,
          }}
        />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
