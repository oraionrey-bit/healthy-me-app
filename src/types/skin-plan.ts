/**
 * Phased Skincare Plan Types
 * Supports multi-phase plans with alternating-day scheduling,
 * transition criteria, and daily routine tracking.
 */

export type ProductCategory =
  | 'cleanser'
  | 'toner'
  | 'serum'
  | 'ampoule'
  | 'moisturizer'
  | 'spf'
  | 'active'
  | 'mask'
  | 'lip'
  | 'oil';

export type ProductStatus = 'safe' | 'testing' | 'trigger' | 'retired';

export type Frequency = 'daily' | 'every-other-day' | '2x-week' | '3x-week' | 'weekly';

export type PhaseStatus = 'upcoming' | 'active' | 'completed' | 'skipped';

export interface SkinProduct {
  id: string;
  name: string;
  brand?: string;
  category: ProductCategory;
  status: ProductStatus;
  notes?: string;
}

export interface RoutineStep {
  id: string;
  product: SkinProduct;
  order: number;
  frequency: Frequency;
  /** Days of week for 2x-week / 3x-week (0=Sun … 6=Sat) */
  scheduleDays?: number[];
  notes?: string;
  /** Highlight products new in this phase */
  isNew?: boolean;
}

export interface TransitionCondition {
  metric: 'breakout-free-days' | 'skin-score' | 'irritation-free' | 'custom';
  threshold: number;
  description: string;
}

export interface TransitionCriteria {
  type: 'manual' | 'auto-suggest';
  minDays: number;
  conditions: TransitionCondition[];
}

export interface Phase {
  id: string;
  name: string;
  order: number;
  durationWeeks: number;
  startDate: string | null;
  status: PhaseStatus;
  goal: string;
  transitionCriteria: TransitionCriteria;
  amRoutine: RoutineStep[];
  pmRoutine: RoutineStep[];
}

export interface SkinPlan {
  id: string;
  userId: string;
  planName: string;
  startDate: string;
  createdBy: 'user' | 'ai';
  phases: Phase[];
  activePhaseIndex: number;
  status: 'active' | 'completed' | 'paused';
  skinProfile: SkinProfile | null;
}

// ── Plan Suggestion Types ──────────────────────────────────────────────

export type SuggestionSource = 'milestone_check_in' | 'ask_oraion' | 'journal_alert' | 'cycle_adaptation';
export type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'saved_for_later';
export type SuggestionType = 'advance_phase' | 'add_product' | 'remove_product' | 'change_frequency' | 'pause_actives' | 'extend_phase';

export interface PlanSuggestion {
  id: string;
  planId: string;
  userId: string;
  source: SuggestionSource;
  status: SuggestionStatus;
  suggestionType: SuggestionType;
  proposedChanges: Record<string, unknown>;
  aiReasoning: string | null;
  evidence: Record<string, unknown>;
  createdAt: string;
  respondedAt: string | null;
}

export interface PlanSuggestionRow {
  id: string;
  plan_id: string;
  user_id: string;
  source: string;
  status: string;
  suggestion_type: string;
  proposed_changes: Record<string, unknown>;
  ai_reasoning: string | null;
  evidence: Record<string, unknown>;
  created_at: string;
  responded_at: string | null;
}

export function rowToSuggestion(row: PlanSuggestionRow): PlanSuggestion {
  return {
    id: row.id,
    planId: row.plan_id,
    userId: row.user_id,
    source: row.source as SuggestionSource,
    status: row.status as SuggestionStatus,
    suggestionType: row.suggestion_type as SuggestionType,
    proposedChanges: row.proposed_changes,
    aiReasoning: row.ai_reasoning,
    evidence: row.evidence,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

// ── Skin Profile Types ─────────────────────────────────────────────────

export interface SkinSensitivity {
  ingredient: string;
  reaction: string;
  severity: string;
  note?: string;
}

export interface SkinTrigger {
  trigger: string;
  symptom: string;
}

export interface SkinProfile {
  known_sensitivities: SkinSensitivity[];
  known_triggers: SkinTrigger[];
  skin_type: string;
  skin_concerns: string[];
  fitzpatrick: string;
  pcos_flag: boolean;
  cycle_tracking_enabled: boolean;
  safe_products: string[];
}

/** Row shape returned by Supabase for skin_plans table */
export interface SkinPlanRow {
  id: string;
  user_id: string;
  plan_name: string;
  start_date: string;
  created_by: string;
  skin_profile: Record<string, unknown>;
  phases: Phase[];
  active_phase_index: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// ── Scheduling helpers ─────────────────────────────────────────────────

/**
 * Determine whether a product is "on" for a given date based on frequency.
 */
export function isProductScheduled(
  step: RoutineStep,
  date: Date,
  phaseStartDate: string | null,
): boolean {
  switch (step.frequency) {
    case 'daily':
      return true;

    case 'every-other-day': {
      if (!phaseStartDate) return true;
      const start = new Date(phaseStartDate);
      const diffMs = date.getTime() - start.getTime();
      const diffDays = Math.floor(diffMs / 86_400_000);
      return diffDays % 2 === 0; // ON on even days from phase start
    }

    case '2x-week':
    case '3x-week': {
      if (step.scheduleDays && step.scheduleDays.length > 0) {
        return step.scheduleDays.includes(date.getDay());
      }
      // Fallback: distribute evenly
      if (step.frequency === '2x-week') {
        return [1, 4].includes(date.getDay()); // Mon, Thu
      }
      return [1, 3, 5].includes(date.getDay()); // Mon, Wed, Fri
    }

    case 'weekly': {
      if (step.scheduleDays && step.scheduleDays.length > 0) {
        return step.scheduleDays.includes(date.getDay());
      }
      return date.getDay() === 0; // default Sunday
    }

    default:
      return true;
  }
}

/**
 * Convert a SkinPlanRow from Supabase into a typed SkinPlan.
 */
export function rowToPlan(row: SkinPlanRow): SkinPlan {
  const profile = row.skin_profile as Record<string, unknown> | null;
  const hasProfile = profile && typeof profile === 'object' && 'skin_type' in profile;
  return {
    id: row.id,
    userId: row.user_id,
    planName: row.plan_name,
    startDate: row.start_date,
    createdBy: row.created_by as 'user' | 'ai',
    phases: row.phases,
    activePhaseIndex: row.active_phase_index,
    status: row.status as SkinPlan['status'],
    skinProfile: hasProfile ? (profile as unknown as SkinProfile) : null,
  };
}
