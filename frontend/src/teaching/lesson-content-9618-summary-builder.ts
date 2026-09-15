import type { LessonVisual } from './lesson-content-full';
import type { Hodder9618ChapterNumber } from './hodder-9618-full-book-manifest';
import { hodder9618FullBookChapterRange } from './hodder-9618-full-book-manifest';
import type { HodderLessonChapter, HodderLessonSlide } from './lesson-content-hodder-types';

export type SourceBackedLessonPoint = {
  code: string;
  title: string;
  pages: readonly [number, number];
  lead: string;
  bullets: readonly string[];
  keyTerms?: readonly { term: string; definition: string }[];
  formula?: string;
  reviewPrompt?: string;
  reviewReveal?: string;
  visual?: LessonVisual;
  accent?: HodderLessonSlide['accent'];
};

export type SourceBackedTopicSpec = {
  code: string;
  title: string;
  points: readonly SourceBackedLessonPoint[];
};

export type SourceBackedChapterSpec = {
  number: Hodder9618ChapterNumber;
  level: 'AS Level' | 'A Level';
  title: string;
  subtitle: string;
  objectives: readonly string[];
  topics: readonly SourceBackedTopicSpec[];
};

const pages = (from: number, to: number) =>
  Array.from({ length: Math.max(1, to - from + 1) }, (_, index) => from + index);

const topicCode = (pointCode: string) => pointCode.match(/^(\d+\.\d+)/)?.[1] ?? pointCode;

const pointSlide = (
  chapter: SourceBackedChapterSpec,
  topic: SourceBackedTopicSpec,
  point: SourceBackedLessonPoint,
  index: number,
): HodderLessonSlide => {
  const sourcePages = pages(point.pages[0], point.pages[1]);
  const keyTerms = point.keyTerms?.map(item => ({ ...item }));
  return {
    id: `h${chapter.number}-${point.code.replace(/\./g, '-')}-${String(index + 1).padStart(2, '0')}`,
    section: `${topic.code} ${topic.title}`,
    subtopicCode: topicCode(point.code),
    eyebrow: `${point.code} ${point.title} · HODDER COURSEBOOK · pp.${point.pages[0]}–${point.pages[1]}`,
    title: point.title,
    lead: point.lead,
    bullets: [...point.bullets],
    ...(keyTerms?.length ? { keyTerms } : {}),
    ...(point.formula ? { formula: point.formula } : {}),
    ...(point.reviewPrompt ? {
      activity: {
        title: 'Check your understanding',
        prompt: point.reviewPrompt,
        ...(point.reviewReveal ? { reveal: point.reviewReveal } : {}),
      },
    } : {}),
    visual: point.visual ?? 'recap',
    accent: point.accent ?? (index % 2 === 0 ? 'indigo' : 'cyan'),
    sourcePages,
    sourceLabel: `Hodder 9618 Chapter ${chapter.number} · printed pp.${point.pages[0]}–${point.pages[1]}`,
    sourceElements: [
      `${point.code} ${point.title}`,
      `Exact full-book source pages ${point.pages[0]}–${point.pages[1]}`,
    ],
  };
};

export function buildSourceBacked9618Chapter(spec: SourceBackedChapterSpec): HodderLessonChapter {
  const range = hodder9618FullBookChapterRange(spec.number);
  if (!range) throw new Error(`Missing full-book source range for 9618 Chapter ${spec.number}`);

  const [printedStart, printedEnd] = range.printedPageRange;
  const chapterPageCount = printedEnd - printedStart + 1;

  for (const topic of spec.topics) {
    if (!topic.code.startsWith(`${spec.number}.`)) {
      throw new Error(`Chapter ${spec.number} contains mismatched topic code ${topic.code}`);
    }
    for (const point of topic.points) {
      const [from, to] = point.pages;
      if (!point.code.startsWith(`${topic.code}.`) && point.code !== topic.code) {
        throw new Error(`Chapter ${spec.number} topic ${topic.code} contains mismatched point code ${point.code}`);
      }
      if (from > to || from < printedStart || to > printedEnd) {
        throw new Error(
          `Chapter ${spec.number} point ${point.code} has source pages ${from}–${to} outside printed chapter range ${printedStart}–${printedEnd}`,
        );
      }
    }
  }

  const slides: HodderLessonSlide[] = [
    {
      id: `h${spec.number}-overview`,
      section: 'Chapter overview',
      eyebrow: `CHAPTER ${spec.number} · ${spec.level.toUpperCase()} · HODDER SOURCE`,
      title: spec.title,
      lead: spec.subtitle,
      bullets: [...spec.objectives],
      visual: 'recap',
      accent: 'indigo',
      sourcePages: [printedStart],
      sourceLabel: `Hodder 9618 Chapter ${spec.number} · printed pp.${printedStart}–${printedEnd}`,
      sourceElements: ['Chapter learning objectives', 'Exact full-book chapter range'],
    },
  ];

  spec.topics.forEach((topic, topicIndex) => {
    const topicPages = topic.points.flatMap(point => pages(point.pages[0], point.pages[1]));
    const uniqueTopicPages = [...new Set(topicPages)].sort((a, b) => a - b);
    slides.push({
      id: `h${spec.number}-${topic.code.replace(/\./g, '-')}-map`,
      section: `${topic.code} ${topic.title}`,
      subtopicCode: topic.code,
      eyebrow: `${topic.code} · TOPIC MAP`,
      title: topic.title,
      lead: 'This lesson route follows the numbered Hodder subsections in source order before the chapter review.',
      bullets: topic.points.map(point => `${point.code} ${point.title}`),
      visual: topicIndex % 2 === 0 ? 'types' : 'recap',
      accent: topicIndex % 2 === 0 ? 'cyan' : 'emerald',
      sourcePages: uniqueTopicPages,
      sourceLabel: `Hodder 9618 Chapter ${spec.number} · ${topic.code}`,
      sourceElements: topic.points.map(point => `${point.code} ${point.title}`),
    });
    topic.points.forEach((point, index) => slides.push(pointSlide(spec, topic, point, index)));
  });

  slides.push({
    id: `h${spec.number}-review`,
    section: 'Chapter review',
    eyebrow: `CHAPTER ${spec.number} · RETRIEVAL`,
    title: `Review ${spec.title}`,
    lead: 'Use the original objectives as the final retrieval checklist. Revisit the numbered source-backed topic pages for any item that is not yet secure.',
    bullets: [...spec.objectives],
    activity: {
      title: 'Exit task',
      prompt: `Choose two objectives from Chapter ${spec.number}. Explain one confidently from memory and identify one that still needs another worked example or source-page reread.`,
    },
    visual: 'recap',
    accent: 'amber',
    sourcePages: [printedEnd],
    sourceLabel: `Hodder 9618 Chapter ${spec.number} · end-of-chapter review`,
    sourceElements: ['Chapter review and end-of-chapter questions'],
  });

  return {
    number: spec.number,
    level: spec.level,
    title: spec.title,
    subtitle: spec.subtitle,
    subtopics: spec.topics.map(topic => `${topic.code} ${topic.title}`),
    sourceNote: `Source-backed from the exact connected 576-page Hodder 9618 Coursebook (SHA-256 ${range.sourceFileSha256.slice(0, 12)}…), printed pp.${printedStart}–${printedEnd}. The lesson text is a concise teaching paraphrase of the supplied source rather than a verbatim reproduction.`,
    coverage: `${chapterPageCount}/${chapterPageCount} chapter pages are source-locked and mapped through the numbered Hodder topic sequence; every declared numbered teaching point has page provenance plus a retrieval task where appropriate.`,
    slides,
  };
}
