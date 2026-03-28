# Healthy Me — Next Features Plan

> Generated: 2026-03-27
> Status: PLANNING (no code written)

---

## Table of Contents

1. [Feature 1: Food Calendar / History View](#feature-1-food-calendar--history-view)
2. [Feature 2: Health Tab — Trend Graphs + Period Calendar](#feature-2-health-tab--trend-graphs--period-calendar)
3. [Charting Library Recommendation](#charting-library-recommendation)
4. [Timezone Bug Fix (Pre-requisite)](#timezone-bug-fix-pre-requisite)
5. [Implementation Order](#implementation-order)

---

## Charting Library Recommendation

### Winner: `react-native-gifted-charts`

**Why this library:**
- ✅ **Expo web compatible** — works on web, iOS, Android
- ✅ **Dependencies already installed** — needs `react-native-svg` (add) + `expo-linear-gradient` (already in package.json)
- ✅ **Actively maintained** (last updated April 2025)
- ✅ **Lightweight** — no native modules beyond SVG
- ✅ **Chart types we need:** Line charts (trends), Bar charts (nutrient breakdown), Pie/Donut (macros)
- ✅ **Customizable colors** — can match our pastel pixel art theme
- ✅ **Animations** — smooth transitions between data views

**Installation:**
```bash
npx expo install react-native-gifted-charts react-native-svg
```
(`expo-linear-gradient` is already installed)

**Alternative considered:** Recharts (web-only, no RN support), Victory Native (heavier, more complex setup), react-native-chart-kit (unmaintained).

---

## Timezone Bug Fix (Pre-requisite)

**⚠️ CRITICAL: Fix before building either feature.**

Several hooks use `new Date().toISOString().split('T')[0]` to get today's date. This returns UTC, not local time. At 5 PM PST, `toISOString()` returns the *next day* in UTC.

### Affected files:
- `src/hooks/use-mood-energy.ts` — `getTodayDate()` uses `toISOString()`
- `src/hooks/use-symptom-log.ts` — `getTodayDate()` uses `toISOString()`
- `src/hooks/use-daily-log.ts` — `getTodayDate()` uses `toISOString()`
- `src/hooks/use-weight.ts` — `getTodayDate()` uses `toISOString()`

### Fix:
Replace all `getTodayDate()` implementations with the existing `toDateKey()` from `src/utils/storage.ts`:

```typescript
// ✅ CORRECT — already exists in utils/storage.ts
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

Each hook's `getTodayDate()` should become `toDateKey(new Date())` importing from `../utils/storage`.

**The food tab already uses `toDateKey()` correctly** — this is why food logs work but mood/symptoms could be off by a day.

---

## Feature 1: Food Calendar / History View

### Overview
Extend the Food tab to let users browse past days via a calendar/date picker, see daily summaries at a glance, and tap into any day to see full meal details. The existing arrow navigation stays, but a tappable calendar view is added.

### Complexity: **Medium** (2-3 days)
- Most data infrastructure exists (food_logs, useFoodLog hook)
- Main work is new UI components + a new range-fetch hook

---

### 1.1 Technical Plan

#### New Components

| Component | File | Purpose |
|-----------|------|---------|
| `FoodCalendar` | `src/components/food/food-calendar.tsx` | Monthly calendar grid with colored dots showing logged days |
| `DaySummaryCard` | `src/components/food/day-summary-card.tsx` | Compact card showing one day's totals (cal, protein, # meals) |
| `CalendarDayCell` | `src/components/food/calendar-day-cell.tsx` | Individual day cell with dot indicators |

#### New Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useFoodCalendar` | `src/hooks/use-food-calendar.ts` | Fetch monthly summary data (dates that have entries + daily totals) |

#### Modified Files

| File | Changes |
|------|---------|
| `src/app/(tabs)/food.tsx` | Add calendar toggle button, integrate FoodCalendar component, add "calendar view" vs "day view" mode |
| `src/hooks/use-food-log.ts` | No changes needed — already accepts any date string |

---

### 1.2 Database Queries (Supabase)

#### Query 1: Monthly summary (which days have data + totals)

```typescript
// Fetch all food logs for a given month to compute per-day summaries
const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
const endDate = `${year}-${String(month + 1).padStart(2, '0')}-01`; // handle Dec→Jan rollover with date-fns

const { data, error } = await supabase
  .from('food_logs')
  .select('log_date, calories, protein, carbs, fat, meal_type')
  .eq('user_id', user.id)
  .gte('log_date', startDate)
  .lt('log_date', endDate)
  .order('log_date', { ascending: true });
```

Then aggregate client-side into a `Map<string, DaySummary>`:
```typescript
interface DaySummary {
  date: string;          // YYYY-MM-DD
  totalCalories: number;
  totalProtein: number;
  mealCount: number;
  hasBreakfast: boolean;
  hasLunch: boolean;
  hasDinner: boolean;
  hasSnack: boolean;
}
```

**Why client-side aggregation:** Supabase doesn't support GROUP BY in the JS client without RPC. The data volume is small (max ~120 rows/month = 4 meals × 30 days). One query, fast aggregation.

#### Query 2: Specific day's entries (already exists)

The existing `useFoodLog(dateKey)` hook already handles this perfectly — just pass the selected date.

---

### 1.3 UI Wireframe

```
┌─────────────────────────────────────┐
│         ◀  March 2026  ▶           │  ← Month navigation (PressStart2P)
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Su  Mo  Tu  We  Th  Fr  Sa │   │  ← Silkscreen font, muted
│  │                             │   │
│  │      1   2   3   4   5   6 │   │
│  │  ●       ●   ●       ●     │   │  ← Purple dots = has food data
│  │                             │   │
│  │  7   8   9  10  11  12  13 │   │
│  │  ●   ●   ●   ●   ●        │   │
│  │                    ▲        │   │
│  │               [selected]    │   │  ← Selected day: purple bg, white text
│  │                             │   │
│  │ 14  15  16  17  18  19  20 │   │
│  │ ...                         │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─ DAY SUMMARY (selected day) ──┐ │  ← White card, purple left border
│  │                                │ │
│  │  Thursday, Mar 12             │ │  ← Silkscreen, textSecondary
│  │  🔥 1,245 cal  💪 72g protein │ │  ← Purple text, bold-ish
│  │  🍽 3 meals logged            │ │
│  │                                │ │
│  │  🌅 Breakfast  · 380 cal     │ │  ← Meal type dots
│  │  🌞 Lunch      · 520 cal     │ │
│  │  🌆 Dinner     · 345 cal     │ │
│  │                                │ │
│  │  [View Full Day →]            │ │  ← Tapping navigates to day view
│  └────────────────────────────────┘ │
│                                     │
│  Legend:                            │
│  ● = meals logged  ○ = no data     │
└─────────────────────────────────────┘
```

**Calendar Day Cell States:**
- **No data:** Just the number, muted color
- **Has data:** Number + small purple dot below
- **Selected:** Purple background circle, white text
- **Today:** Outlined circle (babyBlue border), bold number
- **Future dates:** Grayed out, not tappable

**Color mapping for dots:**
- 🟣 Purple dot: ≥3 meals logged (great day!)
- 🔵 Blue dot: 1-2 meals logged
- No dot: no data

**Card styling:**
- White background (`Colors.cardBackground`)
- 4px left border in `Colors.purple`
- `Shadows.card` for elevation
- `BorderRadius.lg` (16px)

---

### 1.4 Interaction Flow

1. **Default state:** Food tab opens in "day view" (current behavior) showing today
2. **Calendar toggle:** A small calendar icon button (📅) in the top-right of the date navigation bar
3. **Tap calendar icon → calendar view slides down** (animated, 300ms)
4. **Tap a day in the calendar:**
   - Day summary card appears below calendar
   - Calendar stays visible
5. **Tap "View Full Day →" or double-tap a day:**
   - Calendar collapses
   - Day view shows that date (reuses existing food tab UI with arrow navigation)
6. **Arrow navigation still works** in both views — in calendar view it changes months, in day view it changes days

---

### 1.5 Hook: `useFoodCalendar`

```typescript
interface UseFoodCalendarReturn {
  summaries: Map<string, DaySummary>;  // dateKey → summary
  loading: boolean;
  month: number;       // 0-indexed
  year: number;
  goNextMonth: () => void;
  goPrevMonth: () => void;
  goToMonth: (year: number, month: number) => void;
}
```

**Behavior:**
- Fetches all food_logs for the displayed month in one query
- Aggregates client-side into `Map<string, DaySummary>`
- Re-fetches when month/year changes
- Caches previous months in a `useRef<Map>` to avoid re-fetching when navigating back
- Uses `date-fns` (already installed) for month arithmetic: `startOfMonth`, `endOfMonth`, `format`, `eachDayOfInterval`

---

### 1.6 Edge Cases

| Case | Handling |
|------|----------|
| **No data for selected day** | Show empty state: character image + "No meals logged this day" |
| **No data for entire month** | Show calendar with no dots + message: "No meals logged in March" |
| **Timezone** | All date keys use `toDateKey()` (local time). Never use `toISOString()`. Month boundaries computed with local dates via date-fns. |
| **Month with partial data** | Calendar correctly shows dots only on logged days |
| **Rapid month switching** | Debounce or cancel previous fetch when month changes. Use `AbortController` or check if month still matches after fetch returns. |
| **Future months** | Allow viewing (calendar shows but future dates are grayed out, not tappable) |
| **Very old data** | No limit on how far back. Calendar works for any month. |
| **Entries added while in calendar view** | When switching back to day view or re-selecting today, `useFoodLog` refetches. Calendar view should also refetch current month on focus. |

---

## Feature 2: Health Tab — Trend Graphs + Period Calendar

### Overview
Replace the "Coming soon" placeholder with a full health dashboard: mood/energy trends, calorie/protein trends, period calendar with flow indicators, and symptom frequency breakdown.

### Complexity: **High** (4-5 days)
- Multiple data sources to query and visualize
- New charting dependency
- Several new components
- Period calendar is its own sub-feature

---

### 2.1 Technical Plan

#### New Components

| Component | File | Purpose |
|-----------|------|---------|
| `HealthDashboard` | `src/components/health/health-dashboard.tsx` | Main container orchestrating all health cards |
| `MoodEnergyTrendCard` | `src/components/health/mood-energy-trend.tsx` | Line chart showing mood & energy over time |
| `NutritionTrendCard` | `src/components/health/nutrition-trend.tsx` | Line/bar chart showing calories & protein over time |
| `PeriodCalendarCard` | `src/components/health/period-calendar.tsx` | Monthly calendar with flow-level colored dots |
| `SymptomFrequencyCard` | `src/components/health/symptom-frequency.tsx` | Bar chart or heatmap of symptom occurrences |
| `WeightTrendCard` | `src/components/health/weight-trend.tsx` | Line chart showing weight over time |
| `TimeRangeSelector` | `src/components/health/time-range-selector.tsx` | Pill selector: "7D · 30D · 90D" |
| `TrendLine` | `src/components/health/trend-line.tsx` | Reusable wrapper around gifted-charts LineChart |

#### New Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useHealthTrends` | `src/hooks/use-health-trends.ts` | Fetch mood, energy, symptoms, food totals for a date range |
| `usePeriodCalendar` | `src/hooks/use-period-calendar.ts` | Fetch period_logs for a month |

#### Modified Files

| File | Changes |
|------|---------|
| `src/app/(tabs)/health.tsx` | Complete rewrite — replace placeholder with HealthDashboard |

---

### 2.2 Database Queries (Supabase)

#### Query 1: Mood & Energy trends (from `symptoms` table)

```typescript
const { data, error } = await supabase
  .from('symptoms')
  .select('log_date, mood, energy_level')
  .eq('user_id', user.id)
  .gte('log_date', startDate)   // e.g. '2026-03-01'
  .lte('log_date', endDate)     // e.g. '2026-03-27'
  .not('mood', 'is', null)
  .order('log_date', { ascending: true });
```

**Output shape for chart:**
```typescript
interface MoodEnergyPoint {
  date: string;
  mood: number;      // 1-5
  energy: number;    // 1-5
}
```

#### Query 2: Nutrition trends (from `food_logs` table)

```typescript
const { data, error } = await supabase
  .from('food_logs')
  .select('log_date, calories, protein, carbs, fat')
  .eq('user_id', user.id)
  .gte('log_date', startDate)
  .lte('log_date', endDate)
  .order('log_date', { ascending: true });
```

Aggregate client-side per day:
```typescript
interface DailyNutrition {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
```

#### Query 3: Period logs (from `period_logs` table)

```typescript
const { data, error } = await supabase
  .from('period_logs')
  .select('log_date, flow, cramps, headache, back_pain')
  .eq('user_id', user.id)
  .gte('log_date', monthStart)
  .lt('log_date', nextMonthStart)
  .order('log_date', { ascending: true });
```

#### Query 4: Symptom frequency (from `symptom_logs` table)

```typescript
const { data, error } = await supabase
  .from('symptom_logs')
  .select('symptom_type, severity, log_date')
  .eq('user_id', user.id)
  .gte('log_date', startDate)
  .lte('log_date', endDate);
```

Aggregate client-side:
```typescript
interface SymptomFrequency {
  type: SymptomType;
  count: number;
  avgSeverity: number;
}
```

#### Query 5: Weight trend (from `weight_logs` table)

```typescript
const { data, error } = await supabase
  .from('weight_logs')
  .select('log_date, weight')
  .eq('user_id', user.id)
  .gte('log_date', startDate)
  .lte('log_date', endDate)
  .order('log_date', { ascending: true });
```

---

### 2.3 Hook: `useHealthTrends`

```typescript
interface UseHealthTrendsReturn {
  moodEnergy: MoodEnergyPoint[];
  nutrition: DailyNutrition[];
  symptoms: SymptomFrequency[];
  weight: { date: string; weight: number }[];
  loading: boolean;
  range: '7d' | '30d' | '90d';
  setRange: (range: '7d' | '30d' | '90d') => void;
}
```

**Behavior:**
- Computes `startDate` and `endDate` from `range` using local dates (`toDateKey`)
- Fires all 4 queries in parallel via `Promise.all`
- Aggregates food_logs and symptom_logs client-side
- Re-fetches when `range` changes
- Uses `useFocusEffect` to refetch when tab gains focus

---

### 2.4 UI Wireframe

```
┌──────────────────────────────────────────┐
│  HEALTH                                   │  ← PressStart2P, purple
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  [7D]  [30D]  [90D]                 │ │  ← Time range pills
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌── 😊 MOOD & ENERGY ──────────────────┐ │  ← White card, pink left border
│  │                                        │ │
│  │  5 ┤ ·    ·                           │ │
│  │  4 ┤    · ╱ ╲  ·  · ──── mood (purple)│ │
│  │  3 ┤  ╱      ╲╱                       │ │
│  │  2 ┤╱              ──── energy (blue)  │ │
│  │  1 ┤                                   │ │
│  │    └──┬──┬──┬──┬──┬──┬──             │ │
│  │      M  T  W  T  F  S  S             │ │
│  │                                        │ │
│  │  Avg mood: 3.8  Avg energy: 3.2       │ │
│  └────────────────────────────────────────┘ │
│                                            │
│  ┌── 🔥 NUTRITION ──────────────────────┐ │  ← White card, green left border
│  │                                        │ │
│  │  [Bar chart: daily calories]           │ │
│  │  ████  ██  ████  ███  ████  ██  ████  │ │  ← Purple bars
│  │  1200 850 1450 1100 1500 900 1350     │ │
│  │   M    T    W    T    F    S    S     │ │
│  │                                        │ │
│  │  Target line at 1500 ─ ─ ─ ─ ─       │ │  ← Dashed line (pink)
│  │                                        │ │
│  │  Avg: 1,193 cal · 68g protein         │ │
│  └────────────────────────────────────────┘ │
│                                            │
│  ┌── 🩸 PERIOD TRACKER ────────────────┐ │  ← White card, pink left border
│  │                                        │ │
│  │         ◀  March 2026  ▶              │ │
│  │                                        │ │
│  │  Su  Mo  Tu  We  Th  Fr  Sa          │ │
│  │                                        │ │
│  │      1   2   3   4   5   6           │ │
│  │                                        │ │
│  │  7   8   9  10  11  12  13           │ │
│  │          🔴  🔴  🟠                    │ │  ← Flow dots under dates
│  │                                        │ │
│  │  14  15  16  17  18  19  20          │ │
│  │  🟡                                    │ │
│  │  ...                                   │ │
│  │                                        │ │
│  │  Legend: 🔴 heavy  🟠 medium          │ │
│  │          🟡 light  ⚪ spotting         │ │
│  └────────────────────────────────────────┘ │
│                                            │
│  ┌── 🤒 SYMPTOM FREQUENCY ─────────────┐ │  ← White card, orange left border
│  │                                        │ │
│  │  Bloating    ████████████  8x  avg 2.3│ │  ← Horizontal bars
│  │  Fatigue     ██████████    6x  avg 3.1│ │
│  │  Acne        ████████      5x  avg 2.0│ │
│  │  Brain fog   ██████        4x  avg 1.8│ │
│  │  Cravings    ████          3x  avg 2.5│ │
│  │  Headache    ██            1x  avg 3.0│ │
│  │                                        │ │
│  │  Most common: Bloating (8 days)       │ │
│  └────────────────────────────────────────┘ │
│                                            │
│  ┌── ⚖️ WEIGHT ──────────────────────────┐ │  ← White card, mint left border
│  │                                        │ │
│  │  [Line chart: weight over time]        │ │
│  │                                        │ │
│  │  Current: 145.2 lbs                   │ │
│  │  Change: -2.3 lbs (30 days)           │ │
│  └────────────────────────────────────────┘ │
│                                            │
└──────────────────────────────────────────────┘
```

---

### 2.5 Card Design Spec

Each card follows this structure:

```
┌─────────────────────────────────────┐
│ ← 4px colored left border          │
│                                     │
│  [emoji] CARD TITLE                 │  ← Silkscreen, purple, bold
│                                     │
│  [chart/content area]               │
│                                     │
│  [summary stats below chart]        │  ← Silkscreen, textMuted, small
│                                     │
└─────────────────────────────────────┘
```

**Border colors per card:**
| Card | Left border color |
|------|------------------|
| Mood & Energy | `Colors.pink` (#ff80ab) |
| Nutrition | `Colors.mint` (#b2dfdb) |
| Period Tracker | `Colors.softPink` (#fce4ec) with `Colors.pink` border |
| Symptom Frequency | `Colors.warning` (#ffb74d) |
| Weight | `Colors.babyBlue` (#81d4fa) |

**Chart theming (gifted-charts props):**
```typescript
// Common chart config
const chartTheme = {
  backgroundColor: 'transparent',
  color: Colors.purple,           // Primary data color
  yAxisTextStyle: { fontFamily: Fonts.body, fontSize: 10, color: Colors.textMuted },
  xAxisLabelTextStyle: { fontFamily: Fonts.body, fontSize: 10, color: Colors.textMuted },
  rulesColor: Colors.tabBarBorder,
  rulesType: 'dashed',
  spacing: 40,                    // Between data points
  initialSpacing: 10,
};
```

---

### 2.6 Time Range Selector Component

```
┌──────────────────────────────────┐
│   [ 7D ]   [ 30D ]   [ 90D ]   │
└──────────────────────────────────┘
```

- Pills styled like the meal type pills in food.tsx
- Active pill: `Colors.purple` bg, white text
- Inactive pill: `Colors.background` bg, `Colors.textSecondary` text
- Sticky at top of scroll (or just below the title)
- Default: `7D`
- Applies to: Mood/Energy, Nutrition, Symptoms, Weight
- Period calendar has its own month navigation (independent of time range)

---

### 2.7 Gifted Charts Implementation Details

#### Mood & Energy Line Chart

```typescript
// Two lines: mood (purple) and energy (babyBlue)
<LineChart
  data={moodData}       // [{ value: 4, label: 'Mon' }, ...]
  data2={energyData}    // [{ value: 3, label: 'Mon' }, ...]
  color1={Colors.purple}
  color2={Colors.babyBlue}
  maxValue={5}
  noOfSections={5}
  curved
  thickness={2}
  dataPointsColor1={Colors.purple}
  dataPointsColor2={Colors.babyBlue}
  dataPointsRadius={4}
  // ... chartTheme props
/>
```

#### Nutrition Bar Chart

```typescript
<BarChart
  data={calorieData}    // [{ value: 1200, label: 'Mon', frontColor: Colors.purple }, ...]
  maxValue={2000}
  barWidth={24}
  barBorderRadius={4}
  showReferenceLine1
  referenceLine1Position={1500}  // target line
  referenceLine1Config={{ color: Colors.pink, dashWidth: 4, dashGap: 3 }}
  // ... chartTheme props
/>
```

#### Symptom Frequency Horizontal Bar

gifted-charts supports horizontal bars. Alternatively, build with plain Views (horizontal bars are simple enough):

```typescript
// For each symptom type:
<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <Text style={styles.symptomLabel}>{symptomName}</Text>
  <View style={[styles.bar, { width: `${(count / maxCount) * 100}%` }]} />
  <Text style={styles.symptomCount}>{count}x</Text>
</View>
```

This avoids over-engineering — horizontal bars with RN Views are simpler and more customizable than using a chart library.

#### Weight Line Chart

```typescript
<LineChart
  data={weightData}
  color={Colors.mint}
  curved
  thickness={2}
  dataPointsColor={Colors.mint}
  areaChart           // filled area below line
  startFillColor={Colors.mint + '40'}  // 25% opacity
  endFillColor={Colors.mint + '10'}
  // ... chartTheme props
/>
```

---

### 2.8 Period Calendar Design

Reuse the calendar grid pattern from Feature 1's `FoodCalendar`, but with different dot logic:

**Flow level → dot color:**
| Flow | Color | Dot |
|------|-------|-----|
| Heavy | `#e57373` (Colors.error) | 🔴 Large dot |
| Medium | `#ffb74d` (Colors.warning) | 🟠 Medium dot |
| Light | `#fff176` (yellow) | 🟡 Small dot |
| Spotting | `#e0e0e0` (light gray) | ⚪ Tiny dot |

**Interaction:**
- Tap a day with period data → show flow details + symptoms (cramps, headache, back_pain) in a small tooltip/popover below the calendar
- Long-press a day → quick-add period log for that day (modal)

**Cycle estimation (stretch goal):**
- If ≥2 months of period data exist, calculate average cycle length
- Show predicted next period as faded/outlined dots
- Label: "Predicted: ~Mar 28 (28-day avg)"

---

### 2.9 Edge Cases

| Case | Handling |
|------|----------|
| **No mood/energy data** | Show empty chart with message: "Start logging mood & energy on the Home tab to see trends here!" with link/pointer |
| **No food data** | Show empty nutrition card: "Log meals in the Food tab to track nutrition trends" |
| **No period data** | Show empty calendar: "Tap any day to start tracking your period" |
| **No symptom data** | Show empty bar chart: "Log symptoms from the Home tab to see patterns" |
| **No weight data** | Show empty chart: "Log your weight to see trends over time" |
| **Only 1 data point** | Show a single dot on the chart instead of a line. Label: "Keep logging to see trends!" |
| **Gaps in data** | Line charts should handle gaps gracefully — don't connect distant points. If gap > 3 days, break the line. gifted-charts supports this via separate data segments. |
| **Timezone** | ALL date operations use `toDateKey()` / local date methods. Never `toISOString()`. |
| **7D range with sparse data** | Show all 7 days on x-axis even if some have no data (null/empty points) |
| **90D range readability** | For 90-day range: aggregate to weekly averages to avoid overcrowded charts. Show ~13 data points instead of 90. |
| **Large datasets** | Period calendar fetches 1 month at a time. Trends fetch max 90 days. No risk of huge payloads. |
| **Screen width** | Charts must be responsive. Use `Dimensions.get('window').width - padding` for chart width. gifted-charts accepts `width` prop. |
| **Scroll performance** | Health tab will have 5+ cards. Use `ScreenWrapper scrollable` (already exists). Consider lazy-loading lower cards (render chart only when visible — use `onLayout` or intersection observer). |

---

## Implementation Order

### Recommended sequence:

```
Phase 0: Timezone fix (Pre-requisite)              ⏱ 30 min
  └─ Fix getTodayDate() in 4 hooks

Phase 1: Install charting library                   ⏱ 15 min
  └─ npx expo install react-native-gifted-charts react-native-svg

Phase 2: Food Calendar (Feature 1)                  ⏱ 2-3 days
  ├─ 2a. Build useFoodCalendar hook
  ├─ 2b. Build CalendarDayCell component
  ├─ 2c. Build FoodCalendar component
  ├─ 2d. Build DaySummaryCard component
  └─ 2e. Integrate into food.tsx (calendar toggle)

Phase 3: Health Tab — Core (Feature 2)              ⏱ 4-5 days
  ├─ 3a. Build TimeRangeSelector component
  ├─ 3b. Build useHealthTrends hook
  ├─ 3c. Build MoodEnergyTrendCard (line chart)
  ├─ 3d. Build NutritionTrendCard (bar chart)
  ├─ 3e. Build SymptomFrequencyCard (horizontal bars)
  ├─ 3f. Build usePeriodCalendar hook
  ├─ 3g. Build PeriodCalendarCard (calendar + dots)
  ├─ 3h. Build WeightTrendCard (line chart)
  └─ 3i. Compose HealthDashboard + rewrite health.tsx
```

### Why this order:

1. **Timezone fix first** — prevents data corruption in all new features
2. **Food Calendar first** — simpler, faster win, builds calendar component that Period Calendar reuses
3. **Health Tab second** — more complex, benefits from calendar component already built
4. **Within Health Tab:** Start with mood/energy (simplest chart), then nutrition (similar pattern), then symptoms (custom bars), then period calendar (most complex), then weight (simple line chart)

### Shared Components to Extract:

Both features need a calendar grid. Build it once:

```
src/components/shared/
  └─ monthly-calendar.tsx    ← Reusable calendar grid
                               Props: month, year, renderDay, onDayPress, onMonthChange
                               Used by: FoodCalendar, PeriodCalendarCard
```

This reduces duplication and ensures consistent styling between the food calendar and period calendar.

---

## Summary

| Feature | New Files | Modified Files | Complexity | Dependencies |
|---------|-----------|---------------|------------|--------------|
| Timezone Fix | 0 | 4 hooks | Low (30 min) | None |
| Food Calendar | ~4 components + 1 hook | food.tsx | Medium (2-3 days) | date-fns (existing) |
| Health Tab | ~8 components + 2 hooks | health.tsx | High (4-5 days) | react-native-gifted-charts, react-native-svg (new) |
| **Total** | ~12 new files | 5 modified | **~7-9 days** | 2 new packages |
