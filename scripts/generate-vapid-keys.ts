#!/usr/bin/env tsx
/**
 * VAPID 키 생성 스크립트
 *
 * 사용법: npx tsx scripts/generate-vapid-keys.ts
 *
 * 생성된 키를 .env.local 파일에 추가하세요:
 * VAPID_PUBLIC_KEY=...
 * VAPID_PRIVATE_KEY=...
 * VAPID_SUBJECT=mailto:your-email@example.com
 */

import webpush from 'web-push';

console.log('🔐 VAPID 키 생성 중...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('=== VAPID Keys ===\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('\n📧 VAPID_SUBJECT는 연락처 이메일로 설정하세요:');
console.log('VAPID_SUBJECT=mailto:your-email@example.com');
console.log('\n💡 위 내용을 .env.local 파일에 추가하세요.');
