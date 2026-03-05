/**
 * Zod 입력 검증 스키마
 *
 * API Routes의 요청 데이터를 검증합니다.
 */

import { z } from 'zod';

// ========================
// 공통 스키마
// ========================

/** 좌표 스키마 */
const coordinatesSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
});

/** 위치 입력 스키마 (주소 또는 좌표) */
const locationSchema = z
  .object({
    address: z.string().min(1).optional(),
    coordinates: coordinatesSchema.optional(),
  })
  .refine((data) => data.address || data.coordinates, {
    message: '주소 또는 좌표 중 하나는 필수입니다.',
  });

// ========================
// POST /api/search
// ========================

/** 경유지 검색 요청 스키마 */
export const searchRequestSchema = z.object({
  start: locationSchema,
  end: locationSchema,
  // 기존 category (선택사항으로 변경)
  category: z.string().min(1, '카테고리를 입력해주세요.').optional(),
  // 새로운 query (category 또는 query 중 하나 필수)
  query: z.string().min(1, '검색어를 입력해주세요.').optional(),
  // 검색 타입 (선택사항, 자동 감지)
  searchType: z.enum(['category', 'keyword']).optional(),
  options: z
    .object({
      maxResults: z.number().int().min(1).max(50).optional(),
      bufferDistance: z.number().min(100).max(10000).optional(),
      maxDetourDistance: z.number().min(500).max(50000).optional(),
    })
    .optional(),
}).refine(
  (data) => data.category || data.query,
  {
    message: 'category 또는 query 중 하나는 필수입니다.',
    path: ['category'],
  }
).refine(
  (data) => {
    const s = data.start.coordinates;
    const e = data.end.coordinates;
    if (!s || !e) return true; // 좌표 미입력 시 주소 기반 — 별도 검증
    return !(s.lat === e.lat && s.lng === e.lng);
  },
  {
    message: '출발지와 도착지가 동일합니다. 다른 위치를 입력해주세요.',
    path: ['end'],
  }
);

export type SearchRequestInput = z.infer<typeof searchRequestSchema>;

// ========================
// POST /api/directions
// ========================

/** 경로 조회 요청 스키마 */
export const directionsRequestSchema = z.object({
  start: coordinatesSchema,
  end: coordinatesSchema,
  option: z.enum(['traoptimal', 'trafast', 'tracomfort']).optional(),
});

export type DirectionsRequestInput = z.infer<typeof directionsRequestSchema>;

// ========================
// POST /api/seed-places
// ========================

/** 매장 데이터 시드 요청 스키마 */
export const seedPlacesRequestSchema = z.object({
  categories: z.array(z.string().min(1)).min(1, '카테고리를 하나 이상 입력해주세요.'),
  cities: z.array(z.string().min(1)).min(1, '도시를 하나 이상 입력해주세요.'),
  clearExisting: z.boolean().optional(),
});

export type SeedPlacesRequestInput = z.infer<typeof seedPlacesRequestSchema>;
