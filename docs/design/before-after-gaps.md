# Before / After 갭 가이드

목업(`docs/design/mockups/`)이 **타겟**, 현재 배포된 앱이 **현 상태**. 이 문서는 **영역별 갭**을 눈에 보이게 정리.

**쓰는 법**: 한 영역 작업 전에 이 문서 + 목업 HTML 을 나란히 열고, 차이를 확인한 뒤 마이그레이션 체크리스트 실행.

**관련**:
- 목업: `docs/design/mockups/` — 브라우저로 `index.html` 열기
- 배포 앱: https://midwayder.up.railway.app
- 체크리스트: [`./component-migration-checklist.md`](./component-migration-checklist.md)
- 토큰 매핑: [`./hex-to-token-map.md`](./hex-to-token-map.md)

**갭 표기 범례**
- 🟢 이미 근접 · 🟡 부분 적용 · 🔴 큰 차이 · ⚫ 목업에만 있음 (미구현)

---

## 0. 비교 셋업 — 어떻게 나란히 볼 것인가

### 0.1 목업 열기
```bash
# 로컬에서
open docs/design/mockups/index.html

# 또는 파일 경로 복사해서 브라우저 주소창에
file:///Users/radar/Work/MidWayDer/docs/design/mockups/index.html
```
→ 상단 스위처로 7컬러 + 라이트/다크 전환 가능. 상단 카드에서 mobile / desktop / tokens 선택.

### 0.2 앱 열기
```
https://midwayder.up.railway.app/           # 홈
https://midwayder.up.railway.app/settings   # 테마 선택
```

### 0.3 나란히 비교
- macOS: `Cmd+Option+←/→` 로 창 좌우 분할
- 목업 URL 에 `?theme=violet&mode=dark` 붙이면 특정 테마/모드 즉시 적용
- 앱은 `/settings` 에서 선택 후 홈 이동

---

## 1. 홈 / 메인 검색 (모바일)

**목업 타겟**: `mockups/mobile.html`
**앱 현재**: https://midwayder.up.railway.app/ (iPhone size)

### 1.1 헤더 / 상단 바
| 항목 | 목업 | 현재 | 갭 |
|------|------|------|----|
| 상단 배경 | Glass (`backdrop-filter: blur(24px) saturate(180%)`) | 일반 `--bg-surface` | 🟡 |
| Dynamic Island Pill | 상단에 morphing 상태 인디케이터 (검색 중→완료) | 없음 | ⚫ |
| Safe area top | `env(safe-area-inset-top)` 정확 반영 | 적용됨 | 🟢 |

### 1.2 검색 입력 블록
| 항목 | 목업 | 현재 | 갭 |
|------|------|------|----|
| 입력 필드 배경 | `--surface-1` + `--shadow-2` | 유사 | 🟢 |
| 아이콘 색 | 카테고리별 accent tint | 고정 색 | 🟡 |
| focus ring | `--accent` 2px | 기본 outline | 🟡 |
| 자동완성 리스트 | glass + 카드 그림자 | 일반 flat 리스트 | 🔴 |

### 1.3 카테고리 칩 (빠른 선택)
| 항목 | 목업 | 현재 | 갭 |
|------|------|------|----|
| 칩 모양 | Pill `--radius-full` | Pill | 🟢 |
| 아이콘 + 텍스트 조합 | 큰 이모지 + 작은 텍스트 | 작은 이모지 + 텍스트 | 🟡 |
| 활성 상태 | `--accent` 배경 + 흰색 | 유사 | 🟢 |
| 호버 모션 | `translateY(-2px)` + `--shadow-accent-sm` | 없음 | 🟡 |

### 1.4 Bottom Quick Bar (FAB 군집)
| 항목 | 목업 | 현재 | 갭 |
|------|------|------|----|
| 위치 | 하단 고정, safe-area 반영 | 반영됨 | 🟢 |
| FAB accent 색 | `--accent` 그라디언트 | 단색 accent | 🟡 |
| 그림자 | `--shadow-accent-md` | 일반 shadow | 🟡 |
| 아이콘 크기 | 24px | 20–24 혼재 | 🟡 |

---

## 2. 검색 결과 화면

### 2.1 결과 카드 ✅ **Phase 2 에서 크게 좁힘**

**목업 타겟**: `mockups/mobile.html` → 스크롤 후 결과 카드
**앱 현재**: 홈에서 아무 경로 검색

| 항목 | 목업 | 현재 | 갭 |
|------|------|------|----|
| 3통계 Stat Pods (+분/+km/점수) | 3열 그리드 | **적용됨 ✅** | 🟢 |
| 순위 배지 | 원형 `--accent` 채움, 내부 흰 숫자 | 동일 | 🟢 |
| 매장 이름 색 | `--accent` 계열 | 적용됨 | 🟢 |
| 주소 텍스트 | `--text-secondary` | 동일 | 🟢 |
| 보조 뱃지 줄 | 자연스러운 줄바꿈, 숨 쉴 공간 | 많아지면 답답함 | 🟡 |
| 컴팩트 모드 MiniStatStrip | 한 줄 pill | **적용됨 ✅** | 🟢 |
| 카드 hover 모션 | `translateY(-2px)` + `--shadow-3` | 기본 shadow transition | 🟡 |
| 스와이프 힌트 | 아이콘 + 텍스트 툴팁 | 적용됨 | 🟢 |

### 2.2 베스트 픽 배너
| 항목 | 목업 | 현재 | 갭 |
|------|------|------|----|
| 배너 색 | 황금 그라디언트 (yellow→orange) | 동일 | 🟢 |
| 배너 탭 시 스코어 자동 열림 | 있음 | 적용됨 | 🟢 |

### 2.3 필터 & 정렬 바
| 항목 | 목업 | 현재 | 갭 |
|------|------|------|----|
| Sticky 상단 고정 | 스크롤 시 자동 | 적용됨 | 🟢 |
| 정렬 탭 (거리/시간/점수/마감임박) | Segmented control | Segmented 유사 | 🟢 |
| 필터 칩 활성 | `--overlay-selected` + `--border-accent` | hex 하드코딩 남음 | 🔴 |
| 프리셋 버튼 (⚡빠른경유/🔥지금당장) | 강조 색 버튼 | 일반 버튼 | 🟡 |
| 숫자 프리뷰 "(N개)" | 작은 텍스트 | 있음 | 🟢 |

### 2.4 결과 없음 (EmptyState)
| 항목 | 목업 | 현재 | 갭 |
|------|------|------|----|
| 일러스트/이모지 | 중앙 큰 이모지 | 텍스트 위주 | 🟡 |
| 재시도 CTA | `--accent` 버튼 | 기본 버튼 | 🟡 |
| 인기 카테고리 제안 | 2×2 그리드 | 가로 스크롤 | 🟡 |

---

## 3. 데스크톱 메인 (4-pane)

**목업 타겟**: `mockups/desktop.html`
**앱 현재**: https://midwayder.up.railway.app/ (1280px+)

### 3.1 전체 레이아웃
| 항목 | 목업 | 현재 | 갭 |
|------|------|------|----|
| Grid 구조 | `56px 380px 1fr 440px` | 2-pane (사이드 + 지도) | 🔴 |
| 좌측 Rail (56px) | 아이콘 세로 네비 | 없음 | ⚫ |
| 좌측 Panel (380px) | 검색 + 결과 리스트 | 단일 사이드 패널 | 🟡 |
| 중앙 지도 | 1fr | 지도 | 🟢 |
| 우측 Detail (440px) | 장소 상세 슬라이드 인 | 없음 (카드 탭 → 모달?) | 🔴 |

### 3.2 Rail (좌측 56px)
⚫ **전부 미구현**. 목업 상 홈/검색/즐겨찾기/최근/경로/설정/프로필 아이콘 세로 배치.

### 3.3 중앙 지도 영역 위 컨트롤
| 항목 | 목업 | 현재 | 갭 |
|------|------|------|----|
| 재검색 Pill | 상단 floating, glass effect | 있음 | 🟡 (스타일만 맞추면) |
| 지도 컨트롤 버튼 | `--surface-2` + `--shadow-2` | 카카오 기본 | 🔴 (SDK 기본 스킨) |
| Bento Pods (지도 위 미니 통계) | 우상단 4개 카드 | 없음 | ⚫ |

### 3.4 우측 Detail Panel
⚫ **전부 미구현 (목업에만)**. 카드 선택 시 우측에서 슬라이드 인:
- 히어로 그라디언트 (accent 600→900)
- 액션 그리드 (네비/공유/즐겨찾기/전화/방문)
- Stat Pods 2×2 (+분/+km/점수/영업상태)
- 영업시간 24h 타임라인
- 점수 분해 바 차트
- 관련 장소 가로 스크롤
- 하단 sticky CTA "지금 출발"

---

## 4. 지도 요소

### 4.1 A/B 마커 (출발/도착)
| 항목 | 목업 | 현재 | 갭 |
|------|------|------|----|
| 크기 | 32px | 32–40 혼재 | 🟡 |
| 다크 모드 가시성 | `#e4e4e7` 배경 + `#1c1c22` 테두리 | 어두운 bg 그대로 | 🔴 (이 fix 는 모든 마커 필요) |
| 라벨 (A/B) | 내부 흰 글씨 | 동일 | 🟢 |

### 4.2 경유지 마커 (번호)
| 항목 | 목업 | 현재 | 갭 |
|------|------|------|----|
| accent 색 | `var(--accent)` | ✅ 런타임 해석 | 🟢 |
| 선택 시 색 | success (초록) | ✅ 적용됨 | 🟢 |
| hover scale | 1.25 | 적용됨 | 🟢 |
| 선택 시 zIndex | 1000 | 적용됨 | 🟢 |

### 4.3 Info Window (마커 hover/click 팝업)
| 항목 | 목업 | 현재 | 갭 |
|------|------|------|----|
| 배경 | `--surface-2` + `--shadow-3` | 흰 배경 + 기본 shadow | 🟡 |
| accent 뱃지 | `--color-accent-100` + `var(--accent)` | ✅ 런타임 해석 | 🟢 |
| 타이포 | `--text-sm`/`--text-xs` | 고정 px | 🟡 |
| 닫기 X 버튼 | 우상단 | (자동 닫힘) | 🟡 |

### 4.4 경로 폴리라인
| 항목 | 목업 | 현재 | 갭 |
|------|------|------|----|
| 경로 색 | `var(--accent)` (테마 반영) | 고정 파란색 | 🔴 **theme-colors.ts 경유 전환 필요** |
| 두께 | 6px 주경로, 4px 보조 | 고정 | 🟡 |
| 선 스타일 | solid 기본, 회피 구간 dash | solid | 🟡 |

---

## 5. 설정 페이지 `/settings`

**목업 타겟**: `mockups/desktop.html` 혹은 `mobile.html` 설정 영역 (또는 직접 `AppearanceSettings.tsx`)
**앱 현재**: https://midwayder.up.railway.app/settings

### 5.1 "화면 테마" 섹션 (AppearanceSettings)
✅ **레퍼런스 구현**. 타 섹션이 여기에 맞춰야 함.

| 항목 | 상태 |
|------|------|
| 7색 스와치 원형 | 🟢 |
| 라이트/다크/시간대별 3모드 | 🟢 |
| 미리보기 카드 | 🟢 |
| 토큰 준수 | 🟢 (색/반경/그림자 전부 토큰) |

### 5.2 Cache / Sync / Notification / CustomCategory 섹션
| 항목 | 목업 (AppearanceSettings 기준) | 현재 | 갭 |
|------|------|------|----|
| 섹션 컨테이너 | `--bg-surface` + `--border-soft` + `--radius-4` + `p-5` | 제각각 | 🔴 |
| 섹션 제목 아이콘 색 | `--accent` | 고정 색 | 🟡 |
| 토글 버튼 스타일 | `--bg-surface-muted` ↔ `--overlay-selected` | 제각각 | 🔴 |
| 입력 필드 focus | `--accent` ring | 기본 | 🟡 |

---

## 6. 공용 UI (Dialog / Toast / Banner / Skeleton)

### 6.1 ConfirmDialog
| 항목 | 목업 | 현재 | 갭 |
|------|------|------|----|
| 뒷배경 | `--overlay-scrim` | `bg-black bg-opacity-50` 같은 Tailwind | 🔴 |
| 다이얼로그 | `--surface-3` + `--shadow-4` + `--radius-5` | 일반 카드 | 🟡 |
| 확인 버튼 | `--accent` primary | 유사 | 🟢 |

### 6.2 Toast
| 항목 | 목업 | 현재 | 갭 |
|------|------|------|----|
| 배경 | `--surface-4` + `--shadow-3` | 일반 | 🟡 |
| 상태 표시 | 왼쪽 `--color-{role}-500` 4px 바 | 없음 | 🔴 |
| 위치 | 하단 중앙, safe-area 반영 | 상단 or 하단 | 🟡 |

### 6.3 Skeleton
| 항목 | 목업 | 현재 | 갭 |
|------|------|------|----|
| 베이스 색 | `--bg-surface-muted` | 유사 | 🟢 |
| Shimmer 색 | accent 5% tint | 회색 shimmer | 🟡 |
| 애니메이션 | `--duration-slower` + `--ease-standard` | 기본 | 🟡 |

---

## 7. 다크 모드 파리티

목업 × 앱을 각 테마의 다크 모드에서 직접 비교. 아래 체크:

### 7.1 필수 체크 (14조합 = 7컬러 × 라이트/다크)
- [ ] blue × light
- [ ] blue × dark
- [ ] violet × light
- [ ] violet × dark
- [ ] emerald × light
- [ ] emerald × dark
- [ ] rose × light
- [ ] rose × dark (error 용도 혼동 체크)
- [ ] slate × light (중립 테마 가독성)
- [ ] slate × dark

### 7.2 다크에서 주의할 곳
- 지도 A/B 마커 (흰 글씨 → 어두운 배경 위)
- 카드 내 status 뱃지 (yellow/amber 가 쨍)
- Glass 블러 배경 투명도 조정
- Shadow 강도 (라이트 대비 2배)

---

## 8. 모션 일관성

| 동작 | 토큰 | 적용 상태 |
|------|------|----------|
| 버튼 active:scale | `--duration-fast` + `--ease-emphasized` | 🟡 일부 |
| 카드 hover | `--duration-normal` + `--ease-emphasized` | 🟡 일부 |
| 모달 진입 | `--duration-slow` + `--ease-decelerate` | 🔴 미적용 |
| 모달 퇴장 | `--duration-fast` + `--ease-accelerate` | 🔴 미적용 |
| 바텀시트 snap | `--duration-slow` + `--ease-emphasized` | 🟢 적용됨 |
| 토스트 진입 | `--duration-normal` + `--ease-spring` | 🔴 미적용 |

---

## 9. 접근성 갭

### 9.1 포커스 관리
- [ ] 모든 인터랙티브 요소에 `focus-visible:ring-2 ring-accent ring-offset-2`
- [ ] 카드 포커스 시 border-accent 하이라이트
- [ ] 키보드로 필터 칩 탐색 가능

### 9.2 터치 타겟 44×44
- [ ] 결과 카드 내 액션 버튼 (이미 체크됨)
- [ ] 필터 칩 (padding 확보 확인 필요)
- [ ] 지도 컨트롤 (카카오 기본 44 이상)

### 9.3 스크린리더
- [ ] 결과 카드 `aria-describedby` 있음 ✅
- [ ] 테마 스와치 `aria-label` 있음 ✅
- [ ] 정렬 탭 `role="tablist"` 추가 여부
- [ ] 필터 칩 `aria-pressed` 반영

---

## 10. 갭 스캐닝 자동화 (grep)

**빠른 진단** — 파일별 갭 크기 추정:

```bash
# 영역별 hex 카운트
for dir in src/components/search/result-list src/components/search src/components/map src/components/ui src/components/settings; do
  count=$(grep -rhEo "#[0-9a-fA-F]{6}" "$dir" --include="*.tsx" 2>/dev/null | wc -l)
  echo "$count  $dir"
done | sort -rn
```

**결과 해석**
- 0–5 리터럴: 이미 거의 완료 (🟢)
- 5–15: 부분 마이그레이션 (🟡)
- 15–50: 중대 작업 필요 (🔴)
- 50+: 우선순위 재검토

---

## 11. 갭 메우기 시나리오별 가이드

### 🟢 갭 작음 — 문서 §X 참고하여 즉시 치환
1. hex-to-token-map.md 표 찾아 치환
2. 타입체크/테스트
3. 7테마 × 라이트/다크 스팟 체크
4. PR 올림

### 🟡 중간 갭 — 영역 단위 PR
1. component-migration-checklist.md 에서 영역 범위 확정
2. Scout 먼저 (하네스 §3) — 깨지면 안 되는 계약 파악
3. 단일 세션에서 순차 처리
4. PA-Feature-Matrix 해당 영역 전수

### 🔴 큰 갭 / ⚫ 미구현 — meeting 라우팅
1. `docs/harness/decision-framework.md` 기준 판단
2. Mission fit / User flow fit 확인
3. 구현 비용 vs 가치 재평가
4. 필요시 사양 축소 (목업 100% 아니어도 토큰 준수만으로 충분한 영역)

---

## 12. 진척 대시보드

이 문서 섹션별 🟢/🟡/🔴/⚫ 마커를 PR 머지마다 갱신해서 전체 진척 시각화.

**현재 요약 (2026-04-23 기준)**
- 결과 카드 (영역 2.1): 🟢 (Phase 2 완료)
- 필터/정렬 (영역 2.3): 🔴 (hex 많이 남음)
- 지도 마커 (영역 4.2): 🟢
- 지도 폴리라인 (영역 4.4): 🔴 (고정 색)
- 데스크톱 4-pane (영역 3): ⚫ (설계 결정 필요)
- 설정 타 섹션 (영역 5.2): 🔴 (통일 스타일 부재)
- 공용 UI (영역 6): 🟡 (ConfirmDialog/Toast 부분)

다음 스프린트 권장 순서:
1. 영역 2.3 (필터/정렬) — 가장 노출 많고, hex 건수 많음
2. 영역 4.4 (폴리라인 색) — `theme-colors.ts` 패턴 이미 있어서 빠름
3. 영역 5.2 (설정 섹션 통일) — 새 디자인 랜드마크
4. 영역 6 (공용 UI) — 일괄 적용 가능
5. 영역 3 (데스크톱 4-pane) — meeting 후 결정
