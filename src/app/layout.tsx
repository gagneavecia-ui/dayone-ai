import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { AppProviders } from '@/components/providers/app-providers';
import { LANG_COOKIE, isLanguage } from '@/lib/i18n/shared';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'DAYONE AI — Your life. Your goals. Your progress.',
  description:
    'DAYONE AI turns your personal goals into daily missions, with an AI coach, daily reviews and real progress analytics. Plan. Act. Progress.',
  keywords: ['goals', 'productivity', 'AI coach', 'daily missions', 'habits', 'DAYONE'],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'DAYONE AI',
    description: 'Your life. Your goals. Your progress.',
    siteName: 'DAYONE AI',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LANG_COOKIE)?.value;
  const lang = isLanguage(cookieLang) ? cookieLang : 'en';

  return (
    <html lang={lang} className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <AppProviders initialLang={lang}>{children}</AppProviders>
      </body>
    </html>
  );
}
