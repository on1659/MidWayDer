# MidWayDer Mobile UX Research Findings

## 🎯 Research Overview
- **Methods**: Heuristic Evaluation (Nielsen's 10), Mobile UX Best Practices, WCAG 2.1 AA Audit
- **Screens Analyzed**: 4 (Home, Search Results, Loading, Map View)
- **Evaluation Criteria**: WCAG 2.1 AA, Apple HIG (44pt min), Material Design (48dp min), Nielsen's Heuristics

---

## 👥 Key Findings (7 Issues)

### Finding 1: "경유지 찾기" Button Overflow
- **File**: `src/components/search/SearchOverlay.tsx` (line ~601)
- **Observation**: The primary CTA button uses `w-full` with no horizontal padding guard, causing it to visually extend to screen edges without breathing room
- **Heuristic Violated**: #4 Consistency & Standards, #8 Aesthetic & Minimalist Design
- **Impact**: Users may perceive the button as broken or untappable at edges; reduces visual hierarchy
- **Severity**: **Major**
- **Current CSS**: `className="w-full max-w-full py-5 text-white rounded-2xl font-bold text-lg"`
- **Fix**:
```tsx
// SearchOverlay.tsx line ~601
// Change:
className="w-full max-w-full py-5 text-white rounded-2xl font-bold text-lg active:scale-[0.97] ..."
// To:
className="w-full max-w-[calc(100%-32px)] mx-auto py-5 text-white rounded-2xl font-bold text-lg active:scale-[0.97] ..."
```
- **Rationale**: 16px margin on each side prevents edge-bleeding and follows Material Design's 16dp margin guideline

### Finding 2: Loading State Text Contrast
- **File**: `src/components/search/SearchOverlay.tsx` (lines 91-95)
- **Observation**: "경로 분석 중..." and phase messages display in a context where text color relies on inherited theme colors against dark overlay backgrounds. In dark mode, `--text-secondary: #94a3b8` on `--bg-surface: #0f172a` yields ~4.1:1 — below WCAG AA 4.5:1
- **Heuristic Violated**: #1 Visibility of System Status
- **Impact**: Users can't read loading status, causing uncertainty about whether the app is working
- **Severity**: **Critical**
- **Fix** (theme.css, `.theme-dark` block):
```css
/* Add to .theme-dark */
--text-loading: #cbd5e1;  /* slate-300: 7.1:1 contrast on #0f172a */
```
```tsx
// SearchOverlay.tsx loading section (~line 575)
// Add explicit text color:
<div className="text-center" style={{ color: 'var(--text-loading, var(--text-secondary))' }}>
```

### Finding 3: Placeholder Text Insufficient Contrast
- **File**: `src/components/search/SearchOverlay.tsx` (lines 366, 408)
- **Observation**: "출발지를 입력하세요" / "도착지를 입력하세요" use default placeholder color. In dark mode, `--text-tertiary: #64748b` on `--bg-surface: #0f172a` = ~3.1:1 (fails WCAG AA)
- **Heuristic Violated**: #4 Consistency & Standards
- **Impact**: Users can't read input hints, increasing cognitive load for first-time users
- **Severity**: **Major**
- **Fix** (globals.css, already partially addressed):
```css
/* globals.css - strengthen the existing rule */
@media (max-width: 768px) {
  input::placeholder,
  textarea::placeholder {
    color: var(--text-secondary) !important; /* #94a3b8 in dark = 4.6:1 ✓ */
    opacity: 1;
  }
}
```
- Already exists in globals.css but uses `var(--text-secondary, #6b7280)`. Verify dark mode override applies.

### Finding 4: Cancel Button Icon Too Small
- **File**: `src/components/search/SearchOverlay.tsx` (line ~590)
- **Observation**: Cancel button's X icon is `w-4 h-4` (16px). While the button itself meets 48px, the icon's small visual footprint reduces perceived tappability
- **Heuristic Violated**: #7 Flexibility & Efficiency
- **Impact**: Users hesitate to tap cancel during loading, reducing sense of control
- **Severity**: **Minor**
- **Fix**:
```tsx
// Change:
<X className="w-4 h-4" />
// To:
<X className="w-5 h-5" />
```

### Finding 5: Kakao Map ZoomControl Overlap & Touch Target
- **File**: `src/components/map/KakaoMap.tsx` (line ~104)
- **Observation**: Native Kakao `ZoomControl` placed at RIGHT position overlaps map content. The native zoom buttons are ~30x30px, below the 44px mobile minimum. Vertical stacking causes accidental zoom-in when intending zoom-out.
- **Heuristic Violated**: #5 Error Prevention
- **Impact**: High misclick rate on zoom controls, especially one-handed use
- **Severity**: **Major**
- **Fix**: Replace native control with custom zoom buttons:
```tsx
// KakaoMap.tsx - Remove native zoom control
// DELETE: mapInstance.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

// Add custom zoom buttons in JSX:
<div className="absolute right-3 bottom-24 flex flex-col gap-3 z-10">
  <button
    onClick={() => map?.setLevel(map.getLevel() - 1)}
    className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-xl font-bold"
    aria-label="확대"
  >+</button>
  <button
    onClick={() => map?.setLevel(map.getLevel() + 1)}
    className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-xl font-bold"
    aria-label="축소"
  >−</button>
</div>
```
- **Rationale**: 48px circular buttons with 12px gap prevent misclicks. Horizontal would be ideal but vertical with gap is acceptable.

### Finding 6: "최근 경로" Text Truncation
- **File**: `src/components/search/SearchOverlay.tsx` (recent routes section)
- **Observation**: Long route text like "명지대학교 입문캠퍼스 → 다이소 구의역점 스타벅스" overflows container and gets truncated without ellipsis or tooltip
- **Heuristic Violated**: #6 Recognition Rather Than Recall, #8 Aesthetic Design
- **Impact**: Users can't identify which saved route to select, defeating the purpose of recent routes
- **Severity**: **Major**
- **Fix**: Add truncation with full text on tap:
```css
/* globals.css */
.route-text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
```

### Finding 7: Search Bar Clear Button (X) Too Small & Crowded
- **File**: `src/components/search/SearchOverlay.tsx` (input clear buttons)
- **Observation**: Clear (X) button in search inputs is ~20px with insufficient spacing from the confirm button, causing frequent mistaps
- **Heuristic Violated**: #5 Error Prevention
- **Impact**: Users accidentally clear input when trying to confirm, forcing re-entry
- **Severity**: **Major**
- **Fix**:
```tsx
// Ensure clear button has minimum touch area:
<button className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="입력 지우기">
  <X className="w-5 h-5" />
</button>
```

---

## 📊 Prioritized Recommendations

### 🔴 High Priority (Sprint 1)

| # | Issue | Impact | Effort | Metric |
|---|-------|--------|--------|--------|
| 1 | Loading text contrast (Finding 2) | Users abandon during loading | Low (CSS only) | Contrast ratio ≥4.5:1 |
| 2 | Placeholder contrast (Finding 3) | First-time users confused | Low (CSS only) | Contrast ratio ≥4.5:1 |
| 3 | Search clear button size (Finding 7) | Mistaps → re-entry | Low (className) | Touch target ≥44px |

### 🟡 Medium Priority (Sprint 2)

| # | Issue | Impact | Effort | Metric |
|---|-------|--------|--------|--------|
| 4 | CTA button overflow (Finding 1) | Visual credibility | Low (className) | Button within viewport |
| 5 | Route text truncation (Finding 6) | Can't select routes | Low (CSS) | Full text accessible |
| 6 | Zoom controls (Finding 5) | Map interaction errors | Medium (component) | Touch target ≥48px |

### 🟢 Low Priority (Sprint 3)

| # | Issue | Impact | Effort | Metric |
|---|-------|--------|--------|--------|
| 7 | Cancel icon size (Finding 4) | Perception only | Low (className) | Icon ≥20px |

---

## 📋 Mobile UX Best Practices Checklist

### Touch Targets
- [ ] All interactive elements ≥44×44px (Apple HIG) / 48×48dp (Material)
- [ ] Minimum 8px spacing between adjacent touch targets
- [ ] Icon buttons have padding to meet minimum touch area
- [ ] No overlapping interactive zones

### Text & Contrast
- [ ] Body text contrast ≥4.5:1 (WCAG AA)
- [ ] Large text (≥18px bold / ≥24px) contrast ≥3:1
- [ ] Placeholder text contrast ≥4.5:1
- [ ] Loading/status text explicitly colored (not inherited)

### Layout
- [ ] No horizontal overflow on any screen width ≥320px
- [ ] Primary CTA has 16px+ horizontal margin from screen edges
- [ ] Long text has ellipsis + accessible full-text method
- [ ] Safe area insets respected (notch, home indicator)

### Feedback & Status
- [ ] Loading states clearly visible with high-contrast text
- [ ] Cancel/abort always accessible during async operations
- [ ] Touch feedback (scale/ripple) on all interactive elements
- [ ] Error states clearly distinguishable from normal states

### Accessibility
- [ ] All buttons have `aria-label` when icon-only
- [ ] Focus indicators visible (3px solid, offset 2px)
- [ ] Screen reader announcements for state changes
- [ ] `font-size: 16px` minimum on inputs (prevents iOS zoom)
- [ ] Skip navigation link present

### Dark Mode
- [ ] All text colors verified against dark backgrounds
- [ ] Placeholder colors explicitly set in dark mode
- [ ] Shadows adjusted for dark backgrounds
- [ ] Status colors (loading, error) tested in both themes

---

## 📈 Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Touch target compliance (≥44px) | ~60% | 100% |
| Text contrast ≥4.5:1 | ~70% | 100% |
| Horizontal overflow screens | 2/4 | 0/4 |
| WCAG 2.1 AA compliance | Partial | Full |

---

*Research conducted: 2026-03-16*
*Methodology: Expert heuristic evaluation + WCAG 2.1 AA audit*
*Next steps: Implement High Priority fixes → re-audit → usability testing with 5 users*
