import type { Metadata } from 'next';
import Link from 'next/link';

const supportEmail = 'support@midwayder.com';

export const metadata: Metadata = {
  title: '개인정보 처리방침',
  description: 'MidWayDer 개인정보 처리방침',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh px-5 py-10" style={{ background: '#f8fafc', color: '#0f172a' }}>
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-10">
        <Link href="/" className="text-sm font-semibold" style={{ color: '#3274f9' }}>MidWayDer</Link>
        <h1 className="mt-4 text-3xl font-bold">개인정보 처리방침</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">시행일: 2026년 5월 6일</p>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <p>
            MidWayDer는 출발지와 도착지 사이에서 들르기 좋은 장소를 추천하는 서비스입니다.
            서비스 제공에 필요한 범위에서만 개인정보와 위치 관련 정보를 처리합니다.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">처리하는 정보</h2>
          <ul className="space-y-2 text-sm leading-7 text-slate-700">
            <li>출발지, 도착지, 선택 카테고리, 검색 결과와 경유 후보 선택 정보</li>
            <li>사용자가 허용한 경우 현재 위치 또는 지도 중심 좌표</li>
            <li>최근 검색, 저장 경로, 즐겨찾기, 직접 입력 카테고리 등 사용자가 저장한 정보</li>
            <li>방문 인증을 요청한 경우 일시적인 GPS 위치와 인증 결과</li>
            <li>알림을 허용한 경우 푸시 구독 엔드포인트와 알림 수신 설정</li>
            <li>세션 쿠키, 접속 로그, 기기/브라우저 정보, 오류 로그, 성능 지표, Vercel Analytics 이벤트</li>
            <li>피드백 제출 시 사용자가 입력한 의견과 첨부한 상황 설명</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">이용 목적</h2>
          <ul className="space-y-2 text-sm leading-7 text-slate-700">
            <li>경로 계산, 주변 장소 검색, 이탈 거리와 추가 시간을 계산하기 위해 사용합니다.</li>
            <li>최근 검색과 저장 경로를 복원하고, 사용자가 선택한 설정을 유지하기 위해 사용합니다.</li>
            <li>서비스 안정성, 오류 대응, 악용 방지, 성능 개선을 위해 로그와 분석 정보를 사용합니다.</li>
            <li>사용자가 명시적으로 동의한 경우에만 위치 권한과 푸시 알림을 사용합니다.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">제3자 처리와 제공</h2>
          <p className="text-sm leading-7 text-slate-700">
            지도, 주소 검색, 경로 계산을 위해 Kakao 또는 Naver 지도/검색 API가 사용될 수 있습니다.
            호스팅, 분석, 오류 추적, 데이터베이스 운영을 위해 Vercel, Railway, Sentry 등 운영 도구가
            사용될 수 있습니다. MidWayDer는 사용자의 위치 정보나 경로 정보를 제3자 광고 목적으로
            판매하지 않습니다.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">보관 기간</h2>
          <ul className="space-y-2 text-sm leading-7 text-slate-700">
            <li>브라우저에 저장되는 최근 검색, 설정, 즐겨찾기는 사용자가 삭제할 때까지 보관됩니다.</li>
            <li>서버에 저장된 경로, 피드백, 푸시 구독 정보는 기능 제공 또는 문의 처리에 필요한 동안 보관됩니다.</li>
            <li>서버 접속 로그와 오류 로그는 보안 및 장애 대응을 위해 최대 30일을 기준으로 보관합니다.</li>
            <li>법령상 보관 의무가 있는 경우 해당 기간 동안 보관할 수 있습니다.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">사용자 선택권</h2>
          <ul className="space-y-2 text-sm leading-7 text-slate-700">
            <li>위치 권한은 브라우저 또는 기기 설정에서 언제든 철회할 수 있습니다.</li>
            <li>최근 검색, 저장 경로, 캐시, 알림 설정은 앱의 설정 화면에서 삭제하거나 해제할 수 있습니다.</li>
            <li>개인정보 열람, 삭제, 처리 정지를 요청하려면 지원 이메일로 문의해 주세요.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">문의</h2>
          <p className="text-sm leading-7 text-slate-700">
            개인정보 및 위치정보 관련 문의: <a href={`mailto:${supportEmail}`} className="font-bold" style={{ color: '#3274f9' }}>{supportEmail}</a>
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/support" className="rounded-xl px-4 py-2 text-sm font-bold" style={{ background: '#3274f9', color: 'white' }}>
            지원 문의
          </Link>
          <Link href="/" className="rounded-xl px-4 py-2 text-sm font-bold ring-1 ring-slate-200">
            앱으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
