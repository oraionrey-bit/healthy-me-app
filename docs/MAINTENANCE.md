# Healthy Me Maintenance Map

This document captures the current strategic maintenance inventory for `app.withluna.dev` / Healthy Me.

Purpose: make cleanup safer by recording what is known to be active, what looks generated or historical, and which refactors should be done in small reversible parts. Do not use this file as permission to delete anything without a focused follow-up branch and verification.

## Safety rules for refactors

- Work on a dedicated branch, never directly on `main`.
- Keep each PR small and reversible.
- Do not mix dependency upgrades, UI refactors, Supabase/schema changes, and deploy changes in the same PR.
- Before deleting a file, prove it is not imported, dynamically referenced, routed, tested, configured, or used by deployment.
- Prefer deprecating or documenting a candidate before removing it.
- Do not modify Supabase schema/RLS/storage destructively during general cleanup. Schema changes need migrations, local/staging validation, backup/rollback notes, and their own branch.
- Preserve product/design references unless the owner explicitly approves removal.

## Current baseline

As of this audit:

- TypeScript check: `npm run typecheck` passes.
- Unit suite: `npm run test:unit -- --runInBand` passes.
- Unit coverage observed: 20 test suites, 328 tests, 8 snapshots.
- Working tree was clean before this maintenance note was added.

Known warnings during unit tests:

- Node `punycode` deprecation warning.
- React Native Web `props.pointerEvents` deprecation warning.
- Multiple React test `act(...)` warnings around hook/component updates.
- Jest no longer needs `--forceExit`; a focused maintenance pass removed that flag from unit scripts after verifying the suite exits cleanly without it.

## Active architecture map

### App shell and routing

- `package.json` uses `expo-router/entry` as the app entrypoint.
- `src/app/_layout.tsx` is the root layout and provider setup:
  - loads local pixel fonts from `assets/fonts/`;
  - wraps the app in `AuthProvider`;
  - creates the React Query `QueryClientProvider`;
  - declares root stack routes.
- `src/app/index.tsx` handles auth/onboarding routing:
  - unauthenticated users go to `/(auth)/login`;
  - users who still need onboarding go to `/(onboarding)/welcome`;
  - onboarded users go to `/(tabs)`.
- `src/app/(tabs)/_layout.tsx` defines the primary tab shell:
  - Home: `src/app/(tabs)/index.tsx`
  - Food: `src/app/(tabs)/food.tsx`
  - Move: `src/app/(tabs)/move.tsx`
  - Skin: `src/app/(tabs)/skin.tsx`
  - Health: `src/app/(tabs)/health.tsx`

### Data and auth

- `src/lib/supabase.ts` initializes the Supabase client from `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- `src/lib/supabase.ts` uses localStorage on web and `expo-secure-store` on native.
- `src/lib/auth.tsx` provides magic-link OTP auth/session context.
- `src/types/database.ts` is consumed by the Supabase client and should be treated as the source TypeScript DB contract until regenerated.
- Multiple hooks still use `as any` because generated DB types appear behind current migrations/features; type regeneration is a good medium-risk cleanup candidate.

### Relay and backend integration

- `src/relay/server.js` is the local Node relay for chat/photo/product analysis flows.
- `src/relay/config.js`, `src/relay/routing.js`, `src/relay/status.js`, and `src/relay/start.sh` support relay configuration and LaunchAgent operation.
- Supabase migrations live under `supabase/migrations/001_initial_schema.sql` through `008_food_logs_meal_time.sql`.
- Supabase Edge Functions live under `supabase/functions/`.

### Build, deploy, and tests

- `npm run verify` runs typecheck, unit tests, and the GitHub Pages web build prep.
- `npm run verify:full` adds the local Playwright smoke test.
- `.github/workflows/ci.yml` is the non-deploying CI gate.
- `.github/workflows/deploy-pages.yml` is the manual GitHub Pages deploy path.
- `docs/DEPLOYMENT.md` documents GitHub Pages as the current canonical production route.
- `npm run test:e2e:prod:auth` is intentionally separate from normal PR smoke tests because it uses production auth/session setup.

## Generated, local, or historical artifact candidates

Treat these as cleanup candidates, not as immediate deletion targets.

### Ignored local/generated paths

These are already ignored and should not be reviewed as source changes:

- `node_modules/`
- `dist/`
- `.expo/`
- `test-results/`
- `playwright-report/`
- `blob-report/`
- `e2e/.auth/`
- `.env` and `.env*.local`
- `.DS_Store`

### Tracked but likely generated or historical

These require separate confirmation before removal:

- `docs/_expo/static/js/web/*.js`
- `docs/assets/assets/...`
- `docs/index.html`
- `docs/manifest.json`
- `docs/metadata.json`
- `docs/favicon.ico`
- `docs/_redirects`
- `netlify.toml`
- `.netlify/state.json`
- `.netlify/netlify.toml`
- `BUILD-LOG.md` Netlify references

Notes:

- Current deployment docs say GitHub Pages is canonical and the old Netlify path should not be primary unless explicitly re-enabled.
- `.netlify/netlify.toml` has been observed to contain a machine-specific absolute path from an older workspace. That is a strong cleanup candidate, but removal should be its own tiny PR because it is tracked state.
- The tracked `docs/` static export may be historical deployment output. Do not delete until GitHub Pages workflow and repository Pages source are verified.

## Oversized files to split carefully

These files are large enough that future maintenance should prefer component/service extraction over more inline growth:

- `src/app/(tabs)/skin.tsx`
- `src/app/(tabs)/index.tsx`
- `src/app/(tabs)/food.tsx`
- `src/app/(tabs)/move.tsx`
- `src/hooks/use-export-data.ts`
- `src/hooks/use-skincare.ts`
- `src/relay/server.js`

Safe extraction rule: move one cohesive presentational component or pure helper at a time, run typecheck/unit tests after each slice, and add/adjust tests only for behavior that changes.

## Dormant-code candidates to verify before removal

Targeted searches suggested these have no obvious live imports outside tests/generated bundles, but they must be rechecked before any deletion:

- `src/hooks/use-pantry.ts`
- `src/hooks/use-saved-meals.ts`
- `src/hooks/use-personal-foods.ts`
- `src/components/food/meal-suggestions.tsx`
- `src/components/food/food-auto-suggest.tsx`

Verification checklist before removal:

1. Search source excluding generated `docs/_expo` bundles.
2. Check route/screen usage and dynamic imports.
3. Check Jest and Playwright tests.
4. Check product intent: pantry/saved meal functionality may be intentionally paused rather than dead.
5. Remove one candidate group per branch, with tests passing after each removal.

## Dependency cleanup candidates

No dependency should be removed solely because source search is quiet. Expo/native packages can be config- or runtime-required.

Packages to audit separately:

- `@expo/ngrok`
- `expo-notifications`
- `expo-linear-gradient`
- `react-native-reanimated`
- `react-native-gesture-handler`
- `react-native-screens`
- `react-native-svg`
- `zustand`

Dependency cleanup checklist:

1. Check static imports.
2. Check `app.json`, Babel/Metro config, Expo Router, navigation, charts, Playwright, scripts, and CI.
3. Remove one dependency group at a time.
4. Run `npm install`/lockfile update only on the cleanup branch.
5. Run `npm run typecheck`, `npm run test:unit`, `npm run build:web:pages`, and smoke tests if UI/runtime dependencies changed.
6. Use `expo install` for Expo-managed package version changes.

## Recommended phased maintenance plan

### Phase 1: Guardrails and documentation

- Keep this maintenance map updated.
- Add or update lightweight docs so future agents do not treat generated/historical artifacts as application source.
- Do not delete tracked artifacts in this phase.

### Phase 2: Test hygiene

- Investigate React `act(...)` warnings with focused tests.
- Investigate Jest open handles with `--detectOpenHandles` or focused teardown checks.
- Keep behavior unchanged; this phase should improve confidence before larger refactors.

### Phase 3: Type safety

- Regenerate or update Supabase database types.
- Replace narrow `as any` table access where the schema is known and tests cover the affected hooks.
- Avoid schema changes in this phase unless explicitly planned.

### Phase 4: Small component extractions

- Start with one oversized tab file.
- Extract pure/presentational components first.
- Avoid changing navigation, persisted data shape, or Supabase queries during extraction.

### Phase 5: Historical deploy artifact cleanup

- Verify current GitHub Pages source and deploy workflow.
- Decide whether tracked `docs/` static export and Netlify state are still needed.
- Remove or archive only after verification, in a separate branch/PR.

### Phase 6: Dependency cleanup

- Audit candidate packages one at a time.
- Do not combine package removals with UI refactors.
- Run full verification and Playwright smoke when runtime/UI packages are touched.

## Research-backed principles used

- Use small reversible PRs and branch isolation for maintenance.
- Sequence low-risk documentation/test hygiene before structural refactors.
- Use TypeScript, unit tests, production-like web builds, and Playwright smoke tests as gates.
- Keep Supabase migrations/environment changes isolated from UI cleanup.
- Treat dependency removal as a verified change, not a search-result cleanup.
- Do not delete tracked generated or historical artifacts until deployment ownership is confirmed.
