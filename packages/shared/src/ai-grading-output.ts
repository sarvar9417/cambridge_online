import type { MatchedPoint, Scheme } from './marking.js';
export interface RawAiPoint {
  code: string;
  matched: boolean;
  evidence?: string;
  confidence?: number;
}
export interface ValidatedAiOutput {
  matched: MatchedPoint[];
  feedback: string;
  findings: string[];
  needsTeacher: boolean;
}
const normalize = (s: string) =>
  s
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
export function validateAiOutput(
  answer: string,
  scheme: Scheme,
  raw: { points?: RawAiPoint[]; feedback_uz?: string },
): ValidatedAiOutput {
  const findings: string[] = [];
  const byCode = new Map((raw.points ?? []).map((p) => [p.code, p]));
  for (const p of raw.points ?? [])
    if (!scheme.points.some((x) => x.code === p.code))
      findings.push(`unknown_mark_point:${p.code}`);
  const normalized = normalize(answer);
  const matched = scheme.points.map((point) => {
    const value = byCode.get(point.code);
    if (!value) {
      findings.push(`missing_mark_point:${point.code}`);
      return { code: point.code, matched: false, confidence: 0 };
    }
    let ok = value.matched;
    if (ok && !value.evidence?.trim()) {
      ok = false;
      findings.push(`missing_evidence:${point.code}`);
    } else if (ok && !normalized.includes(normalize(value.evidence!))) {
      ok = false;
      findings.push(`fabricated_evidence:${point.code}`);
    }
    return {
      code: point.code,
      matched: ok,
      confidence: Math.max(0, Math.min(1, value.confidence ?? 0)),
    };
  });
  let feedback = raw.feedback_uz?.trim() ?? '';
  if (!feedback) {
    feedback = 'Javobing o‘qituvchi tomonidan tekshiriladi.';
    findings.push('missing_feedback');
  }
  if (feedback.length > 800) {
    feedback = feedback.slice(0, 800);
    findings.push('feedback_truncated');
  }
  return {
    matched,
    feedback,
    findings,
    needsTeacher:
      findings.some((x) => x.startsWith('fabricated_evidence')) ||
      ['levels_of_response', 'code_output', 'manual_only'].includes(scheme.type),
  };
}
