import { navigate, useRoute } from '../lib/router';
import { CHAPTER_7 } from '../teaching/lesson-content-chapter7-complete';
import { Chapter7SlideBody } from '../teaching/Chapter7SlideBody';
import {
  LESSON_CHAPTERS as SOURCE_CHAPTERS,
  type LessonFigure,
  type LessonRichBlock,
  type LessonVisual,
} from '../teaching/lesson-content-source-complete';
import type { LessonSlide as BaseLessonSlide } from '../teaching/lesson-content-full';
import '../teaching/lesson-studio.css';
import '../teaching/lesson-studio-hodder.css';
import '../teaching/chapter7-lesson.css';
import './student-lessons.css';

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
type StudyChapter = (typeof SOURCE_CHAPTERS)[number] | typeof CHAPTER_7;

export const STUDENT_STUDY_CHAPTERS: StudyChapter[] = [...SOURCE_CHAPTERS, CHAPTER_7]
  .sort((a, b) => a.number - b.number);

export function studentStudyChapter(number: number) {
  return STUDENT_STUDY_CHAPTERS.find((chapter) => chapter.number === number) ?? null;
}

export function resolveStudySlideIndex(chapter: StudyChapter, slideId: string | null) {
  if (!slideId) return 0;
  const index = chapter.slides.findIndex((slide) => slide.id === slideId);
  return index < 0 ? 0 : index;
}

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
  if(block.kind==='bullets')return <ul className="hodder-bullets">{block.items.map(item=><li key={item}>{item}</li>)}</ul>;
  if(block.kind==='code')return <div className="hodder-code">{block.title&&<strong>{block.title}</strong>}<pre>{block.lines.join('\n')}</pre></div>;
  if(block.kind==='steps')return <div className="hodder-steps">{block.title&&<strong>{block.title}</strong>}<ol>{block.items.map(item=><li key={item}>{item}</li>)}</ol></div>;
  if(block.kind==='callout')return <aside className={`hodder-callout tone-${block.tone||'info'}`}><span>{block.tone==='extension'?'EXTENSION':block.tone==='activity'?'ACTIVITY':'NOTE'}</span><strong>{block.title}</strong><p>{block.text}</p></aside>;
  if(block.kind==='comparison')return <div className="hodder-comparison"><div><strong>{block.leftTitle}</strong>{block.rows.map(([left],index)=><p key={`${left}-${index}`}>{left}</p>)}</div><div><strong>{block.rightTitle}</strong>{block.rows.map(([,right],index)=><p key={`${right}-${index}`}>{right}</p>)}</div></div>;
  if(block.kind==='source-note')return <aside className="hodder-source-note student-source-note"><header><span>MANBA IZOHI</span><strong>{block.title}</strong></header><div><section><b>{block.sourceLabel}</b><p>{block.sourceText}</p></section><section><b>{block.examSafeLabel}</b><p>{block.examSafeText}</p></section></div></aside>;
  if(block.kind==='figure')return <FigureBlock figure={block.figure}/>;
  return <div className="hodder-table-wrap"><table className="hodder-table"><caption>{block.table.caption}</caption><thead><tr>{block.table.headers.map(header=><th key={header}>{header}</th>)}</tr></thead><tbody>{block.table.rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,index)=><td key={`${rowIndex}-${index}`}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function StudentCheckpoint({ slide }: { slide: StudySlide }) {
  const codes=slide.learningObjectiveCodes??[];
  return <section className="student-checkpoint"><span>CAMBRIDGE CHECKPOINT</span><h2>{slide.title}</h2><p>{slide.checkpointUnavailableReason??slide.lead}</p>{codes.length>0&&<div>{codes.map(code=><code key={code}>{code}</code>)}</div>}<p className="student-checkpoint-safety">Student oynasi diagramma yoki dependency kerak bo‘ladigan past-paper savolini matnning bir qismi bilan ko‘rsatmaydi. Tayyor, to‘liq mashqlar O‘rganish bo‘limida ochiladi.</p><button type="button" onClick={()=>navigate('oquvchi/organish')}>O‘rganish bo‘limiga →</button></section>;
}

function GenericStudySlide({ slide }: { slide: StudySlide }) {
  if(slide.examPractice)return <StudentCheckpoint slide={slide}/>;
  return <div className="student-study-slide-body"><div className="lesson-copy hodder-copy"><p className="lesson-eyebrow">{slide.eyebrow}</p><h1>{slide.title}</h1><p className="lesson-lead">{slide.lead}</p>{slide.formula&&<div className="lesson-formula">{slide.formula}</div>}{slide.bullets&&<ul className="lesson-bullets">{slide.bullets.map(item=><li key={item}>{item}</li>)}</ul>}{slide.keyTerms&&<div className="lesson-terms">{slide.keyTerms.map(item=><article key={item.term}><strong>{item.term}</strong><p>{item.definition}</p></article>)}</div>}{slide.richBlocks&&<div className="hodder-rich-blocks">{slide.richBlocks.map((block,index)=><RichBlock block={block} key={`${block.kind}-${index}`}/>)}</div>}{slide.example&&<div className="lesson-example"><div><span>WORKED EXAMPLE</span><strong>{slide.example.title}</strong></div><ol>{slide.example.lines.map(item=><li key={item}>{item}</li>)}</ol>{slide.example.answer&&<p className="lesson-answer">{slide.example.answer}</p>}</div>}{slide.teacherPrompt&&<aside className="lesson-prompt student-self-check"><span>O‘ZINGNI TEKSHIR</span><p>{slide.teacherPrompt}</p></aside>}{slide.activity&&<details className="lesson-activity"><summary><span>MASHQ</span><strong>{slide.activity.title}</strong></summary><p>{slide.activity.prompt}</p>{slide.activity.reveal&&<div className="lesson-activity-answer"><span>JAVOB / YO‘L-YO‘RIQ</span><p>{slide.activity.reveal}</p></div>}</details>}{slide.sourcePages?.length?<p className="student-source-pages">Manba sahifalari: {slide.sourcePages.join(', ')}</p>:null}</div><Visual kind={slide.visual}/></div>;
}

export function StudentLessons() {
  const route=useRoute();
  const chapterNo=Number(route.params.get('chapter')||0);
  const chosen=studentStudyChapter(chapterNo);
  const sections=chosen?[...new Set(chosen.slides.map(item=>item.section))]:[];

  if(!chosen)return <section className="student-lessons-library"><header><div><p className="lesson-eyebrow">STUDY MODE</p><h1>Darslar</h1><p>Teacher Studio bilan bir xil source-backed lesson ma’lumotlari. Bu ko‘rinish o‘quvchi mustaqil o‘qishi, misollarni ko‘rishi va mashqlarni ochib tekshirishi uchun soddalashtirilgan.</p></div><span>{STUDENT_STUDY_CHAPTERS.length} chapter</span></header><div className="student-lessons-grid">{STUDENT_STUDY_CHAPTERS.map(chapter=><button type="button" key={chapter.number} onClick={()=>navigate(`oquvchi/darslar?chapter=${chapter.number}&slide=${chapter.slides[0]?.id??''}`)}><span className="student-chapter-number">{String(chapter.number).padStart(2,'0')}</span><small>{chapter.level}</small><h2>{chapter.title}</h2><p>{chapter.subtitle}</p><div>{chapter.subtopics.map(item=><span key={item}>{item}</span>)}</div><footer><strong>{chapter.slides.length} qism</strong><span>O‘rganishni boshlash →</span></footer></button>)}</div></section>;

  const slideIndex=resolveStudySlideIndex(chosen,route.params.get('slide'));
  const slide=chosen.slides[slideIndex] as StudySlide|undefined;
  if(!slide)return null;
  const go=(index:number)=>{const target=chosen.slides[Math.max(0,Math.min(chosen.slides.length-1,index))];if(target)navigate(`oquvchi/darslar?chapter=${chosen.number}&slide=${target.id}`)};
  const sectionStarts=sections.map(section=>chosen.slides.findIndex(item=>item.section===section));

  return <section className={`student-study-mode accent-${slide.accent||'indigo'}`}>
    <header className="student-study-header"><button type="button" className="secondary" onClick={()=>navigate('oquvchi/darslar')}>← Chapters</button><div><small>{chosen.level} · Chapter {chosen.number}</small><strong>{chosen.title}</strong></div><span>{slideIndex+1}/{chosen.slides.length}</span></header>
    <div className="student-study-progress" aria-hidden="true"><span style={{width:`${((slideIndex+1)/chosen.slides.length)*100}%`}}/></div>
    <div className="student-study-layout"><aside className="student-study-outline" aria-label="Dars bo‘limlari"><p>BO‘LIMLAR</p>{sections.map((section,index)=><button type="button" className={slide.section===section?'active':''} key={section} onClick={()=>go(sectionStarts[index]??0)}><span>{String(index+1).padStart(2,'0')}</span>{section}</button>)}</aside><main className="student-study-paper">{chosen.number===7&&!slide.examPractice?<Chapter7SlideBody slide={slide}/>:<GenericStudySlide slide={slide}/>}</main></div>
    <footer className="student-study-nav"><button type="button" className="secondary" disabled={slideIndex===0} onClick={()=>go(slideIndex-1)}>← Oldingi</button><div>{chosen.slides.map((item,index)=><button type="button" key={item.id} aria-label={`${index+1}-qism`} className={index===slideIndex?'active':item.section===slide.section?'same-section':''} onClick={()=>go(index)}/>)}</div><button type="button" disabled={slideIndex===chosen.slides.length-1} onClick={()=>go(slideIndex+1)}>Keyingi →</button></footer>
  </section>;
}
