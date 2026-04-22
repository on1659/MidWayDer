import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Noto_Sans_KR } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { InstallBanner } from '@/components/ui/InstallBanner';
import { Providers } from '@/components/Providers';

// Font optimization: Noto Sans KR with display: swap
const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans-kr',
  preload: true,
});

// Re-export reportWebVitals for Next.js automatic collection
export { reportWebVitals } from '@/lib/monitoring/performance';

export const metadata: Metadata = {
  metadataBase: new URL('https://midwayder.vercel.app'),
  title: {
    default: 'MidWayDer - 가는 길 중간에 필요한 곳을 더하다',
    template: '%s | MidWayDer',
  },
  description: 'A에서 B로 이동하는 경로상에서 이탈 거리와 추가 소요 시간이 가장 적은 최적의 경유지를 추천합니다. 실제 도로 거리/시간 기반으로 다이소, 스타벅스, 편의점 등을 찾아보세요.',
  keywords: ['경유지 추천', '다이소 찾기', '스타벅스 경로', '편의점 경유', '길 찾기', '경로 계획', 'MidWayDer', '최적 경로'],
  authors: [{ name: 'MidWayDer Team' }],
  creator: 'MidWayDer',
  publisher: 'MidWayDer',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://midwayder.vercel.app',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://midwayder.vercel.app',
    siteName: 'MidWayDer',
    title: 'MidWayDer - 경로상 최적 경유지 추천',
    description: 'A→B 경로에서 최소 이탈로 들를 수 있는 최적의 경유지를 추천합니다. 실제 도로 거리/시간 기반 추천.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MidWayDer - 경로상 최적 경유지 추천 서비스',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MidWayDer - 경로상 최적 경유지 추천',
    description: 'A→B 경로에서 최소 이탈로 들를 수 있는 최적의 경유지를 추천합니다.',
    images: ['/og-image.png'],
    creator: '@midwayder',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MidWayDer',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={notoSansKR.variable} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3274f9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <Script
          id="theme-init"
          strategy="beforeInteractive"
        >{`(() => {
  try {
    const theme = localStorage.getItem('theme');
    const autoTheme = localStorage.getItem('auto-theme');
    if (autoTheme === 'true') {
      const h = new Date().getHours();
      if (h < 6 || h >= 18) document.documentElement.classList.add('theme-dark');
    } else if (theme === 'dark') {
      document.documentElement.classList.add('theme-dark');
    }
    const color = localStorage.getItem('color-theme');
    const allowed = ['blue','indigo','violet','teal','emerald','rose','slate'];
    document.documentElement.setAttribute('data-theme', allowed.includes(color) ? color : 'blue');
  } catch {}
})();`}</Script>
      </head>
      <body className="antialiased font-sans">
        <Providers>
          <ServiceWorkerRegister />
          <OfflineBanner />
          <InstallBanner />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
