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
import { buildTopicPlan, flattenTopicPages, type LessonTopic, type TopicPage } from './lesson-topic-plan';
import { lessonPurpose, studentFacingSlide, studentFacingText } from './lesson-student-facing';
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
  if(block.kind==='callout') return <aside className={`hodder-callout tone-${block.tone||'info'}`}><span>{block.tone==='extension'?'GO FURTHER':block.tone==='activity'?'TRY IT':'KEY IDEA'}</span><strong>{block.title}</strong><p>{block.text}</p></aside>;
  if(block.kind==='comparison') return <div className="hodder-comparison"><div><strong>{block.leftTitle}</strong>{block.rows.map(([left],index)=><p key={`${left}-${index}`}>{left}</p>)}</div><div><strong>{block.rightTitle}</strong>{block.rows.map(([,right],index)=><p key={`${right}-${index}`}>{right}</p>)}</div></div>;
  if(block.kind==='source-note') return <aside className="hodder-source-note"><header><span>EXAM NOTE</span><strong>{block.title}</strong></header><div><section><b>{block.sourceLabel}</b><p>{block.sourceText}</p></section><section><b>{block.examSafeLabel}</b><p>{block.examSafeText}</p></section></div></aside>;
  if(block.kind==='figure') return <FigureBlock figure={block.figure}/>;
  return <div className="hodder-table-wrap"><table className="hodder-table"><caption>{block.table.caption}</caption><thead><tr>{block.table.headers.map(header=><th key={header}>{header}</th>)}</tr></thead><tbody>{block.table.rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,index)=><td key={`${rowIndex}-${index}`}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function SourceTrace({ slide, toolbar=false }: { slide:LessonSlide; toolbar?:boolean }) {
  const pages=slide.sourcePages??[],elements=slide.sourceElements??[];
  if(!pages.length&&!elements.length)return null;
  return <details className={`lesson-source-trace${toolbar?' lesson-teacher-evidence':''}`}><summary>{toolbar?'Source evidence':slide.sourceLabel??'Hodder source'}</summary><div>{pages.length>0&&<span>Pages {pages.join(', ')}</span>}{elements.map(item=><span key={item}>{item}</span>)}</div></details>;
}

function ActivityCard({ slideId, activity }: { slideId:string; activity:NonNullable<LessonSlide['activity']> }){
  const [revealed,setRevealed]=useState(false);
  useEffect(()=>setRevealed(false),[slideId]);
  return <section className="lesson-student-activity">
    <header><span>YOUR TURN</span><strong>{activity.title}</strong></header>
    <p>{activity.prompt}</p>
    {activity.reveal&&<><button className="lesson-model-answer-toggle" type="button" aria-expanded={revealed} onClick={()=>setRevealed(value=>!value)}>{revealed?'Hide model answer':'Show model answer'}</button>{revealed&&<div className="lesson-student-model-answer"><span>MODEL ANSWER</span><p>{activity.reveal}</p></div>}</>}
  </section>;
}

function ExamPractice({ slide }: { slide:LessonSlide }) {
  const codes=slide.learningObjectiveCodes??[];
  const syllabusCode=slide.checkpointSyllabusCode??'9618';
  const yearFrom=slide.checkpointYearFrom??2021;
  const yearTo=slide.checkpointYearTo??2026;
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
      }catch(cause){if(!cancelled)setError(cause instanceof Error?cause.message:'Past-paper questions could not be loaded.');}
      finally{if(!cancelled)setLoading(false);}
    })();
    return()=>{cancelled=true};
  },[codes.join('|'),syllabusCode,yearFrom,yearTo]);

  const rangeLabel=`${yearFrom}–${yearTo}`;
  if(slide.checkpointUnavailableReason)return <div className="lesson-checkpoint-unavailable"><span>PAST-PAPER CHECK</span><h2>No exact Cambridge question is shown for this learning point</h2><p>The approved corpus does not contain an exact match here, so a loosely related question is not substituted.</p></div>;
  if(loading)return <div className="lesson-loading">Finding exact Cambridge past-paper questions for this learning point…</div>;
  if(error)return <div className="lesson-empty">{error}</div>;

  const years=Array.from({length:Math.max(0,yearTo-yearFrom+1)},(_,index)=>yearFrom+index);
  const represented=new Set(questions.map(q=>q.year));
  const groups=years.map(year=>({year,questions:questions.filter(q=>q.year===year)})).filter(group=>group.questions.length);
  let ordinal=0;
  return <>
    <div className="lesson-checkpoint-contract student-facing-contract"><div><span>CAMBRIDGE PAST-PAPER PRACTICE</span><strong>{slide.checkpointLabel||'Apply what you have learned'}</strong></div><p>Every question below is an approved Cambridge past-paper question matched to the concept you have just learned. Attempt it before checking the mark scheme.</p></div>
    <div className="lesson-practice-cycle" aria-label="Past-paper learning cycle"><span>1 · Attempt independently</span><span>2 · Explain your reasoning</span><span>3 · Check the mark scheme</span><span>4 · Improve your answer</span></div>
    <div className="lesson-exam-years"><strong>Past-paper years</strong>{years.map(year=><span className={represented.has(year)?'available':'missing'} key={year}>{year}</span>)}</div>
    <div className="lesson-exam-summary"><strong>{questions.length} Cambridge question{questions.length===1?'':'s'}</strong><span>Open a question to see its complete original context, table or diagram.</span></div>
    {!questions.length?<div className="lesson-empty">No exact approved Cambridge past-paper question is available for this learning point in the {rangeLabel} corpus.</div>:
    <div className="lesson-exam-scroll">{groups.map(group=><section className="lesson-exam-year-group" key={group.year}>
      <div className="lesson-exam-year-header"><strong>{group.year}</strong><span>{group.questions.length} question{group.questions.length===1?'':'s'}</span></div>
      <div className="lesson-exam-grid">{group.questions.map(q=>{ordinal+=1;const flags=[q.hasDiagram?'Original visual included':'',q.hasDependency?'Required context included':''].filter(Boolean);return <article className="lesson-exam-card" data-lo-codes={q.matchedLearningObjectiveCodes.join('|')} data-syllabus-code={syllabusCode} key={q.id}>
        <div className="lesson-exam-meta"><span>{q.displayRef}</span><b>{q.marks} mark{q.marks===1?'':'s'}</b></div>
        {q.contextMd&&<div className="lesson-question-context">{q.contextMd}</div>}
        <p>{q.stem}</p>
        <footer><span>{q.commandWord||'Question'}{flags.length?` · ${flags.join(' · ')}`:''}</span><span className="lesson-exam-technical">{q.matchedLearningObjectiveCodes.join(', ')}</span></footer>
        <span className="lesson-exam-number">{String(ordinal).padStart(2,'0')}</span>
      </article>})}</div>
    </section>)}</div>}
  </>;
}

function SlideBody({ slide }: { slide:LessonSlide }) {
  return <>
    <div className="lesson-copy hodder-copy">
      <span className="lesson-screen-purpose">{lessonPurpose(slide)}</span>
      <p className="lesson-eyebrow">{slide.eyebrow}</p>
      <h1>{slide.title}</h1>
      <p className="lesson-lead">{slide.lead}</p>
      {slide.formula&&<div className="lesson-formula">{slide.formula}</div>}
      {slide.bullets&&<ul className="lesson-bullets">{slide.bullets.map(item=><li key={item}>{item}</li>)}</ul>}
      {slide.keyTerms&&<div className="lesson-terms">{slide.keyTerms.map(item=><article key={item.term}><strong>{item.term}</strong><p>{item.definition}</p></article>)}</div>}
      {slide.richBlocks&&<div className="hodder-rich-blocks">{slide.richBlocks.map((block,index)=><RichBlock block={block} key={`${block.kind}-${index}`}/>)}</div>}
      {slide.example&&<div className="lesson-example"><div><span>WORKED EXAMPLE</span><strong>{slide.example.title}</strong></div><ol>{slide.example.lines.map(item=><li key={item}>{item}</li>)}</ol>{slide.example.answer&&<p className="lesson-answer">{slide.example.answer}</p>}</div>}
      {slide.teacherPrompt&&<aside className="lesson-prompt student-facing-prompt"><span>THINK / EXPLAIN</span><p>{slide.teacherPrompt}</p></aside>}
      {slide.activity&&<ActivityCard slideId={slide.id} activity={slide.activity}/>} 
    </div>
    <Visual kind={slide.visual}/>
  </>;
}

function StudyFragment({ sourceSlide }: { sourceSlide:LessonSlide }) {
  const slide=studentFacingSlide(sourceSlide);
  return <article className="lesson-page-fragment" data-slide-id={slide.id}>
    {slide.id.startsWith('ch7-')?<div className="lesson-student-ch7"><span className="lesson-screen-purpose">{lessonPurpose(slide)}</span><Chapter7SlideBody slide={slide}/></div>:<SlideBody slide={slide}/>} 
  </article>;
}

function PracticePage({ page }: { page:TopicPage }) {
  return <div className="lesson-topic-practice-stack">
    {page.slides.map(sourceSlide=>sourceSlide.examPractice
      ? <section className="lesson-topic-past-paper-block" key={sourceSlide.id}><ExamPractice slide={studentFacingSlide(sourceSlide)}/></section>
      : <StudyFragment sourceSlide={sourceSlide} key={sourceSlide.id}/>,
    )}
  </div>;
}

function topicLabel(topic:LessonTopic) {
  return topic.code==='overview'?'Overview':topic.code;
}

export function LessonStudio({ user }: { user:User }) {
  const route=useRoute();
  const chapterNo=Number(route.params.get('chapter')||0);
  const topicParam=route.params.get('topic')||'';
  const pageParam=Number(route.params.get('page')||1);
  const chosen=LESSON_CHAPTERS.find(chapter=>chapter.number===chapterNo)??null;
  const topics=useMemo(()=>chosen?buildTopicPlan(chosen.slides,chosen.subtopics):[],[chosen]);
  const activeTopic=topics.find(topic=>topic.code===topicParam)??topics[0]??null;
  const activePageIndex=activeTopic?Math.max(0,Math.min(activeTopic.pages.length-1,Number.isFinite(pageParam)?pageParam-1:0)):0;
  const activePage=activeTopic?.pages[activePageIndex]??null;
  const flatPages=useMemo(()=>flattenTopicPages(topics),[topics]);
  const flatIndex=activeTopic&&activePage?flatPages.findIndex(item=>item.topic.code===activeTopic.code&&item.page.id===activePage.id):-1;
  const [presenting,setPresenting]=useState(false);
  const studioRef=useRef<HTMLElement|null>(null);

  const openPage=(topic:LessonTopic,pageIndex:number)=>{
    if(!chosen)return;
    navigate(`oqitish/darslar?chapter=${chosen.number}&topic=${topic.code}&page=${pageIndex+1}`);
  };
  const openFlat=(nextIndex:number)=>{
    const target=flatPages[nextIndex];
    if(target)openPage(target.topic,target.pageIndex);
  };

  const leavePresenter=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();}catch{setPresenting(false)}};
  const enterPresenter=async()=>{const target=studioRef.current;if(!target)return;try{await target.requestFullscreen?.();setPresenting(document.fullscreenElement===target);}catch{setPresenting(false)}};
  useEffect(()=>{const sync=()=>setPresenting(document.fullscreenElement===studioRef.current);document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync)},[]);

  useEffect(()=>{
    if(!activePage)return;
    const onKey=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement|null;
      if(target?.closest('.lesson-exam-scroll,.hodder-table-wrap,details,input,textarea,select,button,[contenteditable="true"]'))return;
      if(['ArrowRight','PageDown',' '].includes(event.key)&&flatIndex<flatPages.length-1){event.preventDefault();openFlat(flatIndex+1);}
      if(['ArrowLeft','PageUp'].includes(event.key)&&flatIndex>0){event.preventDefault();openFlat(flatIndex-1);}
      if(event.key==='Escape'&&presenting)void leavePresenter();
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[activePage,flatIndex,flatPages.length,presenting,chosen]);

  if(user.role==='student')return null;
  if(!chosen)return <section className="lesson-library"><header><div><p className="lesson-eyebrow">LESSON LIBRARY</p><h1>Darslar</h1><p>Book-like, source-grounded lessons: choose a chapter, move through its topics, study each scrollable page and finish every topic with Cambridge Past Paper practice.</p></div><span className="lesson-library-badge">{LESSON_CHAPTERS.length} source-backed chapters</span></header><div className="lesson-library-grid">{LESSON_CHAPTERS.map(chapter=>{const topicCount=buildTopicPlan(chapter.slides,chapter.subtopics).filter(topic=>topic.code!=='overview').length;return <button key={chapter.number} className={`lesson-chapter-card chapter-${chapter.number}`} onClick={()=>navigate(`oqitish/darslar?chapter=${chapter.number}`)}><span className="lesson-chapter-no">{String(chapter.number).padStart(2,'0')}</span><span className="lesson-level">{chapter.level}</span><h2>{chapter.title}</h2><p>{studentFacingText(chapter.subtitle)}</p><div>{chapter.subtopics.map(item=><span key={item}>{item}</span>)}</div><footer><b>{topicCount} topics</b><span>Ochish →</span></footer></button>})}</div></section>;
  if(!activeTopic||!activePage)return null;

  const traceSlide=activePage.slides.find(slide=>(slide.sourcePages?.length??0)>0||(slide.sourceElements?.length??0)>0)??activePage.slides[0];
  const previous=flatIndex>0?flatPages[flatIndex-1]:null;
  const next=flatIndex>=0&&flatIndex<flatPages.length-1?flatPages[flatIndex+1]:null;
  const nextCrossesTopic=Boolean(next&&next.topic.code!==activeTopic.code);
  const prevCrossesTopic=Boolean(previous&&previous.topic.code!==activeTopic.code);

  return <section ref={studioRef} className={`lesson-studio hodder-studio lesson-topic-studio accent-${activePage.slides[0]?.accent||'indigo'}${presenting?' is-presenting':''}`}>
    <header className="lesson-toolbar"><button className="lesson-back" onClick={()=>navigate('oqitish/darslar')}>← Darslar</button><div className="lesson-toolbar-title"><span>{chosen.level} · Chapter {chosen.number} · {topicLabel(activeTopic)}</span><strong>{activeTopic.title}</strong></div><div className="lesson-toolbar-actions">{traceSlide&&<SourceTrace slide={traceSlide} toolbar/>}<span>Page {activePageIndex+1}/{activeTopic.pages.length}</span><button onClick={presenting?leavePresenter:enterPresenter}>{presenting?'Board mode’dan chiqish':'Board mode ↗'}</button></div></header>
    <div className="lesson-progress"><span style={{width:`${((activePageIndex+1)/activeTopic.pages.length)*100}%`}}/></div>
    <div className="lesson-workspace lesson-topic-workspace">
      <aside className="lesson-outline lesson-topic-outline"><div className="lesson-topic-outline-head"><p>CHAPTER {chosen.number}</p><strong>Topics</strong></div>{topics.map(topic=><section className={`lesson-topic-nav-group${topic.code===activeTopic.code?' active':''}`} key={topic.code}><button className="lesson-topic-nav-topic" onClick={()=>openPage(topic,0)}><span>{topicLabel(topic)}</span><b>{topic.title}</b><small>{topic.pages.length}</small></button>{topic.code===activeTopic.code&&<div className="lesson-topic-nav-pages">{topic.pages.map((page,pageIndex)=><button className={pageIndex===activePageIndex?'active':''} key={page.id} onClick={()=>openPage(topic,pageIndex)}><span>{String(pageIndex+1).padStart(2,'0')}</span><b>{page.title}</b>{page.kind==='practice'&&<em>Past Paper</em>}</button>)}</div>}</section>)}</aside>
      <main className={`lesson-slide lesson-topic-page${activePage.kind==='practice'?' lesson-slide-exam':''}`} data-page-id={activePage.id} data-topic-code={activeTopic.code}>
        <header className="lesson-topic-page-head"><div><span>{topicLabel(activeTopic)} · PAGE {String(activePageIndex+1).padStart(2,'0')}</span><h1>{activePage.title}</h1></div><p>{activePage.kind==='practice'?'Topic complete: apply the ideas with approved Cambridge Past Paper questions.':'Scroll through this page to read, study examples and complete the activities before moving on.'}</p></header>
        <div className="lesson-topic-page-content">{activePage.kind==='practice'?<PracticePage page={activePage}/>:activePage.slides.map(sourceSlide=><StudyFragment sourceSlide={sourceSlide} key={sourceSlide.id}/>)}</div>
        <div className="lesson-slide-watermark">CamPath · {chosen.level}</div>
      </main>
    </div>
    <footer className="lesson-nav lesson-topic-nav"><button disabled={!previous} onClick={()=>previous&&openFlat(flatIndex-1)}>{prevCrossesTopic?'← Oldingi topic':'← Oldingi page'}</button><div>{activeTopic.pages.map((page,pageIndex)=><button key={page.id} aria-label={`${activeTopic.code}-page-${pageIndex+1}`} className={pageIndex===activePageIndex?'active':''} onClick={()=>openPage(activeTopic,pageIndex)}/>)}</div><button disabled={!next} onClick={()=>next&&openFlat(flatIndex+1)}>{nextCrossesTopic?'Keyingi topic →':'Keyingi page →'}</button></footer>
  </section>;
}
