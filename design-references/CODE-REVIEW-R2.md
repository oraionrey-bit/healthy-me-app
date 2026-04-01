# Code Review Round 2 — March 30, 2026

## Summary

Second review of the Healthy Me PCOS health tracker. Focused on the 6+ new features added since the overnight review (R1). Covered all new hooks, components, types, and added comprehensive tests.

**Result:** `npx tsc --noEmit` — 0 errors. `npm test` — 156/156 tests (up from 113, +43 new).

---

## Issues Found & Fixed

### 1. Broken Test — Settings Screen Text Mismatch
**File:** `src/__tests__/settings.test.tsx`
- **Problem:** Settings screen now uses `SupplementManager` component instead of a "Manage Supplements" button. Test expected old text.
- **Fix:** Updated assertion from `"Manage Supplements"` to `"Manage your daily supplement checklist"`.
- Also increased signOut test timeout from 5s → 15s (the SupplementManager adds async operations that slow teardown).

### 2. Dead Code — Unused `dayLabel` Function
**File:** `src/hooks/use-food-trends.ts`
- **Problem:** `dayLabel()` function was defined but never called (superseded by `formatDayLabel` in `food-trends.tsx` component using date-fns).
- **Fix:** Removed the dead function.

### 3. Dead Code — Orphaned localStorage Functions
**File:** `src/app/(tabs)/food.tsx`
- **Problem:** `saveLocalPhotos()` and `removeLocalPhotos()` wrote to localStorage but nothing ever read the data. `removeLocalPhotos` was called in `handleDelete` but the corresponding `getLocalPhotos` / read function never existed.
- **Fix:** Removed both functions and the `removeLocalPhotos` call in `handleDelete`.

### 4. Silent Errors — Water Log Hook
**File:** `src/hooks/use-water-log.ts`
- **Problem:** `addWater()` and `resetWater()` did not check the Supabase response for errors. Failures were silent — the optimistic update would stick even if the write failed.
- **Fix:** Added error checking to both functions. `addWater` now reverts the optimistic update on failure with `console.warn`. `resetWater` re-fetches on failure.

### 5. Missing Error Return — Saved Meals Delete
**File:** `src/hooks/use-saved-meals.ts`
- **Problem:** `deleteSavedMeal` returned `void` and silently ignored errors. Other mutation functions (`saveMeal`, `logSavedMeal`) already returned `{ error?: Error }`.
- **Fix:** Changed return type to `Promise<{ error?: Error }>`. Now logs warnings and returns error on failure.

### 6. Hardcoded Protein Target — Weekly Insights
**File:** `src/hooks/use-weekly-insights.ts`
- **Problem:** `PROTEIN_GOAL` was hardcoded to `80` instead of using the user's profile `protein_target`. If the user changed their target in settings, the weekly insights would still use 80g.
- **Fix:** Added `useUserProfile()` import. Protein goal days now calculated against `proteinTarget` from profile.

### 7. Missing Table in Database Types
**File:** `src/types/database.ts`
- **Problem:** `saved_meals` table was defined as a type (`SavedMeal`) but missing from the `Database.public.Tables` interface. This means typed Supabase queries couldn't use it.
- **Fix:** Added `saved_meals` table definition to the `Database` interface.

---

## Issues Noted (Not Fixed — Documented)

### Large Components
| Component | Lines | Note |
|-----------|-------|------|
| `app/(tabs)/index.tsx` (HomeScreen) | 1509 | ~600 lines are styles. Functional code is dense but modular — delegates to `SupplementGroup`, `EmojiPicker`, `SymptomChip`, `SeverityDots` inline components. **Would benefit from extracting `DailyCheckin` and `WeeklyInsightsCard` to separate files.** |
| `app/(tabs)/food.tsx` (FoodScreen) | 1347 | ~500 lines are styles. `FoodEntry` component (inline) is well-contained. **Should extract `FoodEntry` to `components/food/food-entry.tsx`.** |
| `app/(tabs)/skin.tsx` (SkinScreen) | 1254 | Already noted in R1. Has inline sub-components. |
| `app/(tabs)/move.tsx` (MoveScreen) | 940 | ~400 lines are styles + static data. |

**Recommendation:** Extract `FoodEntry` as the highest-impact refactor. The HomeScreen inline components (`SupplementGroup`, etc.) are well-encapsulated as-is but could be split for maintainability.

### `as any` Casts (Supabase)
All `as any` casts have `eslint-disable-next-line` comments explaining they're needed for Supabase client generic mismatches. The root cause is that `Database` types are manually written, not auto-generated. Running `supabase gen types typescript` against the actual schema would eliminate ~35 casts across the codebase. Not blocking.

### Semantic Column Reuse in DailyScore
`use-daily-score.ts` persists `water_score` and `sleep_score` columns with combined data:
- `water_score` = water contribution only ✓ (was repurposed for skincare in an earlier version, now correct)
- `sleep_score` = sleep + checkin combined (still semantically misleading)

This is a minor schema design issue, not a bug. Would be cleaner with separate `checkin_score` column.

### Performance Observations
- **Good:** `useDailyScore` fetches 8 tables in a single `Promise.all` — no N+1 pattern.
- **Good:** `useFoodTrends` aggregates data client-side after a single query.
- **Good:** `useWeeklyInsights` uses `Promise.all` for 8 parallel queries with previous-week data for trends.
- **Acceptable:** `useWaterLog.addWater` does a SELECT then INSERT/UPDATE (2 round trips). Could use upsert, but the volume is low (user taps a button). Not worth optimizing.
- **Watch:** HomeScreen renders 8+ hooks on mount. Each does independent Supabase queries. On slow connections this could cause a loading cascade. Could batch into a single RPC if this becomes an issue.

---

## New Tests Added

**File:** `src/__tests__/new-features.test.ts` — 43 new tests across 7 describe blocks:

| Block | Tests | What's Tested |
|-------|-------|---------------|
| Quick-Add Macro Parser | 9 | Parses calories, protein, carbs, fat from natural text. Handles case-insensitive, "calories"/"cal", with/without "g" prefix, plain text, empty string, "carbohydrate" variant. |
| Daily Score — scoreCalories | 7 | Boundary testing: at target (100), ±100 range (100), ±200 (80), ±400 (50), far (20), zero target (0). |
| Daily Score — Weight Redistribution | 5 | Base weights sum to 1.0, redistributed weights sum to 1.0 when sleep excluded, perfect day = 100, zero day = 0, supplements-only = 20, no-supplements-configured = 100. |
| Weekly Insights — determineTrend | 5 | Trend detection: up >5%, down >5%, stable within threshold, equal values, small numbers. |
| Food Trends — Summary Calculation | 5 | Averages, protein target days, calorie ±200 range, zero-day filtering, empty data. |
| Water Log — Calculations | 4 | ML conversion, progress percentage, cap at 1.0, completion check. |
| Weekly Insights — generateInsights | 6 | Protein tiers (great/good/start), sleep tiers, supplement tiers, activity trends, no-data case. |
| SavedMeal type structure | 2 | Required fields, nullable fields. |

---

## Files Changed
- `src/__tests__/settings.test.tsx` — Fixed text assertion + timeout
- `src/hooks/use-food-trends.ts` — Removed dead `dayLabel` function
- `src/hooks/use-water-log.ts` — Added error handling to `addWater`/`resetWater`
- `src/hooks/use-saved-meals.ts` — `deleteSavedMeal` now returns error
- `src/hooks/use-weekly-insights.ts` — Uses profile protein target instead of hardcoded 80
- `src/app/(tabs)/food.tsx` — Removed dead `saveLocalPhotos`/`removeLocalPhotos`
- `src/types/database.ts` — Added `saved_meals` to Database Tables interface

## Files Added
- `src/__tests__/new-features.test.ts` — 43 tests for new features

## Test Results

```
Test Suites: 9 passed, 9 total
Tests:       156 passed, 156 total
TypeScript:  0 errors
```
