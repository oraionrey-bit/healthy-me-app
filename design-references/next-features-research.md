# Next Features Research Brief
**Date:** 2026-03-28
**For:** Healthy Me — Tamagotchi PCOS Health Tracker

---

## 1. Oura Ring API Integration — Feasibility Assessment

### API Overview (V2)
- **Auth:** OAuth2 (for multi-user) OR Personal Access Token (for single-user / dev)
- **Base URL:** `https://api.ouraring.com/v2/usercollection/`
- **Rate Limits:** 5,000 requests/day per application
- **Default user cap:** 10 users per app (can apply for more)

### Available Data Endpoints (V2)
| Endpoint | Data | PCOS Relevance |
|----------|------|----------------|
| `/daily_sleep` | Sleep score, total sleep, efficiency, latency, REM/deep/light | ⭐⭐⭐ Sleep quality affects cortisol → androgens |
| `/daily_readiness` | Readiness score, temperature deviation, HRV balance | ⭐⭐⭐ Recovery tracking, inflammation proxy |
| `/daily_activity` | Activity score, steps, calories, movement | ⭐⭐ Exercise verification |
| `/heartrate` | 5-min interval heart rate data | ⭐⭐ Resting HR trends |
| `/sleep` | Detailed sleep periods with HRV, movement, HR | ⭐⭐⭐ HRV is key for stress/hormone tracking |
| `/daily_spo2` | Blood oxygen | ⭐ Sleep apnea screening (PCOS risk) |
| `/ring_configuration` | Ring model, size, firmware | ⚙️ Device info |
| `/session` | Guided sessions (meditation, breathing) | ⭐ Stress management tracking |
| `/tag` | User-created tags | ⭐ Custom tracking |

### Web/PWA Feasibility
- **Yes, fully feasible.** Oura API is a standard REST API. No native SDK required.
- Auth flow: OAuth2 redirect → user authorizes on cloud.ouraring.com → callback with code → exchange for token
- All data accessed via server-side REST calls (Supabase Edge Functions work perfectly)
- **No client-side SDK needed** — this is backend-to-backend

### Architecture for Healthy Me
```
User clicks "Connect Oura" → OAuth2 redirect → cloud.ouraring.com
→ User authorizes → Callback to our Supabase Edge Function
→ Store access_token + refresh_token in user's profile
→ Daily cron job fetches sleep/readiness/activity → stores in our DB
→ App displays Oura data alongside manual entries
```

### Key Data for PCOS Tracking
1. **Temperature deviation** — Tracks body temp changes, useful for cycle/ovulation proxy
2. **HRV (Heart Rate Variability)** — Stress biomarker; low HRV correlates with hormonal imbalance
3. **Sleep score + stages** — Poor sleep worsens insulin resistance & androgen levels
4. **Readiness score** — Combined recovery metric, good for exercise recommendation timing
5. **Resting heart rate** — Cardiovascular health marker

### Recommendation
**Build in 2 phases:**
- **v1 (now on board):** Manual Oura stats input — user enters sleep score, readiness, etc. from their Oura app. Zero API dependency, immediate value.
- **v2 (now on board):** Full API integration with OAuth2 + automated daily sync. Supabase Edge Function handles token storage and daily data fetch.

---

## 2. Apple Health Integration — Options Analysis

### The Problem
**PWAs cannot access Apple HealthKit.** HealthKit is a native-only framework. There is no web API, no JavaScript bridge, no workaround for pure web apps. Apple deliberately restricts this to native iOS apps for privacy/security.

### Option Analysis

| Approach | Effort | UX | Recommendation |
|----------|--------|-----|----------------|
| **A. react-native-health (Expo plugin)** | Medium | Seamless native | ✅ Best for iOS build |
| **B. Native iOS companion app** | High | Two apps | ❌ Overkill |
| **C. Apple Shortcuts export** | Low | Manual/clunky | ❌ Bad UX |
| **D. Manual entry** | Zero | Works now | ✅ v1 approach |
| **E. Oura API (bypasses Apple Health)** | Medium | Automated | ✅ Gets most data we need |

### Detailed Analysis

#### Option A: react-native-health with Expo
- **Package:** `react-native-health` by agencyenterprise (actively maintained)
- **Expo support:** Yes — has an Expo config plugin for managed workflow
- **Data available:** Steps, heart rate, HRV, sleep analysis, workouts, menstrual cycles, body measurements, nutrition
- **Requirement:** Must build as a native iOS app (not web-only). Since Healthy Me is Expo-based, this is feasible when we convert to a native iOS build.
- **HealthKit entitlement** needed → requires Apple Developer account
- **Key constraint:** Only works on iOS device. Web version would not have this data.

#### Why Oura API Makes Apple Health Less Urgent
For Tina specifically (Oura Ring user), the Oura API provides most of the data we'd want from Apple Health:
- Sleep → Oura (better data than Apple Health for ring users)
- HRV → Oura
- Activity/Steps → Oura
- Heart Rate → Oura
- Body Temperature → Oura
- **What Apple Health adds that Oura doesn't:** Menstrual cycle tracking (if using Apple's tracker), workout details from other apps (Lagree/Pilates class data), weight from smart scale

### Recommendation
1. **Skip Apple Health integration for now.** Oura API covers 80% of what we need.
2. **When we convert to native iOS app** (card already exists: "📱 [NATIVE] Convert to iOS App"), add `react-native-health` then.
3. **For v1:** Manual entry for anything Oura doesn't cover (weight, period, symptoms — already planned).

---

## 3. PCOS Exercise Recommendation Engine — Design Research

### Evidence-Based Exercise Guidelines for PCOS

#### What the Research Says (Meta-analyses, 2020-2025)

**Key finding from Frontiers in Physiology meta-analysis (33 studies, 777 women):**
- **Vigorous intensity exercise** had the greatest impact on:
  - Cardiorespiratory fitness (+24.2% VO2peak)
  - Insulin resistance (−36.2% HOMA-IR)
  - Waist circumference (−4.2%)
- **Minimum effective dose:** 120 min/week of vigorous intensity
- Exercise benefits were **independent of weight loss** — lean women with PCOS also benefit

**Key finding on androgens (Frontiers in Sports, 2025):**
- Resistance training showed the greatest improvements in Free Androgen Index (FAI)
- Combined aerobic + resistance training was most effective overall
- HIIT showed comparable benefits to moderate continuous training with less time commitment

**Network meta-analysis (MDPI, 2025, 19 RCTs, 808 women):**
- Compared yoga, MICT, HIIT, resistance training, combined training
- **Combined aerobic-resistance training** ranked highest for improving both insulin resistance AND testosterone simultaneously
- HIIT was second-best for time efficiency

#### Recommended Exercise Framework for Tina's Profile

**Profile:** High androgen PCOS | 태음인 body type | Mid-30s | ~135 lbs | Post egg-freezing

##### 태음인 (Tae-Eum-In) Considerations
From Sasang constitutional medicine:
- Strong liver function, weak lung function
- Tendency toward dense body composition, fluid retention
- **Sweating is healthy and therapeutic** — indicates good metabolism
- Benefits from exercises that promote sweating and circulation
- Should avoid sedentary lifestyle; needs regular vigorous movement
- Prone to: hypertension, liver issues, respiratory issues
- **Exercise implication:** Favor sweat-inducing cardio + strength work. Gentle/restorative-only routines are insufficient for this body type.

##### Post Egg-Freezing Recovery
- **First 1-2 weeks:** Light walking and gentle stretching only. No impact, no twisting.
- **After first period (1-2 weeks post-retrieval):** Gradually reintroduce moderate exercise
- **2-4 weeks post-retrieval:** Resume normal exercise routine
- **App should ask:** "Are you currently in post-retrieval recovery?" → adjust recommendations

##### Weekly Exercise Plan Template

| Day | Type | Duration | Intensity | Examples |
|-----|------|----------|-----------|----------|
| Mon | Resistance Training | 45 min | Moderate-High | Weight training, Lagree |
| Tue | Moderate Cardio | 30-45 min | Moderate | Brisk walking, swimming |
| Wed | Pilates/Yoga | 45 min | Low-Moderate | Mat Pilates, restorative yoga |
| Thu | HIIT or Resistance | 30 min | High | Circuit training, Lagree |
| Fri | Moderate Cardio | 30-45 min | Moderate | Walking, cycling |
| Sat | Active Recovery/Fun | 30-60 min | Low | Hiking, gentle yoga, stretching |
| Sun | Rest or Light Walk | 20-30 min | Low | Nature walk |

**Weekly totals:** ~150-180 min moderate + 60-75 min vigorous = meets PCOS guidelines

##### Key Principles for the Recommendation Engine

1. **Prioritize resistance training 2-3x/week** — strongest evidence for lowering androgens
2. **Include sweat-inducing sessions** — aligns with 태음인 needs for circulation/metabolism
3. **Mix cardio types** — HIIT (1-2x) + steady-state (2-3x) for insulin sensitivity
4. **Include mind-body** — Pilates (which Tina already does) counts; add yoga for cortisol management
5. **Avoid overtraining** — excessive exercise can raise cortisol → worsen androgens. Cap at 5-6 sessions/week.
6. **Recovery-aware** — Use Oura readiness score to suggest rest days vs. push days
7. **Cycle-aware** — Adjust intensity based on menstrual phase:
   - Follicular phase → higher intensity OK
   - Luteal phase → moderate intensity, more recovery
   - Menstrual → gentle movement, walking, yoga

### Exercise Engine Architecture

```
Input Signals:
  - PCOS type (high androgen)
  - Body type (태음인)
  - Current exercise habits (from onboarding)
  - Oura readiness score (when available)
  - Menstrual cycle phase (from period tracker)
  - Recovery status (post-procedure flags)
  - Recent exercise log

Processing:
  - Rule-based engine (v1) — no ML needed initially
  - Weekly plan generation with daily suggestions
  - Intensity modulation based on readiness + cycle phase
  - Exercise variety to prevent plateau

Output:
  - "Today's Suggestion" card on home screen
  - Weekly plan view
  - Exercise type + duration + intensity
  - Why this exercise today (brief explanation)
  - Adjusts if user logs different exercise
```

---

## 4. Recommended Build Order

### Priority Matrix

| Feature | User Value | Technical Effort | Dependencies | Priority |
|---------|-----------|-----------------|--------------|----------|
| Exercise Log (manual) | ⭐⭐⭐⭐ | Low | None | 🔴 P0 |
| Exercise Recommendations v1 | ⭐⭐⭐⭐⭐ | Medium | Exercise log | 🔴 P0 |
| Oura Manual Input (v1) | ⭐⭐⭐ | Low | None | 🟡 P1 |
| Oura API Integration (v2) | ⭐⭐⭐⭐ | Medium | Oura v1 | 🟡 P1 |
| Apple Health Sync | ⭐⭐ | High | Native iOS build | 🟢 P2 |

### Recommended Next 2-3 Features

#### 1. 🏋️ Exercise Logging + Recommendations (combined sprint)
**Why first:**
- Tina already exercises (Pilates, Lagree, walking) but has no way to log it
- Exercise directly feeds the daily health score (15% weight)
- The recommendation engine is **uniquely valuable** — no other app combines PCOS-specific + 태음인 + cycle-aware exercise advice
- Low technical risk, high user engagement
- Cards already exist: "Exercise log - manual entry" + "Exercise recommendations engine (v2)"

**Build scope:**
1. Exercise logging screen (type, duration, intensity, notes)
2. Exercise type picker (resistance, cardio, HIIT, Pilates, yoga, walking, Lagree, swimming, etc.)
3. Rule-based recommendation engine with daily suggestion
4. Cycle phase integration (from existing period tracker)

#### 2. ⌚ Oura Manual Input → API Integration
**Why second:**
- Bridges gap until full API integration
- Sleep + readiness data feeds into health score AND exercise recommendations
- Manual input is fast to build; API integration follows naturally
- Tina already checks Oura daily — just needs to enter 2-3 numbers

**Build scope (v1):**
1. "Today's Oura Stats" entry screen: sleep score, readiness score, HRV (optional)
2. Save to daily_scores or separate oura_data table
3. Feed sleep score into daily health score calculation
4. Feed readiness into exercise recommendation ("low readiness → suggest gentle day")

**Build scope (v2 — follow-up):**
1. OAuth2 flow with Supabase Edge Function
2. Daily automated data sync
3. Historical data import
4. Temperature tracking for cycle correlation

#### 3. 📊 Weight Tracking & Trend Chart
**Why third:**
- Simple, high-value, fast to build
- Weight trends matter for PCOS management (not just the number — the trend)
- Feeds into daily health score system
- Already has a card in backlog

---

## 5. What NOT to Build Yet

| Feature | Why Wait |
|---------|----------|
| Apple Health Sync | Requires native iOS build; Oura covers most data |
| AI Health Analysis | Needs 2-4 weeks of data first |
| Barcode Scanner | Nice-to-have, not core PCOS tracking |
| Smart Scale Sync | Depends on Apple Health integration |
| Weekly AI Insights | Needs sufficient logged data to be useful |

---

## Sources

- Oura API V2 Documentation: https://cloud.ouraring.com/v2/docs
- Oura API Getting Started: https://cloud.ouraring.com/docs/
- "Exercise Interventions in PCOS: A Systematic Review and Meta-Analysis" — PMC7358428 (Frontiers in Physiology, 2020)
- "Effects of Different Exercises on Insulin Resistance and Testosterone in PCOS" — MDPI Healthcare 2025
- "Effectiveness of exercise interventions on androgen levels in PCOS" — Frontiers in Sports, 2025
- "Can resistance training improve PCOS symptoms?" — PMC6109818
- Healthline: "Exercise for PCOS: Sample Plan, Types, and More"
- Sasang Constitutional Medicine — Tae-Eum-In characteristics: taoofmedicine.com
- Apple HealthKit limitations: themomentum.ai/blog
- react-native-health Expo plugin: github.com/agencyenterprise/react-native-health
- Post egg-retrieval exercise guidelines: theluckyegg.com, marinfertilitycenter.com, springfertility.com
