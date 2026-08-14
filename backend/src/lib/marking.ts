export type SchemeType =
  | 'all_required'
  | 'any_n_from_m'
  | 'exact_match'
  | 'levels_of_response'
  | 'code_output'
  | 'manual_only';
export interface MatchedPoint {
  code: string;
  matched: boolean;
  confidence: number;
}
export interface Scheme {
  type: SchemeType;
  maxMarks: number;
  points: Array<{ code: string; marks: number; groupId: string | null; requires: string[] }>;
  groups: Array<{ id: string; nRequired: number; marksPerPoint: number; maxMarks: number }>;
  levels: Array<{ level: number; minMarks: number; maxMarks: number }>;
}
export interface ScoreResult {
  score: number | null;
  needsTeacher: boolean;
  effectiveMatched: Record<string, boolean>;
  findings: string[];
}
export function computeScore(s: Scheme, input: MatchedPoint[]): ScoreResult {
  const findings: string[] = [];
  const known = new Set(s.points.map((p) => p.code));
  for (const m of input) if (!known.has(m.code)) findings.push(`unknown_mark_point:${m.code}`);
  const state: Record<string, boolean> = {};
  for (const p of s.points) state[p.code] = Boolean(input.find((m) => m.code === p.code)?.matched);
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of s.points)
      if (state[p.code] && p.requires.some((code) => !state[code])) {
        state[p.code] = false;
        findings.push(`requires_not_met:${p.code}`);
        changed = true;
      }
  }
  if (['levels_of_response', 'code_output', 'manual_only'].includes(s.type))
    return { score: null, needsTeacher: true, effectiveMatched: state, findings };
  let score = 0;
  if (s.type === 'exact_match')
    score = s.points.length > 0 && s.points.every((p) => state[p.code]) ? s.maxMarks : 0;
  else if (s.type === 'any_n_from_m') {
    const grouped = new Set<string>();
    for (const g of s.groups) {
      const points = s.points.filter((p) => p.groupId === g.id);
      points.forEach((p) => grouped.add(p.code));
      const count = points.filter((p) => state[p.code]).length;
      score += Math.min(Math.min(count, g.nRequired) * g.marksPerPoint, g.maxMarks);
    }
    score += s.points
      .filter((p) => !grouped.has(p.code) && state[p.code])
      .reduce((n, p) => n + p.marks, 0);
  } else score = s.points.filter((p) => state[p.code]).reduce((n, p) => n + p.marks, 0);
  return {
    score: Math.max(0, Math.min(s.maxMarks, Math.round(score))),
    needsTeacher: false,
    effectiveMatched: state,
    findings,
  };
}
