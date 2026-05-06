import type { HomeShellProps } from './types';

export default function HomeShell({
  children,
  map,
  desktop,
  mobile,
  overlays,
  appReady,
  isLoading,
  resultCount,
  error,
}: HomeShellProps) {
  return (
    <main id="main-content" className="relative h-full" role="main" data-testid="home-shell" data-ready={appReady}>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {isLoading && '경유지를 검색하고 있습니다.'}
        {!isLoading && resultCount > 0 && `${resultCount}개의 경유지를 찾았습니다.`}
        {error ? `검색 실패: ${error}` : ''}
      </div>
      {children || (
        <>
          {map}
          {desktop}
          {mobile}
          {overlays}
        </>
      )}
    </main>
  );
}
