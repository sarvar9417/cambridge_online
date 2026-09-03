export const CHECKPOINT_YEARS = [2021, 2022, 2023, 2024, 2025] as const;

export type CheckpointQuestion = {
  id: string;
  year: number;
};

export function selectYearBalancedQuestions<T extends CheckpointQuestion>(questions: T[], limit = 6): T[] {
  const deduped = [...new Map(questions.map((question) => [question.id, question])).values()];
  const groups = new Map<number, T[]>();
  for (const year of CHECKPOINT_YEARS) groups.set(year, []);
  for (const question of deduped) {
    if (groups.has(question.year)) groups.get(question.year)!.push(question);
  }

  const selected: T[] = [];
  // First guarantee one representative question from every year that actually has an eligible question.
  for (const year of CHECKPOINT_YEARS) {
    const first = groups.get(year)?.[0];
    if (first && selected.length < limit) selected.push(first);
  }

  // Use remaining capacity for recent years first, while preserving the all-years guarantee above.
  for (let offset = 1; selected.length < limit; offset += 1) {
    let added = false;
    for (const year of [...CHECKPOINT_YEARS].reverse()) {
      const next = groups.get(year)?.[offset];
      if (next && selected.length < limit) {
        selected.push(next);
        added = true;
      }
    }
    if (!added) break;
  }

  return selected;
}
