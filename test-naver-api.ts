/**
 * Naver Maps API 테스트 스크립트
 *
 * 환경 변수 설정 필요:
 * - NAVER_MAPS_CLIENT_ID
 * - NAVER_MAPS_CLIENT_SECRET
 *
 * 실행 방법:
 * ```bash
 * # 환경 변수 설정
 * export NAVER_MAPS_CLIENT_ID="your-client-id"
 * export NAVER_MAPS_CLIENT_SECRET="your-client-secret"
 *
 * # 스크립트 실행
 * npx tsx test-naver-api.ts
 * ```
 */

import { getRoute, searchPlaces, reverseGeocode } from './src/lib/naver-maps';

// ========================
// 테스트 좌표
// ========================

const SEOUL_CITY_HALL = { lat: 37.5663, lng: 126.9779 }; // 서울시청
const GANGNAM_STATION = { lat: 37.4979, lng: 127.0276 }; // 강남역

// ========================
// 테스트 함수
// ========================

async function testDirectionsApi() {
  console.log('\n========================================');
  console.log('1. Directions API 테스트');
  console.log('========================================\n');

  try {
    console.log('경로 조회 중: 서울시청 → 강남역');
    const route = await getRoute(SEOUL_CITY_HALL, GANGNAM_STATION);

    console.log('✅ 성공!');
    console.log(`  - 거리: ${(route.distance / 1000).toFixed(2)} km`);
    console.log(`  - 소요시간: ${Math.round(route.duration / 60)} 분`);
    console.log(`  - 경로 포인트 수: ${route.path.length}`);
  } catch (error: any) {
    console.error('❌ 실패:', error.message);
    if (error.details) {
      console.error('  상세:', error.details);
    }
  }
}

async function testLocalSearchApi() {
  console.log('\n========================================');
  console.log('2. Local Search API 테스트');
  console.log('========================================\n');

  try {
    console.log('매장 검색 중: "다이소"');
    const places = await searchPlaces('다이소', {
      maxResults: 10,
      center: SEOUL_CITY_HALL,
      radius: 5000, // 5km
    });

    console.log(`✅ 성공! (총 ${places.length}개 매장 검색)`);
    if (places.length > 0) {
      console.log(`  첫 번째 매장: ${places[0].name}`);
      console.log(`  주소: ${places[0].address}`);
      console.log(`  좌표: (${places[0].coordinates.lat}, ${places[0].coordinates.lng})`);
    }
  } catch (error: any) {
    console.error('❌ 실패:', error.message);
    if (error.details) {
      console.error('  상세:', error.details);
    }
  }
}

async function testReverseGeocodeApi() {
  console.log('\n========================================');
  console.log('3. Reverse Geocoding API 테스트');
  console.log('========================================\n');

  try {
    console.log('주소 변환 중: 서울시청 좌표');
    const address = await reverseGeocode(SEOUL_CITY_HALL);

    console.log('✅ 성공!');
    console.log(`  주소: ${address}`);
  } catch (error: any) {
    console.error('❌ 실패:', error.message);
    if (error.details) {
      console.error('  상세:', error.details);
    }
  }
}

// ========================
// 메인 함수
// ========================

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   Naver Maps API 통합 테스트 시작    ║');
  console.log('╚════════════════════════════════════════╝');

  // 환경 변수 검증
  if (!process.env.NAVER_MAPS_CLIENT_ID || !process.env.NAVER_MAPS_CLIENT_SECRET) {
    console.error('\n❌ 환경 변수가 설정되지 않았습니다!');
    console.error('다음 환경 변수를 설정해주세요:');
    console.error('  - NAVER_MAPS_CLIENT_ID');
    console.error('  - NAVER_MAPS_CLIENT_SECRET');
    process.exit(1);
  }

  console.log('✅ 환경 변수 확인 완료\n');

  // 테스트 실행
  await testDirectionsApi();
  await testLocalSearchApi();
  await testReverseGeocodeApi();

  console.log('\n========================================');
  console.log('✨ 모든 테스트 완료!');
  console.log('========================================\n');
}

// 실행
main().catch((error) => {
  console.error('\n💥 치명적 오류 발생:', error);
  process.exit(1);
});
