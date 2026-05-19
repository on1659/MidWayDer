# Frontend Reset Meeting - 2026-05-05

## 결정

기존 UI/UX 마이그레이션 흐름은 중단하고, 프론트엔드 홈 경험을 처음부터 다시 설계한다. 단, 검색 API, Zustand store, 지도 provider, 장소 상세/저장 같은 도메인 계약은 유지한다.

## 역할별 합의

| 역할 | 관점 | 결론 |
|---|---|---|
| Product | 사용자가 앱을 여는 이유 | "길 중간에 들를 곳 찾기" 하나를 첫 화면 목표로 둔다. |
| UX | 첫 화면 인지 부하 | 출발지, 도착지, 들를 곳, 검색 버튼 외 기능은 기본 화면에서 숨긴다. |
| Frontend | 구현 전략 | `src/app/page.tsx`를 새 shell로 교체하고 기존 컴포넌트는 필요한 것만 연결한다. |
| QA | 회귀 기준 | `origin-input`, `destination-input`, `search-route-btn`, `open-search-overlay-btn` 계약은 유지한다. |

## 새 화면 원칙

- Desktop: 지도 위에 불투명한 작업 패널 하나만 둔다.
- Mobile: 지도 우선, 검색은 상단 진입 버튼과 기존 overlay 계약으로 연결한다.
- 검색 전: empty state 하나만 보여준다.
- 검색 후: 결과 수, 공유, 결과 리스트만 보여준다.
- 상세: 장소를 선택했을 때만 detail pane/sheet를 보여준다.
- 기본 화면 제외: rail, routine, favorites, compare, multi-stop, provider toggle, route legend, feedback FAB.

## 다음 설계 대상

1. `ResultList`를 새 shell에 맞게 간결한 리스트로 재설계한다.
2. `SearchOverlay` 모바일 화면을 같은 정보 구조로 다시 만든다.
3. `PlaceDetail`을 선택 후 의사결정 패널로 축소한다.
4. 설정/저장/고급 기능은 별도 화면 또는 검색 후 action으로만 노출한다.
