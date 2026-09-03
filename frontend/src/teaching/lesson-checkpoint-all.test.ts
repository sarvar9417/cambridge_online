import { describe, expect, it } from 'vitest';
import { collectAllCheckpointQuestions } from './lesson-checkpoint';

describe('collectAllCheckpointQuestions', () => {
  it('keeps every unique eligible checkpoint question instead of truncating to six', () => {
    const questions = Array.from({ length: 18 }, (_, index) => ({
      id: `q-${index}`,
      year: 2021 + (index % 5),
    }));
    const result = collectAllCheckpointQuestions(questions);
    expect(result).toHaveLength(18);
    expect(new Set(result.map((question) => question.id)).size).toBe(18);
  });

  it('deduplicates ids and orders questions by year then id', () => {
    const result = collectAllCheckpointQuestions([
      { id:'b', year:2025 },
      { id:'a', year:2021 },
      { id:'a', year:2021 },
      { id:'c', year:2023 },
    ]);
    expect(result.map((question) => `${question.year}:${question.id}`)).toEqual([
      '2021:a', '2023:c', '2025:b',
    ]);
  });
});
