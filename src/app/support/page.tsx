import type { Metadata } from 'next';
import Link from 'next/link';

const supportEmail = 'support@midwayder.com';

export const metadata: Metadata = {
  title: '지원',
  description: 'MidWayDer 지원 및 문의',
};

export default function SupportPage() {
  return (
    <main className="min-h-dvh px-5 py-10" style={{ background: '#f8fafc', color: '#0f172a' }}>
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-10">
        <Link href="/" className="text-sm font-semibold" style={{ color: '#3274f9' }}>MidWayDer</Link>
        <h1 className="mt-4 text-3xl font-bold">지원</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          검색, 위치 권한, 저장 경로, 개인정보 요청은 아래 이메일로 접수해 주세요.
          영업일 기준 3일 안에 확인합니다.
        </p>

        <div className="mt-8 rounded-2xl p-5 ring-1 ring-slate-200">
          <h2 className="font-bold">문의 이메일</h2>
          <a
            href={`mailto:${supportEmail}?subject=MidWayDer%20%EC%A7%80%EC%9B%90%20%EB%AC%B8%EC%9D%98`}
            className="mt-2 inline-block text-lg font-bold"
            style={{ color: '#3274f9' }}
          >
            {supportEmail}
          </a>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            개인정보 삭제, 위치정보 처리 문의, 푸시 알림 해지, 오류 제보도 같은 주소로 접수합니다.
          </p>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            ['문제 상황', '검색어, 출발지/도착지, 선택한 카테고리'],
            ['기기 정보', '사용 중인 기기와 브라우저 또는 설치 앱 환경'],
            ['재현 단계', '어떤 순서로 눌렀을 때 문제가 생겼는지'],
            ['화면 자료', '가능하다면 스크린샷 또는 오류 메시지'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl p-4 ring-1 ring-slate-200">
              <h2 className="font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </section>

        <div className="mt-8 rounded-2xl p-5 ring-1 ring-slate-200">
          <h2 className="font-bold">직접 해결할 수 있는 항목</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <li>위치 권한은 브라우저 또는 기기 설정에서 언제든 철회할 수 있습니다.</li>
            <li>최근 검색, 저장 경로, 캐시는 앱의 설정 화면에서 삭제할 수 있습니다.</li>
            <li>오프라인 상태에서는 연결 복구 후 다시 검색해 주세요.</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/privacy" className="rounded-xl px-4 py-2 text-sm font-bold ring-1 ring-slate-200">
            개인정보 처리방침
          </Link>
          <Link href="/" className="rounded-xl px-4 py-2 text-sm font-bold" style={{ background: '#3274f9', color: 'white' }}>
            앱으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
