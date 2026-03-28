# Overnight Build Plan — Healthy Me Features

> Generated: 2026-03-28
> Based on: Full codebase analysis + validation of `next-features-plan.md`
> Status: RESEARCH COMPLETE — ready for implementation

---

## Table of Contents

1. [Codebase Audit Summary](#codebase-audit-summary)
2. [Pre-Requisites (Must Fix First)](#pre-requisites)
3. [Feature 1: Food Calendar / History View](#feature-1-food-calendar--history-view)
4. [Feature 2: Health Tab — Trend Graphs + Period Calendar](#feature-2-health-tab--trend-graphs--period-calendar)
5. [Feature 3: User Onboarding Flow](#feature-3-user-onboarding-flow)
6. [Overall Build Sequence](#overall-build-sequence)

---

## Codebase Audit Summary

### Architecture Overview
- **Framework:** Expo SDK 54, expo-router 6 (file-based routing)
- **State:** No global state manager used for data (zustand installed but unused). Each hook is standalone with `useState`/`useCallback`.
- **Data fetching:** Direct Supabase client calls in hooks, no React Query integration (installed but unused).
- **Auth:** Magic link via Supabase, `AuthProvider` context in `src/lib/auth.tsx`
- **Styling:** StyleSheet-based, theme constants in `src/constants/theme.ts`
- **UI Components:** `PixelCard`, `PixelButton`, `ScreenWrapper`, `StatDisplay` in `src/components/ui/`

### Key Files & What They Do

| File | Purpose | Key Exports |
|------|---------|-------------|
| `src/utils/storage.ts` | Date helpers, localStorage food entries (legacy?) | `toDateKey()`, `formatDate()`, `generateId()` |
| `src/hooks/use-food-log.ts` | Supabase food CRUD, accepts any dateKey | `useFoodLog(date: string)` |
| `src/hooks/use-mood-energy.ts` | Today's mood/energy from `symptoms` table | `useMoodEnergy()` |
| `src/hooks/use-symptom-log.ts` | Today's symptom_logs CRUD | `useSymptomLog()` |
| `src/hooks/use-daily-log.ts` | Today's daily_logs CRUD | `useDailyLog()` |
| `src/hooks/use-weight.ts` | Last weight + log new weight | `useWeight()` |
| `src/hooks/use-supplements.ts` | Supplement list + today's logs + toggle | `useSupplements()` |
| `src/hooks/use-exercises.ts` | Today's exercises CRUD | `useExercises()` |
| `src/app/(tabs)/food.tsx` | Food tab — day view with arrow nav | Default export |
| `src/app/(tabs)/index.tsx` | Home tab — supplements, food summary, daily check-in | Default export |
| `src/app/(tabs)/health.tsx` | Health tab — "coming soon" placeholder | Default export |
| `src/types/database.ts` | All Supabase row types | `FoodLog`, `Symptom`, `PeriodLog`, etc. |
| `src/constants/theme.ts` | Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows | All as `const` |

### Installed npm Packages (Relevant)
- `date-fns` ^4.1.0 ✅ (available for date math)
- `expo-linear-gradient` ✅ (needed by gifted-charts)
- `react-native-reanimated` ✅
- `react-native-gesture-handler` ✅
- `zustand` ^5.0.12 (installed, unused)
- `@tanstack/react-query` ^5.95.2 (installed, unused)
- **NOT installed:** `react-native-svg`, `react-native-gifted-charts`

### Database Tables (from 001_initial_schema.sql)
12 tables created: `user_profiles`, `food_logs`, `water_logs`, `user_supplements`, `supplement_logs`, `exercise_logs`, `health_labs`, `weight_logs`, `symptoms`, `period_logs`, `skin_photos`, `daily_scores`.

All have RLS enabled with user_id policies. Indexes on `(user_id, log_date)` for all date-based tables.

### Existing Character Assets
Available in `assets/images/character/`: default, eating, pill, sad, sleeping, waving, celebrating (PNG + JPG variants).

---

## Pre-Requisites

### P0: Timezone Bug Fix ⏱ 30 min

**Status of the plan's claim:** ✅ VALIDATED — the bug exists exactly as described.

**Affected files with `getTodayDate()` using manual local date (which is CORRECT):**
- `src/hooks/use-mood-energy.ts` — has its own `getTodayDate()` ✅ (uses local date, NOT `toISOString`)
- `src/hooks/use-symptom-log.ts` — has its own `getTodayDate()` ✅ (same pattern)
- `src/hooks/use-daily-log.ts` — has its own `getTodayDate()` ✅ (same pattern)
- `src/hooks/use-weight.ts` — has its own `getTodayDate()` ✅ (same pattern)
- `src/hooks/use-supplements.ts` — has its own `getTodayDate()` ✅ (same pattern)
- `src/hooks/use-exercises.ts` — has its own `getTodayDate()` ✅ (same pattern)
- `src/app/(tabs)/index.tsx` — has its own `getTodayDate()` ✅ (same pattern)

**⚠️ CORRECTION TO PLAN:** The previous plan said these use `toISOString()`. That's WRONG. I read every file — they ALL use the same manual local-date pattern:
```typescript
function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
```

This is functionally identical to `toDateKey()` — no timezone bug exists! The code is correct but has DRY violations (7 duplicate implementations).

**Fix:** Replace all 7 `getTodayDate()` with `import { toDateKey } from '../utils/storage'` + `toDateKey(new Date())`. This is cleanup, not a bug fix.

**Files to change:**
1. `src/hooks/use-mood-energy.ts` — remove `getTodayDate`, import `toDateKey`, replace `getTodayDate()` → `toDateKey(new Date())`
2. `src/hooks/use-symptom-log.ts` — same
3. `src/hooks/use-daily-log.ts` — same
4. `src/hooks/use-weight.ts` — same
5. `src/hooks/use-supplements.ts` — same
6. `src/hooks/use-exercises.ts` — same
7. `src/app/(tabs)/index.tsx` — same

### P1: Missing `symptom_logs` Table ⏱ 15 min

**🚨 CRITICAL FINDING:** The `symptom_logs` table does NOT exist in any migration file! The code (`use-symptom-log.ts`) references it, and `database.ts` defines a `SymptomLog` interface, but `001_initial_schema.sql` only has `symptoms` (the aggregated daily row).

There are TWO symptom systems:
1. **`symptoms` table** — one row per user per day, with individual severity columns (bloating, acne, etc.) + mood + energy. Used by `use-mood-energy.ts`.
2. **`symptom_logs` table** — one row per symptom per day, with `symptom_type`, `severity`, `triggers`. Used by `use-symptom-log.ts`.

**The `symptom_logs` table must exist in Supabase already** (the app works in production), but it was likely created manually or via a migration that isn't tracked. Either way:

**Action needed:** Create migration `003_add_symptom_logs.sql`:
```sql
CREATE TABLE IF NOT EXISTS symptom_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  symptom_type TEXT NOT NULL,
  severity INTEGER DEFAULT 0 CHECK (severity BETWEEN 0 AND 5),
  notes TEXT,
  triggers TEXT,
  log_date DATE DEFAULT CURRENT_DATE NOT NULL
);

ALTER TABLE symptom_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own symptom_logs" ON symptom_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own symptom_logs" ON symptom_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own symptom_logs" ON symptom_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own symptom_logs" ON symptom_logs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_symptom_logs_user_date ON symptom_logs(user_id, log_date);
```

### P2: Hardcoded Targets ⏱ (addressed in Feature 3)

Both `food.tsx` and `index.tsx` have:
```typescript
const CALORIE_TARGET = 1500;
const PROTEIN_TARGET = 80;
```

These need to come from `user_profiles` table (which already has `calorie_target` and `protein_target` columns!). This is part of Feature 3 but noted here as context.

---

## Feature 1: 📅 Food Calendar / History View

### What Exists Already

| Asset | Location | Status |
|-------|----------|--------|
| `useFoodLog(date)` hook | `src/hooks/use-food-log.ts` | ✅ Already accepts any date string — perfect |
| `toDateKey()` helper | `src/utils/storage.ts` | ✅ Available |
| `formatDate()` helper | `src/utils/storage.ts` | ✅ Available |
| `FoodLog` type | `src/types/database.ts` | ✅ Complete |
| `food_logs` table | Supabase | ✅ Indexed on `(user_id, log_date)` |
| `PixelCard` component | `src/components/ui/` | ✅ Reusable |
| `ScreenWrapper` component | `src/components/ui/` | ✅ Has `scrollable` prop |
| `date-fns` | package.json | ✅ Installed for date math |
| Day nav arrows | `food.tsx` | ✅ Already has `goBack`/`goForward` with `currentDate` state |
| Meal grouping logic | `food.tsx` | ✅ `MEAL_LABELS` + `groupedEntries` |
| Character eating asset | `assets/images/character/` | ✅ Used in empty state |

### Plan Validation vs Actual Codebase

The previous plan is **mostly accurate** with these corrections:

1. **✅ Correct:** "useFoodLog already accepts any date string" — confirmed, `useFoodLog(date: string)` works.
2. **✅ Correct:** "date-fns already installed" — confirmed in package.json.
3. **⚠️ Minor:** Plan says "no changes needed to useFoodLog" — TRUE for viewing a single day, but we DO need a new query for monthly summaries (the plan accounts for this with `useFoodCalendar`).
4. **⚠️ Correction:** Plan suggests `DaySummary.hasBreakfast`, `hasLunch`, etc. — the actual `meal_type` values in the codebase are `'breakfast' | 'lunch' | 'dinner' | 'snack'` which matches.

### What's Missing

#### New Files to Create

| File | Type | Purpose |
|------|------|---------|
| `src/components/shared/monthly-calendar.tsx` | Component | Reusable calendar grid (shared with Health tab) |
| `src/components/food/food-calendar.tsx` | Component | Food-specific calendar with meal dots |
| `src/components/food/day-summary-card.tsx` | Component | Selected day's summary below calendar |
| `src/hooks/use-food-calendar.ts` | Hook | Monthly food data fetching + aggregation |

#### Modified Files

| File | Changes |
|------|---------|
| `src/app/(tabs)/food.tsx` | Add calendar icon toggle, calendar view state, integrate FoodCalendar |

### Component Tree

```
food.tsx (FoodScreen)
├── DateNav (existing) + 📅 Calendar toggle button
├── IF calendarOpen:
│   ├── FoodCalendar
│   │   ├── MonthlyCalendar (shared)
│   │   │   ├── Month header with ◀ ▶ arrows
│   │   │   ├── Weekday headers (Su Mo Tu...)
│   │   │   └── CalendarDayCell × 28-31
│   │   │       ├── Day number
│   │   │       └── Dot indicator (colored by meal count)
│   │   └── (renders dots via MonthlyCalendar's renderDay prop)
│   └── DaySummaryCard (if day selected)
│       ├── Day name + date
│       ├── Calorie + protein totals
│       ├── Meal type breakdown (emojis + cal per meal)
│       └── "View Full Day →" button
├── ELSE (existing day view):
│   ├── Summary card (existing)
│   ├── Add Meal button/form (existing)
│   └── Grouped entries (existing)
```

### Database Queries

#### `useFoodCalendar` hook — Monthly summary fetch

```typescript
// src/hooks/use-food-calendar.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toDateKey } from '../utils/storage';
import { startOfMonth, endOfMonth, addMonths, subMonths, format } from 'date-fns';
import type { FoodLog } from '../types/database';

interface DaySummary {
  date: string;           // YYYY-MM-DD
  totalCalories: number;
  totalProtein: number;
  mealCount: number;
  mealTypes: Set<FoodLog['meal_type']>;
}

interface UseFoodCalendarReturn {
  summaries: Map<string, DaySummary>;
  loading: boolean;
  currentMonth: Date;      // first day of displayed month
  goNextMonth: () => void;
  goPrevMonth: () => void;
  goToMonth: (date: Date) => void;
}

// Query: fetch all food_logs for a month range
async function fetchMonthData(userId: string, monthDate: Date): Promise<FoodLog[]> {
  const start = toDateKey(startOfMonth(monthDate));
  const end = toDateKey(endOfMonth(monthDate));

  const { data, error } = await supabase
    .from('food_logs')
    .select('log_date, calories, protein, meal_type')
    .eq('user_id', userId)
    .gte('log_date', start)
    .lte('log_date', end)
    .order('log_date', { ascending: true });

  if (error) throw error;
  return (data as FoodLog[]) ?? [];
}

// Client-side aggregation (max ~120 rows/month)
function aggregateByDay(logs: FoodLog[]): Map<string, DaySummary> {
  const map = new Map<string, DaySummary>();
  for (const log of logs) {
    const existing = map.get(log.log_date) ?? {
      date: log.log_date,
      totalCalories: 0,
      totalProtein: 0,
      mealCount: 0,
      mealTypes: new Set<FoodLog['meal_type']>(),
    };
    existing.totalCalories += log.calories ?? 0;
    existing.totalProtein += log.protein ?? 0;
    existing.mealCount += 1;
    existing.mealTypes.add(log.meal_type);
    map.set(log.log_date, existing);
  }
  return map;
}
```

### Shared MonthlyCalendar Component API

```typescript
// src/components/shared/monthly-calendar.tsx

interface MonthlyCalendarProps {
  currentMonth: Date;               // first day of month to display
  onMonthChange: (date: Date) => void;
  renderDay: (date: Date, dateKey: string) => React.ReactNode;
  onDayPress: (dateKey: string) => void;
  selectedDate?: string;            // YYYY-MM-DD
  disableFuture?: boolean;          // gray out future dates
}
```

Uses `date-fns`: `startOfMonth`, `endOfMonth`, `startOfWeek`, `endOfWeek`, `eachDayOfInterval`, `isSameMonth`, `isSameDay`, `isAfter`, `format`.

Grid: 7 columns, up to 6 rows. Each cell is a `TouchableOpacity` with the day number and any custom content via `renderDay`.

### File-by-File Changes

#### 1. `src/components/shared/monthly-calendar.tsx` (NEW)
- ~120 lines
- Reusable calendar grid component
- Props: `currentMonth`, `onMonthChange`, `renderDay`, `onDayPress`, `selectedDate`, `disableFuture`
- Month navigation header with ◀ ▶
- Weekday row: Su Mo Tu We Th Fr Sa
- Day cells in a 7-column grid using `flexWrap`
- Selected date: purple bg circle, white text
- Today: outlined circle (babyBlue border)
- Other month's days: hidden or grayed out
- Uses `Colors`, `Fonts`, `FontSizes`, `Spacing`, `BorderRadius` from theme

#### 2. `src/hooks/use-food-calendar.ts` (NEW)
- ~80 lines
- Fetches food_logs for displayed month
- Aggregates into `Map<string, DaySummary>`
- Caches previous months in `useRef<Map<string, Map<string, DaySummary>>>`
- Month navigation functions
- Re-fetches on focus (`useFocusEffect`)

#### 3. `src/components/food/food-calendar.tsx` (NEW)
- ~60 lines
- Wraps `MonthlyCalendar` with food-specific dot rendering
- Dot colors: purple (≥3 meals), babyBlue (1-2 meals), none (no data)
- Passes `renderDay` prop that returns a small colored dot `View`

#### 4. `src/components/food/day-summary-card.tsx` (NEW)
- ~80 lines
- Shows selected day's totals
- Accepts `DaySummary` + `onViewFullDay` callback
- Displays: formatted date, cal/protein totals, meal type emojis with per-type calorie subtotals
- "View Full Day →" button at bottom

#### 5. `src/app/(tabs)/food.tsx` (MODIFIED)
- Add `calendarOpen` state (boolean, default false)
- Add `selectedCalDate` state (string | null)
- Add calendar icon button (📅) next to date navigation
- When `calendarOpen`:
  - Hide existing day view content
  - Show `FoodCalendar` + `DaySummaryCard`
  - "View Full Day →" sets `currentDate` and closes calendar
- When not `calendarOpen`:
  - Existing behavior unchanged
- Estimated diff: ~40 lines added, ~5 lines modified

### Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Calendar grid layout on narrow screens** | Medium | Use percentage widths (14.28% per cell). Test at 320px wide. |
| **Month transition flicker** | Low | Cache previous month's data in `useRef`. Only show spinner for uncached months. |
| **Race condition on rapid month switching** | Medium | Track request generation ID. Discard stale responses if `currentMonth` has changed when response arrives. |
| **date-fns tree shaking** | Low | Import specific functions, not entire library. Already done in codebase. |
| **Calendar not updating after adding food** | Medium | When closing calendar view → re-trigger `useFoodCalendar` refetch for current month. Or pass a `refreshKey` that changes on food add. |

### Dependencies
- **npm packages:** None new (date-fns already installed)
- **Database migrations:** None
- **Assets:** None new

### Build Estimate
**2-3 hours** (not days — the data layer exists, it's mostly UI)

### Build Order (within feature)
1. `monthly-calendar.tsx` shared component (40 min) — foundation for both features
2. `use-food-calendar.ts` hook (30 min) — data fetching
3. `food-calendar.tsx` wrapper (20 min) — dot rendering
4. `day-summary-card.tsx` (20 min) — selected day display
5. Integrate into `food.tsx` (30 min) — toggle + state management

---

## Feature 2: 📊 Health Tab — Trend Graphs + Period Calendar

### What Exists Already

| Asset | Location | Status |
|-------|----------|--------|
| `symptoms` table | Supabase | ✅ Has `mood`, `energy_level`, UNIQUE(user_id, log_date) |
| `symptom_logs` table | Supabase (not in migrations) | ✅ Has `symptom_type`, `severity`, `log_date` |
| `food_logs` table | Supabase | ✅ Has all macros |
| `period_logs` table | Supabase | ✅ Has `flow`, `cramps`, `headache`, `back_pain` |
| `weight_logs` table | Supabase | ✅ Has `weight`, `log_date` |
| `useMoodEnergy()` hook | `src/hooks/use-mood-energy.ts` | ⚠️ Today-only — needs range variant |
| `useWeight()` hook | `src/hooks/use-weight.ts` | ⚠️ Last-only — needs range variant |
| `Symptom` type | `src/types/database.ts` | ✅ Complete |
| `PeriodLog` type | `src/types/database.ts` | ✅ Has FlowLevel type |
| `SymptomLog` type | `src/types/database.ts` | ✅ Has SymptomType |
| `MonthlyCalendar` | From Feature 1 | ✅ Reusable (shared component) |
| `ScreenWrapper` | `src/components/ui/` | ✅ Has scrollable mode |
| `expo-linear-gradient` | package.json | ✅ Installed (needed by gifted-charts) |
| All index files | Supabase | ✅ `(user_id, log_date)` indexes on every relevant table |

### Plan Validation vs Actual Codebase

1. **✅ Correct:** Mood/energy is in the `symptoms` table (not `symptom_logs`).
2. **⚠️ Correction:** The plan references `symptom_logs` table for "Symptom frequency" queries — this table exists in code but NOT in the tracked migrations. Need to verify it exists in production Supabase or create it.
3. **✅ Correct:** Period data structure matches — `flow` is enum `'spotting' | 'light' | 'medium' | 'heavy'`.
4. **⚠️ Important:** The `symptoms` table stores mood/energy alongside individual symptom severities (bloating, acne, etc. as integer columns 0-5). The `symptom_logs` table is a separate normalized log. Both are used differently on the Home screen.
5. **⚠️ Correction:** Plan says to use `symptom_logs` for frequency analysis. However, the `symptoms` table ALSO has severity columns for bloating, acne, hair_loss, hirsutism, fatigue, brain_fog, cravings, anxiety. We should use BOTH sources for a complete picture — `symptoms` table has daily severity scores, `symptom_logs` has individual entries with types.
6. **✅ Correct:** gifted-charts recommendation is sound — Expo web compatible with react-native-svg.

### What's Missing

#### New npm Packages
```bash
npx expo install react-native-gifted-charts react-native-svg
```

#### New Files to Create

| File | Type | Purpose |
|------|------|---------|
| `src/components/health/health-dashboard.tsx` | Component | Main container with all cards |
| `src/components/health/time-range-selector.tsx` | Component | 7D / 30D / 90D pill selector |
| `src/components/health/mood-energy-trend.tsx` | Component | Dual line chart for mood + energy |
| `src/components/health/nutrition-trend.tsx` | Component | Bar chart for calories with target line |
| `src/components/health/period-calendar-card.tsx` | Component | Calendar with flow dots |
| `src/components/health/symptom-frequency.tsx` | Component | Horizontal bar chart of symptom counts |
| `src/components/health/weight-trend.tsx` | Component | Line/area chart for weight |
| `src/hooks/use-health-trends.ts` | Hook | Multi-table data fetching with range |
| `src/hooks/use-period-calendar.ts` | Hook | Monthly period data |

#### Modified Files

| File | Changes |
|------|---------|
| `src/app/(tabs)/health.tsx` | Complete rewrite — replace placeholder |

### Component Tree

```
health.tsx (HealthScreen)
└── ScreenWrapper scrollable
    └── HealthDashboard
        ├── Title "HEALTH" (PressStart2P)
        ├── TimeRangeSelector [7D] [30D] [90D]
        ├── MoodEnergyTrendCard
        │   ├── Card header: "😊 Mood & Energy"
        │   ├── LineChart (dual line: mood purple, energy babyBlue)
        │   └── Summary: "Avg mood: X.X  Avg energy: X.X"
        ├── NutritionTrendCard
        │   ├── Card header: "🔥 Nutrition"
        │   ├── BarChart (daily calories, purple bars)
        │   ├── Dashed target line at user's calorie_target
        │   └── Summary: "Avg: X,XXX cal · XXg protein"
        ├── PeriodCalendarCard
        │   ├── Card header: "🩸 Period Tracker"
        │   ├── MonthlyCalendar (shared, own month nav)
        │   │   └── renderDay: colored dot by flow level
        │   └── Legend: 🔴 heavy 🟠 medium 🟡 light ⚪ spotting
        ├── SymptomFrequencyCard
        │   ├── Card header: "🤒 Top Symptoms"
        │   ├── Horizontal bars (plain Views, not chart lib)
        │   │   └── For each symptom: label, bar, count, avg severity
        │   └── Summary: "Most common: X (N days)"
        └── WeightTrendCard
            ├── Card header: "⚖️ Weight"
            ├── LineChart (area fill, mint color)
            └── Summary: "Current: XXX lbs  Change: ±X.X lbs"
```

### Database Queries

#### `useHealthTrends` — All trend data in parallel

```typescript
// src/hooks/use-health-trends.ts

type TimeRange = '7d' | '30d' | '90d';

function getDateRange(range: TimeRange): { start: string; end: string } {
  const now = new Date();
  const end = toDateKey(now);
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  const start = toDateKey(startDate);
  return { start, end };
}

// Parallel fetch all data sources
async function fetchAllTrends(userId: string, range: TimeRange) {
  const { start, end } = getDateRange(range);

  const [moodRes, foodRes, symptomRes, weightRes] = await Promise.all([
    // 1. Mood & Energy from symptoms table
    supabase
      .from('symptoms')
      .select('log_date, mood, energy_level')
      .eq('user_id', userId)
      .gte('log_date', start)
      .lte('log_date', end)
      .not('mood', 'is', null)
      .order('log_date', { ascending: true }),

    // 2. Nutrition from food_logs
    supabase
      .from('food_logs')
      .select('log_date, calories, protein, carbs, fat')
      .eq('user_id', userId)
      .gte('log_date', start)
      .lte('log_date', end)
      .order('log_date', { ascending: true }),

    // 3. Symptoms from BOTH tables for comprehensive view
    //    Use symptoms table (has individual severity columns per day)
    supabase
      .from('symptoms')
      .select('log_date, bloating, acne, hair_loss, hirsutism, fatigue, brain_fog, cravings, anxiety')
      .eq('user_id', userId)
      .gte('log_date', start)
      .lte('log_date', end),

    // 4. Weight
    supabase
      .from('weight_logs')
      .select('log_date, weight')
      .eq('user_id', userId)
      .gte('log_date', start)
      .lte('log_date', end)
      .order('log_date', { ascending: true }),
  ]);

  return { moodRes, foodRes, symptomRes, weightRes };
}
```

**Symptom frequency aggregation** (from `symptoms` table — more reliable since it's daily):
```typescript
interface SymptomFrequency {
  name: string;
  key: string;
  count: number;         // days where severity > 0
  avgSeverity: number;   // average when present
}

function aggregateSymptomFrequency(rows: Symptom[]): SymptomFrequency[] {
  const symptomKeys = ['bloating', 'acne', 'hair_loss', 'hirsutism', 'fatigue', 'brain_fog', 'cravings', 'anxiety'];
  const labels: Record<string, string> = {
    bloating: 'Bloating', acne: 'Acne', hair_loss: 'Hair Loss',
    hirsutism: 'Excess Hair', fatigue: 'Fatigue', brain_fog: 'Brain Fog',
    cravings: 'Cravings', anxiety: 'Anxiety',
  };

  return symptomKeys
    .map(key => {
      const values = rows.map(r => (r as Record<string, number>)[key]).filter(v => v > 0);
      return {
        name: labels[key],
        key,
        count: values.length,
        avgSeverity: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      };
    })
    .filter(s => s.count > 0)
    .sort((a, b) => b.count - a.count);
}
```

**Nutrition aggregation** (group food_logs by day):
```typescript
interface DailyNutrition {
  date: string;
  calories: number;
  protein: number;
}

function aggregateNutritionByDay(logs: FoodLog[]): DailyNutrition[] {
  const map = new Map<string, DailyNutrition>();
  for (const log of logs) {
    const existing = map.get(log.log_date) ?? { date: log.log_date, calories: 0, protein: 0 };
    existing.calories += log.calories ?? 0;
    existing.protein += log.protein ?? 0;
    map.set(log.log_date, existing);
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}
```

#### `usePeriodCalendar` — Monthly period data

```typescript
// src/hooks/use-period-calendar.ts

async function fetchPeriodMonth(userId: string, monthDate: Date) {
  const start = toDateKey(startOfMonth(monthDate));
  const end = toDateKey(endOfMonth(monthDate));

  const { data, error } = await supabase
    .from('period_logs')
    .select('log_date, flow, cramps, headache, back_pain')
    .eq('user_id', userId)
    .gte('log_date', start)
    .lte('log_date', end)
    .order('log_date', { ascending: true });

  if (error) throw error;
  return (data as PeriodLog[]) ?? [];
}
```

### Gifted Charts Configuration

#### Chart Theming (consistent with app design)

```typescript
const CHART_COMMON = {
  yAxisTextStyle: { fontFamily: 'Silkscreen', fontSize: 10, color: Colors.textMuted },
  xAxisLabelTextStyle: { fontFamily: 'Silkscreen', fontSize: 10, color: Colors.textMuted },
  rulesColor: Colors.tabBarBorder,
  rulesType: 'dashed' as const,
  backgroundColor: 'transparent',
  hideYAxisText: false,
  hideAxesAndRules: false,
  disableScroll: true,   // fit within card width
};
```

**⚠️ Key web compatibility note:** `react-native-gifted-charts` uses `react-native-svg` for rendering. On web, `react-native-svg` renders as `<svg>` elements — this works but:
- Must pass explicit `width` prop to charts (cannot rely on `Dimensions.get('window').width` in SSR)
- Use `Dimensions.get('window').width - (Spacing.lg * 2) - (Spacing.md * 2)` to account for ScreenWrapper padding + card padding
- Consider using `useWindowDimensions()` hook for responsive width

#### Mood/Energy Line Chart
- Two data lines: mood (Colors.purple) + energy (Colors.babyBlue)
- Y-axis: 1-5, no sections (maxValue: 5, noOfSections: 4)
- X-axis labels: day abbreviations or dates depending on range
- Curved lines, 2px thickness, 4px data points
- For 90d range: aggregate to weekly averages (13 points instead of 90)

#### Nutrition Bar Chart
- Purple bars for daily calories
- Dashed reference line at calorie target (Colors.pink)
- Bar width: 24px, borderRadius: 4
- For 90d range: aggregate to weekly averages

#### Weight Line Chart
- Mint colored area chart
- Smooth curved line, 2px thickness
- Filled area below with 25% → 10% opacity gradient

#### Symptom Frequency (plain Views, not gifted-charts)
- Horizontal bars built with `View` components
- More customizable and lighter than chart library for simple bars
- Each row: label (width 80), colored bar (flex, width proportional to count), count text

### Card Styling Pattern

All health cards follow the Home tab's accent card pattern:

```typescript
const cardStyle = {
  backgroundColor: Colors.cardBackground,
  borderRadius: BorderRadius.lg,
  borderLeftWidth: 4,
  borderLeftColor: <per-card color>,
  padding: Spacing.md,
  ...Shadows.card,
  marginBottom: Spacing.md,
};
```

| Card | Border Color |
|------|-------------|
| Mood & Energy | `Colors.pink` (#ff80ab) |
| Nutrition | `Colors.success` (#81c784) |
| Period Tracker | `Colors.softPink` + `Colors.pink` border |
| Symptom Frequency | `Colors.warning` (#ffb74d) |
| Weight | `Colors.babyBlue` (#81d4fa) |

### File-by-File Changes

#### 1. `src/hooks/use-health-trends.ts` (NEW) — ~120 lines
- Accepts `range: TimeRange` state
- Fires 4 parallel queries via `Promise.all`
- Aggregates nutrition by day, symptoms by type
- Returns: `moodEnergy[]`, `nutrition[]`, `symptomFrequency[]`, `weight[]`, `loading`, `range`, `setRange`
- Refetches on range change and on focus

#### 2. `src/hooks/use-period-calendar.ts` (NEW) — ~60 lines
- Accepts `monthDate: Date` state
- Fetches period_logs for that month
- Returns: `periodLogs: Map<string, PeriodLog>`, `loading`, `currentMonth`, `goNextMonth`, `goPrevMonth`

#### 3. `src/components/health/time-range-selector.tsx` (NEW) — ~50 lines
- Three pill buttons in a row
- Active: purple bg, white text
- Inactive: background color bg, textSecondary
- Props: `range`, `onRangeChange`

#### 4. `src/components/health/mood-energy-trend.tsx` (NEW) — ~80 lines
- Accent card wrapper with pink left border
- gifted-charts `LineChart` with dual data series
- Empty state: "Start logging mood & energy on Home to see trends! 😊"
- Summary row: avg mood, avg energy

#### 5. `src/components/health/nutrition-trend.tsx` (NEW) — ~80 lines
- Accent card wrapper with green left border
- gifted-charts `BarChart`
- Reference line at calorie target
- Empty state: "Log meals in the Food tab to see trends! 🍽️"
- Summary row: avg calories, avg protein

#### 6. `src/components/health/period-calendar-card.tsx` (NEW) — ~90 lines
- Accent card wrapper with pink left border
- Uses `MonthlyCalendar` shared component from Feature 1
- `renderDay` returns colored dot based on flow level:
  - heavy → `#e57373` large dot (8px)
  - medium → `#ffb74d` medium dot (6px)
  - light → `#fff176` small dot (5px)
  - spotting → `#e0e0e0` tiny dot (4px)
- Legend row below calendar
- Empty state: "Tap a day to start tracking your period 🩸"

#### 7. `src/components/health/symptom-frequency.tsx` (NEW) — ~70 lines
- Accent card wrapper with orange left border
- Plain `View`-based horizontal bars (not gifted-charts)
- Shows top 5 symptoms sorted by frequency
- Each row: label, bar (width proportional), count, avg severity
- Bar color: `Colors.purple` with varying opacity
- Empty state: "Log symptoms from Home to see patterns! 🤒"

#### 8. `src/components/health/weight-trend.tsx` (NEW) — ~70 lines
- Accent card wrapper with babyBlue left border
- gifted-charts `LineChart` with area fill
- Shows current weight + change from start of range
- Empty state: "Log your weight to see trends ⚖️"

#### 9. `src/components/health/health-dashboard.tsx` (NEW) — ~60 lines
- Orchestrates all cards + hooks
- Creates `useHealthTrends` and `usePeriodCalendar` instances
- Passes data down to each card component
- Handles loading state for overall dashboard

#### 10. `src/app/(tabs)/health.tsx` (REWRITE) — ~30 lines
- Replace placeholder with `ScreenWrapper scrollable` + `HealthDashboard`
- Import and render dashboard component

### Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **gifted-charts web rendering issues** | High | Test immediately after install. Fallback: use `react-native-svg` directly for simple charts. The library is confirmed working on Expo web (April 2025 reports). |
| **Chart width on web** | High | Must pass explicit `width` prop calculated from `useWindowDimensions().width`. Charts inside cards need: `windowWidth - screenPadding*2 - cardPadding*2 - borderWidth`. |
| **gifted-charts fontFamily support** | Medium | The library's text style props accept `fontFamily` but custom fonts may not render in SVG text on web. Test early. Fallback: use default system font for chart labels only. |
| **5 cards + charts = scroll perf** | Medium | Consider lazy rendering: only mount chart components when scrolled into view. Or use `React.memo` aggressively + `useMemo` for chart data arrays. |
| **90-day range = many data points** | Medium | Aggregate to weekly averages for 90d. Show max ~13 data points on charts. |
| **symptom_logs table might not exist** | High | Pre-req P1 creates it. But if it doesn't exist, the symptom frequency falls back to `symptoms` table (which has severity columns). The plan already uses `symptoms` table as primary source. |
| **Empty states for new user** | Low | Every card has an empty state. New users see helpful guidance pointing to where to log data. |
| **react-native-svg install** | Low | Must use `npx expo install` to get Expo-compatible version. Standard `npm install` may get wrong version. |

### Dependencies
- **npm packages:** `react-native-gifted-charts`, `react-native-svg` (NEW)
- **Database migrations:** None (if symptom_logs already exists in production) or P1 migration
- **Assets:** None new
- **Feature 1 dependency:** Requires `MonthlyCalendar` shared component from Feature 1

### Build Estimate
**4-5 hours** — charting library setup + 5 chart cards + 2 hooks + dashboard composition

### Build Order (within feature)
1. Install `react-native-gifted-charts` + `react-native-svg` (10 min)
2. Build `TimeRangeSelector` (15 min) — simple, standalone
3. Build `useHealthTrends` hook (45 min) — core data layer
4. Build `MoodEnergyTrendCard` (40 min) — first chart, validate library works on web
5. Build `NutritionTrendCard` (30 min) — similar pattern, bar variant
6. Build `SymptomFrequencyCard` (25 min) — plain Views, no chart lib
7. Build `usePeriodCalendar` hook (20 min) — simple month fetch
8. Build `PeriodCalendarCard` (30 min) — reuses MonthlyCalendar from Feature 1
9. Build `WeightTrendCard` (20 min) — simple line chart
10. Build `HealthDashboard` + rewrite `health.tsx` (20 min) — composition

---

## Feature 3: ⚙️ User Onboarding Flow

### What Exists Already

| Asset | Location | Status |
|-------|----------|--------|
| `user_profiles` table | Supabase | ✅ Already has ALL needed columns! |
| `UserProfile` type | `src/types/database.ts` | ✅ Has `calorie_target`, `protein_target`, `onboarding_complete`, `pcos_type`, `display_name`, `goal_weight`, `weight_unit`, `pet_choice`, `pet_name` |
| `onboarding_complete` column | `user_profiles` | ✅ Boolean, defaults to FALSE |
| `calorie_target` default | `user_profiles` | ✅ Default 1500 |
| `protein_target` default | `user_profiles` | ✅ Default 80 (note: code uses 80, not 100 as task description said) |
| `pcos_type` column | `user_profiles` | ✅ Enum: insulin_resistant, post_pill, inflammatory, adrenal, unsure |
| Auto-profile creation | DB trigger | ✅ `handle_new_user()` creates profile on signup |
| Auth system | `src/lib/auth.tsx` | ✅ `AuthProvider` with `useAuth()` |
| `DEFAULT_SUPPLEMENTS` | `src/hooks/use-supplements.ts` | ✅ Hardcoded list seeded on first load |
| Routing | expo-router | ✅ File-based routing with `(auth)` and `(tabs)` groups |
| Character assets | `assets/images/character/` | ✅ default, waving, celebrating, pill variants |

### Key Database Column Defaults (from schema)

```sql
calorie_target INTEGER DEFAULT 1500,
protein_target INTEGER DEFAULT 80,
carb_target INTEGER DEFAULT 150,
fat_target INTEGER DEFAULT 55,
water_target INTEGER DEFAULT 8,
weight_unit TEXT DEFAULT 'lbs',
pet_choice TEXT DEFAULT 'default',
onboarding_complete BOOLEAN DEFAULT FALSE,
```

The schema is **already set up for onboarding**. No new columns needed.

### What's Missing

#### New Files to Create

| File | Type | Purpose |
|------|------|---------|
| `src/app/(onboarding)/_layout.tsx` | Layout | Onboarding route group |
| `src/app/(onboarding)/welcome.tsx` | Screen | Welcome screen with character |
| `src/app/(onboarding)/profile.tsx` | Screen | Name + PCOS type |
| `src/app/(onboarding)/goals.tsx` | Screen | Calorie/protein/weight targets |
| `src/app/(onboarding)/supplements.tsx` | Screen | Choose supplement stack |
| `src/app/(onboarding)/complete.tsx` | Screen | Success + enter app |
| `src/hooks/use-user-profile.ts` | Hook | Fetch/update user_profiles, provide targets |
| `src/components/onboarding/progress-dots.tsx` | Component | Step indicator dots |
| `src/components/onboarding/onboarding-card.tsx` | Component | Consistent card wrapper for onboarding |

#### Modified Files

| File | Changes |
|------|---------|
| `src/app/index.tsx` | Add onboarding check — redirect to onboarding if `!onboarding_complete` |
| `src/app/(tabs)/food.tsx` | Replace `CALORIE_TARGET`/`PROTEIN_TARGET` with profile values |
| `src/app/(tabs)/index.tsx` | Replace `CALORIE_TARGET`/`PROTEIN_TARGET` with profile values |
| `src/hooks/use-supplements.ts` | Make default supplements configurable (not just hardcoded) |

### Onboarding Flow Design

#### Screen 1: Welcome
```
┌─────────────────────────────────┐
│                                 │
│         [character-waving]      │
│                                 │
│      HEALTHY ME                 │  ← PressStart2P
│                                 │
│   Your kawaii PCOS companion    │  ← Silkscreen
│                                 │
│   Let's set up your profile     │
│   so I can help you track       │
│   your health journey! 💜       │
│                                 │
│                                 │
│      [ Get Started → ]          │  ← PixelButton primary
│                                 │
│         ○ ○ ○ ○ ○              │  ← Progress dots (1 of 5)
└─────────────────────────────────┘
```

#### Screen 2: Profile
```
┌─────────────────────────────────┐
│       ◀ Back                    │
│                                 │
│   What should I call you?       │
│   ┌─────────────────────────┐   │
│   │ [Name input]            │   │
│   └─────────────────────────┘   │
│                                 │
│   What type of PCOS do you      │
│   think you have?               │
│                                 │
│   [Insulin Resistant]  ← pill   │
│   [Post-Pill]                   │
│   [Inflammatory]                │
│   [Adrenal]                     │
│   [Not sure yet]                │
│                                 │
│   ℹ️ Don't worry — you can      │
│   change this later!            │
│                                 │
│      [ Next → ]                 │
│                                 │
│         ● ○ ○ ○ ○              │
└─────────────────────────────────┘
```

#### Screen 3: Goals
```
┌─────────────────────────────────┐
│       ◀ Back                    │
│                                 │
│   Daily Targets                 │
│                                 │
│   🔥 Calories                   │
│   ┌─────────────────────────┐   │
│   │  [ - ]  1500  [ + ]    │   │  ← Stepper (increment 50)
│   └─────────────────────────┘   │
│                                 │
│   💪 Protein (grams)            │
│   ┌─────────────────────────┐   │
│   │  [ - ]   80   [ + ]    │   │  ← Stepper (increment 5)
│   └─────────────────────────┘   │
│                                 │
│   ⚖️ Goal Weight (optional)     │
│   ┌─────────────────────────┐   │
│   │ [Weight input]  [lbs▼] │   │
│   └─────────────────────────┘   │
│                                 │
│   💡 Common PCOS targets:       │
│   1200-1500 cal, 80-120g        │
│   protein for weight management │
│                                 │
│      [ Next → ]                 │
│                                 │
│         ● ● ○ ○ ○              │
└─────────────────────────────────┘
```

#### Screen 4: Supplements
```
┌─────────────────────────────────┐
│       ◀ Back                    │
│                                 │
│   Your Supplement Stack 💊      │
│                                 │
│   Common PCOS supplements:      │
│                                 │
│   ☑️ Ovasitol (AM) - 1 scoop   │
│   ☑️ Knowell - 4 caps          │
│   ☑️ NAC - 500mg               │
│   ☑️ Omega-3 - 4 softgels      │
│   ☑️ Ovasitol (PM) - 1 scoop   │
│   ☑️ BionerLab - 2 gummies     │
│                                 │
│   ℹ️ Pre-selected based on      │
│   common PCOS protocols.        │
│   Uncheck any you don't take.   │
│                                 │
│   [ + Add Custom Supplement ]   │
│                                 │
│      [ Next → ]                 │
│                                 │
│         ● ● ● ○ ○              │
└─────────────────────────────────┘
```

#### Screen 5: Complete
```
┌─────────────────────────────────┐
│                                 │
│      [character-celebrating]    │
│                                 │
│      YOU'RE ALL SET! 🎉        │  ← PressStart2P
│                                 │
│   Great job, [Name]!           │
│                                 │
│   Your daily targets:           │
│   🔥 1500 cal  💪 80g protein  │
│   💊 6 supplements to track    │
│                                 │
│   Small steps, big results.    │
│   Let's start your journey! 💜 │
│                                 │
│      [ Enter Healthy Me → ]     │
│                                 │
│         ● ● ● ● ●              │
└─────────────────────────────────┘
```

### Onboarding Best Practices (Health App Patterns)

Based on analysis of Noom, Flo, Fitbit, and MyFitnessPal:

1. **Progressive disclosure** — don't ask everything at once. 4-5 screens max. ✅ Our flow has 5 screens.
2. **Sensible defaults** — pre-fill with common values. ✅ We default to 1500 cal / 80g protein.
3. **Skip-friendly** — make most fields optional. ✅ PCOS type has "not sure yet", weight is optional.
4. **Educational context** — explain why you're asking. ✅ Each screen has helper text.
5. **Celebration at the end** — positive reinforcement. ✅ Character celebrating + summary.
6. **Quick completion** — 60-90 seconds total. ✅ Our flow is simple enough.
7. **Allow changes later** — don't create pressure to get it "right". ✅ Helper text says "change later".

**What we intentionally skip (for simplicity):**
- Weight/height for BMI calculation (invasive, not needed for MVP)
- Notification time preferences (good defaults in schema, can add in settings later)
- Pet selection (schema supports it, but character is static for now)
- Calendar/Apple Health integration (future feature)

### `useUserProfile` Hook

This is the KEY new hook that enables Feature 3 AND makes Feature 1/2 dynamic:

```typescript
// src/hooks/use-user-profile.ts

interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  calorieTarget: number;   // convenience: profile?.calorie_target ?? 1500
  proteinTarget: number;   // convenience: profile?.protein_target ?? 80
  isOnboarded: boolean;    // convenience: profile?.onboarding_complete ?? false
  refetch: () => Promise<void>;
}

// Query
async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data as UserProfile;
}

// Update
async function updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}
```

### Routing Logic

The app's entry point `src/app/index.tsx` currently redirects to tabs. It needs onboarding check:

```typescript
// src/app/index.tsx (modified)

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { isOnboarded, loading: profileLoading } = useUserProfile();

  if (authLoading || profileLoading) return <SplashScreen />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (!isOnboarded) return <Redirect href="/(onboarding)/welcome" />;
  return <Redirect href="/(tabs)" />;
}
```

The `(onboarding)` group uses a stack layout:
```typescript
// src/app/(onboarding)/_layout.tsx
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### Supplement Selection Logic

Currently, `use-supplements.ts` has a `DEFAULT_SUPPLEMENTS` array and seeds it when the user has none. For onboarding:

1. Show the default list with checkboxes on the supplements screen
2. User can uncheck supplements they don't take
3. User can add custom supplements (name + dosage)
4. On "Next", seed ONLY the selected supplements into `user_supplements` table
5. Mark `onboarding_complete = true` on the final screen

This means the `seedDefaults()` function in `use-supplements.ts` needs to be made smarter — it should NOT auto-seed if the user has gone through onboarding (they chose their stack). The current auto-seed behavior should only trigger if `!onboarding_complete` AND `supplements.length === 0` (fallback for existing users who haven't onboarded).

### File-by-File Changes

#### 1. `src/hooks/use-user-profile.ts` (NEW) — ~70 lines
- Fetches profile on mount
- Provides convenience getters: `calorieTarget`, `proteinTarget`, `isOnboarded`
- `updateProfile()` for saving changes
- Re-fetches on focus

#### 2. `src/app/(onboarding)/_layout.tsx` (NEW) — ~15 lines
- Stack layout, no headers
- Safe area wrapper with background color

#### 3. `src/app/(onboarding)/welcome.tsx` (NEW) — ~60 lines
- Character waving image
- Welcome text
- "Get Started" button → navigates to profile
- Progress dots (step 1/5)

#### 4. `src/app/(onboarding)/profile.tsx` (NEW) — ~100 lines
- Name input (TextInput, pre-filled from email split)
- PCOS type selector (list of touchable pills)
- Back button + Next button
- Saves to `user_profiles`: `display_name`, `pcos_type`

#### 5. `src/app/(onboarding)/goals.tsx` (NEW) — ~120 lines
- Calorie stepper (−/+ buttons, increment 50, range 800-3000)
- Protein stepper (−/+ buttons, increment 5, range 30-250)
- Weight input (optional, with lbs/kg toggle)
- Helper text with PCOS-specific recommendations
- Saves to `user_profiles`: `calorie_target`, `protein_target`, `goal_weight`, `weight_unit`

#### 6. `src/app/(onboarding)/supplements.tsx` (NEW) — ~130 lines
- Checkbox list of `DEFAULT_SUPPLEMENTS`
- All checked by default
- "Add Custom" button → inline form (name + dosage)
- Saves selected supplements to `user_supplements` table
- Does NOT auto-seed — only inserts what user selected

#### 7. `src/app/(onboarding)/complete.tsx` (NEW) — ~70 lines
- Character celebrating image
- Personalized message with name
- Summary of chosen targets
- "Enter Healthy Me" button → sets `onboarding_complete = true`, navigates to `/(tabs)`

#### 8. `src/components/onboarding/progress-dots.tsx` (NEW) — ~30 lines
- Props: `current: number`, `total: number`
- Row of dots: filled (purple) for current+past, outlined for future
- Reusable across all onboarding screens

#### 9. `src/components/onboarding/onboarding-card.tsx` (NEW) — ~25 lines
- Wrapper with consistent padding, max-width, background
- Used by all onboarding screens for content area

#### 10. `src/app/index.tsx` (MODIFIED) — ~20 lines total
- Add `useUserProfile()` hook
- Add onboarding redirect check

#### 11. `src/app/(tabs)/food.tsx` (MODIFIED) — ~5 lines changed
- Import `useUserProfile`
- Replace `const CALORIE_TARGET = 1500` → `const { calorieTarget: CALORIE_TARGET, proteinTarget: PROTEIN_TARGET } = useUserProfile()`
- Remove `const PROTEIN_TARGET = 80`

#### 12. `src/app/(tabs)/index.tsx` (MODIFIED) — ~5 lines changed
- Same as food.tsx — replace hardcoded targets with profile values

#### 13. `src/hooks/use-supplements.ts` (MODIFIED) — ~10 lines changed
- Modify `seedDefaults()` to check if user has completed onboarding
- If `onboarding_complete`, don't seed defaults (user chose their stack)
- If not onboarded and no supplements, seed defaults as fallback

### Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Existing user without onboarding** | High | Tina is already using the app. She should NOT be forced through onboarding. Check: if user has any data (food_logs, supplement_logs), set `onboarding_complete = true` automatically. Or: add a "Skip" button on welcome screen. |
| **Profile fetch timing on app load** | Medium | Profile query adds latency to app start. Keep it fast: query is indexed (PK lookup). Show splash screen during load. |
| **Stepper UX for targets** | Low | Ensure stepper values stay in sane ranges. Min 800 cal, max 3000. Min 30g protein, max 250g. |
| **Supplement deselection state** | Medium | Track which DEFAULT supplements are deselected. Only insert selected ones. Don't accidentally double-insert if user goes back and forward. |
| **Route guard race condition** | Medium | Ensure auth + profile are both loaded before redirect decision. Use combined loading state. |
| **Onboarding + existing supplements** | Medium | If user already has seeded supplements and then opens onboarding → the supplement screen should reflect what they already have. Fetch existing supplements on mount. |

### Dependencies
- **npm packages:** None new
- **Database migrations:** None (columns already exist in schema)
- **Assets:** character-waving.png, character-celebrating.png (already exist)

### Build Estimate
**3-4 hours** — 5 screens + 1 hook + routing logic + target replacement

### Build Order (within feature)
1. `use-user-profile.ts` hook (20 min) — enables everything
2. `progress-dots.tsx` + `onboarding-card.tsx` (15 min) — shared UI
3. `(onboarding)/_layout.tsx` (5 min) — routing
4. `welcome.tsx` screen (15 min) — simplest screen
5. `profile.tsx` screen (25 min) — name + PCOS type
6. `goals.tsx` screen (30 min) — steppers
7. `supplements.tsx` screen (35 min) — most complex
8. `complete.tsx` screen (15 min) — celebration + save
9. Modify `index.tsx` routing (10 min) — onboarding gate
10. Modify `food.tsx` + `index.tsx` targets (15 min) — dynamic targets
11. Modify `use-supplements.ts` (10 min) — conditional seed

---

## Overall Build Sequence

### Recommended Order: Feature 1 → Feature 3 → Feature 2

```
Phase 0: Pre-requisites                              ⏱ ~45 min
├── P0: DRY cleanup — toDateKey() consolidation      (30 min)
└── P1: Verify symptom_logs table exists              (15 min)

Phase 1: Feature 1 — Food Calendar                   ⏱ ~2.5 hours
├── 1a. MonthlyCalendar shared component              (40 min)
├── 1b. useFoodCalendar hook                          (30 min)
├── 1c. FoodCalendar + CalendarDayCell                (20 min)
├── 1d. DaySummaryCard                                (20 min)
└── 1e. Integrate into food.tsx                       (30 min)

Phase 2: Feature 3 — Onboarding                      ⏱ ~3.5 hours
├── 2a. useUserProfile hook                           (20 min)
├── 2b. Onboarding UI components                      (15 min)
├── 2c. All 5 onboarding screens                      (120 min)
├── 2d. Routing gate in index.tsx                     (10 min)
├── 2e. Replace hardcoded targets in food + home      (15 min)
└── 2f. Update use-supplements conditional seed       (10 min)

Phase 3: Feature 2 — Health Tab                       ⏱ ~4.5 hours
├── 3a. Install gifted-charts + react-native-svg      (10 min)
├── 3b. TimeRangeSelector                             (15 min)
├── 3c. useHealthTrends hook                          (45 min)
├── 3d. MoodEnergyTrendCard (first chart — validate)  (40 min)
├── 3e. NutritionTrendCard                            (30 min)
├── 3f. SymptomFrequencyCard                          (25 min)
├── 3g. usePeriodCalendar + PeriodCalendarCard        (50 min)
├── 3h. WeightTrendCard                               (20 min)
└── 3i. HealthDashboard + rewrite health.tsx          (20 min)

TOTAL ESTIMATED: ~11 hours
```

### Why This Order

1. **Feature 1 first** — Produces the `MonthlyCalendar` shared component that Feature 2's Period Calendar needs. Also the simplest feature — quick win, builds momentum.

2. **Feature 3 second** — The `useUserProfile` hook is needed by both Feature 2 (calorie target line on nutrition chart) and the existing Food/Home tabs. Building it here ensures Feature 2 can reference dynamic targets instead of hardcoded ones.

3. **Feature 2 last** — Most complex feature, highest risk (new npm dependency, charting library web compat). Benefits from both shared calendar (Feature 1) and dynamic targets (Feature 3) being available.

### Cross-Feature Dependencies

```
MonthlyCalendar ──────────────────> PeriodCalendarCard (Feature 2)
  (Feature 1)                 ┌──> NutritionTrendCard target line (Feature 2)
                              │
useUserProfile ──────────────┤──> food.tsx dynamic targets
  (Feature 3)                 └──> index.tsx dynamic targets

toDateKey() cleanup ──────────────> All hooks (Pre-req)
```

### New Files Summary (All Features)

| # | File | Feature | Lines (est) |
|---|------|---------|-------------|
| 1 | `src/components/shared/monthly-calendar.tsx` | F1 | ~120 |
| 2 | `src/hooks/use-food-calendar.ts` | F1 | ~80 |
| 3 | `src/components/food/food-calendar.tsx` | F1 | ~60 |
| 4 | `src/components/food/day-summary-card.tsx` | F1 | ~80 |
| 5 | `src/hooks/use-user-profile.ts` | F3 | ~70 |
| 6 | `src/app/(onboarding)/_layout.tsx` | F3 | ~15 |
| 7 | `src/app/(onboarding)/welcome.tsx` | F3 | ~60 |
| 8 | `src/app/(onboarding)/profile.tsx` | F3 | ~100 |
| 9 | `src/app/(onboarding)/goals.tsx` | F3 | ~120 |
| 10 | `src/app/(onboarding)/supplements.tsx` | F3 | ~130 |
| 11 | `src/app/(onboarding)/complete.tsx` | F3 | ~70 |
| 12 | `src/components/onboarding/progress-dots.tsx` | F3 | ~30 |
| 13 | `src/components/onboarding/onboarding-card.tsx` | F3 | ~25 |
| 14 | `src/hooks/use-health-trends.ts` | F2 | ~120 |
| 15 | `src/hooks/use-period-calendar.ts` | F2 | ~60 |
| 16 | `src/components/health/time-range-selector.tsx` | F2 | ~50 |
| 17 | `src/components/health/mood-energy-trend.tsx` | F2 | ~80 |
| 18 | `src/components/health/nutrition-trend.tsx` | F2 | ~80 |
| 19 | `src/components/health/period-calendar-card.tsx` | F2 | ~90 |
| 20 | `src/components/health/symptom-frequency.tsx` | F2 | ~70 |
| 21 | `src/components/health/weight-trend.tsx` | F2 | ~70 |
| 22 | `src/components/health/health-dashboard.tsx` | F2 | ~60 |
| **Total** | **22 new files** | | **~1,640 lines** |

### Modified Files Summary

| File | What Changes |
|------|-------------|
| `src/hooks/use-mood-energy.ts` | Replace getTodayDate → toDateKey |
| `src/hooks/use-symptom-log.ts` | Replace getTodayDate → toDateKey |
| `src/hooks/use-daily-log.ts` | Replace getTodayDate → toDateKey |
| `src/hooks/use-weight.ts` | Replace getTodayDate → toDateKey |
| `src/hooks/use-supplements.ts` | Replace getTodayDate → toDateKey + conditional seed |
| `src/hooks/use-exercises.ts` | Replace getTodayDate → toDateKey |
| `src/app/(tabs)/index.tsx` | Replace getTodayDate → toDateKey + dynamic targets |
| `src/app/(tabs)/food.tsx` | Calendar toggle + dynamic targets |
| `src/app/(tabs)/health.tsx` | Complete rewrite |
| `src/app/index.tsx` | Onboarding routing gate |
| **Total** | **10 modified files** |

### New npm Dependencies
| Package | Required By | Install Command |
|---------|------------|-----------------|
| `react-native-gifted-charts` | Feature 2 | `npx expo install react-native-gifted-charts` |
| `react-native-svg` | Feature 2 (gifted-charts peer dep) | `npx expo install react-native-svg` |

### Database Migrations
| Migration | Required By | Notes |
|-----------|------------|-------|
| `003_add_symptom_logs.sql` | Feature 2 (if not already in prod) | Creates symptom_logs table |

---

## Appendix: Key Corrections to Previous Plan

| # | Previous Plan Said | Reality | Impact |
|---|-------------------|---------|--------|
| 1 | "getTodayDate() uses toISOString() — timezone bug" | All hooks use manual local-date arithmetic (identical to `toDateKey`). No bug exists. | Lower priority — DRY cleanup only |
| 2 | "calorie target is 1500, protein target is 100g" | Protein target is 80g (in code AND database default) | Onboarding defaults should be 80g, not 100g |
| 3 | "symptom_logs table" assumed to exist | Not in any migration file | Need to verify in production or create migration |
| 4 | "2-3 days" for Feature 1, "4-5 days" for Feature 2 | 2.5 hours and 4.5 hours respectively (full-time focused dev) | Plan's "days" were more calendar time with context switching |
| 5 | Feature 1 plan suggests `CalendarDayCell` as separate component | It's simpler as inline rendering within `MonthlyCalendar` via `renderDay` prop | Less files, more flexible |
| 6 | Plan doesn't mention `useUserProfile` hook | Critical for Feature 3 AND making targets dynamic across the app | Key cross-cutting concern |
