import type { LessonPresentationBeat, LessonSceneRole } from './lesson-experience-model';

const normalise=(value:string)=>value.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();

function isLeadOnly(beat:LessonPresentationBeat){
  return beat.kind==='concept'
    && Boolean(beat.lead)
    && !beat.bullets
    && !beat.keyTerms
    && !beat.formula
    && !beat.richBlock
    && !beat.example
    && !beat.activity
    && !beat.prompt;
}

function mergeLeadOnlyScenes(beats:LessonPresentationBeat[]){
  const result:LessonPresentationBeat[]=[];
  const pending=new Map<string,string[]>();
  for(const beat of beats){
    if(isLeadOnly(beat)){
      const lines=pending.get(beat.slideId)??[];
      lines.push(beat.lead!);
      pending.set(beat.slideId,lines);
      continue;
    }
    const lead=pending.get(beat.slideId);
    if(lead?.length){
      result.push({...beat,lead:beat.lead?[...lead,beat.lead].join(' '):lead.join(' ')});
      pending.delete(beat.slideId);
    }else result.push(beat);
  }
  for(const [slideId,lines] of pending){
    const original=beats.find(beat=>beat.slideId===slideId&&isLeadOnly(beat));
    if(original)result.push({...original,lead:lines.join(' ')});
  }
  return result;
}

function blockRole(beat:LessonPresentationBeat):LessonSceneRole|null{
  const block=beat.richBlock;
  if(!block)return null;
  if(block.kind==='figure')return block.figure.kind==='sequence'?'process':'visual';
  if(block.kind==='comparison'||block.kind==='table')return 'compare';
  if(block.kind==='steps'||block.kind==='code')return 'process';
  if(block.kind==='callout'&&(block.tone==='activity'||block.tone==='extension'))return 'challenge';
  return null;
}

function inferSceneRole(beat:LessonPresentationBeat,topicCode:string,index:number):LessonSceneRole{
  if(beat.sceneRole)return beat.sceneRole;
  const text=normalise(`${beat.eyebrow} ${beat.title}`);
  if(/past paper|cambridge check|exam practice|exam style/.test(text))return 'exam';
  if(/review|recap|retrieval|summary|end of chapter/.test(text))return 'recap';
  if(/learning objective|lesson goal|objectives/.test(text))return 'objective';
  if(/prior knowledge|already know|starter/.test(text))return 'challenge';
  if(topicCode==='overview'&&index===0)return 'hook';
  const richRole=blockRole(beat);
  if(richRole)return richRole;
  if(beat.kind==='activity'||beat.kind==='check'||beat.prompt)return 'challenge';
  if(beat.kind==='example'||beat.example)return 'process';
  if(beat.kind==='visual'||beat.formula)return 'visual';
  if(beat.kind==='definition')return 'concept';
  if(beat.kind==='emphasis'||beat.kind==='source')return 'concept';
  return 'concept';
}

function cleanSourceTitle(value:string){
  return value
    .replace(/^(?:COURSEBOOK DETAIL|FIGURE \/ DIAGRAM|KEY TERM \/ IMPORTANT TERM|SUMMARY \/ REVIEW|EXAM-STYLE PRACTICE)\s*·\s*/i,'')
    .trim();
}

function sourceEyebrow(beat:LessonPresentationBeat,topicCode:string){
  const label=beat.eyebrow.split('·')[0]?.trim()||'KEY IDEA';
  return `${topicCode==='overview'?'CHAPTER':topicCode} · ${label}`;
}

function polishBeat(beat:LessonPresentationBeat,topicCode:string,index:number):LessonPresentationBeat{
  if(beat.kind==='emphasis')return {
    ...beat,
    sceneRole:inferSceneRole(beat,topicCode,index),
    showSource:false,
    eyebrow:`${topicCode==='overview'?'CHAPTER':topicCode} · KEY WORDING`,
    title:'Key wording to remember',
  };
  if(beat.kind==='source')return {
    ...beat,
    sceneRole:inferSceneRole(beat,topicCode,index),
    showSource:false,
    eyebrow:sourceEyebrow(beat,topicCode),
    title:cleanSourceTitle(beat.title)||'Important detail',
    lead:undefined,
  };
  return {...beat,sceneRole:inferSceneRole(beat,topicCode,index),showSource:false};
}

function filterSourceBeat(beat:LessonPresentationBeat,covered:string){
  if(beat.richBlock?.kind!=='bullets')return {beat,covered};
  const items=beat.richBlock.items.filter(item=>{
    const key=normalise(item);
    return key&&!covered.includes(key);
  });
  if(!items.length)return {beat:null,covered};
  const next={...beat,richBlock:{...beat.richBlock,items}} satisfies LessonPresentationBeat;
  return {beat:next,covered:`${covered} ${normalise(JSON.stringify(next))}`};
}

function filterEmphasisBeat(beat:LessonPresentationBeat,covered:string){
  if(!beat.keyTerms?.length)return {beat,covered};
  const keyTerms=beat.keyTerms.filter(item=>{
    const term=normalise(item.term);
    const definition=normalise(item.definition);
    return !(term&&definition&&covered.includes(term)&&covered.includes(definition));
  });
  if(!keyTerms.length)return {beat:null,covered};
  const next={...beat,keyTerms} satisfies LessonPresentationBeat;
  return {beat:next,covered:`${covered} ${normalise(JSON.stringify(next))}`};
}

/**
 * Applies the classroom presentation contract used by Chapter 14 to the other
 * source-backed chapters without changing their academic content. Core teaching
 * stays in source order; source-fidelity details are de-duplicated and placed
 * beside the slide they belong to instead of being dumped into a technical
 * appendix. Every screen receives a scene role and hides source-audit chrome.
 */
export function curateChapterPresentation(rawBeats:LessonPresentationBeat[],topicCode:string){
  const merged=mergeLeadOnlyScenes(rawBeats);
  const polished=merged.map((beat,index)=>polishBeat(beat,topicCode,index));
  const primary=polished.filter(beat=>beat.kind!=='source'&&beat.kind!=='emphasis');
  const source=polished.filter(beat=>beat.kind==='source');
  const emphasis=polished.filter(beat=>beat.kind==='emphasis');

  let covered=normalise(JSON.stringify(primary));
  const sourceBySlide=new Map<string,LessonPresentationBeat[]>();
  const unplaced:LessonPresentationBeat[]=[];
  const primaryIds=new Set(primary.map(beat=>beat.slideId));
  for(const candidate of source){
    const filtered=filterSourceBeat(candidate,covered);
    covered=filtered.covered;
    if(!filtered.beat)continue;
    if(!primaryIds.has(filtered.beat.slideId)){unplaced.push(filtered.beat);continue;}
    const group=sourceBySlide.get(filtered.beat.slideId)??[];
    group.push(filtered.beat);
    sourceBySlide.set(filtered.beat.slideId,group);
  }

  const lastPrimaryIndex=new Map<string,number>();
  primary.forEach((beat,index)=>lastPrimaryIndex.set(beat.slideId,index));
  const result:LessonPresentationBeat[]=[];
  primary.forEach((beat,index)=>{
    result.push(beat);
    if(lastPrimaryIndex.get(beat.slideId)===index)result.push(...(sourceBySlide.get(beat.slideId)??[]));
  });
  result.push(...unplaced);

  covered=normalise(JSON.stringify(result));
  for(const candidate of emphasis){
    const filtered=filterEmphasisBeat(candidate,covered);
    covered=filtered.covered;
    if(filtered.beat)result.push(filtered.beat);
  }
  return result;
}
