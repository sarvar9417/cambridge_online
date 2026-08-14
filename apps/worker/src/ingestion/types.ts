import type { AnswerKind, CommandWord, SchemeType } from '@campath/shared';

/**
 * The 12 stages of the ingestion chain, in order. One BullMQ FlowProducer chain
 * is created per paper and every stage is a child of the next, so BullMQ runs
 * them in this order and a failure leaves the parent waiting rather than losing
 * the run.
 */
export const STAGES = [
  'UPLOAD',
  'PREPARE',
  'SEGMENT',
  'EXTRACT_QP',
  'EXTRACT_MS',
  'MATCH',
  'ASSETS',
  'CLASSIFY',
  'DEPENDS',
  'VALIDATE',
  'CROSSCHECK',
  'PERSIST',
] as const;

export type Stage = (typeof STAGES)[number];

export const INGEST_QUEUE = 'campath.ingest';

/** Every stage job carries this; `sha256` makes the whole chain idempotent. */
export interface StagePayload {
  sourcePaperId: string;
  /** sha256 of the QP pdf — the ingestion idempotency key. */
  sha256: string;
  stage: Stage;
}

export interface ExtractedAsset {
  kind: AnswerKind;
  contentMd: string | null;
  altText: string;
  bbox: [number, number, number, number] | null;
  page: number | null;
}

export interface ExtractedQuestion {
  path: string;
  label: string;
  parentPath: string | null;
  stemMd: string | null;
  contextMd: string | null;
  commandWord: CommandWord | null;
  marks: number | null;
  answerKind: AnswerKind;
  answerLines: number | null;
  sourcePages: number[];
  assets: ExtractedAsset[];
  issues: string[];
  confidence: number;
}

export interface ExtractQpBatch {
  questions: ExtractedQuestion[];
  truncated: boolean;
  /** The model's own sum of printed mark brackets — a free cross-check. */
  pageTotalMarks: number;
}

export interface ExtractedSchemePoint {
  code: string;
  groupLabel: string | null;
  marks: number;
  text: string;
  accept: string[];
  reject: string[];
  requires: string[];
  isBod: boolean;
}

export interface ExtractedScheme {
  path: string;
  questionRef: string;
  schemeType: SchemeType;
  maxMarks: number;
  guidanceMd: string | null;
  groups: Array<{ label: string; nRequired: number; marksPerPoint: number; maxMarks: number }>;
  points: ExtractedSchemePoint[];
  levels: Array<{ levelNumber: number; minMarks: number; maxMarks: number; descriptorMd: string }>;
  confidence: number;
  issues: string[];
}

export interface Classification {
  path: string;
  subtopics: Array<{ code: string; isPrimary: boolean; confidence: number; weight: number }>;
  learningObjectives: Array<{ code: string; confidence: number }>;
  ao: 'AO1' | 'AO2' | 'AO3' | null;
  aoConfidence: number;
}

export interface DetectedDependency {
  fromPath: string;
  toPath: string;
  kind: 'text_ref' | 'answer_ref' | 'none';
  strength: 'context_only' | 'required';
  evidence: string | null;
  confidence: number;
  note: string | null;
}

export interface CrossCheckVerdict {
  path: string;
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
