import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  poweredByHeader: false,  // "X-Powered-By: Next.js" 헤더 제거
  reactStrictMode: true,   // 개발 중 이중 렌더링으로 side-effect 조기 감지

  // Service Worker 헤더 설정
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
