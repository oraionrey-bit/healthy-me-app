# Code Review — 2026-03-28

## ✅ Fixed

### Duplicate Code
1. **`DEFAULT_SUPPLEMENTS` duplicated** in `hooks/use-supplements.ts` and `app/(onboarding)/supplements.tsx` — Extracted to shared `constants/supplements.ts`
2. **`aggregateWeekly` duplicated** across `mood-energy-trend.tsx`, `nutrition-trend.tsx`, `weight-trend.tsx` — Extracted generic version to `utils/chart-helpers.ts`
3. **`chartLabelStyle` duplicated** across same 3 chart components — Extracted to `utils/chart-helpers.ts`

### Dead Code
4. **`getLocalPhotos` function** in `app/(tabs)/food.tsx` — defined but never called. Removed.
5. **`section` style** in `app/(tabs)/index.tsx` — defined but never used. Removed.

### Style Consistency
6. **Chart `summaryText` styles** in `mood-energy-trend.tsx` and `weight-trend.tsx` used raw `fontSize: 10` without `fontFamily`. Fixed to use `Fonts.body` and `FontSizes.bodyXs` from theme.

### Missing Dependencies
7. **`isOnboarded` missing** from `fetchSupplements` dependency array in `use-supplements.ts`. Added.

---

## 📝 Findings NOT Fixed (Document-Only)

### TypeScript `any` Casts (13 occurrences)
All marked with `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch`. These exist because the `Database` types in `types/database.ts` are placeholder types that don't perfectly match what `supabase.from()` returns. The `as any` casts are on `.insert()` and `.update()` calls across:
- `use-daily-log.ts` (2×)
- `use-exercises.ts` (1×)
- `use-food-log.ts` (1×)
- `use-mood-energy.ts` (2×)
- `use-supplements.ts` (3×)
- `use-symptom-log.ts` (1×)
- `use-user-profile.ts` (1×)
- `use-weight.ts` (1×)
- `(onboarding)/supplements.tsx` (1×)
- `(tabs)/index.tsx` (2× for period_logs)

**Recommendation:** Once the Supabase project schema is finalized, auto-generate types with `supabase gen types typescript --local > src/types/database.ts`. This should eliminate all `as any` casts.

### Large Components
- **`app/(tabs)/index.tsx`** (909 lines) — HomeScreen is a single large file. It includes `SupplementGroup`, `EmojiPicker`, `SymptomChip`, and `SeverityDots` as local components. Consider extracting these to `components/home/`.
- **`app/(tabs)/food.tsx`** (730 lines) — Similar: includes `FoodEntry` inline. Could extract to `components/food/food-entry.tsx`.
- **`app/(tabs)/skin.tsx`** (619 lines) — Includes `RoutineChecklist` and `SkinEntry` interface inline. Could extract to `components/skin/`.

### Performance
- **`HomeScreen` uses 5 hooks** (`useFoodLog`, `useSupplements`, `useMoodEnergy`, `useSymptomLog`, `useDailyLog`) each making independent Supabase queries on mount. These all fire simultaneously which is good (parallel), but there's no deduplication if the same table is queried by multiple hooks.
- **`useFoodLog` polls every 30s** when entries are pending AI analysis. This is acceptable but could be replaced with Supabase realtime subscriptions if/when websocket support is added.
- **Chart components** (`MoodEnergyTrend`, `NutritionTrend`, `WeightTrend`, `SymptomFrequencyCard`, `PeriodCalendarCard`, `TimeRangeSelector`) are already wrapped in `React.memo` ✅.
- **Sub-components in HomeScreen** (`SupplementGroup`, `EmojiPicker`, `SymptomChip`, `SeverityDots`) are NOT wrapped in `React.memo`. Since they receive primitive props and are rendered in lists, memoizing them could help. However, since they're small and the parent re-renders are infrequent (user interactions only), this is low priority.

### Error Handling
- **No error boundary** exists in the component tree. If a chart component throws (e.g., bad data), the entire app crashes. Consider adding an `ErrorBoundary` wrapper around `HealthDashboard` and individual tab screens.
- **Silent catch blocks** in `storage.ts` (all functions), `use-supplements.ts` (`fetchTodaysLogs`), and `food.tsx` (local photo helpers). These swallow errors without logging. Fine for localStorage failures but could mask bugs.
- **`handleSave` in HomeScreen** doesn't handle errors from `supabase.from('period_logs')` operations — they're fire-and-forget without try/catch around the period save logic.

### Accessibility
- **Emoji-based tab icons** (`❤️`, `🍽️`, etc.) lack `accessibilityLabel` props. Screen readers will read the emoji character name.
- **Checkbox touch targets** (22×22px) in supplement lists are below the recommended 44×44px minimum. The wrapping `TouchableOpacity` handles the actual touch, but the visual indicator is small.
- **SeverityDots** (28×28px) are slightly below 44px minimum touch target on the visual element, though row spacing helps.
- **MonthlyCalendar day cells** have `minHeight: 40` which is close to the 44px minimum.

### Skin Tab State
- **`SkinScreen` stores entries in local state only** (`useState<SkinEntry[]>([])`). Skin journal entries are lost on refresh. This is likely intentional (placeholder before Supabase integration) but worth noting.
- **Routine checklist state** is also local-only. Skin routine completion resets on refresh.

### Missing React Import
- **`onboarding-card.tsx`** uses `React.ReactNode` in interface but doesn't import `React`. This works because of the new JSX transform, but the type reference relies on ambient `React` types from `@types/react`.

### Unused Exports
- **`StatDisplay`** component in `components/ui/` — exported from `index.ts` but not imported anywhere in the codebase. Keep if planned for future use.

### `isOnboarded` dependency in `use-supplements.ts`
The `fetchSupplements` callback checks `isOnboarded` to decide whether to seed defaults, but `isOnboarded` comes from `useUserProfile()`. This creates a potential double-fetch: profile loads → `isOnboarded` changes → supplements re-fetch. Low impact since it only happens once at login.
