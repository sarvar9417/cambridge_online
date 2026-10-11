import type { StructuredQuestionContent } from './structured-question-content';

export type StructuredResponsePoint={x:number;y:number};
export type StructuredResponseDrawing={strokes:StructuredResponsePoint[][]};
export type StructuredResponsePayload={
  version:1;
  values:Record<string,string>;
  matches:Record<string,string[]>;
  drawings:Record<string,StructuredResponseDrawing>;
};

export function emptyStructuredResponse():StructuredResponsePayload {
  return {version:1,values:{},matches:{},drawings:{}};
}

export function normalizeStructuredResponse(value:unknown):StructuredResponsePayload {
  if(!value||typeof value!=='object'||Array.isArray(value))return emptyStructuredResponse();
  const row=value as Partial<StructuredResponsePayload>;
  return {
    version:1,
    values:row.values&&typeof row.values==='object'&&!Array.isArray(row.values)?{...row.values}:{},
    matches:row.matches&&typeof row.matches==='object'&&!Array.isArray(row.matches)
      ?Object.fromEntries(Object.entries(row.matches).map(([key,items])=>[key,Array.isArray(items)?items.filter((item):item is string=>typeof item==='string'):[]]))
      :{},
    drawings:row.drawings&&typeof row.drawings==='object'&&!Array.isArray(row.drawings)
      ?{...row.drawings}:{},
  };
}

export function tableCellKey(blockIndex:number,row:number,column:number){
  return `table:${blockIndex}:${row}:${column}`;
}
export function stackCellKey(blockIndex:number,snapshot:number,cell:number){
  return `stack:${blockIndex}:${snapshot}:${cell}`;
}
export function matchingKey(blockIndex:number,leftId:string){
  return `matching:${blockIndex}:${leftId}`;
}
export function drawingKey(blockIndex:number){
  return `drawing:${blockIndex}`;
}

export function structuredResponseControlCount(content:StructuredQuestionContent|null|undefined) {
  if(!content)return 0;
  return content.blocks.reduce((count,block)=>{
    if(block.type==='table')return count+block.editableCells.length;
    if(block.type==='matching')return count+block.left.length;
    if(block.type==='stack')return count+block.snapshots*block.depth;
    if(block.type==='answer_area'&&block.kind==='drawing')return count+1;
    return count;
  },0);
}

export function hasStructuredResponseControls(content:StructuredQuestionContent|null|undefined) {
  return structuredResponseControlCount(content)>0;
}

export function structuredResponseHasContent(payload:StructuredResponsePayload|null|undefined) {
  return Boolean(payload&&(
    Object.values(payload.values).some((value)=>value.trim())
    ||Object.values(payload.matches).some((value)=>value.length)
    ||Object.values(payload.drawings).some((drawing)=>drawing.strokes.some((stroke)=>stroke.length))
  ));
}

export function structuredResponseSummary(content:StructuredQuestionContent,payload:StructuredResponsePayload) {
  const lines:string[]=[];
  content.blocks.forEach((block,blockIndex)=>{
    if(block.type==='table'){
      for(const [row,column] of block.editableCells){
        const value=payload.values[tableCellKey(blockIndex,row,column)]?.trim();
        if(!value)continue;
        const header=block.headers[column]?.trim();
        const rowLabel=block.rows[row]?.find((cell,index)=>index!==column&&cell?.trim())?.trim();
        lines.push(`Table ${row+1}${header?` · ${header}`:''}${rowLabel?` · ${rowLabel}`:''}: ${value}`);
      }
    }else if(block.type==='stack'){
      for(let snapshot=0;snapshot<block.snapshots;snapshot+=1){
        const values=Array.from({length:block.depth},(_,cell)=>payload.values[stackCellKey(blockIndex,snapshot,cell)]?.trim()??'');
        if(values.some(Boolean))lines.push(`${block.labels?.[snapshot]??`Stack ${snapshot+1}`}: [${values.join(' | ')}]`);
      }
    }else if(block.type==='matching'){
      for(const left of block.left){
        const selected=payload.matches[matchingKey(blockIndex,left.id)]??[];
        if(!selected.length)continue;
        const labels=selected.map((id)=>block.right.find((item)=>item.id===id)?.text??id);
        lines.push(`${left.text} → ${labels.join(', ')}`);
      }
    }else if(block.type==='answer_area'&&block.kind==='drawing'){
      const drawing=payload.drawings[drawingKey(blockIndex)];
      if(drawing?.strokes.some((stroke)=>stroke.length))lines.push(`Drawing response: ${drawing.strokes.length} stroke(s)`);
    }
  });
  return lines.join('\n');
}
