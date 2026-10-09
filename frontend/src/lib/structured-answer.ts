import type { StructuredQuestionBlock, StructuredQuestionContent } from './structured-question-content';

export const STRUCTURED_ANSWER_PREFIX='CAMPATH_RESPONSE_V1:';

export type DiagramLabel={id:string;x:number;y:number;text:string};
export type DiagramLine={id:string;x1:number;y1:number;x2:number;y2:number};
export type DiagramStroke={id:string;points:Array<[number,number]>};
export type StackStage={id:string;label:string;items:string[]};

export type StructuredAnswerEnvelope={
  version:1;
  fields:Record<string,string>;
  diagram:{labels:DiagramLabel[];lines:DiagramLine[];strokes:DiagramStroke[]};
  stack:{stages:StackStage[]};
  legacyText:string;
};

export type StructuredResponseMode=
  | 'text'
  | 'inline'
  | 'diagram'
  | 'stack'
  | 'table_fallback'
  | 'blocked';

export type StructuredResponsePlan={
  mode:StructuredResponseMode;
  inlineKinds:Array<'table'|'matching'|'scaffold'>;
  sourceAssetId:string|null;
  reason:string;
};

export type AnswerScaffoldSegment=
  | {kind:'text';text:string}
  | {kind:'answer';label:string;suffix:string};

const ANSWER_SCAFFOLD=/^(.{1,80}?)\s+(?:_{3,}|\.{5,}|…{3,})(?:\s*(.*))?$/;

export function splitAnswerScaffoldText(value:string):AnswerScaffoldSegment[]{
  const sections=value
    .split(/\r?\n\s*\r?\n/)
    .map((section)=>section.trim())
    .filter(Boolean);
  return sections.map((section)=>{
    const oneLine=section.replace(/\s*\r?\n\s*/g,' ').trim();
    const match=oneLine.match(ANSWER_SCAFFOLD);
    if(!match)return {kind:'text',text:oneLine};
    return {kind:'answer',label:match[1]!.trim(),suffix:(match[2]??'').trim()};
  });
}

export function emptyStructuredAnswer(legacyText=''):StructuredAnswerEnvelope{
  return {
    version:1,
    fields:{},
    diagram:{labels:[],lines:[],strokes:[]},
    stack:{stages:[]},
    legacyText,
  };
}

export function parseStoredAnswer(value:string|undefined|null):StructuredAnswerEnvelope{
  const text=value??'';
  if(!text.startsWith(STRUCTURED_ANSWER_PREFIX))return emptyStructuredAnswer(text);
  try{
    const parsed=JSON.parse(text.slice(STRUCTURED_ANSWER_PREFIX.length)) as Partial<StructuredAnswerEnvelope>;
    if(parsed.version!==1)return emptyStructuredAnswer(text);
    return {
      version:1,
      fields:parsed.fields&&typeof parsed.fields==='object'&&!Array.isArray(parsed.fields)
        ?Object.fromEntries(Object.entries(parsed.fields).filter(([,item])=>typeof item==='string')) as Record<string,string>
        :{},
      diagram:{
        labels:Array.isArray(parsed.diagram?.labels)?parsed.diagram!.labels!.filter(validLabel):[],
        lines:Array.isArray(parsed.diagram?.lines)?parsed.diagram!.lines!.filter(validLine):[],
        strokes:Array.isArray(parsed.diagram?.strokes)?parsed.diagram!.strokes!.filter(validStroke):[],
      },
      stack:{
        stages:Array.isArray(parsed.stack?.stages)?parsed.stack!.stages!.filter(validStackStage):[],
      },
      legacyText:typeof parsed.legacyText==='string'?parsed.legacyText:'',
    };
  }catch{
    return emptyStructuredAnswer(text);
  }
}

function finite(value:unknown):value is number{
  return typeof value==='number'&&Number.isFinite(value);
}
function validLabel(value:unknown):value is DiagramLabel{
  if(!value||typeof value!=='object')return false;
  const item=value as DiagramLabel;
  return typeof item.id==='string'&&finite(item.x)&&finite(item.y)&&typeof item.text==='string';
}
function validLine(value:unknown):value is DiagramLine{
  if(!value||typeof value!=='object')return false;
  const item=value as DiagramLine;
  return typeof item.id==='string'&&[item.x1,item.y1,item.x2,item.y2].every(finite);
}
function validStroke(value:unknown):value is DiagramStroke{
  if(!value||typeof value!=='object')return false;
  const item=value as DiagramStroke;
  return typeof item.id==='string'&&Array.isArray(item.points)&&item.points.every((point)=>Array.isArray(point)&&point.length===2&&point.every(finite));
}
function validStackStage(value:unknown):value is StackStage{
  if(!value||typeof value!=='object')return false;
  const item=value as StackStage;
  return typeof item.id==='string'&&typeof item.label==='string'&&Array.isArray(item.items)&&item.items.every((entry)=>typeof entry==='string');
}

export function serializeStructuredAnswer(answer:StructuredAnswerEnvelope){
  return STRUCTURED_ANSWER_PREFIX+JSON.stringify(answer);
}

export function structuredAnswerHasContent(value:string|StructuredAnswerEnvelope|undefined|null){
  const answer=typeof value==='string'||value==null?parseStoredAnswer(value):value;
  return Boolean(
    answer.legacyText.trim()
    ||Object.values(answer.fields).some((item)=>item.trim())
    ||answer.diagram.labels.some((item)=>item.text.trim())
    ||answer.diagram.lines.length
    ||answer.diagram.strokes.length
    ||answer.stack.stages.some((stage)=>stage.label.trim()||stage.items.some((item)=>item.trim()))
  );
}

export function humanizeStoredAnswer(value:string|undefined|null){
  const raw=value??'';
  if(!raw.startsWith(STRUCTURED_ANSWER_PREFIX))return raw;
  const answer=parseStoredAnswer(raw);
  const lines:string[]=[];
  if(answer.legacyText.trim())lines.push(answer.legacyText.trim());

  for(const [key,item] of Object.entries(answer.fields).sort(([left],[right])=>left.localeCompare(right,undefined,{numeric:true}))){
    if(!item.trim())continue;
    const table=key.match(/^table\.(\d+)\.(\d+)\.(\d+)$/);
    const match=key.match(/^match\.(\d+)\.(.+)$/);
    const blank=key.match(/^blank\.(\d+)\.(\d+)$/);
    if(table)lines.push(`Jadval: qator ${Number(table[2])+1}, ustun ${Number(table[3])+1} = ${item.trim()}`);
    else if(match)lines.push(`Moslashtirish: ${match[2]} → ${item.trim()}`);
    else if(blank)lines.push(`Bo‘sh joy ${Number(blank[2])+1}: ${item.trim()}`);
    else lines.push(`${key}: ${item.trim()}`);
  }

  answer.stack.stages.forEach((stage,index)=>{
    const items=stage.items.map((item)=>item.trim()).filter(Boolean);
    if(!stage.label.trim()&&!items.length)return;
    lines.push(`Stack ${index+1}${stage.label.trim()?` (${stage.label.trim()})`:''}: ${items.join(' | ')||'—'}`);
  });
  answer.diagram.labels.forEach((label,index)=>{
    if(label.text.trim())lines.push(`Diagram label ${index+1}: ${label.text.trim()}`);
  });
  if(answer.diagram.lines.length)lines.push(`Diagram bog‘lanishlari: ${answer.diagram.lines.length}`);
  if(answer.diagram.strokes.length)lines.push(`Diagram chiziqlari: ${answer.diagram.strokes.length}`);
  return lines.join('\n');
}

function hasStackCue(stem:string){
  const value=stem.toLowerCase().replace(/\s+/g,' ');
  return [
    /show (?:the )?changing contents of (?:the )?stack/,
    /show .*contents of .*stack.*evaluat/,
    /complete .*diagram.*stack/,
    /show (?:the )?state of .*stack/,
    /rpn expression.*stack/,
    /stack.*rpn expression/,
  ].some((pattern)=>pattern.test(value));
}

export function requiresLiteralTableSurface(stem:string){
  const value=stem.toLowerCase().replace(/\s+/g,' ');
  return [
    /complete (?:the |this |following )?table/,
    /fill (?:in |out )?(?:the |this |following )?table/,
    /write .*answers?.* in (?:the )?table/,
    /write .* in (?:the )?table provided/,
    /table provided/,
    /table below/,
    /following table/,
    /parity block check.*circle the bit/,
  ].some((pattern)=>pattern.test(value));
}

export function requiresExistingDiagramSurface(stem:string){
  const value=stem.toLowerCase().replace(/\s+/g,' ');
  return [
    /complete (?:the |this |following )?(?:diagram|figure|chart)/,
    /label (?:the |this |following )?(?:diagram|figure|chart)/,
    /add .* to (?:the )?(?:diagram|figure|chart)/,
    /circle .* bit/,
    /mark .* on (?:the )?(?:diagram|figure|chart)/,
  ].some((pattern)=>pattern.test(value));
}

function inlineKinds(content:StructuredQuestionContent|null){
  const kinds=new Set<'table'|'matching'|'scaffold'>();
  if(!content)return [];
  content.blocks.forEach((block)=>{
    if(block.type==='table'&&block.editableCells.length)kinds.add('table');
    if(block.type==='matching')kinds.add('matching');
    if(block.type==='text'&&splitAnswerScaffoldText(block.text).some((segment)=>segment.kind==='answer'))kinds.add('scaffold');
  });
  return [...kinds];
}

function firstAssetId(content:StructuredQuestionContent|null){
  if(!content)return null;
  const asset=content.blocks.find((block):block is Extract<StructuredQuestionBlock,{type:'asset'}>=>block.type==='asset');
  return asset?.assetId??null;
}

export function structuredResponsePlan(
  content:StructuredQuestionContent|null,
  answerKind:string|undefined|null,
  stem:string,
  options:{hasSourceVisual?:boolean}={},
):StructuredResponsePlan{
  const kinds=inlineKinds(content);
  const sourceAssetId=firstAssetId(content);
  if(hasStackCue(stem)){
    return {mode:'stack',inlineKinds:kinds,sourceAssetId,reason:'stack_sequence'};
  }
  const drawing=content?.blocks.some((block)=>block.type==='answer_area'&&block.kind==='drawing')??false;
  const hasSourceVisual=Boolean(sourceAssetId||options.hasSourceVisual);
  const needsExistingDiagram=requiresExistingDiagramSurface(stem);
  if(needsExistingDiagram&&answerKind!=='diagram'&&!drawing){
    if(!hasSourceVisual){
      return {mode:'blocked',inlineKinds:kinds,sourceAssetId,reason:'required_source_diagram_missing'};
    }
    return {mode:'diagram',inlineKinds:kinds,sourceAssetId,reason:'source_diagram_interaction'};
  }
  if(answerKind==='diagram'||drawing){
    if(needsExistingDiagram&&!hasSourceVisual&&!drawing){
      return {mode:'blocked',inlineKinds:kinds,sourceAssetId,reason:'required_source_diagram_missing'};
    }
    return {mode:'diagram',inlineKinds:kinds,sourceAssetId,reason:'diagram_response'};
  }
  if(kinds.length){
    return {mode:'inline',inlineKinds:kinds,sourceAssetId,reason:kinds.join('+')};
  }
  if(answerKind==='table'&&requiresLiteralTableSurface(stem)){
    if(!hasSourceVisual){
      return {mode:'blocked',inlineKinds:[],sourceAssetId,reason:'required_source_table_missing'};
    }
    return {mode:'table_fallback',inlineKinds:[],sourceAssetId,reason:'source_table_overlay'};
  }
  return {mode:'text',inlineKinds:[],sourceAssetId,reason:'free_text'};
}

export function setStructuredField(
  answer:StructuredAnswerEnvelope,
  key:string,
  value:string,
):StructuredAnswerEnvelope{
  return {...answer,fields:{...answer.fields,[key]:value}};
}

export function inlineResponseKeys(content:StructuredQuestionContent|null){
  if(!content)return [];
  const keys:string[]=[];
  content.blocks.forEach((block,blockIndex)=>{
    if(block.type==='table'){
      block.editableCells.forEach(([row,column])=>keys.push(`table.${blockIndex}.${row}.${column}`));
    }else if(block.type==='matching'){
      block.left.forEach((item)=>keys.push(`match.${blockIndex}.${item.id}`));
    }else if(block.type==='text'){
      let answerIndex=0;
      splitAnswerScaffoldText(block.text).forEach((segment)=>{
        if(segment.kind==='answer')keys.push(`blank.${blockIndex}.${answerIndex++}`);
      });
    }
  });
  return keys;
}

export function structuredResponseProgress(content:StructuredQuestionContent|null,answer:StructuredAnswerEnvelope){
  const keys=inlineResponseKeys(content);
  if(!keys.length)return null;
  const complete=keys.filter((key)=>answer.fields[key]?.trim()).length;
  return {complete,total:keys.length};
}
