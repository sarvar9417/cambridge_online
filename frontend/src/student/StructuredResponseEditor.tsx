import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { randomId } from '../lib/random-id';
import type { StructuredQuestionContent } from '../lib/structured-question-content';
import {
  parseStoredAnswer,
  serializeStructuredAnswer,
  setStructuredField,
  structuredResponsePlan,
  structuredResponseProgress,
  type DiagramLine,
  type DiagramStroke,
  type StackStage,
  type StructuredAnswerEnvelope,
} from '../lib/structured-answer';
import './structured-response-editor.css';

type Props={
  content:StructuredQuestionContent|null;
  answerKind:string;
  stem:string;
  marks:number;
  assetUrls?:Record<string,string>;
  value:string;
  disabled?:boolean;
  onChange:(value:string)=>void;
};

function emit(answer:StructuredAnswerEnvelope,onChange:(value:string)=>void){
  onChange(serializeStructuredAnswer(answer));
}

function sourceUrl(content:StructuredQuestionContent|null,assetUrls:Record<string,string>) {
  const asset=content?.blocks.find((block)=>block.type==='asset');
  if(asset&&asset.type==='asset'&&assetUrls[asset.assetId])return assetUrls[asset.assetId]!;
  return Object.values(assetUrls)[0]??null;
}

export function StructuredResponseEditor({
  content,answerKind,stem,marks,assetUrls={},value,disabled=false,onChange,
}:Props){
  const answer=useMemo(()=>parseStoredAnswer(value),[value]);
  const plan=useMemo(()=>structuredResponsePlan(content,answerKind,stem),[content,answerKind,stem]);
  const progress=useMemo(()=>structuredResponseProgress(content,answer),[content,answer]);
  const visual=sourceUrl(content,assetUrls);

  if(plan.mode==='text')return null;
  if(plan.mode==='inline'){
    return <div className="structured-response-hint" data-response-mode="inline">
      <strong>Javobni savolning o‘zida kiriting.</strong>
      <span>{progress?`${progress.complete}/${progress.total} ta maydon to‘ldirilgan`:'Bo‘sh katak yoki moslashtirish maydonlaridan foydalaning.'}</span>
    </div>;
  }
  if(plan.mode==='stack'){
    return <StackSequenceEditor answer={answer} disabled={disabled} onChange={(next)=>emit(next,onChange)}/>;
  }
  if(plan.mode==='diagram'){
    return <DiagramResponseEditor
      answer={answer}
      backgroundUrl={visual}
      disabled={disabled}
      onChange={(next)=>emit(next,onChange)}
      title="Diagramma javobi"
    />;
  }
  if(plan.mode==='table_fallback'&&visual){
    return <DiagramResponseEditor
      answer={answer}
      backgroundUrl={visual}
      disabled={disabled}
      onChange={(next)=>emit(next,onChange)}
      title="Jadval ustiga javob yozish"
      labelsOnly
    />;
  }
  return <FallbackTableEditor
    answer={answer}
    marks={marks}
    disabled={disabled}
    onChange={(next)=>emit(next,onChange)}
  />;
}

function FallbackTableEditor({
  answer,marks,disabled,onChange,
}:{
  answer:StructuredAnswerEnvelope;marks:number;disabled:boolean;onChange:(value:StructuredAnswerEnvelope)=>void;
}){
  const count=Math.max(2,Math.min(12,marks||2));
  return <section className="structured-response-panel" data-response-mode="table-fallback">
    <header><div><strong>Jadval javoblari</strong><span>Source jadval interaktiv kataklarga ajratilmagan. Javoblarni o‘qish tartibida kiriting.</span></div><b>{count} maydon</b></header>
    <div className="structured-response-fallback-grid">
      {Array.from({length:count},(_,index)=>{
        const key=`fallback.${index}`;
        return <label key={key}><span>{index+1}</span><input
          disabled={disabled}
          value={answer.fields[key]??''}
          onChange={(event)=>onChange(setStructuredField(answer,key,event.target.value))}
          placeholder={`Javob ${index+1}`}
        /></label>;
      })}
    </div>
  </section>;
}

function StackSequenceEditor({
  answer,disabled,onChange,
}:{
  answer:StructuredAnswerEnvelope;disabled:boolean;onChange:(value:StructuredAnswerEnvelope)=>void;
}){
  const stages=answer.stack.stages.length?answer.stack.stages:[
    {id:randomId(),label:'Boshlang‘ich / 1-bosqich',items:['']},
  ];

  const commit=(next:StackStage[])=>onChange({...answer,stack:{stages:next}});
  const update=(id:string,patch:Partial<StackStage>)=>commit(stages.map((stage)=>stage.id===id?{...stage,...patch}:stage));

  return <section className="structured-response-panel structured-stack-editor" data-response-mode="stack">
    <header><div><strong>Stack holatlari</strong><span>Har bir bosqichda elementlarni pastdan tepaga tartibida kiriting.</span></div><button type="button" disabled={disabled} onClick={()=>commit([...stages,{id:randomId(),label:`${stages.length+1}-bosqich`,items:['']}])}>+ Bosqich</button></header>
    <div className="structured-stack-stages">
      {stages.map((stage,stageIndex)=><article key={stage.id}>
        <div className="structured-stack-stage-head">
          <input aria-label={`${stageIndex+1}-bosqich nomi`} disabled={disabled} value={stage.label} onChange={(e)=>update(stage.id,{label:e.target.value})}/>
          <button type="button" disabled={disabled||stages.length===1} onClick={()=>commit(stages.filter((item)=>item.id!==stage.id))}>×</button>
        </div>
        <div className="structured-stack-cells">
          {stage.items.map((item,index)=><label key={index}>
            <small>{index===stage.items.length-1?'TOP':''}</small>
            <input
              disabled={disabled}
              value={item}
              onChange={(e)=>update(stage.id,{items:stage.items.map((value,itemIndex)=>itemIndex===index?e.target.value:value)})}
              placeholder={`Item ${index+1}`}
            />
            <button type="button" disabled={disabled||stage.items.length===1} onClick={()=>update(stage.id,{items:stage.items.filter((_,itemIndex)=>itemIndex!==index)})}>−</button>
          </label>)}
        </div>
        <button className="structured-stack-add" type="button" disabled={disabled} onClick={()=>update(stage.id,{items:[...stage.items,'']})}>+ Item</button>
      </article>)}
    </div>
  </section>;
}

function DiagramResponseEditor({
  answer,backgroundUrl,disabled,onChange,title,labelsOnly=false,
}:{
  answer:StructuredAnswerEnvelope;
  backgroundUrl:string|null;
  disabled:boolean;
  onChange:(value:StructuredAnswerEnvelope)=>void;
  title:string;
  labelsOnly?:boolean;
}){
  const host=useRef<HTMLDivElement>(null);
  const [mode,setMode]=useState<'label'|'line'|'draw'>('label');
  const [lineStart,setLineStart]=useState<{x:number;y:number}|null>(null);
  const activeStroke=useRef<DiagramStroke|null>(null);

  const point=(event:ReactPointerEvent)=>{
    const rect=host.current?.getBoundingClientRect();
    if(!rect)return{x:0,y:0};
    return {
      x:Math.max(0,Math.min(100,((event.clientX-rect.left)/rect.width)*100)),
      y:Math.max(0,Math.min(100,((event.clientY-rect.top)/rect.height)*100)),
    };
  };
  const updateDiagram=(patch:Partial<StructuredAnswerEnvelope['diagram']>)=>
    onChange({...answer,diagram:{...answer.diagram,...patch}});

  const click=(event:ReactPointerEvent)=>{
    if(disabled||mode==='draw')return;
    if((event.target as HTMLElement).closest('input,button'))return;
    const p=point(event);
    if(mode==='label'){
      updateDiagram({labels:[...answer.diagram.labels,{id:randomId(),...p,text:''}]});
      return;
    }
    if(!lineStart){setLineStart(p);return;}
    const line:DiagramLine={id:randomId(),x1:lineStart.x,y1:lineStart.y,x2:p.x,y2:p.y};
    setLineStart(null);
    updateDiagram({lines:[...answer.diagram.lines,line]});
  };
  const pointerDown=(event:ReactPointerEvent)=>{
    if(disabled||mode!=='draw'||labelsOnly)return;
    const p=point(event);
    activeStroke.current={id:randomId(),points:[[p.x,p.y]]};
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };
  const pointerMove=(event:ReactPointerEvent)=>{
    if(!activeStroke.current||mode!=='draw')return;
    const p=point(event);
    const points=activeStroke.current.points;
    if(points.length>=250)return;
    const previous=points[points.length-1];
    if(previous&&Math.hypot(previous[0]-p.x,previous[1]-p.y)<.7)return;
    activeStroke.current={...activeStroke.current,points:[...points,[p.x,p.y]]};
  };
  const pointerUp=()=>{
    const stroke=activeStroke.current;
    activeStroke.current=null;
    if(stroke&&stroke.points.length>1&&answer.diagram.strokes.length<20){
      updateDiagram({strokes:[...answer.diagram.strokes,stroke]});
    }
  };

  return <section className="structured-response-panel structured-diagram-editor" data-response-mode="diagram">
    <header><div><strong>{title}</strong><span>Rasm ustiga label yozing, nuqtalarni bog‘lang yoki chizing.</span></div><div className="structured-diagram-tools">
      <button type="button" className={mode==='label'?'is-active':''} disabled={disabled} onClick={()=>{setMode('label');setLineStart(null)}}>Label</button>
      {!labelsOnly&&<button type="button" className={mode==='line'?'is-active':''} disabled={disabled} onClick={()=>{setMode('line');setLineStart(null)}}>Bog‘lash</button>}
      {!labelsOnly&&<button type="button" className={mode==='draw'?'is-active':''} disabled={disabled} onClick={()=>{setMode('draw');setLineStart(null)}}>Chizish</button>}
      <button type="button" disabled={disabled||(!answer.diagram.labels.length&&!answer.diagram.lines.length&&!answer.diagram.strokes.length)} onClick={()=>onChange({...answer,diagram:{labels:[],lines:[],strokes:[]}})}>Tozalash</button>
    </div></header>
    {lineStart&&<p className="structured-diagram-status">Birinchi nuqta tanlandi. Ikkinchi nuqtani bosing.</p>}
    <div
      ref={host}
      className="structured-diagram-canvas"
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onClick={click}
      role="application"
      aria-label={title}
    >
      {backgroundUrl?<img src={backgroundUrl} alt="" draggable={false}/>:<div className="structured-diagram-blank">Diagramma uchun ish maydoni</div>}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {answer.diagram.lines.map((line)=><line key={line.id} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}/>)}
        {answer.diagram.strokes.map((stroke)=><polyline key={stroke.id} points={stroke.points.map(([x,y])=>`${x},${y}`).join(' ')}/>)}
      </svg>
      {answer.diagram.labels.map((label)=><label key={label.id} className="structured-diagram-label" style={{left:`${label.x}%`,top:`${label.y}%`}}>
        <input
          disabled={disabled}
          autoFocus={label.text===''}
          value={label.text}
          onClick={(event)=>event.stopPropagation()}
          onChange={(e)=>updateDiagram({labels:answer.diagram.labels.map((item)=>item.id===label.id?{...item,text:e.target.value}:item)})}
          placeholder="Label"
        />
        <button type="button" disabled={disabled} onClick={(e)=>{e.stopPropagation();updateDiagram({labels:answer.diagram.labels.filter((item)=>item.id!==label.id)})}}>×</button>
      </label>)}
    </div>
  </section>;
}
