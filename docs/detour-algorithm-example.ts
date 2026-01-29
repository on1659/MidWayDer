/**
 * Detour Cost 알고리즘 사용 예시
 *
 * Phase 4에서 구현한 핵심 알고리즘의 실제 사용 예시입니다.
 * 이 파일은 실행되지 않으며, 참고용 예시 코드입니다.
 */

import { calculateDetourCosts } from '@/lib/detour';
import { getRoute } from '@/lib/naver-maps/directions';

// ========================
// 예시 1: 서울시청 → 강남역 경로에서 다이소 찾기
// ========================

async function example1() {
  console.log('=== Example 1: 다이소 경유지 찾기 ===');

  // Step 1: 원본 경로 조회 (A→B)
  const originalRoute = await getRoute(
    { lat: 37.5663, lng: 126.9779 }, // 서울시청
    { lat: 37.4979, lng: 127.0276 } // 강남역
  );

  console.log(`원본 경로: ${originalRoute.distance}m, ${originalRoute.duration}s`);

  // Step 2: Detour Cost 계산
  const { results, totalCandidates, apiCallsUsed } = await calculateDetourCosts(
    originalRoute,
    '다이소'
  );

  console.log(`\n총 후보: ${totalCandidates}개`);
  console.log(`API 호출: ${apiCallsUsed}회`);
  console.log(`최종 결과: ${results.length}개\n`);

  // Step 3: 상위 3개 결과 출력
  results.slice(0, 3).forEach((result, index) => {
    console.log(`${index + 1}. ${result.place.name}`);
    console.log(`   주소: ${result.place.address}`);
    console.log(`   이탈 거리: +${result.detourCost.distance}m`);
    console.log(`   이탈 시간: +${result.detourCost.duration}s`);
    console.log(`   근접도 점수: ${result.proximityScore.toFixed(1)}`);
    console.log(`   최종 점수: ${result.finalScore.toFixed(1)}`);
    console.log('');
  });

  // Step 4: 최적 경유지 선택
  const bestPlace = results[0];
  console.log(`추천 경유지: ${bestPlace.place.name}`);
  console.log(
    `총 거리: ${bestPlace.routes.toWaypoint.distance + bestPlace.routes.fromWaypoint.distance}m`
  );
}

// ========================
// 예시 2: 커스텀 옵션 사용
// ========================

async function example2() {
  console.log('=== Example 2: 커스텀 옵션 사용 ===');

  const originalRoute = await getRoute(
    { lat: 37.5663, lng: 126.9779 },
    { lat: 37.4979, lng: 127.0276 }
  );

  // 커스텀 필터링 옵션
  const { results } = await calculateDetourCosts(originalRoute, '스타벅스', {
    bufferDistance: 1500, // 경로 주변 1.5km 이내
    maxDetourDistance: 3000, // 최대 3km 이탈 허용
    sampleInterval: 300, // 300m 간격으로 샘플링
  });

  console.log(`결과: ${results.length}개의 스타벅스 매장 발견`);
}

// ========================
// 예시 3: 장거리 경로 처리
// ========================

async function example3() {
  console.log('=== Example 3: 장거리 경로 (서울 → 부산) ===');

  const originalRoute = await getRoute(
    { lat: 37.5663, lng: 126.9779 }, // 서울시청
    { lat: 35.1796, lng: 129.0756 } // 부산 해운대
  );

  console.log(`경로 거리: ${(originalRoute.distance / 1000).toFixed(1)}km`);

  // 장거리 경로는 자동으로 샘플링 간격 조정 (2km)
  const { results } = await calculateDetourCosts(originalRoute, '휴게소');

  console.log(`추천 휴게소: ${results[0]?.place.name || '없음'}`);
}

// ========================
// 예시 4: 에러 처리
// ========================

async function example4() {
  console.log('=== Example 4: 에러 처리 ===');

  try {
    const originalRoute = await getRoute(
      { lat: 37.5663, lng: 126.9779 },
      { lat: 37.4979, lng: 127.0276 }
    );

    const { results } = await calculateDetourCosts(originalRoute, '존재하지않는카테고리');

    if (results.length === 0) {
      console.log('해당 카테고리의 매장을 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('Detour 계산 실패:', error);
  }
}

// ========================
// 예시 5: 개별 함수 사용
// ========================

import { samplePolyline, filterByProximity } from '@/lib/detour';
import { filterPlacesByRoute } from '@/lib/detour';

async function example5() {
  console.log('=== Example 5: 개별 함수 사용 ===');

  const originalRoute = await getRoute(
    { lat: 37.5663, lng: 126.9779 },
    { lat: 37.4979, lng: 127.0276 }
  );

  // 1. 샘플링
  const sampled = samplePolyline(originalRoute.path, 500);
  console.log(`샘플링: ${originalRoute.path.length} → ${sampled.length} 포인트`);

  // 2. PostGIS 공간 필터링
  const candidates = await filterPlacesByRoute(originalRoute, '다이소', 1000);
  console.log(`공간 필터링: ${candidates.length}개 후보`);

  // 3. 근접도 필터링
  const topCandidates = filterByProximity(candidates, sampled, originalRoute, 20);
  console.log(`근접도 필터링: ${topCandidates.length}개 선택`);

  // 4. 개별 경유지 Detour Cost 계산
  for (const { place, proximityScore } of topCandidates.slice(0, 3)) {
    const toWaypoint = await getRoute(originalRoute.start, place.coordinates);
    const fromWaypoint = await getRoute(place.coordinates, originalRoute.end);

    const detourDistance =
      toWaypoint.distance + fromWaypoint.distance - originalRoute.distance;

    console.log(`${place.name}: +${detourDistance}m (근접도: ${proximityScore.toFixed(1)})`);
  }
}

// ========================
// 실행 (주석 처리됨)
// ========================

// 실제 실행하려면 아래 주석을 해제하세요
// example1();
// example2();
// example3();
// example4();
// example5();
