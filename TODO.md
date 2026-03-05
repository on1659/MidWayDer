# TODO: 자유 경유지 검색 + 단일 선택 UX (v0.15.0)

## 목표
1. "홍대입구역", "이태원 맛집" 등 자유로운 경유지 검색 지원
2. UI상으로 하나만 선택하게 가이드 (기술적 다중 선택 유지)

---

## Phase 1: API 확장 (1시간)

### 1.1 `/api/search` 라우트 수정
- `query` 파라미터 추가 (기존 `category` 유지)
- `searchType` 자동 감지 로직
  - 카테고리 목록에 있으면 → 카테고리 검색
  - 없으면 → 키워드 검색

**수정 파일:**
- `src/app/api/search/route.ts`

### 1.2 키워드 검색 함수 추가
- `searchByKeyword()` 함수 구현
- Naver Local Search API 호출
- 경로 주변 필터링 (PostGIS)

**수정 파일:**
- `src/lib/naver-client.ts`
- `src/lib/search-utils.ts`

---

## Phase 2: 검색창 UI 개선 (1시간)

### 2.1 검색창 placeholder 변경
```
Before: "카테고리를 검색하세요"
After: "어디를 들를까? (예: 홍대입구역, 다이소)"
```

### 2.2 추천 카테고리 유지
```
[다이소] [스타벅스] [주유소] [올리브영]
```

**수정 파일:**
- `src/components/search/AddressInput.tsx`
- `src/components/search/SearchOverlay.tsx`

---

## Phase 3: 단일 선택 UX (1.5시간)

### 3.1 선택 로직 변경

**Before (다중 선택):**
```tsx
<Checkbox onChange={toggle} />
```

**After (단일 선택 가이드):**
```tsx
<Checkbox
  disabled={selected.size >= 1 && !selected.has(id)}
  onChange={toggle}
/>
```

### 3.2 UI 요소 추가

**기본 (하나 선택):**
```
✓ 홍대입구역 (+350m, +3분)

💡 하나만 선택하면 더 효율적인 경로를 얻을 수 있습니다

[완료] [다른 경유지 추가하기]
```

**추가 선택 시:**
```
선택됨 (2) [초기화]

1. 홍대입구역 ✕
2. 이태원 맛집 ✕

⚠️ 여러 경유지 선택 시 더 복잡한 경로가 됩니다

[경로 최적화하기]
```

**수정 파일:**
- `src/components/search/MultiStopSelector.tsx` → UI만 수정
- `src/components/search/ResultList.tsx`
- `src/components/search/SearchOverlay.tsx`

---

## Phase 4: 반응형 UI (1시간)

### 4.1 모바일 (375px ~ 768px)
```
┌─────────────────┐
│ [검색창]        │
│ 추천 (가로스크롤)│
├─────────────────┤
│ 검색 결과       │
│ ✓ 홍대입구역    │
│ □ ... (회색)    │
├─────────────────┤
│ [완료] [추가]   │
└─────────────────┘
```

### 4.2 PC (1024px+)
```
┌──────────┬──────────┐
│ 검색창   │          │
│ 추천     │  지도    │
│ 결과     │          │
│ 선택됨   │          │
└──────────┴──────────┘
```

**수정 파일:**
- `src/app/page.tsx`
- `src/components/search/DesktopSidePanel.tsx`
- `src/app/globals.css`

---

## Phase 5: 테스트 (30분)

### 5.1 API 테스트
```
✅ "다이소" → 카테고리 검색
✅ "홍대입구역" → 키워드 검색
✅ "이태원 맛집" → 키워드 검색
```

### 5.2 단일 선택 테스트
```
✅ 첫 번째 선택 → 나머지 비활성화
✅ "완료" 버튼 → 경로 표시
✅ "다른 경유지 추가하기" → 두 번째 선택 가능
✅ 여러 개 선택 → 최적화 버튼 활성화
```

### 5.3 반응형 테스트
```
✅ 모바일 (375px)
✅ 태블릿 (768px)
✅ PC (1024px+)
```

---

## 기술 스펙

### Naver Local Search API

**요청:**
```typescript
GET /v1/search/local.json
?query=홍대입구역
&display=10
&sort=random
```

**응답:**
```json
{
  "items": [
    {
      "title": "홍대입구역",
      "address": "서울 마포구 양화로 160",
      "mapx": "126.9234567",
      "mapy": "37.5567890"
    }
  ]
}
```

### 검색 로직

```typescript
// 카테고리 검색
if (query in CATEGORY_LIST) {
  return searchByCategory(query);
}

// 키워드 검색
else {
  return searchByKeyword(query);
}
```

### 단일 선택 로직

```typescript
const [selected, setSelected] = useState<Set<string>>(new Set());

const handleToggle = (id: string) => {
  const newSelected = new Set(selected);

  if (newSelected.has(id)) {
    newSelected.delete(id);
  } else {
    // 첫 번째 선택은 자유롭게
    if (newSelected.size === 0) {
      newSelected.add(id);
    }
    // 두 번째부터는 "다른 경유지 추가하기" 버튼 눌러야 함
    else if (allowMultiSelect) {
      newSelected.add(id);
    }
  }

  setSelected(newSelected);
};
```

---

## ⏱️ 예상 소요 시간

| Phase | 작업 | 시간 |
|-------|------|------|
| 1 | API 확장 | 1시간 |
| 2 | 검색창 UI | 1시간 |
| 3 | 단일 선택 UX | 1.5시간 |
| 4 | 반응형 UI | 1시간 |
| 5 | 테스트 | 30분 |
| **총계** | | **5시간** |

---

## 🚀 다음 단계

**다음 정각 (약 40분 후)에 auto-dev-pd-glm이 자동으로 시작할 거야.**

**실행 순서:**
1. TODO.md 읽기
2. Planning → PLAN.md 작성
3. Impl-doc → IMPL.md 작성
4. Coding → 구현 + 테스트 + 커밋
5. 완료 보고

**기대 효과:**
- ✅ "홍대입구역" 검색 가능
- ✅ "이태원 맛집" 검색 가능
- ✅ 기본적으로 하나만 선택 (UI 가이드)
- ✅ 필요 시 여러 개 선택 가능 (고급)

준비 완료! 🎉
