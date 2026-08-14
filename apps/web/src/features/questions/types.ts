export type Role = 'graded' | 'context_only';
export interface Asset {
  id: string;
  kind: string;
  storagePath: string | null;
  contentMd: string | null;
  altText: string;
  svgMarkup: string | null;
}
export interface Portable {
  leaf: { id: string; rootId: string; displayRef: string; stem: string; marks: number };
  chain: { id: string; label: string; depth: number }[];
  contextBlocks: { id: string; displayRef: string; context: string | null; assets: Asset[] }[];
  dependencies: Dependency[];
  sourceRef: string;
}
export interface Dependency {
  id: string;
  dependsOnId: string;
  displayRef: string;
  stem: string | null;
  kind: 'text_ref' | 'answer_ref';
  strength: string;
}
export interface Part {
  id: string;
  rootId: string;
  rootRef: string;
  displayRef: string;
  stem: string;
  marks: number;
  commandWord: string | null;
  ao: string | null;
  component: number;
  year: number;
  series: string;
  hasDiagram: boolean;
  hasDependency: boolean;
  matches?: boolean;
}
export interface Family {
  rootId: string;
  rootRef: string;
  matchCount: number;
  totalCount: number;
  parts: Part[];
}
export interface SelectionSummary {
  id: string;
  name: string;
  item_count: number;
  total_marks: number;
}
export interface ReviewItem {
  id: string;
  role: Role;
  sourceRef: string;
  freshRef: string;
  effectiveMarks: number;
  portable: Portable;
}
export interface Review {
  items: ReviewItem[];
  totalMarks: number;
}
