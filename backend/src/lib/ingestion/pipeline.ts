import { checkLatex } from '../latex.js';
import { validateExtraction, type Finding } from '../validation/rules.js';
import {
  IngestionUnavailableError,
  type Classification,
  type CrossCheckVerdict,
  type ExtractedMarkScheme,
  type ExtractedQuestion,
  type ExtractionProvider,
  type PdfPreparer,
  type PreparedPage,
} from './contracts.js';

/**
 * Pages per extraction call. Questions split across a page boundary, so batches
 * overlap by one page and are de-duplicated afterwards by `path`
 * (`03-ingestion.md` section 2).
 */
export const BATCH_SIZE = 3;
export const BATCH_OVERLAP = 1;

export function planBatches(pageCount: number): number[][] {
  if (pageCount <= 0) return [];
  const batches: number[][] = [];
  const step = Math.max(1, BATCH_SIZE - BATCH_OVERLAP);
  for (let start = 0; start < pageCount; start += step) {
    const pages = Array.from(
      { length: Math.min(BATCH_SIZE, pageCount - start) },
      (_, offset) => start + offset + 1,
    );
    batches.push(pages);
    if (pages.at(-1) === pageCount) break;
  }
  return batches;
}

/**
 * Later batches re-extract the overlap page. Keep the reading with the higher
 * confidence: the batch that saw the whole question beats the one that saw it cut.
 */
export function dedupeQuestions(questions: ExtractedQuestion[]): ExtractedQuestion[] {
  const byPath = new Map<string, ExtractedQuestion>();
  for (const question of questions) {
    const existing = byPath.get(question.path);
    if (!existing || question.confidence > existing.confidence) byPath.set(question.path, question);
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path, 'en', { numeric: true }));
}

/** Pair questions with mark schemes by `path`, reporting both kinds of orphan. */
export function matchSchemes(
  questions: ExtractedQuestion[],
  schemes: ExtractedMarkScheme[],
): {
  pairs: Array<{ question: ExtractedQuestion; scheme: ExtractedMarkScheme }>;
  unmatchedQuestions: string[];
  unmatchedSchemes: string[];
} {
  const schemeByPath = new Map(schemes.map((scheme) => [scheme.path, scheme]));
  const pairs: Array<{ question: ExtractedQuestion; scheme: ExtractedMarkScheme }> = [];
  const unmatchedQuestions: string[] = [];

  const isLeaf = (question: ExtractedQuestion) =>
    !questions.some((other) => other.parentPath === question.path);

  for (const question of questions) {
    const scheme = schemeByPath.get(question.path);
    if (scheme) {
      pairs.push({ question, scheme });
      schemeByPath.delete(question.path);
    } else if (isLeaf(question)) {
      unmatchedQuestions.push(question.path);
    }
  }

  return { pairs, unmatchedQuestions, unmatchedSchemes: [...schemeByPath.keys()] };
}

/**
 * Cross-check is the expensive second opinion, so it runs on the ~40% of
 * questions most likely to be wrong plus a random 10% for quality monitoring
 * (`03-ingestion.md` section 6).
 */
export function needsCrossCheck(
  question: ExtractedQuestion,
  scheme: ExtractedMarkScheme | null,
  sample: number,
): boolean {
  if (question.confidence < 0.95) return true;
  if (question.assets.some((asset) => asset.kind === 'diagram')) return true;
  if (scheme && scheme.schemeType !== 'all_required') return true;
  return sample < 0.1;
}

export interface PipelineResult {
  questions: ExtractedQuestion[];
  schemes: ExtractedMarkScheme[];
  classifications: Classification[];
  findings: Finding[];
  crossChecks: Array<{ path: string; verdict: CrossCheckVerdict }>;
  /** `approved` only when nothing was flagged and every cross-check agreed. */
  status: 'approved' | 'needs_review';
}

export interface PipelineInput {
  questionPages: PreparedPage[];
  markSchemePages: PreparedPage[];
  metadata: Record<string, unknown>;
  componentTotal: number;
  componentName: string;
  level: string;
  subtopics: Array<{ code: string; title: string }>;
  /** Injectable for deterministic tests; defaults to Math.random. */
  sampler?: () => number;
}

/**
 * Runs EXTRACT_QP → EXTRACT_MS → MATCH → CLASSIFY → VALIDATE → CROSSCHECK.
 *
 * UPLOAD and PREPARE happen before this; PERSIST happens after. Everything here
 * is a pure function of the provider's answers, which is what makes the 20
 * validation rules meaningful: they judge the extraction, not the database.
 */
export async function runExtractionPipeline(
  provider: ExtractionProvider,
  input: PipelineInput,
): Promise<PipelineResult> {
  if (!provider.available()) throw new IngestionUnavailableError('ai_unavailable');
  const sample = input.sampler ?? Math.random;

  const collected: ExtractedQuestion[] = [];
  for (const pageNumbers of planBatches(input.questionPages.length)) {
    const pages = input.questionPages.filter((page) => pageNumbers.includes(page.page));
    const { batch } = await provider.extractQuestions({
      pages,
      metadata: input.metadata,
      priorRefs: collected.map((question) => question.path),
    });
    collected.push(...batch.questions);
  }
  const questions = dedupeQuestions(collected);

  const { schemes } = await provider.extractMarkScheme({
    pages: input.markSchemePages,
    metadata: input.metadata,
  });

  const { pairs, unmatchedQuestions, unmatchedSchemes } = matchSchemes(questions, schemes);
  const schemeByPath = new Map(pairs.map((pair) => [pair.question.path, pair.scheme]));

  const classifications: Classification[] = [];
  for (const question of questions) {
    if (question.marks === null) continue; // parents carry context, not marks
    const { classification } = await provider.classify({
      question,
      markScheme: schemeByPath.get(question.path) ?? null,
      subtopics: input.subtopics,
      componentName: input.componentName,
      level: input.level,
    });
    classifications.push(classification);
  }

  const findings: Finding[] = validateExtraction({
    componentTotal: input.componentTotal,
    questions: questions.map((question) => ({
      id: question.path,
      path: question.path,
      parentId: question.parentPath,
      marks: question.marks,
      stem: question.stemLatex ?? '',
      commandWord: question.commandWord,
      answerKind: question.answerKind,
      answerLines: question.answerLines,
      assetCount: question.assets.length,
      subtopicConfidences:
        classifications
          .find((entry) => entry.path === question.path)
          ?.subtopics.map((subtopic) => subtopic.confidence) ?? [],
      extractConfidence: question.confidence,
    })),
    schemes: pairs.map(({ question, scheme }) => ({
      questionId: question.path,
      type: scheme.schemeType,
      maxMarks: scheme.maxMarks,
      points: scheme.points.map((point) => point.marks),
      nRequired: scheme.groups[0]?.nRequired,
      groupMaxMarks: scheme.groups[0]?.maxMarks,
      levels: scheme.levels.length,
    })),
    assets: [],
  });

  for (const path of unmatchedSchemes) {
    findings.push({
      code: 'V04',
      severity: 'error',
      message: `Mark scheme ${path} has no question.`,
    });
  }
  for (const path of unmatchedQuestions) {
    findings.push({
      code: 'V03',
      severity: 'error',
      message: `Question ${path} has no mark scheme.`,
    });
  }

  // LaTeX that KaTeX cannot render would break the question for every student,
  // so a bad extraction is a validation error like any other.
  for (const question of questions) {
    for (const [field, source] of [
      ['stem', question.stemLatex],
      ['context', question.contextLatex],
    ] as const) {
      if (!source) continue;
      for (const finding of checkLatex(source).findings) {
        findings.push({
          code: 'V21',
          severity: finding.severity,
          message: `${question.path} ${field}: ${finding.message}`,
        });
      }
    }
  }

  const crossChecks: Array<{ path: string; verdict: CrossCheckVerdict }> = [];
  for (const question of questions) {
    const scheme = schemeByPath.get(question.path) ?? null;
    if (!needsCrossCheck(question, scheme, sample())) continue;
    const pages = input.questionPages.filter((page) => question.sourcePages.includes(page.page));
    const { verdict } = await provider.crossCheck({ pages, extraction: { question, scheme } });
    crossChecks.push({ path: question.path, verdict });
    if (!verdict.agrees) {
      findings.push({
        code: 'V22',
        severity: 'error',
        message: `${question.path}: cross-check disagreed on ${verdict.disagreements
          .map((item) => item.field)
          .join(', ')}.`,
      });
    }
  }

  return {
    questions,
    schemes,
    classifications,
    findings,
    crossChecks,
    status: findings.length === 0 ? 'approved' : 'needs_review',
  };
}

export function assertPrepareAvailable(preparer: PdfPreparer) {
  if (!preparer.available()) throw new IngestionUnavailableError('pdf_prepare_unavailable');
}
