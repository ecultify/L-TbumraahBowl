import './globals.css';
import type { Metadata } from 'next';
import { AppProviders } from './providers';

export const metadata: Metadata = {
  title: 'Cricket Bowling Speed Meter',
  description: 'Analyze your cricket bowling action and visualize speed intensity',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
