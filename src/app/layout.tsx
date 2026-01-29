import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MidWayDer - 가는 길 중간에 필요한 곳을 더하다',
  description: 'A에서 B로 이동하는 경로상에서 이탈 거리와 추가 소요 시간이 가장 적은 최적의 경유지를 추천합니다.',
  keywords: ['경유지', '경로', '다이소', '스타벅스', '편의점', '최적 경로'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
