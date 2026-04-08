# Routine & Tester Performance Dashboard

**Date:** 2026-04-07
**Tier:** 3
**Status:** In Progress

## Goal
Add analytics and insights to the skincare tab so Tina can see how her routine adherence and product testing are trending over time.

## Requirements (EARS)

### MUST
1. **Ubiquitous:** The system shall display a Routine Insights card showing weekly AM/PM adherence percentage and current completion streak.
2. **Ubiquitous:** The system shall display a Tester Performance card showing each testing product's day count, last 7 days of reactions as emojis, and overall good/neutral/bad ratio.
3. **Event-driven:** When a product's testing reactions are mostly good (≥70% over 7+ days), the system shall show a "Consider marking safe" suggestion.
4. **Event-driven:** When a product's testing reactions are mostly bad (≥50% bad over 5+ days), the system shall show a "Consider marking trigger" suggestion.
5. **Event-driven:** When a new product is scanned/added, the system shall prompt the user to add it to their AM or PM routine.

### PREFER
6. **Ubiquitous:** The system shall show the most-skipped routine step in the insights card.
7. **Ubiquitous:** The system shall show tester performance sorted by day count (longest testing first).

### NICE
8. **Ubiquitous:** The system shall show a mini trend chart for routine adherence (last 4 weeks).

## EARS Score
- Clarity: 8/10
- Completeness: 7/10
- Specificity: 8/10
- Average: 7.7 ✅

## Feasibility
- All data already exists in `daily_logs.health_notes` (routine checks, product usage logs)
- No new database tables needed — purely computed from existing data
- No new API calls — all client-side analytics
- Stack: React Native, existing use-skincare hook

## Design

### Data Flow
```
daily_logs.health_notes → useSkincare() → computed analytics → UI cards
```

### New Computed Properties in useSkincare()

```typescript
interface RoutineInsights {
  amAdherencePercent: number;    // last 7 days
  pmAdherencePercent: number;    // last 7 days
  currentStreak: number;         // consecutive days both routines completed
  mostSkippedStep: string | null;
}

interface TesterSummary {
  productId: string;
  productName: string;
  dayCount: number;
  last7Days: Array<'good' | 'neutral' | 'bad' | 'none'>;
  goodPercent: number;
  neutralPercent: number;
  badPercent: number;
  totalLogs: number;
  suggestion: 'consider-safe' | 'consider-trigger' | null;
}
```

### Analytics Logic

**Adherence:** For each of last 7 days, check routineChecks[date]. A routine is "done" if ≥80% of its steps are checked. adherencePercent = daysComplete / 7 * 100.

**Streak:** Walk backwards from today counting consecutive days where both AM and PM are ≥80% complete.

**Most Skipped:** Across last 7 days, count unchecked occurrences per step. Highest = most skipped.

**Tester Summary:** For each testing product, pull usageLog, compute last 7 entries, overall ratios, and suggestion based on thresholds.

### New Components

1. `src/components/skin/routine-insights-card.tsx` — Adherence %, streak, most skipped
2. `src/components/skin/tester-performance-card.tsx` — Testing product summaries

### UI Placement
Insert between the routine checklist section and the products section in skin.tsx. New section header: "How It's Going"

## Files to Modify
- `src/hooks/use-skincare.ts` — add routineInsights and testerSummaries computed values
- `src/app/(tabs)/skin.tsx` — import and render new cards, add "add to routine" prompt on new products
- New: `src/components/skin/routine-insights-card.tsx`
- New: `src/components/skin/tester-performance-card.tsx`
- Tests: `src/__tests__/skin-dashboard.test.tsx`
