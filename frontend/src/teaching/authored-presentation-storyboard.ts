import type { LessonPresentationBeat, LessonSceneRole } from './lesson-experience-model';
import type { HodderLessonSlide, LessonRichBlock } from './lesson-content-hodder-types';

export type AuthoredSceneSpec = {
  id:string;
  slideId:string;
  role:LessonSceneRole;
  eyebrow:string;
  title?:string;
  lead?:boolean;
  bullets?:true | [start:number,end:number];
  keyTerms?:true | [start:number,end:number];
  formula?:boolean;
  block?:{index:number;range?:[start:number,end:number]};
  example?:boolean;
  activity?:boolean;
  visual?:boolean;
  staticLead?:string;
  staticBullets?:string[];
  staticBlock?:LessonRichBlock;
  sourcePages?:number[];
};

const beatKindForRole = (role:LessonSceneRole):LessonPresentationBeat['kind'] => {
  if(role==='challenge'||role==='exam')return 'activity';
  if(role==='visual'||role==='process')return 'visual';
  if(role==='compare')return 'key-idea';
  return 'concept';
};

const range = <T>(items:readonly T[]|undefined, selector:true|[number,number]|undefined):T[]|undefined => {
  if(!selector||!items?.length)return undefined;
  const selected=selector===true?[...items]:items.slice(selector[0],selector[1]);
  return selected.length?selected:undefined;
};

function sliceBlock(block:LessonRichBlock|undefined, selector:AuthoredSceneSpec['block']):LessonRichBlock|undefined {
  if(!block||!selector?.range)return block;
  const [start,end]=selector.range;
  if(block.kind==='table')return {...block,table:{...block.table,rows:block.table.rows.slice(start,end)}};
  if(block.kind==='comparison')return {...block,rows:block.rows.slice(start,end)};
  if(block.kind==='bullets')return {...block,items:block.items.slice(start,end)};
  if(block.kind==='steps')return {...block,items:block.items.slice(start,end)};
  if(block.kind==='code')return {...block,lines:block.lines.slice(start,end)};
  if(block.kind==='figure'&&block.figure.kind==='sequence')return {...block,figure:{...block.figure,items:block.figure.items.slice(start,end)}};
  if(block.kind==='figure'&&block.figure.kind==='bitfield')return {...block,figure:{...block.figure,fields:block.figure.fields.slice(start,end)}};
  if(block.kind==='figure'&&block.figure.kind==='pixel-scale')return {...block,figure:{...block.figure,stages:block.figure.stages.slice(start,end)}};
  return block;
}

export function buildAuthoredStoryboard(
  sourceSlides:readonly HodderLessonSlide[],
  specs:readonly AuthoredSceneSpec[],
):LessonPresentationBeat[] {
  const byId=new Map(sourceSlides.map(slide=>[slide.id,slide]));
  return specs.flatMap(spec=>{
    const slide=byId.get(spec.slideId);
    if(!slide)return [];
    const selectedBlock=spec.staticBlock ?? (spec.block?sliceBlock(slide.richBlocks?.[spec.block.index],spec.block):undefined);
    const beat:LessonPresentationBeat={
      id:spec.id,
      slideId:slide.id,
      kind:beatKindForRole(spec.role),
      sceneRole:spec.role,
      eyebrow:spec.eyebrow,
      title:spec.title ?? slide.title,
      sourcePages:spec.sourcePages ?? slide.sourcePages ?? [],
      showSource:false,
      lead:spec.staticLead ?? (spec.lead?slide.lead:undefined),
      bullets:spec.staticBullets ?? range(slide.bullets,spec.bullets),
      keyTerms:range(slide.keyTerms,spec.keyTerms),
      formula:spec.formula?slide.formula:undefined,
      richBlock:selectedBlock,
      example:spec.example?slide.example:undefined,
      activity:spec.activity?slide.activity:undefined,
      visual:spec.visual?slide.visual:undefined,
    };
    return [beat];
  });
}

export function authoredStaticScene(
  id:string,
  slideId:string,
  role:LessonSceneRole,
  eyebrow:string,
  title:string,
  sourcePages:number[],
  content:Partial<LessonPresentationBeat>,
):LessonPresentationBeat {
  return {
    id,slideId,kind:beatKindForRole(role),sceneRole:role,eyebrow,title,sourcePages,showSource:false,...content,
  };
}
