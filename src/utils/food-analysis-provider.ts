import type { FoodLog } from '../types/database';

type FoodAnalysisMetadata = Pick<FoodLog, 'ai_analyzed' | 'notes'>;

const PROVIDER_LABELS: Readonly<Record<string, string>> = {
  clawrouter: 'Analyzed by Claude',
  anthropic: 'Analyzed by Claude',
  gemini: 'Analyzed by Gemini',
};

export function getFoodAnalysisProviderLabel(
  entry: FoodAnalysisMetadata,
): string | null {
  if (!entry.ai_analyzed || !entry.notes) return null;

  const metadataTokens = entry.notes
    .toLowerCase()
    .split('|')
    .map((token) => token.trim());

  for (const token of metadataTokens) {
    const label = PROVIDER_LABELS[token];
    if (label) return label;
  }

  return null;
}

export function isLeftoversAdjusted(notes: FoodLog['notes']): boolean {
  return notes
    ?.toLowerCase()
    .split('|')
    .some((token) => token.trim() === 'adjusted_for_leftovers') ?? false;
}
