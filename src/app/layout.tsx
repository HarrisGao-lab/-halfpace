import type { Metadata, Viewport } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import SwRegister from '@/components/SwRegister';
import OnboardingGate from '@/components/OnboardingGate';

export const metadata: Metadata = {
  title: 'HalfPace',
  description: 'Your personal marathon training companion',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'HalfPace' },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <SwRegister />
        <OnboardingGate />
        <main className="max-w-md mx-auto min-h-screen" style={{ paddingBottom: 130 }}>
          {children}
        </main>
        <div className="max-w-md mx-auto">
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
