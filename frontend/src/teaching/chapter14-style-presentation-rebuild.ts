import type { LessonPresentationBeat, LessonSceneRole } from './lesson-experience-model';
import type { LessonRichBlock } from './lesson-content-hodder-types';

export type RebuiltPresentationChapter = 1 | 2 | 3 | 4 | 7 | 13;

const NORMALISE = (value:string) => value
  .toLowerCase()
  .replace(/[’‘]/g,"'")
  .replace(/[^a-z0-9]+/g,' ')
  .trim();

const TECHNICAL_EYEBROW = /(?:source[- ]faithful|source[- ]complete|coursebook detail|complete coursebook content|source page|pdf|audit|implementation)/i;
const OBJECTIVE_HINT = /(?:overview|learning objective|lesson goal|in this chapter|chapter route)/i;
const HOOK_HINT = /(?:what you should already know|prior knowledge|diagnostic|starter|retrieve|before starting)/i;
const EXAM_HINT = /(?:cambridge checkpoint|past paper|exam|end.of.chapter question)/i;
const RECAP_HINT = /(?:recap|review|retrieval|summary|consolidation)/i;
const ACTIVITY_HINT = /(?:activity|practice|challenge|think|predict|try this)/i;

const chapterLabel:Record<RebuiltPresentationChapter,string> = {
  1:'CHAPTER 1 · INFORMATION REPRESENTATION',
  2:'CHAPTER 2 · COMMUNICATION',
  3:'CHAPTER 3 · HARDWARE',
  4:'CHAPTER 4 · PROCESSOR FUNDAMENTALS',
  7:'CHAPTER 7 · ALGORITHM DESIGN',
  13:'CHAPTER 13 · DATA REPRESENTATION',
};

const roleLabel:Record<LessonSceneRole,string> = {
  hook:'STARTER',
  objective:'LEARNING OBJECTIVES',
  concept:'NEW CONCEPT',
  process:'STEP BY STEP',
  visual:'VISUAL MODEL',
  compare:'COMPARE',
  challenge:'THINK',
  exam:'CAMBRIDGE CHECK',
  recap:'RETRIEVAL',
};

function roleForBlock(block:LessonRichBlock):LessonSceneRole {
  if(block.kind==='comparison'||block.kind==='table')return 'compare';
  if(block.kind==='steps'||block.kind==='code')return 'process';
  if(block.kind==='figure')return block.figure.kind==='grid'||block.figure.kind==='wave'||block.figure.kind==='bitfield'||block.figure.kind==='pixel-scale'?'visual':'process';
  if(block.kind==='callout'&&(block.tone==='activity'||block.tone==='extension'))return 'challenge';
  return 'concept';
}

function inferRole(beat:LessonPresentationBeat):LessonSceneRole {
  const signal=`${beat.eyebrow} ${beat.title}`;
  if(EXAM_HINT.test(signal))return 'exam';
  if(RECAP_HINT.test(signal))return 'recap';
  if(HOOK_HINT.test(signal))return 'hook';
  if(OBJECTIVE_HINT.test(signal))return 'objective';
  if(beat.activity||beat.prompt||ACTIVITY_HINT.test(signal))return 'challenge';
  if(beat.example)return 'process';
  if(beat.richBlock)return roleForBlock(beat.richBlock);
  if(beat.formula)return 'visual';
  if(beat.kind==='visual')return 'visual';
  return 'concept';
}

function cleanEyebrow(beat:LessonPresentationBeat,chapter:RebuiltPresentationChapter,role:LessonSceneRole) {
  const raw=beat.eyebrow.trim();
  if(!raw||TECHNICAL_EYEBROW.test(raw))return `${chapterLabel[chapter]} · ${roleLabel[role]}`;
  return raw
    .replace(/\s*·\s*(?:SOURCE[- ]FAITHFUL|SOURCE[- ]COMPLETE|COMPLETE COURSEBOOK CONTENT).*$/i,'')
    .replace(/COURSEBOOK\s+p\.\d+/ig,'')
    .replace(/\s*·\s*$/,'')
    .trim() || `${chapterLabel[chapter]} · ${roleLabel[role]}`;
}

function uniqStrings(items:readonly string[]) {
  const seen=new Set<string>();
  return items.filter(item=>{
    const key=NORMALISE(item);
    if(!key||seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

function uniqTerms(items:NonNullable<LessonPresentationBeat['keyTerms']>) {
  const seen=new Set<string>();
  return items.filter(item=>{
    const key=NORMALISE(item.term);
    if(!key||seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

function contentStrings(beat:LessonPresentationBeat) {
  const result:string[]=[];
  if(beat.lead)result.push(beat.lead);
  result.push(...(beat.bullets??[]));
  result.push(...(beat.keyTerms??[]).flatMap(item=>[item.term,item.definition]));
  if(beat.formula)result.push(beat.formula);
  if(beat.example)result.push(beat.example.title,...beat.example.lines,...(beat.example.answer?[beat.example.answer]:[]));
  if(beat.activity)result.push(beat.activity.title,beat.activity.prompt,...(beat.activity.reveal?[beat.activity.reveal]:[]));
  if(beat.prompt)result.push(beat.prompt);
  const block=beat.richBlock;
  if(block){
    if(block.kind==='paragraph')result.push(block.text);
    if(block.kind==='bullets'||block.kind==='steps')result.push(...block.items);
    if(block.kind==='code')result.push(...block.lines);
    if(block.kind==='table')result.push(...block.table.headers,...block.table.rows.flat());
    if(block.kind==='comparison')result.push(block.leftTitle,block.rightTitle,...block.rows.flat());
    if(block.kind==='callout')result.push(block.title,block.text);
    if(block.kind==='source-note')result.push(block.title,block.sourceText,block.examSafeText);
    if(block.kind==='figure'){
      result.push(block.figure.title);
      if(block.figure.kind==='sequence')result.push(...block.figure.items.flatMap(item=>[item.label,item.note??'']));
      if(block.figure.kind==='bitfield')result.push(...block.figure.fields.flatMap(item=>[item.label,item.bits,item.detail??'']));
      if(block.figure.kind==='pixel-scale')result.push(...block.figure.stages.flatMap(item=>[item.label,item.note??'']));
      if(block.figure.kind==='grid')result.push(...block.figure.rows);
      if(block.figure.kind==='wave')result.push(...block.figure.series.map(item=>item.label));
    }
  }
  return uniqStrings(result);
}

function filterAlreadyCovered(beats:LessonPresentationBeat[]) {
  const seen=new Set<string>();
  return beats.flatMap(beat=>{
    const strings=contentStrings(beat);
    const newStrings=strings.filter(value=>{
      const key=NORMALISE(value);
      if(!key||seen.has(key))return false;
      return true;
    });
    if(!newStrings.length&&beat.kind==='emphasis')return [];
    strings.forEach(value=>seen.add(NORMALISE(value)));
    return [beat];
  });
}

function foundationScene(
  beats:LessonPresentationBeat[],
  chapter:RebuiltPresentationChapter,
  id:string,
):LessonPresentationBeat | null {
  if(!beats.length)return null;
  const lead=beats.map(item=>item.lead).find(Boolean);
  const bullets=uniqStrings(beats.flatMap(item=>item.bullets??[])).slice(0,4);
  const keyTerms=uniqTerms(beats.flatMap(item=>item.keyTerms??[])).slice(0,2);
  const first=beats[0]!;
  const role=inferRole(first);
  return {
    id,
    slideId:first.slideId,
    kind:role==='objective'||role==='hook'||role==='concept'||role==='recap'?'concept':'key-idea',
    sceneRole:role,
    eyebrow:cleanEyebrow(first,chapter,role),
    title:first.title,
    sourcePages:uniqNumbers(beats.flatMap(item=>item.sourcePages)),
    showSource:false,
    lead,
    bullets:bullets.length?bullets:undefined,
    keyTerms:keyTerms.length?keyTerms:undefined,
    visual:undefined,
  };
}

function uniqNumbers(items:readonly number[]) {
  return [...new Set(items)].sort((a,b)=>a-b);
}

function rebuiltScene(
  beat:LessonPresentationBeat,
  chapter:RebuiltPresentationChapter,
  id:string,
):LessonPresentationBeat {
  const role=inferRole(beat);
  return {
    ...beat,
    id,
    sceneRole:role,
    eyebrow:cleanEyebrow(beat,chapter,role),
    showSource:false,
    teacherNote:undefined,
  };
}

function groupBySlide(beats:LessonPresentationBeat[]) {
  const order:string[]=[];
  const groups=new Map<string,LessonPresentationBeat[]>();
  for(const beat of beats){
    if(!groups.has(beat.slideId)){groups.set(beat.slideId,[]);order.push(beat.slideId);}
    groups.get(beat.slideId)!.push(beat);
  }
  return order.map(slideId=>({slideId,beats:groups.get(slideId)!}));
}

function scenePriority(beat:LessonPresentationBeat) {
  if(beat.activity||beat.prompt)return 7;
  if(beat.example)return 6;
  if(beat.richBlock){
    if(beat.richBlock.kind==='figure')return 3;
    if(beat.richBlock.kind==='table'||beat.richBlock.kind==='comparison')return 4;
    if(beat.richBlock.kind==='steps'||beat.richBlock.kind==='code')return 5;
    return 2;
  }
  if(beat.formula)return 3;
  if(beat.kind==='source'||beat.kind==='emphasis')return 8;
  return 1;
}

function rebuildSlideGroup(
  group:{slideId:string;beats:LessonPresentationBeat[]},
  chapter:RebuiltPresentationChapter,
  serial:{value:number},
) {
  const result:LessonPresentationBeat[]=[];
  const beats=filterAlreadyCovered(group.beats);
  const foundation=beats.filter(beat=>
    !beat.richBlock&&!beat.example&&!beat.activity&&!beat.prompt&&!beat.formula&&beat.kind!=='source'&&beat.kind!=='emphasis',
  );
  if(foundation.length){
    const scene=foundationScene(foundation,chapter,`c14r-${chapter}-${++serial.value}`);
    if(scene)result.push(scene);
  }

  const structured=beats
    .filter(beat=>!foundation.includes(beat))
    .sort((left,right)=>scenePriority(left)-scenePriority(right));

  for(const beat of structured){
    // Exact source-detail beats are retained, but presented as learner-facing
    // concept/process scenes instead of audit/source cards.
    const scene=rebuiltScene(beat,chapter,`c14r-${chapter}-${++serial.value}`);
    if((beat.kind==='source'||beat.kind==='emphasis')&&scene.richBlock?.kind==='bullets'){
      scene.sceneRole='concept';
      scene.kind='key-idea';
      scene.eyebrow=`${chapterLabel[chapter]} · COURSEBOOK DETAIL`;
      scene.lead=undefined;
    }
    result.push(scene);
  }
  return result;
}

function ensureTopicArc(scenes:LessonPresentationBeat[],chapter:RebuiltPresentationChapter,topicCode:string) {
  if(!scenes.length)return scenes;
  const result=[...scenes];
  const hasHook=result.some(scene=>scene.sceneRole==='hook');
  const hasObjective=result.some(scene=>scene.sceneRole==='objective');
  const hasRecap=result.some(scene=>scene.sceneRole==='recap'||scene.sceneRole==='exam');

  // Use existing source material for the opening scene whenever possible.
  if(!hasHook&&result.length>2){
    const first=result[0]!;
    result.unshift({
      id:`c14r-${chapter}-${topicCode.replace(/[^0-9a-z]+/gi,'-')}-hook`,
      slideId:first.slideId,
      kind:'concept',
      sceneRole:'hook',
      eyebrow:`${chapterLabel[chapter]} · STARTER`,
      title:first.title,
      sourcePages:first.sourcePages,
      showSource:false,
      lead:first.lead ?? 'Recall what you already know about this idea, then identify the question this section needs to answer.',
    });
  }

  if(!hasObjective){
    const concepts=result.filter(scene=>['concept','process','visual','compare'].includes(scene.sceneRole??'')).slice(0,4);
    if(concepts.length){
      result.splice(1,0,{
        id:`c14r-${chapter}-${topicCode.replace(/[^0-9a-z]+/gi,'-')}-objectives`,
        slideId:concepts[0]!.slideId,
        kind:'concept',
        sceneRole:'objective',
        eyebrow:`${chapterLabel[chapter]} · LEARNING OBJECTIVES`,
        title:'By the end of this lesson you should be able to…',
        sourcePages:uniqNumbers(concepts.flatMap(scene=>scene.sourcePages)),
        showSource:false,
        bullets:concepts.map(scene=>`Explain or apply: ${scene.title}`).slice(0,4),
      });
    }
  }

  if(!hasRecap){
    const anchors=result
      .filter(scene=>['concept','process','visual','compare'].includes(scene.sceneRole??''))
      .map(scene=>scene.title)
      .filter((title,index,all)=>all.findIndex(item=>NORMALISE(item)===NORMALISE(title))===index)
      .slice(-3);
    if(anchors.length){
      const last=result[result.length-1]!;
      result.push({
        id:`c14r-${chapter}-${topicCode.replace(/[^0-9a-z]+/gi,'-')}-recap`,
        slideId:last.slideId,
        kind:'concept',
        sceneRole:'recap',
        eyebrow:`${chapterLabel[chapter]} · RETRIEVAL`,
        title:'Rebuild the lesson from memory',
        sourcePages:uniqNumbers(result.flatMap(scene=>scene.sourcePages)),
        showSource:false,
        bullets:anchors.map(title=>`Explain: ${title}`),
      });
    }
  }
  return result;
}

/**
 * Rebuild a non-Chapter-14 deck using the Chapter 14 presentation grammar.
 *
 * Input beats are source-grounded material only. This function deliberately
 * ignores the former chapter-specific presentation curation/visual routing and
 * reconstructs a coherent scene sequence: source-based opening, concepts,
 * processes/visuals/comparisons, productive struggle, exam transfer and
 * retrieval. Chapter 14 itself never calls this function.
 */
export function rebuildChapter14StylePresentation(
  sourceBeats:LessonPresentationBeat[],
  topicCode:string,
  chapter:RebuiltPresentationChapter,
) {
  const serial={value:0};
  const scenes=groupBySlide(sourceBeats).flatMap(group=>rebuildSlideGroup(group,chapter,serial));
  return ensureTopicArc(scenes,chapter,topicCode);
}

export const CHAPTER14_REBUILT_PRESENTATION_ID=/^c14r-(?:1|2|3|4|7|13)-/;

export function isChapter14RebuiltPresentation(beat:LessonPresentationBeat) {
  return CHAPTER14_REBUILT_PRESENTATION_ID.test(beat.id);
}
