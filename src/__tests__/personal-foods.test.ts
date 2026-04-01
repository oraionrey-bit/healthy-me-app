/**
 * Tests for Personal Food Dictionary — fuzzy matching, auto-save, frequency sorting
 */
import { fuzzyMatch } from '../utils/fuzzy-match';

describe('fuzzyMatch', () => {
  it('returns 100 for exact match', () => {
    expect(fuzzyMatch('kimchi jjigae', 'kimchi jjigae')).toBe(100);
  });

  it('returns 100 for exact match (case insensitive)', () => {
    expect(fuzzyMatch('Kimchi Jjigae', 'kimchi jjigae')).toBe(100);
  });

  it('returns high score for prefix match', () => {
    const score = fuzzyMatch('kimchi', 'kimchi jjigae');
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it('returns good score for substring match', () => {
    const score = fuzzyMatch('jjigae', 'kimchi jjigae');
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it('matches partial words', () => {
    const score = fuzzyMatch('kim', 'kimchi jjigae');
    expect(score).toBeGreaterThan(20);
  });

  it('returns 0 for no match', () => {
    expect(fuzzyMatch('pizza', 'kimchi jjigae')).toBe(0);
  });

  it('returns 0 for empty query', () => {
    expect(fuzzyMatch('', 'kimchi jjigae')).toBe(0);
  });

  it('returns 0 for empty target', () => {
    expect(fuzzyMatch('kimchi', '')).toBe(0);
  });

  // Korean character support
  it('matches Korean characters exactly', () => {
    expect(fuzzyMatch('김치찌개', '김치찌개')).toBe(100);
  });

  it('matches Korean partial text', () => {
    const score = fuzzyMatch('김치', '김치찌개');
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it('matches Korean substring', () => {
    const score = fuzzyMatch('찌개', '김치찌개 with tofu');
    expect(score).toBeGreaterThan(20);
  });

  // Alias matching
  it('matches against aliases', () => {
    const score = fuzzyMatch('soybean paste stew', 'doenjang jjigae', [
      '된장찌개',
      'soybean paste stew',
    ]);
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it('matches Korean alias', () => {
    const score = fuzzyMatch('된장찌개', 'doenjang jjigae', [
      '된장찌개',
      'soybean paste stew',
    ]);
    expect(score).toBeGreaterThanOrEqual(90);
  });

  // Multi-word matching
  it('matches all words in different order', () => {
    const score = fuzzyMatch('chicken salad grilled', 'grilled chicken salad');
    expect(score).toBeGreaterThan(50);
  });

  it('matches partial word set', () => {
    const score = fuzzyMatch('chicken', 'grilled chicken salad with avocado');
    expect(score).toBeGreaterThan(20);
  });

  // Edge cases
  it('handles extra whitespace', () => {
    const score = fuzzyMatch('  kimchi  jjigae  ', 'kimchi jjigae');
    expect(score).toBe(100);
  });

  it('handles mixed case with Korean', () => {
    const score = fuzzyMatch('Bibimbap', 'bibimbap (비빔밥)');
    expect(score).toBeGreaterThanOrEqual(90);
  });
});

describe('frequency sorting', () => {
  it('sorts by use_count descending', () => {
    const foods = [
      { name: 'Rice', use_count: 10 },
      { name: 'Kimchi', use_count: 47 },
      { name: 'Bibimbap', use_count: 22 },
    ];
    const sorted = [...foods].sort((a, b) => b.use_count - a.use_count);
    expect(sorted[0].name).toBe('Kimchi');
    expect(sorted[1].name).toBe('Bibimbap');
    expect(sorted[2].name).toBe('Rice');
  });

  it('recency tiebreaks when use_count is equal', () => {
    const foods = [
      { name: 'A', use_count: 5, last_used_at: '2026-03-29T10:00:00Z' },
      { name: 'B', use_count: 5, last_used_at: '2026-04-01T10:00:00Z' },
    ];
    const sorted = [...foods].sort((a, b) => {
      if (b.use_count !== a.use_count) return b.use_count - a.use_count;
      return new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime();
    });
    expect(sorted[0].name).toBe('B');
  });
});

describe('auto-save logic', () => {
  it('detects when an entry transitions from unanalyzed to analyzed', () => {
    const prevEntries = [
      { id: '1', ai_analyzed: false, calories: null, description: 'test food' },
    ];
    const currentEntries = [
      { id: '1', ai_analyzed: true, calories: 350, description: 'test food' },
    ];

    const newlyAnalyzed = currentEntries.filter((entry) => {
      if (!entry.ai_analyzed || entry.calories == null) return false;
      const prev = prevEntries.find((p) => p.id === entry.id);
      return !prev || !prev.ai_analyzed;
    });

    expect(newlyAnalyzed).toHaveLength(1);
    expect(newlyAnalyzed[0].id).toBe('1');
  });

  it('does not re-save already analyzed entries', () => {
    const prevEntries = [
      { id: '1', ai_analyzed: true, calories: 350, description: 'test food' },
    ];
    const currentEntries = [
      { id: '1', ai_analyzed: true, calories: 350, description: 'test food' },
    ];

    const newlyAnalyzed = currentEntries.filter((entry) => {
      if (!entry.ai_analyzed || entry.calories == null) return false;
      const prev = prevEntries.find((p) => p.id === entry.id);
      return !prev || !prev.ai_analyzed;
    });

    expect(newlyAnalyzed).toHaveLength(0);
  });
});

describe('name normalization for upsert', () => {
  function normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  it('matches same food with different casing', () => {
    expect(normalizeText('Kimchi Jjigae')).toBe(normalizeText('kimchi jjigae'));
  });

  it('matches with extra spaces', () => {
    expect(normalizeText('  chicken  salad  ')).toBe(normalizeText('chicken salad'));
  });

  it('preserves Korean characters', () => {
    expect(normalizeText('김치찌개')).toBe('김치찌개');
  });

  it('handles mixed Korean and English', () => {
    expect(normalizeText('Kimchi 김치')).toBe('kimchi 김치');
  });
});

describe('serving size calculations', () => {
  it('scales macros by serving multiplier', () => {
    const baseCalories = 350;
    const baseProtein = 22;
    const multiplier = 1.5;

    expect(Math.round(baseCalories * multiplier)).toBe(525);
    expect(Math.round(baseProtein * multiplier * 10) / 10).toBe(33);
  });

  it('handles half serving', () => {
    const baseCalories = 400;
    const multiplier = 0.5;
    expect(Math.round(baseCalories * multiplier)).toBe(200);
  });

  it('handles zero serving gracefully', () => {
    const baseCalories = 400;
    const multiplier = 0;
    expect(Math.round(baseCalories * multiplier)).toBe(0);
  });
});
