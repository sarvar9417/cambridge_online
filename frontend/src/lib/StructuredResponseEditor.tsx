import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { StructuredQuestionContent } from './structured-question-content';
import type { StructuredResponseV1 } from './structured-response';
import { emptyStructuredResponse } from './structured-response';
import type { PortableSourceAsset } from './portable-source-assets';
import { portableAssetUrl } from './portable-source-assets';
import './structured-response-editor.css';

const rid=()=>Math.random().toString(36).slice(2,10);

function update<T extends Record<string,unknown>>(value:T,key:string,next:unknown):T {
  return {...value,[key]:next};
}

export function StructuredResponseEditor({
  content,
  sourceAssets=[],
  response=emptyStructuredResponse(),
  onChange,
  disabled=false,
}:{
  content:StructuredQuestionContent;
  sourceAssets?:PortableSourceAsset[];
  response?:StructuredResponseV1;
  onChange:(response:StructuredResponseV1)=>void;
  disabled?:boolean;
}){
  const byId=useMemo(()=>new Map(sourceAssets.map((asset)=>[asset.id,asset] as const)),[sourceAssets]);
  let lastVisualUrl:string|null=null;
  let hasInteractive=false;
  const rendered=content.blocks.map((block,index)=>{
    const blockKey=String(index);
    if(block.type==='asset'){
      const url=portableAssetUrl(byId.get(block.assetId));
      if(url)lastVisualUrl=url;
      return null;
    }
    if(block.type==='table'&&block.editableCells.length){
      hasInteractive=true;
      const editable=new Set(block.editableCells.map(([r,c])=>`${r}:${c}`));
      const values=response.tables[blockKey]??{};
      return <section className="sre-block" key={`table-${index}`}>
        <header><strong>Jadval javoblari</strong><span>Bo‘sh kataklarga bevosita yozing.</span></header>
        <div className="sre-table-wrap"><table className="sre-table">
          {block.headers.length?<thead><tr>{block.headers.map((header,column)=><th key={column}>{header}</th>)}</tr></thead>:null}
          <tbody>{block.rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,columnIndex)=>{
            const key=`${rowIndex}:${columnIndex}`;
            return <td key={key}>{editable.has(key)
              ?<input
                disabled={disabled}
                aria-label={`Jadval javobi, ${rowIndex+1}-qator, ${columnIndex+1}-ustun`}
                value={values[key]??''}
                onChange={(event)=>onChange({
                  ...response,
                  tables:update(response.tables,blockKey,{...values,[key]:event.target.value}),
                })}
              />
              :cell??''}</td>;
          })}</tr>)}</tbody>
        </table></div>
      </section>;
    }
    if(block.type==='matching'){
      hasInteractive=true;
      const values=response.matching[blockKey]??{};
      return <section className="sre-block" key={`matching-${index}`}>
        <header><strong>Moslashtirish</strong><span>Har bir elementga mos javobni tanlang.</span></header>
        <div className="sre-matching">{block.left.map((item)=><label key={item.id}>
          <span>{item.text}</span>
          <select
            disabled={disabled}
            value={values[item.id]??''}
            onChange={(event)=>onChange({
              ...response,
              matching:update(response.matching,blockKey,{...values,[item.id]:event.target.value}),
            })}
          >
            <option value="">Tanlang…</option>
            {block.right.map((candidate)=><option value={candidate.id} key={candidate.id}>{candidate.text}</option>)}
          </select>
        </label>)}</div>
      </section>;
    }
    if(block.type==='answer_area'&&block.kind==='table_cells'){
      hasInteractive=true;
      const values=response.tables[blockKey]??{};
      const populatedRows=Object.keys(values).map((key)=>Number(key.split(':')[0])).filter(Number.isFinite);
      const initialRows=Math.max(block.lines??0,populatedRows.length?Math.max(...populatedRows)+1:0,4);
      return <StackTraceResponse
        key={`table-cells-${index}`}
        blockKey={blockKey}
        initialRows={initialRows}
        response={response}
        onChange={onChange}
        disabled={disabled}
      />;
    }
    if(block.type==='answer_area'&&block.kind==='drawing'){
      hasInteractive=true;
      return <DrawingResponse
        key={`drawing-${index}`}
        blockKey={blockKey}
        backgroundUrl={lastVisualUrl}
        response={response}
        onChange={onChange}
        disabled={disabled}
      />;
    }
    return null;
  });
  if(!hasInteractive)return null;
  return <div className="sre" aria-label="Structured answer workspace">
    <div className="sre-head"><strong>Javob maydoni</strong><span>Cambridge savolidagi jadval/diagramma tuzilmasi saqlangan.</span></div>
    {rendered}
  </div>;
}

function DrawingResponse({
  blockKey,backgroundUrl,response,onChange,disabled,
}:{
  blockKey:string;
  backgroundUrl:string|null;
  response:StructuredResponseV1;
  onChange:(response:StructuredResponseV1)=>void;
  disabled:boolean;
}){
  const [mode,setMode]=useState<'label'|'line'>('label');
  const [lineStart,setLineStart]=useState<{x:number;y:number}|null>(null);
  const annotations=response.annotations[blockKey]??[];
  const lines=response.lines[blockKey]??[];
  const setAnnotations=(next:typeof annotations)=>onChange({...response,annotations:{...response.annotations,[blockKey]:next}});
  const setLines=(next:typeof lines)=>onChange({...response,lines:{...response.lines,[blockKey]:next}});
  const click=(event:ReactMouseEvent<HTMLDivElement>)=>{
    if(disabled)return;
    const rect=event.currentTarget.getBoundingClientRect();
    const x=Math.min(1,Math.max(0,(event.clientX-rect.left)/rect.width));
    const y=Math.min(1,Math.max(0,(event.clientY-rect.top)/rect.height));
    if(mode==='label'){
      const item={id:rid(),x,y,text:''};
      setAnnotations([...annotations,item]);
      requestAnimationFrame(()=>document.querySelector<HTMLInputElement>(`[data-sre-note="${item.id}"]`)?.focus());
      return;
    }
    if(!lineStart){setLineStart({x,y});return}
    setLines([...lines,{id:rid(),x1:lineStart.x,y1:lineStart.y,x2:x,y2:y}]);
    setLineStart(null);
  };
  return <section className="sre-block sre-drawing">
    <header><strong>Diagramma / bog‘lash javobi</strong><span>Rasm ustiga yozuv qo‘ying yoki nuqtalarni chiziq bilan bog‘lang.</span></header>
    <div className="sre-tools">
      <button type="button" className={mode==='label'?'is-active':''} disabled={disabled} onClick={()=>{setMode('label');setLineStart(null)}}>Matn joylashtirish</button>
      <button type="button" className={mode==='line'?'is-active':''} disabled={disabled} onClick={()=>setMode('line')}>{lineStart?'Ikkinchi nuqtani bosing':'Chiziq bog‘lash'}</button>
      <button type="button" disabled={disabled||(!annotations.length&&!lines.length)} onClick={()=>{setAnnotations([]);setLines([]);setLineStart(null)}}>Tozalash</button>
    </div>
    <div className="sre-canvas" onClick={click}>
      {backgroundUrl?<img src={backgroundUrl} alt="Savol diagrammasi"/>:<div className="sre-blank-canvas">Javob diagrammasi</div>}
      <svg aria-hidden="true" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        {lines.map((line)=><line key={line.id} x1={line.x1*1000} y1={line.y1*1000} x2={line.x2*1000} y2={line.y2*1000}/>)}
        {lineStart?<circle cx={lineStart.x*1000} cy={lineStart.y*1000} r="8"/>:null}
      </svg>
      {annotations.map((item)=><input
        key={item.id}
        data-sre-note={item.id}
        disabled={disabled}
        value={item.text}
        style={{left:`${item.x*100}%`,top:`${item.y*100}%`}}
        onClick={(event)=>event.stopPropagation()}
        onChange={(event)=>setAnnotations(annotations.map((candidate)=>candidate.id===item.id?{...candidate,text:event.target.value}:candidate))}
        onDoubleClick={(event)=>{event.stopPropagation();setAnnotations(annotations.filter((candidate)=>candidate.id!==item.id))}}
        aria-label="Diagramma javob yozuvi"
      />)}
    </div>
    <small>Maslahat: matn uchun rasm ustiga bosing. Chiziq rejimida boshlanish va tugash nuqtalarini ketma-ket bosing. Yozuvni ikki marta bosib o‘chirish mumkin.</small>
  </section>;
}

function StackTraceResponse({
  blockKey,initialRows,response,onChange,disabled,
}:{
  blockKey:string;
  initialRows:number;
  response:StructuredResponseV1;
  onChange:(response:StructuredResponseV1)=>void;
  disabled:boolean;
}){
  const values=response.tables[blockKey]??{};
  const [rowCount,setRowCount]=useState(initialRows);
  const setValue=(row:number,column:number,value:string)=>onChange({
    ...response,
    tables:{...response.tables,[blockKey]:{...values,[`${row}:${column}`]:value}},
  });
  return <section className="sre-block">
    <header><strong>Stack / queue holati</strong><span>Har bir bosqichdan keyingi holatni yozing. Kerak bo‘lsa qator qo‘shing.</span></header>
    <div className="sre-table-wrap"><table className="sre-table sre-stack-table">
      <thead><tr><th>Bosqich / amal</th><th>Holat (pastdan tepaga yoki frontdan rear’ga)</th></tr></thead>
      <tbody>{Array.from({length:rowCount},(_,row)=><tr key={row}>
        <td><input disabled={disabled} value={values[`${row}:0`]??''} onChange={(event)=>setValue(row,0,event.target.value)} aria-label={`${row+1}-bosqich`}/></td>
        <td><input disabled={disabled} value={values[`${row}:1`]??''} onChange={(event)=>setValue(row,1,event.target.value)} aria-label={`${row+1}-bosqichdagi stack yoki queue holati`}/></td>
      </tr>)}</tbody>
    </table></div>
    <div className="sre-row-tools">
      <button type="button" disabled={disabled||rowCount>=30} onClick={()=>setRowCount((value)=>Math.min(30,value+1))}>+ Qator</button>
      <button type="button" disabled={disabled||rowCount<=1} onClick={()=>setRowCount((value)=>Math.max(1,value-1))}>− Qator</button>
    </div>
  </section>;
}
