# Code Review — March 30, 2026

## Summary

Comprehensive code review of the Healthy Me PCOS health tracker. Reviewed all hooks (19 files), components (28 files), utilities, types, constants, and tests. Applied fixes across 8 files, deleted 1 dead file, added 4 new files.

**Result:** `npx tsc --noEmit` passes with 0 errors. `npm test` passes with 113/113 tests (up from 104, 9 new).

---

## Issues Found & Fixed

### 1. Test Failures — Missing Supabase Mock Methods
**Files:** `src/__tests__/test-utils.tsx`
- **Problem:** `supabase.channel()` was not mocked, causing 27 test failures in food.test.tsx and skin.test.tsx. Both screens use `AskOraionModal` → `useChatTunnel` → `supabase.channel('chat-responses')`.
- **Fix:** Added `channel` mock to supabase mock object (returns chainable `.on()` / `.subscribe()` / `.unsubscribe()`).
- Also added missing `not()` filter method to the query builder mock.
- Added missing table entries to mock data: `oura_daily`, `oura_workouts`, `chat_messages`, `symptoms`.

### 2. Dead Code — Unused Hook
**Files:** `src/hooks/use-exercises.ts` (DELETED)
- **Problem:** `use-exercises.ts` was the original exercise hook, superseded by `use-exercise-log.ts`. Zero imports anywhere in the codebase.
- **Fix:** Deleted the file.

### 3. Dead Code — Unused localStorage Utilities
**Files:** `src/utils/storage.ts`
- **Problem:** `FoodEntry` interface, `getStorage()`, `getFoodEntries()`, `saveFoodEntry()`, `deleteFoodEntry()`, `updateFoodEntry()`, `generateId()`, `getChecklist()`, `saveChecklist()`, and `ChecklistState` interface were leftover from pre-Supabase days. Zero imports anywhere.
- **Fix:** Removed all dead code (~60 lines).

### 4. DRY Violation — Duplicate Week Date Calculation
**Files:** `src/hooks/use-exercise-log.ts`, `src/hooks/use-oura-workouts.ts`, `src/utils/storage.ts`
- **Problem:** Both `useWeeklyExerciseSummary` and `useWeeklyOuraWorkouts` had identical 8-line blocks calculating Monday/Sunday of the current week using raw Date math instead of using `toDateKey()`.
- **Fix:** Extracted `getCurrentWeekRange()` → `{ mondayKey, sundayKey }` utility in `storage.ts`. Both hooks now import and use it.

### 5. Performance — Duplicate Supabase Query
**Files:** `src/hooks/use-health-trends.ts`
- **Problem:** The `symptoms` table was queried twice in `Promise.all` — once with `.not('mood', 'is', null)` for mood/energy data, and once without filter for symptom frequency. Same data, two network round-trips.
- **Fix:** Merged into a single query. Filter for mood entries is now done in-memory with `.filter(r => r.mood != null)`.

### 6. Silent Error Handling
**Files:** `src/hooks/use-supplements.ts`
- **Problem:** `fetchTodaysLogs` had `catch {}` with no logging — a completely silent failure making debugging impossible.
- **Fix:** Added `console.warn('Failed to fetch supplement logs:', err)`.

### 7. Missing Test Coverage
**New files:**
- `src/__tests__/health.test.tsx` — 3 tests for the Health tab (title, time range selector, Ask Oraion FAB)
- `src/__tests__/utils.test.ts` — 6 tests for utility functions (`toDateKey`, `formatDate`, `getCurrentWeekRange`)
- `src/__tests__/__mocks__/react-native-gifted-charts.ts` — Mock for chart library
- `src/__tests__/__mocks__/react-native-svg.ts` — Mock for SVG components
- `jest.config.js` — Added module name mappers for gifted-charts and react-native-svg

---

## Issues Noted (Not Fixed)

### Large Components
- `src/app/(tabs)/food.tsx` — ~500 lines. The form section could be extracted to a `FoodLogForm` component.
- `src/app/(tabs)/skin.tsx` — ~700 lines. Already has extracted sub-components (`SeverityPicker`, `RoutineChecklist`, `TriggerWatchlist`, `ProductRow`), but the main `SkinScreen` still does a lot. Could extract journal form and products tab into separate files.
- `src/app/(tabs)/move.tsx` — ~580 lines. Static data + styles are most of it. The exercise form could be a separate component.
- `src/app/(tabs)/index.tsx` (HomeScreen) — estimated 600+ lines. Already delegates to sub-components but orchestrates many hooks.

**Recommendation:** These aren't urgent — they work fine and have decent internal organization with inline sub-components. Splitting would help if these screens grow further.

### `as any` Casts on Supabase
Multiple hooks use `(supabase.from('table') as any)` for insert/update operations. These all have `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch` comments. This is a known issue with Supabase TypeScript client when using placeholder Database types — the `Database` interface in `database.ts` is manually written, not auto-generated from the actual schema. Running `supabase gen types typescript` and using the generated types with `SupabaseClient<Database>` would eliminate most of these casts.

### Semantic Mismatch in DailyScore
`use-daily-score.ts` repurposes `water_score` column for skincare data and `sleep_score` for combined check-in + weight. This works but is semantically misleading. If the schema ever gets audited or new features use these columns by name, it could cause confusion.

### console.warn/error in Production
13 instances of `console.warn`/`console.error` across hooks. These are all in error catch blocks (not debug logging), so they're appropriate — but a centralized error reporting service would be better long-term.

---

## Test Results After Changes

```
Test Suites: 8 passed, 8 total
Tests:       113 passed, 113 total (was 77/104)
TypeScript:  0 errors
```

## Files Changed
- `src/__tests__/test-utils.tsx` — Fixed supabase mock (channel, not, table data)
- `src/hooks/use-exercise-log.ts` — Uses shared `getCurrentWeekRange()`
- `src/hooks/use-oura-workouts.ts` — Uses shared `getCurrentWeekRange()`
- `src/hooks/use-health-trends.ts` — Single symptoms query instead of two
- `src/hooks/use-supplements.ts` — Error logging instead of silent catch
- `src/utils/storage.ts` — Removed dead code, added `getCurrentWeekRange()`
- `jest.config.js` — Added chart/SVG mock mappings

## Files Added
- `src/__tests__/health.test.tsx` — Health tab tests
- `src/__tests__/utils.test.ts` — Utility function tests
- `src/__tests__/__mocks__/react-native-gifted-charts.ts`
- `src/__tests__/__mocks__/react-native-svg.ts`

## Files Deleted
- `src/hooks/use-exercises.ts` — Dead code (superseded by use-exercise-log.ts)
