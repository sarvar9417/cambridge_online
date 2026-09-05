import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type User } from '../lib/api';
import { navigate, useRoute } from '../lib/router';
import {
  LESSON_CHAPTERS as SOURCE_CHAPTERS,
  type LessonFigure,
  type LessonRichBlock,
  type LessonSlide,
  type LessonVisual,
} from './lesson-content-source-complete';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { Chapter7SlideBody } from './Chapter7SlideBody';
import { FullSourceTranscript } from './FullSourceTranscript';
import type { SourceTranscriptChapter } from './source-transcript-bundles';
import './lesson-studio.css';
import './lesson-studio-full.css';
import './lesson-studio-presenter-fix.css';
import './lesson-checkpoint-scroll.css';
import './lesson-studio-hodder.css';

type ExamPart = {
  id:string; displayRef:string; stem:string; contextMd:string|null; commandWord:string|null; marks:number;
  year:number; series:string; variant:number; component:number; hasDiagram:boolean; hasDependency:boolean;
  matchedLearningObjectiveCodes:string[];
};
type CheckpointResponse = { data:ExamPart[]; learningObjectiveCodes:string[]; yearFrom:number; yearTo:number };
type ChapterLike = (typeof SOURCE_CHAPTERS)[number] | typeof CHAPTER_7;

const LESSON_CHAPTERS: ChapterLike[] = [...SOURCE_CHAPTERS, CHAPTER_7].sort((a,b)=>a.number-b.number);

function Visual({ kind }: { kind?: LessonVisual }) {
  if (!kind) return null;
  const labels: Record<LessonVisual, string[]> = {
    binary:['1','0','1','1','0','0','1','0'], bases:['2','10','16','BCD'], arithmetic:['0110','+0011','=1001'], characters:['A','65','01000001'],
    pixels:['▦','24-bit','1920×1080'], vectors:['○','△','⌁'], sound:['∿','44.1 kHz','16 bit'], compression:['100%','→','28%'],
    types:['ENUM','RECORD','SET'], files:['SERIAL','SEQ','RANDOM'], hashing:['KEY','ƒ(x)','217'], floating:['M','× 2','E'], precision:['PRECISION','↔','RANGE'], recap:['✓','✓','✓'],
  };
  return <div className={`lesson-visual lesson-visual-${kind}`} aria-hidden="true">{labels[kind].map((item,index)=><span key={`${item}-${index}`}>{item}</span>)}</div>;
}

function WaveFigure({ figure }: { figure:Extract<LessonFigure,{kind:'wave'}> }) {
  const width=620,height=figure.series.length*118;
  return <div className="hodder-figure hodder-wave-figure"><strong>{figure.title}</strong><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={figure.title}>
    {figure.series.map((series,index)=>{
      const top=index*118,mid=top+62,amplitude=34;
      const points=Array.from({length:121},(_,i)=>{
        const x=46+(i/120)*540;
        const y=mid-Math.sin((i/120)*Math.PI*2*series.cycles)*amplitude;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      const samples=series.samples?Array.from({length:series.samples},(_,i)=>{
        const x=46+(i/(series.samples!-1))*540;
        const y=mid-Math.sin((i/(series.samples!-1))*Math.PI*2*series.cycles)*amplitude;
        return <circle key={i} cx={x} cy={y} r="3.4"/>;
      }):null;
      return <g key={series.label}>
        <text x="46" y={top+17}>{series.label}</text>
        <line x1="46" y1={mid} x2="586" y2={mid}/>
        <polyline points={points}/>{samples}
      </g>;
    })}
  </svg>{figure.caption&&<p>{figure.caption}</p>}</div>;
}

function FigureBlock({ figure }: { figure:LessonFigure }) {
  if(figure.kind==='wave')return <WaveFigure figure={figure}/>;
  if(figure.kind==='grid')return <figure className="hodder-figure hodder-grid-figure"><strong>{figure.title}</strong><div className="hodder-pixel-grid" style={{gridTemplateColumns:`repeat(${Math.max(...figure.rows.map(row=>row.length))}, 1fr)`}}>{figure.rows.flatMap((row,rowIndex)=>[...row].map((symbol,columnIndex)=><span data-symbol={symbol} key={`${rowIndex}-${columnIndex}`}>{symbol}</span>))}</div>{figure.legend&&<div className="hodder-figure-legend">{figure.legend.map(item=><span key={`${item.symbol}-${item.label}`}><b data-symbol={item.symbol}>{item.symbol}</b>{item.label}</span>)}</div>}{figure.caption&&<figcaption>{figure.caption}</figcaption>}</figure>;
  if(figure.kind==='sequence')return <figure className="hodder-figure hodder-sequence-figure"><strong>{figure.title}</strong><div className="hodder-sequence">{figure.items.map((item,index)=><div className="hodder-sequence-node-wrap" key={`${item.label}-${index}`}><div className="hodder-sequence-node"><b>{item.label}</b>{item.note&&<small>{item.note}</small>}</div>{index<figure.items.length-1&&<span className="hodder-sequence-arrow">→</span>}</div>)}</div>{figure.caption&&<figcaption>{figure.caption}</figcaption>}</figure>;
  if(figure.kind==='bitfield')return <figure className="hodder-figure hodder-bitfield-figure"><strong>{figure.title}</strong><div className="hodder-bitfield-list">{figure.fields.map((field,index)=><div className="hodder-bitfield-row" key={`${field.label}-${index}`}><div><b>{field.label}</b>{field.detail&&<small>{field.detail}</small>}</div><div className="hodder-bitfield-bits">{field.bits.split(/\s+/).filter(Boolean).map((bit,bitIndex)=>bit==='|'?<i key={bitIndex}/>:<span key={bitIndex}>{bit}</span>)}</div></div>)}</div>{figure.caption&&<figcaption>{figure.caption}</figcaption>}</figure>;
  return <figure className="hodder-figure hodder-pixel-scale-figure"><strong>{figure.title}</strong><div className="hodder-pixel-scale">{figure.stages.map((stage,index)=><div className={`hodder-pixel-stage level-${Math.max(1,Math.min(5,stage.level))}`} key={`${stage.label}-${index}`}><div aria-hidden="true">{Array.from({length:16},(_,i)=><span key={i}/>)}</div><b>{stage.label}</b>{stage.note&&<small>{stage.note}</small>}</div>)}</div>{figure.caption&&<figcaption>{figure.caption}</figcaption>}</figure>;
}

function RichBlock({ block }: { block:LessonRichBlock }) {
  if(block.kind==='paragraph') return <p className="hodder-paragraph">{block.text}</p>;
  if(block.kind==='bullets') return <ul className="hodder-bullets">{block.items.map(item=><li key={item}>{item}</li>)}</ul>;
  if(block.kind==='code') return <div className="hodder-code"><strong>{block.title}</strong><pre>{block.lines.join('\n')}</pre></div>;
  if(block.kind==='steps') return <div className="hodder-steps">{block.title&&<strong>{block.title}</strong>}<ol>{block.items.map(item=><li key={item}>{item}</li>)}</ol></div>;
  if(block.kind==='callout') return <aside className={`hodder-callout tone-${block.tone||'info'}`}><span>{block.tone==='extension'?'EXTENSION':block.tone==='activity'?'ACTIVITY':'NOTE'}</span><strong>{block.title}</strong><p>{block.text}</p></aside>;
  if(block.kind==='comparison') return <div className="hodder-comparison"><div><strong>{block.leftTitle}</strong>{block.rows.map(([left],index)=><p key={`${left}-${index}`}>{left}</p>)}</div><div><strong>{block.rightTitle}</strong>{block.rows.map(([,right],index)=><p key={`${right}-${index}`}>{right}</p>)}</div></div>;
  if(block.kind==='source-note') return <aside className="hodder-source-note"><header><span>SOURCE FIDELITY</span><strong>{block.title}</strong></header><div><section><b>{block.sourceLabel}</b><p>{block.sourceText}</p></section><section><b>{block.examSafeLabel}</b><p>{block.examSafeText}</p></section></div></aside>;
  if(block.kind==='figure') return <FigureBlock figure={block.figure}/>;
  return <div className="hodder-table-wrap"><table className="hodder-table"><caption>{block.table.caption}</caption><thead><tr>{block.table.headers.map(header=><th key={header}>{header}</th>)}</tr></thead><tbody>{block.table.rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,index)=><td key={`${rowIndex}-${index}`}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function SourceTrace({ slide,chapter }: { slide:LessonSlide; chapter:SourceTranscriptChapter }) {
  const pages=slide.sourcePages??[],elements=slide.sourceElements??[];
  if(!pages.length&&!elements.length)return null;
  return <details className="lesson-source-trace"><summary>{slide.sourceLabel??'Hodder source'}</summary><div>{pages.length>0&&<span>Pages {pages.join(', ')}</span>}{elements.map(item=><span key={item}>{item}</span>)}</div>{pages.length>0&&<FullSourceTranscript chapter={chapter} sourcePages={pages}/>}</details>;
}

function ExamPractice({ slide }: { slide:LessonSlide }) {
  const codes=slide.learningObjectiveCodes??[];
  const syllabusCode=slide.checkpointSyllabusCode??'9618';
  const yearFrom=slide.checkpointYearFrom??2021;
  const yearTo=slide.checkpointYearTo??2025;
  const is0478=syllabusCode==='0478';
  const [questions,setQuestions]=useState<ExamPart[]>([]),[loading,setLoading]=useState(Boolean(codes.length)),[error,setError]=useState('');

  useEffect(()=>{
    let cancelled=false;
    if(!codes.length){setQuestions([]);setLoading(false);setError('');return()=>{cancelled=true};}
    (async()=>{
      setLoading(true);setError('');
      try{
        const qs=new URLSearchParams({yearFrom:String(yearFrom),yearTo:String(yearTo),syllabusCode});
        codes.forEach(code=>qs.append('loCodes',code));
        const result=await api<CheckpointResponse>(`/lesson-checkpoints?${qs}`);
        if(!cancelled)setQuestions(result.data);
      }catch(cause){if(!cancelled)setError(cause instanceof Error?cause.message:(is0478?'Questions could not be loaded.':'Savollar yuklanmadi.'));}
      finally{if(!cancelled)setLoading(false);}
    })();
    return()=>{cancelled=true};
  },[codes.join('|'),syllabusCode,yearFrom,yearTo,is0478]);

  if(slide.checkpointUnavailableReason)return <div className="lesson-checkpoint-unavailable"><span>NO EXACT HISTORICAL LO</span><h2>{is0478?'No exact past-paper match is forced for this part':'Bu qism uchun savol majburan tanlanmadi'}</h2><p>{slide.checkpointUnavailableReason}</p></div>;
  if(loading)return <div className="lesson-loading">{is0478?'Loading exact learning-objective past-paper questions…':'Exact learning-objective past-paper savollari yuklanmoqda…'}</div>;
  if(error)return <div className="lesson-empty">{error}</div>;

  const years=Array.from({length:Math.max(0,yearTo-yearFrom+1)},(_,index)=>yearFrom+index);
  const represented=new Set(questions.map(q=>q.year));
  const groups=years.map(year=>({year,questions:questions.filter(q=>q.year===year)})).filter(group=>group.questions.length);
  const rangeLabel=`${yearFrom}–${yearTo}`;
  let ordinal=0;
  return <>
    <div className="lesson-checkpoint-contract"><div><span>EXACT LO MATCH</span><strong>{slide.checkpointLabel||codes.join(' · ')}</strong></div><p>{is0478?`Only approved ${rangeLabel} Cambridge 0478 leaves explicitly mapped to these historical/current learning objective codes are shown.`:`Only approved ${rangeLabel} Cambridge 9618 leaves explicitly mapped to these historical learning objective codes are shown.`}</p></div>
    <div className="lesson-exam-years"><strong>Paper coverage</strong>{years.map(year=><span className={represented.has(year)?'available':'missing'} key={year}>{year}</span>)}</div>
    <div className="lesson-exam-summary"><strong>{is0478?`${questions.length} approved questions`:`${questions.length} ta approved savol`}</strong><span>{is0478?'All shown · grouped by year · scroll down':'Barchasi ko‘rsatiladi · yillar bo‘yicha guruhlangan · pastga scroll qiling'}</span></div>
    {!questions.length?<div className="lesson-empty">{is0478?`No approved Cambridge 0478 question is currently mapped to this exact learning-objective set in the ${rangeLabel} corpus. CamPath does not substitute a loosely related question.`:`Bu exact learning objective uchun ${rangeLabel} corpusda approved savol yo‘q. CamPath boshqa subtopic savolini bu yerga aralashtirmaydi.`}</div>:
    <div className="lesson-exam-scroll">{groups.map(group=><section className="lesson-exam-year-group" key={group.year}>
      <div className="lesson-exam-year-header"><strong>{group.year}</strong><span>{is0478?`${group.questions.length} questions`:`${group.questions.length} ta savol`}</span></div>
      <div className="lesson-exam-grid">{group.questions.map(q=>{ordinal+=1;const flags=[q.hasDiagram?'Diagram':'',q.hasDependency?'Parent context':''].filter(Boolean);return <article className="lesson-exam-card" key={q.id}>
        <div className="lesson-exam-meta"><span>{q.displayRef}</span><b>{q.marks} {is0478?'marks':'ball'}</b></div>
        {q.contextMd&&<div className="lesson-question-context">{q.contextMd}</div>}
        <p>{q.stem}</p>
        <footer><span>{q.commandWord||'Question'}{flags.length?` · ${flags.join(' · ')}`:''}</span><span>{q.matchedLearningObjectiveCodes.join(', ')}</span></footer>
        <span className="lesson-exam-number">{String(ordinal).padStart(2,'0')}</span>
      </article>})}</div>
    </section>)}</div>}
  </>;
}

function SlideBody({ slide,chapter }: { slide:LessonSlide; chapter:SourceTranscriptChapter }) {
  return <>
    <div className="lesson-copy hodder-copy">
      <p className="lesson-eyebrow">{slide.eyebrow}</p>
      <h1>{slide.title}</h1>
      <p className="lesson-lead">{slide.lead}</p>
      {slide.formula&&<div className="lesson-formula">{slide.formula}</div>}
      {slide.bullets&&<ul className="lesson-bullets">{slide.bullets.map(item=><li key={item}>{item}</li>)}</ul>}
      {slide.keyTerms&&<div className="lesson-terms">{slide.keyTerms.map(item=><article key={item.term}><strong>{item.term}</strong><p>{item.definition}</p></article>)}</div>}
      {slide.richBlocks&&<div className="hodder-rich-blocks">{slide.richBlocks.map((block,index)=><RichBlock block={block} key={`${block.kind}-${index}`}/>)}</div>}
      {slide.example&&<div className="lesson-example"><div><span>WORKED EXAMPLE</span><strong>{slide.example.title}</strong></div><ol>{slide.example.lines.map(item=><li key={item}>{item}</li>)}</ol>{slide.example.answer&&<p className="lesson-answer">{slide.example.answer}</p>}</div>}
      {slide.teacherPrompt&&<aside className="lesson-prompt"><span>DISCUSS</span><p>{slide.teacherPrompt}</p></aside>}
      {slide.activity&&<details className="lesson-activity"><summary><span>CLASS ACTIVITY</span><strong>{slide.activity.title}</strong></summary><p>{slide.activity.prompt}</p>{slide.activity.reveal&&<div className="lesson-activity-answer"><span>ANSWER / GUIDE</span><p>{slide.activity.reveal}</p></div>}</details>}
      <SourceTrace slide={slide} chapter={chapter}/>
    </div>
    <Visual kind={slide.visual}/>
  </>;
}

export function LessonStudio({ user }: { user:User }) {
  const route=useRoute();
  const chapterNo=Number(route.params.get('chapter')||0);
  const chosen=LESSON_CHAPTERS.find(chapter=>chapter.number===chapterNo)??null;
  const [index,setIndex]=useState(0),[presenting,setPresenting]=useState(false);
  const studioRef=useRef<HTMLElement|null>(null);
  const slide=chosen?.slides[index] as LessonSlide|undefined;
  const sections=useMemo(()=>chosen?[...new Set(chosen.slides.map(item=>item.section))]:[],[chosen]);

  useEffect(()=>{setIndex(0)},[chapterNo]);
  const leavePresenter=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();}catch{setPresenting(false)}};
  const enterPresenter=async()=>{const target=studioRef.current;if(!target)return;try{await target.requestFullscreen?.();setPresenting(document.fullscreenElement===target);}catch{setPresenting(false)}};
  useEffect(()=>{const sync=()=>setPresenting(document.fullscreenElement===studioRef.current);document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync)},[]);
  useEffect(()=>{if(!chosen)return;const onKey=(event:KeyboardEvent)=>{if(['ArrowRight','PageDown',' '].includes(event.key)){const target=event.target as HTMLElement|null;if(target?.closest('.lesson-exam-scroll,.hodder-table-wrap,details'))return;event.preventDefault();setIndex(value=>Math.min(chosen.slides.length-1,value+1));}if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();setIndex(value=>Math.max(0,value-1));}if(event.key==='Escape'&&presenting)void leavePresenter();};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[chosen,presenting]);

  if(user.role==='student')return null;
  if(!chosen)return <section className="lesson-library"><header><div><p className="lesson-eyebrow">TEACHING STUDIO</p><h1>Darslar</h1><p>Elektron doska uchun source-audited Hodder lessons. Chapter 1 va 13 uploaded source bo‘yicha page-by-page qayta qurilgan.</p></div><span className="lesson-library-badge">{LESSON_CHAPTERS.length} chapter</span></header><div className="lesson-library-grid">{LESSON_CHAPTERS.map(chapter=><button key={chapter.number} className={`lesson-chapter-card chapter-${chapter.number}`} onClick={()=>navigate(`oqitish/darslar?chapter=${chapter.number}`)}><span className="lesson-chapter-no">{String(chapter.number).padStart(2,'0')}</span><span className="lesson-level">{chapter.level}</span><h2>{chapter.title}</h2><p>{chapter.subtitle}</p><div>{chapter.subtopics.map(item=><span key={item}>{item}</span>)}</div><footer><b>{chapter.slides.length} slides · {chapter.coverage}</b><span>Ochish →</span></footer></button>)}</div></section>;
  if(!slide)return null;

  const sourceChapter=chosen.number as SourceTranscriptChapter;
  const sectionStart=sections.map(section=>chosen.slides.findIndex(item=>item.section===section));
  return <section ref={studioRef} className={`lesson-studio hodder-studio accent-${slide.accent||'indigo'}${presenting?' is-presenting':''}`}>
    <header className="lesson-toolbar"><button className="lesson-back" onClick={()=>navigate('oqitish/darslar')}>← Chapters</button><div className="lesson-toolbar-title"><span>{chosen.level} · Chapter {chosen.number}</span><strong>{chosen.title}</strong></div><div className="lesson-toolbar-actions"><span>{index+1}/{chosen.slides.length}</span><button onClick={presenting?leavePresenter:enterPresenter}>{presenting?'Presenter’dan chiqish':'Doskada ochish ↗'}</button></div></header>
    <div className="lesson-progress"><span style={{width:`${((index+1)/chosen.slides.length)*100}%`}}/></div>
    <div className="lesson-workspace"><aside className="lesson-outline"><p>CHAPTER {chosen.number}</p>{sections.map((section,i)=><button className={slide.section===section?'active':''} key={section} onClick={()=>setIndex(sectionStart[i]!)}><span>{String(i+1).padStart(2,'0')}</span>{section}</button>)}</aside>
      <main className={`lesson-slide${slide.examPractice?' lesson-slide-exam':''}`}>{slide.examPractice?<div className="lesson-exam-slide"><div className="lesson-exam-intro"><div><p className="lesson-eyebrow">{slide.eyebrow}</p><h1>{slide.title}</h1></div><p>{slide.lead}</p></div><ExamPractice slide={slide}/><SourceTrace slide={slide} chapter={sourceChapter}/></div>:slide.id.startsWith('ch7-')?<><Chapter7SlideBody slide={slide}/><SourceTrace slide={slide} chapter={sourceChapter}/></>:<SlideBody slide={slide} chapter={sourceChapter}/>}<div className="lesson-slide-watermark">CamPath · {chosen.level}</div></main>
    </div>
    <footer className="lesson-nav"><button disabled={index===0} onClick={()=>setIndex(value=>Math.max(0,value-1))}>← Oldingi</button><div>{chosen.slides.map((item,i)=><button key={item.id} aria-label={`${i+1}-slide`} className={i===index?'active':item.section===slide.section?'same-section':''} onClick={()=>setIndex(i)}/>)}</div><button disabled={index===chosen.slides.length-1} onClick={()=>setIndex(value=>Math.min(chosen.slides.length-1,value+1))}>Keyingi →</button></footer>
  </section>;
}
