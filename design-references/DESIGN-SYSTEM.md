# Healthy Me — Design System

> Source of truth for all typography, color, spacing, iconography, and component patterns.
> Last audited: 2026-03-28. Based on full codebase scan of `src/`.

---

## 1. Typography

### Font Families

| Token | Font | Usage |
|-------|------|-------|
| `Fonts.pixel` | **PressStart2P** | Titles, headings, pixel-accent text |
| `Fonts.body` | **Silkscreen** | All body text, labels, buttons, inputs |

PressStart2P is a chunky pixel font — **sizes must be small** (8–20px) or it overwhelms the layout.
Silkscreen is a wider pixel-readable font — body sizes are offset slightly larger than pixel sizes.

### Font Size Scale

#### PressStart2P Sizes (`Fonts.pixel`)

| Token | Value | Current Usage |
|-------|-------|---------------|
| `FontSizes.xs` | **8** | Back button arrow, PixelButton text |
| `FontSizes.sm` | **10** | *(unused in codebase)* |
| `FontSizes.md` | **12** | Health dashboard "HEALTH" title |
| `FontSizes.lg` | **16** | Onboarding titles (ABOUT YOU, YOUR GOALS, SUPPLEMENTS, YOU'RE ALL SET), Home "HEALTHY ME" title |
| `FontSizes.xl` | **20** | Welcome screen "WELCOME!" title |
| `FontSizes.xxl` | **28** | *(unused in codebase)* |

#### Silkscreen Sizes (`Fonts.body`)

| Token | Value | Current Usage |
|-------|-------|---------------|
| `FontSizes.bodyXs` | **10** | Chips, captions, nutrition details, progress labels, legend text, tips, icon-sized text, dosage info |
| `FontSizes.bodySm` | **12** | Form labels, field labels, pills, progress counters, hints, back button label, toast text, view button text |
| `FontSizes.bodyMd` | **14** | Section titles, input text, check item labels, date display, card titles, descriptions, button text (login, add meal) |
| `FontSizes.bodyLg` | **18** | Date header (home), summary stat values, greeting text, skin page header, sent text |
| `FontSizes.bodyXl` | **22** | Move screen title, stepper display value |

#### Intended Use Cases (Canonical)

| Element | Font | Size Token | Value |
|---------|------|------------|-------|
| **App title** ("HEALTHY ME") | PressStart2P | `lg` | 16 |
| **Page title** (WELCOME, HEALTH) | PressStart2P | `xl` / `md` | 20 / 12 |
| **Onboarding title** | PressStart2P | `lg` | 16 |
| **Section title** | Silkscreen | `bodyMd` | 14 |
| **Card title** | Silkscreen | `bodyMd` | 14 |
| **Body text** | Silkscreen | `bodyMd` | 14 |
| **Label / field label** | Silkscreen | `bodySm` | 12 |
| **Caption / hint** | Silkscreen | `bodyXs` | 10 |
| **Button text (PixelButton)** | Silkscreen | `xs` (8) | 8 ⚠️ |
| **Button text (inline)** | Silkscreen | `bodyMd` | 14 |
| **Pill / chip text** | Silkscreen | `bodySm` / `bodyXs` | 12 / 10 |
| **Chart axis label** | *(system)* | hardcoded 10 | 10 ⚠️ |
| **Tab bar label** | Silkscreen | `bodyXs` | 10 |

---

## 2. Color Palette

### Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Lavender** | `#b388ff` | Accent borders, active dot border, login input border |
| **Pink** | `#ff80ab` | Period "on" pill, reference line on charts |
| **Mint** | `#b2dfdb` | *(defined but unused in current codebase)* |
| **Baby Blue** | `#81d4fa` | Energy chart color, today circle border, analyzing text, food dot (1-2 meals) |
| **Purple** | `#7c4dff` | Primary action color, buttons, active states, chart bars, text accent |

### Extended Palette

| Name | Hex | Usage |
|------|-----|-------|
| **Soft Purple** | `#d1c4e9` | Selected emoji bg, accent card variant bg |
| **Peach** | `#ffccbc` | *(defined but unused)* |
| **Cream** | `#fff8e1` | *(defined but unused)* |
| **Soft Pink** | `#fce4ec` | Delete button bg, period tracker border |
| **Sky Blue** | `#b2e4fa` | *(defined but unused — similar to babyBlue)* |

### Background Colors

| Name | Value | Usage |
|------|-------|-------|
| **Background** | `#e8f4fd` | Screen background, input backgrounds, pill default bg |
| **Card Background** | `#ffffff` | Card surfaces, nav buttons |
| **Card Bg Translucent** | `rgba(255,255,255,0.85)` | Login input bg |
| **Screen Overlay** | `rgba(255,255,255,0.7)` | *(defined but unused)* |

### Text Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Text Primary** | `#4a3560` | Headings, body text, active labels |
| **Text Secondary** | `#7e6b8f` | Sub-labels, inactive pill text, legend text |
| **Text Muted** | `#a094b0` | Placeholders, hints, captions, disabled states |
| **Text On Dark** | `#ffffff` | Text on purple/colored backgrounds |

### Status Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Success** | `#81c784` | Checkbox done, toast bg, accent card green border |
| **Warning** | `#ffb74d` | Over-target calories bar, pending food, accent orange border |
| **Error** | `#e57373` | Delete button text, trigger card text, period heavy flow |
| **Info** | `#64b5f6` | *(defined but unused directly)* |

### Tab Bar Colors

| Name | Value | Usage |
|------|-------|-------|
| **Tab Bar Background** | `rgba(255,255,255,0.95)` | Tab bar surface |
| **Tab Bar Active** | `#7c4dff` | Active tab label |
| **Tab Bar Inactive** | `#b0a4c0` | Inactive tab label |
| **Tab Bar Border** | `rgba(179,136,255,0.2)` | Borders, dividers, rule lines |

### Inline Colors (Not in Theme Constants)

| Value | Location | Should Be |
|-------|----------|-----------|
| `#F0EAF8` | Home progress bar bg | Add to theme as `progressTrack` |
| `#f48fb1` | Home check-in card border | Add to theme as `accentPinkBorder` |
| `rgba(129,199,132,0.15)` | Check row done bg | Derive from `success` |
| `rgba(129,199,132,0.3)` | Check row done border | Derive from `success` |
| `rgba(129,199,132,0.08)` | Skin check row done bg | Derive from `success` |
| `rgba(124,77,255,0.06)` | Supplement active bg | Derive from `purple` |
| `rgba(124,77,255,0.3)` | Supplement active border | Derive from `purple` |
| `rgba(229,115,115,0.1)` | Trigger card bg | Derive from `error` |
| `rgba(229,115,115,0.3)` | Trigger card border | Derive from `error` |
| `#e0e0e0` | Period spotting dot | Add to theme |
| `#fff176` | Period light flow dot | Add to theme |

---

## 3. Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `Spacing.xs` | **4** | Tight gaps, chip gaps, small margins |
| `Spacing.sm` | **8** | List item gaps, pill row gaps, field margins |
| `Spacing.md` | **16** | Card padding, section margins, input padding, content gaps |
| `Spacing.lg` | **24** | Screen padding, section spacing, card inner padding |
| `Spacing.xl` | **32** | Large section separators, onboarding vertical padding |
| `Spacing.xxl` | **48** | Scroll bottom padding, empty state padding |

---

## 4. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `BorderRadius.sm` | **8** | Thumbnails, text area inputs, symptom bars |
| `BorderRadius.md` | **12** | Buttons, inputs, cards (check rows), toast |
| `BorderRadius.lg` | **16** | Main cards (PixelCard, HealthCard, accent cards) |
| `BorderRadius.xl` | **24** | Onboarding card |
| `BorderRadius.full` | **999** | Pills, chips, nav circles, progress dots |

---

## 5. Shadows

| Token | Config | Usage |
|-------|--------|-------|
| `Shadows.card` | purple tint, y:2, opacity:0.08, radius:8 | PixelCard, HealthCard, accent cards |
| `Shadows.soft` | black, y:1, opacity:0.05, radius:4 | Back button |

---

## 6. Components

### PixelButton

| Variant | Background | Text Color | Border |
|---------|-----------|------------|--------|
| **primary** | `purple` (#7c4dff) | white | none |
| **secondary** | `softPurple` (#d1c4e9) | purple | none |
| **outline** | transparent | purple | 2px purple |

- **Padding**: vertical `sm+4` (12), horizontal `lg` (24)
- **Border radius**: `md` (12)
- **Min height**: 44
- **Text**: Silkscreen, `FontSizes.xs` (8) ⚠️ (very small — see inconsistencies)

### PixelCard

- **Background**: white
- **Border**: 1px `tabBarBorder`
- **Border radius**: `lg` (16)
- **Padding**: `lg` (24)
- **Shadow**: `Shadows.card`
- **Accent variant**: `softPurple` bg, `lavender` border

### Accent Card (Home screen variant)

- **Background**: white
- **Border radius**: `lg` (16)
- **Left border**: 4px colored (green/orange/pink)
- **Padding**: `md` (16)
- **Shadow**: purple tint, similar to `Shadows.card`

### HealthCard

- Same as Accent Card pattern (4px left border, `lg` radius, `md` padding)
- Border colors vary by card type (pink, green, softPink, warning, babyBlue)

### OnboardingCard

- **Background**: white
- **Border radius**: `xl` (24)
- **Padding**: `xl` (32)
- **Max width**: 420
- **Shadow**: `Shadows.card`

### Pill / Chip

| Type | Padding | Border Radius | Default BG | Active BG |
|------|---------|---------------|------------|-----------|
| **Pill** (meal type, time range, PCOS type) | v:`sm` h:`md` | `full` | `background` or white | `purple` |
| **Chip** (symptoms) | v:`xs` h:`md` | `full` | white 0.9 | `softPurple` |
| **Period pill** | v:`sm` h:`lg` | `full` | white 0.9 | `softPurple`/`pink` |

### Checkbox Row

- **Height**: auto (padding `md`)
- **Border**: 1px `tabBarBorder`
- **Border radius**: `md` (12)
- **Checkbox**: 22×22 (home/skin) or 24×24 (onboarding), border-radius 6, 2px border
- **Done state**: green tinted background + green checkbox fill

### Progress Bar

- **Track height**: 6–8px
- **Track bg**: `tabBarBorder` or `#F0EAF8`
- **Fill**: `purple` or `warning` (orange)
- **Border radius**: 3–4px

### Emoji Button (Mood/Energy picker)

- **Size**: 48×48
- **Border radius**: `md` (12)
- **Emoji font size**: 24
- **Selected**: 2px purple border + softPurple bg

### Severity Dot

- **Size**: 28×28
- **Border radius**: 14 (circle)
- **Active**: purple fill

### Tab Bar

- **Height**: 80
- **Bg**: white 95% opacity
- **Border top**: 1px `tabBarBorder`
- **Emoji size**: 22
- **Label font**: Silkscreen, bodyXs (10)

---

## 7. Inconsistencies Found

### 🔴 Critical

1. **PixelButton text size is 8px (FontSizes.xs)**
   - File: `components/ui/pixel-button.tsx`
   - All other button-like text uses `bodyMd` (14) or `bodySm` (12)
   - 8px PressStart2P is nearly unreadable on mobile
   - **Fix**: Change to `Fonts.body` at `FontSizes.bodySm` (12) to match pill/chip interactive text

2. **Chart labels missing fontFamily**
   - Files: `mood-energy-trend.tsx`, `weight-trend.tsx`
   - `chartLabelStyle` and `summaryText` use `fontSize: 10` without `fontFamily`
   - Falls back to **system font** instead of Silkscreen
   - **Fix**: Add `fontFamily: Fonts.body`

### 🟡 Medium

3. **Health dashboard title smaller than other pixel titles**
   - File: `health-dashboard.tsx` — uses `FontSizes.md` (12)
   - All other pixel titles use `FontSizes.lg` (16) or `xl` (20)
   - **Fix**: Change to `FontSizes.lg` (16) for consistency

4. **Checkmark font sizes vary**: 7px (home, skin) vs 8px (onboarding supplements)
   - Minor visual difference but should be unified
   - **Fix**: Standardize to 8px

5. **Inline colors not in theme constants** — see Section 2 "Inline Colors" table
   - Creates maintenance burden and drift risk
   - **Fix**: Add semantic color tokens to `theme.ts`

### 🟢 Minor

6. **`borderRadius: 12` hardcoded** in complete.tsx summary box instead of `BorderRadius.md`
   - **Fix**: Use the constant

7. **Unused theme colors**: `mint`, `peach`, `cream`, `skyBlue`, `info`, `screenOverlay`
   - Not a bug — may be reserved for Phase 2/3 features
   - **Note**: Track usage as features ship

8. **`FontSizes.sm` (10) and `FontSizes.xxl` (28) unused**
   - `sm` overlaps with `bodyXs`; `xxl` may be reserved for Phase 2 device shell title
   - **Note**: Keep for future use

---

## 8. PM Design Principles (from Tina)

- **Less is more.** Clean, minimal layouts.
- **Lofi pixelated aesthetic.** Soft pastels, Y2K retro.
- **No negative states.** All character feedback is positive reinforcement.
- **Two font families only.** PressStart2P for titles, Silkscreen for everything else.
- **Pinterest board reference**: https://www.pinterest.com/pleaseihnhae/lofi-pixelated-aesthetics/
