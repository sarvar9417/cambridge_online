import { describe, expect, it } from 'vitest';
import { selectYearBalancedQuestions } from './lesson-checkpoint';

describe('selectYearBalancedQuestions', () => {
  it('represents every available year before taking extra recent questions', () => {
    const questions = [
      { id:'25-a', year:2025 }, { id:'25-b', year:2025 }, { id:'25-c', year:2025 },
      { id:'24-a', year:2024 }, { id:'23-a', year:2023 }, { id:'22-a', year:2022 }, { id:'21-a', year:2021 },
    ];
    const result = selectYearBalancedQuestions(questions, 6);
    expect(result.map((question) => question.year)).toEqual([2021, 2022, 2023, 2024, 2025, 2025]);
  });

  it('uses only years that actually have eligible questions and removes duplicate ids', () => {
    const result = selectYearBalancedQuestions([
      { id:'21-a', year:2021 }, { id:'21-a', year:2021 }, { id:'23-a', year:2023 }, { id:'25-a', year:2025 },
    ], 6);
    expect(result.map((question) => question.id)).toEqual(['21-a', '23-a', '25-a']);
  });
});
