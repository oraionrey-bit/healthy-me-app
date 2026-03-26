# Build Plan — Phase 3: Features + EAS Build

## What We Have (Phases 1-2 Complete)
- Expo project (SDK 54) with TypeScript
- 5-tab navigation: Home ❤️, Food 🍽️, Move 🏋️, Skin 🧴, Health 🔬
- Supabase connected (12 tables, RLS, triggers)
- Auth flow (magic link login)
- Pixel fonts (Press Start 2P + VT323)
- Theme constants (colors, spacing, fonts)
- Background + character images in assets

## Build Order (dependency-driven)

### Step 1: EAS Build Setup (so Tina can test on her phone)
- Install eas-cli
- Configure eas.json for development build
- Register app bundle ID
- Create development build for iOS
- This gives Tina a testable app that works anywhere

### Step 2: Home Screen (the first thing she sees after login)
- Background image (pastel cityscape)
- Character sitting on top (static)
- Daily summary: calories/protein eaten today, supplements taken
- Simple, clean, minimal — no pet mechanics

### Step 3: Food Logging (most used feature)
- Quick-add: description + calories + protein (manual entry)
- Meal type selector (breakfast/lunch/dinner/snack)
- Today's food list with running totals
- Reads/writes to food_logs table

### Step 4: Supplement Tracker (under Health tab)
- Daily checklist of Tina's supplements
- Tap to mark as taken
- Reads/writes to supplement_logs + user_supplements tables

### Step 5: Skincare Tab
- AM/PM routine checklist
- Safe products list
- Trigger log

## Testing Strategy
- TypeScript strict mode catches type errors at compile time
- Test each screen in Expo Go (LAN) before committing
- Verify Supabase reads/writes work with real data
- Test on iOS device via EAS build before shipping

## Code Quality Rules
- Clean, readable code
- Small focused components
- Shared UI components in components/ui/
- Custom hooks for data logic (useAuth, useFoodLog, etc.)
- No duplicate code — refactor shared patterns
