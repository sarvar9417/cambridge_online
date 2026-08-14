export interface GeneratorQuestion {
  id: string;
  rootId: string;
  marks: number;
  ao: 'AO1' | 'AO2' | 'AO3';
  seen?: boolean;
  hasDiagram?: boolean;
  approved: boolean;
  year: number;
  difficulty?: number;
}
export interface GenerateParams {
  targetMarks: number;
  aoRatio?: { AO1: number; AO2: number; AO3: number };
  excludeSeen?: boolean;
  excludeDiagrams?: boolean;
  /** Inclusive source-paper year range (`08-export-and-papers.md` section 6). */
  yearFrom?: number;
  yearTo?: number;
  seed?: number;
}
export interface GenerateResult {
  questions: GeneratorQuestion[];
  totalMarks: number;
  warnings: string[];
}
const rng = (seed: number) => () =>
  ((seed = Math.imul(seed ^ (seed >>> 15), 1 | seed) + 0x6d2b79f5) | 0,
  (seed ^ (seed >>> 14)) >>> 0) / 4294967296;
export function generatePaper(pool: GeneratorQuestion[], p: GenerateParams): GenerateResult {
  const valid = pool.filter(
    (q) =>
      q.approved &&
      (!p.excludeSeen || !q.seen) &&
      (!p.excludeDiagrams || !q.hasDiagram) &&
      (p.yearFrom === undefined || q.year >= p.yearFrom) &&
      (p.yearTo === undefined || q.year <= p.yearTo),
  );
  const units = [...new Set(valid.map((q) => q.rootId))].map((root) =>
    valid.filter((q) => q.rootId === root),
  );
  const random = rng(p.seed ?? 1);
  let best: GeneratorQuestion[] = [];
  let bestCost = Infinity;
  for (let i = 0; i < 200; i++) {
    const shuffled = units
      .map((u) => ({ u, n: random() }))
      .sort((a, b) => a.n - b.n)
      .map((x) => x.u);
    const picked: GeneratorQuestion[] = [];
    for (const unit of shuffled) {
      const current = picked.reduce((n, q) => n + q.marks, 0),
        marks = unit.reduce((n, q) => n + q.marks, 0);
      if (
        current < p.targetMarks &&
        Math.abs(p.targetMarks - (current + marks)) <= Math.abs(p.targetMarks - current) + 2
      )
        picked.push(...unit);
    }
    const total = picked.reduce((n, q) => n + q.marks, 0);
    let cost = Math.abs(total - p.targetMarks) * 10;
    if (p.aoRatio && total) {
      for (const ao of ['AO1', 'AO2', 'AO3'] as const) {
        const actual =
          (picked.filter((q) => q.ao === ao).reduce((n, q) => n + q.marks, 0) / total) * 100;
        cost += Math.abs(actual - p.aoRatio[ao]);
      }
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = picked;
    }
    if (cost === 0) break;
  }
  best.sort(
    (a, b) => (a.difficulty ?? a.marks) - (b.difficulty ?? b.marks) || a.ao.localeCompare(b.ao),
  );
  const totalMarks = best.reduce((n, q) => n + q.marks, 0),
    warnings: string[] = [];
  if (Math.abs(totalMarks - p.targetMarks) > 2)
    warnings.push(`target_unmet:${totalMarks}/${p.targetMarks}`);
  if (p.aoRatio && totalMarks) {
    const deviation = (['AO1', 'AO2', 'AO3'] as const).reduce(
      (n, ao) =>
        n +
        Math.abs(
          (best.filter((q) => q.ao === ao).reduce((s, q) => s + q.marks, 0) / totalMarks) * 100 -
            p.aoRatio![ao],
        ),
      0,
    );
    if (deviation > 20) warnings.push('ao_ratio_unmet');
  }
  if (!best.length) warnings.push('insufficient_pool');
  return { questions: best, totalMarks, warnings };
}
