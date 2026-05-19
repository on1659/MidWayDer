# MidWayDer Ship-Ready Spec

Date: 2026-05-06
Owner: Codex release council

## Release Definition

MidWayDer is ship-ready when a user can open the app, understand the route waypoint search flow within 30 seconds, complete a search on mobile and desktop, select a result, and recover from loading, empty, error, slow-network, and offline states without hidden admin data or privacy/support gaps.

## Acceptance Criteria

### Core UX

- First screen exposes one clear path: start, destination, category, search.
- Search button is disabled until required inputs are present.
- Search states are explicit in Korean: loading, success, no results, error, slow network, offline.
- Results show place name, address, extra distance, extra time, and recommendation score.
- Selecting a result updates the map and keeps the same information available in the list.
- Mobile search entry, result sheet, install banner, and map controls do not overlap.
- External map/navigation, share, retry, and edit-search paths are reachable.

### Accessibility

- Inputs have accessible labels and valid combobox relationships.
- Mobile search overlay is a modal dialog with `aria-modal`, close control, focus trap, and focus return.
- Touch targets are at least 44px.
- Browser zoom is not disabled.
- Result changes are announced through live regions.
- Selected state is not communicated by color alone.

### Privacy, Support, and Policy

- `/privacy` explains location, routes, saved data, recent searches, session cookies, analytics, logs, feedback, push subscriptions, retention, third parties, deletion, and contact.
- `/support` provides a direct support/privacy request email and expected response path.
- Public pages do not expose admin or telemetry data.
- Admin pages and admin data APIs require explicit admin auth; missing admin password denies access.
- `/robots.txt` disallows admin and API crawling, but access control is enforced in code.

### PWA and Store Metadata

- Manifest is valid and includes `id`, `lang`, app names, description, colors, icons, screenshots, shortcuts, and scope.
- Icons include SVG, 192 PNG, 512 PNG, Apple touch icon, and dedicated maskable icon entries.
- Service worker caches app shell/offline assets and excludes API and map tile requests.
- Offline page is Korean, safe-area aware, and has a retry action.
- Install banner respects standalone mode, iOS Safari guidance, 30-day dismissal expiry, and safe area.

### Verification Gates

- `npm run type-check`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run test:prod`
- `npx playwright test tests/e2e/mobile-ui.spec.ts --project=mobile-chrome --reporter=list`
- `npx playwright test tests/e2e/mobile-visual.spec.ts --project=mobile-chrome --reporter=list`
- `npx playwright test tests/e2e/offline.spec.ts --project=mobile-chrome --reporter=list`
- `npx playwright test tests/e2e/release-readiness.spec.ts --reporter=list`

## Native Store Caveat

This spec makes the web/PWA app release-ready. Apple App Store or Google Play submission still requires a native wrapper or TWA/Capacitor project, bundle identifier, permission strings, store screenshots, age rating, data safety/privacy nutrition forms, developer account, and production support contact verification.
