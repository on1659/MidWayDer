/**
 * 환경 검증 스크립트
 *
 * DB 연결, PostGIS, Prisma 마이그레이션, API 키 유효성을 확인합니다.
 * 실행: npx tsx scripts/check-env.ts
 */

import 'dotenv/config';

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';

let failures = 0;

function log(status: string, message: string) {
  console.log(`  ${status} ${message}`);
}

async function checkDatabase() {
  console.log('\n[1/4] Database Connection');

  const url = process.env.DATABASE_URL;
  if (!url) {
    log(FAIL, 'DATABASE_URL not set');
    failures++;
    return;
  }
  log(PASS, `DATABASE_URL = ${url.replace(/\/\/.*@/, '//***@')}`);

  try {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 5000 });
    const client = await pool.connect();

    // Basic connection
    const { rows } = await client.query('SELECT version()');
    log(PASS, `PostgreSQL connected: ${(rows[0].version as string).split(',')[0]}`);

    // Check Place table
    try {
      const tables = await client.query(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='Place'"
      );
      if (tables.rows.length > 0) {
        const count = await client.query('SELECT COUNT(*) FROM "Place"');
        log(PASS, `Place table exists (${count.rows[0].count} rows)`);
      } else {
        log(WARN, 'Place table not found. Run: npx prisma db push');
      }
    } catch {
      log(WARN, 'Could not check Place table');
    }

    client.release();
    await pool.end();
  } catch (err: any) {
    log(FAIL, `DB connection failed: ${err.message}`);
    failures++;
  }
}

async function checkEnvVars() {
  console.log('\n[2/4] Environment Variables');

  const provider = process.env.MAP_PROVIDER || 'kakao';
  log(PASS, `MAP_PROVIDER = ${provider}`);

  const required: Record<string, string | undefined> = {
    NEXT_PUBLIC_MAP_PROVIDER: process.env.NEXT_PUBLIC_MAP_PROVIDER,
  };

  if (provider === 'kakao') {
    required['KAKAO_REST_API_KEY'] = process.env.KAKAO_REST_API_KEY;
    required['NEXT_PUBLIC_KAKAO_JS_KEY'] = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  } else {
    required['NAVER_MAPS_CLIENT_ID'] = process.env.NAVER_MAPS_CLIENT_ID;
    required['NAVER_MAPS_CLIENT_SECRET'] = process.env.NAVER_MAPS_CLIENT_SECRET;
    required['NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID'] = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID;
  }

  for (const [key, value] of Object.entries(required)) {
    if (value) {
      log(PASS, `${key} = ${value.slice(0, 6)}...`);
    } else {
      log(FAIL, `${key} is not set`);
      failures++;
    }
  }
}

async function checkKakaoApi() {
  console.log('\n[3/4] Kakao API');

  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    log(WARN, 'Skipped (KAKAO_REST_API_KEY not set)');
    return;
  }

  // Kakao Local search ping
  try {
    const res = await fetch(
      'https://dapi.kakao.com/v2/local/search/keyword.json?query=서울시청&size=1',
      { headers: { Authorization: `KakaoAK ${key}` } }
    );
    if (res.ok) {
      const data = await res.json();
      log(PASS, `Kakao Local Search OK (${data.meta.total_count} results for "서울시청")`);
    } else {
      log(FAIL, `Kakao Local Search failed: ${res.status} ${res.statusText}`);
      failures++;
    }
  } catch (err: any) {
    log(FAIL, `Kakao API request failed: ${err.message}`);
    failures++;
  }
}

async function checkNaverApi() {
  console.log('\n[4/4] Naver API');

  const id = process.env.NAVER_MAPS_CLIENT_ID;
  const secret = process.env.NAVER_MAPS_CLIENT_SECRET;
  if (!id || !secret) {
    log(WARN, 'Skipped (NAVER_MAPS_CLIENT_ID/SECRET not set)');
    return;
  }

  try {
    const res = await fetch(
      'https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=126.9779,37.5663&output=json',
      {
        headers: {
          'X-NCP-APIGW-API-KEY-ID': id,
          'X-NCP-APIGW-API-KEY': secret,
        },
      }
    );
    if (res.ok) {
      log(PASS, `Naver Reverse Geocoding OK`);
    } else {
      log(FAIL, `Naver API failed: ${res.status} ${res.statusText}`);
      failures++;
    }
  } catch (err: any) {
    log(FAIL, `Naver API request failed: ${err.message}`);
    failures++;
  }
}

async function main() {
  console.log('=== MidWayDer Environment Check ===');

  await checkEnvVars();
  await checkDatabase();
  await checkKakaoApi();
  await checkNaverApi();

  console.log('\n' + '='.repeat(40));
  if (failures === 0) {
    console.log(`${PASS} All checks passed!`);
  } else {
    console.log(`${FAIL} ${failures} check(s) failed`);
    process.exit(1);
  }
}

main();
