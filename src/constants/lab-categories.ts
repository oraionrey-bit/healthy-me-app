/**
 * Lab test definitions, categories, and reference ranges.
 * PCOS-focused with fertility monitoring support.
 */

export interface LabTestDef {
  name: string;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
}

export interface LabCategory {
  label: string;
  emoji: string;
  key: string;
  tests: LabTestDef[];
}

export const LAB_CATEGORIES: Record<string, LabCategory> = {
  hormones: {
    label: 'Hormones',
    emoji: '🧬',
    key: 'hormones',
    tests: [
      { name: 'Testosterone (Total)', unit: 'ng/dL', refLow: 15, refHigh: 46 },
      { name: 'Testosterone (Free)', unit: 'pg/mL', refLow: 0.3, refHigh: 1.9 },
      { name: 'SHBG', unit: 'nmol/L', refLow: 18, refHigh: 144 },
      { name: 'Estradiol (E2)', unit: 'pg/mL', refLow: 15, refHigh: 350 },
      { name: 'Progesterone', unit: 'ng/mL', refLow: 0.1, refHigh: 25 },
      { name: 'LH', unit: 'mIU/mL', refLow: 1.9, refHigh: 12.5 },
      { name: 'FSH', unit: 'mIU/mL', refLow: 1.5, refHigh: 12.4 },
      { name: 'DHEA-S', unit: 'mcg/dL', refLow: 65, refHigh: 380 },
      { name: 'Prolactin', unit: 'ng/mL', refLow: 4.8, refHigh: 23.3 },
      { name: 'AMH', unit: 'ng/mL', refLow: 1.0, refHigh: 3.5 },
      { name: 'Cortisol', unit: 'mcg/dL', refLow: 6.2, refHigh: 19.4 },
    ],
  },
  metabolic: {
    label: 'Metabolic',
    emoji: '🔬',
    key: 'metabolic',
    tests: [
      { name: 'HbA1c', unit: '%', refLow: 4.0, refHigh: 5.6 },
      { name: 'Fasting Glucose', unit: 'mg/dL', refLow: 65, refHigh: 99 },
      { name: 'Fasting Insulin', unit: 'μIU/mL', refLow: 2.6, refHigh: 24.9 },
      { name: 'HOMA-IR', unit: 'ratio', refLow: 0, refHigh: 1.9 },
      { name: 'Cholesterol (Total)', unit: 'mg/dL', refLow: 0, refHigh: 200 },
      { name: 'LDL', unit: 'mg/dL', refLow: 0, refHigh: 100 },
      { name: 'HDL', unit: 'mg/dL', refLow: 50, refHigh: 999 },
      { name: 'Triglycerides', unit: 'mg/dL', refLow: 0, refHigh: 150 },
      { name: 'CRP (hs)', unit: 'mg/L', refLow: 0, refHigh: 3.0 },
    ],
  },
  thyroid: {
    label: 'Thyroid',
    emoji: '🦋',
    key: 'thyroid',
    tests: [
      { name: 'TSH', unit: 'mIU/L', refLow: 0.45, refHigh: 4.5 },
      { name: 'Free T4', unit: 'ng/dL', refLow: 0.82, refHigh: 1.77 },
      { name: 'Free T3', unit: 'pg/mL', refLow: 2.0, refHigh: 4.4 },
    ],
  },
  vitamins: {
    label: 'Vitamins & Minerals',
    emoji: '💊',
    key: 'vitamins',
    tests: [
      { name: 'Vitamin D', unit: 'ng/mL', refLow: 30, refHigh: 100 },
      { name: 'Vitamin B12', unit: 'pg/mL', refLow: 200, refHigh: 900 },
      { name: 'Ferritin', unit: 'ng/mL', refLow: 12, refHigh: 150 },
      { name: 'Iron', unit: 'mcg/dL', refLow: 60, refHigh: 170 },
      { name: 'Folate', unit: 'ng/mL', refLow: 2.7, refHigh: 17.0 },
      { name: 'Magnesium', unit: 'mg/dL', refLow: 1.7, refHigh: 2.2 },
      { name: 'Zinc', unit: 'mcg/dL', refLow: 60, refHigh: 120 },
    ],
  },
  blood: {
    label: 'Blood Count',
    emoji: '🩸',
    key: 'blood',
    tests: [
      { name: 'WBC', unit: 'K/μL', refLow: 3.4, refHigh: 10.8 },
      { name: 'RBC', unit: 'M/μL', refLow: 3.77, refHigh: 5.28 },
      { name: 'Hemoglobin', unit: 'g/dL', refLow: 11.1, refHigh: 15.9 },
      { name: 'Hematocrit', unit: '%', refLow: 34, refHigh: 46.6 },
      { name: 'Platelets', unit: 'K/μL', refLow: 150, refHigh: 379 },
    ],
  },
  fertility: {
    label: 'Fertility',
    emoji: '🥚',
    key: 'fertility',
    tests: [
      { name: 'E2 (Stim Monitoring)', unit: 'pg/mL', refLow: null, refHigh: null },
      { name: 'Progesterone (Stim)', unit: 'ng/mL', refLow: null, refHigh: null },
      { name: 'BHCG', unit: 'mIU/mL', refLow: null, refHigh: null },
    ],
  },
};

/** Ordered category keys for display */
export const CATEGORY_ORDER = ['hormones', 'metabolic', 'thyroid', 'vitamins', 'blood', 'fertility'] as const;

/** Flat list of all tests for search */
export function getAllTests(): Array<LabTestDef & { category: string }> {
  const all: Array<LabTestDef & { category: string }> = [];
  for (const [catKey, cat] of Object.entries(LAB_CATEGORIES)) {
    for (const test of cat.tests) {
      all.push({ ...test, category: catKey });
    }
  }
  return all;
}

/** Find a test definition by name */
export function findTestDef(name: string): (LabTestDef & { category: string }) | undefined {
  return getAllTests().find((t) => t.name === name);
}

/** Compute status from value vs reference range */
export function computeLabStatus(
  value: number,
  refLow: number | null,
  refHigh: number | null,
): 'normal' | 'high' | 'low' | 'borderline' {
  if (refLow != null && value < refLow) return 'low';
  if (refHigh != null && value > refHigh) return 'high';
  // Borderline: within 10% of boundary
  if (refLow != null && refHigh != null) {
    const range = refHigh - refLow;
    const margin = range * 0.1;
    if (value <= refLow + margin || value >= refHigh - margin) return 'borderline';
  }
  return 'normal';
}
