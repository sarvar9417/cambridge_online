import type { LessonSlide } from './lesson-content-full';

export type LessonTable = {
  caption?: string;
  headers: string[];
  rows: string[][];
};

export type LessonRichBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'table'; table: LessonTable }
  | { kind: 'code'; title?: string; lines: string[] }
  | { kind: 'steps'; title?: string; items: string[] }
  | { kind: 'callout'; tone?: 'info' | 'warning' | 'activity' | 'extension'; title: string; text: string }
  | { kind: 'comparison'; leftTitle: string; rightTitle: string; rows: Array<[string,string]> };

export type HodderLessonSlide = LessonSlide & {
  sourcePages?: number[];
  sourceElements?: string[];
  richBlocks?: LessonRichBlock[];
  learningObjectiveCodes?: string[];
  checkpointLabel?: string;
  checkpointUnavailableReason?: string;
};

export type HodderLessonChapter = {
  number: 1 | 13;
  level: 'AS Level' | 'A Level';
  title: string;
  subtitle: string;
  subtopics: string[];
  sourceNote: string;
  coverage: string;
  slides: HodderLessonSlide[];
};

export const checkpoint = (
  id: string,
  section: string,
  title: string,
  learningObjectiveCodes: string[],
  sourcePages: number[],
  accent: HodderLessonSlide['accent'] = 'indigo',
): HodderLessonSlide => ({
  id,
  section,
  eyebrow: 'CAMBRIDGE CHECKPOINT · 2021–2025',
  title,
  lead: 'This checkpoint is loaded live from approved Cambridge 9618 past-paper leaves mapped to the exact historical learning objective(s) for the part just taught.',
  learningObjectiveCodes,
  checkpointLabel: learningObjectiveCodes.join(' · '),
  sourcePages,
  sourceElements: ['Live 2021–2025 approved past-paper checkpoint'],
  examPractice: true,
  accent,
});

export const noDirectCheckpoint = (
  id: string,
  section: string,
  title: string,
  reason: string,
  sourcePages: number[],
): HodderLessonSlide => ({
  id,
  section,
  eyebrow: 'CAMBRIDGE CHECKPOINT',
  title,
  lead: reason,
  checkpointUnavailableReason: reason,
  sourcePages,
  sourceElements: ['Explicit no-exact-question checkpoint state'],
  examPractice: true,
  accent: 'amber',
});
