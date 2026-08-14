/**
 * Provider seams for the PDF ingestion pipeline.
 *
 * The pipeline itself is pure orchestration and is fully testable with fakes.
 * The two seams below are the only places that touch the outside world:
 * `PdfPreparer` shells out to poppler, `ExtractionProvider` calls Claude. Neither
 * is available in every environment (`/ready` reports `pdfPrepare` and `ai`), so
 * the pipeline must fail with a clear reason rather than a stack trace when one
 * is missing.
 */

export interface PreparedPage {
  page: number;
  /** 200 dpi render of the page, used for layout and diagrams. */
  imagePath: string;
  /** `pdftotext -layout` output; more accurate than OCR where it exists. */
  textLayer: string;
}

export interface PdfPreparer {
  available(): boolean;
  prepare(input: { storagePath: string; sha256: string }): Promise<PreparedPage[]>;
}

export interface ExtractedAsset {
  kind: 'image' | 'table' | 'diagram' | 'code';
  contentMd?: string | null;
  altText: string;
  bbox?: [number, number, number, number];
  page?: number;
}

export interface ExtractedQuestion {
  path: string;
  label: string;
  parentPath: string | null;
  stemLatex: string | null;
  contextLatex?: string | null;
  commandWord: string | null;
  marks: number | null;
  answerKind: string;
  answerLines: number | null;
  sourcePages: number[];
  assets: ExtractedAsset[];
  issues: string[];
  confidence: number;
}

export interface ExtractedQuestionBatch {
  questions: ExtractedQuestion[];
  truncated: boolean;
  pageTotalMarks: number;
}

export interface ExtractedMarkSchemePoint {
  code: string;
  groupLabel: string | null;
  marks: number;
  text: string;
  textLatex?: string | null;
  accept: string[];
  reject: string[];
  requires: string[];
  isBod: boolean;
}

export interface ExtractedMarkScheme {
  path: string;
  questionRef: string;
  schemeType:
    | 'all_required'
    | 'any_n_from_m'
    | 'levels_of_response'
    | 'exact_match'
    | 'code_output'
    | 'manual_only';
  maxMarks: number;
  guidanceMd: string | null;
  groups: Array<{ label: string; nRequired: number; marksPerPoint: number; maxMarks: number }>;
  points: ExtractedMarkSchemePoint[];
  levels: Array<{ level: number; minMarks: number; maxMarks: number; descriptorMd: string }>;
  confidence: number;
  issues: string[];
}

export interface Classification {
  path: string;
  subtopics: Array<{ code: string; isPrimary: boolean; confidence: number }>;
  learningObjectives: Array<{ code: string; confidence: number }>;
  ao: 'AO1' | 'AO2' | 'AO3' | null;
  aoConfidence: number;
}

export interface CrossCheckVerdict {
  agrees: boolean;
  disagreements: Array<{
    field: string;
    extracted: unknown;
    observed: unknown;
    confidence: number;
    note: string;
  }>;
  confidence: number;
}

export interface AiUsage {
  model: string;
  promptVersion: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  latencyMs?: number;
}

export interface ExtractionProvider {
  available(): boolean;
  extractQuestions(input: {
    pages: PreparedPage[];
    metadata: Record<string, unknown>;
    priorRefs: string[];
  }): Promise<{ batch: ExtractedQuestionBatch; usage: AiUsage }>;
  extractMarkScheme(input: {
    pages: PreparedPage[];
    metadata: Record<string, unknown>;
  }): Promise<{ schemes: ExtractedMarkScheme[]; usage: AiUsage }>;
  classify(input: {
    question: ExtractedQuestion;
    markScheme: ExtractedMarkScheme | null;
    subtopics: Array<{ code: string; title: string }>;
    componentName: string;
    level: string;
  }): Promise<{ classification: Classification; usage: AiUsage }>;
  crossCheck(input: {
    pages: PreparedPage[];
    extraction: unknown;
  }): Promise<{ verdict: CrossCheckVerdict; usage: AiUsage }>;
}

export class IngestionUnavailableError extends Error {
  readonly code: 'pdf_prepare_unavailable' | 'ai_unavailable';
  constructor(code: 'pdf_prepare_unavailable' | 'ai_unavailable') {
    super(code);
    this.code = code;
  }
}
