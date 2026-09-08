import type { HodderLessonSlide as LessonSlide } from './lesson-content-hodder-types';

export type TopicPageKind = 'study' | 'practice';

export type TopicPage = {
  id: string;
  topicCode: string;
  title: string;
  kind: TopicPageKind;
  bookPage: number | null;
  slides: LessonSlide[];
};

export type LessonTopic = {
  code: string;
  title: string;
  pages: TopicPage[];
};

const TOPIC_CODE = /^(\d+\.\d+)/;
const isLens = (slide: LessonSlide) => slide.id.startsWith('pdf-first-lens-');
const isPractice = (slide: LessonSlide) => Boolean(slide.examPractice) || isLens(slide);

const topicCodeOf = (slide: LessonSlide) =>
  slide.subtopicCode?.match(TOPIC_CODE)?.[1]
  ?? slide.section.trim().match(TOPIC_CODE)?.[1]
  ?? null;

const sourceFilePageOf = (slide: LessonSlide) => {
  const evidencePages = slide.sourceAtomEvidence?.map(item => item.page).filter(page => Number.isFinite(page) && page > 0) ?? [];
  if (evidencePages.length) return Math.min(...evidencePages);
  const sourcePages = slide.sourcePages?.filter(page => Number.isFinite(page) && page > 0) ?? [];
  return sourcePages.length ? Math.min(...sourcePages) : null;
};

const normalise = (value: string) => value.replace(/\s+/g, ' ').trim();
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MAJOR_BOOK_HEADINGS = [
  'Number systems', 'Binary number system', 'Binary addition and subtraction', 'Binary addition', 'Binary subtraction',
  'Measurement of the size of computer memories', 'Hexadecimal number system', 'Use of the hexadecimal system',
  'Binary-coded decimal (BCD) system', 'Uses of BCD', 'ASCII codes and Unicodes', 'Multimedia', 'Bit-map images',
  'Vector graphics', 'Sound', 'File compression', 'Lossy and lossless compression',
  'Pointer data type', 'Composite data types', 'Other data types', 'Sets', 'Classes', 'File organisation',
  'Serial file organisation', 'Sequential file organisation', 'Random file organisation', 'File access',
  'Sequential access', 'Direct access', 'Hashing algorithms', 'Converting binary floating-point numbers into denary',
  'Converting denary numbers into binary floating-point numbers', 'Potential rounding errors and approximations',
  'Normalisation', 'Precision versus range', 'Floating-point problems',
  'Flowcharts', 'Pseudocode', 'The pseudocode for sequence', 'The pseudocode for selection',
  'The pseudocode for iteration', 'Linear search', 'Bubble sort', 'Totalling', 'Counting',
  'Finding the average', 'Finding the maximum and minimum', 'Validation', 'Verification', 'Test data',
  'Trace tables', 'Dry runs', 'Writing and amending algorithms',
] as const;

function titleForPage(topicCode: string, slides: LessonSlide[], bookPage: number | null, pageIndex: number) {
  const text = slides.flatMap(slide => [slide.title, ...(slide.bullets ?? [])]).map(normalise).filter(Boolean);
  if (text.some(item => /WHAT YOU SHOULD ALREADY KNOW/i.test(item))) return 'Prior knowledge';

  const subsection = new RegExp(`^${escapeRegExp(topicCode)}\\.\\d+\\s+.+`, 'i');
  const numbered = text.find(item => subsection.test(item));
  if (numbered) return numbered;

  const major = MAJOR_BOOK_HEADINGS.find(heading => text.some(item => item.toLowerCase() === heading.toLowerCase()));
  if (major) return major;

  const usefulTitle = slides
    .map(slide => normalise(slide.title))
    .find(title => title
      && title.length <= 100
      && !/coursebook sequence|source detail|source complete|presentation|checkpoint/i.test(title));
  if (usefulTitle) return usefulTitle;

  return bookPage ? `Coursebook page ${bookPage}` : `Topic overview ${pageIndex + 1}`;
}

function topicTitleMap(subtopics: readonly string[]) {
  const map = new Map<string, string>();
  subtopics.forEach(label => {
    const code = label.trim().match(TOPIC_CODE)?.[1];
    if (!code) return;
    map.set(code, label.replace(new RegExp(`^${escapeRegExp(code)}\\s*`), '').trim() || label);
  });
  return map;
}

function buildTopicPages(code: string, slides: LessonSlide[]): TopicPage[] {
  const study = slides.filter(slide => !isPractice(slide));
  const practice = slides.filter(isPractice);
  const unpaged: LessonSlide[] = [];
  const byBookPage = new Map<number, LessonSlide[]>();

  study.forEach(slide => {
    const page = sourceFilePageOf(slide);
    if (page == null) {
      unpaged.push(slide);
      return;
    }
    const group = byBookPage.get(page) ?? [];
    group.push(slide);
    byBookPage.set(page, group);
  });

  const pages: TopicPage[] = [];
  if (unpaged.length) {
    pages.push({
      id: `${code}-overview`,
      topicCode: code,
      title: titleForPage(code, unpaged, null, pages.length),
      kind: 'study',
      bookPage: null,
      slides: unpaged,
    });
  }

  [...byBookPage.entries()].sort(([a], [b]) => a - b).forEach(([bookPage, pageSlides]) => {
    pages.push({
      id: `${code}-book-${bookPage}`,
      topicCode: code,
      title: titleForPage(code, pageSlides, bookPage, pages.length),
      kind: 'study',
      bookPage,
      slides: pageSlides,
    });
  });

  if (practice.length) {
    pages.push({
      id: `${code}-past-paper`,
      topicCode: code,
      title: 'Past Paper practice',
      kind: 'practice',
      bookPage: null,
      slides: practice,
    });
  }

  return pages;
}

export function buildTopicPlan(slides: readonly LessonSlide[], subtopics: readonly string[]): LessonTopic[] {
  const titles = topicTitleMap(subtopics);
  const declaredCodes = [...titles.keys()];
  const byTopic = new Map<string, LessonSlide[]>();
  const overview: LessonSlide[] = [];

  slides.forEach(slide => {
    const code = topicCodeOf(slide);
    if (!code) {
      overview.push(slide);
      return;
    }
    const group = byTopic.get(code) ?? [];
    group.push(slide);
    byTopic.set(code, group);
  });

  const discoveredCodes = [...byTopic.keys()].filter(code => !declaredCodes.includes(code));
  const topics: LessonTopic[] = [];

  if (overview.length) {
    topics.push({
      code: 'overview',
      title: 'Chapter overview',
      pages: [{
        id: 'overview-page',
        topicCode: 'overview',
        title: 'Chapter overview',
        kind: 'study',
        bookPage: null,
        slides: overview,
      }],
    });
  }

  [...declaredCodes, ...discoveredCodes].forEach(code => {
    const topicSlides = byTopic.get(code) ?? [];
    if (!topicSlides.length) return;
    topics.push({
      code,
      title: titles.get(code) ?? topicSlides[0]?.section.replace(new RegExp(`^${escapeRegExp(code)}\\s*`), '').trim() ?? code,
      pages: buildTopicPages(code, topicSlides),
    });
  });

  return topics;
}

export const flattenTopicPages = (topics: readonly LessonTopic[]) =>
  topics.flatMap(topic => topic.pages.map((page, pageIndex) => ({ topic, page, pageIndex })));
