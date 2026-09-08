import type { HodderLessonSlide as LessonSlide } from './lesson-content-hodder-types';

export type TopicPageKind = 'study' | 'practice';

export type TopicPage = {
  id: string;
  topicCode: string;
  title: string;
  kind: TopicPageKind;
  /** 1-based page inside the uploaded source extract, not necessarily the printed textbook number. */
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

/*
 * The three supplied extracts use different page-number conventions in the
 * curated teaching layer: Chapter 1 already uses extract pages, Chapter 7 often
 * carries printed pages 258–298, and Chapter 13 mixes extract pages with printed
 * pages 304–327. Normalise them before grouping or the same physical page appears
 * twice in the topic navigator.
 */
const PAGE_OFFSET_BY_CHAPTER: Readonly<Record<number, number>> = { 1:0, 7:257, 13:303 };
const chapterOfTopic = (topicCode:string) => Number(topicCode.split('.')[0] || 0);
const sourceFilePage = (topicCode:string, page:number) => {
  const offset=PAGE_OFFSET_BY_CHAPTER[chapterOfTopic(topicCode)] ?? 0;
  return offset>0 && page>offset ? page-offset : page;
};
const printedBookPage = (topicCode:string, page:number) => {
  const offset=PAGE_OFFSET_BY_CHAPTER[chapterOfTopic(topicCode)] ?? 0;
  return page+offset;
};

export const sourceFilePageForSlide = (topicCode:string, slide: LessonSlide) => {
  const rawPages=[
    ...(slide.sourcePages ?? []),
    ...(slide.sourceAtomEvidence?.map(item=>item.page) ?? []),
  ].filter(page=>Number.isFinite(page)&&page>0);
  if(!rawPages.length)return null;
  return Math.min(...rawPages.map(page=>sourceFilePage(topicCode,page)));
};

const normalise = (value: string) => value.replace(/\s+/g, ' ').trim();
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MAJOR_BOOK_HEADINGS = [
  'Number systems', 'Binary number system', 'Binary addition and subtraction', 'Binary addition', 'Binary subtraction',
  'Measurement of the size of computer memories', 'Hexadecimal number system', 'Use of the hexadecimal system',
  'Binary-coded decimal (BCD) system', 'Uses of BCD', 'ASCII codes and Unicodes', 'Multimedia', 'Bit-map images',
  'Vector graphics', 'Sound', 'File compression', 'Lossy and lossless compression',
  'Analysis', 'Design', 'Coding and iterative testing', 'Testing', 'Abstraction', 'Decomposition',
  'Computer systems and sub-systems', 'Structure diagrams', 'Flowcharts', 'Pseudocode',
  'The pseudocode for sequence', 'The pseudocode for selection', 'The pseudocode for iteration',
  'Linear search', 'Bubble sort', 'Totalling', 'Counting', 'Finding the average', 'Finding the maximum and minimum',
  'Validation', 'Verification', 'Test data', 'Trace tables', 'Dry runs', 'Writing and amending algorithms',
  'Non-composite data types', 'Pointer data type', 'Composite data types', 'Other data types', 'Sets', 'Classes',
  'File organisation', 'Serial file organisation', 'Sequential file organisation', 'Random file organisation', 'File access',
  'Sequential access', 'Direct access', 'Hashing algorithms', 'Converting binary floating-point numbers into denary',
  'Converting denary numbers into binary floating-point numbers', 'Potential rounding errors and approximations',
  'Normalisation', 'Precision versus range', 'Floating-point problems',
] as const;

function numberedHeading(topicCode:string, text:string) {
  const match=text.match(new RegExp(`^(${escapeRegExp(topicCode)}\\.\\d+)\\s+(.+)$`,'i'));
  if(!match)return null;
  const code=match[1];
  const rest=match[2].trim();
  const known=MAJOR_BOOK_HEADINGS.find(heading=>rest.toLowerCase().startsWith(heading.toLowerCase()));
  if(known)return `${code} ${known}`;
  const firstSentence=rest.split(/(?<=[.!?])\s+/)[0]?.trim() ?? '';
  return firstSentence.length>0&&firstSentence.length<=90?`${code} ${firstSentence}`:code;
}

function titleForPage(topicCode: string, slides: LessonSlide[], bookPage: number | null, pageIndex: number) {
  const text = slides.flatMap(slide => [slide.title, ...(slide.bullets ?? [])]).map(normalise).filter(Boolean);
  if (text.some(item => /WHAT YOU SHOULD ALREADY KNOW/i.test(item))) return 'Prior knowledge';

  for(const item of text){
    const numbered=numberedHeading(topicCode,item);
    if(numbered)return numbered;
  }

  const major = MAJOR_BOOK_HEADINGS.find(heading => text.some(item => item.toLowerCase() === heading.toLowerCase()));
  if (major) return major;

  const usefulTitle = slides
    .map(slide => normalise(slide.title))
    .find(title => title
      && title.length <= 100
      && !/coursebook sequence|source page|source detail|source complete|presentation|checkpoint/i.test(title));
  if (usefulTitle) return usefulTitle;

  return bookPage ? `Coursebook page ${printedBookPage(topicCode,bookPage)}` : `Topic overview ${pageIndex + 1}`;
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
    const page = sourceFilePageForSlide(code,slide);
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