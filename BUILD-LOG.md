# BUILD-LOG.md

## 2026-03-26 — Web Support + Netlify Deployment

### Changes Made

**1. Installed web dependencies**
- `react-native-web`, `react-dom`, `@expo/metro-runtime` (SDK 54 compatible)

**2. Fixed SecureStore for web (`src/lib/supabase.ts`)**
- Added `Platform` import from `react-native`
- Created `createStorageAdapter()` factory function
- Web: uses `localStorage` (SecureStore is native-only)
- Native (iOS/Android): uses `expo-secure-store` (encrypted)
- Replaced `ExpoSecureStoreAdapter` with `createStorageAdapter()` call

**3. Updated `app.json` web config**
- Added `"output": "single"` to `expo.web` section (SPA mode)

**4. Created Netlify SPA redirect**
- `public/_redirects`: `/*    /index.html   200`

**5. No other web-incompatible imports found**
- `expo-image-picker` and `expo-notifications` are in dependencies but NOT imported in any source files — no changes needed

### Testing
- ✅ `npx tsc --noEmit` — zero errors
- ✅ `npx expo export -p web` — successful, 817 modules bundled
- ✅ `dist/index.html` generated
- ✅ `dist/_redirects` present

### Deployment
- **Platform:** Netlify
- **Production URL:** https://healthy-me-expo.netlify.app
- **Status:** Live, HTTP 200 verified
- **Site name:** healthy-me-expo
- **Build logs:** https://app.netlify.com/projects/healthy-me-expo/deploys/

### Notes
- Native app functionality is unchanged — web support is purely additive
- The Netlify site has a build command configured (`expo export -p web`), so future deploys can use `netlify deploy --prod` or connect to a Git repo for CI/CD

---

## 2026-03-26: Tab Rebuild (Home, Food, Move, Skin)

### Changes Made

**Home (index.tsx) — Full Rebuild**
- Removed Supabase `useFoodLog` dependency — all local state now
- Today's date at top, formatted: "Thursday, March 26"
- Character image (character-default.png), centered ~100px
- "Today's Checklist" with 5 hardcoded items (Ovasitol AM/PM, Magnesium, Yogurt/Dairy, Water)
- Tappable checkbox rows with toggle state, green highlight when done
- Progress counter: "3/5 done"
- "Today's Food" summary card with eating character + placeholder text

**Food (food.tsx) — Full Rebuild**
- Removed Supabase `useFoodLog` — all local state with useState
- Header with "Food Log" + date + floating "+" button
- Running totals card (0/1500 cal, 0g/80g protein) — placeholder for AI analysis
- Add meal form: meal type pill selector (Breakfast/Lunch/Dinner/Snack)
- Photo upload via expo-image-picker with Platform.OS === 'web' fallback (HTML file input)
- Multi-photo support with thumbnail strip + remove button
- Multi-line description text input
- "Submit for Analysis" button → creates entry card with "Analyzing... 🔍" badge
- Simulated analysis complete after 3 seconds
- Empty state with eating character

**Move (move.tsx) — Simplified to Placeholder**
- Removed Supabase `useExercises` dependency
- Celebrating character image, centered
- "Move" title + "Oura integration coming soon! 🏋️"
- Motivational message
- Clean, centered, minimal

**Skin (skin.tsx) — Redesigned with 4 Sections**
1. **My Skin Journey** — Visual timeline with dot indicators
   - Phase 1: Reset (March) — highlighted in purple as current
   - Phase 2: Azelaic Acid (April — 3x/week)
   - Phase 3: Tretinoin (May+ — 1x/week, buffered)
2. **Skin Log** — Photo journal with "New Entry" button
   - Photo upload (same web fallback as Food)
   - Text description input
   - Empty state with sad character
3. **My Routine** — AM/PM checklists (kept from before)
4. **Safe Products & Triggers** — Kept from before

### Testing
- ✅ `npx tsc --noEmit` — ZERO errors
- ✅ `npx expo export -p web` — succeeded (822 modules bundled)
- ❌ `npx netlify deploy --dir=dist --prod` — BLOCKED: Netlify account suspended (credit limit exceeded). Draft deploys work but prod is forbidden.

### Notes
- All Supabase/auth dependencies removed from these 4 tabs
- Silkscreen (Fonts.body) used for ALL text
- Platform.OS === 'web' checks added for image picker fallback
- Font sizes use bodyXs/bodySm/bodyMd/bodyLg/bodyXl constants throughout
- netlify.toml added with build command + publish dir
