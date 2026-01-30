/**
 * API 스모크 테스트
 *
 * dev 서버가 실행 중일 때 API 엔드포인트를 검증합니다.
 * 실행: npx tsx scripts/smoke-test.ts
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';

let failures = 0;

function log(status: string, msg: string) {
  console.log(`  ${status} ${msg}`);
}

async function testPageLoad() {
  console.log('\n[1/4] Page Load');
  try {
    const res = await fetch(BASE);
    if (res.ok) {
      const html = await res.text();
      if (html.includes('MidWayDer')) {
        log(PASS, `GET / → ${res.status} (contains "MidWayDer")`);
      } else {
        log(FAIL, 'Page loaded but missing "MidWayDer" text');
        failures++;
      }
    } else {
      log(FAIL, `GET / → ${res.status}`);
      failures++;
    }
  } catch (err: any) {
    log(FAIL, `Cannot connect to ${BASE}: ${err.message}`);
    failures++;
  }
}

async function testSearchValidation() {
  console.log('\n[2/4] POST /api/search - Validation');
  try {
    // Empty body → should return 400
    const res = await fetch(`${BASE}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.status === 400) {
      const data = await res.json();
      if (data.success === false) {
        log(PASS, `Empty body → 400 (validation error)`);
      } else {
        log(FAIL, 'Expected success=false');
        failures++;
      }
    } else {
      log(FAIL, `Expected 400, got ${res.status}`);
      failures++;
    }
  } catch (err: any) {
    log(FAIL, `Request failed: ${err.message}`);
    failures++;
  }
}

async function testSearchEndpoint() {
  console.log('\n[3/4] POST /api/search - Real Search');
  try {
    const res = await fetch(`${BASE}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: { address: '서울시청' },
        end: { address: '강남역' },
        category: '다이소',
        options: { maxResults: 3 },
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      log(PASS, `Search OK: ${data.data.results.length} results, ${data.data.apiCallsUsed} API calls, ${data.data.duration}ms`);
      if (data.data.results.length > 0) {
        const first = data.data.results[0];
        log(PASS, `Top result: ${first.place.name} (score: ${first.finalScore.toFixed(1)})`);
      }
    } else {
      log(FAIL, `Search failed: ${data.error?.message || res.status}`);
      failures++;
    }
  } catch (err: any) {
    log(FAIL, `Request failed: ${err.message}`);
    failures++;
  }
}

async function testDirectionsEndpoint() {
  console.log('\n[4/4] POST /api/directions');
  try {
    const res = await fetch(`${BASE}/api/directions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: { lat: 37.5663, lng: 126.9779 },
        end: { lat: 37.4979, lng: 127.0276 },
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      log(PASS, `Directions OK: ${data.data.distance}m, ${data.data.duration}s`);
    } else {
      log(FAIL, `Directions failed: ${data.error?.message || res.status}`);
      failures++;
    }
  } catch (err: any) {
    log(FAIL, `Request failed: ${err.message}`);
    failures++;
  }
}

async function main() {
  console.log(`=== MidWayDer Smoke Test (${BASE}) ===`);

  await testPageLoad();
  await testSearchValidation();
  await testDirectionsEndpoint();
  await testSearchEndpoint();

  console.log('\n' + '='.repeat(40));
  if (failures === 0) {
    console.log(`${PASS} All smoke tests passed!`);
  } else {
    console.log(`${FAIL} ${failures} test(s) failed`);
    process.exit(1);
  }
}

main();
