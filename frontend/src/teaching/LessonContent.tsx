import { useEffect, useState } from 'react';
import type { HodderLessonSlide, LessonFigure, LessonRichBlock } from './lesson-content-hodder-types';
import type { LessonVisual } from './lesson-content-full';
import {
  displaySlide,
  isExactSourceTranscript,
  type LessonPresentationBeat,
} from './lesson-experience-model';

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

function FigureView({figure}:{figure:LessonFigure}) {
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
  if(figure.kind==='sequence')return <figure className="lx-figure"><figcaption>{figure.title}</figcaption><div className="lx-sequence">{figure.items.map((item,index)=><div className="lx-sequence-item" key={`${item.label}-${index}`}><span><strong>{item.label}</strong>{item.note?<small>{item.note}</small>:null}</span>{index<figure.items.length-1?<b aria-hidden="true">→</b>:null}</div>)}</div>{figure.caption?<p>{figure.caption}</p>:null}</figure>;
  if(figure.kind==='bitfield')return <figure className="lx-figure"><figcaption>{figure.title}</figcaption><div className="lx-bitfields">{figure.fields.map((field,index)=><div className="lx-bitfield" key={`${field.label}-${index}`}><span><strong>{field.label}</strong>{field.detail?<small>{field.detail}</small>:null}</span><code>{field.bits}</code></div>)}</div>{figure.caption?<p>{figure.caption}</p>:null}</figure>;
  return <figure className="lx-figure"><figcaption>{figure.title}</figcaption><div className="lx-pixel-scale">{figure.stages.map((stage,index)=><div key={`${stage.label}-${index}`}><span className={`level-${Math.max(1,Math.min(5,stage.level))}`} aria-hidden="true">{Array.from({length:16},(_,pixel)=><i key={pixel}/>)}</span><strong>{stage.label}</strong>{stage.note?<small>{stage.note}</small>:null}</div>)}</div>{figure.caption?<p>{figure.caption}</p>:null}</figure>;
}

function RichBlockView({block,presenting=false,reveal=Number.MAX_SAFE_INTEGER}:{block:LessonRichBlock;presenting?:boolean;reveal?:number}) {
  if(block.kind==='paragraph')return <p className="lx-paragraph">{block.text}</p>;
  if(block.kind==='bullets')return <ul className="lx-points">{block.items.slice(0,presenting?reveal:undefined).map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ul>;
  if(block.kind==='code')return <section className="lx-code">{block.title?<strong>{block.title}</strong>:null}<pre>{block.lines.join('\n')}</pre></section>;
  if(block.kind==='steps')return <section className="lx-steps">{block.title?<strong>{block.title}</strong>:null}<ol>{block.items.slice(0,presenting?reveal:undefined).map((item,index)=><li key={`${item}-${index}`}><span>{index+1}</span>{item}</li>)}</ol></section>;
  if(block.kind==='callout')return <aside className={`lx-callout lx-callout--${block.tone??'info'}`}><span>{block.tone==='activity'?'MASHQ':block.tone==='extension'?'QO‘SHIMCHA':block.tone==='warning'?'EHTIYOT BO‘LING':'ASOSIY FIKR'}</span><strong>{block.title}</strong><p>{block.text}</p></aside>;
  if(block.kind==='comparison')return <div className="lx-comparison"><section><strong>{block.leftTitle}</strong>{block.rows.slice(0,presenting?reveal:undefined).map(([left],index)=><p key={`${left}-${index}`}>{left}</p>)}</section><section><strong>{block.rightTitle}</strong>{block.rows.slice(0,presenting?reveal:undefined).map(([,right],index)=><p key={`${right}-${index}`}>{right}</p>)}</section></div>;
  if(block.kind==='source-note')return <aside className="lx-accuracy"><span>ANIQLIK IZOHI</span><h3>{block.title}</h3><div><p><strong>{block.sourceLabel}</strong>{block.sourceText}</p><p><strong>{block.examSafeLabel}</strong>{block.examSafeText}</p></div></aside>;
  if(block.kind==='figure')return <FigureView figure={block.figure}/>;
  return <div className="lx-table-wrap"><table><caption>{block.table.caption}</caption><thead><tr>{block.table.headers.map(header=><th scope="col" key={header}>{header}</th>)}</tr></thead><tbody>{block.table.rows.slice(0,presenting?reveal:undefined).map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,columnIndex)=><td key={`${rowIndex}-${columnIndex}`}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

export function LessonStudySlide({sourceSlide,pageTitle}:{sourceSlide:HodderLessonSlide;pageTitle:string}) {
  const slide=displaySlide(sourceSlide,pageTitle);
  const exact=isExactSourceTranscript(sourceSlide);
  const repeatsPageTitle=slide.title.trim().toLocaleLowerCase()===pageTitle.trim().toLocaleLowerCase();
  const [answerOpen,setAnswerOpen]=useState(false);
  useEffect(()=>setAnswerOpen(false),[slide.id]);
  return <article className={`lx-study-section${exact?' lx-study-section--source':''}`} data-slide-id={slide.id}>
    <header className="lx-study-section-head"><span>{slide.eyebrow}</span>{repeatsPageTitle&&!exact?null:<h2>{exact?'Kitobdagi asosiy mazmun':slide.title}</h2>}<p>{slide.lead}</p></header>
    {slide.visual?<VisualGraphic kind={slide.visual}/>:null}
    {slide.formula?<div className="lx-formula">{slide.formula}</div>:null}
    {slide.bullets?.length?<ul className="lx-points">{slide.bullets.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ul>:null}
    {slide.keyTerms?.length?<div className="lx-terms">{slide.keyTerms.map(item=><section key={item.term}><span>ATAMA</span><h3>{item.term}</h3><p>{item.definition}</p></section>)}</div>:null}
    {slide.richBlocks?.length?<div className="lx-rich">{slide.richBlocks.map((block,index)=><RichBlockView block={block} key={`${block.kind}-${index}`}/>)}</div>:null}
    {slide.example?<section className="lx-example"><span>WORKED EXAMPLE</span><h3>{slide.example.title}</h3><ol>{slide.example.lines.map((line,index)=><li key={`${line}-${index}`}><b>{index+1}</b><span>{line}</span></li>)}</ol>{slide.example.answer?<p><strong>Javob</strong>{slide.example.answer}</p>:null}</section>:null}
    {slide.teacherPrompt?<aside className="lx-check"><span>O‘YLANG VA TUSHUNTIRING</span><p>{slide.teacherPrompt}</p></aside>:null}
    {slide.activity?<section className="lx-activity"><span>MUSTAQIL MASHQ</span><h3>{slide.activity.title}</h3><p>{slide.activity.prompt}</p>{slide.activity.reveal?<><button type="button" aria-expanded={answerOpen} onClick={()=>setAnswerOpen(open=>!open)}>{answerOpen?'Javobni yashirish':'Javobni ochish'}</button>{answerOpen?<div className="lx-model-answer"><strong>Javob va yo‘l-yo‘riq</strong><p>{slide.activity.reveal}</p></div>:null}</>:null}</section>:null}
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
  return 0;
}

const beatLabel:Record<LessonPresentationBeat['kind'],string> = {
  concept:'YANGI TUSHUNCHA',
  'key-idea':'ASOSIY FIKR',
  definition:'ATAMALAR',
  example:'WORKED EXAMPLE',
  activity:'MUSTAQIL MASHQ',
  check:'TEZKOR TEKSHIRUV',
  visual:'KO‘RSATISH',
  source:'KITOBDAGI MUHIM TAFSILOT',
  emphasis:'QALIN AJRATILGAN MAZMUN',
};

export function LessonPresentationScreen({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}) {
  return <article className={`lx-present-screen lx-present-screen--${beat.kind}`} aria-live="polite">
    <header><span>{beatLabel[beat.kind]}</span><small>{beat.eyebrow}</small><h1>{beat.title}</h1></header>
    <div className="lx-present-content">
      {beat.lead?<p className="lx-present-lead">{beat.lead}</p>:null}
      {beat.visual && (beat.lead||beat.formula)?<VisualGraphic kind={beat.visual}/>:null}
      {beat.formula?<div className="lx-formula lx-formula--present">{beat.formula}</div>:null}
      {beat.bullets?<ul className="lx-present-points">{beat.bullets.slice(0,reveal).map((item,index)=><li key={`${item}-${index}`}><span>{String(index+1).padStart(2,'0')}</span>{item}</li>)}</ul>:null}
      {beat.keyTerms?<div className="lx-present-terms">{beat.keyTerms.slice(0,reveal).map(item=><section key={item.term}><span>ATAMA</span><h2>{item.term}</h2><p>{item.definition}</p></section>)}</div>:null}
      {beat.richBlock?<RichBlockView block={beat.richBlock} presenting reveal={reveal}/>:null}
      {beat.example?<section className="lx-present-example"><h2>{beat.example.title}</h2><ol>{beat.example.lines.slice(0,reveal).map((line,index)=><li key={`${line}-${index}`}><span>{index+1}</span>{line}</li>)}</ol>{beat.example.answer && reveal>beat.example.lines.length?<p><strong>Javob</strong>{beat.example.answer}</p>:null}</section>:null}
      {beat.prompt?<blockquote className="lx-present-question">{beat.prompt}</blockquote>:null}
      {beat.activity?<section className="lx-present-activity"><h2>{beat.activity.title}</h2><p>{beat.activity.prompt}</p>{beat.activity.reveal&&reveal>0?<div><strong>Javob va yo‘l-yo‘riq</strong><p>{beat.activity.reveal}</p></div>:null}</section>:null}
    </div>
    {beat.sourcePages.length?<footer>Manba: coursebook p. {beat.sourcePages.join(', ')}</footer>:null}
  </article>;
}
