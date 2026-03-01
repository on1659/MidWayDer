import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,  // "X-Powered-By: Next.js" 헤더 제거
  reactStrictMode: true,   // 개발 중 이중 렌더링으로 side-effect 조기 감지
};

export default nextConfig;
