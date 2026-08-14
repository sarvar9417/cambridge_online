import { describe, expect, it } from 'vitest';
import { generatePaper, type GeneratorQuestion } from './paper-generator.js';
const pool: GeneratorQuestion[] = [...Array(12)].map((_, i) => ({
  id: `q${i}`,
  rootId: i < 2 ? 'root' : `r${i}`,
  marks: i < 2 ? 2 : (i % 4) + 1,
  ao: (['AO1', 'AO2', 'AO3'] as const)[i % 3]!,
  approved: true,
  year: 2024,
  seen: i === 4,
  hasDiagram: i === 5,
}));
describe('paper generator', () => {
  it('total is within target ±2', () =>
    expect(Math.abs(generatePaper(pool, { targetMarks: 15 }).totalMarks - 15)).toBeLessThanOrEqual(
      2,
    ));
  it('includes all children of selected root', () => {
    const r = generatePaper(pool, { targetMarks: 4, seed: 2 });
    const root = r.questions.filter((q) => q.rootId === 'root');
    expect(root.length === 0 || root.length === 2).toBe(true);
  });
  it('excludes seen questions', () =>
    expect(
      generatePaper(pool, { targetMarks: 30, excludeSeen: true }).questions.some((q) => q.seen),
    ).toBe(false));
  it('never selects a question twice', () => {
    const ids = generatePaper(pool, { targetMarks: 30 }).questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('same seed gives same result', () =>
    expect(generatePaper(pool, { targetMarks: 12, seed: 42 })).toEqual(
      generatePaper(pool, { targetMarks: 12, seed: 42 }),
    ));
  it('insufficient pool returns warning, not error', () =>
    expect(generatePaper([], { targetMarks: 20 }).warnings).toContain('insufficient_pool'));
  it('impossible AO ratio returns nearest with warning', () =>
    expect(
      generatePaper(
        pool.filter((q) => q.ao === 'AO1'),
        { targetMarks: 10, aoRatio: { AO1: 0, AO2: 50, AO3: 50 } },
      ).warnings,
    ).toContain('ao_ratio_unmet'));
  it('restricts the pool to a year range', () => {
    const mixed = [
      { ...pool[0]!, year: 2019 },
      { ...pool[1]!, year: 2022 },
      { ...pool[2]!, year: 2025 },
      { ...pool[3]!, year: 2023 },
    ];
    const result = generatePaper(mixed, { targetMarks: 30, yearFrom: 2022, yearTo: 2024 });
    expect(result.questions.every((q) => q.year >= 2022 && q.year <= 2024)).toBe(true);
    expect(result.questions.map((q) => q.year).sort()).toEqual([2022, 2023]);
  });
  it('supports an open-ended year range', () => {
    const mixed = [
      { ...pool[0]!, year: 2019 },
      { ...pool[1]!, year: 2022 },
      { ...pool[2]!, year: 2025 },
    ];
    const result = generatePaper(mixed, { targetMarks: 30, yearFrom: 2022 });
    expect(result.questions.every((q) => q.year >= 2022)).toBe(true);
  });
});
