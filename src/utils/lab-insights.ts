/**
 * PCOS Lab Insights Engine
 * Generates personalized health insights from lab results.
 */

import type { HealthLab } from '../types/database';

export interface LabInsight {
  type: 'improved' | 'attention' | 'info' | 'unchanged';
  emoji: string;
  title: string;
  message: string;
}

interface LabSnapshot {
  latest: Map<string, HealthLab>;
  previous: Map<string, HealthLab>;
}

function buildSnapshot(labs: HealthLab[]): LabSnapshot {
  const byTest = new Map<string, HealthLab[]>();
  for (const lab of labs) {
    const list = byTest.get(lab.test_name) ?? [];
    list.push(lab);
    byTest.set(lab.test_name, list);
  }

  const latest = new Map<string, HealthLab>();
  const previous = new Map<string, HealthLab>();

  for (const [name, entries] of byTest) {
    const sorted = entries.sort((a, b) => a.test_date.localeCompare(b.test_date));
    latest.set(name, sorted[sorted.length - 1]);
    if (sorted.length >= 2) {
      previous.set(name, sorted[sorted.length - 2]);
    }
  }

  return { latest, previous };
}

function getVal(snap: LabSnapshot, name: string): number | null {
  return snap.latest.get(name)?.value ?? null;
}

function getPrev(snap: LabSnapshot, name: string): number | null {
  return snap.previous.get(name)?.value ?? null;
}

function improved(snap: LabSnapshot, name: string, lowerIsBetter: boolean): boolean | null {
  const curr = getVal(snap, name);
  const prev = getPrev(snap, name);
  if (curr == null || prev == null) return null;
  return lowerIsBetter ? curr < prev : curr > prev;
}

export function generateLabInsights(labs: HealthLab[]): LabInsight[] {
  if (labs.length === 0) return [];
  const snap = buildSnapshot(labs);
  const insights: LabInsight[] = [];

  // Testosterone
  const testo = getVal(snap, 'Testosterone (Total)');
  if (testo != null && testo > 46) {
    const imp = improved(snap, 'Testosterone (Total)', true);
    if (imp === true) {
      insights.push({
        type: 'improved',
        emoji: '✅',
        title: 'Testosterone improving',
        message: `Down to ${testo} ng/dL — your protocol is working! Keep up NAC, spearmint tea, and inositol.`,
      });
    } else {
      insights.push({
        type: 'attention',
        emoji: '⚠️',
        title: 'Elevated androgens',
        message: `Testosterone at ${testo} ng/dL (normal: 15–46). Common in PCOS. NAC, spearmint tea, and inositol support androgen reduction.`,
      });
    }
  }

  // HbA1c
  const hba1c = getVal(snap, 'HbA1c');
  if (hba1c != null) {
    if (hba1c > 5.6) {
      insights.push({
        type: 'attention',
        emoji: '🔴',
        title: 'HbA1c above normal',
        message: `HbA1c at ${hba1c}% — above 5.6% is pre-diabetic. Ovasitol and protein-first eating help insulin sensitivity.`,
      });
    } else if (hba1c > 5.4) {
      const imp = improved(snap, 'HbA1c', true);
      if (imp === true) {
        insights.push({
          type: 'improved',
          emoji: '✅',
          title: 'HbA1c improving',
          message: `HbA1c down to ${hba1c}% — your protocol is working!`,
        });
      } else {
        insights.push({
          type: 'attention',
          emoji: '🟡',
          title: 'HbA1c borderline',
          message: `HbA1c at ${hba1c}% — borderline range. Continuing Ovasitol and protein-first eating can help.`,
        });
      }
    }
  }

  // SHBG
  const shbg = getVal(snap, 'SHBG');
  if (shbg != null && shbg > 100) {
    insights.push({
      type: 'info',
      emoji: 'ℹ️',
      title: 'High SHBG',
      message: `SHBG at ${shbg} nmol/L — high levels can falsely suppress free testosterone calculation.`,
    });
  }

  // Free Testosterone
  const freeT = getVal(snap, 'Testosterone (Free)');
  if (freeT != null && freeT > 1.9) {
    insights.push({
      type: 'attention',
      emoji: '⚠️',
      title: 'Elevated free testosterone',
      message: `Free T at ${freeT} pg/mL — the strongest marker of hyperandrogenism in PCOS.`,
    });
  }

  // Vitamin D
  const vitD = getVal(snap, 'Vitamin D');
  if (vitD != null && vitD < 30) {
    insights.push({
      type: 'attention',
      emoji: '☀️',
      title: 'Low vitamin D',
      message: `Vitamin D at ${vitD} ng/mL — supplement 2000–4000 IU daily. Low D is linked to insulin resistance in PCOS.`,
    });
  }

  // Ferritin
  const ferr = getVal(snap, 'Ferritin');
  if (ferr != null && ferr < 30) {
    insights.push({
      type: 'attention',
      emoji: '🩸',
      title: 'Low ferritin',
      message: `Ferritin at ${ferr} ng/mL — common in PCOS. Consider iron supplementation with vitamin C for absorption.`,
    });
  }

  // LH:FSH ratio (PCOS marker)
  const lh = getVal(snap, 'LH');
  const fsh = getVal(snap, 'FSH');
  if (lh != null && fsh != null && fsh > 0) {
    const ratio = lh / fsh;
    if (ratio > 2) {
      insights.push({
        type: 'info',
        emoji: '📊',
        title: 'Elevated LH:FSH ratio',
        message: `LH:FSH ratio is ${ratio.toFixed(1)}:1 — ratios above 2:1 are a classic PCOS marker.`,
      });
    }
  }

  // CRP
  const crp = getVal(snap, 'CRP (hs)');
  if (crp != null && crp > 3) {
    insights.push({
      type: 'attention',
      emoji: '🔥',
      title: 'Elevated inflammation',
      message: `hs-CRP at ${crp} mg/L — elevated inflammation. Anti-inflammatory diet and omega-3s can help.`,
    });
  }

  return insights;
}

/** Get a comparison summary for a single test */
export function getTestComparison(
  current: number,
  previous: number | null,
  refHigh: number | null,
  refLow: number | null,
): { label: string; emoji: string; type: 'improved' | 'unchanged' | 'attention' } {
  if (previous == null) {
    return { label: 'First result', emoji: '📋', type: 'unchanged' };
  }

  const diff = current - previous;
  const pctChange = previous !== 0 ? Math.abs((diff / previous) * 100) : 0;

  if (pctChange < 2) {
    return { label: 'Unchanged', emoji: '➡️', type: 'unchanged' };
  }

  // Determine if going up or down is good
  const currentInRange =
    (refLow == null || current >= refLow) && (refHigh == null || current <= refHigh);
  const previousInRange =
    (refLow == null || previous >= refLow) && (refHigh == null || previous <= refHigh);

  if (!previousInRange && currentInRange) {
    return { label: 'Improved', emoji: '✅', type: 'improved' };
  }
  if (previousInRange && !currentInRange) {
    return { label: 'Needs attention', emoji: '⚠️', type: 'attention' };
  }
  if (currentInRange) {
    return { label: 'Improved', emoji: '✅', type: 'improved' };
  }

  // Both out of range — check if moving toward range
  if (refHigh != null && current > refHigh) {
    return diff < 0
      ? { label: 'Improving', emoji: '📈', type: 'improved' }
      : { label: 'Needs attention', emoji: '⚠️', type: 'attention' };
  }
  if (refLow != null && current < refLow) {
    return diff > 0
      ? { label: 'Improving', emoji: '📈', type: 'improved' }
      : { label: 'Needs attention', emoji: '⚠️', type: 'attention' };
  }

  return { label: 'Unchanged', emoji: '➡️', type: 'unchanged' };
}
