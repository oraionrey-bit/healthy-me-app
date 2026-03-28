# Food Calendar UI Research — Healthy Me

> Research compiled for the "Healthy Me" kawaii PCOS health tracker PWA.
> Focus: Calendar/history views for food logging + health tracking.

---

## App-by-App Analysis

### 1. MyFitnessPal

**Calendar Pattern:** Horizontal week strip (primary) + date picker for jumping to any day

**Key Design Details:**
- **Week strip at top:** Shows Mon–Sun as tappable day circles at the top of the "Today" tab. Current day is highlighted. Swipe left/right to navigate whole weeks at a time.
- **Day view is primary:** The main screen is a single-day food diary (Breakfast → Lunch → Dinner → Snacks) with calorie totals per meal and a running daily total.
- **Date picker popup:** Tapping "Today" at the top opens a full month calendar overlay for jumping to any date.
- **Daily totals at a glance:** The week strip does NOT show per-day summaries — it's purely for navigation. You must tap into a day to see its data.
- **"Day Complete" button:** Sits below meals to mark a day as finished logging.
- **Weekly Digest (premium):** A summary report showing the past week's nutrition breakdown, food group insights (vegetables, proteins, sweets, etc.), and logging streaks.

**Navigation UX:**
- Swipe the week strip left/right to move between weeks
- Tap any day circle to jump to it
- Tap "Today" label → full month calendar popup
- No visual indicator of which days have data vs. which are empty

**Strengths:** Fast day-to-day navigation via week strip. Familiar pattern.
**Weaknesses:** No at-a-glance view of daily quality/completeness. Week strip is navigation-only, no data preview. Users complained about the redesigned Today tab requiring too many taps.

---

### 2. Flo Period Tracker

**Calendar Pattern:** Full month grid + home screen circle/week strip

**Key Design Details:**
- **Home screen:** Large circle showing cycle day countdown ("X days until period"). Below it, a horizontal week strip with colored indicators per day.
- **Color coding on calendar grid:**
  - 🔴 Red/pink = period days (actual and predicted)
  - 🔵 Blue circle = ovulation day
  - Light blue highlight = fertile window
  - Bold white outline = current day
  - Gray = logged symptoms
- **Prediction overlays:** Predicted period days shown with lighter/hatched red vs. confirmed logged days in solid red.
- **Calendar tab:** Full month grid view with the same color coding. Tap a day → shows detailed symptoms, flow level, mood, and app-generated insights for that day.
- **Cycle phases (redesign proposals):** Purple = follicular, green = luteal phases, extending the color vocabulary beyond just period/ovulation.

**Navigation UX:**
- Swipe left/right on week strip (home screen)
- Tap Calendar tab → full month grid, swipe between months
- Tap any day → detailed symptom/flow log for that day
- Visual cues consistent between week strip and month grid

**Data Density:**
- **At a glance:** Period days, ovulation, fertile window (via color)
- **On tap:** Flow level (light/medium/heavy), mood, symptoms list, predictions, tips

**Strengths:** Excellent use of color to encode data types at a glance. Predicted vs. actual visually distinct. Minimalist but information-dense.
**Weaknesses:** Limited to reproductive cycle data — not designed for food/nutrition tracking.

**🌟 KEY INSIGHT FOR HEALTHY ME:** Flo's dot/color system on the month grid is the gold standard for "glanceable" health data. Multiple data types encoded as colors on a single calendar grid.

---

### 3. Lose It!

**Calendar Pattern:** Single-day diary with date navigation

**Key Design Details:**
- **Day-focused view:** Main screen shows today's food log organized by meal (Breakfast, Lunch, Dinner, Snacks).
- **Calorie budget bar:** Prominent horizontal progress bar at top showing calories consumed vs. budget. Changes color (green → yellow → red) as you approach/exceed limit.
- **Day navigation:** Left/right arrows flanking the date header. Swipe horizontally to move between days.
- **"Day Complete" button:** Below meals section.
- **No full calendar grid:** The app doesn't offer a traditional month grid view. History browsing is primarily day-by-day via arrow navigation.
- **Weekly summary:** Available in reports section showing bar charts of calories per day for the week.

**Navigation UX:**
- Swipe or tap arrows to move day-by-day
- No month calendar for jumping to arbitrary dates (major UX gap)
- Tab bar lean and minimal

**Strengths:** Very clean, focused single-day view. Calorie budget bar with color change is instantly readable.
**Weaknesses:** Painful to browse history — day-by-day only. No calendar overview means you can't spot patterns visually.

---

### 4. Yazio

**Calendar Pattern:** Day view with horizontal date strip + detailed nutrition breakdown

**Key Design Details:**
- **Top date strip:** Horizontally scrollable week strip showing dates. Current day highlighted with brand color.
- **Daily nutrition dashboard:** Below the date strip — circular progress ring showing calories consumed/remaining, with macro breakdown (carbs/protein/fat) as colored segments.
- **Meal sections:** Breakfast, Lunch, Dinner, Snacks with individual calorie counts.
- **Fasting timer:** Integrated into the same view for intermittent fasting users.
- **Trends (Pro):** Long-term trend insights showing weight, calories, macros over weeks/months as line/bar charts. Not calendar-grid based — uses traditional charts.
- **Mood & symptom tracking (Pro):** Recently added — tracks mood, symptoms, body metrics alongside food.
- **Widgets:** iOS/Android home screen widgets for quick logging access.

**Navigation UX:**
- Scrollable week strip at top
- Swipe between days
- Bottom tab bar: Diary, Progress, Recipes, Fasting, Profile

**Strengths:** Clean, modern UI. The circular calorie ring is visually satisfying and immediately readable. Good widget integration.
**Weaknesses:** No month calendar view. Trends are chart-based, not calendar-grid based — harder to spot individual day quality.

---

### 5. Cronometer

**Calendar Pattern:** Single-day diary with date navigation header

**Key Design Details:**
- **Date header with arrows:** Current date displayed at top with left/right arrows. Tap arrows to move day-by-day.
- **Nutrient targets banner:** Swipeable horizontal banner at top showing macro targets (calories, protein, carbs, fat) as progress bars. Swipe for detailed micronutrient targets.
- **Diary list:** Food items listed by meal with detailed nutrient columns.
- **"Suggest Food" feature:** AI suggests foods to meet remaining nutrient targets.
- **Oracle Report (premium):** Advanced analytics — but presented as charts and reports, not calendar grids.
- **Pull-to-refresh:** Swipe down to refresh diary data.
- **Orange + button:** Floating action button for adding food, exercise, biometrics, notes.

**Navigation UX:**
- Arrow buttons to navigate days
- No week strip or month grid
- Focused on data depth per day rather than overview

**Strengths:** Most detailed micronutrient tracking of any app. Nutrient target progress bars are clean and informative. Data accuracy is best-in-class.
**Weaknesses:** No calendar overview at all. History browsing is day-by-day only. UI is functional but clinical — lacks personality.

**🌟 KEY INSIGHT FOR HEALTHY ME:** Cronometer's nutrient target progress bars are a great pattern for showing "how complete is today's logging" at a glance. Could adapt this as a mini-bar inside each calendar day cell.

---

### 6. Apple Health

**Calendar Pattern:** Category-based time scale views (D/W/M/6M/Y)

**Key Design Details:**
- **Summary dashboard:** Card-based layout showing Favorites (steps, heart rate, sleep, etc.) with sparkline charts per metric.
- **Time scale tabs:** Tap into any metric → Day / Week / Month / 6 Months / Year tabs at top. Each shows bar charts (vertical bars per time unit).
- **Bar chart per day:** In weekly view, each day is a colored bar. Height = value. Color = category (blue for activity, red for heart, green for nutrition).
- **Highlight trends:** Apple Health uses "Highlights" cards that surface notable trends ("Your step count is up 12% this month").
- **No traditional calendar grid:** Apple Health never shows a standard month grid. Everything is bar charts over time.

**Navigation UX:**
- Tap time scale tabs: D → W → M → 6M → Y
- Scroll vertically through metric categories
- Tap any bar → shows detail for that day
- Swipe horizontally on charts to move between weeks/months

**Color Coding:**
- 🔵 Blue = Activity/Movement
- ❤️ Red = Heart
- 🟠 Orange = Mindfulness
- 🟢 Green = Nutrition
- 💜 Purple = Sleep
- 🩵 Cyan = Respiratory

**Strengths:** Excellent trend visualization. Color-per-category is deeply consistent across the entire app. Time scale switching is intuitive.
**Weaknesses:** No calendar grid — can feel disconnected from "what did I do on Tuesday?" type questions. Overwhelming data density for casual users.

**🌟 KEY INSIGHT FOR HEALTHY ME:** Apple's category-color system is excellent. Assign ONE color per data type (food = green, symptoms = orange, mood = purple, period = pink) and use it everywhere consistently.

---

### 7. Clue

**Calendar Pattern:** Full month grid with multi-colored dots per day

**Key Design Details:**
- **Month grid calendar:** Standard 7-column grid. Each day cell can contain multiple small colored dots arranged in a row below the date number.
- **Dot system — each dot = a different tracked category:**
  - 🔴 Red dot = period/bleeding
  - 🟣 Purple dot = pain/cramps
  - 🔵 Blue dot = mood logged
  - 🟢 Green dot = exercise
  - 🟠 Orange dot = skin/hair symptoms
  - Additional categories add more dots
- **Day detail on tap:** Tap a day → expandable detail view showing all logged data for that day in categorized sections.
- **Cycle prediction overlay:** Predicted period days have a subtle background highlight (light red band) on the calendar grid.
- **Tracking icons redesign (2023):** More colorful, people-friendly icons with factual approach. Each category has a distinct icon + color.

**Navigation UX:**
- Swipe between months on the calendar grid
- Tap any day → day detail view
- Today highlighted with bold circle
- Current cycle shown with background band

**Data Density:**
- **At a glance:** 0–5+ dots per day showing which categories have data. More dots = more tracking that day. Empty days = no dots.
- **On tap:** Full category breakdown with specific values

**Strengths:** THE gold standard for multi-category health calendar visualization. You can instantly see: tracking consistency (dot count), data types tracked (dot colors), period patterns (red dot clusters). Empty days with no dots clearly show gaps.
**Weaknesses:** With too many categories, dots can get crowded. Requires learning what each color means.

**🌟 KEY INSIGHT FOR HEALTHY ME:** Clue's multi-dot system is EXACTLY what we should adapt. Each dot = a category. It shows both WHAT was tracked and WHETHER a day was tracked at all. This is the recommended base pattern.

---

### 8. Bearable

**Calendar Pattern:** Calendar view + Year in Pixels + Timeline

**Key Design Details:**
- **Calendar view:** Month grid showing mood/symptom severity per day as colored cells (like a heatmap). Color intensity = severity/score.
- **Year in Pixels:** A full-year grid (365 cells) where each day is colored by mood/symptom score. Green = good, yellow = okay, red = bad. Bird's-eye view of an entire year.
- **Timeline:** Chronological scrollable list of all logged data points — like a health journal feed.
- **Correlations:** Bearable's killer feature — it correlates factors (foods, activities, sleep) with outcomes (symptoms, mood, energy). Shows "What helps" vs "What hurts."
- **Weekly/monthly reports:** Trend charts showing averages and patterns.
- **Multiple data types:** Symptoms by time of day, mood, energy, sleep, medication, supplements, exercise, diet, social life, self-care — all in one app.

**Navigation UX:**
- Calendar tab shows month grid with colored cells
- Year in Pixels is a separate view
- Timeline is a scrollable feed
- Tapping a day opens that day's full log

**Color Coding (Year in Pixels / Calendar):**
- 🟢 Green = Good day (high mood/low symptoms)
- 🟡 Yellow = Moderate
- 🟠 Orange = Below average
- 🔴 Red = Bad day (low mood/high symptoms)
- ⬜ Gray/empty = Not logged

**Strengths:** Year in Pixels is a powerful motivational pattern — you WANT to fill the grid. Correlation engine is brilliant for PCOS tracking. Heatmap-style calendar shows quality at a glance without dots.
**Weaknesses:** Can be overwhelming with too many data types. Setup is complex.

**🌟 KEY INSIGHT FOR HEALTHY ME:** Bearable's "Year in Pixels" concept could be adapted as a "Month in Pixels" view — each day colored by overall health score. Combined with Clue-style dots, this gives both qualitative (color) and categorical (dots) information.

---

## Cross-App Pattern Summary

| Pattern | Used By | Best For |
|---------|---------|----------|
| **Week strip (horizontal)** | MFP, Flo, Yazio | Quick day-to-day navigation |
| **Full month grid** | Flo, Clue, Bearable | Pattern recognition, history overview |
| **Multi-colored dots** | Clue | Showing which data types were logged |
| **Heatmap cells** | Bearable | Showing day quality/score at a glance |
| **Color-coded bars** | Apple Health | Trend visualization over time |
| **Calorie progress ring** | Yazio, Lose It | Daily goal progress |
| **Day-by-day arrows** | MFP, Lose It, Cronometer | Simple but limited navigation |
| **Period/phase bands** | Flo, Clue | Cycle tracking overlay |
| **Year in Pixels** | Bearable | Long-term pattern recognition |

### What Indicates "Good Day" vs "Missed Day" vs "Partial Logging"

| App | Good Day | Missed/Empty | Partial |
|-----|----------|-------------|---------|
| MFP | Checkmark (Day Complete) | No indicator | Food logged but not completed |
| Flo | N/A (not goal-based) | Empty cell | Some symptoms logged |
| Clue | Multiple dots | No dots at all | 1-2 dots only |
| Bearable | Green pixel | Gray/empty cell | Yellow pixel |
| Lose It | Green calorie bar | No data | Yellow/red bar |
| Yazio | Full calorie ring | Empty ring | Partial ring |

---

## React Native Calendar Components

### Option 1: `react-native-calendars` by Wix (RECOMMENDED)

**npm:** `react-native-calendars` | **GitHub:** wix/react-native-calendars | **Stars:** 9.5k+

**Why it fits Healthy Me:**
- **Pure JS** — no native code required, works with Expo
- **Multi-dot marking** — built-in support for multiple colored dots per day (exactly the Clue pattern)
- **Period marking** — can show colored bands across date ranges (for menstrual cycle tracking)
- **Custom marking** — fully customizable day cell rendering for kawaii pixel art styling
- **CalendarList** — infinite scrolling calendar list
- **Agenda** — agenda view with expandable day items
- **Customizable theme** — fonts, colors, backgrounds all configurable

**Key Features for Our Use Case:**
```
markingType='multi-dot'   → Multiple colored dots per day (food, symptoms, mood, period)
markingType='period'      → Colored bands for period/cycle phases
markingType='custom'      → Full custom rendering for pixel art cells
```

**Limitations:**
- Cannot combine marking types (e.g., dots AND period bands) without custom rendering
- Performance can degrade with 100+ marked dates on CalendarList
- Styling is theme-based, may need custom `dayComponent` for full pixel art control

### Option 2: Custom Build

**When to consider:** If our kawaii pixel art style requires completely custom day cell rendering (pixel borders, animated sprites, unique shapes).

**Approach:**
- Build a `<WeekStrip>` component (horizontal FlatList of 7 day cells)
- Build a `<MonthGrid>` component (7×5/6 grid of custom day cells)
- Each day cell renders: date number, dot indicators, background color
- Use `react-native-gesture-handler` for swipe navigation
- Use `date-fns` or `dayjs` for date math

**Effort:** ~2-3 days vs. ~4 hours with react-native-calendars

### Option 3: Hybrid (BEST APPROACH)

Use `react-native-calendars` with `markingType='custom'` and a fully custom `dayComponent`. This gives us:
- All the date math, month navigation, and gesture handling for free
- Full control over how each day cell looks (pixel art, custom dots, backgrounds)
- CalendarList for infinite scrolling
- Week strip via the built-in `CalendarProvider` + `WeekCalendar`

---

## Recommendation for Healthy Me

### Calendar Layout: **Week Strip + Expandable Month Grid (Both)**

**Primary view:** Horizontal week strip at top of Food Calendar screen
- Shows 7 days, today centered, swipeable
- Each day shows: date, day name, colored dots for logged categories
- Tapping a day loads that day's food log below

**Secondary view:** Expandable month grid (pull down or tap month name)
- Full month grid slides down from the week strip
- Shows the same dot indicators at a smaller scale
- Great for finding patterns and spotting empty days
- Tap a day → collapses back to week strip + loads that day

**Why both:**
- Week strip for daily use (fast navigation, low friction)
- Month grid for reflection (pattern spotting, cycle tracking, consistency review)
- This is exactly what Flo does, and it's the most intuitive health tracker pattern

### Color Coding Scheme for Calendar Dots

Designed for the kawaii pastel aesthetic with light blue (#E8F4FD) background:

| Category | Dot Color | Hex | Rationale |
|----------|-----------|-----|-----------|
| 🍽️ Food logged | Soft green | `#7EC8A0` | Universal "nutrition" color (Apple Health uses green for nutrition) |
| 🩸 Period | Soft pink | `#F2A0B5` | Standard period tracker convention (Flo, Clue) |
| 😊 Mood | Lavender | `#B8A5D4` | Calm, emotional — distinct from health metrics |
| 🤕 Symptoms | Peach/coral | `#F4B88C` | Warm but not alarming — PCOS symptoms |
| 💊 Supplements | Soft blue | `#8BB8E8` | Clinical but friendly |
| 🏃 Exercise | Soft yellow | `#F0D87A` | Energetic, active |
| 💧 Water | Light cyan | `#8DD4D4` | Obvious water association |

**Day cell background colors (optional, heatmap-style):**
- ⬜ White/very light blue = No data logged
- 🟩 Soft green tint = Good tracking day (3+ categories logged)
- 🟡 Soft yellow tint = Partial tracking (1-2 categories)
- ⬜ Empty with faded opacity = Missed day

### Kawaii Pixel Art Integration

- **Day cells:** Subtle pixel-art borders (1px stepped corners instead of rounded)
- **Dots:** Small pixel squares (3×3 or 4×4) instead of circles — fits the pixel art aesthetic
- **Selected day:** Pixel art highlight frame with a tiny star or sparkle
- **Today:** Bouncing or pulsing pixel heart indicator
- **Streak indicator:** Pixel fire or star chain above week strip for consecutive logging days
- **Empty days:** Sad pixel face or sleeping character (motivational)

### Component Recommendation

**Use `react-native-calendars` with custom `dayComponent`.**

```
CalendarProvider + WeekCalendar → Week strip
Calendar with markingType='custom' → Month grid
Custom dayComponent → Pixel art day cells with colored square dots
```

This gives us professional-grade date handling and gesture support while allowing fully custom kawaii pixel rendering for each day cell.

### Information Architecture

**At a glance (calendar grid):**
- Colored dots showing WHAT was tracked (0-7 dots possible)
- Optional background tint showing tracking quality
- Period phase band behind days (light pink)

**On tap (day detail):**
- Full food log with meals (Breakfast, Lunch, Dinner, Snacks)
- Calorie/macro summary ring (Yazio-style)
- Symptom list with severity
- Mood rating
- Notes

**On long press (quick actions):**
- Copy day's food log
- Mark as "rest day" / "cheat day"
- Add note

---

## Implementation Priority

1. **Phase 1:** Week strip with basic date navigation + single-day food log view
2. **Phase 2:** Multi-dot indicators on week strip (food, symptoms, mood)
3. **Phase 3:** Expandable month grid with same dot system
4. **Phase 4:** Period cycle tracking overlay (bands on calendar)
5. **Phase 5:** "Month in Pixels" heatmap view (Bearable-inspired)
6. **Phase 6:** Weekly/monthly trend charts (Apple Health-inspired)

---

## Sources & References

- MyFitnessPal Today Tab: support.myfitnesspal.com
- Flo UX Case Study: neuronux.com/flo
- Flo Design Critique: medium.com/@emilytranthi
- Clue App: helloclue.com
- Bearable Features: bearable.app/get-a-more-detailed-view-of-your-health
- Calendar UI Examples: eleken.co/blog-posts/calendar-ui
- Cronometer Diary: support.cronometer.com
- react-native-calendars: github.com/wix/react-native-calendars
- React Native Calendar Guide: blog.logrocket.com
