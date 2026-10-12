import { useMemo, useRef, useState, type PointerEvent } from 'react';
import type { StructuredQuestionContent } from '../lib/structured-question-content';
import {
  emptyStructuredResponse,
  parseStructuredResponse,
  serializeStructuredResponse,
  structuredResponseMode,
  type StructuredResponseV1,
  type StructuredStroke,
} from '../lib/structured-response';
import { StructuredQuestionView } from './StructuredQuestionView';
import './structured-response-workspace.css';

type Props={
  content:StructuredQuestionContent;
  assetUrls?:Record<string,string>;
  answerKind?:string;
  stem?:string;
  value:string;
  disabled?:boolean;
  onChange:(value:string)=>void;
};

function withValue(
  current:StructuredResponseV1,
  key:string,
  value:string,
):StructuredResponseV1 {
  if(key.startsWith('table:'))return {...current,tables:{...current.tables,[key]:value}};
  if(key.startsWith('match:'))return {...current,matches:{...current.matches,[key]:value}};
  return current;
}

function firstAssetUrl(content:StructuredQuestionContent,assetUrls:Record<string,string>) {
  const asset=content.blocks.find((block)=>block.type==='asset');
  return asset?.type==='asset' ? assetUrls[asset.assetId] : undefined;
}

function DrawingPad({
  content,assetUrls,response,onChange,disabled,
}:{
  content:StructuredQuestionContent;
  assetUrls:Record<string,string>;
  response:StructuredResponseV1;
  onChange:(next:StructuredResponseV1)=>void;
  disabled:boolean;
}){
  const host=useRef<HTMLDivElement>(null);
  const active=useRef<StructuredStroke|null>(null);
  const [,rerender]=useState(0);
  const key='drawing:0';
  const strokes=response.drawings[key]??[];
  const background=firstAssetUrl(content,assetUrls);

  const point=(event:PointerEvent<SVGSVGElement>)=>{
    const rect=event.currentTarget.getBoundingClientRect();
    return {
      x:Math.max(0,Math.min(1,(event.clientX-rect.left)/Math.max(1,rect.width))),
      y:Math.max(0,Math.min(1,(event.clientY-rect.top)/Math.max(1,rect.height))),
    };
  };
  const down=(event:PointerEvent<SVGSVGElement>)=>{
    if(disabled)return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const stroke={points:[point(event)]};
    active.current=stroke;
    response.drawings[key]=[...strokes,stroke];
    rerender((value)=>value+1);
  };
  const move=(event:PointerEvent<SVGSVGElement>)=>{
    if(disabled||!active.current)return;
    active.current.points.push(point(event));
    rerender((value)=>value+1);
  };
  const up=()=>{
    if(!active.current)return;
    active.current=null;
    onChange({...response,drawings:{...response.drawings,[key]:[...(response.drawings[key]??[])]}});
  };

  return <section className="structured-drawing-editor">
    <header><strong>Diagramma / chizma javobi</strong><span>Chizish uchun sichqoncha yoki touch ishlating.</span></header>
    <div ref={host} className="structured-drawing-stage">
      {background?<img src={background} alt="" aria-hidden="true"/>:null}
      <svg viewBox="0 0 1000 650" preserveAspectRatio="none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {strokes.map((stroke,index)=><polyline key={index} points={stroke.points.map((p)=>`${p.x*1000},${p.y*650}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke"/>)}
      </svg>
    </div>
    <button type="button" className="secondary" disabled={disabled||!strokes.length} onClick={()=>onChange({...response,drawings:{...response.drawings,[key]:[]}})}>Chizmani tozalash</button>
  </section>;
}

function StackEditor({
  response,onChange,disabled,
}:{
  response:StructuredResponseV1;
  onChange:(next:StructuredResponseV1)=>void;
  disabled:boolean;
}){
  const steps=response.stack?.steps.length?response.stack.steps:Array.from({length:4},()=>Array(5).fill(''));
  const update=(stepIndex:number,rowIndex:number,value:string)=>{
    const next=steps.map((step)=>[...step]);
    next[stepIndex]![rowIndex]=value;
    onChange({...response,stack:{steps:next}});
  };
  const addStep=()=>onChange({...response,stack:{steps:[...steps,Array(steps[0]?.length??5).fill('')]}});
  const addLevel=()=>onChange({...response,stack:{steps:steps.map((step)=>[...step,''])}});
  const removeStep=()=>steps.length>1&&onChange({...response,stack:{steps:steps.slice(0,-1)}});

  return <section className="structured-stack-editor">
    <header><strong>Stack holatlari</strong><span>Har bir ustun — navbatdagi qadam. Pastki katak stackning pastki qismi sifatida o‘qiladi.</span></header>
    <div className="structured-stack-grid">
      {steps.map((step,stepIndex)=><div className="structured-stack-step" key={stepIndex}>
        <b>{stepIndex+1}-qadam</b>
        {[...step].reverse().map((value,reverseIndex)=>{
          const rowIndex=step.length-1-reverseIndex;
          return <input key={rowIndex} value={value} disabled={disabled} aria-label={`${stepIndex+1}-qadam stack ${rowIndex+1}-katak`} onChange={(event)=>update(stepIndex,rowIndex,event.target.value)}/>;
        })}
      </div>)}
    </div>
    <div className="structured-stack-actions">
      <button type="button" className="secondary" disabled={disabled} onClick={addStep}>Qadam qo‘shish</button>
      <button type="button" className="secondary" disabled={disabled} onClick={addLevel}>Stack katagi qo‘shish</button>
      <button type="button" className="secondary" disabled={disabled||steps.length<=1} onClick={removeStep}>Oxirgi qadamni olib tashlash</button>
    </div>
  </section>;
}

export function StructuredResponseWorkspace({
  content,assetUrls={},answerKind,stem,value,disabled=false,onChange,
}:Props){
  const response=useMemo(()=>parseStructuredResponse(value),[value]);
  const mode=structuredResponseMode(content,answerKind,stem);
  const responseValues={...response.tables,...response.matches};
  const update=(next:StructuredResponseV1)=>onChange(serializeStructuredResponse(next));
  const updateValue=(key:string,nextValue:string)=>update(withValue(response,key,nextValue));

  return <div className="structured-response-workspace" data-response-mode={mode}>
    <StructuredQuestionView
      content={content}
      assetUrls={assetUrls}
      responseValues={responseValues}
      onResponseChange={disabled?undefined:updateValue}
      readOnly={disabled}
    />
    {mode==='drawing'?<DrawingPad content={content} assetUrls={assetUrls} response={response} onChange={update} disabled={disabled}/>:null}
    {mode==='stack'?<StackEditor response={response} onChange={update} disabled={disabled}/>:null}
  </div>;
}

export function ensureStructuredResponseValue(value:string){
  return value.startsWith('[[campath-response-v1]]')?value:serializeStructuredResponse(emptyStructuredResponse());
}
