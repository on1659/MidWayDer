/**
 * POST /api/seed-places - 매장 데이터 시드 엔드포인트
 *
 * Naver Local Search API에서 매장 데이터를 검색하여 DB에 저장합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { seedPlacesRequestSchema } from '@/lib/validation/schemas';
import { searchPlacesByRegion } from '@/lib/naver-maps/search';
import { prisma } from '@/lib/db/prisma';
import { ApiErrorCode, ApiErrorMessage } from '@/types/api';
import type { SeedPlacesResponse } from '@/types/api';
import type { Place } from '@/types/location';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. 요청 본문 파싱
    const body = await request.json();

    // 2. Zod 입력 검증
    const parseResult = seedPlacesRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const response: SeedPlacesResponse = {
        success: false,
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: ApiErrorMessage[ApiErrorCode.VALIDATION_ERROR],
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { categories, cities, clearExisting } = parseResult.data;

    // 3. 기존 데이터 삭제 (요청 시)
    if (clearExisting) {
      await prisma.$executeRaw`DELETE FROM "Place" WHERE category = ANY(${categories}::text[])`;
      console.log(`[Seed] Cleared existing places for categories: ${categories.join(', ')}`);
    }

    // 4. 카테고리 x 도시 조합으로 검색 및 DB 저장
    const breakdown: Record<string, number> = {};
    let totalCreated = 0;

    for (const category of categories) {
      let categoryCount = 0;

      for (const city of cities) {
        try {
          console.log(`[Seed] Searching: ${category} in ${city}...`);
          const places = await searchPlacesByRegion(category, city, 100);

          if (places.length === 0) {
            console.log(`[Seed] No results for ${category} in ${city}`);
            continue;
          }

          // DB 저장 (INSERT ... ON CONFLICT으로 중복 방지)
          const inserted = await insertPlaces(places, category);
          categoryCount += inserted;

          console.log(`[Seed] Inserted ${inserted} places for ${category} in ${city}`);
        } catch (error) {
          console.error(`[Seed] Error searching ${category} in ${city}:`, error);
          // 개별 실패는 무시하고 계속 진행
        }
      }

      breakdown[category] = categoryCount;
      totalCreated += categoryCount;
    }

    const response: SeedPlacesResponse = {
      success: true,
      data: {
        placesCreated: totalCreated,
        breakdown,
        duration: Date.now() - startTime,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API /seed-places] Unexpected error:', error);

    const response: SeedPlacesResponse = {
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_ERROR,
        message: ApiErrorMessage[ApiErrorCode.INTERNAL_ERROR],
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * 간단한 CUID 호환 ID 생성
 */
function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `c${timestamp}${random}`;
}

/**
 * Place 배열을 DB에 삽입 (중복 방지)
 *
 * INSERT ... ON CONFLICT (name, category, address) DO NOTHING
 */
async function insertPlaces(places: Place[], category: string): Promise<number> {
  let insertedCount = 0;

  for (const place of places) {
    try {
      // Raw SQL로 PostGIS geography 포인트 삽입
      // ON CONFLICT: name + category + address 유니크 제약 조건
      const id = generateCuid();
      const result = await prisma.$executeRaw`
        INSERT INTO "Place" (id, name, category, address, "roadAddress", phone, coordinates, "createdAt", "updatedAt")
        VALUES (
          ${id},
          ${place.name},
          ${category},
          ${place.address},
          ${place.roadAddress ?? null},
          ${place.phone ?? null},
          ST_SetSRID(ST_MakePoint(${place.coordinates.lng}, ${place.coordinates.lat}), 4326)::geography,
          NOW(),
          NOW()
        )
        ON CONFLICT (name, category, address) DO NOTHING
      `;

      if (result > 0) {
        insertedCount++;
      }
    } catch (error) {
      // 개별 삽입 실패는 무시 (중복 등)
      console.warn(`[Seed] Failed to insert ${place.name}:`, error);
    }
  }

  return insertedCount;
}
