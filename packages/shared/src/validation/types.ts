import type { AnswerKind, CommandWord, SchemeType } from '../enums.js';

export type Severity = 'info' | 'warning' | 'error';

export type RuleCode =
  | 'V01'
  | 'V02'
  | 'V03'
  | 'V04'
  | 'V05'
  | 'V06'
  | 'V07'
  | 'V08'
  | 'V09'
  | 'V10'
  | 'V11'
  | 'V12'
  | 'V13'
  | 'V14'
  | 'V15'
  | 'V16'
  | 'V17'
  | 'V18'
  | 'V19'
  | 'V20'
  | 'V21'
  | 'V22'
  | 'V23';

export interface Finding {
  code: RuleCode;
  severity: Severity;
  message: string;
  /** Question `path` the finding is about, when it is about one question. */
  path?: string;
  details?: Record<string, unknown>;
}

/**
 * A question as the pipeline sees it before persistence. `path` is the identity
 * ('3.c.i'); database ids do not exist yet at VALIDATE time.
 */
export interface ValidationQuestion {
  path: string;
  parentPath: string | null;
  displayRef: string;
  /** NULL on parents. Only leaves carry marks. */
  marks: number | null;
  stemMd: string | null;
  contextMd: string | null;
  commandWord: CommandWord | null;
  answerKind: AnswerKind;
  answerLines: number | null;
  extractConfidence: number;
  subtopics: Array<{ code: string; confidence: number; weight: number; isPrimary: boolean }>;
}

export interface ValidationSchemePoint {
  code: string;
  marks: number;
  groupLabel: string | null;
}

export interface ValidationSchemeGroup {
  label: string;
  nRequired: number;
  marksPerPoint: number;
  maxMarks: number;
}

export interface ValidationScheme {
  questionPath: string;
  type: SchemeType;
  maxMarks: number;
  points: ValidationSchemePoint[];
  groups: ValidationSchemeGroup[];
  /** Number of banded level rows; only meaningful for levels_of_response. */
  levelCount: number;
  confidence: number;
}

export interface ValidationAsset {
  id: string;
  questionPath: string;
  kind: string;
  storagePath: string | null;
  sizeBytes: number | null;
  altText: string;
  /** sha256 of the cropped image, used to spot the same figure on two siblings. */
  contentHash: string | null;
}

export type DependencyKind = 'text_ref' | 'answer_ref' | 'none';
export type DependencyStrength = 'context_only' | 'required';

export interface ValidationDependency {
  fromPath: string;
  toPath: string;
  kind: DependencyKind;
  strength: DependencyStrength;
}

/** A stem already in the bank, so a repeat across years can be spotted. */
export interface KnownStem {
  displayRef: string;
  stem: string;
  year: number;
}

export interface ValidationContext {
  /** `components.total_marks` for the paper being ingested. */
  componentTotalMarks: number;
  year: number;
  questions: ValidationQuestion[];
  schemes: ValidationScheme[];
  assets: ValidationAsset[];
  dependencies: ValidationDependency[];
  knownStems?: KnownStem[];
}

export type Rule = (context: ValidationContext) => Finding[];

export interface RuleDefinition {
  code: RuleCode;
  severity: Severity;
  /** One line, in English, describing what a violation means. */
  title: string;
  run: Rule;
}

export const finding = (
  code: RuleCode,
  severity: Severity,
  message: string,
  path?: string,
  details?: Record<string, unknown>,
): Finding => ({
  code,
  severity,
  message,
  ...(path ? { path } : {}),
  ...(details ? { details } : {}),
});

/** A question is a leaf when nothing declares it as parent. */
export const isLeaf = (context: ValidationContext, path: string) =>
  !context.questions.some((question) => question.parentPath === path);

export const leavesOf = (context: ValidationContext) =>
  context.questions.filter((question) => isLeaf(context, question.path));

/** '3.c.i' -> '3.c'. Root paths have no parent. */
export const parentOfPath = (path: string): string | null => {
  const index = path.lastIndexOf('.');
  return index === -1 ? null : path.slice(0, index);
};

export const rootNumberOf = (path: string): number => Number(path.split('.')[0]);
