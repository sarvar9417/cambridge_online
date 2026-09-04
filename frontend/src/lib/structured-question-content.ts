export type SourceLocation = {
  page: number;
  bbox?: [number, number, number, number];
};

export type StructuredQuestionBlock =
  | { type:'text';style:'paragraph'|'task';text:string;source:SourceLocation }
  | { type:'math';semantics:'math'|'boolean_expression';latex:string;display:boolean;source:SourceLocation }
  | { type:'code';language:string|null;text:string;source:SourceLocation }
  | { type:'list';items:string[];source:SourceLocation }
  | {
      type:'table';
      kind:'table'|'truth_table'|'tick_grid'|'selection_grid';
      headers:string[];
      rows:Array<Array<string|null>>;
      editableCells:Array<[number,number]>;
      source:SourceLocation;
    }
  | {
      type:'matching';
      left:Array<{id:string;text:string}>;
      right:Array<{id:string;text:string}>;
      source:SourceLocation;
    }
  | {
      type:'asset';
      kind:'diagram'|'image'|'flowchart'|'logic_circuit';
      assetId:string;
      altText:string;
      source:SourceLocation;
    }
  | {
      type:'answer_area';
      kind:'lines'|'box'|'table_cells'|'drawing';
      lines:number|null;
      source:SourceLocation;
    };

export type StructuredQuestionContent = {
  version:1;
  source:{ paperId:string;sha256:string };
  blocks:StructuredQuestionBlock[];
};

const SHA256=/^[0-9a-f]{64}$/i;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BLOCK_TYPES=new Set(['text','math','code','list','table','matching','asset','answer_area']);

function object(value:unknown):value is Record<string,unknown> {
  return value!==null&&typeof value==='object'&&!Array.isArray(value);
}

function sourceLocation(value:unknown) {
  if(!object(value)||!Number.isInteger(value.page)||Number(value.page)<1)return false;
  if(value.bbox===undefined)return true;
  return Array.isArray(value.bbox)&&value.bbox.length===4&&value.bbox.every((item)=>typeof item==='number'&&Number.isFinite(item));
}

export function isStructuredQuestionContent(value:unknown):value is StructuredQuestionContent {
  if(!object(value)||value.version!==1||!object(value.source)||!Array.isArray(value.blocks)||!value.blocks.length)return false;
  if(typeof value.source.paperId!=='string'||!UUID.test(value.source.paperId))return false;
  if(typeof value.source.sha256!=='string'||!SHA256.test(value.source.sha256))return false;

  return value.blocks.every((candidate)=>{
    if(!object(candidate)||typeof candidate.type!=='string'||!BLOCK_TYPES.has(candidate.type)||!sourceLocation(candidate.source))return false;
    switch(candidate.type){
      case 'text': return (candidate.style==='paragraph'||candidate.style==='task')&&typeof candidate.text==='string'&&candidate.text.length>0;
      case 'math': return (candidate.semantics==='math'||candidate.semantics==='boolean_expression')&&typeof candidate.latex==='string'&&candidate.latex.length>0&&typeof candidate.display==='boolean';
      case 'code': return (candidate.language===null||typeof candidate.language==='string')&&typeof candidate.text==='string'&&candidate.text.length>0;
      case 'list': return Array.isArray(candidate.items)&&candidate.items.length>0&&candidate.items.every((item)=>typeof item==='string'&&item.length>0);
      case 'table': {
        if(!['table','truth_table','tick_grid','selection_grid'].includes(String(candidate.kind)))return false;
        if(!Array.isArray(candidate.headers)||!candidate.headers.every((item)=>typeof item==='string')||!Array.isArray(candidate.rows)||!candidate.rows.length)return false;
        const first=Array.isArray(candidate.rows[0])?candidate.rows[0]:[];
        const width=candidate.headers.length||first.length;
        if(!width||!candidate.rows.every((row)=>Array.isArray(row)&&row.length===width&&row.every((cell)=>cell===null||typeof cell==='string')))return false;
        return Array.isArray(candidate.editableCells)&&candidate.editableCells.every((cell)=>Array.isArray(cell)&&cell.length===2&&cell.every((index)=>Number.isInteger(index)&&Number(index)>=0));
      }
      case 'matching': return ['left','right'].every((side)=>Array.isArray(candidate[side])&&candidate[side].length>0&&candidate[side].every((item)=>object(item)&&typeof item.id==='string'&&item.id.length>0&&typeof item.text==='string'&&item.text.length>0));
      case 'asset': return ['diagram','image','flowchart','logic_circuit'].includes(String(candidate.kind))&&typeof candidate.assetId==='string'&&UUID.test(candidate.assetId)&&typeof candidate.altText==='string';
      case 'answer_area': return ['lines','box','table_cells','drawing'].includes(String(candidate.kind))&&(candidate.lines===null||(Number.isInteger(candidate.lines)&&Number(candidate.lines)>0));
      default: return false;
    }
  });
}
