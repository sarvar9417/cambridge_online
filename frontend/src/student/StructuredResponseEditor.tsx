import { useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { StructuredQuestionContent } from '../lib/structured-question-content';
import {
  drawingKey,
  emptyStructuredResponse,
  matchingKey,
  normalizeStructuredResponse,
  stackCellKey,
  tableCellKey,
  type StructuredResponsePayload,
  type StructuredResponsePoint,
} from '../lib/structured-question-response';

type Props={
  content:StructuredQuestionContent;
  value:StructuredResponsePayload|null|undefined;
  onChange:(value:StructuredResponsePayload)=>void;
  disabled?:boolean;
  assetUrls?:Record<string,string>;
  previewOnly?:boolean;
};

function updateValue(
  current:StructuredResponsePayload,
  key:string,
  value:string,
):StructuredResponsePayload {
  return {...current,values:{...current.values,[key]:value}};
}

function DrawingEditor({
  blockIndex,backgroundUrl,value,onChange,disabled,previewOnly,
}:{
  blockIndex:number;backgroundUrl?:string;value:StructuredResponsePayload;
  onChange:(value:StructuredResponsePayload)=>void;disabled?:boolean;previewOnly?:boolean;
}){
  const key=drawingKey(blockIndex);
  const drawing=value.drawings[key]??{strokes:[]};
  const svgRef=useRef<SVGSVGElement|null>(null);
  const [active,setActive]=useState<StructuredResponsePoint[]|null>(null);
  const locked=disabled||previewOnly;

  const point=(event:ReactPointerEvent<SVGSVGElement>)=>{
    const rect=event.currentTarget.getBoundingClientRect();
    return {
      x:Math.max(0,Math.min(1,(event.clientX-rect.left)/Math.max(1,rect.width))),
      y:Math.max(0,Math.min(1,(event.clientY-rect.top)/Math.max(1,rect.height))),
    };
  };
  const commit=(strokes:StructuredResponsePoint[][])=>{
    onChange({...value,drawings:{...value.drawings,[key]:{strokes}}});
  };
  const start=(event:ReactPointerEvent<SVGSVGElement>)=>{
    if(locked)return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setActive([point(event)]);
  };
  const move=(event:ReactPointerEvent<SVGSVGElement>)=>{
    if(locked||!active)return;
    const next=point(event);
    const last=active[active.length-1];
    if(last&&Math.hypot(last.x-next.x,last.y-next.y)<0.003)return;
    setActive([...active,next]);
  };
  const finish=()=>{
    if(locked||!active)return;
    if(active.length>1)commit([...drawing.strokes,active]);
    setActive(null);
  };
  const all=active?[...drawing.strokes,active]:drawing.strokes;
  return <section className="structured-response-drawing">
    <header><strong>Diagram / drawing response</strong>{!previewOnly?<span>Mouse, stylus yoki touch bilan chizing</span>:<span>Student drawing workspace</span>}</header>
    <div className="structured-response-canvas" style={backgroundUrl?{backgroundImage:`url("${backgroundUrl.replaceAll('"','%22')}")`}:undefined}>
      <svg ref={svgRef} viewBox="0 0 1000 600" preserveAspectRatio="none"
        aria-label="Drawing answer area"
        onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}>
        {all.map((stroke,index)=><polyline key={index}
          points={stroke.map((p)=>`${p.x*1000},${p.y*600}`).join(' ')}
          fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>)}
      </svg>
    </div>
    {!locked?<div className="structured-response-tools">
      <button type="button" disabled={!drawing.strokes.length} onClick={()=>commit(drawing.strokes.slice(0,-1))}>Undo</button>
      <button type="button" disabled={!drawing.strokes.length} onClick={()=>commit([])}>Clear</button>
    </div>:null}
  </section>;
}

export function StructuredResponseEditor({
  content,value,onChange,disabled=false,assetUrls={},previewOnly=false,
}:Props){
  const response=useMemo(()=>normalizeStructuredResponse(value),[value]);
  const controls=content.blocks.flatMap((block,index)=>{
    if(block.type==='table'&&block.editableCells.length)return [{block,index}];
    if(block.type==='matching')return [{block,index}];
    if(block.type==='stack')return [{block,index}];
    if(block.type==='answer_area'&&block.kind==='drawing')return [{block,index}];
    return [];
  });
  if(!controls.length)return null;

  const setValue=(key:string,next:string)=>onChange(updateValue(response,key,next));
  const setMatch=(key:string,next:string[])=>onChange({...response,matches:{...response.matches,[key]:next}});

  return <section className="structured-response-editor" aria-label="Structured answer workspace">
    <header>
      <div><strong>Javob shakli</strong><span>Javobni Cambridge savolidagi tuzilma bo‘yicha kiriting.</span></div>
      <b>{controls.length} structured block</b>
    </header>
    {controls.map(({block,index})=>{
      if(block.type==='table'){
        const editable=new Set(block.editableCells.map(([row,column])=>`${row}:${column}`));
        return <div className="structured-response-table-wrap" key={`table-${index}`}>
          <table className={`structured-response-table is-${block.kind.replaceAll('_','-')}`}>
            {block.headers.length?<thead><tr>{block.headers.map((header,column)=><th key={column}>{header}</th>)}</tr></thead>:null}
            <tbody>{block.rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,columnIndex)=>{
              const key=tableCellKey(index,rowIndex,columnIndex);
              const canEdit=editable.has(`${rowIndex}:${columnIndex}`);
              return <td key={columnIndex} data-editable={canEdit?'true':undefined}>
                {!canEdit?cell:
                  block.kind==='tick_grid'||block.kind==='selection_grid'
                    ?<label className="structured-response-check"><input type="checkbox" checked={response.values[key]==='✓'} disabled={disabled||previewOnly} onChange={(event)=>setValue(key,event.target.checked?'✓':'')}/><span>✓</span></label>
                    :<input aria-label={`Answer row ${rowIndex+1}, column ${columnIndex+1}`} value={response.values[key]??''} disabled={disabled||previewOnly} onChange={(event)=>setValue(key,event.target.value)}/>}
              </td>;
            })}</tr>)}</tbody>
          </table>
        </div>;
      }
      if(block.type==='matching'){
        return <div className="structured-response-matching" key={`matching-${index}`}>
          <header><strong>Match / connect</strong><span>{block.mode==='multiple'?'Bir yoki bir nechta mos javobni tanlang.':'Har bir band uchun mos javobni tanlang.'}</span></header>
          {block.left.map((left)=>{
            const key=matchingKey(index,left.id);
            const selected=response.matches[key]??[];
            return <div className="structured-response-match-row" key={left.id}>
              <strong>{left.text}</strong>
              {block.mode==='multiple'
                ?<div>{block.right.map((right)=><label key={right.id}><input type="checkbox" checked={selected.includes(right.id)} disabled={disabled||previewOnly} onChange={(event)=>setMatch(key,event.target.checked?[...new Set([...selected,right.id])]:selected.filter((id)=>id!==right.id))}/><span>{right.text}</span></label>)}</div>
                :<select value={selected[0]??''} disabled={disabled||previewOnly} onChange={(event)=>setMatch(key,event.target.value?[event.target.value]:[])}>
                  <option value="">— tanlang —</option>
                  {block.right.map((right)=><option value={right.id} key={right.id}>{right.text}</option>)}
                </select>}
            </div>;
          })}
        </div>;
      }
      if(block.type==='stack'){
        const labels=block.labels?.length?block.labels:Array.from({length:block.snapshots},(_,i)=>`Step ${i+1}`);
        return <div className="structured-response-stack-wrap" key={`stack-${index}`}>
          <header><strong>Stack trace</strong><span>Har bir bosqichdagi stack holatini kataklarga kiriting.</span></header>
          <div className="structured-response-stack">
            {labels.map((label,snapshot)=><section key={snapshot}><strong>{label}</strong><div>
              {Array.from({length:block.depth},(_,cell)=>{
                const key=stackCellKey(index,snapshot,cell);
                return <input key={cell} aria-label={`${label}, stack cell ${cell+1}`} value={response.values[key]??''} disabled={disabled||previewOnly} onChange={(event)=>setValue(key,event.target.value)}/>;
              })}
            </div></section>)}
          </div>
        </div>;
      }
      if(block.type==='answer_area'){
        let backgroundUrl:string|undefined;
        for(let cursor=index-1;cursor>=0;cursor-=1){
          const previous=content.blocks[cursor];
          if(previous?.type==='asset'&&assetUrls[previous.assetId]){backgroundUrl=assetUrls[previous.assetId];break;}
        }
        return <DrawingEditor key={`drawing-${index}`} blockIndex={index} backgroundUrl={backgroundUrl} value={response} onChange={onChange} disabled={disabled} previewOnly={previewOnly}/>;
      }
      return null;
    })}
  </section>;
}

export function StructuredResponsePreview({content,assetUrls={}}:{content:StructuredQuestionContent;assetUrls?:Record<string,string>}){
  return <StructuredResponseEditor content={content} value={emptyStructuredResponse()} onChange={()=>{}} assetUrls={assetUrls} previewOnly/>;
}
