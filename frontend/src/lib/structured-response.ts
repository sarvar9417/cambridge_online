import type { StructuredQuestionContent } from './structured-question-content';

export type StructuredAnnotation={id:string;x:number;y:number;text:string};
export type StructuredLine={id:string;x1:number;y1:number;x2:number;y2:number};

export type StructuredResponseV1={
  version:1;
  tables:Record<string,Record<string,string>>;
  matching:Record<string,Record<string,string>>;
  annotations:Record<string,StructuredAnnotation[]>;
  lines:Record<string,StructuredLine[]>;
};

export const emptyStructuredResponse=():StructuredResponseV1=>({
  version:1,tables:{},matching:{},annotations:{},lines:{},
});

export function normalizeStructuredResponse(value:unknown):StructuredResponseV1 {
  if(!value||typeof value!=='object'||Array.isArray(value)||(value as {version?:unknown}).version!==1)return emptyStructuredResponse();
  const row=value as Partial<StructuredResponseV1>;
  return {
    version:1,
    tables:row.tables&&typeof row.tables==='object'?row.tables:{},
    matching:row.matching&&typeof row.matching==='object'?row.matching:{},
    annotations:row.annotations&&typeof row.annotations==='object'?row.annotations:{},
    lines:row.lines&&typeof row.lines==='object'?row.lines:{},
  };
}

export function structuredResponseRequired(content:StructuredQuestionContent){
  return content.blocks.some((block)=>
    (block.type==='table'&&block.editableCells.length>0)
    || block.type==='matching'
    || (block.type==='answer_area'&&['table_cells','drawing'].includes(block.kind))
  );
}

export function structuredResponseSummary(content:StructuredQuestionContent,response:StructuredResponseV1){
  const lines:string[]=[];
  content.blocks.forEach((block,index)=>{
    const key=String(index);
    if(block.type==='table'&&block.editableCells.length){
      const cells=response.tables[key]??{};
      const values=block.editableCells
        .map(([r,c])=>({r,c,value:(cells[`${r}:${c}`]??'').trim()}))
        .filter((item)=>item.value);
      if(values.length){
        lines.push(`Table ${index+1}:`);
        for(const item of values)lines.push(`R${item.r+1}C${item.c+1}: ${item.value}`);
      }
    }
    if(block.type==='matching'){
      const pairs=response.matching[key]??{};
      const left=new Map(block.left.map((item)=>[item.id,item.text]));
      const right=new Map(block.right.map((item)=>[item.id,item.text]));
      const values=Object.entries(pairs).filter(([,target])=>target);
      if(values.length){
        lines.push(`Matching ${index+1}:`);
        for(const [source,target] of values)lines.push(`${left.get(source)??source} → ${right.get(target)??target}`);
      }
    }
    if(block.type==='answer_area'&&block.kind==='table_cells'){
      const cells=response.tables[key]??{};
      const rowIndexes=[...new Set(Object.keys(cells).map((cell)=>Number(cell.split(':')[0])).filter(Number.isFinite))].sort((a,b)=>a-b);
      const values=rowIndexes.map((row)=>({
        step:(cells[`${row}:0`]??'').trim(),
        state:(cells[`${row}:1`]??'').trim(),
      })).filter((row)=>row.step||row.state);
      if(values.length){
        lines.push(`Stack/queue trace ${index+1}:`);
        values.forEach((row,rowIndex)=>lines.push(`${rowIndex+1}. ${row.step||'—'} => ${row.state||'—'}`));
      }
    }
    if(block.type==='answer_area'&&block.kind==='drawing'){
      const notes=response.annotations[key]??[];
      const joins=response.lines[key]??[];
      if(notes.some((note)=>note.text.trim())||joins.length){
        lines.push(`Diagram response ${index+1}:`);
        for(const note of notes)if(note.text.trim())lines.push(`Label: ${note.text.trim()}`);
        if(joins.length)lines.push(`Connections drawn: ${joins.length}`);
      }
    }
  });
  return lines.join('\n');
}

export function structuredResponseHasValue(response:StructuredResponseV1){
  return Object.values(response.tables).some((cells)=>Object.values(cells).some((value)=>value.trim()))
    || Object.values(response.matching).some((pairs)=>Object.values(pairs).some(Boolean))
    || Object.values(response.annotations).some((items)=>items.some((item)=>item.text.trim()))
    || Object.values(response.lines).some((items)=>items.length>0);
}
