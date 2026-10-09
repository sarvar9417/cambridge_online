import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { StructuredQuestionContent } from '../lib/structured-question-content';
import { portableAssetUrl, type PortableSourceAsset } from '../lib/portable-source-assets';
import { randomId } from '../lib/random-id';
import {
  emptyStructuredResponse,
  normalizeStructuredResponse,
  type StructuredResponse,
  type StructuredResponseAnnotation,
} from '../lib/structured-response';
import './structured-response-editor.css';

type Tool='text'|'line'|'draw';

function clamp(value:number){return Math.max(0,Math.min(1,value))}
function point(event:ReactPointerEvent<HTMLElement>):[number,number]{
  const rect=event.currentTarget.getBoundingClientRect();
  return [clamp((event.clientX-rect.left)/rect.width),clamp((event.clientY-rect.top)/rect.height)];
}

export function structuredResponseInteractive(
  content:StructuredQuestionContent|null|undefined,
  sourceAssets:PortableSourceAsset[],
  answerKind:string,
){
  const semantic=content?.blocks.some((block)=>
    block.type==='matching'
    || (block.type==='table'&&block.editableCells.length>0)
  )??false;
  if(semantic)return true;
  const drawing=content?.blocks.some((block)=>block.type==='answer_area'&&block.kind==='drawing')??false;
  const responseVisual=sourceAssets.some((asset)=>
    ['table','diagram','image'].includes(String(asset.kind??'').toLowerCase())&&Boolean(portableAssetUrl(asset))
  );
  return drawing||(['table','diagram'].includes(answerKind)&&responseVisual);
}

function bestResponseAsset(sourceAssets:PortableSourceAsset[],answerKind:string){
  const renderable=sourceAssets.filter((asset)=>Boolean(portableAssetUrl(asset)));
  const desired=answerKind==='table'?['table','diagram','image']:['diagram','image','table'];
  for(const kind of desired){
    const found=renderable.find((asset)=>String(asset.kind??'').toLowerCase()===kind);
    if(found)return found;
  }
  return renderable[0]??null;
}

export function StructuredResponseEditor({
  content,
  sourceAssets,
  answerKind,
  value,
  onChange,
  disabled=false,
  preview=false,
}:{
  content:StructuredQuestionContent|null|undefined;
  sourceAssets:PortableSourceAsset[];
  answerKind:string;
  value:StructuredResponse|null|undefined;
  onChange:(value:StructuredResponse)=>void;
  disabled?:boolean;
  preview?:boolean;
}){
  const response=normalizeStructuredResponse(value);
  const tableBlocks=useMemo(()=>content?.blocks
    .map((block,index)=>({block,index}))
    .filter((item):item is {block:Extract<StructuredQuestionContent['blocks'][number],{type:'table'}>;index:number}=>
      item.block.type==='table'&&item.block.editableCells.length>0
    )??[],[content]);
  const matchingBlocks=useMemo(()=>content?.blocks
    .map((block,index)=>({block,index}))
    .filter((item):item is {block:Extract<StructuredQuestionContent['blocks'][number],{type:'matching'}>;index:number}=>
      item.block.type==='matching'
    )??[],[content]);
  const asset=useMemo(()=>bestResponseAsset(sourceAssets,answerKind),[sourceAssets,answerKind]);
  const drawingArea=content?.blocks.some((block)=>block.type==='answer_area'&&block.kind==='drawing')??false;
  const annotationMode=tableBlocks.length===0&&matchingBlocks.length===0
    && (drawingArea||(['table','diagram'].includes(answerKind)&&Boolean(asset)));
  const hasEditor=tableBlocks.length>0||matchingBlocks.length>0||annotationMode;
  const [tool,setTool]=useState<Tool>('text');
  const [lineStart,setLineStart]=useState<[number,number]|null>(null);
  const [stroke,setStroke]=useState<Array<[number,number]>>([]);
  const canvasRef=useRef<HTMLDivElement>(null);

  const commit=(next:Partial<StructuredResponse>)=>onChange({
    version:1,
    tableCells:next.tableCells??response.tableCells,
    matches:next.matches??response.matches,
    annotations:next.annotations??response.annotations,
  });

  if(!hasEditor)return null;

  const setCell=(block:number,row:number,column:number,value:string)=>{
    const key=`${block}:${row}:${column}`;
    const tableCells=response.tableCells.filter((cell)=>`${cell.block}:${cell.row}:${cell.column}`!==key);
    tableCells.push({block,row,column,value});
    commit({tableCells});
  };
  const setMatch=(block:number,leftId:string,rightId:string)=>{
    const matches=response.matches.filter((match)=>!(match.block===block&&match.leftId===leftId));
    if(rightId)matches.push({block,leftId,rightId});
    commit({matches});
  };
  const replaceAnnotation=(annotation:StructuredResponseAnnotation)=>{
    commit({annotations:[...response.annotations.filter((item)=>item.id!==annotation.id),annotation]});
  };
  const undo=()=>commit({annotations:response.annotations.slice(0,-1)});
  const clear=()=>commit({annotations:[]});

  const onCanvasPointerDown=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(disabled)return;
    const p=point(event);
    if(tool==='text'){
      commit({annotations:[...response.annotations,{
        id:randomId(),type:'text',assetId:asset?.id??null,x:p[0],y:p[1],width:0.22,value:'',
      }]});
      return;
    }
    if(tool==='line'){
      if(!lineStart){setLineStart(p);return;}
      commit({annotations:[...response.annotations,{
        id:randomId(),type:'line',assetId:asset?.id??null,x1:lineStart[0],y1:lineStart[1],x2:p[0],y2:p[1],
      }]});
      setLineStart(null);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setStroke([p]);
  };
  const onCanvasPointerMove=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(disabled||tool!=='draw'||!stroke.length)return;
    const p=point(event);
    setStroke((current)=>current.length>=500?current:[...current,p]);
  };
  const onCanvasPointerUp=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(disabled||tool!=='draw'||stroke.length<2){setStroke([]);return;}
    const p=point(event);
    const points=[...stroke,p].slice(0,500);
    commit({annotations:[...response.annotations,{id:randomId(),type:'stroke',assetId:asset?.id??null,points}]});
    setStroke([]);
  };

  return <section className="structured-response-editor" data-response-preview={preview?'true':undefined}>
    <header className="structured-response-head">
      <div><strong>{preview?'Javob maydoni preview':'Javobni original shaklda kiriting'}</strong>
        <small>Jadval, diagramma va bog‘lash javoblari savolning o‘z tuzilmasida saqlanadi.</small></div>
    </header>

    {tableBlocks.map(({block,index})=>{
      const editable=new Set(block.editableCells.map(([row,column])=>`${row}:${column}`));
      return <div className="structured-response-table-wrap" key={`table-${index}`}>
        <table className="structured-response-table">
          {block.headers.length?<thead><tr>{block.headers.map((header,column)=><th key={column}>{header}</th>)}</tr></thead>:null}
          <tbody>{block.rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,columnIndex)=>{
            const isEditable=editable.has(`${rowIndex}:${columnIndex}`);
            const stored=response.tableCells.find((answer)=>answer.block===index&&answer.row===rowIndex&&answer.column===columnIndex)?.value??'';
            return <td key={columnIndex} data-editable={isEditable?'true':undefined}>{isEditable?
              <input disabled={disabled} aria-label={`Javob katagi ${rowIndex+1}, ${columnIndex+1}`} value={stored}
                onChange={(event)=>setCell(index,rowIndex,columnIndex,event.target.value)}/>:
              <span>{cell??''}</span>}</td>;
          })}</tr>)}</tbody>
        </table>
      </div>;
    })}

    {matchingBlocks.map(({block,index})=><div className="structured-response-matching" key={`matching-${index}`}>
      {block.left.map((left)=><label key={left.id}><span>{left.text}</span><select disabled={disabled}
        value={response.matches.find((match)=>match.block===index&&match.leftId===left.id)?.rightId??''}
        onChange={(event)=>setMatch(index,left.id,event.target.value)}>
        <option value="">Mos javobni tanlang</option>
        {block.right.map((right)=><option value={right.id} key={right.id}>{right.text}</option>)}
      </select></label>)}
    </div>)}

    {annotationMode?<div className="structured-response-annotation">
      <div className="structured-response-tools" role="toolbar" aria-label="Diagramma javob vositalari">
        <button type="button" className={tool==='text'?'is-active':''} disabled={disabled} onClick={()=>{setTool('text');setLineStart(null)}}>Matn</button>
        <button type="button" className={tool==='line'?'is-active':''} disabled={disabled} onClick={()=>{setTool('line');setLineStart(null)}}>Bog‘lash</button>
        <button type="button" className={tool==='draw'?'is-active':''} disabled={disabled} onClick={()=>{setTool('draw');setLineStart(null)}}>Chizish</button>
        <button type="button" disabled={disabled||!response.annotations.length} onClick={undo}>↶ Ortga</button>
        <button type="button" disabled={disabled||!response.annotations.length} onClick={clear}>Tozalash</button>
      </div>
      <p className="structured-response-hint">{tool==='text'?'Bo‘sh katak yoki label joyiga bosing va yozing.':tool==='line'?(lineStart?'Endi bog‘lanadigan ikkinchi nuqtani bosing.':'Chiziq boshlanishi va tugash nuqtasini ketma-ket bosing.'):'Sichqoncha yoki stylus bilan chizing.'}</p>
      <div ref={canvasRef} className="structured-response-canvas"
        onPointerDown={onCanvasPointerDown} onPointerMove={onCanvasPointerMove} onPointerUp={onCanvasPointerUp}>
        {asset&&portableAssetUrl(asset)?<img draggable={false} src={portableAssetUrl(asset)!} alt={asset.altText||'Cambridge source response layout'}/>:<div className="structured-response-blank-canvas">Chizma maydoni</div>}
        <svg className="structured-response-svg" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
          {response.annotations.map((annotation)=>annotation.type==='line'?
            <line key={annotation.id} x1={annotation.x1} y1={annotation.y1} x2={annotation.x2} y2={annotation.y2} vectorEffect="non-scaling-stroke"/>:
            annotation.type==='stroke'?<polyline key={annotation.id} points={annotation.points.map(([x,y])=>`${x},${y}`).join(' ')} vectorEffect="non-scaling-stroke"/>:null)}
          {lineStart?<circle cx={lineStart[0]} cy={lineStart[1]} r="0.008"/>:null}
          {stroke.length>1?<polyline points={stroke.map(([x,y])=>`${x},${y}`).join(' ')} vectorEffect="non-scaling-stroke"/>:null}
        </svg>
        {response.annotations.filter((annotation):annotation is Extract<StructuredResponseAnnotation,{type:'text'}>=>annotation.type==='text').map((annotation)=>
          <input key={annotation.id} className="structured-response-label" disabled={disabled}
            aria-label="Diagramma javobi" value={annotation.value}
            style={{left:`${annotation.x*100}%`,top:`${annotation.y*100}%`,width:`${(annotation.width??0.22)*100}%`}}
            onPointerDown={(event)=>event.stopPropagation()}
            onChange={(event)=>replaceAnnotation({...annotation,value:event.target.value})}/>)}
      </div>
    </div>:null}
  </section>;
}

export function StructuredResponsePreview(props:Omit<Parameters<typeof StructuredResponseEditor>[0],'value'|'onChange'|'preview'>){
  const [value,setValue]=useState<StructuredResponse>(emptyStructuredResponse());
  return <StructuredResponseEditor {...props} value={value} onChange={setValue} preview/>;
}
