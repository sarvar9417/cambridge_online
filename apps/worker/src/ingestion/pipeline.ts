import { findDependencyMentions } from '@campath/shared';
import type {
  Classification,
  CrossCheckVerdict,
  DetectedDependency,
  ExtractQpBatch,
  ExtractedQuestion,
  ExtractedScheme,
} from './types.js';

/**
 * Overlapping batches re-extract the shared page, so the same `path` arrives
 * twice. Keep the more confident reading: the batch that saw the whole question
 * beats the one that saw it cut at a page boundary.
 */
export function dedupeQuestions(questions: ExtractedQuestion[]): ExtractedQuestion[] {
  const byPath = new Map<string, ExtractedQuestion>();

  for (const question of questions) {
    const existing = byPath.get(question.path);
    if (!existing) {
      byPath.set(question.path, question);
      continue;
    }
    // A truncated reading always loses to a complete one, whatever the score.
    const existingTruncated = existing.issues.includes('truncated');
    const incomingTruncated = question.issues.includes('truncated');
    if (existingTruncated && !incomingTruncated) {
      byPath.set(question.path, question);
    } else if (
      existingTruncated === incomingTruncated &&
      question.confidence > existing.confidence
    ) {
      byPath.set(question.path, question);
    }
  }

  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path, 'en', { numeric: true }));
}

/**
 * The model reports its own sum of printed mark brackets. Comparing it with the
 * marks it actually assigned costs nothing and catches a dropped question a
 * whole stage before V02 would.
 */
export function checkPageTotals(batches: ExtractQpBatch[]): Array<{
  batchIndex: number;
  reported: number;
  assigned: number;
}> {
  return batches
    .map((batch, batchIndex) => ({
      batchIndex,
      reported: batch.pageTotalMarks,
      assigned: batch.questions.reduce((sum, question) => sum + (question.marks ?? 0), 0),
    }))
    .filter((entry) => entry.reported !== entry.assigned);
}

export interface MatchResult {
  pairs: Array<{ question: ExtractedQuestion; scheme: ExtractedScheme }>;
  /** Leaves with no mark scheme — V03 will turn these into errors. */
  unmatchedQuestions: string[];
  /** Schemes with no question — V04 territory, and usually a missed question. */
  unmatchedSchemes: string[];
}

/** Pairs QP and MS by `path`, reporting both kinds of orphan. */
export function matchSchemes(
  questions: ExtractedQuestion[],
  schemes: ExtractedScheme[],
): MatchResult {
  const remaining = new Map(schemes.map((scheme) => [scheme.path, scheme]));
  const pairs: MatchResult['pairs'] = [];
  const unmatchedQuestions: string[] = [];

  const isLeaf = (question: ExtractedQuestion) =>
    !questions.some((other) => other.parentPath === question.path);

  for (const question of questions) {
    const scheme = remaining.get(question.path);
    if (scheme) {
      pairs.push({ question, scheme });
      remaining.delete(question.path);
    } else if (isLeaf(question)) {
      unmatchedQuestions.push(question.path);
    }
  }

  return { pairs, unmatchedQuestions, unmatchedSchemes: [...remaining.keys()] };
}

export interface DependencyCandidate {
  fromPath: string;
  /** Sibling label the stem points at, when the pattern captured one. */
  label: string | null;
  excerpt: string;
  /** Resolved sibling path, when the label matches an existing sibling. */
  toPath: string | null;
}

/**
 * DEPENDS stage 1 — pattern matching over stems.
 *
 * Cheap and over-inclusive on purpose: a false positive costs one model call in
 * stage 2, a false negative ships a sub-part that cannot be answered once it is
 * extracted on its own.
 */
export function dependencyCandidates(questions: ExtractedQuestion[]): DependencyCandidate[] {
  const byPath = new Map(questions.map((question) => [question.path, question]));
  const candidates: DependencyCandidate[] = [];

  for (const question of questions) {
    const stem = question.stemMd ?? '';
    for (const mention of findDependencyMentions(stem)) {
      // 'part (a)' of 3.c means sibling 3.a — resolve against the same parent.
      const siblingPath = mention.label
        ? [question.parentPath, mention.label].filter(Boolean).join('.')
        : null;

      candidates.push({
        fromPath: question.path,
        label: mention.label,
        excerpt: mention.excerpt,
        toPath: siblingPath && byPath.has(siblingPath) ? siblingPath : null,
      });
    }
  }

  return candidates;
}

/** Only candidates worth a model call: a resolved sibling that is not itself. */
export const worthClassifying = (candidates: DependencyCandidate[]) =>
  candidates.filter(
    (candidate) => candidate.toPath !== null && candidate.toPath !== candidate.fromPath,
  );

export const CROSSCHECK_CONFIDENCE_FLOOR = 0.95;
export const CROSSCHECK_SAMPLE_RATE = 0.1;

/**
 * CROSSCHECK selection.
 *
 * A second model pass on every question would roughly double extraction cost for
 * little gain, so it runs where errors concentrate — low confidence, diagrams,
 * anything but the simplest scheme type — plus a random tenth so quality is
 * still measured on the questions that look fine. In practice this is ~40%.
 */
export function needsCrossCheck(
  question: ExtractedQuestion,
  scheme: ExtractedScheme | null,
  sample: number,
): boolean {
  if (question.confidence < CROSSCHECK_CONFIDENCE_FLOOR) return true;
  if (question.assets.some((asset) => asset.kind === 'diagram')) return true;
  if (scheme && scheme.schemeType !== 'all_required') return true;
  return sample < CROSSCHECK_SAMPLE_RATE;
}

export function selectForCrossCheck(
  pairs: MatchResult['pairs'],
  questions: ExtractedQuestion[],
  sampler: () => number = Math.random,
): ExtractedQuestion[] {
  const schemeByPath = new Map(pairs.map((pair) => [pair.question.path, pair.scheme]));
  return questions.filter((question) =>
    needsCrossCheck(question, schemeByPath.get(question.path) ?? null, sampler()),
  );
}

/**
 * A question is flagged when validation found anything about it, or the
 * cross-check disagreed. Approval requires both to be silent.
 */
export function flaggedPaths(input: {
  validationPaths: string[];
  verdicts: CrossCheckVerdict[];
  classifications: Classification[];
  dependencies: DetectedDependency[];
}): string[] {
  const flagged = new Set(input.validationPaths);
  for (const verdict of input.verdicts) {
    if (!verdict.agrees) flagged.add(verdict.path);
  }
  return [...flagged];
}

export interface FlaggedRate {
  leafCount: number;
  flaggedCount: number;
  percentage: number;
  verdict: 'validation_too_soft' | 'healthy' | 'extraction_poor';
}

/**
 * The pipeline's own health check.
 *
 * Below 5% means validation is not catching what it should; above 30% means the
 * extraction is bad and the prompts need fixing before more papers are run.
 */
export function flaggedRate(leafCount: number, flaggedCount: number): FlaggedRate {
  const percentage = leafCount === 0 ? 0 : (flaggedCount / leafCount) * 100;
  return {
    leafCount,
    flaggedCount,
    percentage,
    verdict:
      percentage < 5 ? 'validation_too_soft' : percentage > 30 ? 'extraction_poor' : 'healthy',
  };
}
