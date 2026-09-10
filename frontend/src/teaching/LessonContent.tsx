import { useEffect, useState } from 'react';
import type { HodderLessonSlide, LessonFigure, LessonRichBlock } from './lesson-content-hodder-types';
import type { LessonVisual } from './lesson-content-full';
import {
  displaySlide,
  isExactSourceTranscript,
  type LessonPresentationBeat,
} from './lesson-experience-model';
import { Chapter14PresentationVisual, hasChapter14PresentationVisual } from './Chapter14PresentationVisuals';
import { Chapter14PresentationVisualV3, hasChapter14PresentationVisualV3 } from './Chapter14PresentationVisualsV3';
import { Chapter14PresentationVisualV4, hasChapter14PresentationVisualV4 } from './Chapter14PresentationVisualsV4';
import './chapter14-presentation-prototype.css';

const VISUAL_LABELS:Record<LessonVisual,string[]> = {
  binary:['1','0','1','1','0','0','1','0'],
  bases:['BIN','DEN','HEX'],
  arithmetic:['0110','+ 0011','= 1001'],
  characters:['A','65','01000001'],
  pixels:['PIXEL','24-bit','1920 × 1080'],
  vectors:['POINT','LINE','SHAPE'],
  sound:['WAVE','44.1 kHz','16 bit'],
  compression:['100%','→','28%'],
  types:['ENUM','RECORD','SET'],
  files:['SERIAL','SEQUENTIAL','RANDOM'],
  hashing:['KEY','ƒ(x)','ADDRESS'],
  floating:['M','× 2','E'],
  precision:['PRECISION','↔','RANGE'],
  recap:['CHECK','CONNECT','APPLY'],
  networking:['HUB','SWITCH','ROUTER'],
  internet:['IP','DNS','HTTP'],
  html:['<html>','<body>','</html>'],
};

function VisualGraphic({kind}:{kind?:LessonVisual}) {
  if(!kind)return null;
  return <div className={`lx-visual lx-visual--${kind}`} aria-hidden="true">
    {VISUAL_LABELS[kind].map((label,index)=><span key={`${label}-${index}`}>{label}</span>)}
  </div>;
}

export function shouldRenderGenericVisual(kind:LessonVisual|undefined,contentId:string) {
  if(!kind)return false;
  return !(kind==='networking'&&/^h2(?:n)?-/.test(contentId));
}

function FigureView({figure,presenting=false,reveal=Number.MAX_SAFE_INTEGER}:{figure:LessonFigure;presenting?:boolean;reveal?:number}) {
  if(figure.kind==='wave'){
    const width=680;
    const height=Math.max(150,figure.series.length*116);
    return <figure className="lx-figure lx-wave"><figcaption>{figure.title}</figcaption><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={figure.title}>
      {figure.series.map((series,index)=>{
        const top=index*116;
        const mid=top+66;
        const points=Array.from({length:121},(_,point)=>{
          const x=62+(point/120)*570;
          const y=mid-Math.sin((point/120)*Math.PI*2*series.cycles)*34;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        return <g key={series.label}><text x="62" y={top+20}>{series.label}</text><line x1="62" y1={mid} x2="632" y2={mid}/><polyline points={points}/>{series.samples?Array.from({length:series.samples},(_,sample)=>{const x=62+(sample/(series.samples!-1))*570;const y=mid-Math.sin((sample/(series.samples!-1))*Math.PI*2*series.cycles)*34;return <circle key={sample} cx={x} cy={y} r="4"/>}):null}</g>;
      })}
    </svg>{figure.caption?<p>{figure.caption}</p>:null}</figure>;
  }
  if(figure.kind==='grid')return <figure className="lx-figure"><figcaption>{figure.title}</figcaption><div className="lx-pixel-grid" style={{gridTemplateColumns:`repeat(${Math.max(...figure.rows.map(row=>row.length))},1fr)`}}>{figure.rows.flatMap((row,rowIndex)=>[...row].map((symbol,columnIndex)=><span data-symbol={symbol} key={`${rowIndex}-${columnIndex}`}>{symbol}</span>))}</div>{figure.legend?<div className="lx-legend">{figure.legend.map(item=><span key={`${item.symbol}-${item.label}`}><b data-symbol={item.symbol}>{item.symbol}</b>{item.label}</span>)}</div>:null}{figure.caption?<p>{figure.caption}</p>:null}</figure>;
  if(figure.kind==='sequence'){
    const items=figure.items.slice(0,presenting?reveal:undefined);
    return <figure className="lx-figure"><figcaption>{figure.title}</figcaption><div className="lx-sequence">{items.map((item,index)=><div className="lx-sequence-item" key={`${item.label}-${index}`}><span><strong>{item.label}</strong>{item.note?<small>{item.note}</small>:null}</span>{index<items.length-1?<b aria-hidden="true">→</b>:null}</div>)}</div>{figure.caption?<p>{figure.caption}</p>:null}</figure>;
  }
  if(figure.kind==='bitfield'){
    const fields=figure.fields.slice(0,presenting?reveal:undefined);
    return <figure className="lx-figure"><figcaption>{figure.title}</figcaption><div className="lx-bitfields">{fields.map((field,index)=><div className="lx-bitfield" key={`${field.label}-${index}`}><span><strong>{field.label}</strong>{field.detail?<small>{field.detail}</small>:null}</span><code>{field.bits}</code></div>)}</div>{figure.caption?<p>{figure.caption}</p>:null}</figure>;
  }
  const stages=figure.stages.slice(0,presenting?reveal:undefined);
  return <figure className="lx-figure"><figcaption>{figure.title}</figcaption><div className="lx-pixel-scale">{stages.map((stage,index)=><div key={`${stage.label}-${index}`}><span className={`level-${Math.max(1,Math.min(5,stage.level))}`} aria-hidden="true">{Array.from({length:16},(_,pixel)=><i key={pixel}/>)}</span><strong>{stage.label}</strong>{stage.note?<small>{stage.note}</small>:null}</div>)}</div>{figure.caption?<p>{figure.caption}</p>:null}</figure>;
}

function RichBlockView({block,presenting=false,reveal=Number.MAX_SAFE_INTEGER}:{block:LessonRichBlock;presenting?:boolean;reveal?:number}) {
  if(block.kind==='paragraph')return <p className="lx-paragraph">{block.text}</p>;
  if(block.kind==='bullets')return <ul className="lx-points">{block.items.slice(0,presenting?reveal:undefined).map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ul>;
  if(block.kind==='code')return <section className="lx-code">{block.title?<strong>{block.title}</strong>:null}<pre>{block.lines.join('\n')}</pre></section>;
  if(block.kind==='steps')return <section className="lx-steps">{block.title?<strong>{block.title}</strong>:null}<ol>{block.items.slice(0,presenting?reveal:undefined).map((item,index)=><li key={`${item}-${index}`}><span>{index+1}</span>{item}</li>)}</ol></section>;
  if(block.kind==='callout')return <aside className={`lx-callout lx-callout--${block.tone??'info'}`}><span>{block.tone==='activity'?'ACTIVITY':block.tone==='extension'?'EXTENSION':block.tone==='warning'?'CAUTION':'KEY IDEA'}</span><strong>{block.title}</strong><p>{block.text}</p></aside>;
  if(block.kind==='comparison')return <div className="lx-comparison"><section><strong>{block.leftTitle}</strong>{block.rows.slice(0,presenting?reveal:undefined).map(([left],index)=><p key={`${left}-${index}`}>{left}</p>)}</section><section><strong>{block.rightTitle}</strong>{block.rows.slice(0,presenting?reveal:undefined).map(([,right],index)=><p key={`${right}-${index}`}>{right}</p>)}</section></div>;
  if(block.kind==='source-note')return <aside className="lx-accuracy"><span>ACCURACY NOTE</span><h3>{block.title}</h3><div><p><strong>{block.sourceLabel}</strong>{block.sourceText}</p><p><strong>{block.examSafeLabel}</strong>{block.examSafeText}</p></div></aside>;
  if(block.kind==='figure')return <FigureView figure={block.figure} presenting={presenting} reveal={reveal}/>;
  return <div className="lx-table-wrap"><table><caption>{block.table.caption}</caption><thead><tr>{block.table.headers.map(header=><th scope="col" key={header}>{header}</th>)}</tr></thead><tbody>{block.table.rows.slice(0,presenting?reveal:undefined).map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,columnIndex)=><td key={`${rowIndex}-${columnIndex}`}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

export function LessonStudySlide({sourceSlide,pageTitle}:{sourceSlide:HodderLessonSlide;pageTitle:string}) {
  const slide=displaySlide(sourceSlide,pageTitle);
  const exact=isExactSourceTranscript(sourceSlide);
  const repeatsPageTitle=slide.title.trim().toLocaleLowerCase()===pageTitle.trim().toLocaleLowerCase();
  const [answerOpen,setAnswerOpen]=useState(false);
  useEffect(()=>setAnswerOpen(false),[slide.id]);
  return <article className={`lx-study-section${exact?' lx-study-section--source':''}`} data-slide-id={slide.id}>
    <header className="lx-study-section-head"><span>{slide.eyebrow}</span>{repeatsPageTitle&&!exact?null:<h2>{exact?'Core coursebook content':slide.title}</h2>}<p>{slide.lead}</p></header>
    {shouldRenderGenericVisual(slide.visual,sourceSlide.id)?<VisualGraphic kind={slide.visual}/>:null}
    {slide.formula?<div className="lx-formula">{slide.formula}</div>:null}
    {slide.bullets?.length?<ul className="lx-points">{slide.bullets.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ul>:null}
    {slide.keyTerms?.length?<div className="lx-terms">{slide.keyTerms.map(item=><section key={item.term}><span>KEY TERM</span><h3>{item.term}</h3><p>{item.definition}</p></section>)}</div>:null}
    {slide.richBlocks?.length?<div className="lx-rich">{slide.richBlocks.map((block,index)=><RichBlockView block={block} key={`${block.kind}-${index}`}/>)}</div>:null}
    {slide.example?<section className="lx-example"><span>WORKED EXAMPLE</span><h3>{slide.example.title}</h3><ol>{slide.example.lines.map((line,index)=><li key={`${line}-${index}`}><b>{index+1}</b><span>{line}</span></li>)}</ol>{slide.example.answer?<p><strong>Answer</strong>{slide.example.answer}</p>:null}</section>:null}
    {slide.teacherPrompt?<aside className="lx-check"><span>THINK AND EXPLAIN</span><p>{slide.teacherPrompt}</p></aside>:null}
    {slide.activity?<section className="lx-activity"><span>INDEPENDENT PRACTICE</span><h3>{slide.activity.title}</h3><p>{slide.activity.prompt}</p>{slide.activity.reveal?<><button type="button" aria-expanded={answerOpen} onClick={()=>setAnswerOpen(open=>!open)}>{answerOpen?'Hide answer':'Reveal answer'}</button>{answerOpen?<div className="lx-model-answer"><strong>Answer and guidance</strong><p>{slide.activity.reveal}</p></div>:null}</>:null}</section>:null}
  </article>;
}

export function revealCountForBeat(beat:LessonPresentationBeat) {
  if(beat.bullets)return beat.bullets.length;
  if(beat.keyTerms)return beat.keyTerms.length;
  if(beat.example)return beat.example.lines.length+(beat.example.answer?1:0);
  if(beat.activity?.reveal)return 1;
  const block=beat.richBlock;
  if(block?.kind==='bullets'||block?.kind==='steps')return block.items.length;
  if(block?.kind==='comparison')return block.rows.length;
  if(block?.kind==='table')return block.table.rows.length;
  if(block?.kind==='figure'){
    if(block.figure.kind==='sequence')return block.figure.items.length;
    if(block.figure.kind==='bitfield')return block.figure.fields.length;
    if(block.figure.kind==='pixel-scale')return block.figure.stages.length;
  }
  return 0;
}

const beatLabel:Record<LessonPresentationBeat['kind'],string> = {
  concept:'NEW CONCEPT',
  'key-idea':'KEY IDEA',
  definition:'KEY TERMS',
  example:'WORKED EXAMPLE',
  activity:'INDEPENDENT PRACTICE',
  check:'QUICK CHECK',
  visual:'VISUAL MODEL',
  source:'IMPORTANT COURSEBOOK DETAIL',
  emphasis:'EMPHASISED COURSEBOOK CONTENT',
};

const sceneLabel:Partial<Record<NonNullable<LessonPresentationBeat['sceneRole']>,string>> = {
  hook:'STARTER',
  objective:'LEARNING OBJECTIVES',
  concept:'NEW CONCEPT',
  process:'STEP BY STEP',
  visual:'VISUAL MODEL',
  compare:'COMPARE',
  challenge:'THINK',
  exam:'CAMBRIDGE CHECK',
  recap:'RETRIEVAL',
};

export function LessonPresentationScreen({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}) {
  const role=beat.sceneRole??beat.kind;
  const label=beat.sceneRole?sceneLabel[beat.sceneRole]??beatLabel[beat.kind]:beatLabel[beat.kind];
  const v4Visual=hasChapter14PresentationVisualV4(beat);
  const v3Visual=!v4Visual&&hasChapter14PresentationVisualV3(beat);
  const legacyVisual=!v4Visual&&!v3Visual&&hasChapter14PresentationVisual(beat);
  const customVisual=v4Visual||v3Visual||legacyVisual;
  return <article className={`lx-present-screen lx-present-screen--${beat.kind} lx-present-screen--scene-${role}`} aria-live="polite">
    <header><span>{label}</span><small>{beat.eyebrow}</small><h1>{beat.title}</h1></header>
    <div className="lx-present-content">
      {beat.lead?<p className="lx-present-lead">{beat.lead}</p>:null}
      {v4Visual?<Chapter14PresentationVisualV4 beat={beat} reveal={reveal}/>:v3Visual?<Chapter14PresentationVisualV3 beat={beat} reveal={reveal}/>:legacyVisual?<Chapter14PresentationVisual beat={beat} reveal={reveal}/>:null}
      {!customVisual&&shouldRenderGenericVisual(beat.visual,beat.slideId)&&(beat.lead||beat.formula)?<VisualGraphic kind={beat.visual}/>:null}
      {beat.formula?<div className="lx-formula lx-formula--present">{beat.formula}</div>:null}
      {beat.bullets?<ul className="lx-present-points">{beat.bullets.slice(0,reveal).map((item,index)=><li key={`${item}-${index}`}><span>{String(index+1).padStart(2,'0')}</span>{item}</li>)}</ul>:null}
      {beat.keyTerms?<div className="lx-present-terms">{beat.keyTerms.slice(0,reveal).map(item=><section key={item.term}><span>KEY TERM</span><h2>{item.term}</h2><p>{item.definition}</p></section>)}</div>:null}
      {beat.richBlock&&!customVisual?<RichBlockView block={beat.richBlock} presenting reveal={reveal}/>:null}
      {beat.example?<section className="lx-present-example"><h2>{beat.example.title}</h2><ol>{beat.example.lines.slice(0,reveal).map((line,index)=><li key={`${line}-${index}`}><span>{index+1}</span>{line}</li>)}</ol>{beat.example.answer && reveal>beat.example.lines.length?<p><strong>Answer</strong>{beat.example.answer}</p>:null}</section>:null}
      {beat.prompt?<blockquote className="lx-present-question">{beat.prompt}</blockquote>:null}
      {beat.activity?<section className="lx-present-activity"><h2>{beat.activity.title}</h2><p>{beat.activity.prompt}</p>{beat.activity.reveal&&reveal>0?<div><strong>Answer and guidance</strong><p>{beat.activity.reveal}</p></div>:null}</section>:null}
    </div>
    {beat.showSource!==false&&beat.sourcePages.length?<footer>Source: coursebook p. {beat.sourcePages.join(', ')}</footer>:null}
  </article>;
}
