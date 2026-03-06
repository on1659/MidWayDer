import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

// Re-export reportWebVitals for Next.js automatic collection
export { reportWebVitals } from '@/lib/monitoring/performance';

export const metadata: Metadata = {
  title: 'MidWayDer - 가는 길 중간에 필요한 곳을 더하다',
  description: 'A에서 B로 이동하는 경로상에서 이탈 거리와 추가 소요 시간이 가장 적은 최적의 경유지를 추천합니다.',
  keywords: ['경유지', '경로', '다이소', '스타벅스', '편의점', '최적 경로'],
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
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6c9cff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <Script
          id="theme-init"
          strategy="beforeInteractive"
        >{`(() => {
  try {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') document.documentElement.classList.add('theme-dark');
  } catch {}
})();`}</Script>
      </head>
      <body className="antialiased">
        <ServiceWorkerRegister />
        <OfflineBanner />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
