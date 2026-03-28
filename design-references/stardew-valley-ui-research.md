# Stardew Valley UI Research — Design Patterns for "Healthy Me"

> **Purpose:** Identify specific Stardew Valley UI patterns that translate to a kawaii pixel art PCOS health tracker.  
> **For:** Tina (PM) + design team  
> **Date:** 2026-03-27

---

## 1. Overview: Why Stardew Valley's UI Works

Stardew Valley's UI is a masterclass in "deceptively simple design" (credit: [Kelsey Kinney's analysis](https://medium.com/swlh/deceptively-simple-design-cabde40af87f)). Key principles we should steal:

- **Progressive disclosure** — Start simple, layer in complexity as users engage more
- **Visual cues over text** — Icons, colors, and animations communicate state instead of labels
- **Warm, nostalgic aesthetic** — Pixel art feels approachable and non-clinical (critical for a health app!)
- **Consistent patterns** — Once you learn one menu, you know them all

The entire game UI uses a **consistent brown wood-frame border** around all menus, creating visual cohesion. Every panel feels like it belongs in the same world.

---

## 2. Core UI Elements — Pattern-by-Pattern Analysis

### 2.1 🎒 Inventory Grid → Supplement/Medication Checklist

**What Stardew Does:**
- 12-column × 3-row grid of 48×48px item slots
- Each slot has a subtle inset border (darker edge = depth illusion)
- Items sit centered in slots with quantity numbers in bottom-right corner
- Empty slots show as slightly darker squares (not invisible — you know they exist)
- Bottom toolbar shows 12 "quick access" slots from the backpack
- Hover tooltip shows item name, description, sell price

**How This Maps to Healthy Me:**
| Stardew Element | Healthy Me Adaptation |
|---|---|
| Item slots (48×48px) | Supplement/medication tiles with pixel art icons |
| Quantity number | Dose count or "taken today" checkmark |
| Empty slot styling | Supplements not yet logged — subtle visual nudge |
| Quick-access toolbar | "Today's supplements" pinned row at top of screen |
| Hover tooltip | Tap to see supplement details, timing, notes |

**Design Specifics:**
- Slot border: 2px inset, outer color ~`#8B6914` (warm brown), inner shadow ~`#5C4A1E`
- Slot background (empty): `#4A3728` with slight gradient
- Slot background (filled): `#6B5B3E`
- Grid spacing: 4px between slots
- Item icons should be 32×32px centered in 48×48 containers

**✅ ADOPT** — The grid is perfect for daily supplement checklists. Tap to mark as taken, long-press for details. Very satisfying interaction.

---

### 2.2 📊 Skills Tab / Progress Bars → Calorie/Protein/Water Progress

**What Stardew Does:**
- 5 skill rows (Farming, Foraging, Fishing, Mining, Combat), each with:
  - A colored pixel art icon (16×16px) on the left
  - A skill name label
  - A row of 10 small squares representing levels 1-10
  - Filled squares = levels earned; empty = levels remaining
  - At levels 5 and 10, larger yellow boxes show profession choices
- Below skills: green **Mastery gauge** (a horizontal fill bar) that unlocks after all skills hit level 10
- Player "title" derived from total skill levels (e.g., "Farmhand" → "Farmer" → "Master Farmer")
- XP is tracked internally but **not shown numerically** in vanilla — progress is visual, not numbers-heavy

**How This Maps to Healthy Me:**
| Stardew Element | Healthy Me Adaptation |
|---|---|
| 10 small squares per skill | Daily target segments (e.g., 8 glasses of water = 8 squares) |
| Colored skill icon | Category icon (💧 water, 🥩 protein, 🔥 calories, 💊 supplements) |
| Mastery gauge (fill bar) | Overall daily health score — fills as you log activities |
| Skill-based titles | Health titles/ranks ("Seedling" → "Sprout" → "Bloom" → "Garden Queen") |
| Level-up overnight popup | End-of-day summary popup: "Great day! You hit all your protein targets!" |

**Design Specifics:**
- Progress squares: 12×12px each, 2px gap between
- Filled square color per category:
  - Water: `#59C9F1` (Stardew's Miami Blue)
  - Protein: `#B52121` (Stardew's Firebrick Red)
  - Calories: `#FFD921` (Stardew's Candlelight Yellow)
  - Supplements: `#7BC67E` (soft green, Stardew vegetation palette)
- Empty square: `#3A3A5C` (dark muted blue-gray)
- Overall progress bar: gradient fill from left, rounded ends, 16px height
- Level-up popup: center-screen, wood-border frame, character sprite celebrating

**✅ ADOPT** — The segmented square approach is more engaging than a plain progress bar. Each square filled = micro-dopamine hit. The title system adds long-term motivation without being clinical.

**⚠️ MODIFY** — Stardew hides exact XP numbers. For health tracking, we need optional numeric display (e.g., "1,450 / 1,800 cal") but default to visual-first. Let users tap to see numbers.

---

### 2.3 📅 Calendar View → Period/Cycle Tracker

**What Stardew Does:**
- The calendar is a 7×4 grid (28 days per season) displayed as a wall-hung furniture piece
- Each cell shows the day number and any events:
  - 🎂 Villager birthdays (small character portrait in the cell)
  - 🎪 Festival flags (animated pixel flag icon)
  - 💒 Wedding dates
- Current day is highlighted (distinct border or background color)
- Season name displayed at top with seasonal color theme:
  - Spring: greens and pinks
  - Summer: warm yellows and blues
  - Fall: oranges and browns
  - Winter: cool blues and whites
- The in-game HUD also shows date in the **top-right corner**: `Day, Season Date` format (e.g., "Mon. Spring 15") alongside clock, weather icon, and gold count

**How This Maps to Healthy Me:**
| Stardew Element | Healthy Me Adaptation |
|---|---|
| 28-day grid | Perfect for menstrual cycle tracking (avg cycle ≈ 28 days!) |
| Season themes | Cycle phase colors: follicular (spring green), ovulation (summer gold), luteal (fall orange), menstrual (winter rose/red) |
| Birthday portraits | Symptom icons in each day cell (cramps, bloating, mood, energy) |
| Festival flags | Special markers: doctor visits, med refills, fertility windows |
| Current day highlight | Today's cell with animated gentle glow or bouncing arrow |
| Top-right HUD date | Persistent header: "Day 14 · Ovulatory Phase · 🌸" |

**Design Specifics:**
- Calendar grid cell: 44×44px minimum for touch targets
- Cell border: 1px `#8B7355` (warm taupe)
- Current day: 2px border `#FFD921` + subtle inner glow
- Phase color backgrounds (low opacity, ~20%):
  - Menstrual: `#E8A0BF` (soft rose)
  - Follicular: `#A8D8A8` (spring green)
  - Ovulatory: `#FFD921` (golden)
  - Luteal: `#DDA059` (warm amber, from Stardew's Deep Topaz)
- Symptom icons: 16×16px pixel art, max 3 per cell
- Season/phase label: pixel font, centered above grid

**✅ STRONGLY ADOPT** — This is the killer feature mapping. Stardew's 28-day seasons ARE menstrual cycles. The seasonal theming maps perfectly to cycle phases. This will feel intuitive and delightful instead of clinical.

---

### 2.4 ❤️ Heart Meters → Streak Tracking & Habit Hearts

**What Stardew Does:**
- Social tab shows each villager with a row of 10 hearts (max 8 for non-dateable, 10 for dateable, 14 for spouse)
- Hearts fill from left to right in red as friendship increases
- Empty hearts are gray/dark outlines
- Each heart = 250 friendship points
- Additional indicators per villager:
  - Gift icon (has the player given gifts this week? 0/2 tracking)
  - Talked-to-today checkmark
  - Dateable villagers have a special marker
- Clicking a villager opens their gift log (learned preferences)

**How This Maps to Healthy Me:**
| Stardew Element | Healthy Me Adaptation |
|---|---|
| 10-heart row per villager | Streak hearts per habit (e.g., 7 hearts = 7-day streak) |
| Red fill animation | Hearts fill with each consecutive day completed |
| Gray empty hearts | Days remaining to next milestone |
| Gift tracking (0/2) | Daily task completion status (0/3 tasks done today) |
| Talked-to checkmark | "Logged today" indicator |
| Gift log (tap to expand) | Habit history / stats (tap heart row to see calendar view) |

**Design Specifics:**
- Heart sprite: 16×16px pixel art
- Filled heart: `#E03030` (bright red) or `#FF69B4` (hot pink — more kawaii)
- Empty heart: `#5A5A7A` outline on transparent
- Heart fill animation: gentle pulse/scale on completion (1.2× then back to 1.0×)
- Streak milestones (7, 14, 30 days): heart changes to gold `#FFD921` or sparkle effect
- Row spacing: 24px between habit rows
- Each row: [Habit Icon 24×24] [Name] [Hearts ×7 or ×30] [Status]

**✅ ADOPT** — Hearts are universally understood as positive progress. More emotionally engaging than "Day 12 streak" text. The kawaii factor is built-in.

**⚠️ CONSIDER** — For monthly streaks, 30 hearts in a row might be visually overwhelming. Group into weeks: [❤️❤️❤️❤️❤️❤️❤️] × 4 rows, or use a single heart that "grows" (small → medium → large → sparkle).

---

### 2.5 🔨 Crafting Menu → Meal Logging / Recipe Browser

**What Stardew Does:**
- Grid of recipe icons (32×32px each) in a scrollable panel
- Known recipes are full-color; unknown recipes are grayed out with "???"
- Hovering over a recipe shows a **tooltip panel** with:
  - Recipe name (bold pixel font)
  - Description text
  - Required ingredients (icon + quantity for each)
  - "In stock: X" showing how many you can make with current inventory
- Clicking crafts the item (with a satisfying sound + animation)
- Recipes organized by category in sub-tabs
- Newly unlocked recipes have a "NEW" sparkle indicator

**How This Maps to Healthy Me:**
| Stardew Element | Healthy Me Adaptation |
|---|---|
| Recipe grid | Meal/snack quick-log grid with food icons |
| Tooltip with ingredients | Tap for nutrition breakdown (protein, carbs, calories, etc.) |
| "In stock" indicator | "Fits your daily budget: +340 cal" or macro remaining |
| Known vs unknown recipes | Logged before (full color) vs. new foods (outlined) |
| "NEW" sparkle | Recently added foods / seasonal suggestions |
| Category sub-tabs | Meal type tabs: Breakfast, Lunch, Dinner, Snacks |
| Craft action | "Log this meal" button with satisfying confirmation |

**Design Specifics:**
- Food icon tiles: 48×48px, same grid styling as inventory
- Tooltip panel: wood-bordered popup, max-width 280px
  - Title: 14px pixel font, white on dark header bar
  - Macro bars: mini horizontal bars (protein/carbs/fat) with colored fills
  - "Log Meal" button: green `#7BC67E` with 2px darker border, pixel font text
- Categories use Stardew-style tab icons along the top edge of the panel
- Tab active state: tab rises slightly (2px offset) with lighter background

**✅ ADOPT** — The crafting tooltip pattern is excellent for meal logging. Shows info on demand without cluttering the main view. Progressive disclosure at its best.

**⚠️ SKIP** — Don't gray out unknown foods. Unlike game recipes, users shouldn't feel locked out of foods. Use a "favorites" vs "all" toggle instead.

---

### 2.6 🏆 Collections Tab → Health Achievements / Badges

**What Stardew Does:**
- Scrollable grid of item silhouettes organized by category:
  - Shipped items, Fish, Artifacts, Minerals, Cooking recipes
- Discovered items show full-color with name; undiscovered show as dark silhouettes with "???"
- A counter shows "X/Y" completion per category
- Completing a full page or category = badge/achievement feel
- Hovering shows: item name, times found/shipped, sell price

**How This Maps to Healthy Me:**
| Stardew Element | Healthy Me Adaptation |
|---|---|
| Category grids | Achievement categories: Nutrition, Exercise, Sleep, Supplements, Streaks |
| Silhouettes → revealed | Locked badges (grayed) → earned badges (full color + sparkle) |
| X/Y counter | "12/25 Nutrition achievements unlocked" |
| Discovery hover | Tap badge for: name, description, date earned, reward |
| Full page completion | Category mastery: "Supplement Queen 👑 — Took all supplements for 30 days" |

**Design Specifics:**
- Badge tiles: 48×48px pixel art icons
- Locked state: `#3A3A5C` silhouette on `#2A2A3C` background
- Unlocked state: full color + subtle shimmer animation
- Category header: pixel font with small icon, left-aligned
- Completion bar per category: thin (8px) progress bar below header
- Gold/platinum/diamond tiers for recurring achievements (visual upgrade to badge)

**✅ ADOPT** — Gamification through collections is perfect for long-term engagement. PCOS management is a marathon — achievements provide milestones and celebrate progress.

---

## 3. Stardew Valley Visual Design System

### 3.1 Color Palette (Extracted)

**Official Stardew Valley palette** (from SchemeColor + community analysis):

| Color | Hex | Usage in Stardew | Healthy Me Usage |
|---|---|---|---|
| Miami Blue | `#59C9F1` | Sky, water | Water tracking, calm states |
| Deep Navy | `#151152` | Night sky, dark backgrounds | App background (dark mode) |
| Firebrick | `#B52121` | Health bar, alerts | Calorie tracking, warnings |
| Royal Brown | `#6B3710` | Wood borders, UI frames | All panel borders |
| Deep Topaz | `#DDA059` | Gold, autumn, warmth | Luteal phase, achievements |
| Candlelight Yellow | `#FFD921` | Stars, highlights, gold | Streak milestones, celebrations |

**Supplementary colors for Healthy Me's kawaii twist:**

| Color | Hex | Usage |
|---|---|---|
| Sakura Pink | `#FFB7C5` | Primary accent, menstrual phase |
| Lavender | `#B4A7D6` | Rest/sleep tracking |
| Mint Green | `#98D8C8` | Exercise, energy |
| Peach | `#FFDAB9` | Skin/wellness tracking |
| Cream | `#FFF8E7` | Text backgrounds, cards |

### 3.2 Border & Frame System

Stardew uses a **9-slice border system** for all menus:

```
┌─[ornate corner]──────────[ornate corner]─┐
│                                           │
│    Content area with padding              │
│                                           │
└─[ornate corner]──────────[ornate corner]─┘
```

- **Outer border:** 4px, color `#6B3710` (Royal Brown)
- **Inner border:** 2px, color `#8B6914` (lighter brown)
- **Corner ornaments:** Small decorative 8×8px pixel art pieces
- **Content padding:** 16px from inner border
- **Drop shadow:** None in Stardew (flat pixel aesthetic) — but a subtle 2px offset shadow in `#2A1A0A` at 30% opacity would work for Healthy Me's mobile context

**✅ ADOPT** — The 9-slice border gives every panel a cohesive "game window" feel. Use it for all cards, modals, and popups.

### 3.3 Typography

- **Primary font:** Stardew uses a custom pixel font (~8px base, scaled up)
- **Characteristics:** Rounded, slightly condensed, high x-height for readability
- **For Healthy Me:** Use an existing pixel font like:
  - **Press Start 2P** (Google Fonts) — for headers
  - **VT323** (Google Fonts) — for body text (more readable at small sizes)
  - **Silkscreen** — good balance of pixel aesthetic and readability
- **Sizing:** 
  - Headers: 16px (2× base)
  - Body: 12px 
  - Captions: 10px
  - Numbers/stats: 14px (slightly larger for glanceability)

### 3.4 Icons & Sprites

Stardew icons follow these rules:
- **16×16px** for inline icons (skill icons, buff indicators)
- **32×32px** for inventory items
- **48×48px** for featured items or large displays
- **Limited palette per sprite** — usually 4-6 colors max including shading
- **1px black outline** on all sprites (gives definition against any background)
- **Consistent light source** — top-left (shadows fall bottom-right)

---

## 4. Stardew UX Patterns to Steal

### 4.1 The HUD (Heads-Up Display)

**Stardew's HUD layout:**
```
[Top-right corner]
┌──────────────┐
│ 🕐 12:30 PM  │
│ 💰 2,450g    │  
│ 📅 Mon.      │
│    Spring 15  │
│ ☀️ (weather)  │
└──────────────┘

[Bottom-right]
█████████░░  Energy bar (green, vertical)
█████░░░░░  Health bar (red, vertical, only in mines)

[Bottom-center]
[Toolbar: 12 item slots]
```

**Healthy Me HUD adaptation:**
```
[Top bar - persistent]
┌─────────────────────────────────┐
│ 🌸 Day 14 · Follicular  📅 Mar │
└─────────────────────────────────┘

[Bottom nav - persistent]  
[🏠 Home] [📊 Track] [📅 Cycle] [🏆 Goals] [⚙️ Settings]
```

### 4.2 Notification Popups

**Stardew's approach:**
- Level-up notifications appear **overnight** (not mid-action) — reduces interruption
- Small HUD messages ("Your cat loves you ❤️") appear as **floating text** that fades after 3 seconds
- Quest updates show as a brief banner at bottom of screen
- New recipe unlocks: icon + name appears center-screen briefly

**Healthy Me adaptation:**
- **End-of-day summary** (like Stardew's overnight screen): Show daily stats, achievements unlocked, streak updates
- **Gentle reminders** as floating pixel text: "💧 Time for water!" (fades naturally)
- **Achievement unlocks:** Center-screen popup with sparkle animation, badge icon, and sound
- **Never interrupt logging flow** — queue celebrations for natural pause points

### 4.3 Tooltips & Information Layering

**Stardew's tooltip pattern:**
1. **At a glance:** Icon tells you what it is
2. **Hover/tap:** Name + basic info appears
3. **Menu deep-dive:** Full details, stats, history

**Healthy Me adoption:**
1. Dashboard shows icons + progress bars (glanceable)
2. Tap any element for a tooltip card with details
3. Long-press or navigate to dedicated section for full history/analytics

---

## 5. Recommendations Summary

### ✅ Strongly Adopt
| Pattern | Why |
|---|---|
| 28-day calendar grid with phase colors | Natural mapping to menstrual cycles; seasonal theming = delight |
| Heart meters for streak tracking | Emotionally engaging, universally understood |
| Segmented progress squares | More satisfying than plain progress bars |
| Wood-border 9-slice frame system | Visual cohesion, "cozy game" feel |
| Overnight/end-of-day summary popups | Reduces interruption, creates ritual |
| Achievement silhouette → reveal | Long-term engagement through collection |
| Inventory grid for supplement checklist | Satisfying tap-to-complete interactions |

### ⚠️ Adopt with Modification
| Pattern | Modification Needed |
|---|---|
| Hidden numbers (Stardew hides XP) | Health tracking needs optional numeric display — visual-first, numbers on tap |
| 10-level skill progression | Adapt to variable targets (8 glasses, 1800 cal, etc.) — not always 10 |
| Crafting "unknown" grayed items | Don't lock out foods — use favorites/recents instead |
| Heart rows (10+ hearts) | Group into weeks for monthly views to prevent visual overload |

### ❌ Skip
| Pattern | Why |
|---|---|
| Complex nested menus (crafting sub-tabs) | Mobile needs simpler nav — use bottom tab bar instead |
| Full-screen map tab | Not relevant for health tracking |
| Real-time clock display | Health app doesn't need Stardew's time pressure |
| Gender/romance mechanics | Obviously not applicable 😄 |

---

## 6. Key Design Decisions for Tina

1. **Pixel density:** Target **2× pixel art** (design at 1x, render at 2x for Retina). Each "pixel" = 2×2 actual pixels on screen.

2. **Color temperature:** Stardew skews warm (browns, yellows, greens). For Healthy Me, shift toward **warm pinks and lavenders** while keeping the brown border system. This maintains the cozy feel while being more feminine/kawaii.

3. **Animation budget:** Stardew is subtle — no flashy transitions. Adopt: gentle heart pulse on completion, sparkle on achievements, fade-in tooltips. Skip: slide transitions, bouncy physics, parallax.

4. **Sound design:** Stardew has satisfying micro-sounds for every action. Budget for: checkbox "pop," achievement jingle, streak heart fill, water pour sound. These are cheap to produce and massively improve feel.

5. **Dark mode:** Stardew's night palette (deep blues `#151152`, muted earth tones) works beautifully as a dark mode base. Default to dark mode — it's cozier and easier on eyes for bedtime logging.

---

## 7. Reference Links

- [Interface In Game — Stardew Valley screenshots](https://interfaceingame.com/games/stardew-valley/) — Gallery of all in-game UI screens
- [Stardew Valley Wiki — Player Menu](https://stardewvalleywiki.com/Player_Menu) — Official documentation of all menu tabs
- [Stardew Valley Wiki — Calendar](https://stardewvalleywiki.com/Calendar) — Calendar layout and event system
- [Stardew Valley Wiki — Skills](https://stardewvalleywiki.com/Skills) — Skill system, XP tables, progression
- ["Deceptively Simple Design" — Medium](https://medium.com/swlh/deceptively-simple-design-cabde40af87f) — Excellent UX analysis of Stardew
- [Stardew Valley Color Scheme — SchemeColor](https://www.schemecolor.com/stardew-valley.php) — Official 6-color palette with hex codes
- [How to Make Stardew Valley-Type UI — SynthronAI](https://synthronai.com/how-to-make-stardew-valley-type-ui/) — Technical guide for recreating the aesthetic

---

*Research compiled 2026-03-27 by Oraion. Ready for PM review and design sprint planning.*
