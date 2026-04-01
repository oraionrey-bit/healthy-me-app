/**
 * Normalize text for fuzzy matching.
 * Lowercases, trims whitespace, collapses multiple spaces.
 */
export function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Simple fuzzy match — checks if query words appear in target (in order or out of order).
 * Supports partial word matching and Korean characters.
 * Returns a score: 0 = no match, higher = better match.
 */
export function fuzzyMatch(query: string, target: string, aliases: string[] = []): number {
  if (!query || !target) return 0;

  const q = normalizeText(query);
  const t = normalizeText(target);

  // Exact match
  if (t === q) return 100;

  // Check target and all aliases
  const candidates = [t, ...aliases.map(normalizeText)];

  let bestScore = 0;

  for (const candidate of candidates) {
    // Target starts with query
    if (candidate.startsWith(q)) {
      bestScore = Math.max(bestScore, 90);
      continue;
    }

    // Target contains query as substring
    if (candidate.includes(q)) {
      bestScore = Math.max(bestScore, 70);
      continue;
    }

    // Word-level matching: all query words found in target
    const queryWords = q.split(' ').filter(Boolean);
    const matchedWords = queryWords.filter((w) => candidate.includes(w));

    if (matchedWords.length === queryWords.length) {
      bestScore = Math.max(bestScore, 60 + matchedWords.length * 5);
      continue;
    }

    // Partial word match (at least one word starts with a query word)
    if (matchedWords.length > 0) {
      const partialScore = 30 + (matchedWords.length / queryWords.length) * 30;
      bestScore = Math.max(bestScore, partialScore);
    }
  }

  return bestScore;
}
