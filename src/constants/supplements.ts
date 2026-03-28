/**
 * Default PCOS supplement list.
 * Shared between onboarding (supplements picker) and the supplements hook (auto-seed).
 */
export interface DefaultSupplement {
  supplement_name: string;
  dosage: string;
  time_of_day: string;
  sort_order: number;
}

export const DEFAULT_SUPPLEMENTS: readonly DefaultSupplement[] = [
  { supplement_name: 'Ovasitol (AM)', dosage: '1 scoop', time_of_day: 'morning', sort_order: 0 },
  { supplement_name: 'Knowell', dosage: '4 caps', time_of_day: 'morning', sort_order: 1 },
  { supplement_name: 'NAC', dosage: '500mg', time_of_day: 'morning', sort_order: 2 },
  { supplement_name: 'Omega-3', dosage: '4 softgels', time_of_day: 'morning', sort_order: 3 },
  { supplement_name: 'Ovasitol (PM)', dosage: '1 scoop', time_of_day: 'evening', sort_order: 4 },
  { supplement_name: 'BionerLab Gummies', dosage: '2 gummies', time_of_day: 'evening', sort_order: 5 },
] as const;
