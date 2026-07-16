import {
  getFoodAnalysisProviderLabel,
  isLeftoversAdjusted,
} from '../utils/food-analysis-provider';

describe('getFoodAnalysisProviderLabel', () => {
  it.each([
    ['clawrouter', 'Analyzed by Claude'],
    ['anthropic', 'Analyzed by Claude'],
    ['gemini', 'Analyzed by Gemini'],
    ['adjusted_for_leftovers|clawrouter', 'Analyzed by Claude'],
    ['adjusted_for_leftovers|anthropic', 'Analyzed by Claude'],
    ['adjusted_for_leftovers|gemini', 'Analyzed by Gemini'],
  ])('maps %s metadata to %s', (notes, expected) => {
    expect(getFoodAnalysisProviderLabel({ ai_analyzed: true, notes })).toBe(expected);
  });

  it.each([
    { ai_analyzed: false, notes: 'clawrouter' },
    { ai_analyzed: false, notes: 'gemini' },
    { ai_analyzed: true, notes: null },
    { ai_analyzed: true, notes: '' },
    { ai_analyzed: true, notes: 'manual' },
    { ai_analyzed: true, notes: 'unknown-provider' },
    { ai_analyzed: true, notes: 'adjusted_for_leftovers' },
  ])('does not label pending, manual, or unknown metadata %#', (entry) => {
    expect(getFoodAnalysisProviderLabel(entry)).toBeNull();
  });
});

describe('isLeftoversAdjusted', () => {
  it('recognizes the current leftovers metadata with a provider token', () => {
    expect(isLeftoversAdjusted('adjusted_for_leftovers|gemini')).toBe(true);
  });

  it('recognizes legacy leftovers metadata', () => {
    expect(isLeftoversAdjusted('adjusted_for_leftovers')).toBe(true);
  });

  it('does not mark normal or missing metadata as leftovers', () => {
    expect(isLeftoversAdjusted('clawrouter')).toBe(false);
    expect(isLeftoversAdjusted(null)).toBe(false);
  });
});
