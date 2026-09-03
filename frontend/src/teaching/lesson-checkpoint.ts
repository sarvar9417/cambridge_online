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
  for (const year of CHECKPOINT_YEARS) {
    const first = groups.get(year)?.[0];
    if (first && selected.length < limit) selected.push(first);
  }

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

export function collectAllCheckpointQuestions<T extends CheckpointQuestion>(questions: T[]): T[] {
  return [...new Map(questions.map((question) => [question.id, question])).values()]
    .filter((question) => CHECKPOINT_YEARS.includes(question.year as (typeof CHECKPOINT_YEARS)[number]))
    .sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
}
