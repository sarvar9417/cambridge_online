import type { LessonPresentationBeat } from './lesson-experience-model';
import type { LessonRichBlock } from './lesson-content-hodder-types';

export type PresentationDensity = 'light' | 'standard' | 'dense';

export type PresentationBeatMetrics = {
  wordCount:number;
  revealItems:number;
  structuralItems:number;
  longestItemWords:number;
  hasVisual:boolean;
};

const wordCount=(value:string|undefined)=>value?.trim()?value.trim().split(/\s+/).length:0;

function richBlockStrings(block:LessonRichBlock|undefined):string[] {
  if(!block)return [];
  if(block.kind==='paragraph')return [block.text];
  if(block.kind==='bullets'||block.kind==='steps')return [...block.items];
  if(block.kind==='code')return [block.title??'',...block.lines];
  if(block.kind==='callout')return [block.title,block.text];
  if(block.kind==='comparison')return [block.leftTitle,block.rightTitle,...block.rows.flat()];
  if(block.kind==='source-note')return [block.title,block.sourceLabel,block.sourceText,block.examSafeLabel,block.examSafeText];
  if(block.kind==='table')return [block.table.caption??'',...block.table.headers,...block.table.rows.flat()];
  if(block.kind==='figure'){
    const figure=block.figure;
    if(figure.kind==='sequence')return [figure.title,...figure.items.flatMap(item=>[item.label,item.note??'']),figure.caption??''];
    if(figure.kind==='bitfield')return [figure.title,...figure.fields.flatMap(field=>[field.label,field.detail??'',field.bits]),figure.caption??''];
    if(figure.kind==='pixel-scale')return [figure.title,...figure.stages.flatMap(stage=>[stage.label,stage.note??'']),figure.caption??''];
    if(figure.kind==='grid')return [figure.title,...(figure.legend??[]).flatMap(item=>[item.symbol,item.label]),figure.caption??''];
    return [figure.title,...figure.series.map(series=>series.label),figure.caption??''];
  }
  return [];
}

function richBlockItemCount(block:LessonRichBlock|undefined){
  if(!block)return 0;
  if(block.kind==='bullets'||block.kind==='steps')return block.items.length;
  if(block.kind==='code')return block.lines.length;
  if(block.kind==='comparison')return block.rows.length;
  if(block.kind==='table')return block.table.rows.length;
  if(block.kind==='figure'){
    if(block.figure.kind==='sequence')return block.figure.items.length;
    if(block.figure.kind==='bitfield')return block.figure.fields.length;
    if(block.figure.kind==='pixel-scale')return block.figure.stages.length;
    if(block.figure.kind==='grid')return block.figure.rows.length;
    return block.figure.series.length;
  }
  return 1;
}

export function presentationBeatMetrics(beat:LessonPresentationBeat):PresentationBeatMetrics {
  const strings=[
    beat.title,
    beat.lead??'',
    ...(beat.bullets??[]),
    ...(beat.keyTerms??[]).flatMap(item=>[item.term,item.definition]),
    beat.formula??'',
    ...(beat.example?[beat.example.title,...beat.example.lines,beat.example.answer??'']:[]),
    ...(beat.activity?[beat.activity.title,beat.activity.prompt,beat.activity.reveal??'']:[]),
    beat.prompt??'',
    ...richBlockStrings(beat.richBlock),
  ].filter(Boolean);
  const itemWords=strings.map(wordCount);
  const revealItems=Math.max(
    beat.bullets?.length??0,
    beat.keyTerms?.length??0,
    beat.example?beat.example.lines.length+(beat.example.answer?1:0):0,
    beat.activity?.reveal?1:0,
    richBlockItemCount(beat.richBlock),
  );
  const structuralItems=(beat.bullets?.length??0)+(beat.keyTerms?.length??0)+(beat.example?.lines.length??0)+richBlockItemCount(beat.richBlock);
  return {
    wordCount:itemWords.reduce((sum,value)=>sum+value,0),
    revealItems,
    structuralItems,
    longestItemWords:itemWords.length?Math.max(...itemWords):0,
    hasVisual:Boolean(beat.visual||beat.formula||beat.richBlock?.kind==='figure'),
  };
}

export function presentationDensityForBeat(beat:LessonPresentationBeat):PresentationDensity {
  const metrics=presentationBeatMetrics(beat);
  const tableRows=beat.richBlock?.kind==='table'?beat.richBlock.table.rows.length:0;
  const codeLines=beat.richBlock?.kind==='code'?beat.richBlock.lines.length:0;
  if(metrics.wordCount>=150||metrics.revealItems>=7||metrics.structuralItems>=9||tableRows>=5||codeLines>=8)return 'dense';
  if(metrics.wordCount<=70&&metrics.revealItems<=3&&metrics.structuralItems<=4)return 'light';
  return 'standard';
}

export function presentationDensityClass(beat:LessonPresentationBeat){
  return `lx-present-screen--density-${presentationDensityForBeat(beat)}`;
}

export function presentationClassroomWarnings(beat:LessonPresentationBeat) {
  const metrics=presentationBeatMetrics(beat);
  const warnings:string[]=[];
  if(wordCount(beat.title)>16)warnings.push('long-title');
  if(wordCount(beat.lead)>55)warnings.push('long-lead');
  if(metrics.longestItemWords>34)warnings.push('long-item');
  if(metrics.wordCount>220)warnings.push('very-dense');
  if(!beat.title.trim())warnings.push('missing-title');
  if(!beat.eyebrow.trim())warnings.push('missing-eyebrow');
  return warnings;
}
