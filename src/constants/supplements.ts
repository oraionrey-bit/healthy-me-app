/**
 * Default supplement lists by health condition.
 * Shared between onboarding (supplements picker) and the supplements hook (auto-seed).
 */
export interface DefaultSupplement {
  supplement_name: string;
  dosage: string;
  time_of_day: string;
  sort_order: number;
}

/** PCOS-specific supplement stack */
export const PCOS_SUPPLEMENTS: readonly DefaultSupplement[] = [
  { supplement_name: 'Ovasitol (AM)', dosage: '1 scoop', time_of_day: 'morning', sort_order: 0 },
  { supplement_name: 'Knowell', dosage: '4 caps', time_of_day: 'morning', sort_order: 1 },
  { supplement_name: 'NAC', dosage: '500mg', time_of_day: 'morning', sort_order: 2 },
  { supplement_name: 'Omega-3', dosage: '4 softgels', time_of_day: 'morning', sort_order: 3 },
  { supplement_name: 'Ovasitol (PM)', dosage: '1 scoop', time_of_day: 'evening', sort_order: 4 },
  { supplement_name: 'BionerLab Gummies', dosage: '2 gummies', time_of_day: 'evening', sort_order: 5 },
] as const;

/** General health supplement stack */
export const GENERAL_SUPPLEMENTS: readonly DefaultSupplement[] = [
  { supplement_name: 'Multivitamin', dosage: '1 tablet', time_of_day: 'morning', sort_order: 0 },
  { supplement_name: 'Vitamin D', dosage: '2000 IU', time_of_day: 'morning', sort_order: 1 },
  { supplement_name: 'Omega-3', dosage: '2 softgels', time_of_day: 'morning', sort_order: 2 },
] as const;

/** Backwards-compatible alias — defaults to PCOS stack */
export const DEFAULT_SUPPLEMENTS: readonly DefaultSupplement[] = PCOS_SUPPLEMENTS;

/** Get supplements based on health condition */
export function getSupplementsForCondition(condition: string): readonly DefaultSupplement[] {
  return condition === 'pcos' ? PCOS_SUPPLEMENTS : GENERAL_SUPPLEMENTS;
}
