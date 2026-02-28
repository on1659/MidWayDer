/**
 * ResultList - 파스텔톤 카드형 결과 리스트
 */

'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Copy, Check, Navigation, Clock, Zap, Star, Phone, CheckCircle, Circle, Search, X as XIcon, Share2, Bookmark, Pencil, MoreHorizontal } from 'lucide-react';
import type { DetourResult } from '@/types/detour';
import { copyToClipboard } from '@/lib/clipboard';
import { getCategoryIcon } from '@/lib/category-icons';
import { openNavigationApp, getPreferredNavApp, setPreferredNavApp } from '@/lib/navigation-links';
import type { NavApp } from '@/lib/navigation-links';
import { getBusinessStatus, formatBusinessHours, getMinutesUntilClose, getMinutesUntilOpen, getBusinessHoursRange } from '@/lib/business-hours';
import { getRecommendationBadges, getBadgeColor } from '@/lib/recommendation-badges';
import { getVisitHistory, getVisitCount, recordVisit } from '@/lib/visit-tracking';
import { hashRoute } from '@/lib/utils/route-hash';
import { getTimeBasedCategoryHints, getTimeGreeting } from '@/lib/smart-category';
import { getSmartOneLiner } from '@/lib/smart-summary';
import { useRouteStore } from '@/store/route-store';
import ErrorFallback from '@/components/ui/ErrorFallback';
import BottomSheet from '@/components/ui/BottomSheet';
import { getPlaceFavorites, addPlaceFavorite, removePlaceFavorite } from '@/lib/place-favorites';
import { getPlaceMemos, setPlaceMemo } from '@/lib/place-memos';

interface ResultListProps {
  results: DetourResult[];
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  currentCategory: string;
  onSelect: (result: DetourResult) => void;
  onCategoryChange?: (category: string) => void;
  onRetry?: () => void;
  onSaveRoute?: () => void;
  onExpandRadius?: () => void;
  onCancel?: () => void;
  sortBy?: 'score' | 'distance' | 'duration' | 'closing';
  onHoverResult?: (id: string | null) => void;
}

const LOADING_STAGES = [
  { icon: '🔍', text: '경로 분석 중', sub: '최적 경로를 계산하고 있어요' },
  { icon: '📍', text: '장소 탐색 중', sub: '경로 주변 매장을 찾고 있어요' },
  { icon: '⚡', text: '비용 계산 중', sub: '이탈 비용을 정밀하게 계산 중이에요' },
];

/** 두 좌표 간 Haversine 직선 거리 (km) */
function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 카테고리별 기본 체류 시간 (분) */
function getDefaultDwellMinutes(category: string): number {
  const map: Record<string, number> = {
    '편의점': 5, 'CU': 5, 'GS25': 5, '세븐일레븐': 5, '이마트24': 5,
    '스타벅스': 20, '이디야': 15, '메가커피': 15, '빽다방': 15, '카페': 15,
    '다이소': 20, '올리브영': 15,
    '맥도날드': 20, '버거킹': 20, '롯데리아': 20, '맘스터치': 20,
    '주유소': 10, '세차장': 15,
    '은행': 15, '우체국': 10,
    '약국': 5, '병원': 20,
    '주차장': 5,
  };
  for (const [key, val] of Object.entries(map)) {
    if (category === key || category.includes(key) || key.includes(category)) return val;
  }
  return 10;
}

/** 예상 도착 시간 계산 (baseMs: 출발 기준 밀리초, dwellMin: 경유지 체류 시간(분)) */
function getETAText(result: DetourResult, baseMs?: number, dwellMin?: number): { waypoint: string; destination: string } | null {
  const toSec = result.routes?.toWaypoint?.duration;
  const fromSec = result.routes?.fromWaypoint?.duration;
  if (!toSec || !fromSec) return null;
  const now = baseMs ?? Date.now();
  const dwellMs = (dwellMin ?? 0) * 60 * 1000;
  const fmt = (ms: number) => {
    const d = new Date(ms);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  return {
    waypoint: fmt(now + toSec * 1000),
    destination: fmt(now + toSec * 1000 + dwellMs + fromSec * 1000),
  };
}

/** 방문 날짜 상대 라벨 (visitedAt ms → "오늘", "어제", "N일 전" 등) */
function getVisitDateLabel(ms: number): string {
  const diffMs = Date.now() - ms;
  const diffMin = Math.floor(diffMs / 60000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 60) return '방금';
  if (diffDay === 0) return '오늘';
  if (diffDay === 1) return '어제';
  if (diffDay < 7) return `${diffDay}일 전`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}주 전`;
  return `${Math.floor(diffDay / 30)}달 전`;
}

/** 검색 시각 상대 표시 (searchedAt ms → "방금 검색", "N분 전" 등) */
function getRelativeSearchTime(ms: number): string {
  const diff = Math.floor((Date.now() - ms) / 60000);
  if (diff < 1) return '방금 검색';
  if (diff < 60) return `${diff}분 전`;
  return `${Math.floor(diff / 60)}시간 전`;
}

/** 베스트 픽 이유 한 줄 (1등 카드용) */
function getBestPickReason(result: DetourResult): string {
  const detourMin = Math.round(result.detourCost.duration / 60);
  if (result.detourCost.distance <= 150) return '경로에서 거의 이탈 없음 — 그냥 지나가는 길!';
  if (detourMin <= 2) return `+${detourMin}분으로 들를 수 있어요`;
  if (result.proximityScore >= 75) return '경로 바로 옆 — 접근성 최고';
  return '이탈 비용 + 접근성 종합 1위';
}

/** nameFilter 검색어 하이라이팅 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase().trim();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#fef08a', color: 'inherit', borderRadius: '2px', padding: '0 1px' }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

/** 경로상 위치를 5단계 자연어 라벨로 변환 */
function getRoutePositionLabel(result: DetourResult): string | null {
  const toWaypointDist = result.routes.toWaypoint.distance;
  const originalDist = result.routes.original.distance;
  if (!originalDist || originalDist === 0) return null;
  const progress = toWaypointDist / originalDist;
  if (progress < 0.2) return '출발 직후';
  if (progress < 0.4) return '경로 초반';
  if (progress < 0.6) return '경로 중간';
  if (progress < 0.8) return '경로 후반';
  return '도착 직전';
}

/** 빠른 카테고리 전환 칩에 표시할 인기 카테고리 목록 (순서 = 우선순위) */
const POPULAR_CATEGORIES = [
  '편의점', 'CU', 'GS25', '세븐일레븐', '스타벅스', '이디야', '메가커피', '카페',
  '다이소', '올리브영', '약국', '맥도날드', '버거킹', '롯데리아', '주유소', '은행', '우체국',
];

/** 현재 카테고리와 연관된 인접 카테고리 목록 */
const RELATED_CATEGORIES: Record<string, string[]> = {
  '스타벅스': ['이디야', '빽다방', '메가커피', 'CU', 'GS25'],
  '이디야': ['스타벅스', '메가커피', '빽다방', 'CU', '편의점'],
  '카페': ['편의점', 'CU', 'GS25', '베이커리', '스타벅스'],
  '다이소': ['올리브영', 'CU', 'GS25', '약국', '편의점'],
  'CU': ['GS25', '세븐일레븐', '스타벅스', '이디야', '약국'],
  'GS25': ['CU', '세븐일레븐', '스타벅스', '이디야', '약국'],
  '편의점': ['CU', 'GS25', '세븐일레븐', '스타벅스', '약국'],
  '세븐일레븐': ['CU', 'GS25', '이마트24', '스타벅스', '약국'],
  '이마트24': ['CU', 'GS25', '세븐일레븐', '스타벅스', '약국'],
  '맥도날드': ['버거킹', '롯데리아', '맘스터치', '스타벅스', 'CU'],
  '버거킹': ['맥도날드', '롯데리아', '맘스터치', '스타벅스', 'CU'],
  '롯데리아': ['맥도날드', '버거킹', '맘스터치', 'CU', '편의점'],
  '주유소': ['편의점', 'CU', 'GS25', '세차장', '맥도날드'],
  '올리브영': ['다이소', '편의점', 'CU', '약국', '스타벅스'],
  '약국': ['편의점', 'CU', 'GS25', '병원', '올리브영'],
  '은행': ['편의점', 'CU', '우체국', '약국', '스타벅스'],
  '우체국': ['편의점', 'CU', '은행', '약국', '스타벅스'],
  '주차장': ['편의점', 'CU', 'GS25', '맥도날드', '스타벅스'],
};

function getRelatedCategories(currentCategory: string): string[] {
  if (RELATED_CATEGORIES[currentCategory]) {
    return RELATED_CATEGORIES[currentCategory];
  }
  for (const [key, cats] of Object.entries(RELATED_CATEGORIES)) {
    if (currentCategory.includes(key) || key.includes(currentCategory)) {
      return cats.filter((c) => c !== currentCategory);
    }
  }
  return ['편의점', 'CU', 'GS25', '스타벅스', '약국', '맥도날드'].filter(
    (c) => c !== currentCategory
  );
}

export default function ResultList({
  results,
  selectedId,
  isLoading,
  error,
  hasSearched,
  currentCategory,
  onSelect,
  onCategoryChange,
  onRetry,
  onSaveRoute,
  onExpandRadius,
  onCancel,
  sortBy,
  onHoverResult,
}: ResultListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [naviSheetOpen, setNaviSheetOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<DetourResult['place'] | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [scoreDetailOpenId, setScoreDetailOpenId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 스와이프 액션 상태 (ref = 실제 추적, state = 시각적 반영)
  const swipeInfoRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    deltaX: number;
    locked: boolean;
  } | null>(null);
  const [swipeVisual, setSwipeVisual] = useState<{ id: string; deltaX: number } | null>(null);

  // 스와이프 힌트 애니메이션 (첫 결과 로드 시 1회)
  const [swipeHintId, setSwipeHintId] = useState<string | null>(null);
  const [swipeHintDeltaX, setSwipeHintDeltaX] = useState(0);

  // 빠른 필터 상태
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [maxDetourMin, setMaxDetourMin] = useState<5 | 10 | 15 | null>(null);
  const [maxDetourKm, setMaxDetourKm] = useState<1 | 2 | 3 | null>(null);
  const [proxScoreOnly, setProxScoreOnly] = useState(false);
  const [unvisitedOnly, setUnvisitedOnly] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  // 필터 프리셋 ("빠른 경유" / "지금 당장!")
  const [activePreset, setActivePreset] = useState<'quick' | 'now' | null>(null);

  // 카드 더보기 메뉴 열림 상태
  const [overflowMenuId, setOverflowMenuId] = useState<string | null>(null);

  // 컴팩트 모드 아코디언: 탭한 카드 ID → 주소/ETA/네비 인라인 표시
  const [expandedCompactId, setExpandedCompactId] = useState<string | null>(null);

  // 상세 필터 칩 표시 여부 (기본 접힘, 활성 필터 있을 때 자동 펼침)
  const [showFilterChips, setShowFilterChips] = useState(false);

  // 결과 내 이름 검색 필터
  const [nameFilter, setNameFilter] = useState('');

  // 상위 N개 비교 패널
  const [showCompare, setShowCompare] = useState(false);

  // 방문 완료 상태 (placeId → visitedAt timestamp)
  const [visitedDates, setVisitedDates] = useState<Map<string, number>>(new Map());

  // 결과 더보기 (초기 10개 표시, 더보기 클릭 시 전체 표시)
  const [visibleCount, setVisibleCount] = useState(10);

  // 공유 성공 표시 (Web Share API 미지원 시 클립보드 복사 후 표시)
  const [sharedId, setSharedId] = useState<string | null>(null);

  // 전체 결과 텍스트 내보내기 복사 완료 피드백
  const [exportCopied, setExportCopied] = useState(false);

  // 카드 핀 고정 (선택한 결과 항상 상단 유지)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  // 현재 위치 (GPS)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 경유지 개인 메모 (placeId → memo text)
  const [memoMap, setMemoMap] = useState<Map<string, string>>(new Map());
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editingMemoText, setEditingMemoText] = useState('');

  // 출발 예정 시각 (기본: 현재 시각)
  const [departureTime, setDepartureTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  // 경유지 체류 시간 (분) - 카테고리별 기본값 자동 설정
  const [dwellMinutes, setDwellMinutes] = useState(() => getDefaultDwellMinutes(currentCategory));

  // departureTime → ms 변환 (과거 시각이면 다음날로)
  const departureMs = useMemo(() => {
    const [h, m] = departureTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    if (d.getTime() < Date.now() - 60000) d.setDate(d.getDate() + 1);
    return d.getTime();
  }, [departureTime]);

  // 실시간 ETA 카운트다운: 지금 출발 시 1분마다 nowMs 갱신
  const [nowMs, setNowMs] = useState(Date.now());

  // 검색 시각 기록 (새 결과 로드 시 자동 업데이트)
  const [searchedAt, setSearchedAt] = useState<number | null>(null);
  const isNowDeparture = Math.abs(departureMs - nowMs) < 120000;
  useEffect(() => {
    if (!isNowDeparture) return;
    const interval = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [isNowDeparture]);

  // 실시간 인기도 (최근 1시간 클릭 수)
  const [popularityMap, setPopularityMap] = useState<Record<string, number>>({});

  // 데이터 기반 인기 카테고리 (결과 없을 때 표시)
  const [statsCategories, setStatsCategories] = useState<string[]>([]);

  // 모바일 하단 고정 미니 요약 바
  const [showStickyBar, setShowStickyBar] = useState(false);
  const summaryHeaderRef = useRef<HTMLDivElement>(null);

  // 헤더 접기/펼치기 (localStorage 기억)
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('header-expanded') !== 'false';
  });

  // 선호 네비 앱
  const [preferredNavApp, setPreferredNavAppState] = useState<NavApp | null>(null);

  useEffect(() => {
    setPreferredNavAppState(getPreferredNavApp());
  }, []);

  // GPS 현재 위치 — 결과가 처음 로드될 때 1회 요청 (이미 있으면 재요청 안 함)
  const hasResults = results.length > 0;
  useEffect(() => {
    if (!hasResults || currentLocation || typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { /* 권한 거부 시 무시 */ },
      { timeout: 6000, maximumAge: 60000 }
    );
  }, [hasResults]); // eslint-disable-line react-hooks/exhaustive-deps

  // 메모 맵 초기화 (결과 로드 시)
  useEffect(() => {
    if (results.length === 0) return;
    const memos = getPlaceMemos();
    const map = new Map<string, string>();
    for (const m of memos) map.set(m.placeId, m.memo);
    setMemoMap(map);
  }, [results]);

  // 로딩 단계 (0: 경로 분석, 1: 장소 탐색, 2: 비용 계산)
  const [loadingStage, setLoadingStage] = useState(0);

  useEffect(() => {
    if (!isLoading) { setLoadingStage(0); return; }
    const t1 = setTimeout(() => setLoadingStage(1), 2500);
    const t2 = setTimeout(() => setLoadingStage(2), 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isLoading]);

  // 개별 장소 즐겨찾기
  const [favPlaces, setFavPlaces] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = getPlaceFavorites().map((f) => f.placeId);
    setFavPlaces(new Set(saved));
  }, []);

  // 경로 해시 계산 (추천 뱃지 + 방문 기록용)
  const { originalRoute } = useRouteStore();
  const routeHash = originalRoute
    ? hashRoute(originalRoute.start, originalRoute.end)
    : '';

  // 방문 기록 초기화 (routeHash 기반 — placeId → 가장 최근 visitedAt 매핑)
  useEffect(() => {
    if (!routeHash || results.length === 0) return;
    const history = getVisitHistory();
    const dateMap = new Map<string, number>();
    for (const visit of history) {
      if (visit.routeHash === routeHash && !dateMap.has(visit.placeId)) {
        dateMap.set(visit.placeId, visit.visitedAt);
      }
    }
    setVisitedDates(dateMap);
  }, [results, routeHash]);

  const handleTogglePlaceFav = (e: React.MouseEvent, result: DetourResult) => {
    e.stopPropagation();
    const id = result.place.id;
    if (favPlaces.has(id)) {
      removePlaceFavorite(id);
      setFavPlaces((prev) => { const s = new Set(prev); s.delete(id); return s; });
    } else {
      addPlaceFavorite({
        placeId: id,
        placeName: result.place.name,
        category: result.place.category,
        address: result.place.roadAddress || result.place.address || '',
        lat: result.place.coordinates.lat,
        lng: result.place.coordinates.lng,
      });
      setFavPlaces((prev) => new Set([...prev, id]));
    }
  };

  const handleVisitToggle = (e: React.MouseEvent, result: DetourResult) => {
    e.stopPropagation();
    const id = result.place.id;
    if (visitedDates.has(id)) {
      setVisitedDates((prev) => { const m = new Map(prev); m.delete(id); return m; });
    } else {
      if (routeHash) {
        recordVisit(id, result.place.name, result.place.category, routeHash);
      }
      const ts = Date.now();
      setVisitedDates((prev) => new Map([...prev, [id, ts]]));
    }
  };

  // 검색 결과 로드 완료 시 인기도 데이터 비동기 로드
  useEffect(() => {
    if (results.length === 0) return;
    const placeIds = results.map((r) => r.place.id).join(',');
    fetch(`/api/popularity?placeIds=${encodeURIComponent(placeIds)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setPopularityMap(json.data || {});
      })
      .catch(() => {
        // 실패해도 UX 차단 안 함
      });
  }, [results]);

  // 새로운 결과 도착 시 검색 시각 기록
  useEffect(() => {
    if (results.length > 0) setSearchedAt(Date.now());
  }, [results]);

  // 결과 없을 때 인기 카테고리 데이터 로드 (SearchLog 기반)
  useEffect(() => {
    if (!hasSearched || results.length > 0) return;
    fetch('/api/stats?period=week')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data?.categoryBreakdown)) {
          const cats = (json.data.categoryBreakdown as { category: string }[])
            .map((c) => c.category)
            .filter((c) => c !== currentCategory)
            .slice(0, 6);
          if (cats.length > 0) setStatsCategories(cats);
        }
      })
      .catch(() => {});
  }, [hasSearched, results.length, currentCategory]);

  // isHeaderExpanded 변경 시 localStorage 저장
  useEffect(() => {
    try { localStorage.setItem('header-expanded', String(isHeaderExpanded)); } catch { /* ignore */ }
  }, [isHeaderExpanded]);

  // 카테고리 변경 시 체류 시간 기본값 자동 갱신
  useEffect(() => {
    setDwellMinutes(getDefaultDwellMinutes(currentCategory));
  }, [currentCategory]);

  // 활성 필터가 생기면 상세 필터 칩 영역 자동 펼침
  useEffect(() => {
    if (openNowOnly || maxDetourMin !== null || maxDetourKm !== null || proxScoreOnly || unvisitedOnly) {
      setShowFilterChips(true);
    }
  }, [openNowOnly, maxDetourMin, maxDetourKm, proxScoreOnly, unvisitedOnly]);

  // 새로운 검색 결과 로드 시 빠른 필터 + 페이지네이션 자동 초기화
  useEffect(() => {
    setOpenNowOnly(false);
    setMaxDetourMin(null);
    setMaxDetourKm(null);
    setProxScoreOnly(false);
    setUnvisitedOnly(false);
    setNameFilter('');
    setVisibleCount(10);
    setPinnedIds(new Set());
    setShowCompare(false);
    setShowStickyBar(false);
    setActivePreset(null);
    setOverflowMenuId(null);
    setExpandedCompactId(null);
    setShowFilterChips(false);
  }, [results]);

  // 결과 요약 헤더 가시성 감지 → 미니 요약 바 표시 제어
  useEffect(() => {
    const el = summaryHeaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasResults]); // eslint-disable-line react-hooks/exhaustive-deps

  // 스와이프 힌트 애니메이션: 첫 결과 로드 1회, 우→복귀→좌→복귀 순으로 카드 흔들기
  useEffect(() => {
    if (results.length === 0) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('swipe-hint-shown')) return;
    const id = results[0].place.id;
    const t0 = setTimeout(() => { setSwipeHintId(id); setSwipeHintDeltaX(62); }, 900);
    const t1 = setTimeout(() => setSwipeHintDeltaX(0), 1350);
    const t2 = setTimeout(() => setSwipeHintDeltaX(-62), 1650);
    const t3 = setTimeout(() => {
      setSwipeHintDeltaX(0);
      setSwipeHintId(null);
      localStorage.setItem('swipe-hint-shown', '1');
    }, 2100);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [results]); // eslint-disable-line react-hooks/exhaustive-deps

  // (routeHash is declared earlier, near visitedIds effect)

  // 빠른 필터 적용
  const filteredResults = useMemo(() => {
    let res = results;
    if (openNowOnly) {
      res = res.filter((r) => {
        if (!r.place.businessHours) return false;
        const status = getBusinessStatus(r.place.businessHours);
        return status.isOpen;
      });
    }
    if (maxDetourMin !== null) {
      res = res.filter((r) => r.detourCost.duration <= maxDetourMin * 60);
    }
    if (maxDetourKm !== null) {
      res = res.filter((r) => r.detourCost.distance <= maxDetourKm * 1000);
    }
    if (proxScoreOnly) {
      res = res.filter((r) => r.proximityScore >= 70);
    }
    if (unvisitedOnly) {
      res = res.filter((r) => !visitedDates.has(r.place.id));
    }
    if (nameFilter.trim()) {
      const q = nameFilter.trim().toLowerCase();
      res = res.filter((r) => r.place.name.toLowerCase().includes(q));
    }
    return res;
  }, [results, openNowOnly, maxDetourMin, maxDetourKm, proxScoreOnly, unvisitedOnly, visitedDates, nameFilter]);

  // 핀 고정 카드 항상 상단 정렬
  const sortedWithPins = useMemo(() => {
    if (pinnedIds.size === 0) return filteredResults;
    const pinned = filteredResults.filter((r) => pinnedIds.has(r.place.id));
    const rest = filteredResults.filter((r) => !pinnedIds.has(r.place.id));
    return [...pinned, ...rest];
  }, [filteredResults, pinnedIds]);

  // 결과 더보기: sortedWithPins를 visibleCount만큼만 잘라서 렌더링
  const visibleResults = useMemo(
    () => sortedWithPins.slice(0, visibleCount),
    [sortedWithPins, visibleCount]
  );

  // 상대적 이탈 비교 바 계산용 (전체 결과 기준)
  const maxDetourDuration = results.length > 1
    ? Math.max(...results.map((r) => r.detourCost.duration))
    : 0;
  const minDetourDuration = results.length > 1
    ? Math.min(...results.map((r) => r.detourCost.duration))
    : 0;
  const detourRange = maxDetourDuration - minDetourDuration;

  const handleCopyAddress = async (e: React.MouseEvent, result: DetourResult) => {
    e.stopPropagation();
    const address = result.place.roadAddress || result.place.address;
    if (!address) return;
    
    const success = await copyToClipboard(address);
    if (success) {
      setCopiedId(result.place.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleSelect = async (result: DetourResult, rank: number) => {
    setOverflowMenuId(null);
    // 클릭 로그 저장 (비동기, 실패해도 UX 차단 안 함)
    fetch('/api/log-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId: result.place.id, rank }),
    }).catch(err => console.error('[ClickLog] Failed:', err));

    onSelect(result);
  };

  const handleFeedback = async (helpful: boolean) => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful }),
      });
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch (err) {
      console.error('[Feedback] Failed:', err);
    }
  };

  // ── 카드 공유 핸들러 (Web Share API + 클립보드 폴백) ──
  const handleShare = async (e: React.MouseEvent, result: DetourResult) => {
    e.stopPropagation();
    const detourMin = Math.round(result.detourCost.duration / 60);
    const detourKm = (result.detourCost.distance / 1000).toFixed(1);
    const address = result.place.roadAddress || result.place.address || '';
    const text = `📍 ${result.place.name}\n🏠 ${address}\n⏱ +${detourMin}분 · 📏 +${detourKm}km 이탈\n🗺 midwayder.up.railway.app`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: result.place.name,
          text,
        });
      } catch {
        /* 사용자가 취소한 경우 무시 */
      }
    } else {
      const success = await copyToClipboard(text);
      if (success) {
        setSharedId(result.place.id);
        setTimeout(() => setSharedId(null), 2000);
      }
    }
  };

  // ── 스와이프 액션 핸들러 ──
  const handleCardTouchStart = useCallback((e: React.TouchEvent, id: string) => {
    swipeInfoRef.current = {
      id,
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      deltaX: 0,
      locked: false,
    };
  }, []);

  const handleCardTouchMove = useCallback((e: React.TouchEvent, id: string) => {
    const info = swipeInfoRef.current;
    if (!info || info.id !== id) return;
    const deltaX = e.touches[0].clientX - info.startX;
    const deltaY = e.touches[0].clientY - info.startY;
    if (!info.locked) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        swipeInfoRef.current = null;
        setSwipeVisual(null);
        return;
      }
      info.locked = true;
    }
    info.deltaX = deltaX;
    setSwipeVisual({ id, deltaX });
  }, []);

  const handleCardTouchEnd = useCallback((result: DetourResult) => {
    const info = swipeInfoRef.current;
    swipeInfoRef.current = null;
    setSwipeVisual(null);
    if (!info || info.id !== result.place.id || !info.locked) return;
    if (info.deltaX > 80) {
      // Swipe right → 네비
      if (preferredNavApp) {
        openNavigationApp(preferredNavApp, result.place.coordinates.lat, result.place.coordinates.lng, result.place.name)
          .catch((err) => console.error('[Navigation] Failed:', err));
      } else {
        setSelectedPlace(result.place);
        setNaviSheetOpen(true);
      }
    } else if (info.deltaX < -80) {
      // Swipe left → 주소 복사
      const address = result.place.roadAddress || result.place.address;
      if (address) {
        copyToClipboard(address).then((success) => {
          if (success) {
            setCopiedId(result.place.id);
            setTimeout(() => setCopiedId(null), 2000);
          }
        });
      }
    }
  }, [preferredNavApp]);

  // 핀 고정 토글
  const handleTogglePin = useCallback((e: React.MouseEvent, result: DetourResult) => {
    e.stopPropagation();
    const id = result.place.id;
    setPinnedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }, []);

  // 현재 위치 기준 가장 가까운 경유지 ID
  const closestPlaceId = useMemo(() => {
    if (!currentLocation || results.length === 0) return null;
    let minDist = Infinity;
    let minId: string | null = null;
    for (const r of results) {
      const d = haversineDistanceKm(
        currentLocation.lat, currentLocation.lng,
        r.place.coordinates.lat, r.place.coordinates.lng
      );
      if (d < minDist) { minDist = d; minId = r.place.id; }
    }
    return minId;
  }, [currentLocation, results]);

  // 메모 핸들러
  const handleEditMemo = useCallback((e: React.MouseEvent, placeId: string) => {
    e.stopPropagation();
    setEditingMemoId(placeId);
    setEditingMemoText(memoMap.get(placeId) ?? '');
  }, [memoMap]);

  const handleSaveMemo = useCallback((e: React.MouseEvent, placeId: string) => {
    e.stopPropagation();
    setPlaceMemo(placeId, editingMemoText);
    setMemoMap((prev) => {
      const m = new Map(prev);
      if (editingMemoText.trim()) m.set(placeId, editingMemoText.trim());
      else m.delete(placeId);
      return m;
    });
    setEditingMemoId(null);
    setEditingMemoText('');
  }, [editingMemoText]);

  const handleCancelMemo = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMemoId(null);
    setEditingMemoText('');
  }, []);

  /** 필터 프리셋 원탭 적용/해제 */
  const applyPreset = useCallback((preset: 'quick' | 'now') => {
    setActivePreset((prev) => {
      if (prev === preset) {
        // 같은 프리셋 재클릭 → 모든 필터 해제
        setOpenNowOnly(false);
        setMaxDetourMin(null);
        setMaxDetourKm(null);
        setProxScoreOnly(false);
        return null;
      }
      // 프리셋 적용
      setOpenNowOnly(true);
      setMaxDetourMin(5);
      if (preset === 'now') {
        setMaxDetourKm(1);
        setProxScoreOnly(true);
      } else {
        setMaxDetourKm(null);
        setProxScoreOnly(false);
      }
      return preset;
    });
  }, []);

  // 네비게이션 공통 트리거 (e 없이 직접 호출 가능)
  const triggerNav = useCallback((place: DetourResult['place']) => {
    if (preferredNavApp) {
      openNavigationApp(preferredNavApp, place.coordinates.lat, place.coordinates.lng, place.name)
        .catch((err) => console.error('[Navigation] Failed:', err));
    } else {
      setSelectedPlace(place);
      setNaviSheetOpen(true);
    }
  }, [preferredNavApp]);

  const handleOpenNavi = (e: React.MouseEvent, place: DetourResult['place']) => {
    e.stopPropagation();
    triggerNav(place);
  };

  // 베스트 픽으로 바로 출발 (원탭)
  const handleQuickGo = useCallback(() => {
    const top = sortedWithPins[0];
    if (!top) return;
    const now = new Date();
    setDepartureTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    triggerNav(top.place);
  }, [sortedWithPins, triggerNav]);

  const handleOpenNaviSheet = (e: React.MouseEvent, place: DetourResult['place']) => {
    e.stopPropagation();
    setSelectedPlace(place);
    setNaviSheetOpen(true);
  };

  const handleNaviAppSelect = async (app: NavApp) => {
    if (!selectedPlace) return;

    try {
      await openNavigationApp(
        app,
        selectedPlace.coordinates.lat,
        selectedPlace.coordinates.lng,
        selectedPlace.name
      );
      // 선택한 앱 저장
      setPreferredNavApp(app);
      setPreferredNavAppState(app);
      setNaviSheetOpen(false);
    } catch (err) {
      console.error('[Navigation] Failed:', err);
    }
  };

  // 키보드 접근성: 화살표 키로 탐색
  useEffect(() => {
    if (results.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          handleSelect(results[focusedIndex], focusedIndex + 1);
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(results.length - 1);
          break;
      }
    };

    if (listRef.current) {
      listRef.current.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (listRef.current) {
        listRef.current.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [focusedIndex, results]);

  // 포커스된 항목 자동 스크롤 (키보드 탐색)
  useEffect(() => {
    const item = document.querySelector(`[data-result-index="${focusedIndex}"]`);
    if (item) {
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex]);

  // selectedId 변경 시 해당 카드로 자동 스크롤 (지도 마커 클릭 동기화)
  useEffect(() => {
    if (!selectedId || filteredResults.length === 0) return;
    const idx = filteredResults.findIndex((r) => r.place.id === selectedId);
    if (idx === -1) return;
    const timer = setTimeout(() => {
      const item = document.querySelector(`[data-result-index="${idx}"]`);
      if (item) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 350);
    return () => clearTimeout(timer);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="space-y-3">
        {/* 3단계 로딩 인디케이터 */}
        <div
          className="px-4 py-5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, var(--blue-50), var(--accent-weak))',
            border: '1px solid var(--blue-200)',
          }}
        >
          {/* 단계 아이콘 */}
          <div className="flex justify-between items-start mb-3">
            {LOADING_STAGES.map((stage, i) => (
              <div
                key={i}
                className={`flex flex-col items-center gap-1.5 flex-1 transition-all duration-500 ${
                  i <= loadingStage ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all duration-300 ${
                    i < loadingStage
                      ? 'bg-green-100'
                      : i === loadingStage
                      ? 'shadow-md scale-110'
                      : 'bg-gray-100'
                  }`}
                  style={i === loadingStage ? { background: 'var(--accent-weak)' } : {}}
                >
                  {i < loadingStage ? '✅' : stage.icon}
                </div>
                <span
                  className={`text-[11px] font-semibold text-center leading-tight ${
                    i === loadingStage ? 'font-bold' : ''
                  }`}
                  style={{ color: i <= loadingStage ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  {stage.text}
                </span>
              </div>
            ))}
          </div>
          {/* 진행 바 */}
          <div
            className="relative mx-6 h-1 rounded-full mb-3"
            style={{ background: 'var(--border-soft)' }}
          >
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
              style={{
                width: `${(loadingStage / (LOADING_STAGES.length - 1)) * 100}%`,
                background: 'var(--accent)',
              }}
            />
          </div>
          {/* 설명 텍스트 */}
          <p
            className="text-center text-sm font-medium animate-pulse"
            style={{ color: 'var(--text-secondary)' }}
          >
            {LOADING_STAGES[loadingStage].sub}
          </p>
          {/* 취소 버튼 */}
          {onCancel && (
            <div className="flex justify-center mt-3">
              <button
                onClick={onCancel}
                className="px-5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                style={{
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-soft)',
                }}
              >
                취소
              </button>
            </div>
          )}
        </div>

        {/* 스켈레톤 카드 */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="relative overflow-hidden p-4 bg-white rounded-2xl shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 bg-gray-200 rounded-full animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded-lg w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="flex gap-2 mt-3">
                  <div className="h-6 bg-gray-200 rounded-full w-16" />
                  <div className="h-6 bg-gray-200 rounded-full w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorFallback error={error} onRetry={onRetry} compact />;
  }

  if (results.length === 0) {
    // 검색 전: 초기 상태 메시지
    if (!hasSearched) {
      const timeHints = getTimeBasedCategoryHints();
      const greeting = getTimeGreeting();

      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="text-5xl mb-3 animate-bounce">🗺️</div>
          <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            가는 길에 들를 곳을 찾아드려요
          </h3>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            출발지와 도착지를 입력하고<br />
            원하는 카테고리를 선택해주세요
          </p>

          {/* 시간대 카테고리 스마트 제안 */}
          {timeHints.length > 0 && onCategoryChange && (
            <div className="w-full mb-4">
              <p className="text-xs font-semibold mb-2.5" style={{ color: 'var(--text-secondary)' }}>
                {greeting} 지금 이 시간엔 어때요?
              </p>
              <div className="flex gap-2 justify-center">
                {timeHints.map((hint) => (
                  <button
                    key={hint.category}
                    onClick={() => onCategoryChange(hint.category)}
                    className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl transition-all active:scale-95 flex-1 max-w-[140px]"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1.5px solid var(--border-soft)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}
                  >
                    <span className="text-2xl">{hint.emoji}</span>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {hint.label}
                    </span>
                    <span className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                      {hint.reason}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'var(--blue-100)', color: 'var(--blue-600)' }}>
              🔍 스마트 검색
            </span>
            <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'var(--green-100)', color: 'var(--green-600)' }}>
              ⚡ 빠른 경로
            </span>
            <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'var(--purple-100)', color: 'var(--purple-600)' }}>
              📍 정확한 위치
            </span>
          </div>
        </div>
      );
    }

    // 검색 후 결과 없음: 대안 제시 (SearchLog 기반 → 없으면 폴백)
    const fallbackCategories = [
      '다이소', '스타벅스', '이디야', 'CU', 'GS25', '세븐일레븐',
      '맥도날드', '버거킹', '주유소', '휴게소', '은행', '우체국'
    ].filter(cat => cat !== currentCategory).slice(0, 6);
    const alternativeCategories = statsCategories.length > 0 ? statsCategories : fallbackCategories;

    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="text-6xl mb-4">😢</div>
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          이 경로에는 {currentCategory}가 없어요
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          검색 범위를 넓히거나<br />
          다른 카테고리를 선택해보세요
        </p>

        {onCategoryChange && alternativeCategories.length > 0 && (
          <>
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
              {statsCategories.length > 0 ? '🔥 이 경로에서 인기 있는 카테고리' : '대신 이런 카테고리는 어때요?'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {alternativeCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onCategoryChange(cat)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
                  style={{
                    background: 'var(--blue-100)',
                    color: 'var(--blue-600)',
                    border: '1px solid var(--blue-300)',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </>
        )}

        {/* 반경 확장 재검색 CTA */}
        {onExpandRadius && (
          <button
            onClick={onExpandRadius}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95 mb-3"
            style={{
              background: 'linear-gradient(135deg, var(--blue-50), var(--accent-weak))',
              color: 'var(--blue-700)',
              border: '1.5px solid var(--blue-200)',
            }}
          >
            <span>🔍</span>
            반경 2km로 확장해서 재검색
          </button>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg-surface)',
            }}
          >
            다시 검색
          </button>
        )}
      </div>
    );
  }

  // 결과 요약 데이터 계산 (전체 기준)
  const avgDetourMin = Math.round(
    results.reduce((sum, r) => sum + r.detourCost.duration, 0) / results.length / 60
  );
  const withinFiveMin = results.filter((r) => r.detourCost.duration <= 300).length;
  const bestResult = results.reduce((best, r) =>
    r.detourCost.duration < best.detourCost.duration ? r : best, results[0]
  );
  const hasBusinessHoursData = results.some((r) => !!r.place.businessHours);
  const openNowCount = results.filter((r) => {
    if (!r.place.businessHours) return false;
    return getBusinessStatus(r.place.businessHours).isOpen;
  }).length;

  return (
    <div className="space-y-3" ref={listRef} tabIndex={-1} style={{ outline: 'none' }}>
      {/* 결과 요약 스마트 헤더 */}
      <div
        ref={summaryHeaderRef}
        className="px-4 py-3 rounded-2xl space-y-2.5"
        style={{
          background: 'linear-gradient(135deg, var(--blue-50), var(--accent-weak))',
          border: '1px solid var(--blue-200)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-wrap min-w-0 flex-1">
            <span className="text-sm font-bold" style={{ color: 'var(--blue-700)' }}>
              ✅ {results.length}개 발견
            </span>
            <span
              className="text-xs px-2 py-1 rounded-full font-semibold"
              style={{ background: 'var(--blue-150)', color: 'var(--blue-600)' }}
            >
              평균 +{avgDetourMin}분
            </span>
            {withinFiveMin > 0 && (
              <span
                className="text-xs px-2 py-1 rounded-full font-semibold"
                style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}
              >
                ⚡ {withinFiveMin}개 +5분 이내
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isHeaderExpanded && (
              <span className="text-[11px] font-medium truncate max-w-[80px]" style={{ color: 'var(--text-secondary)' }}>
                최단 {bestResult.place.name}
              </span>
            )}
            {/* 🔄 검색 시각 + 갱신 버튼 */}
            {searchedAt && (
              <span className="text-[11px] font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>
                {getRelativeSearchTime(searchedAt)}
              </span>
            )}
            {searchedAt && onRetry && (
              <button
                onClick={(e) => { e.stopPropagation(); onRetry?.(); }}
                className="shrink-0 flex items-center px-2 py-1 rounded-xl text-[11px] font-bold transition-all active:scale-95"
                style={{ background: 'var(--blue-100)', color: 'var(--blue-600)' }}
                title="동일 경로 재검색"
                aria-label="재검색"
              >
                🔄
              </button>
            )}
            {/* 📋 전체 결과 텍스트 내보내기 버튼 */}
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const lines = sortedWithPins.map((r, i) => {
                  const dMin = Math.round(r.detourCost.duration / 60);
                  const dKm = (r.detourCost.distance / 1000).toFixed(1);
                  const bizStatus = r.place.businessHours
                    ? getBusinessStatus(r.place.businessHours)
                    : null;
                  const bizLabel =
                    bizStatus && bizStatus.label !== '정보 없음'
                      ? ` [${bizStatus.label}]`
                      : '';
                  return `${i + 1}. ${r.place.name} — +${dMin}분 +${dKm}km${bizLabel}`;
                });
                const text =
                  `[MidWayDer] ${currentCategory} 검색 결과 (${results.length}개)\n` +
                  lines.join('\n');
                const success = await copyToClipboard(text);
                if (success) {
                  setExportCopied(true);
                  setTimeout(() => setExportCopied(false), 2000);
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
              style={{
                background: exportCopied ? 'var(--green-500)' : 'var(--blue-100)',
                color: exportCopied ? 'white' : 'var(--blue-700)',
              }}
              title="전체 결과 목록 클립보드에 복사"
            >
              {exportCopied ? '✓ 복사됨' : '📋'}
            </button>
            <button
              onClick={() => setIsHeaderExpanded((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
              style={{
                background: 'var(--blue-200)',
                color: 'var(--blue-700)',
              }}
              aria-label={isHeaderExpanded ? '헤더 접기' : '헤더 펼치기'}
            >
              {isHeaderExpanded ? '▲ 접기' : '▼ 펼치기'}
            </button>
          </div>
        </div>

        {isHeaderExpanded && (
          <>
            {/* 최단 정보 */}
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>최단</p>
                <p className="text-xs font-bold truncate max-w-[80px]" style={{ color: 'var(--text-primary)' }}>
                  {bestResult.place.name}
                </p>
              </div>
            </div>

            {/* 📊 경로 구간별 분포 미니 차트 */}
            {results.length >= 3 && (() => {
              const segs = [
                { label: '출발직후', key: '출발 직후', color: '#60a5fa' },
                { label: '초반', key: '경로 초반', color: '#34d399' },
                { label: '중간', key: '경로 중간', color: '#a78bfa' },
                { label: '후반', key: '경로 후반', color: '#f59e0b' },
                { label: '도착직전', key: '도착 직전', color: '#f87171' },
              ];
              const counts = segs.map((s) => results.filter((r) => getRoutePositionLabel(r) === s.key).length);
              const maxCount = Math.max(...counts, 1);
              if (counts.every((c) => c === 0)) return null;
              return (
                <div className="pt-2 border-t" style={{ borderColor: 'var(--blue-200)' }}>
                  <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--blue-600)' }}>
                    📊 경로 구간별 분포
                  </p>
                  <div className="flex items-end gap-1" style={{ height: 40 }}>
                    {segs.map((seg, i) => {
                      const count = counts[i];
                      const barH = count === 0 ? 3 : Math.max(8, Math.round((count / maxCount) * 32));
                      return (
                        <div key={seg.key} className="flex flex-col items-center flex-1">
                          {count > 0 && (
                            <span className="text-[10px] font-bold mb-0.5" style={{ color: seg.color }}>{count}</span>
                          )}
                          <div
                            className="w-full rounded-t transition-all duration-500"
                            style={{ height: barH, background: count > 0 ? seg.color : 'var(--border-soft)', opacity: count > 0 ? 1 : 0.35 }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-1 mt-0.5">
                    {segs.map((seg) => (
                      <span key={seg.key} className="flex-1 text-center text-[8px] truncate" style={{ color: 'var(--text-muted)' }}>
                        {seg.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* 출발 예정 시각 설정 */}
            <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--blue-200)' }}>
              <span className="text-[12px] font-semibold shrink-0 flex items-center gap-1" style={{ color: 'var(--blue-700)' }}>
                {isNowDeparture ? <span className="animate-pulse">🟢</span> : '🕐'}
                {isNowDeparture ? '출발 중' : '출발 시각'}
              </span>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 px-3 py-1.5 rounded-xl text-sm font-bold border-0 outline-none focus:ring-2 transition-all"
                style={{
                  background: 'white',
                  color: 'var(--text-primary)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}
              />
              <button
                onClick={() => {
                  const now = new Date();
                  setDepartureTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
                }}
                className="shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
                style={{ background: 'var(--blue-200)', color: 'var(--blue-700)' }}
              >
                지금
              </button>
            </div>
            {/* ⏱ 빠른 출발 시각 설정 버튼 (+30분/+1시간/+2시간) */}
            <div className="flex items-center gap-1.5">
              {([30, 60, 120] as const).map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    const d = new Date(Date.now() + mins * 60000);
                    setDepartureTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
                  }}
                  className="flex-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
                  style={{ background: 'var(--blue-100)', color: 'var(--blue-700)', border: '1px solid var(--blue-200)' }}
                >
                  +{mins < 60 ? `${mins}분` : `${mins / 60}시간`}
                </button>
              ))}
            </div>

            {/* 🏪 경유지 체류 시간 설정 */}
            <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--blue-200)' }}>
              <span className="text-[12px] font-semibold shrink-0 flex items-center gap-1" style={{ color: 'var(--blue-700)' }}>
                🏪 체류 시간
              </span>
              <div className="flex gap-1 flex-1 justify-end">
                {([5, 10, 15, 20, 30] as const).map((min) => (
                  <button
                    key={min}
                    onClick={() => setDwellMinutes(min)}
                    className="px-2 py-1 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
                    style={{
                      background: dwellMinutes === min ? 'var(--accent)' : 'var(--blue-100)',
                      color: dwellMinutes === min ? 'white' : 'var(--blue-700)',
                      border: `1px solid ${dwellMinutes === min ? 'var(--accent)' : 'var(--blue-200)'}`,
                    }}
                  >
                    {min}분
                  </button>
                ))}
              </div>
            </div>

            {/* 🚀 베스트 픽으로 바로 출발 원탭 버튼 */}
            <button
              onClick={handleQuickGo}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 mt-1"
              style={{
                background: 'linear-gradient(135deg, var(--accent), #2563eb)',
                color: 'white',
                boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
              }}
              title={`베스트 픽: ${sortedWithPins[0]?.place.name ?? ''}`}
            >
              🚀 <span>베스트 픽으로 바로 출발</span>
              {pinnedIds.size > 0 && <span className="opacity-70 text-[11px]">(📌 고정 기준)</span>}
            </button>
          </>
        )}
      </div>

      {/* ── 빠른 카테고리 전환 칩 ── */}
      {onCategoryChange && (
        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {/* 현재 카테고리 (강조) */}
          <button
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold whitespace-nowrap shrink-0 transition-all"
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: '1.5px solid var(--accent)',
            }}
            disabled
            aria-current="true"
          >
            <span>{getCategoryIcon(currentCategory)}</span>
            <span>{currentCategory}</span>
          </button>
          {/* 다른 카테고리 칩 (현재 카테고리 제외) */}
          {POPULAR_CATEGORIES.filter((c) => c !== currentCategory).map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                border: '1.5px solid var(--border-soft)',
              }}
            >
              <span>{getCategoryIcon(cat)}</span>
              <span>{cat}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── 상위 N개 한눈에 비교 ── */}
      {results.length >= 2 && (
        <div>
          <button
            onClick={() => setShowCompare((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
            style={{
              background: showCompare ? 'var(--blue-100)' : 'var(--bg-surface)',
              color: 'var(--blue-700)',
              border: '1.5px solid var(--blue-200)',
            }}
          >
            <span>⚖️ 상위 {Math.min(3, results.length)}개 한눈에 비교</span>
            <span style={{ fontSize: 10 }}>{showCompare ? '▲ 접기' : '▼ 펼치기'}</span>
          </button>
          {showCompare && (
            <div
              className="grid gap-2 mt-2"
              style={{ gridTemplateColumns: `repeat(${Math.min(3, sortedWithPins.length)}, 1fr)` }}
            >
              {sortedWithPins.slice(0, 3).map((r, i) => {
                const isSelected = selectedId === r.place.id;
                const dMin = Math.round(r.detourCost.duration / 60);
                const dKm = (r.detourCost.distance / 1000).toFixed(1);
                const bizStatus = r.place.businessHours ? getBusinessStatus(r.place.businessHours) : null;
                return (
                  <button
                    key={r.place.id}
                    onClick={() => handleSelect(r, i + 1)}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-xl text-center transition-all active:scale-95"
                    style={{
                      background: isSelected ? 'var(--blue-200)' : 'var(--bg-surface)',
                      border: isSelected ? '1.5px solid var(--accent)' : '1.5px solid var(--border-soft)',
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: i === 0 ? 'var(--accent)' : 'var(--blue-150)',
                        color: i === 0 ? 'white' : 'var(--accent)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[11px] font-bold w-full truncate" style={{ color: 'var(--text-primary)' }}>
                      {r.place.name}
                    </span>
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--yellow-600)' }}>+{dMin}분</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+{dKm}km</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--blue-100)', color: 'var(--blue-700)' }}
                    >
                      {Math.round(r.finalScore)}점
                    </span>
                    {bizStatus && bizStatus.label !== '정보 없음' && (
                      <span className="text-[9px] font-semibold" style={{ color: bizStatus.isOpen ? '#16a34a' : '#dc2626' }}>
                        {bizStatus.emoji} {bizStatus.isOpen ? '영업중' : '마감'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 🔒 Sticky 필터 바 (스크롤 시 상단 고정 + ⬆ 맨 위로 버튼) ── */}
      <div
        className="sticky top-0 z-20"
        style={{
          background: 'var(--bg-surface)',
          boxShadow: showStickyBar ? '0 4px 20px rgba(0,0,0,0.10)' : 'none',
          borderBottomLeftRadius: showStickyBar ? 20 : 0,
          borderBottomRightRadius: showStickyBar ? 20 : 0,
          paddingBottom: showStickyBar ? 10 : 0,
          paddingTop: showStickyBar ? 10 : 0,
          marginLeft: showStickyBar ? -4 : 0,
          marginRight: showStickyBar ? -4 : 0,
          paddingLeft: showStickyBar ? 4 : 0,
          paddingRight: showStickyBar ? 4 : 0,
          transition: 'box-shadow 0.25s, border-radius 0.25s, padding 0.2s',
        }}
      >
        <div className="space-y-2">
        {/* ⬆ 맨 위로 버튼 (헤더가 스크롤 아웃된 경우 표시) */}
        {showStickyBar && (
          <div className="flex justify-end">
            <button
              onClick={() => summaryHeaderRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95"
              style={{ background: 'var(--blue-100)', color: 'var(--blue-600)', border: '1px solid var(--blue-200)' }}
              aria-label="맨 위로 스크롤"
            >
              ⬆ 맨 위로
            </button>
          </div>
        )}

        {/* ── 필터 프리셋 원탭 버튼 + 상세 필터 토글 + 간략/자세히 ── */}
        <div className="flex gap-2">
        <button
          onClick={() => applyPreset('quick')}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
          style={{
            background: activePreset === 'quick' ? 'var(--accent)' : 'var(--accent-weak)',
            color: activePreset === 'quick' ? 'white' : 'var(--accent)',
            border: `1.5px solid ${activePreset === 'quick' ? 'var(--accent)' : 'transparent'}`,
          }}
          title="영업중 + 5분 이내 자동 적용"
        >
          <Zap className="w-3.5 h-3.5" />
          빠른 경유
        </button>
        <button
          onClick={() => applyPreset('now')}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
          style={{
            background: activePreset === 'now' ? '#dc2626' : '#fee2e2',
            color: activePreset === 'now' ? 'white' : '#dc2626',
            border: `1.5px solid ${activePreset === 'now' ? '#dc2626' : 'transparent'}`,
          }}
          title="영업중 + 5분이내 + 경로근접 + 1km이내 자동 적용"
        >
          🔥 당장!
        </button>
        {/* 상세 필터 토글 버튼 */}
        <button
          onClick={() => setShowFilterChips((v) => !v)}
          className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
          style={{
            background: showFilterChips
              ? 'var(--blue-200)'
              : (openNowOnly || maxDetourMin !== null || maxDetourKm !== null || proxScoreOnly || unvisitedOnly)
              ? 'var(--accent)'
              : 'var(--bg-surface)',
            color: (showFilterChips || openNowOnly || maxDetourMin !== null || maxDetourKm !== null || proxScoreOnly || unvisitedOnly)
              ? showFilterChips ? 'var(--blue-700)' : 'white'
              : 'var(--text-secondary)',
            border: '1.5px solid var(--border-soft)',
          }}
          title="상세 필터 열기/닫기"
          aria-expanded={showFilterChips}
        >
          🎛{showFilterChips ? '▲' : '▼'}
        </button>
        {/* 간략/자세히 토글 (프리셋 줄에 상주 — 필터 칩 접혀도 항상 표시) */}
        <button
          onClick={() => setIsCompact((v) => !v)}
          className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
          style={{
            background: isCompact
              ? 'linear-gradient(135deg, var(--accent), var(--blue-600, #2563eb))'
              : 'var(--bg-surface)',
            color: isCompact ? 'white' : 'var(--text-secondary)',
            border: `1.5px solid ${isCompact ? 'transparent' : 'var(--border-soft)'}`,
            boxShadow: isCompact ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
          }}
          title={isCompact ? '자세히 보기로 전환' : '간략 보기로 전환'}
        >
          <span className="text-sm leading-none">{isCompact ? '☰' : '≡'}</span>
          {isCompact ? '자세히' : '간략'}
        </button>
      </div>

      {/* ── 빠른 필터 칩 (showFilterChips 토글) ── */}
      {showFilterChips && (
      <div className="flex items-center gap-1.5 flex-wrap">
          {/* 지금 열려있는 곳만 */}
          {hasBusinessHoursData && (
            <button
              onClick={() => { setOpenNowOnly((v) => !v); setActivePreset(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
              style={{
                background: openNowOnly ? 'var(--green-500)' : 'var(--green-50)',
                color: openNowOnly ? 'white' : 'var(--green-700)',
                border: `1.5px solid ${openNowOnly ? 'var(--green-500)' : 'var(--green-200)'}`,
              }}
            >
              <Clock className="w-3 h-3" />
              지금 열려있는 곳만
              {openNowOnly && openNowCount > 0 && (
                <span className="ml-0.5 opacity-80">({openNowCount})</span>
              )}
            </button>
          )}

          {/* 이탈 시간 상한 */}
          {([5, 10, 15] as const).map((min) => (
            <button
              key={min}
              onClick={() => { setMaxDetourMin((v) => (v === min ? null : min)); setActivePreset(null); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
              style={{
                background: maxDetourMin === min ? 'var(--accent)' : 'var(--blue-50)',
                color: maxDetourMin === min ? 'white' : 'var(--blue-700)',
                border: `1.5px solid ${maxDetourMin === min ? 'var(--accent)' : 'var(--blue-200)'}`,
              }}
            >
              <Zap className="w-3 h-3" />
              +{min}분 이내
            </button>
          ))}

          {/* 이탈 거리 상한 */}
          {([1, 2] as const).map((km) => (
            <button
              key={km}
              onClick={() => { setMaxDetourKm((v) => (v === km ? null : km)); setActivePreset(null); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
              style={{
                background: maxDetourKm === km ? 'var(--purple-600, #7c3aed)' : 'var(--purple-50, #f5f3ff)',
                color: maxDetourKm === km ? 'white' : 'var(--purple-700, #6d28d9)',
                border: `1.5px solid ${maxDetourKm === km ? 'var(--purple-600, #7c3aed)' : 'var(--purple-200, #ddd6fe)'}`,
              }}
            >
              📏 +{km}km 이내
            </button>
          ))}

          {/* 경로 근접 필터 (proxScore >= 70) */}
          <button
            onClick={() => { setProxScoreOnly((v) => !v); setActivePreset(null); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
            style={{
              background: proxScoreOnly ? '#0f766e' : '#f0fdfa',
              color: proxScoreOnly ? 'white' : '#0f766e',
              border: `1.5px solid ${proxScoreOnly ? '#0f766e' : '#99f6e4'}`,
            }}
          >
            📍 경로 근접
          </button>

          {/* 미방문만 보기 */}
          {visitedDates.size > 0 && (
            <button
              onClick={() => { setUnvisitedOnly((v) => !v); setActivePreset(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
              style={{
                background: unvisitedOnly ? 'var(--orange-500, #f97316)' : 'var(--orange-50, #fff7ed)',
                color: unvisitedOnly ? 'white' : 'var(--orange-700, #c2410c)',
                border: `1.5px solid ${unvisitedOnly ? 'var(--orange-500, #f97316)' : 'var(--orange-200, #fed7aa)'}`,
              }}
            >
              <Circle className="w-3 h-3" />
              미방문만
              {!unvisitedOnly && (
                <span className="ml-0.5 opacity-70">
                  ({results.length - visitedDates.size})
                </span>
              )}
            </button>
          )}

          {/* 필터 적용 중 안내 */}
          {(openNowOnly || maxDetourMin !== null || maxDetourKm !== null || proxScoreOnly || unvisitedOnly) && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {filteredResults.length}개 (전체 {results.length}개)
            </span>
          )}
      </div>
      )}{/* END showFilterChips */}

      {/* ── 이름 검색 인풋 (결과 5개 이상) ── */}
      {results.length >= 5 && (
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="매장 이름으로 검색"
            className="w-full pl-8 pr-8 py-2 rounded-xl text-sm outline-none transition-all"
            style={{
              background: 'var(--bg-surface)',
              border: '1.5px solid var(--border-soft)',
              color: 'var(--text-primary)',
            }}
          />
          {nameFilter && (
            <button
              onClick={() => setNameFilter('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full"
              style={{ color: 'var(--text-muted)' }}
              aria-label="검색 초기화"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 필터 결과 없음 안내 */}
      {filteredResults.length === 0 && (openNowOnly || maxDetourMin !== null || maxDetourKm !== null || proxScoreOnly || unvisitedOnly || nameFilter.trim()) && (
        <div className="py-8 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {nameFilter.trim()
              ? `"${nameFilter}" 에 해당하는 매장이 없어요`
              : unvisitedOnly
              ? '이미 방문한 곳이에요. 필터를 해제해보세요'
              : '조건에 맞는 경유지가 없어요'}
          </p>
          <button
            onClick={() => { setOpenNowOnly(false); setMaxDetourMin(null); setMaxDetourKm(null); setProxScoreOnly(false); setUnvisitedOnly(false); setNameFilter(''); }}
            className="mt-3 text-xs underline"
            style={{ color: 'var(--accent)' }}
          >
            필터 초기화
          </button>
        </div>
      )}

      {/* ── 활성 필터 요약 바 ── */}
      {(openNowOnly || maxDetourMin !== null || maxDetourKm !== null || proxScoreOnly || unvisitedOnly) && filteredResults.length > 0 && (
        <div
          className="flex items-center gap-1.5 flex-wrap px-3 py-2 rounded-xl"
          style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-200)' }}
        >
          <span className="text-[11px] font-bold shrink-0" style={{ color: 'var(--blue-600)' }}>🔽 필터</span>
          {openNowOnly && (
            <button
              onClick={() => { setOpenNowOnly(false); setActivePreset(null); }}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold active:scale-95 transition-all"
              style={{ background: 'var(--green-100)', color: 'var(--green-700)', border: '1px solid var(--green-200)' }}
            >
              영업중 ✕
            </button>
          )}
          {maxDetourMin !== null && (
            <button
              onClick={() => { setMaxDetourMin(null); setActivePreset(null); }}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold active:scale-95 transition-all"
              style={{ background: 'var(--blue-100)', color: 'var(--blue-700)', border: '1px solid var(--blue-200)' }}
            >
              +{maxDetourMin}분 ✕
            </button>
          )}
          {maxDetourKm !== null && (
            <button
              onClick={() => { setMaxDetourKm(null); setActivePreset(null); }}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold active:scale-95 transition-all"
              style={{ background: 'var(--purple-50, #f5f3ff)', color: 'var(--purple-700, #6d28d9)', border: '1px solid var(--purple-200, #ddd6fe)' }}
            >
              +{maxDetourKm}km ✕
            </button>
          )}
          {proxScoreOnly && (
            <button
              onClick={() => { setProxScoreOnly(false); setActivePreset(null); }}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold active:scale-95 transition-all"
              style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' }}
            >
              경로근접 ✕
            </button>
          )}
          {unvisitedOnly && (
            <button
              onClick={() => { setUnvisitedOnly(false); setActivePreset(null); }}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold active:scale-95 transition-all"
              style={{ background: 'var(--orange-50, #fff7ed)', color: 'var(--orange-700, #c2410c)', border: '1px solid var(--orange-200, #fed7aa)' }}
            >
              미방문 ✕
            </button>
          )}
          <div className="flex-1" />
          <span className="text-[11px] font-semibold shrink-0" style={{ color: 'var(--blue-600)' }}>
            {filteredResults.length}/{results.length}개
          </span>
          <button
            onClick={() => {
              setOpenNowOnly(false);
              setMaxDetourMin(null);
              setMaxDetourKm(null);
              setProxScoreOnly(false);
              setUnvisitedOnly(false);
              setActivePreset(null);
            }}
            className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            전체 해제
          </button>
        </div>
      )}
        </div>{/* END 필터 space-y-2 */}
      </div>{/* END sticky filter bar */}

      <div className="space-y-2.5">
      {visibleResults.map((result, index) => {
        const isSelected = selectedId === result.place.id;
        const isVisited = visitedDates.has(result.place.id);
        const visitedAt = visitedDates.get(result.place.id);
        const detourKm = (result.detourCost.distance / 1000).toFixed(1);
        const detourMin = Math.round(result.detourCost.duration / 60);
        const routeLabel = result.routeType === 'shortest' ? '최단거리' : result.routeType === 'fastest' ? '최단시간' : null;
        const recentClicks = popularityMap[result.place.id] ?? 0;

        const currentDistKm = currentLocation
          ? haversineDistanceKm(
              currentLocation.lat, currentLocation.lng,
              result.place.coordinates.lat, result.place.coordinates.lng
            )
          : null;
        const isClosest = closestPlaceId === result.place.id;

        const isBeingSwiped = swipeVisual?.id === result.place.id;
        const isHinting = swipeHintId === result.place.id;
        const swipeDeltaX = isBeingSwiped ? swipeVisual!.deltaX : (isHinting ? swipeHintDeltaX : 0);
        const swipeOpacity = Math.min(1, Math.abs(swipeDeltaX) / 80);

        // 이탈비용 컬러 스트라이프
        const detourRatio = detourRange > 30
          ? (result.detourCost.duration - minDetourDuration) / detourRange
          : 0;
        const stripeColor = detourRatio < 0.3 ? '#22c55e' : detourRatio < 0.65 ? '#f59e0b' : '#f97316';

        return (
          <div
            key={result.place.id}
            className="relative overflow-hidden rounded-2xl shadow-sm"
            style={{ opacity: isVisited ? 0.65 : 1, transition: 'opacity 0.3s' }}
          >
            {/* 이탈비용 컬러 스트라이프 (좌측 4px 히트맵 색상 바) */}
            <div
              className="absolute left-0 top-0 bottom-0 z-[1] rounded-l-2xl pointer-events-none"
              style={{ width: 4, background: stripeColor }}
              aria-hidden="true"
            />
            {/* 핀 고정 뱃지 */}
            {pinnedIds.has(result.place.id) && !isVisited && (
              <div
                className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold pointer-events-none"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                📌 상단 고정
              </div>
            )}
            {/* 방문 완료 뱃지 */}
            {isVisited && (
              <div
                className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold pointer-events-none"
                style={{ background: '#d1fae5', color: '#065f46' }}
              >
                <CheckCircle className="w-3 h-3" />
                방문함{visitedAt ? ` (${getVisitDateLabel(visitedAt)})` : ''}
              </div>
            )}
            {/* 스와이프 힌트 툴팁 (첫 로드 1회) */}
            {isHinting && (
              <div
                className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-3 py-1.5 rounded-full text-[11px] font-bold pointer-events-none"
                style={{ background: 'rgba(0,0,0,0.72)', color: 'white', whiteSpace: 'nowrap' }}
              >
                <span>← 주소 복사</span>
                <span style={{ opacity: 0.35 }}>|</span>
                <span>네비 →</span>
              </div>
            )}
            {/* Swipe right → 네비 힌트 */}
            <div
              className="absolute inset-y-0 left-0 flex items-center gap-1.5 px-5"
              style={{
                background: `rgba(34, 197, 94, ${swipeOpacity})`,
                opacity: swipeDeltaX > 8 ? 1 : 0,
                transition: !isBeingSwiped ? 'all 0.2s' : 'none',
                minWidth: 88,
                pointerEvents: 'none',
              }}
            >
              <Navigation className="w-5 h-5 text-white" />
              <span className="text-white text-xs font-bold whitespace-nowrap">네비</span>
            </div>
            {/* Swipe left → 복사 힌트 */}
            <div
              className="absolute inset-y-0 right-0 flex items-center justify-end gap-1.5 px-5"
              style={{
                background: `rgba(59, 130, 246, ${swipeOpacity})`,
                opacity: swipeDeltaX < -8 ? 1 : 0,
                transition: !isBeingSwiped ? 'all 0.2s' : 'none',
                minWidth: 88,
                pointerEvents: 'none',
              }}
            >
              <span className="text-white text-xs font-bold whitespace-nowrap">복사</span>
              <Copy className="w-5 h-5 text-white" />
            </div>
          <button
            data-result-index={index}
            onClick={() => {
              if (isCompact) {
                // 컴팩트 모드: 이미 확장된 카드면 선택, 아니면 인라인 확장
                if (expandedCompactId === result.place.id) {
                  handleSelect(result, index + 1);
                } else {
                  setExpandedCompactId(result.place.id);
                  onSelect(result); // 지도 마커 선택은 유지
                }
              } else {
                handleSelect(result, index + 1);
              }
            }}
            onMouseEnter={() => onHoverResult?.(result.place.id)}
            onMouseLeave={() => onHoverResult?.(null)}
            onTouchStart={(e) => handleCardTouchStart(e, result.place.id)}
            onTouchMove={(e) => handleCardTouchMove(e, result.place.id)}
            onTouchEnd={() => handleCardTouchEnd(result)}
            className={`w-full ${isCompact ? 'px-3 py-2.5' : 'p-4'} rounded-2xl text-left active:scale-[0.98]`}
            style={{
              background: isSelected ? 'var(--blue-200)' : 'var(--bg-surface)',
              border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border-soft)',
              transform: `translateX(${swipeDeltaX}px)`,
              transition: !isBeingSwiped ? 'transform 0.35s ease' : 'none',
            }}
          >
          {isCompact ? (
            // ── 컴팩트 모드 ──
            <>
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: index === 0 ? 'var(--accent)' : 'var(--blue-150)',
                  color: index === 0 ? 'white' : 'var(--accent)',
                }}
              >
                {index + 1}
              </div>
              <span className="text-base shrink-0">{getCategoryIcon(result.place.category)}</span>
              <p className="text-sm font-bold flex-1 truncate min-w-0" style={{ color: 'var(--text-primary)' }}>
                {highlightText(result.place.name, nameFilter)}
              </p>
              {(() => {
                const compactPos = getRoutePositionLabel(result);
                return compactPos ? (
                  <span
                    className="shrink-0 text-[11px] px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--purple-100)', color: 'var(--purple-700)' }}
                  >
                    📍 {compactPos}
                  </span>
                ) : null;
              })()}
              {isClosest && currentDistKm !== null && (
                <span
                  className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#dcfce7', color: '#15803d' }}
                  title="현재 내 위치에서 가장 가까운 곳"
                >
                  📍근접
                </span>
              )}
              <span
                className="shrink-0 text-[12px] font-bold px-2 py-1 rounded-full"
                style={{ background: 'var(--yellow-100)', color: 'var(--yellow-700)' }}
              >
                +{detourMin}분
              </span>
              {/* 컴팩트: 마감 임박 뱃지 (30분 이내) */}
              {result.place.businessHours && (() => {
                const status = getBusinessStatus(result.place.businessHours);
                const minsUntilClose = status.isOpen ? getMinutesUntilClose(result.place.businessHours) : null;
                if (minsUntilClose !== null && minsUntilClose <= 30) {
                  return (
                    <span
                      className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fbbf24' }}
                    >
                      ⚠️{minsUntilClose}분
                    </span>
                  );
                }
                return null;
              })()}
              <button
                onClick={(e) => handleTogglePlaceFav(e, result)}
                className="shrink-0 p-2 rounded-lg active:scale-95 transition-colors"
                title={favPlaces.has(result.place.id) ? '즐겨찾기 해제' : '즐겨찾기 저장'}
              >
                <Star
                  className="w-4 h-4"
                  fill={favPlaces.has(result.place.id) ? '#f59e0b' : 'none'}
                  style={{ color: favPlaces.has(result.place.id) ? 'var(--yellow-600)' : 'var(--text-muted)' }}
                />
              </button>
              <button
                onClick={(e) => handleOpenNavi(e, result.place)}
                className="shrink-0 p-2 rounded-lg active:scale-95"
                style={{ background: 'var(--accent-weak)', color: 'var(--accent)' }}
                title="네비 시작"
                aria-label="네비 시작"
              >
                <Navigation className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => handleVisitToggle(e, result)}
                className="shrink-0 p-2 rounded-lg active:scale-95 transition-colors"
                title={isVisited ? '방문 표시 해제' : '방문했어요'}
                aria-label={isVisited ? '방문 표시 해제' : '방문 체크'}
              >
                {isVisited
                  ? <CheckCircle className="w-4 h-4" style={{ color: '#16a34a' }} />
                  : <Circle className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                }
              </button>
              {/* 📌 핀 고정 버튼 (컴팩트) */}
              <button
                onClick={(e) => handleTogglePin(e, result)}
                className="shrink-0 p-2 rounded-lg active:scale-95 transition-colors"
                title={pinnedIds.has(result.place.id) ? '핀 고정 해제' : '상단에 고정'}
              >
                <Bookmark
                  className="w-4 h-4"
                  fill={pinnedIds.has(result.place.id) ? 'var(--accent)' : 'none'}
                  style={{ color: pinnedIds.has(result.place.id) ? 'var(--accent)' : 'var(--text-muted)' }}
                />
              </button>
            </div>

            {/* ── 컴팩트 아코디언 확장 영역 (탭 시 인라인 세부 정보) ── */}
            {expandedCompactId === result.place.id && (() => {
              const eta = getETAText(result, isNowDeparture ? nowMs : departureMs, dwellMinutes);
              const address = result.place.roadAddress || result.place.address;
              return (
                <div
                  className="mt-2 pt-2 border-t space-y-2"
                  style={{ borderColor: 'var(--border-soft)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {address && (
                    <p className="text-[12px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                      {address}
                    </p>
                  )}
                  {eta && (
                    <div
                      className="flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-xl"
                      style={{ background: 'var(--bg-muted, #f3f4f6)', color: 'var(--text-muted)' }}
                    >
                      {isNowDeparture ? <span className="animate-pulse">🟢</span> : <span>🕐</span>}
                      <span>
                        경유지 <strong style={{ color: 'var(--text-primary)' }}>{eta.waypoint}</strong>
                        {' '}/ 목적지 <strong style={{ color: 'var(--text-primary)' }}>{eta.destination}</strong>
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => { triggerNav(result.place); setExpandedCompactId(null); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-[13px] transition-all active:scale-95"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    <Navigation className="w-4 h-4" />
                    {preferredNavApp === 'kakao' ? '카카오내비' : preferredNavApp === 'naver' ? '네이버지도' : preferredNavApp === 'tmap' ? '티맵' : '네비'} 시작
                  </button>
                  <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
                    한 번 더 탭하면 선택됩니다
                  </p>
                </div>
              );
            })()}
            </>
          ) : (
            // ── 전체 카드 모드 ──
            <>
            {/* 🏆 베스트 픽 배너 (1등 카드만) — 탭하면 점수 분해 자동 열기/닫기 */}
            {index === 0 && (
              <button
                className="mb-3 -mx-1 px-3 py-1.5 rounded-xl flex items-center gap-2 text-[12px] font-bold transition-all active:scale-[0.98]"
                style={{
                  width: 'calc(100% + 8px)',
                  textAlign: 'left',
                  background: 'linear-gradient(90deg, var(--yellow-100), var(--orange-50, #fff7ed))',
                  color: 'var(--yellow-700)',
                  border: scoreDetailOpenId === result.place.id
                    ? '1.5px solid var(--yellow-400, #facc15)'
                    : '1px solid var(--yellow-300)',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setScoreDetailOpenId((prev) =>
                    prev === result.place.id ? null : result.place.id
                  );
                }}
                title="탭해서 추천 점수 분석 보기"
              >
                <span>🏆</span>
                <span className="flex-1">베스트 픽 — {getBestPickReason(result)}</span>
                <span className="text-[10px] opacity-60 shrink-0">
                  {scoreDetailOpenId === result.place.id ? '▲ 접기' : '📊 분석'}
                </span>
              </button>
            )}
            <div className="flex items-start gap-3">
              {/* Rank badge with category icon */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold"
                  style={{
                    background: index === 0 ? 'var(--accent)' : 'var(--blue-150)',
                    color: index === 0 ? 'var(--bg-surface)' : 'var(--accent)',
                  }}
                >
                  {index + 1}
                </div>
                <span className="text-xl">{getCategoryIcon(result.place.category)}</span>
              </div>

              <div className="flex-1 min-w-0 mr-2">
                {/* Name */}
                <h3 className="text-[17px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {highlightText(result.place.name, nameFilter)}
                </h3>
                {/* Address */}
                {(result.place.roadAddress || result.place.address) && (
                  <p className="text-[13px] mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {highlightText(result.place.roadAddress || result.place.address || '', nameFilter)}
                  </p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  {/* 기본 정보 뱃지: 이탈 거리/시간 — sortBy 강조 */}
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all"
                    style={
                      sortBy === 'distance'
                        ? { background: 'var(--accent)', color: 'white' }
                        : { background: 'var(--accent-weak)', color: 'var(--accent)' }
                    }
                    title={sortBy === 'distance' ? '거리순 정렬 기준' : undefined}
                  >
                    {sortBy === 'distance' && '📏 '}+{detourKm}km
                  </span>
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all"
                    style={
                      sortBy === 'duration'
                        ? { background: 'var(--yellow-500, #eab308)', color: 'white' }
                        : { background: 'var(--yellow-100)', color: 'var(--yellow-600)' }
                    }
                    title={sortBy === 'duration' ? '시간순 정렬 기준' : undefined}
                  >
                    {sortBy === 'duration' && '⏱ '}+{detourMin}분
                  </span>
                  {routeLabel && (
                    <span
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
                      style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}
                    >
                      {routeLabel}
                    </span>
                  )}
                  {/* 경로상 위치 뱃지 */}
                  {(() => {
                    const posLabel = getRoutePositionLabel(result);
                    if (!posLabel) return null;
                    return (
                      <span
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
                        style={{ background: 'var(--purple-100)', color: 'var(--purple-700)' }}
                        title="원본 경로상 이 장소의 위치"
                      >
                        📍 {posLabel}
                      </span>
                    );
                  })()}
                  {/* 실시간 인기도 뱃지 */}
                  {recentClicks >= 2 && (
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold"
                      style={{ background: 'var(--orange-100)', color: 'var(--orange-600)' }}
                      title="최근 1시간 내 다른 사용자들이 클릭한 횟수"
                    >
                      🔥 {recentClicks}명 관심
                    </span>
                  )}
                  {/* 영업 상태 뱃지 + 마감/오픈까지 남은 시간 */}
                  {result.place.businessHours && (() => {
                    const status = getBusinessStatus(result.place.businessHours);
                    if (status.label === '정보 없음') return null;
                    const minsUntilClose = status.isOpen ? getMinutesUntilClose(result.place.businessHours) : null;
                    const minsUntilOpen = !status.isOpen ? getMinutesUntilOpen(result.place.businessHours) : null;
                    const isUrgentClose = minsUntilClose !== null && minsUntilClose <= 30;
                    const isOpeningSoon = minsUntilOpen !== null && minsUntilOpen <= 30;
                    return (
                      <>
                        <span
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
                          style={{
                            background: isUrgentClose ? '#fef3c7' : status.isOpen ? 'var(--green-100)' : 'var(--red-100)',
                            color: isUrgentClose ? '#92400e' : status.color,
                            border: isUrgentClose ? '1.5px solid #fbbf24' : undefined,
                          }}
                        >
                          {isUrgentClose ? '⚠️' : status.emoji}{' '}
                          {isUrgentClose ? `${minsUntilClose}분 후 마감` : status.label}
                        </span>
                        {isOpeningSoon && (
                          <span
                            className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold"
                            style={{ background: '#dbeafe', color: '#1d4ed8', border: '1.5px solid #93c5fd' }}
                          >
                            🕐 {minsUntilOpen}분 후 오픈
                          </span>
                        )}
                      </>
                    );
                  })()}
                  {/* 현재 위치 기준 거리 뱃지 */}
                  {currentDistKm !== null && (
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all"
                      style={
                        isClosest
                          ? { background: '#dcfce7', color: '#15803d', border: '1.5px solid #86efac' }
                          : { background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-soft)' }
                      }
                      title="현재 내 위치 기준 직선 거리"
                    >
                      {isClosest ? '📍 내 위치 최근접' : '📍'} {currentDistKm < 1 ? `${Math.round(currentDistKm * 1000)}m` : `${currentDistKm.toFixed(1)}km`}
                    </span>
                  )}
                  {/* 점수 분해 토글 버튼 — sortBy=score 시 강조 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setScoreDetailOpenId((prev) =>
                        prev === result.place.id ? null : result.place.id
                      );
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all active:scale-95"
                    style={{
                      background: scoreDetailOpenId === result.place.id
                        ? 'var(--accent)'
                        : sortBy === 'score'
                        ? 'var(--blue-200)'
                        : 'var(--blue-100)',
                      color: scoreDetailOpenId === result.place.id ? 'white' : 'var(--blue-700)',
                      border: `1.5px solid ${
                        scoreDetailOpenId === result.place.id
                          ? 'var(--accent)'
                          : sortBy === 'score'
                          ? 'var(--blue-400)'
                          : 'var(--blue-200)'
                      }`,
                    }}
                    title={sortBy === 'score' ? '점수순 정렬 기준 — 클릭해서 상세 보기' : '추천 점수 분석 보기'}
                  >
                    📊 {Math.round(result.finalScore)}점
                  </button>
                </div>

                {/* 상대적 이탈 비교 바 */}
                {detourRange > 30 && (() => {
                  const deltaSec = result.detourCost.duration - minDetourDuration;
                  const deltaMin = Math.round(deltaSec / 60);
                  const ratio = deltaSec / detourRange;
                  const barColor = ratio < 0.3 ? '#22c55e' : ratio < 0.65 ? '#f59e0b' : '#f97316';
                  const textColor = ratio < 0.3 ? '#16a34a' : ratio < 0.65 ? '#b45309' : '#ea580c';
                  const isBest = deltaSec < 30;
                  return (
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>이탈</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.max(4, Math.round(ratio * 100))}%`,
                            background: barColor,
                          }}
                        />
                      </div>
                      <span
                        className="text-[10px] font-semibold shrink-0 min-w-[44px] text-right"
                        style={{ color: isBest ? '#16a34a' : textColor }}
                      >
                        {isBest ? '⭐최단' : `+${deltaMin}분 더`}
                      </span>
                    </div>
                  );
                })()}

                {/* ⏰ 영업시간 타임라인 — 24시간 기준 영업 구간 + 현재 시각 포인터 */}
                {result.place.businessHours && (() => {
                  const range = getBusinessHoursRange(result.place.businessHours);
                  if (!range || range.is24h) return null;
                  const TOTAL = 24 * 60;
                  const now = new Date();
                  const currentMin = now.getHours() * 60 + now.getMinutes();
                  const openPct = (range.startMin / TOTAL) * 100;
                  const closePct = Math.min((range.endMin / TOTAL) * 100, 100);
                  const nowPct = (currentMin / TOTAL) * 100;
                  const fmtMin = (m: number) => {
                    const h = Math.floor((m % (24 * 60)) / 60);
                    const min = (m % (24 * 60)) % 60;
                    return `${h}:${String(min).padStart(2, '0')}`;
                  };
                  const bizStatus = getBusinessStatus(result.place.businessHours);
                  return (
                    <div className="mt-2" title={`영업: ${fmtMin(range.startMin)} ~ ${fmtMin(range.endMin)}`}>
                      <div className="relative h-2 rounded-full" style={{ background: 'var(--border-soft)' }}>
                        {/* 영업 시간 구간 */}
                        <div
                          className="absolute top-0 bottom-0 rounded-full"
                          style={{
                            left: `${openPct}%`,
                            width: `${Math.max(0, closePct - openPct)}%`,
                            background: bizStatus.isOpen ? '#22c55e' : '#9ca3af',
                          }}
                        />
                        {/* 현재 시각 포인터 */}
                        <div
                          className="absolute top-[-1px] bottom-[-1px] z-10 rounded-sm"
                          style={{ left: `${nowPct}%`, width: 2, background: '#ef4444' }}
                        />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmtMin(range.startMin)}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmtMin(range.endMin)}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* 📊 점수 분해 상세 */}
                {scoreDetailOpenId === result.place.id && (() => {
                  const detourScore = Math.max(0, Math.round(100 - result.detourCost.costScore));
                  const proxScore = Math.round(result.proximityScore);
                  const finalScoreRounded = Math.round(result.finalScore);
                  return (
                    <div
                      className="mt-2.5 p-3 rounded-xl space-y-2.5"
                      style={{ background: 'var(--bg-muted, #f3f4f6)', border: '1px solid var(--border-soft)' }}
                    >
                      <p className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                        📊 추천 점수 분석 (이탈비용 70% + 근접도 30%)
                      </p>
                      {/* 최종 점수 */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>최종 점수</span>
                          <span className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>{finalScoreRounded}점</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
                          <div className="h-full rounded-full" style={{ width: `${finalScoreRounded}%`, background: 'var(--accent)' }} />
                        </div>
                      </div>
                      {/* 이탈 비용 */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                            🚗 이탈 비용 <span style={{ color: 'var(--text-muted)' }}>(70%)</span>
                          </span>
                          <span className="text-[11px] font-semibold" style={{ color: '#16a34a' }}>{detourScore}점</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
                          <div className="h-full rounded-full" style={{ width: `${detourScore}%`, background: '#22c55e' }} />
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          +{detourKm}km · +{detourMin}분 추가 이탈
                        </p>
                      </div>
                      {/* 경로 근접도 */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                            📍 경로 근접도 <span style={{ color: 'var(--text-muted)' }}>(30%)</span>
                          </span>
                          <span className="text-[11px] font-semibold" style={{ color: '#7c3aed' }}>{proxScore}점</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
                          <div className="h-full rounded-full" style={{ width: `${proxScore}%`, background: '#a855f7' }} />
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          경로상 샘플 포인트와의 근접 정도
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* 추천 이유 뱃지 + 스마트 한 줄 요약 */}
                {(() => {
                  const visitCount = routeHash ? getVisitCount(result.place.id, routeHash) : 0;
                  const badges = getRecommendationBadges(
                    result,
                    index + 1,
                    undefined, // totalClicks는 서버에서 가져와야 함 (TODO)
                    visitCount
                  );
                  const oneLiner = getSmartOneLiner(result, index + 1, visitCount || undefined);

                  return (
                    <>
                      {badges.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {badges.map((badge, i) => {
                            const colors = getBadgeColor(badge.type);
                            return (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold"
                                style={{
                                  background: colors.bg,
                                  color: colors.text,
                                  border: `1px solid ${colors.border}`,
                                }}
                                title={badge.description}
                              >
                                <span>{badge.icon}</span>
                                <span>{badge.label}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {/* 스마트 한 줄 추천 문구 */}
                      {oneLiner && (
                        <p
                          className="text-[12px] mt-2 font-medium leading-snug"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {oneLiner}
                        </p>
                      )}
                    </>
                  );
                })()}

                {/* 출발 시각 기준 예상 도착 시간 (지금 출발 시 1분마다 자동 갱신) */}
                {(() => {
                  const eta = getETAText(result, isNowDeparture ? nowMs : departureMs, dwellMinutes);
                  if (!eta) return null;
                  return (
                    <div
                      className="mt-2 flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-xl"
                      style={{ background: 'var(--bg-muted, #f3f4f6)', color: 'var(--text-muted)' }}
                    >
                      {isNowDeparture ? (
                        <span className="animate-pulse" title="실시간 갱신 중">🟢</span>
                      ) : (
                        <span>🕐</span>
                      )}
                      <span>
                        {isNowDeparture ? '지금 출발 중' : `${departureTime} 출발`} → 경유지{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>{eta.waypoint}</strong>
                        {dwellMinutes > 0 && (
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}> (+{dwellMinutes}분 체류)</span>
                        )}
                        {' '}/ 목적지{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>{eta.destination}</strong>
                        {' '}도착 예상
                        {isNowDeparture && <span className="ml-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>· 1분마다 갱신</span>}
                      </span>
                    </div>
                  );
                })()}

                {/* 📝 개인 메모 — 편집 중일 때 textarea, 저장된 메모가 있을 때 yellow note */}
                {editingMemoId === result.place.id ? (
                  <div className="mt-2.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={editingMemoText}
                      onChange={(e) => setEditingMemoText(e.target.value)}
                      placeholder="이 장소에 대한 메모를 남겨보세요 (예: 주차 쉬움, 2층에 있음)"
                      maxLength={200}
                      rows={2}
                      className="w-full px-3 py-2 text-sm rounded-xl resize-none outline-none focus:ring-2 transition-all"
                      style={{
                        background: '#fef9c3',
                        border: '1.5px solid #fde047',
                        color: 'var(--text-primary)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={handleCancelMemo}
                        className="px-3 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95"
                        style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-soft)' }}
                      >
                        취소
                      </button>
                      <button
                        onClick={(e) => handleSaveMemo(e, result.place.id)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95"
                        style={{ background: '#fbbf24', color: 'white' }}
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : memoMap.has(result.place.id) ? (
                  <div
                    className="mt-2 flex items-start gap-2 px-2.5 py-2 rounded-xl"
                    style={{ background: '#fef9c3', border: '1px solid #fde047', color: '#92400e' }}
                  >
                    <span className="text-sm shrink-0">📝</span>
                    <p className="text-[12px] flex-1 leading-snug break-words">{memoMap.get(result.place.id)}</p>
                  </div>
                ) : null}

                {/* Navigation Button */}
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                  {preferredNavApp ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleOpenNavi(e, result.place)}
                        className="flex-1 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-[14px] transition-all active:scale-95 justify-center"
                        style={{ background: 'var(--accent-weak)', color: 'var(--accent)' }}
                      >
                        <Navigation className="w-4 h-4" />
                        {preferredNavApp === 'kakao' ? '카카오내비' : preferredNavApp === 'naver' ? '네이버지도' : '티맵'}으로 시작
                      </button>
                      <button
                        onClick={(e) => handleOpenNaviSheet(e, result.place)}
                        className="px-3 py-2 rounded-lg text-[12px] font-medium transition-all active:scale-95"
                        style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-soft)' }}
                        title="다른 앱 선택"
                      >
                        변경
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleOpenNavi(e, result.place)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-[14px] transition-all active:scale-95 w-full justify-center"
                      style={{ background: 'var(--accent-weak)', color: 'var(--accent)' }}
                    >
                      <Navigation className="w-4 h-4" />
                      네비 시작
                    </button>
                  )}
                </div>
              </div>

              {/* 즐겨찾기 + 주소 복사 + 더보기 (⋯) 버튼 */}
              <div className="flex flex-col gap-1 shrink-0 self-start">
                <button
                  onClick={(e) => handleTogglePlaceFav(e, result)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
                  title={favPlaces.has(result.place.id) ? '즐겨찾기 해제' : '즐겨찾기 저장'}
                >
                  <Star
                    className="w-4 h-4"
                    fill={favPlaces.has(result.place.id) ? '#f59e0b' : 'none'}
                    style={{ color: favPlaces.has(result.place.id) ? 'var(--yellow-600)' : 'var(--text-muted)' }}
                  />
                </button>
                <button
                  onClick={(e) => handleCopyAddress(e, result)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
                  title="주소 복사"
                >
                  {copiedId === result.place.id ? (
                    <Check className="w-4 h-4" style={{ color: 'var(--green-600)' }} />
                  ) : (
                    <Copy className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  )}
                </button>
                {/* ⋯ 더보기 버튼 → 나머지 액션 인라인 토글 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOverflowMenuId((prev) => prev === result.place.id ? null : result.place.id);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
                  title="더 보기"
                >
                  <MoreHorizontal
                    className="w-4 h-4"
                    style={{ color: overflowMenuId === result.place.id ? 'var(--accent)' : 'var(--text-muted)' }}
                  />
                </button>
                {/* 오버플로우 메뉴 — 카드 내 인라인 펼침 */}
                {overflowMenuId === result.place.id && (
                  <div
                    className="flex flex-col gap-0.5 pt-1 border-t"
                    style={{ borderColor: 'var(--border-soft)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {result.place.phone && (
                      <button
                        onClick={(e) => { e.stopPropagation(); window.open(`tel:${result.place.phone}`); }}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
                        title={`전화: ${result.place.phone}`}
                      >
                        <Phone className="w-4 h-4" style={{ color: 'var(--green-600)' }} />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleShare(e, result)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
                      title="공유하기"
                    >
                      {sharedId === result.place.id ? (
                        <Check className="w-4 h-4" style={{ color: 'var(--green-600)' }} />
                      ) : (
                        <Share2 className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleVisitToggle(e, result)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
                      title={isVisited ? '방문 표시 해제' : '방문했어요'}
                    >
                      {isVisited
                        ? <CheckCircle className="w-4 h-4" style={{ color: '#16a34a' }} />
                        : <Circle className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      }
                    </button>
                    <button
                      onClick={(e) => handleTogglePin(e, result)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
                      title={pinnedIds.has(result.place.id) ? '핀 고정 해제' : '상단에 고정'}
                    >
                      <Bookmark
                        className="w-4 h-4"
                        fill={pinnedIds.has(result.place.id) ? 'var(--accent)' : 'none'}
                        style={{ color: pinnedIds.has(result.place.id) ? 'var(--accent)' : 'var(--text-muted)' }}
                      />
                    </button>
                    <button
                      onClick={(e) => handleEditMemo(e, result.place.id)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
                      title={memoMap.has(result.place.id) ? '메모 수정' : '메모 추가'}
                    >
                      <Pencil
                        className="w-4 h-4"
                        style={{ color: memoMap.has(result.place.id) ? '#d97706' : 'var(--text-muted)' }}
                      />
                    </button>
                  </div>
                )}
              </div>
            </div>
            </>
          )}
          </button>
          </div>
        );
      })}
      </div>

      {/* ── 결과 더보기 버튼 ── */}
      {sortedWithPins.length > visibleCount && (
        <button
          onClick={() => setVisibleCount(sortedWithPins.length)}
          className="w-full py-3.5 rounded-2xl font-bold text-[14px] transition-all active:scale-[0.98] shadow-sm"
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--accent)',
            border: '2px solid var(--accent-weak)',
          }}
        >
          결과 더 보기 ({sortedWithPins.length - visibleCount}개 남음)
        </button>
      )}
      {/* 접기 버튼 (전체 표시 중일 때만, 10개 초과 시) */}
      {sortedWithPins.length > 10 && visibleCount >= sortedWithPins.length && (
        <button
          onClick={() => {
            setVisibleCount(10);
            // 리스트 상단으로 스크롤
            if (listRef.current) listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="w-full py-2.5 rounded-2xl font-medium text-[13px] transition-all active:scale-[0.98]"
          style={{ background: 'var(--bg-muted, #f3f4f6)', color: 'var(--text-muted)' }}
        >
          접기
        </button>
      )}

      {/* 이 근처에도 있어요 — 인접 카테고리 제안 */}
      {results.length > 0 && onCategoryChange && (() => {
        const relatedCats = getRelatedCategories(currentCategory).slice(0, 5);
        if (relatedCats.length === 0) return null;
        return (
          <div className="pt-1 space-y-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              👀 이 근처에도 있어요
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {relatedCats.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onCategoryChange(cat)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95 shrink-0"
                  style={{
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    border: '1.5px solid var(--border-soft)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <span>{getCategoryIcon(cat)}</span>
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 즐겨찾기 저장 CTA */}
      {results.length > 0 && onSaveRoute && (
        <button
          onClick={onSaveRoute}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-[15px] transition-all active:scale-[0.98] shadow-sm"
          style={{
            background: 'linear-gradient(135deg, var(--yellow-100), var(--orange-50, #fff7ed))',
            color: 'var(--yellow-700)',
            border: '1.5px solid var(--yellow-300)',
          }}
        >
          <span className="text-lg">⭐</span>
          이 경로 즐겨찾기로 저장
        </button>
      )}

      {/* Feedback Section — 컴팩트 인라인 */}
      {results.length > 0 && (
        feedbackSent ? (
          <p className="text-xs text-center py-1.5" style={{ color: 'var(--green-600)' }}>
            감사합니다! 소중한 의견 반영할게요 ✨
          </p>
        ) : (
          <div className="flex items-center justify-center gap-3 py-1.5">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>결과가 도움됐나요?</span>
            <button
              onClick={() => handleFeedback(true)}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-95"
              style={{ background: 'var(--green-100)', color: 'var(--green-700)', border: '1px solid var(--green-200)' }}
            >
              👍 도움됐어요
            </button>
            <button
              onClick={() => handleFeedback(false)}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-95"
              style={{ background: 'var(--red-100, #fee2e2)', color: 'var(--red-600, #dc2626)', border: '1px solid var(--red-200, #fecaca)' }}
            >
              👎 별로예요
            </button>
          </div>
        )
      )}

      {/* 📌 모바일 하단 고정 미니 요약 바 — 헤더가 뷰포트 밖으로 나가면 표시 */}
      {showStickyBar && sortedWithPins.length > 0 && (() => {
        const best = sortedWithPins[0];
        const bMin = Math.round(best.detourCost.duration / 60);
        const bKm = (best.detourCost.distance / 1000).toFixed(1);
        return (
          <div
            className="sticky bottom-0 left-0 right-0 z-10 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg"
            style={{
              background: 'linear-gradient(135deg, var(--bg-surface), var(--blue-50))',
              border: '1.5px solid var(--blue-200)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span className="text-lg shrink-0">🏆</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {best.place.name}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                베스트 픽 · +{bMin}분 · +{bKm}km
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleQuickGo(); }}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
            >
              🚀 바로 출발
            </button>
          </div>
        );
      })()}

      {/* Navigation App Selection Bottom Sheet */}
      <BottomSheet
        visible={naviSheetOpen}
        snap="collapsed"
        onSnapChange={(snap) => { if (snap === 'collapsed') setNaviSheetOpen(false); }}
      >
        <div className="p-6">
          <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            어떤 앱으로 안내할까요?
          </h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            선택한 앱을 기억해 다음엔 바로 실행해요
          </p>
          {selectedPlace && (
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {selectedPlace.name}
            </p>
          )}
          <div className="space-y-3">
            {(
              [
                { app: 'kakao' as NavApp, label: '카카오내비', sub: 'KakaoNavi', bg: 'bg-yellow-400', emoji: '🗺️' },
                { app: 'naver' as NavApp, label: '네이버지도', sub: 'Naver Map', bg: 'bg-green-500', emoji: '🧭' },
                { app: 'tmap' as NavApp, label: '티맵', sub: 'TMAP', bg: 'bg-red-500', emoji: '📍' },
              ] as const
            ).map(({ app, label, sub, bg, emoji }) => {
              const isPreferred = preferredNavApp === app;
              return (
                <button
                  key={app}
                  onClick={() => handleNaviAppSelect(app)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition-all active:scale-98 shadow-sm"
                  style={{
                    background: isPreferred ? 'var(--blue-50)' : 'var(--bg-surface)',
                    border: `1px solid ${isPreferred ? 'var(--accent)' : 'var(--border-soft)'}`,
                  }}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${bg}`}>
                    <span className="text-2xl">{emoji}</span>
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{label}</div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{sub}</div>
                  </div>
                  {isPreferred && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--accent)', color: 'white' }}>
                      기억됨
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
