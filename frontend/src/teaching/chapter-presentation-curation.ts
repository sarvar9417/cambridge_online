import type { LessonPresentationBeat, LessonSceneRole } from './lesson-experience-model';

const normalise=(value:string)=>value.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
const isSourceDetail=(beat:LessonPresentationBeat)=>beat.id.includes('-source-');
const isEmphasis=(beat:LessonPresentationBeat)=>beat.kind==='emphasis'||beat.id.includes('-emphasis-');

function isFoundationBeat(beat:LessonPresentationBeat){
  return beat.id.startsWith(`${beat.slideId}-`)
    && !isSourceDetail(beat)
    && !isEmphasis(beat)
    && !beat.richBlock
    && !beat.example
    && !beat.activity
    && !beat.prompt
    && (beat.kind==='concept'||beat.kind==='key-idea'||beat.kind==='definition'||beat.kind==='visual');
}

function canMergeFoundation(left:LessonPresentationBeat,right:LessonPresentationBeat){
  if(left.slideId!==right.slideId||!isFoundationBeat(left)||!isFoundationBeat(right))return false;
  if(normalise(left.title)!==normalise(right.title))return false;
  const bullets=[...(left.bullets??[]),...(right.bullets??[])];
  const keyTerms=[...(left.keyTerms??[]),...(right.keyTerms??[])];
  const lead=[left.lead,right.lead].filter(Boolean).join(' ');
  const formulas=[left.formula,right.formula].filter((item):item is string=>Boolean(item));
  if(bullets.length>4||keyTerms.length>2||lead.length>620)return false;
  if(formulas.length>1&&new Set(formulas.map(normalise)).size>1)return false;
  return true;
}

/**
 * Chapter 14 rarely projects a lonely sentence and then makes the class click
 * again for the closely-related bullets/term. Do the same for the other source
 * chapters: combine the compact foundation fragments that belong to one source
 * slide, while keeping worked examples, diagrams, tables and activities as
 * deliberate standalone teaching scenes.
 */
function mergeFoundationScenes(beats:LessonPresentationBeat[]){
  const result:LessonPresentationBeat[]=[];
  for(const beat of beats){
    const previous=result.at(-1);
    if(!previous||!canMergeFoundation(previous,beat)){
      result.push(beat);
      continue;
    }
    const bullets=[...(previous.bullets??[]),...(beat.bullets??[])];
    const keyTerms=[...(previous.keyTerms??[]),...(beat.keyTerms??[])];
    const lead=[previous.lead,beat.lead].filter(Boolean).join(' ');
    const sourcePages=[...new Set([...previous.sourcePages,...beat.sourcePages])];
    result[result.length-1]={
      ...previous,
      kind:previous.kind==='visual'||beat.kind==='visual'?'visual':previous.kind==='definition'&&beat.kind==='definition'?'definition':'key-idea',
      sourcePages,
      lead:lead||undefined,
      bullets:bullets.length?bullets:undefined,
      keyTerms:keyTerms.length?keyTerms:undefined,
      formula:previous.formula??beat.formula,
      visual:previous.visual??beat.visual,
    };
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
  if(isEmphasis(beat))return {
    ...beat,
    sceneRole:inferSceneRole(beat,topicCode,index),
    showSource:false,
    eyebrow:`${topicCode==='overview'?'CHAPTER':topicCode} · KEY WORDING`,
    title:'Key wording to remember',
  };
  if(isSourceDetail(beat))return {
    ...beat,
    sceneRole:inferSceneRole(beat,topicCode,index),
    showSource:false,
    eyebrow:sourceEyebrow(beat,topicCode),
    title:cleanSourceTitle(beat.title)||'Important detail',
  };
  return {...beat,sceneRole:inferSceneRole(beat,topicCode,index),showSource:false};
}

function addNormalised(target:Set<string>,value:string|undefined){
  if(!value)return;
  const key=normalise(value);
  if(key)target.add(key);
}

function addRichBlockStrings(target:Set<string>,beat:LessonPresentationBeat){
  const block=beat.richBlock;
  if(!block)return;
  if(block.kind==='paragraph')addNormalised(target,block.text);
  else if(block.kind==='bullets'||block.kind==='steps')block.items.forEach(item=>addNormalised(target,item));
  else if(block.kind==='code')block.lines.forEach(item=>addNormalised(target,item));
  else if(block.kind==='callout'){
    addNormalised(target,block.title);
    addNormalised(target,block.text);
  }else if(block.kind==='comparison'){
    addNormalised(target,block.leftTitle);
    addNormalised(target,block.rightTitle);
    block.rows.flat().forEach(item=>addNormalised(target,item));
  }else if(block.kind==='table'){
    addNormalised(target,block.table.caption);
    block.table.headers.forEach(item=>addNormalised(target,item));
    block.table.rows.flat().forEach(item=>addNormalised(target,item));
  }else if(block.kind==='source-note'){
    addNormalised(target,block.title);
    addNormalised(target,block.sourceText);
    addNormalised(target,block.examSafeText);
  }else if(block.kind==='figure'){
    addNormalised(target,block.figure.title);
    addNormalised(target,block.figure.caption);
    if(block.figure.kind==='sequence')block.figure.items.forEach(item=>{addNormalised(target,item.label);addNormalised(target,item.note);});
    else if(block.figure.kind==='bitfield')block.figure.fields.forEach(item=>{addNormalised(target,item.label);addNormalised(target,item.bits);addNormalised(target,item.detail);});
    else if(block.figure.kind==='pixel-scale')block.figure.stages.forEach(item=>{addNormalised(target,item.label);addNormalised(target,item.note);});
    else if(block.figure.kind==='grid')block.figure.legend?.forEach(item=>addNormalised(target,item.label));
    else block.figure.series.forEach(item=>addNormalised(target,item.label));
  }
}

/**
 * De-duplicate only exact projected statements. The previous substring test
 * could remove a longer source explanation merely because a short phrase from
 * it already appeared on a concept slide. That made the non-Chapter-14 decks
 * visibly thinner than Chapter 14 even though the source evidence existed.
 */
function exactContentCoverage(beats:LessonPresentationBeat[]){
  const covered=new Set<string>();
  for(const beat of beats){
    addNormalised(covered,beat.lead);
    beat.bullets?.forEach(item=>addNormalised(covered,item));
    beat.keyTerms?.forEach(item=>{addNormalised(covered,item.term);addNormalised(covered,item.definition);});
    addNormalised(covered,beat.formula);
    addRichBlockStrings(covered,beat);
    if(beat.example){
      addNormalised(covered,beat.example.title);
      beat.example.lines.forEach(item=>addNormalised(covered,item));
      addNormalised(covered,beat.example.answer);
    }
    addNormalised(covered,beat.prompt);
    if(beat.activity){
      addNormalised(covered,beat.activity.title);
      addNormalised(covered,beat.activity.prompt);
      addNormalised(covered,beat.activity.reveal);
    }
  }
  return covered;
}

function filterSourceBeat(beat:LessonPresentationBeat,covered:Set<string>){
  if(beat.richBlock?.kind!=='bullets')return beat;
  const items=beat.richBlock.items.filter(item=>{
    const key=normalise(item);
    if(!key||covered.has(key))return false;
    covered.add(key);
    return true;
  });
  if(!items.length)return null;
  return {...beat,richBlock:{...beat.richBlock,items}} satisfies LessonPresentationBeat;
}

function filterEmphasisBeat(beat:LessonPresentationBeat,covered:Set<string>){
  if(!beat.keyTerms?.length)return beat;
  const keyTerms=beat.keyTerms.filter(item=>{
    const term=normalise(item.term);
    const definition=normalise(item.definition);
    if(term&&definition&&covered.has(term)&&covered.has(definition))return false;
    if(term)covered.add(term);
    if(definition)covered.add(definition);
    return true;
  });
  if(!keyTerms.length)return null;
  return {...beat,keyTerms} satisfies LessonPresentationBeat;
}

/**
 * Applies the classroom presentation contract used by Chapter 14 to the other
 * source-backed chapters without changing academic content. Closely-related
 * foundation fragments are combined into richer teaching screens; exact source
 * details stay beside the concept/diagram they support; only exact duplicate
 * statements are removed; and technical source-audit chrome stays hidden.
 */
export function curateChapterPresentation(rawBeats:LessonPresentationBeat[],topicCode:string){
  const merged=mergeFoundationScenes(rawBeats);
  const polished=merged.map((beat,index)=>polishBeat(beat,topicCode,index));
  const primary=polished.filter(beat=>!isSourceDetail(beat)&&!isEmphasis(beat));
  const source=polished.filter(isSourceDetail);
  const emphasis=polished.filter(isEmphasis);

  const covered=exactContentCoverage(primary);
  const sourceBySlide=new Map<string,LessonPresentationBeat[]>();
  const unplaced:LessonPresentationBeat[]=[];
  const primaryIds=new Set(primary.map(beat=>beat.slideId));
  for(const candidate of source){
    const filtered=filterSourceBeat(candidate,covered);
    if(!filtered)continue;
    if(!primaryIds.has(filtered.slideId)){unplaced.push(filtered);continue;}
    const group=sourceBySlide.get(filtered.slideId)??[];
    group.push(filtered);
    sourceBySlide.set(filtered.slideId,group);
  }

  const lastPrimaryIndex=new Map<string,number>();
  primary.forEach((beat,index)=>lastPrimaryIndex.set(beat.slideId,index));
  const result:LessonPresentationBeat[]=[];
  primary.forEach((beat,index)=>{
    result.push(beat);
    if(lastPrimaryIndex.get(beat.slideId)===index)result.push(...(sourceBySlide.get(beat.slideId)??[]));
  });
  result.push(...unplaced);

  const visibleCoverage=exactContentCoverage(result);
  for(const candidate of emphasis){
    const filtered=filterEmphasisBeat(candidate,visibleCoverage);
    if(filtered)result.push(filtered);
  }
  return result;
}
