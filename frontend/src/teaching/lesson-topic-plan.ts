import type { HodderLessonSlide as LessonSlide } from './lesson-content-hodder-types';

export type TopicPageKind = 'study' | 'practice';

export type TopicPage = {
  id: string;
  topicCode: string;
  title: string;
  kind: TopicPageKind;
  /** First 1-based page inside the uploaded source extract represented by this semantic page. */
  bookPage: number | null;
  /** All 1-based source-extract pages represented by this semantic page. */
  bookPages: number[];
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
const isExactSourceTranscript = (slide: LessonSlide) =>
  slide.id.startsWith('pdf-first-') && !slide.id.startsWith('pdf-first-lens-') && !slide.examPractice;

const topicCodeOf = (slide: LessonSlide) =>
  slide.subtopicCode?.match(TOPIC_CODE)?.[1]
  ?? slide.section.trim().match(TOPIC_CODE)?.[1]
  ?? null;

/*
 * The three supplied extracts use different page-number conventions in the
 * curated teaching layer: Chapter 1 already uses extract pages, Chapter 7 often
 * carries printed pages 258–298, and Chapter 13 mixes extract pages with printed
 * pages 304–327. Normalise them before using page provenance.
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

const sourceFilePagesForSlide = (topicCode:string, slide:LessonSlide) => {
  const rawPages=[
    ...(slide.sourcePages ?? []),
    ...(slide.sourceAtomEvidence?.map(item=>item.page) ?? []),
  ].filter(page=>Number.isFinite(page)&&page>0);
  return [...new Set(rawPages.map(page=>sourceFilePage(topicCode,page)))].sort((a,b)=>a-b);
};

const normalise = (value: string) => value.replace(/\s+/g, ' ').trim();
const normaliseKey = (value:string) => normalise(value).toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9.]+/g,' ').trim();
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
  const match=normalise(text).match(new RegExp(`^(${escapeRegExp(topicCode)}\\.\\d+)\\s+(.+)$`,'i'));
  if(!match)return null;
  const code=match[1];
  const rest=match[2].trim();
  const known=MAJOR_BOOK_HEADINGS.find(heading=>rest.toLowerCase().startsWith(heading.toLowerCase()));
  if(known)return `${code} ${known}`;
  const firstSentence=rest.split(/(?<=[.!?])\s+/)[0]?.trim() ?? '';
  return firstSentence.length>0&&firstSentence.length<=90?`${code} ${firstSentence}`:code;
}

function majorHeading(text:string) {
  const value=normalise(text);
  const lower=value.toLowerCase();
  return MAJOR_BOOK_HEADINGS.find(heading=>{
    const candidate=heading.toLowerCase();
    if(lower===candidate)return true;
    return lower.startsWith(`${candidate}:`)
      || lower.startsWith(`${candidate} –`)
      || lower.startsWith(`${candidate} —`)
      || lower.startsWith(`${candidate} -`);
  }) ?? null;
}

function semanticHeadingFromText(topicCode:string, text:string) {
  const value=normalise(text);
  if(!value)return null;
  if(/WHAT YOU SHOULD ALREADY KNOW/i.test(value))return 'Prior knowledge';
  if(/^key terms?(?:\s*[:·–—-].*)?$/i.test(value))return 'Key terms';
  if(/^introduction$/i.test(value))return 'Introduction';
  return numberedHeading(topicCode,value) ?? majorHeading(value);
}

function semanticHeadingForSlide(topicCode:string, slide:LessonSlide) {
  const candidates=[slide.title, slide.section, ...(slide.bullets ?? [])];
  for(const candidate of candidates){
    const heading=semanticHeadingFromText(topicCode,candidate);
    if(heading)return heading;
  }
  return null;
}

function titleForPage(topicCode: string, slides: LessonSlide[], bookPage: number | null, pageIndex: number) {
  const text = slides.flatMap(slide => [slide.title, ...(slide.bullets ?? [])]).map(normalise).filter(Boolean);
  if (text.some(item => /WHAT YOU SHOULD ALREADY KNOW/i.test(item))) return 'Prior knowledge';

  for(const item of text){
    const semantic=semanticHeadingFromText(topicCode,item);
    if(semantic)return semantic;
  }

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

type StudyPageDraft = {
  title:string;
  slides:LessonSlide[];
};

function draftSourcePages(topicCode:string, draft:StudyPageDraft) {
  return [...new Set(draft.slides.flatMap(slide=>sourceFilePagesForSlide(topicCode,slide)))].sort((a,b)=>a-b);
}

function headingMatches(left:string,right:string) {
  const a=normaliseKey(left),b=normaliseKey(right);
  return Boolean(a&&b&&(a===b||a.endsWith(` ${b}`)||b.endsWith(` ${a}`)));
}

function nearestDraftForSourcePage(topicCode:string, drafts:StudyPageDraft[], sourcePage:number|null) {
  if(!drafts.length)return null;
  if(sourcePage==null)return drafts.at(-1) ?? drafts[0];
  let best=drafts[0];
  let bestDistance=Number.POSITIVE_INFINITY;
  drafts.forEach(draft=>{
    const pages=draftSourcePages(topicCode,draft);
    const distance=pages.length?Math.min(...pages.map(page=>Math.abs(page-sourcePage))):Number.POSITIVE_INFINITY;
    if(distance<bestDistance){best=draft;bestDistance=distance;}
  });
  return best;
}

function buildSemanticStudyDrafts(code:string, study:LessonSlide[]) {
  const curated=study.filter(slide=>!isExactSourceTranscript(slide));
  const transcripts=study.filter(isExactSourceTranscript);
  const drafts:StudyPageDraft[]=[];
  let current:StudyPageDraft|null=null;

  for(const slide of curated){
    const heading=semanticHeadingForSlide(code,slide);
    if(!current){
      current={title:heading ?? titleForPage(code,[slide],sourceFilePageForSlide(code,slide),0),slides:[slide]};
      drafts.push(current);
      continue;
    }
    if(heading&&!headingMatches(current.title,heading)){
      current={title:heading,slides:[slide]};
      drafts.push(current);
      continue;
    }
    current.slides.push(slide);
  }

  /*
   * Exact PDF transcripts are source evidence, not page boundaries. They are
   * attached to the closest semantic teaching section so a book subsection may
   * naturally span several physical PDF pages while remaining one scrollable page.
   */
  for(const transcript of transcripts){
    const heading=semanticHeadingForSlide(code,transcript);
    const headingTarget=heading?drafts.find(draft=>headingMatches(draft.title,heading)):null;
    const sourcePage=sourceFilePageForSlide(code,transcript);
    const target=headingTarget ?? nearestDraftForSourcePage(code,drafts,sourcePage);
    if(target){
      target.slides.push(transcript);
      continue;
    }
    drafts.push({
      title:heading ?? titleForPage(code,[transcript],sourcePage,0),
      slides:[transcript],
    });
  }

  return drafts;
}

function finaliseStudyPage(code:string, draft:StudyPageDraft, pageIndex:number):TopicPage {
  const bookPages=draftSourcePages(code,draft);
  const slug=normaliseKey(draft.title).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||`part-${pageIndex+1}`;
  return {
    id:`${code}-section-${String(pageIndex+1).padStart(2,'0')}-${slug}`,
    topicCode:code,
    title:draft.title,
    kind:'study',
    bookPage:bookPages[0] ?? null,
    bookPages,
    slides:draft.slides,
  };
}

function buildTopicPages(code: string, slides: LessonSlide[]): TopicPage[] {
  const study = slides.filter(slide => !isPractice(slide));
  const practice = slides.filter(isPractice);
  const pages=buildSemanticStudyDrafts(code,study).map((draft,index)=>finaliseStudyPage(code,draft,index));

  if (practice.length) {
    const bookPages=[...new Set(practice.flatMap(slide=>sourceFilePagesForSlide(code,slide)))].sort((a,b)=>a-b);
    pages.push({
      id: `${code}-past-paper`,
      topicCode: code,
      title: 'Past Paper practice',
      kind: 'practice',
      bookPage: bookPages[0] ?? null,
      bookPages,
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
    const bookPages=[...new Set(overview.flatMap(slide=>slide.sourcePages ?? []))].sort((a,b)=>a-b);
    topics.push({
      code: 'overview',
      title: 'Chapter overview',
      pages: [{
        id: 'overview-page',
        topicCode: 'overview',
        title: 'Chapter overview',
        kind: 'study',
        bookPage: bookPages[0] ?? null,
        bookPages,
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
