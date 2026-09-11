import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { CHAPTER_7 as CHAPTER_7_DISCOVERY } from './lesson-content-chapter7';
import { CHAPTER_7_BOOK_SLIDES } from './chapter7-book-content';
import { CHAPTER_7_ALL_SOURCE_ATOMS, chapter7SourceAtomsForSlide } from './chapter7-source-atom-complete';
import { HODDER_CHAPTER_1 } from './lesson-content-hodder-ch1';
import { HODDER_CHAPTER_13 } from './lesson-content-hodder-ch13';
import { LESSON_CHAPTERS as SOURCE_CHAPTERS } from './lesson-content-source-complete';
import { sourceAtomsForChapter, sourceAtomsForSlide } from './lesson-source-atom-registry';
import { rawPdfEmphasisForChapter } from './raw-pdf-emphasis-baseline';
import { CHAPTER_2_KEY_TERMS_2_1, CHAPTER_2_KEY_TERMS_2_2 } from './chapter2-source-emphasis';
import { chapter14PresentationStoryboard } from './chapter14-presentation-storyboard';
import { frameChapter2NetworkingPresentation } from './chapter2-networking-presentation';
import { curateChapterPresentation } from './chapter-presentation-curation';
import type { HodderLessonSlide, LessonRichBlock } from './lesson-content-hodder-types';
import type { LessonVisual } from './lesson-content-full';
import { studentFacingSlide, studentFacingText } from './lesson-student-facing';
import { buildTopicPlan, type LessonTopic, type TopicPage } from './lesson-topic-plan';

export type LessonExperienceChapter = (typeof SOURCE_CHAPTERS)[number] | typeof CHAPTER_7;

export const LESSON_EXPERIENCE_CHAPTERS: LessonExperienceChapter[] = [
  ...SOURCE_CHAPTERS,
  CHAPTER_7,
].sort((left, right) => left.number - right.number);

export type LessonMode = 'study' | 'present' | 'exam';
export type LessonAudience = 'teacher' | 'student';
export type LessonBeatKind = 'concept' | 'key-idea' | 'definition' | 'example' | 'activity' | 'check' | 'visual' | 'source' | 'emphasis';
export type LessonSceneRole = 'hook' | 'objective' | 'concept' | 'process' | 'visual' | 'compare' | 'challenge' | 'exam' | 'recap';

export type LessonPresentationBeat = {
  id: string;
  slideId: string;
  kind: LessonBeatKind;
  sceneRole?: LessonSceneRole;
  eyebrow: string;
  title: string;
  sourcePages: number[];
  showSource?: boolean;
  teacherNote?: string;
  visual?: LessonVisual;
  lead?: string;
  bullets?: string[];
  keyTerms?: Array<{ term:string;definition:string }>;
  formula?: string;
  richBlock?: LessonRichBlock;
  example?: NonNullable<HodderLessonSlide['example']>;
  activity?: NonNullable<HodderLessonSlide['activity']>;
  prompt?: string;
};

const SOURCE_ATOM_LABEL = /^(?:LEARNING OUTLINE|KEY TERM \/ IMPORTANT TERM|WORKED EXAMPLE|ACTIVITY|EXTENSION|TABLE|FIGURE \/ DIAGRAM|SUMMARY \/ REVIEW|EXAM-STYLE PRACTICE|COURSEBOOK DETAIL) · /;
const TECHNICAL_TITLE = /(?:exact source transcript|coursebook source page|source page evidence|source detail)/i;

/**
 * Source-complete chapters append audit atoms to learner slides so Study mode
 * can account for every supplied-PDF detail. Presentation mode uses the
 * authored teaching version of the same slide. This keeps the source complete
 * without turning each evidence atom into a separate projector page.
 */
const PRESENTER_CORE_BY_ID = new Map<string,HodderLessonSlide>([
  ...HODDER_CHAPTER_1.slides,
  ...HODDER_CHAPTER_13.slides,
  ...CHAPTER_7_DISCOVERY.slides,
  ...CHAPTER_7_BOOK_SLIDES,
].map(slide=>[slide.id,slide as HodderLessonSlide]));

const normaliseKey=(value:string)=>value.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();

function mergeKeyTerms(...groups:Array<HodderLessonSlide['keyTerms']>) {
  const seen=new Set<string>();
  return groups.flatMap(group=>group??[]).filter(item=>{
    const key=normaliseKey(item.term);
    if(!key||seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

function presenterSlide(active:HodderLessonSlide) {
  const core=PRESENTER_CORE_BY_ID.get(active.id);
  if(!core)return active;
  return {
    ...active,
    ...core,
    bullets:core.bullets,
    richBlocks:core.richBlocks,
    activity:core.activity,
    keyTerms:mergeKeyTerms(active.keyTerms,core.keyTerms),
    sourcePages:active.sourcePages ?? core.sourcePages,
    sourceElements:active.sourceElements ?? core.sourceElements,
    sourceAtomEvidence:active.sourceAtomEvidence,
    sourceLabel:active.sourceLabel ?? core.sourceLabel,
  };
}

export function isExactSourceTranscript(slide:HodderLessonSlide) {
  return slide.id.startsWith('pdf-first-') && !slide.id.startsWith('pdf-first-lens-') && !slide.examPractice;
}

export function learnerSlidesForPage(page:TopicPage) {
  const slides=page.slides as HodderLessonSlide[];
  const hasCurated=slides.some(slide=>!isExactSourceTranscript(slide));
  return hasCurated ? slides.filter(slide=>!isExactSourceTranscript(slide)) : slides;
}

export function learnerBullets(slide:HodderLessonSlide) {
  return (slide.bullets ?? [])
    .filter(item=>!SOURCE_ATOM_LABEL.test(item))
    .flatMap(item=>item.split(/\s+\+\s+/)
      .map(part=>part.replace(/^\s*\+\s+/,'').trim())
      .filter(Boolean));
}

export function auditBullets(slide:HodderLessonSlide) {
  return (slide.bullets ?? []).filter(item=>SOURCE_ATOM_LABEL.test(item));
}

export function displaySlide(slide:HodderLessonSlide, pageTitle:string) {
  const projected=studentFacingSlide(slide);
  const exact=isExactSourceTranscript(slide);
  return {
    ...projected,
    eyebrow:exact?`${slide.subtopicCode??slide.section} · COMPLETE COURSEBOOK CONTENT`:projected.eyebrow,
    title: exact?pageTitle:TECHNICAL_TITLE.test(projected.title) ? pageTitle : projected.title,
    lead: exact?'Work through the coursebook concept, example and task in sequence.':projected.lead,
    // Filter source-audit atoms before wording is projected for learners. Some
    // audit prefixes are intentionally renamed by studentFacingText, which
    // would make them indistinguishable from real teaching bullets afterwards.
    bullets:learnerBullets(slide).map(studentFacingText),
  };
}

export function courseCode(chapter:LessonExperienceChapter) {
  return chapter.number===7 ? '0478' : '9618';
}

export function courseName(chapter:LessonExperienceChapter) {
  return chapter.number===7
    ? 'Cambridge IGCSE / O Level Computer Science'
    : 'Cambridge International AS & A Level Computer Science';
}

export function topicLabel(topic:LessonTopic) {
  return topic.code==='overview' ? 'Overview' : topic.code;
}

export function displayPageTitle(page:TopicPage, topic:LessonTopic) {
  if(topic.code==='13.3' && /file organisation|file access/i.test(page.title))return 'Floating-point chapter review';
  return page.title.replace(/^Coursebook page\s+/i,'Source page ');
}

function chunks<T>(items:readonly T[], size:number) {
  const result:T[][]=[];
  for(let index=0;index<items.length;index+=size)result.push(items.slice(index,index+size));
  return result;
}

function textChunks(value:string, limit=520) {
  const text=value.trim();
  if(text.length<=limit)return text?[text]:[];
  const sentences=text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const result:string[]=[];
  let current='';
  for(const sentence of sentences){
    if(current && `${current} ${sentence}`.length>limit){result.push(current);current=sentence;}
    else current=current?`${current} ${sentence}`:sentence;
  }
  if(current)result.push(current);
  return result.length?result:chunks([...text],limit).map(part=>part.join(''));
}

function splitRichBlock(block:LessonRichBlock):LessonRichBlock[] {
  if(block.kind==='paragraph')return textChunks(block.text).map(text=>({...block,text}));
  if(block.kind==='bullets')return chunks(block.items,4).map(items=>({...block,items}));
  if(block.kind==='steps')return chunks(block.items,5).map((items,index)=>({...block,title:index===0?block.title:undefined,items}));
  if(block.kind==='code')return chunks(block.lines,10).map((lines,index)=>({...block,title:index===0?block.title:block.title?`${block.title} · continued`:undefined,lines}));
  if(block.kind==='table')return chunks(block.table.rows,6).map((rows,index,parts)=>({
    ...block,
    table:{...block.table,caption:parts.length>1?`${block.table.caption??'Table'} · ${index+1}/${parts.length}`:block.table.caption,rows},
  }));
  if(block.kind==='comparison')return chunks(block.rows,4).map(rows=>({...block,rows}));
  return [block];
}

function beat(
  slide:HodderLessonSlide,
  pageTitle:string,
  suffix:string,
  kind:LessonBeatKind,
  content:Partial<LessonPresentationBeat>,
):LessonPresentationBeat {
  const projected=displaySlide(slide,pageTitle);
  return {
    id:`${slide.id}-${suffix}`,
    slideId:slide.id,
    kind,
    eyebrow:projected.eyebrow,
    title:projected.title,
    sourcePages:slide.sourcePages ?? [],
    visual:projected.visual,
    ...content,
  };
}

export function presentationBeatsForSlide(sourceSlide:HodderLessonSlide, pageTitle:string) {
  const slide=displaySlide(sourceSlide,pageTitle);
  const result:LessonPresentationBeat[]=[];
  const leadParts=textChunks(slide.lead);
  leadParts.forEach((lead,index)=>result.push(beat(sourceSlide,pageTitle,`concept-${index+1}`,'concept',{lead})));
  chunks(slide.bullets ?? [],4).forEach((bullets,index)=>result.push(beat(sourceSlide,pageTitle,`ideas-${index+1}`,'key-idea',{bullets})));
  if(slide.formula)result.push(beat(sourceSlide,pageTitle,'formula','visual',{formula:slide.formula}));
  chunks(slide.keyTerms ?? [],2).forEach((keyTerms,index)=>result.push(beat(sourceSlide,pageTitle,`terms-${index+1}`,'definition',{keyTerms})));
  (slide.richBlocks ?? []).flatMap(splitRichBlock).forEach((richBlock,index)=>{
    const kind:LessonBeatKind=richBlock.kind==='figure'||richBlock.kind==='table'?'visual':richBlock.kind==='callout'&&richBlock.tone==='activity'?'activity':'key-idea';
    result.push(beat(sourceSlide,pageTitle,`block-${index+1}`,kind,{richBlock}));
  });
  if(slide.example){
    const example=slide.example;
    const lineGroups=chunks(example.lines,5);
    lineGroups.forEach((lines,index)=>result.push(beat(sourceSlide,pageTitle,`example-${index+1}`,'example',{
      example:{...example,lines,answer:index===lineGroups.length-1?example.answer:undefined},
    })));
  }
  if(slide.teacherPrompt)result.push(beat(sourceSlide,pageTitle,'check','check',{prompt:slide.teacherPrompt}));
  if(slide.activity)result.push(beat(sourceSlide,pageTitle,'activity','activity',{activity:slide.activity}));
  return result.length?result:[beat(sourceSlide,pageTitle,'concept','concept',{lead:slide.lead})];
}

type PresentationSourceAtom = {
  id:string;
  kind:string;
  sourceRef:string;
  targetSlideId:string;
  sourcePage:number;
  printedPage:number;
  needles:string[];
};

function chapterNumberForTopic(topic:LessonTopic,slides:readonly HodderLessonSlide[]=[]):1|2|7|13|14|null {
  const value=Number(topic.code.split('.')[0]);
  if(value===1||value===2||value===7||value===13||value===14)return value;
  const firstId=slides[0]?.id??'';
  if(firstId.startsWith('h13-'))return 13;
  if(firstId.startsWith('h14-'))return 14;
  if(firstId.startsWith('h2-'))return 2;
  if(firstId.startsWith('h1-'))return 1;
  if(firstId.startsWith('ch7-'))return 7;
  return null;
}

function deckChapterNumberForTopic(topic:LessonTopic,slides:readonly HodderLessonSlide[]=[]):LessonExperienceChapter['number']|null {
  const value=Number(topic.code.split('.')[0]);
  if([1,2,3,4,7,13,14].includes(value))return value as LessonExperienceChapter['number'];
  const firstId=slides[0]?.id??'';
  if(firstId.startsWith('h14-'))return 14;
  if(firstId.startsWith('h13-'))return 13;
  if(firstId.startsWith('h4-'))return 4;
  if(firstId.startsWith('h3-'))return 3;
  if(firstId.startsWith('h2-'))return 2;
  if(firstId.startsWith('h1-'))return 1;
  if(firstId.startsWith('ch7-'))return 7;
  return null;
}

function presentationAtomsForChapter(chapter:1|2|7|13|14):PresentationSourceAtom[] {
  if(chapter===2)return [...CHAPTER_2_KEY_TERMS_2_1,...CHAPTER_2_KEY_TERMS_2_2].map((item,index)=>({
    id:`chapter-2-term-${index+1}`,
    kind:'keyword',
    sourceRef:item.term,
    targetSlideId:'',
    sourcePage:item.page-26,
    printedPage:item.page,
    needles:[item.term,item.definition,item.simple],
  }));
  if(chapter===7)return CHAPTER_7_ALL_SOURCE_ATOMS.map(atom=>({
    id:atom.id,
    kind:atom.kind,
    sourceRef:atom.sourceRef,
    targetSlideId:atom.targetSlideId,
    sourcePage:atom.printedPage-257,
    printedPage:atom.printedPage,
    needles:[...atom.needles],
  }));
  if(chapter===14)return [];
  return sourceAtomsForChapter(chapter).map(atom=>({
    id:atom.id,
    kind:atom.kind,
    sourceRef:atom.sourceRef,
    targetSlideId:atom.targetSlideId,
    sourcePage:atom.page,
    printedPage:chapter===13?atom.page+303:atom.page,
    needles:[...atom.needles],
  }));
}

function presentationAtomsForSlide(chapter:1|2|7|13|14,slideId:string):PresentationSourceAtom[] {
  if(chapter===7)return chapter7SourceAtomsForSlide(slideId).map(atom=>({
    id:atom.id,
    kind:atom.kind,
    sourceRef:atom.sourceRef,
    targetSlideId:atom.targetSlideId,
    sourcePage:atom.printedPage-257,
    printedPage:atom.printedPage,
    needles:[...atom.needles],
  }));
  if(chapter===14)return [];
  return sourceAtomsForSlide(slideId).map(atom=>({
    id:atom.id,
    kind:atom.kind,
    sourceRef:atom.sourceRef,
    targetSlideId:atom.targetSlideId,
    sourcePage:atom.page,
    printedPage:chapter===13?atom.page+303:atom.page,
    needles:[...atom.needles],
  }));
}

function sourceKindLabel(kind:string) {
  if(kind==='objective')return 'LEARNING OBJECTIVE';
  if(kind==='prior')return 'PRIOR KNOWLEDGE';
  if(kind==='keyword')return 'KEYWORD / TERM';
  if(kind==='example')return 'WORKED EXAMPLE';
  if(kind==='activity')return 'ACTIVITY';
  if(kind==='extension')return 'EXTENSION ACTIVITY';
  if(kind==='table')return 'TABLE';
  if(kind==='figure')return 'FIGURE / DIAGRAM';
  if(kind==='review')return 'END-OF-TOPIC REVIEW';
  if(kind==='exam')return 'EXAM PRACTICE';
  return 'IMPORTANT COURSEBOOK DETAIL';
}

function sourceBeatKind(kind:string):LessonBeatKind {
  if(kind==='activity'||kind==='prior'||kind==='review'||kind==='exam')return 'activity';
  if(kind==='example')return 'example';
  if(kind==='keyword')return 'definition';
  if(kind==='figure'||kind==='table')return 'visual';
  return 'source';
}

function sourceIntro(kind:string) {
  if(kind==='activity'||kind==='prior'||kind==='review'||kind==='exam')return 'Attempt the task independently, then explain and justify the solution with the class.';
  if(kind==='example')return 'Follow the values and operations in sequence, explaining the purpose of each step.';
  if(kind==='keyword')return 'Use the formal term accurately and connect it to its function in this topic.';
  if(kind==='figure')return 'Explain each part of the visual and the relationship between the parts.';
  if(kind==='table')return 'Compare the values in the table and describe the pattern you can see.';
  return 'Connect this source detail to the main concept and explain it in your own words.';
}

function sourceCoverageBeats(slide:HodderLessonSlide,pageTitle:string,chapter:1|2|7|13|14) {
  return presentationAtomsForSlide(chapter,slide.id).flatMap(atom=>{
    const seen=new Set<string>();
    const lines=atom.needles.map(item=>item.trim()).filter(item=>{
      const key=normaliseKey(item);
      if(!key||seen.has(key))return false;
      seen.add(key);
      return true;
    });
    return chunks(lines,4).map((items,index)=>beat(slide,pageTitle,`source-${atom.id}-${index+1}`,sourceBeatKind(atom.kind),{
      eyebrow:`${sourceKindLabel(atom.kind)} · COURSEBOOK p.${atom.printedPage}`,
      title:index?`${atom.sourceRef} · continued`:atom.sourceRef,
      lead:sourceIntro(atom.kind),
      richBlock:{kind:'bullets',items},
      sourcePages:[atom.printedPage],
      visual:atom.kind==='figure'?slide.visual:undefined,
    }));
  });
}

function emphasisExplanation(anchor:{text:string;printedPage:number},atoms:PresentationSourceAtom[]) {
  const key=normaliseKey(anchor.text);
  const onPage=atoms.filter(atom=>atom.printedPage===anchor.printedPage);
  const related=onPage.find(atom=>normaliseKey(atom.sourceRef).includes(key)||atom.needles.some(line=>normaliseKey(line).includes(key)));
  const direct=related?.needles.find(line=>{
    const lineKey=normaliseKey(line);
    return lineKey!==key&&lineKey.includes(key)&&line.trim().length>anchor.text.length+8;
  });
  if(direct)return direct;
  const companion=related?.needles.find(line=>normaliseKey(line)!==key&&line.trim().length>12);
  if(companion)return companion;
  if(/^activity|^extension activity/i.test(anchor.text))return `A task from coursebook p.${anchor.printedPage}: apply the knowledge and justify the solution.`;
  if(/^figure/i.test(anchor.text))return `A figure from coursebook p.${anchor.printedPage}: explain the process, structure or relationship between the values shown.`;
  if(/^table/i.test(anchor.text))return `A table from coursebook p.${anchor.printedPage}: use it to compare concepts or values precisely.`;
  return `An important phrase emphasised on coursebook p.${anchor.printedPage}; connect it to the definition, example and questions in this section.`;
}

function emphasisBeatsForTopic(topic:LessonTopic,teaching:Array<{slide:HodderLessonSlide;page:TopicPage}>) {
  const chapter=chapterNumberForTopic(topic,teaching.map(item=>item.slide));
  if(!chapter||!teaching.length)return [];
  const topicPages=new Set(topic.pages.filter(page=>page.kind==='study').flatMap(page=>page.bookPages));
  const anchors=rawPdfEmphasisForChapter(chapter).filter(anchor=>{
    const sourcePage=chapter===7&&anchor.page>257?anchor.page-257:anchor.page;
    return topicPages.has(sourcePage)||topicPages.has(anchor.printedPage);
  });
  const atoms=presentationAtomsForChapter(chapter);
  const sourceSlide=teaching[0]!.slide;
  const pageTitle=displayPageTitle(teaching[0]!.page,topic);
  return chunks(anchors,2).map((group,index)=>beat(sourceSlide,pageTitle,`emphasis-${index+1}`,'emphasis',{
    eyebrow:'COURSEBOOK · EMPHASISED CONTENT',
    title:'Important emphasised coursebook concepts',
    keyTerms:group.map(anchor=>({term:anchor.text,definition:emphasisExplanation(anchor,atoms)})),
    sourcePages:group.map(anchor=>anchor.printedPage),
    visual:undefined,
  }));
}

function teachingRouteForTopic(topic:LessonTopic){
  const routed=topic.pages
    .filter(page=>page.kind==='study')
    .flatMap(page=>page.slides.map(slide=>({slide,page}))) as Array<{slide:HodderLessonSlide;page:TopicPage}>;
  const curated=routed.filter(item=>!isExactSourceTranscript(item.slide));
  return curated.length?curated:routed;
}

function presentationBeatsForSingleTopic(topic:LessonTopic){
  const teaching=teachingRouteForTopic(topic);
  const chapter=chapterNumberForTopic(topic,teaching.map(item=>item.slide));
  if(chapter===14){
    const storyboard=chapter14PresentationStoryboard(topic.code);
    if(storyboard)return storyboard;
  }
  const lesson=teaching.flatMap(({slide,page})=>presentationBeatsForSlide(presenterSlide(slide),displayPageTitle(page,topic)));
  const sourceDetails=chapter?teaching.flatMap(({slide,page})=>sourceCoverageBeats(slide,displayPageTitle(page,topic),chapter)):[];
  const emphasis=emphasisBeatsForTopic(topic,teaching);
  if(chapter===2&&topic.code==='2.1'){
    const framed=frameChapter2NetworkingPresentation(lesson,[]);
    return curateChapterPresentation([...framed,...sourceDetails,...emphasis],topic.code);
  }
  return curateChapterPresentation([...lesson,...sourceDetails,...emphasis],topic.code);
}

export function presentationBeatsForTopic(topic:LessonTopic) {
  const teaching=teachingRouteForTopic(topic);
  const deckChapter=deckChapterNumberForTopic(topic,teaching.map(item=>item.slide));
  const current=presentationBeatsForSingleTopic(topic);
  if(topic.code!=='overview'||deckChapter===14||deckChapter===null)return current;

  const chapter=LESSON_EXPERIENCE_CHAPTERS.find(item=>item.number===deckChapter);
  if(!chapter)return current;
  const remaining=buildTopicPlan(chapter.slides,chapter.subtopics)
    .filter(item=>item.code!=='overview'&&item.pages.some(page=>page.kind==='study'));
  return [...current,...remaining.flatMap(presentationBeatsForSingleTopic)];
}

export function firstStudyPage(topic:LessonTopic) {
  return topic.pages.find(page=>page.kind==='study') ?? topic.pages[0] ?? null;
}

export function practicePage(topic:LessonTopic) {
  return topic.pages.find(page=>page.kind==='practice') ?? null;
}
