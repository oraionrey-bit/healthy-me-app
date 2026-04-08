import type { PlanSuggestion } from '../types/skin-plan';

// Stub — plan suggestions feature not yet implemented
export function usePlanSuggestions(_planId?: string) {
  const suggestions: PlanSuggestion[] = [];
  const pendingCount = 0;

  const approveSuggestion = async (_id: string) => {};
  const saveForLater = async (_id: string) => {};

  return { suggestions, pendingCount, approveSuggestion, saveForLater };
}
