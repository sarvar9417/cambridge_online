import type { Actor } from '@campath/shared';

export type ViewMode = 'parts' | 'families';
export type SelectionRole = 'graded' | 'context_only';

export interface QuestionBankFilters {
  view: ViewMode;
  component?: number;
  topicIds: string[];
  subtopicIds: string[];
  commandWords: string[];
  marksMin?: number;
  marksMax?: number;
  aos: string[];
  yearFrom?: number;
  yearTo?: number;
  series: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  hasDiagram?: boolean;
  status?: string;
  q?: string;
  unusedInClassId?: string;
  dependency: 'independent' | 'any';
  limit: number;
}

export interface AssetBlock {
  id: string;
  kind: string;
  storagePath: string | null;
  contentMd: string | null;
  altText: string;
  sortOrder: number;
  svgMarkup: string | null;
}

export interface ContextBlock {
  id: string;
  label: string;
  displayRef: string;
  depth: number;
  context: string | null;
  assets: AssetBlock[];
}

export interface PortableQuestion {
  leaf: {
    id: string;
    rootId: string;
    label: string;
    path: string;
    displayRef: string;
    stem: string;
    commandWord: string | null;
    marks: number;
    answerKind: string;
    answerLines: number | null;
  };
  chain: Array<{ id: string; label: string; depth: number }>;
  contextBlocks: ContextBlock[];
  dependencies: Array<{
    id: string;
    questionId: string;
    dependsOnId: string;
    displayRef: string;
    stem: string | null;
    kind: string;
    strength: string;
    evidence: string | null;
  }>;
  sourceRef: string;
}

export interface SelectionItemPortable {
  id: string;
  role: SelectionRole;
  sortOrder: number;
  sourceRef: string;
  portable: PortableQuestion;
}

export interface SelectionReviewItem extends SelectionItemPortable {
  freshRef: string;
  effectiveMarks: number;
}

export interface SelectionReview {
  items: SelectionReviewItem[];
  totalMarks: number;
}

export interface ActorRepository {
  actor: Actor;
}
