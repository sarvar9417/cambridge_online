import { useEffect, useMemo } from 'react';
import { navigate, useRoute } from '../lib/router';
import { Chapter7SlideBody } from '../teaching/Chapter7SlideBody';
import {
  type LessonFigure,
  type LessonRichBlock,
  type LessonVisual,
} from '../teaching/lesson-content-source-complete';
import type { LessonSlide as BaseLessonSlide } from '../teaching/lesson-content-full';
import type { LessonTopic, TopicPage } from '../teaching/lesson-topic-plan';
import { studentFacingText } from '../teaching/lesson-student-facing';
import { StudentTopicPastPaper } from './StudentTopicPastPaper';
import {
  STUDENT_STUDY_CHAPTERS,
  pageSlideIds,
  resolveStudentStudyLocation,
  resolveStudySlideIndex,
  studentStudyChapter,
  studentStudyPages,
  studentStudyTopics,
  studentStudyUrl,
  type StudyChapter,
} from './student-lesson-topic-model';
import '../teaching/lesson-studio.css';
import '../teaching/lesson-studio-hodder.css';
import '../teaching/chapter7-lesson.css';
import './student-lessons.css';
import './student-lessons-topic.css';
import './student-topic-past-paper.css';

export {
  STUDENT_STUDY_CHAPTERS,
  resolveStudySlideIndex,
  studentStudyChapter,
  studentStudyPages,
  studentStudyTopics,
  studentStudyUrl,
};
export type { StudyChapter };

type StudySlide = BaseLessonSlide & {
  richBlocks?: LessonRichBlock[];
  sourcePages?: number[];
  sourceElements?: string[];
  sourceLabel?: string;
  learningObjectiveCodes?: string[];
  checkpointLabel?: string;
  checkpointUnavailableReason?: string;
  checkpointSyllabusCode?: '9618' | '0478';
};

const isExactSourceTranscript=(slide:StudySlide)=>slide.id.startsWith('pdf-first-')&&!slide.id.startsWith('pdf-first-lens-')&&!slide.examPractice;

function Visual({ kind }: { kind?: LessonVisual }) {
  if (!kind) return null;
  const labels: Record<LessonVisual, string[]> = {
    binary:['1','0','1','1','0','0','1','0'], bases:['2','10','16','BCD'], arithmetic:['0110','+0011','=1001'], characters:['A','65','01000001'],
    pixels:['▦','24-bit','1920×1080'], vectors:['○','△','⌁'], sound:['∿','44.1 kHz','16 bit'], compression:['100%','→','28%'],
    types:['ENUM','RECORD','SET'], files:['SERIAL','SEQ','RANDOM'], hashing:['KEY','ƒ(x)','217'], floating:['M','× 2','E'], precision:['PRECISION','↔','RANGE'], recap:['✓','✓','✓'],
  };
  return <div className={`lesson-visual lesson-visual-${kind}`} aria-hidden="true">{labels[kind].map((item,index)=><span key={`${item}-${index}`}>{item}</span>)}</div>;
}

function WaveFigure({ figure }: { figure: Extract<LessonFigure, { kind:'wave' }> }) {
  const width=620,height=figure.series.length*118;
  return <div className="hodder-figure hodder-wave-figure"><strong>{figure.title}</strong><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={figure.title}>
    {figure.series.map((series,index)=>{
      const top=index*118,mid=top+62,amplitude=34;
      const points=Array.from({length:121},(_,i)=>{const x=46+(i/120)*540;const y=mid-Math.sin((i/120)*Math.PI*2*series.cycles)*amplitude;return `${x.toFixed(1)},${y.toFixed(1)}`}).join(' ');
      const samples=series.samples?Array.from({length:series.samples},(_,i)=>{const x=46+(i/(series.samples!-1))*540;const y=mid-Math.sin((i/(series.samples!-1))*Math.PI*2*series.cycles)*amplitude;return <circle key={i} cx={x} cy={y} r="3.4"/>}):null;
      return <g key={series.label}><text x="46" y={top+17}>{series.label}</text><line x1="46" y1={mid} x2="586" y2={mid}/><polyline points={points}/>{samples}</g>;
    })}
  </svg>{figure.caption&&<p>{figure.caption}</p>}</div>;
}

function FigureBlock({ figure }: { figure: LessonFigure }) {
  if(figure.kind==='wave')return <WaveFigure figure={figure}/>;
  if(figure.kind==='grid')return <figure className="hodder-figure hodder-grid-figure"><strong>{figure.title}</strong><div className="hodder-pixel-grid" style={{gridTemplateColumns:`repeat(${Math.max(...figure.rows.map(row=>row.length))}, 1fr)`}}>{figure.rows.flatMap((row,rowIndex)=>[...row].map((symbol,columnIndex)=><span data-symbol={symbol} key={`${rowIndex}-${columnIndex}`}>{symbol}</span>))}</div>{figure.legend&&<div className="hodder-figure-legend">{figure.legend.map(item=><span key={`${item.symbol}-${item.label}`}><b data-symbol={item.symbol}>{item.symbol}</b>{item.label}</span>)}</div>}{figure.caption&&<figcaption>{figure.caption}</figcaption>}</figure>;
  if(figure.kind==='sequence')return <figure className="hodder-figure hodder-sequence-figure"><strong>{figure.title}</strong><div className="hodder-sequence">{figure.items.map((item,index)=><div className="hodder-sequence-node-wrap" key={`${item.label}-${index}`}><div className="hodder-sequence-node"><b>{item.label}</b>{item.note&&<small>{item.note}</small>}</div>{index<figure.items.length-1&&<span className="hodder-sequence-arrow">→</span>}</div>)}</div>{figure.caption&&<figcaption>{figure.caption}</figcaption>}</figure>;
  if(figure.kind==='bitfield')return <figure className="hodder-figure hodder-bitfield-figure"><strong>{figure.title}</strong><div className="hodder-bitfield-list">{figure.fields.map((field,index)=><div className="hodder-bitfield-row" key={`${field.label}-${index}`}><div><b>{field.label}</b>{field.detail&&<small>{field.detail}</small>}</div><div className="hodder-bitfield-bits">{field.bits.split(/\s+/).filter(Boolean).map((bit,bitIndex)=>bit==='|'?<i key={bitIndex}/>:<span key={bitIndex}>{bit}</span>)}</div></div>)}</div>{figure.caption&&<figcaption>{figure.caption}</figcaption>}</figure>;
  return <figure className="hodder-figure hodder-pixel-scale-figure"><strong>{figure.title}</strong><div className="hodder-pixel-scale">{figure.stages.map((stage,index)=><div className={`hodder-pixel-stage level-${Math.max(1,Math.min(5,stage.level))}`} key={`${stage.label}-${index}`}><div aria-hidden="true">{Array.from({length:16},(_,i)=><span key={i}/>)}</div><b>{stage.label}</b>{stage.note&&<small>{stage.note}</small>}</div>)}</div>{figure.caption&&<figcaption>{figure.caption}</figcaption>}</figure>;
}

function RichBlock({ block }: { block: LessonRichBlock }) {
  if(block.kind==='paragraph')return <p className="hodder-paragraph">{block.text}</p>;
  if(block.kind==='bullets')return <ul className="hodder-bullets">{block.items.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ul>;
  if(block.kind==='code')return <div className="hodder-code">{block.title&&<strong>{block.title}</strong>}<pre>{block.lines.join('\n')}</pre></div>;
  if(block.kind==='steps')return <div className="hodder-steps">{block.title&&<strong>{block.title}</strong>}<ol>{block.items.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ol></div>;
  if(block.kind==='callout')return <aside className={`hodder-callout tone-${block.tone||'info'}`}><span>{block.tone==='extension'?'EXTENSION':block.tone==='activity'?'ACTIVITY':'NOTE'}</span><strong>{block.title}</strong><p>{block.text}</p></aside>;
  if(block.kind==='comparison')return <div className="hodder-comparison"><div><strong>{block.leftTitle}</strong>{block.rows.map(([left],index)=><p key={`${left}-${index}`}>{left}</p>)}</div><div><strong>{block.rightTitle}</strong>{block.rows.map(([,right],index)=><p key={`${right}-${index}`}>{right}</p>)}</div></div>;
  if(block.kind==='source-note')return <aside className="hodder-source-note student-source-note"><header><span>MANBA IZOHI</span><strong>{block.title}</strong></header><div><section><b>{block.sourceLabel}</b><p>{block.sourceText}</p></section><section><b>{block.examSafeLabel}</b><p>{block.examSafeText}</p></section></div></aside>;
  if(block.kind==='figure')return <FigureBlock figure={block.figure}/>;
  return <div className="hodder-table-wrap"><table className="hodder-table"><caption>{block.table.caption}</caption><thead><tr>{block.table.headers.map(header=><th key={header}>{header}</th>)}</tr></thead><tbody>{block.table.rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,index)=><td key={`${rowIndex}-${index}`}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function GenericStudySlide({ slide }: { slide: StudySlide }) {
  return <div className="student-study-slide-body"><div className="lesson-copy hodder-copy"><p className="lesson-eyebrow">{slide.eyebrow}</p><h1>{slide.title}</h1><p className="lesson-lead">{slide.lead}</p>{slide.formula&&<div className="lesson-formula">{slide.formula}</div>}{slide.bullets&&<ul className="lesson-bullets">{slide.bullets.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ul>}{slide.keyTerms&&<div className="lesson-terms">{slide.keyTerms.map(item=><article key={item.term}><strong>{item.term}</strong><p>{item.definition}</p></article>)}</div>}{slide.richBlocks&&<div className="hodder-rich-blocks">{slide.richBlocks.map((block,index)=><RichBlock block={block} key={`${block.kind}-${index}`}/>)}</div>}{slide.example&&<div className="lesson-example"><div><span>WORKED EXAMPLE</span><strong>{slide.example.title}</strong></div><ol>{slide.example.lines.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ol>{slide.example.answer&&<p className="lesson-answer">{slide.example.answer}</p>}</div>}{slide.teacherPrompt&&<aside className="lesson-prompt student-self-check"><span>O‘ZINGNI TEKSHIR</span><p>{slide.teacherPrompt}</p></aside>}{slide.activity&&<details className="lesson-activity"><summary><span>MASHQ</span><strong>{slide.activity.title}</strong></summary><p>{slide.activity.prompt}</p>{slide.activity.reveal&&<div className="lesson-activity-answer"><span>JAVOB / YO‘L-YO‘RIQ</span><p>{slide.activity.reveal}</p></div>}</details>}{slide.sourcePages?.length?<p className="student-source-pages">Manba sahifalari: {slide.sourcePages.join(', ')}</p>:null}</div><Visual kind={slide.visual}/></div>;
}

function StudyFragment({ sourceSlide, collapseExactSource=false }: { sourceSlide:StudySlide; collapseExactSource?:boolean }) {
  if(isExactSourceTranscript(sourceSlide)){
    const sourcePage=(sourceSlide.sourcePages??[]).join(', ');
    return <details className="student-source-transcript" open={!collapseExactSource} data-slide-id={sourceSlide.id}>
      <summary><span>Exact source transcript</span><strong>{sourcePage?`Coursebook source page ${sourcePage}`:sourceSlide.title}</strong></summary>
      <div className="student-source-transcript-body"><GenericStudySlide slide={sourceSlide}/></div>
    </details>;
  }
  return <article className="student-topic-fragment" data-slide-id={sourceSlide.id}>
    {sourceSlide.id.startsWith('ch7-')?<Chapter7SlideBody slide={sourceSlide}/>:<GenericStudySlide slide={sourceSlide}/>} 
  </article>;
}

function StudentTopicCheckpoint({ page, topic }: { page:TopicPage; topic:LessonTopic }) {
  return <StudentTopicPastPaper page={page} topic={topic}/>;
}

function StudyPage({ page }: { page:TopicPage }) {
  const slides=page.slides as StudySlide[];
  const hasCurated=slides.some(slide=>!isExactSourceTranscript(slide));
  return <div className="student-topic-page-content">{slides.map(slide=><StudyFragment sourceSlide={slide} collapseExactSource={hasCurated} key={slide.id}/>)}</div>;
}

function PracticePage({ page, topic }: { page:TopicPage; topic:LessonTopic }) {
  const slides=page.slides as StudySlide[];
  const lenses=slides.filter(slide=>!slide.examPractice);
  const checkpoints=slides.filter(slide=>slide.examPractice);
  return <div className="student-topic-page-content student-topic-practice-content">
    {lenses.map(slide=><StudyFragment sourceSlide={slide} key={slide.id}/>)}
    {checkpoints.length>0&&<StudentTopicCheckpoint page={page} topic={topic}/>} 
  </div>;
}

function topicLabel(topic:LessonTopic){return topic.code==='overview'?'Overview':topic.code;}

export function StudentLessons() {
  const route=useRoute();
  const chapterNo=Number(route.params.get('chapter')||0);
  const topicParam=route.params.get('topic');
  const pageParam=route.params.get('page');
  const legacySlideId=route.params.get('slide');
  const chosen=studentStudyChapter(chapterNo);
  const location=useMemo(
    ()=>chosen?resolveStudentStudyLocation(chosen,topicParam,pageParam,legacySlideId):null,
    [chosen,topicParam,pageParam,legacySlideId],
  );

  useEffect(()=>{
    if(!chosen||!location?.legacySlideMatched)return;
    navigate(studentStudyUrl(chosen.number,location.topic.code,location.pageIndex));
  },[chosen,location?.legacySlideMatched,location?.topic.code,location?.pageIndex]);

  if(!chosen)return <section className="student-lessons-library"><header><div><p className="lesson-eyebrow">STUDY MODE</p><h1>Darslar</h1><p>Teacher Studio bilan bir xil source-backed Chapter → Topic → Page tuzilmasi. Har topic kitob sahifalari bo‘yicha o‘qiladi va Past Paper practice bilan yakunlanadi.</p></div><span>{STUDENT_STUDY_CHAPTERS.length} chapter</span></header><div className="student-lessons-grid">{STUDENT_STUDY_CHAPTERS.map(chapter=>{const topics=studentStudyTopics(chapter);const first=studentStudyPages(chapter)[0];const topicCount=topics.filter(topic=>topic.code!=='overview').length;return <button type="button" key={chapter.number} onClick={()=>first&&navigate(studentStudyUrl(chapter.number,first.topic.code,first.pageIndex))}><span className="student-chapter-number">{String(chapter.number).padStart(2,'0')}</span><small>{chapter.level}</small><h2>{chapter.title}</h2><p>{studentFacingText(chapter.subtitle)}</p><div>{chapter.subtopics.map(item=><span key={item}>{item}</span>)}</div><footer><strong>{topicCount} topic</strong><span>O‘rganishni boshlash →</span></footer></button>})}</div></section>;

  if(!location)return null;
  const {topics,flatPages,topic,page,pageIndex,flatIndex}=location;
  const previous=flatIndex>0?flatPages[flatIndex-1]:null;
  const next=flatIndex>=0&&flatIndex<flatPages.length-1?flatPages[flatIndex+1]:null;
  const prevCrossesTopic=Boolean(previous&&previous.topic.code!==topic.code);
  const nextCrossesTopic=Boolean(next&&next.topic.code!==topic.code);
  const accent=(page.slides[0] as StudySlide|undefined)?.accent||'indigo';
  const openPage=(targetTopic:LessonTopic,targetPageIndex:number)=>navigate(studentStudyUrl(chosen.number,targetTopic.code,targetPageIndex));
  const openFlat=(targetIndex:number)=>{const target=flatPages[targetIndex];if(target)openPage(target.topic,target.pageIndex);};
  const sourceIds=pageSlideIds(page);

  return <section className={`student-study-mode student-topic-study-mode accent-${accent}`} data-topic-code={topic.code} data-page-id={page.id} data-page-slide-count={sourceIds.length}>
    <header className="student-study-header"><button type="button" className="secondary" onClick={()=>navigate('oquvchi/darslar')}>← Darslar</button><div><small>{chosen.level} · Chapter {chosen.number} · {topicLabel(topic)}</small><strong>{topic.title}</strong></div><span>{flatIndex+1}/{flatPages.length}</span></header>
    <div className="student-study-progress" aria-hidden="true"><span style={{width:`${((flatIndex+1)/flatPages.length)*100}%`}}/></div>
    <div className="student-study-layout student-topic-layout">
      <aside className="student-study-outline student-topic-outline" aria-label={`Chapter ${chosen.number} topics`}><p>TOPICS</p>{topics.map(item=><section className={`student-topic-group${item.code===topic.code?' active':''}`} key={item.code}><button type="button" className="student-topic-button" aria-current={item.code===topic.code?'true':undefined} onClick={()=>openPage(item,0)}><span>{topicLabel(item)}</span><b>{item.title}</b><small>{item.pages.length}</small></button>{item.code===topic.code&&<div className="student-topic-pages">{item.pages.map((itemPage,itemPageIndex)=><button type="button" className={itemPageIndex===pageIndex?'active':''} aria-current={itemPageIndex===pageIndex?'page':undefined} key={itemPage.id} onClick={()=>openPage(item,itemPageIndex)}><span>{String(itemPageIndex+1).padStart(2,'0')}</span><b>{itemPage.title}</b>{itemPage.kind==='practice'&&<em>Past Paper</em>}</button>)}</div>}</section>)}</aside>
      <main className={`student-study-paper student-topic-paper${page.kind==='practice'?' is-practice':''}`}>
        <header className="student-topic-page-head"><div><span>{topicLabel(topic)} · PAGE {String(pageIndex+1).padStart(2,'0')}</span><h1>{page.title}</h1></div><p>{page.kind==='practice'?'Topic tugadi: endi approved Cambridge Past Paper practice bilan bilimni tekshiring.':'Bu semantic page ichidagi tushuntirish, misol va mashqlarni tugatib keyingi page’ga o‘ting.'}</p></header>
        {page.kind==='practice'?<PracticePage page={page} topic={topic}/>:<StudyPage page={page}/>} 
      </main>
    </div>
    <footer className="student-study-nav student-topic-nav"><button type="button" className="secondary" disabled={!previous} onClick={()=>previous&&openFlat(flatIndex-1)}>{prevCrossesTopic?'← Oldingi topic':'← Oldingi page'}</button><div aria-label={`${topic.code} pages`}>{topic.pages.map((itemPage,itemPageIndex)=><button type="button" key={itemPage.id} aria-label={`${topic.code} page ${itemPageIndex+1}: ${itemPage.title}`} aria-current={itemPageIndex===pageIndex?'page':undefined} className={itemPageIndex===pageIndex?'active':''} onClick={()=>openPage(topic,itemPageIndex)}/>)}</div><button type="button" disabled={!next} onClick={()=>next&&openFlat(flatIndex+1)}>{nextCrossesTopic?'Keyingi topic →':'Keyingi page →'}</button></footer>
  </section>;
}
