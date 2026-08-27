const MIN_FUZZY_KEYWORD_LENGTH = 5;
const MIN_FUZZY_SIMILARITY = 0.86;
const MAX_FUZZY_EDIT_DISTANCE = 2;
const EXACT_MATCH_SCORE_BASE = 1000;

function normalizeForMatch(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9\s,]/g, '');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[] = new Array(rows * cols);

  for (let i = 0; i < rows; i += 1) matrix[i * cols] = i;
  for (let j = 0; j < cols; j += 1) matrix[j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const idx = i * cols + j;
      matrix[idx] = Math.min(
        matrix[(i - 1) * cols + j] + 1,
        matrix[i * cols + (j - 1)] + 1,
        matrix[(i - 1) * cols + (j - 1)] + cost,
      );
    }
  }

  return matrix[(rows - 1) * cols + (cols - 1)];
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

function isFuzzyMatch(candidate: string, keyword: string): boolean {
  if (candidate.length < MIN_FUZZY_KEYWORD_LENGTH || keyword.length < MIN_FUZZY_KEYWORD_LENGTH) {
    return false;
  }
  if (Math.abs(candidate.length - keyword.length) > MAX_FUZZY_EDIT_DISTANCE) {
    return false;
  }
  const score = similarity(candidate, keyword);
  return score >= MIN_FUZZY_SIMILARITY && levenshtein(candidate, keyword) <= MAX_FUZZY_EDIT_DISTANCE;
}

function addressCandidates(address: string): string[] {
  const normalized = normalizeForMatch(address);
  const candidates = new Set<string>();

  for (const segment of normalized.split(',').map((part) => part.trim()).filter(Boolean)) {
    candidates.add(segment);
    for (const word of segment.split(/\s+/).filter(Boolean)) {
      candidates.add(word);
    }
  }

  return [...candidates];
}

function bestFuzzySimilarity(address: string, keyword: string): number {
  let best = 0;

  for (const candidate of addressCandidates(address)) {
    if (isFuzzyMatch(candidate, keyword)) {
      best = Math.max(best, similarity(candidate, keyword));
      continue;
    }

    const minLen = Math.max(MIN_FUZZY_KEYWORD_LENGTH, keyword.length - MAX_FUZZY_EDIT_DISTANCE);
    const maxLen = keyword.length + MAX_FUZZY_EDIT_DISTANCE;
    if (candidate.length < minLen) continue;

    for (let start = 0; start <= candidate.length - minLen; start += 1) {
      for (let len = minLen; len <= Math.min(maxLen, candidate.length - start); len += 1) {
        const slice = candidate.slice(start, start + len);
        if (!isFuzzyMatch(slice, keyword)) continue;
        best = Math.max(best, similarity(slice, keyword));
      }
    }
  }

  return best;
}

/** Returns match strength; higher scores win when multiple areas could match. */
export function matchKeywordInAddress(address: string, keyword: string): { matched: boolean; score: number } {
  const normalizedAddress = normalizeForMatch(address);
  const normalizedKeyword = normalizeForMatch(keyword);
  if (!normalizedAddress || !normalizedKeyword) {
    return { matched: false, score: 0 };
  }

  if (normalizedAddress.includes(normalizedKeyword)) {
    return { matched: true, score: EXACT_MATCH_SCORE_BASE + normalizedKeyword.length };
  }

  if (normalizedKeyword.length < MIN_FUZZY_KEYWORD_LENGTH) {
    return { matched: false, score: 0 };
  }

  const fuzzySimilarity = bestFuzzySimilarity(normalizedAddress, normalizedKeyword);
  if (fuzzySimilarity >= MIN_FUZZY_SIMILARITY) {
    return { matched: true, score: fuzzySimilarity * normalizedKeyword.length };
  }

  return { matched: false, score: 0 };
}
