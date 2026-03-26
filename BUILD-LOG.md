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
