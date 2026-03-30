# Improvement Research v3 — Healthy Me
> Generated: 2026-03-30 | Research Areas: PWA Performance, PCOS Tracking, Engagement, AI Food Analysis, Oura Integration

---

## 1. PWA Performance Optimization

### 1.1 Service Worker Caching Strategies

**Key Strategies (ranked by relevance to Healthy Me):**

| Strategy | How It Works | Best For | Use In Healthy Me |
|----------|-------------|----------|-------------------|
| **Cache-First** | Check cache → serve if found → fall back to network | Static assets (CSS, JS, images, fonts, pixel art sprites) | ✅ All UI assets, sprite sheets, icons |
| **Stale-While-Revalidate** | Serve from cache immediately → fetch update in background → update cache | Semi-dynamic content (user profile, pet state, daily scores) | ✅ Dashboard data, pet animations |
| **Network-First** | Try network → fall back to cache on failure | Dynamic data (food logs, Oura sync, AI analysis results) | ✅ API calls to Supabase |
| **Cache-Only** | Only serve from cache, never network | App shell, critical UI framework | ✅ App shell (navigation, layout) |
| **Network-Only** | Always fetch from network | Real-time data, authentication | ✅ OAuth flows, Oura token refresh |

**Recommended Architecture for Healthy Me:**

```
App Shell (Cache-Only)
├── Navigation, layout, pixel art frames → precached on install
├── All sprite sheets & pet animations → cache-first with versioning
├── CSS/JS bundles → cache-first (hashed filenames for cache busting)
│
Dynamic Data (Stale-While-Revalidate)
├── User's daily health score → serve cached, update in background
├── Pet state/evolution → cached locally, sync when online
├── Recent food logs → cached for quick display
│
API Calls (Network-First with Cache Fallback)
├── Supabase queries → try network, show cached if offline
├── AI food analysis → network-only (requires API)
├── Oura data sync → network-first, cache last known data
```

**Implementation with Workbox (recommended for Expo/React):**
- Use `workbox-webpack-plugin` or `workbox-build` for service worker generation
- Precache the app shell + all static assets during install event
- Runtime caching with route-based strategies
- Background sync for offline food log entries (queue → send when online)

### 1.2 Making the App Feel Faster on Mobile

**Techniques (impact-ordered):**

1. **Skeleton screens** — Show pixel-art-styled loading placeholders (not spinners). A faded pet outline or dotted health bar loads instantly, feels like the app is "already there"
2. **Optimistic UI updates** — When user logs food or checks off a task, update the UI immediately. Sync to Supabase in the background. If sync fails, queue for retry
3. **Code splitting** — Split by route/tab. The Food tab JS shouldn't load until the user navigates there. Expo Router supports lazy loading
4. **Prefetching** — When user is on Home, prefetch the Food and Stats tabs in the background during idle time
5. **Reduce JavaScript bundle size** — Audit with `npx expo-bundle-analyzer`. Remove unused dependencies. Tree-shake aggressively
6. **CSS containment** — Use `contain: layout` on independent UI sections (pet area, stats cards) to prevent layout thrashing
7. **Avoid layout shifts** — Reserve exact dimensions for images and pet sprites. Use `aspect-ratio` CSS

**Performance Targets:**
- First Contentful Paint (FCP): < 1.5s on 3G
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- Cumulative Layout Shift (CLS): < 0.1

### 1.3 Offline Support Feasibility

**What CAN work offline:**

| Feature | Offline Feasibility | How |
|---------|-------------------|-----|
| View dashboard/pet | ✅ Fully | Cache last known state |
| Log food (manual entry) | ✅ Fully | Store in IndexedDB → sync when online |
| Log exercise | ✅ Fully | Same as food |
| View past food logs | ✅ Fully | Cache recent 7 days |
| Track symptoms/mood | ✅ Fully | Local-first storage |
| Pet animations/interactions | ✅ Fully | All sprites precached |
| View health score | ✅ Partial | Show last cached score, can't recalculate without server |
| Period/cycle tracking | ✅ Fully | All data cached locally |
| View Oura data | ✅ Partial | Show last synced data |

**What CANNOT work offline:**

| Feature | Why |
|---------|-----|
| AI food photo analysis | Requires Gemini API call |
| Oura data sync | Requires Oura REST API |
| New account creation | Requires Supabase auth |
| AI health insights | Requires LLM API |

**Recommended approach:** Use **IndexedDB** (via `idb` library or Dexie.js) as the local data store. All user entries go to IndexedDB first, then sync to Supabase when online. This gives instant feedback and offline resilience.

**Background Sync API:** When the user logs food offline, register a sync event. The service worker will automatically retry the upload when connectivity returns. Fallback: periodic retry on app foreground.

### 1.4 Image Optimization

**Current State:** Pixel art sprites and food photos are the main image assets.

**Recommendations:**

1. **Sprite sheets → already optimized** by nature (single file, fewer HTTP requests). Ensure they're PNG-8 where possible (pixel art compresses well with limited palettes)
2. **Food photos:**
   - Resize to max 1200px width before upload (most analysis doesn't need 4K)
   - Convert to WebP on server (Supabase Storage can serve WebP via image transformation API)
   - Use `<picture>` element with WebP + JPEG fallback
   - Lazy load food photos in the calendar/history view with `loading="lazy"` attribute
   - Show tiny blurred placeholder (LQIP — Low Quality Image Placeholder) while loading
3. **AVIF format** — 30-50% smaller than WebP, but browser support is still catching up (~92% global). Use as progressive enhancement with `<picture>` fallback chain: AVIF → WebP → JPEG
4. **Responsive images** — Use `srcset` for different screen densities (1x, 2x, 3x). Mobile doesn't need desktop-sized images
5. **CDN** — Supabase Storage includes CDN. Ensure `Cache-Control: public, max-age=31536000` for immutable assets

**Impact estimate:** These optimizations combined can reduce page weight by 40-60% and improve LCP by 1-2 seconds on mobile.

---

## 2. PCOS Health Tracking Best Practices

### 2.1 Most Effective PCOS Tracking Metrics

**Currently tracked in Healthy Me:**
- Weight ✅
- Food/nutrition ✅
- Exercise (coming) ✅
- Period/cycle ✅
- Symptoms (coming) ✅
- Sleep (via Oura, coming) ✅
- Mood ✅

**Missing high-value metrics we should add:**

| Metric | Why It Matters for PCOS | Tracking Method | Priority |
|--------|----------------------|-----------------|----------|
| **Waist-to-hip ratio** | Better predictor of metabolic risk than BMI for PCOS; directly correlates with insulin resistance and cardiovascular risk | Monthly measurement with tape + photo guide | 🔴 High |
| **Fasting glucose / post-meal response** | Directly tracks insulin resistance progression | Manual entry from CGM or fingerstick; or subjective energy tracking as proxy | 🟡 Medium |
| **Acanthosis nigricans** (skin darkening) | Visual sign of insulin resistance; worsening = insulin resistance increasing | Photo tracking monthly (neck, armpits, groin) | 🟡 Medium |
| **Hair growth patterns** (Ferriman-Gallwey scale) | Standard clinical tool for tracking hirsutism severity; validated in PCOS research | Simplified visual scale (Clue app does this) with monthly photo | 🟡 Medium |
| **Supplement intake** | Inositol, Vitamin D, omega-3, magnesium, zinc directly affect PCOS outcomes | Daily checklist (pixel inventory grid style) | 🔴 High |
| **Stress level** | Cortisol → androgen pathway; stress directly worsens PCOS | Daily 1-5 scale + Oura HRV as objective measure | 🔴 High |
| **Water intake** | Dehydration worsens insulin sensitivity; common PCOS neglect area | Quick counter (glasses/bottles per day) | 🟢 Low |
| **Caffeine intake** | Caffeine can worsen cortisol in PCOS; tracking reveals correlation with symptoms | Daily count or auto-detect from food log | 🟢 Low |

### 2.2 Insulin Resistance Markers — Daily Tracking (No Lab Required)

This is a crucial gap. Most apps only track insulin resistance through periodic lab results (HOMA-IR, fasting insulin). But daily proxy tracking is possible and valuable:

**Subjective Daily IR Proxy Score (buildable now):**

Track these daily symptoms on a 0-3 scale. Sum = daily IR proxy score.

| Symptom | 0 (None) | 1 (Mild) | 2 (Moderate) | 3 (Severe) |
|---------|----------|----------|--------------|------------|
| **Energy crashes** | Stable energy all day | One mild dip | Noticeable afternoon crash | Can't function without nap |
| **Carb cravings** | No unusual cravings | Mild desire for sweets | Strong cravings, can resist | Intense, gave in |
| **Brain fog** | Clear thinking | Slight haziness | Difficulty concentrating | Can't focus at all |
| **Post-meal fatigue** | Normal after eating | Slightly tired after meals | Need to sit down after eating | Food coma / need to sleep |
| **Skin tags / darkening** | No change | Slight new changes | Noticeable progression | Significant new areas |
| **Hunger regulation** | Normal hunger | Hungry between meals | Hungry within 1-2hr of eating | Constant hunger |

**Score interpretation:**
- 0-4: Insulin sensitivity appears good
- 5-9: Mild insulin resistance signs — review food composition
- 10-14: Moderate IR signs — recommend physician discussion
- 15-18: Strong IR signals — strongly recommend medical review

**CGM Integration (future):**
- Continuous Glucose Monitors (CGMs like Dexio G7, Freestyle Libre 3) are increasingly used by women with PCOS for real-time glucose tracking
- 65-70% of PCOS women have some degree of insulin resistance
- CGMs reveal post-meal glucose spikes, time-in-range, and glycemic variability — all impossible to track with subjective measures alone
- **Recommendation:** Add CGM data import as a v3 feature. LibreLink has an API; Dexcom has a public API. Or allow manual glucose entry from fingerstick readings
- For now, the subjective IR proxy score gives immediate value without any hardware

### 2.3 Oura Ring Metrics ↔ PCOS Symptoms Correlation

Research from PMC9005074 (Oura Ring menstrual cycle study) confirms:

| Oura Metric | PCOS-Relevant Correlation | Actionable Insight |
|-------------|--------------------------|-------------------|
| **Temperature deviation** | Rises ~0.2-0.5°C in luteal phase (post-ovulation). In PCOS with anovulation, this rise may be absent or blunted | If no temp rise after expected ovulation → flag as possible anovulatory cycle |
| **HRV (rMSSD)** | Lower in luteal phase in all women; chronically lower HRV correlates with higher cortisol and worse androgen levels in PCOS | Track HRV trends over cycle; alert when HRV is consistently dropping (stress/cortisol signal) |
| **Resting heart rate** | Rises in luteal phase (~2-4 bpm). Sustained elevation outside cycle pattern may indicate stress or inflammation | Compare RHR to cycle phase baseline; flag deviations |
| **Sleep efficiency** | Poor sleep → insulin resistance ↑, cortisol ↑, androgen ↑. PCOS women are 2x more likely to have sleep disturbances | Alert when sleep efficiency drops below personal baseline |
| **Deep sleep %** | Growth hormone release happens during deep sleep; critical for hormonal recovery | Track deep sleep trends; low deep sleep = poor hormonal recovery |
| **SpO2** | PCOS women have elevated risk for sleep apnea (obesity + androgen link). Low SpO2 = potential screening flag | Flag consistently low SpO2 readings; suggest sleep study |

**Buildable insight engine:**
```
IF anovulatory_cycle_detected (no temp rise) AND low_HRV_trend AND poor_sleep
THEN → "Your body may be under extra stress this cycle. Consider gentle exercise and earlier bedtime."

IF post_meal_fatigue_high AND HRV_declining AND sleep_efficiency_down
THEN → "Insulin resistance symptoms are elevated. Your Oura data confirms your body needs recovery."
```

### 2.4 Anti-Inflammatory Food Scoring Systems

**The Dietary Inflammatory Index (DII)** is the gold standard research tool:
- Scores 45 food parameters from anti-inflammatory (negative score) to pro-inflammatory (positive score)
- Range: −8.87 (maximally anti-inflammatory) to +7.98 (maximally pro-inflammatory)
- Validated against CRP, IL-6, and TNF-alpha biomarkers
- Used in 1,000+ peer-reviewed publications

**Problem:** The full DII requires detailed nutrient intake data (specific vitamins, minerals, flavonoids) that's impractical for daily food logging.

**Simplified PCOS Anti-Inflammatory Score (our implementation):**

Design a practical 1-10 scoring system per meal based on key food categories:

| Food Category | Anti-Inflammatory (+) | Pro-Inflammatory (−) |
|---------------|----------------------|---------------------|
| **Protein** | Fatty fish, legumes, eggs | Processed meats, fried protein |
| **Carbs** | Whole grains, sweet potato, quinoa | White bread, white rice, sugary cereals |
| **Fats** | Olive oil, avocado, nuts, seeds | Trans fats, seed oils (debated), fried |
| **Vegetables** | Leafy greens, cruciferous, colorful | Minimal veg = penalty |
| **Fruits** | Berries, citrus, pomegranate | Dried fruit with added sugar, juice |
| **Spices** | Turmeric, ginger, cinnamon, garlic | — |
| **Beverages** | Green tea, water, herbal tea | Soda, alcohol, excessive caffeine |
| **Dairy** | Fermented (yogurt, kefir) | High-fat cheese, cream, ice cream |

**Scoring logic for Healthy Me:**
1. AI food analysis already identifies ingredients
2. Map each ingredient to anti-inflammatory / pro-inflammatory / neutral category
3. Calculate a simple weighted score: `(anti_count × 2 - pro_count × 2 + neutral_count × 0) / total_items × 10`
4. Clamp to 1-10 scale
5. Display as pixel hearts or flame icon on each meal

**PCOS-specific additions:**
- **Gluten-free bonus** (+1): Many PCOS women benefit from reducing gluten (inflammation trigger)
- **Dairy-free bonus** (+1): Dairy can worsen acne and androgen symptoms
- **High fiber bonus** (+1): >5g fiber per meal improves insulin sensitivity
- **Inositol-rich bonus** (+0.5): Foods naturally high in myo-inositol (citrus, beans, nuts)
- **High glycemic penalty** (−1): White rice, white bread, sugary items spike insulin

---

## 3. User Engagement & Retention

### 3.1 Why People Stop Using Health Apps

**Key statistics:**
- Median 15-day retention for health apps: only 3.9% of users
- ~75% of mHealth apps are uninstalled within 30 days
- Gamification alone is insufficient — users need "further motivation and reinforcement" beyond game elements

**Top reasons for abandonment (from research synthesis):**

| Reason | Frequency | Our Mitigation |
|--------|-----------|---------------|
| **Too much effort to log** | #1 | Photo-based food logging + AI; single-tap symptom tracking |
| **No visible progress** | #2 | Pet evolution = visible long-term progress |
| **Irrelevant notifications** | #3 | Context-aware, cycle-phase notifications |
| **Guilt from missed days** | #4 | "Cozy Day" framing; streaks with grace periods |
| **Generic, not personalized** | #5 | PCOS-specific insights; 태음인 body type integration |
| **Privacy concerns** | #6 | Transparent data handling; no social pressure defaults |
| **Feature overwhelm** | #7 | Progressive disclosure; start simple, unlock features |

### 3.2 Gamification Patterns That Actually Work for Health

**What works (evidence-based):**

1. **Variable rewards** — Not every action gives the same reward. Random rare drops (special pet accessories, unique animations) keep the dopamine loop interesting. Fixed rewards become predictable and boring within 2 weeks.

2. **Identity-based habits** — Frame logging as "being the kind of person who takes care of themselves" (Finch model: "taking care of yourself IS taking care of your pet"). The pet is an externalization of self-care identity.

3. **Streak resilience** — Habitify's model: streaks are important but NOT fragile. Allow 1-2 "grace days" before a streak breaks. A study found that users who lost long streaks due to one missed day rarely returned. Streaks with forgiveness retain 2.3x more users.

4. **Progress visualization** — Show the JOURNEY, not just today. Monthly/weekly views with heat maps. The garden/room that grows over months. Pet evolution over weeks. This combats the "nothing's changing" feeling.

5. **Micro-celebrations** — Confetti, sparkle, happy pet dance on EVERY completion. Even small ones. The brain needs immediate feedback. Delayed rewards (weekly summaries) are insufficient alone.

6. **Social accountability (opt-in)** — Share pet with a friend, not data. "My pet evolved!" is shareable and fun. "My insulin score is 7" is not. Social features should focus on achievement, not health data.

7. **Narrative progression** — The pet's "story" unfolds over time. New environments, new adventures, seasonal events. This provides long-term motivation beyond stats.

**What DOESN'T work:**
- Generic badges ("You logged 5 meals!" — who cares?)
- Punishment for missed days (Flora's "plant dies" approach has 23% higher abandonment)
- Leaderboards (creates anxiety, especially in health contexts)
- Complex point systems that require a manual to understand

### 3.3 Notification Best Practices

**Timing research findings:**

| Time | Notification Type | Why |
|------|------------------|-----|
| **8:00-9:00 AM** | Morning check-in reminder | Habit stacking with morning routine; highest open rates |
| **12:00-1:00 PM** | Lunch logging nudge | Meal timing; contextually relevant |
| **6:00-7:00 PM** | Dinner/evening logging | Second meal window |
| **9:00-10:00 PM** | Daily summary / pet status | Reflection time; feeds bedtime routine |
| **AVOID** | Never before 8 AM or after 10 PM | Disruptive; negative association |

**Content principles:**
- **From the pet, not the app.** "Luna is wondering what you had for lunch! 🐱" >> "Don't forget to log your lunch."
- **Vary the content.** Same notification every day = ignored within 5 days. Rotate 10-15 messages.
- **Include a stat.** "You've logged 12 days in a row! Luna learned a new dance 💃" — combines streak awareness with delight.
- **Contextual.** During luteal phase: "Your body might be craving carbs today. Luna packed some healthy snack ideas! 🍎"
- **Frequency cap.** Maximum 2-3 notifications per day. Users who receive >4 daily notifications disable them 67% faster.

### 3.4 Making Daily Logging Feel Rewarding

**The "2-Tap Rule":** Every log entry should be completable in ≤ 2 taps for the common case.

| Current Friction | Reduced Friction |
|-----------------|-----------------|
| Open app → navigate to food → fill form → save | Open app → tap "Log Meal" → take photo → done |
| Open app → find symptom tracker → select symptoms → rate each → save | Home screen shows top 3 symptoms → tap to rate (1-3 scale) → done |
| Open app → exercise section → fill details → save | Suggested exercise on home → tap "Did it" or "Did something else" → done |

**Reward loops per log entry:**
1. **Immediate:** Pet reacts (happy animation, +XP sparkle) — 0.5 seconds
2. **Short-term:** Energy bar fills, streak counter updates — 1 second
3. **Daily:** Pet goes on adventure when energy full — end of day
4. **Weekly:** Evolution progress bar advances — visible on pet card
5. **Monthly:** New environment unlocked, pet evolves — milestone celebration

**"Minimum viable log":** Even on low-energy days, allow a single tap: "How are you feeling today?" (emoji scale). That single data point keeps the streak alive, the pet happy, and the user's habit intact.

---

## 4. AI Food Analysis Improvements

### 4.1 Current Approach Assessment

**Current:** Single photo + text description → Gemini API → nutritional breakdown

**Limitations:**
- Single angle misses hidden ingredients (sauce underneath, side dishes behind main dish)
- Portion estimation is the weakest link (±30-50% error on single photos)
- Korean/Asian food has unique challenges (see 4.4)

### 4.2 Multi-Angle Photo Analysis

**Research finding (DietAI24 framework, Nature Communications Medicine, Nov 2025):**
- Multimodal LLMs (GPT-4V, Gemini) with RAG (Retrieval-Augmented Generation) against nutrition databases significantly improve accuracy
- Key innovation: combining visual analysis with structured food code databases (USDA FoodData Central)
- Achieves "substantially improved dietary assessment accuracy" over single-model approaches

**Recommended improvements:**

1. **Two-photo approach:** Prompt user to take a top-down photo AND a 45° angle photo. The 45° angle reveals height/depth (crucial for bowls, stacked items). This alone can improve portion estimation by 20-30%.

2. **Reference object:** Optionally include a known-size reference (fork, chopstick, hand) for scale calibration. DietAI24 and similar systems use reference objects for absolute size estimation.

3. **Structured prompt engineering:** Instead of "analyze this food," use a chain:
   - Step 1: "Identify all distinct food items in this image"
   - Step 2: "Estimate the portion size of each item in grams, using the [reference object] for scale"
   - Step 3: "Look up nutritional data for each item and calculate totals"

4. **User confirmation loop:** After AI analysis, show identified items and let user confirm/edit. This builds a personalized food database over time. After 50 meals, the system knows "this is Tina's regular bibimbap from the place near her house."

### 4.3 Portion Size Estimation Techniques

**State of the art (2025-2026):**

| Technique | Accuracy | Feasibility for PWA |
|-----------|----------|-------------------|
| **Depth estimation from single image** | ±25-40% | ✅ Via Gemini's spatial reasoning |
| **Reference object scaling** | ±15-25% | ✅ Ask user to include fork/hand |
| **Two-angle triangulation** | ±15-20% | ✅ Two photos, computed server-side |
| **3D reconstruction** | ±10-15% | ❌ Requires native AR (ARKit/ARCore) |
| **Known plate/bowl size** | ±10-20% | ✅ User registers their dinnerware once |
| **Weight estimation from volume** | ±20-30% | ✅ After volume estimated from photos |

**Practical recommendation for Healthy Me v2:**
1. **Known container approach:** During onboarding, user photographs their most-used plates/bowls with a reference coin. App stores dimensions. Future meals on those containers have much better portion estimates.
2. **"How much did you eat?" slider:** After AI analysis, show a simple 25%/50%/75%/100% slider for shared dishes. Handles the family-style eating problem elegantly.

### 4.4 Korean Food / Asian Cuisine Challenges

**Unique challenges identified in research (arxiv.org/2409.02448, PMC6883229):**

1. **Similar colors and textures:** Korean dishes often share similar colors (white/beige: rice, bean sprouts, noodles; brown: various jjigae, soy-based dishes). AI struggles to differentiate.

2. **Multiple small dishes (반찬 banchan):** A typical Korean meal has 5-15 small shared side dishes. Each needs individual recognition.

3. **Mixed dishes:** Bibimbap, japchae, and many Korean dishes mix multiple ingredients in one bowl, making individual ingredient identification harder.

4. **Shared/family-style eating:** Most Korean meals are communal. The total on the table ≠ what one person eats.

5. **Fermented foods:** Kimchi, doenjang, gochujang — these have complex nutritional profiles that vary by fermentation age and recipe.

**Solutions for Healthy Me:**

| Challenge | Solution |
|-----------|---------|
| Banchan recognition | Use a "Korean meal mode" that expects multiple dishes. Prompt: "This is a Korean meal with multiple banchan. Identify each dish separately." |
| Family-style eating | "How much of each dish did YOU eat?" with visual portion selector (1/4, 1/3, 1/2, full) |
| Common Korean dishes database | Build a curated lookup table of 100 common Korean dishes with standard nutritional data. When AI identifies "김치찌개" → use our database values, not generic estimates |
| Mixed bowls | Prompt the AI to identify visible ingredients rather than the dish name. Bibimbap → rice + spinach + carrot + beef + egg + gochujang, each with estimated portion |
| Fermented food scoring | Pre-score common Korean fermented foods for anti-inflammatory index. Kimchi = highly anti-inflammatory. Doenjang = anti-inflammatory. Gochujang = moderate |

**Korean food nutritional database sources:**
- Korean National Standard Food Composition Table (국가표준식품성분표) — maintained by Rural Development Administration
- Korean Food Data Base (KFDB) by Korea Food Research Institute
- These can be used as RAG sources for Gemini to improve Korean food accuracy

---

## 5. Oura Ring Integration Deep Dive

### 5.1 Additional Oura Data for PCOS Insights

**Beyond what's in next-features-research.md, these Oura V2 API endpoints add PCOS value:**

| Endpoint | Data | PCOS Application |
|----------|------|-----------------|
| `/daily_resilience` | Daytime stress, recovery, social engagement scores | Directly maps to cortisol patterns; track stress → androgen pathway |
| `/daily_stress` | Stress level throughout the day | Identifies stress peaks that may correlate with symptom flares |
| `/daily_cardiovascular_age` | Cardiovascular age estimate | Long-term PCOS metabolic health tracking |
| `/sleep_time` | Bedtime, wake time, time in bed | Sleep consistency tracking (irregular sleep worsens PCOS) |
| `/rest_mode_period` | Illness/recovery periods | Auto-adjust exercise recommendations during illness |
| `/enhanced_tag` | User tags with timestamps | Let user tag PCOS-specific events ("cramps", "acne flare") directly in Oura, sync to Healthy Me |

### 5.2 HRV → Stress → Cortisol → PCOS Correlation

**The pathway:**
```
Low HRV → indicates high sympathetic nervous system activity (stress)
→ sustained stress → elevated cortisol
→ elevated cortisol → adrenal androgen production (DHEA-S, androstenedione)
→ elevated androgens → PCOS symptom worsening (acne, hirsutism, irregular cycles)
```

**Research-backed HRV thresholds:**
- HRV is highly individual (ranges from 20-200ms). Absolute values are less meaningful than personal trends
- A **10-15% decline in HRV** from personal baseline over 7+ days indicates chronic stress
- Post-ovulatory HRV drop of 5-10% is normal (progesterone effect); larger drops may signal excessive stress

**Buildable HRV insight engine:**
```
Track: 30-day rolling HRV average (personal baseline)
Compare: Today's HRV vs. 30-day average
Factor: Cycle phase (expect lower HRV in luteal)

IF hrv_today < (baseline * 0.80) AND NOT luteal_phase:
  → "Your stress levels seem elevated. Consider a restorative activity today."

IF hrv_7day_avg < (baseline * 0.85):
  → "Your body has been under sustained stress this week. Extra sleep and gentle exercise recommended."

IF hrv_trend_declining AND acne_symptoms_increasing:
  → "We're noticing a pattern: your stress levels and acne symptoms are tracking together. Managing stress may help."
```

### 5.3 Temperature Deviation → Cycle Prediction Accuracy

**How it works:**
- Oura tracks nightly skin temperature to 0.01°C accuracy
- In a regular cycle: temperature rises 0.2-0.5°C after ovulation (progesterone effect) and drops before menstruation
- Oura uses this + HRV to create multi-day period prediction windows

**PCOS challenge:**
- PCOS cycles are often anovulatory (no ovulation → no temperature rise)
- Cycle lengths vary from 21-90+ days
- Standard prediction models assume 21-35 day cycles

**What we can build:**
1. **Anovulatory cycle detection:** If no temperature rise is detected for >20 days after last period, flag as "possibly anovulatory." This is clinically useful information for the user's doctor.
2. **Pattern learning over time:** After 3-6 months of data, identify the user's personal pattern. Even irregular cycles often have patterns (e.g., "usually 35-45 days, anovulatory every 3rd cycle").
3. **No forced predictions:** For PCOS users, show a "likelihood window" instead of a specific date. "Based on your temperature and HRV patterns, your period may come in the next 5-10 days" instead of "Your period starts March 15."
4. **Ovulation confirmation (not prediction):** Temperature rise confirms ovulation already happened. This is valuable for fertility-aware PCOS users who are trying to conceive.

### 5.4 Sleep Stages → Hormonal Recovery Optimization

**Key research findings:**

| Sleep Stage | Hormonal Function | PCOS Relevance |
|------------|-------------------|----------------|
| **Deep sleep (N3)** | Growth hormone (GH) release; cortisol suppression; immune repair | Low deep sleep → reduced GH → harder to build muscle, recover. PCOS women already have altered GH pulsatility |
| **REM sleep** | Emotional processing; memory consolidation; cortisol regulation | Disrupted REM → worse mood regulation, higher emotional eating |
| **Sleep efficiency** | Total time asleep / time in bed | Low efficiency correlates with higher insulin resistance and worse PCOS outcomes |
| **Sleep latency** | Time to fall asleep | High latency → possible anxiety/cortisol issue |
| **Sleep consistency** | Same bedtime/wake time | Irregular sleep patterns independently worsen metabolic markers |

**Buildable features:**

1. **"Sleep quality for PCOS" score** — Weight Oura's sleep metrics by PCOS relevance:
   - Deep sleep %: 30% weight (most impactful for hormonal recovery)
   - Sleep efficiency: 25% weight
   - Total sleep time: 20% weight
   - Sleep consistency: 15% weight
   - REM %: 10% weight

2. **Recovery recommendations based on sleep:**
   - Deep sleep < 15%: "Your deep sleep was low. Consider avoiding alcohol and screens 2h before bed."
   - Sleep efficiency < 80%: "You spent a lot of time in bed but not asleep. A consistent bedtime routine may help."
   - Low deep sleep + high exercise yesterday: "Your body may need an extra rest day for recovery."

3. **Correlation dashboard:** Show sleep quality alongside next-day symptoms. Over time, reveal patterns: "After nights with >20% deep sleep, your energy rating is 40% higher."

---

## 6. Priority Matrix — What to Build Next

### Impact vs. Effort Assessment

| # | Feature | Impact (1-10) | Effort (1-10) | Score (I/E) | Priority |
|---|---------|--------------|---------------|-------------|----------|
| 1 | **Service worker + offline support** | 8 | 6 | 1.33 | 🔴 P0 |
| 2 | **Simplified anti-inflammatory food score** | 9 | 4 | 2.25 | 🔴 P0 |
| 3 | **IR proxy symptom tracker** | 9 | 3 | 3.00 | 🔴 P0 |
| 4 | **Supplement tracker (pixel inventory)** | 7 | 3 | 2.33 | 🔴 P0 |
| 5 | **Notification system (pet-voiced)** | 8 | 5 | 1.60 | 🟡 P1 |
| 6 | **"2-tap" quick log (minimum viable log)** | 8 | 3 | 2.67 | 🔴 P0 |
| 7 | **Oura HRV insight engine** | 8 | 6 | 1.33 | 🟡 P1 |
| 8 | **Two-photo food analysis** | 7 | 4 | 1.75 | 🟡 P1 |
| 9 | **Korean meal mode** | 7 | 5 | 1.40 | 🟡 P1 |
| 10 | **Waist-to-hip ratio tracking** | 6 | 2 | 3.00 | 🔴 P0 |
| 11 | **Anovulatory cycle detection** | 7 | 5 | 1.40 | 🟡 P1 |
| 12 | **Sleep-PCOS correlation dashboard** | 7 | 6 | 1.17 | 🟢 P2 |
| 13 | **Streak grace periods** | 6 | 2 | 3.00 | 🔴 P0 |
| 14 | **Image optimization pipeline** | 5 | 3 | 1.67 | 🟡 P1 |
| 15 | **Known container registration** | 5 | 4 | 1.25 | 🟢 P2 |
| 16 | **CGM data import** | 7 | 7 | 1.00 | 🟢 P2 |
| 17 | **Variable reward system** | 6 | 5 | 1.20 | 🟢 P2 |
| 18 | **Korean food nutritional database** | 6 | 6 | 1.00 | 🟢 P2 |

### Recommended Build Order

**Sprint 1 — Quick Wins (1-2 weeks):**
1. ✅ IR proxy symptom tracker (daily 6-symptom check, 0-3 scale)
2. ✅ Anti-inflammatory food score (leverage existing AI analysis)
3. ✅ Supplement tracker (pixel inventory grid)
4. ✅ Waist-to-hip ratio monthly tracking
5. ✅ Streak grace periods (1-2 day forgiveness)
6. ✅ "Minimum viable log" — single emoji tap for low-energy days

**Sprint 2 — Core Infrastructure (2-3 weeks):**
7. Service worker implementation (Workbox)
8. Offline food/symptom logging with background sync
9. Pet-voiced notification system
10. Image optimization pipeline (WebP conversion, lazy loading)

**Sprint 3 — Intelligence Layer (2-3 weeks):**
11. Two-photo food analysis mode
12. Korean meal mode with banchan recognition
13. Oura HRV insight engine (requires Oura API integration)
14. Anovulatory cycle detection

**Sprint 4 — Advanced Features (3-4 weeks):**
15. Sleep-PCOS correlation dashboard
16. Variable reward system (random rare drops)
17. Korean food nutritional database
18. Known container registration for portion estimation
19. CGM data import (Dexcom/Libre API)

---

## 7. References & Sources

### PWA & Performance
- MagicBell: "Offline-First PWAs: Service Worker Caching Strategies" — magicbell.com/blog
- MDN: "Caching - Progressive web apps" — developer.mozilla.org
- ZeePalm: "PWA Offline Functionality: Caching Strategies Checklist" — zeepalm.com
- Fotolince: "PWA Image Optimization: Offline Performance and Smart Caching" (Sep 2025)
- AppInstitute: "How To Optimize PWA For Mobile Performance" (Aug 2025)
- GWAA: "Mobile LCP Optimization: Complete Guide 2025" (Jan 2026)

### PCOS Health Tracking
- PMC8984569: "Markers of insulin resistance in Polycystic ovary syndrome women: An update"
- Hello Clue: "PCOS and insulin resistance - Testing and Treatment"
- Verywell Health: "The Dual Challenge of PCOS and Insulin Resistance" (Dec 2025)
- PCOS Nutrition Center: "Continuous Glucose Monitors for PCOS" (Jan 2024)
- Oana Health: "How CGMs Benefit Women with PCOS and Insulin Resistance"
- Aspect Health: PCOS CGM Program — aspect-health.com

### Oura Ring & Menstrual Cycle
- PMC9005074: "Tracking Sleep, Temperature, Heart Rate, and Daily Symptoms Across the Menstrual Cycle with the Oura Ring" (peer-reviewed)
- Oura Blog: "How Oura Data Can Help You Understand Your Menstrual Cycle" (Sep 2024)
- Oura: "Cycle Insights" — support.ouraring.com
- Oura Blog: "Temperature Trends to Track Your Menstrual Cycle" (Nov 2025)
- Thryve Health: "Oura Ring Integration API" — thryve.health
- Oura Blog: "Your Readiness Score & How To Measure It" (Feb 2024)

### Anti-Inflammatory Diet
- Wikipedia: "Dietary Inflammatory Index" — en.wikipedia.org (updated Mar 2026)
- PMC6416047: "Perspective: The DII — Lessons Learned, Improvements Made, and Future Directions"
- PMC4773655: "Anti-inflammatory DII scores are associated with healthier scores on other dietary indices"
- Dietitians On Demand: "What is the Dietary Inflammatory Index?" (Feb 2025)
- Obesity Medicine Association: "Understanding The DII and Its Uses" (Sep 2025)

### User Engagement & Retention
- PMC8406121: "The Influence of Gamification and IT Identity on Postadoption Behaviors of Health and Fitness App Users"
- Nature Scientific Reports: "The regulatory status of health apps that employ gamification" (Sep 2024)
- PMC10094640: "An Integrated Model for Evaluating the Sustainability of Gamified mHealth Apps"
- Exploration EDHT: "Can gamified apps reduce students' anxiety?" (Nov 2025) — 3.9% 15-day retention finding
- Mahalo Health: "Top 10 Ways To Retain Your Digital Health App Users"
- Emergent: "Top 5 Habit Building Apps That Actually Work in 2026" (Jan 2026)

### AI Food Analysis
- Nature Communications Medicine: "DietAI24 — comprehensive nutrition estimation using multimodal LLMs" (Nov 2025)
- PMC11607557: "Advancements in Using AI for Dietary Assessment Based on Food Images: Scoping Review"
- MDPI Applied Sciences: "Deep Learning in Food Image Recognition: A Comprehensive Review" (Jul 2025)
- arxiv.org/2409.02448: "Detecting Korean Food Using Image using Hierarchical Model" (Sep 2024)
- PMC6883229: "Development of food image detection and recognition model of Korean food for mobile dietary management"
- Nature Scientific Reports: "AI powered dietary proportion assessment for improving accuracy" (Nov 2025)
