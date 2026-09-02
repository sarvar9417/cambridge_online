import { useEffect, useMemo, useState } from 'react';
import { api, type User } from '../lib/api';
import { navigate, useRoute } from '../lib/router';
import { LESSON_CHAPTERS, lessonChapter, type LessonSlide, type LessonVisual } from './lesson-content';
import './lesson-studio.css';

type FilterOptions = { topics: Array<{ subtopic_id:string; code:string; subtopic_title:string }> };
type ExamPart = { id:string; displayRef:string; stem:string; commandWord:string|null; marks:number; year:number; series:string; variant:number };
type QuestionResponse = { data: ExamPart[]; view:'parts'; unavailableFilters:string[]; nextCursor:null };

function Visual({ kind }: { kind?: LessonVisual }) {
  if (!kind) return null;
  const labels: Record<LessonVisual, string[]> = {
    binary:['1','0','1','1','0','0','1','0'], bases:['2','10','16','BCD'], arithmetic:['0110','+0011','=1001'], characters:['A','65','01000001'],
    pixels:['▦','24-bit','1920×1080'], vectors:['○','△','⌁'], sound:['∿','44.1 kHz','16 bit'], compression:['100%','→','28%'],
    types:['ENUM','RECORD','SET'], files:['SERIAL','SEQ','RANDOM'], hashing:['KEY','ƒ(x)','217'], floating:['M','× 2','E'], precision:['PRECISION','↔','RANGE'], recap:['✓','✓','✓'],
  };
  return <div className={`lesson-visual lesson-visual-${kind}`} aria-hidden="true">{labels[kind].map((item,index)=><span key={`${item}-${index}`}>{item}</span>)}</div>;
}

function ExamPractice({ subtopicCode }: { subtopicCode:string }) {
  const [questions,setQuestions]=useState<ExamPart[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setLoading(true);setError('');
      try{
        const options=await api<FilterOptions>('/questions/filter-options');
        const ids=options.topics.filter(item=>item.code===subtopicCode).map(item=>item.subtopic_id);
        if(!ids.length) throw new Error('Subtopic topilmadi.');
        const qs=new URLSearchParams({view:'parts',status:'approved',yearFrom:'2021',yearTo:'2025',hasDiagram:'false',dependency:'independent',limit:'6'});
        ids.forEach(id=>qs.append('subtopicIds',id));
        const result=await api<QuestionResponse>(`/questions?${qs}`);
        if(!cancelled)setQuestions(result.data.slice(0,6));
      }catch(cause){if(!cancelled)setError(cause instanceof Error?cause.message:'Savollar yuklanmadi.');}
      finally{if(!cancelled)setLoading(false);}
    })();
    return()=>{cancelled=true};
  },[subtopicCode]);
  if(loading)return <div className="lesson-loading">Past paper savollari yuklanmoqda…</div>;
  if(error)return <div className="lesson-empty">{error}</div>;
  if(!questions.length)return <div className="lesson-empty">Bu bo‘lim uchun doskada mustaqil ko‘rsatishga tayyor savol topilmadi.</div>;
  return <div className="lesson-exam-grid">{questions.map((q,index)=><article className="lesson-exam-card" key={q.id}>
    <div className="lesson-exam-meta"><span>{q.displayRef}</span><b>{q.marks} ball</b></div>
    <p>{q.stem}</p>
    <footer><span>{q.commandWord||'Question'}</span><span>{q.year}</span></footer>
    <span className="lesson-exam-number">{String(index+1).padStart(2,'0')}</span>
  </article>)}</div>;
}

function SlideBody({ slide }: { slide:LessonSlide }) {
  return <>
    <div className="lesson-copy">
      <p className="lesson-eyebrow">{slide.eyebrow}</p>
      <h1>{slide.title}</h1>
      <p className="lesson-lead">{slide.lead}</p>
      {slide.formula&&<div className="lesson-formula">{slide.formula}</div>}
      {slide.bullets&&<ul className="lesson-bullets">{slide.bullets.map(item=><li key={item}>{item}</li>)}</ul>}
      {slide.keyTerms&&<div className="lesson-terms">{slide.keyTerms.map(item=><article key={item.term}><strong>{item.term}</strong><p>{item.definition}</p></article>)}</div>}
      {slide.example&&<div className="lesson-example"><div><span>WORKED EXAMPLE</span><strong>{slide.example.title}</strong></div><ol>{slide.example.lines.map(item=><li key={item}>{item}</li>)}</ol>{slide.example.answer&&<p className="lesson-answer">{slide.example.answer}</p>}</div>}
      {slide.teacherPrompt&&<aside className="lesson-prompt"><span>DISCUSS</span><p>{slide.teacherPrompt}</p></aside>}
    </div>
    <Visual kind={slide.visual}/>
  </>;
}

export function LessonStudio({ user }: { user:User }) {
  const route=useRoute();
  const chapterNo=Number(route.params.get('chapter')||0);
  const chosen=chapterNo===1||chapterNo===13?lessonChapter(chapterNo):null;
  const [index,setIndex]=useState(0),[presenting,setPresenting]=useState(false);
  const slide=chosen?.slides[index];
  const sections=useMemo(()=>chosen?[...new Set(chosen.slides.map(item=>item.section))]:[],[chosen]);

  useEffect(()=>{setIndex(0)},[chapterNo]);
  useEffect(()=>{
    if(!chosen)return;
    const onKey=(event:KeyboardEvent)=>{
      if(['ArrowRight','PageDown',' '].includes(event.key)){event.preventDefault();setIndex(value=>Math.min(chosen.slides.length-1,value+1));}
      if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();setIndex(value=>Math.max(0,value-1));}
      if(event.key==='Escape'&&presenting)void leavePresenter();
    };
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[chosen,presenting]);
  useEffect(()=>()=>{document.documentElement.classList.remove('lesson-presenting')},[]);

  const enterPresenter=async()=>{setPresenting(true);document.documentElement.classList.add('lesson-presenting');try{await document.documentElement.requestFullscreen?.()}catch{}};
  const leavePresenter=async()=>{setPresenting(false);document.documentElement.classList.remove('lesson-presenting');try{if(document.fullscreenElement)await document.exitFullscreen()}catch{}};

  if(user.role==='student')return null;
  if(!chosen)return <section className="lesson-library">
    <header><div><p className="lesson-eyebrow">TEACHING STUDIO</p><h1>Darslar</h1><p>Hodder coursebook mazmuni Cambridge 9618 syllabus va production past-paper corpus bilan birlashtirilgan classroom lessons.</p></div><span className="lesson-library-badge">2 chapter ready</span></header>
    <div className="lesson-library-grid">{LESSON_CHAPTERS.map(chapter=><button key={chapter.number} className={`lesson-chapter-card chapter-${chapter.number}`} onClick={()=>navigate(`oqitish/darslar?chapter=${chapter.number}`)}>
      <span className="lesson-chapter-no">{String(chapter.number).padStart(2,'0')}</span><span className="lesson-level">{chapter.level}</span><h2>{chapter.title}</h2><p>{chapter.subtitle}</p><div>{chapter.subtopics.map(item=><span key={item}>{item}</span>)}</div><footer><b>{chapter.slides.length} slides</b><span>Ochish →</span></footer>
    </button>)}</div>
  </section>;

  if(!slide)return null;
  const sectionStart=sections.map(section=>chosen.slides.findIndex(item=>item.section===section));
  return <section className={`lesson-studio accent-${slide.accent||'indigo'}${presenting?' is-presenting':''}`}>
    <header className="lesson-toolbar">
      <button className="lesson-back" onClick={()=>navigate('oqitish/darslar')}>← Chapters</button>
      <div className="lesson-toolbar-title"><span>Chapter {chosen.number}</span><strong>{chosen.title}</strong></div>
      <div className="lesson-toolbar-actions"><span>{index+1}/{chosen.slides.length}</span><button onClick={presenting?leavePresenter:enterPresenter}>{presenting?'Presenter’dan chiqish':'Doskada ochish ↗'}</button></div>
    </header>
    <div className="lesson-progress"><span style={{width:`${((index+1)/chosen.slides.length)*100}%`}}/></div>
    <div className="lesson-workspace">
      <aside className="lesson-outline"><p>CHAPTER {chosen.number}</p>{sections.map((section,i)=><button className={slide.section===section?'active':''} key={section} onClick={()=>setIndex(sectionStart[i]!)}><span>{String(i+1).padStart(2,'0')}</span>{section}</button>)}</aside>
      <main className={`lesson-slide${slide.examPractice?' lesson-slide-exam':''}`}>
        {slide.examPractice&&slide.subtopicCode?<div className="lesson-exam-slide"><div className="lesson-exam-intro"><p className="lesson-eyebrow">{slide.eyebrow}</p><h1>{slide.title}</h1><p>{slide.lead}</p></div><ExamPractice subtopicCode={slide.subtopicCode}/></div>:<SlideBody slide={slide}/>} 
        <div className="lesson-slide-watermark">CamPath · {chosen.level}</div>
      </main>
    </div>
    <footer className="lesson-nav"><button disabled={index===0} onClick={()=>setIndex(value=>Math.max(0,value-1))}>← Oldingi</button><div>{chosen.slides.map((item,i)=><button key={item.id} aria-label={`${i+1}-slide`} className={i===index?'active':item.section===slide.section?'same-section':''} onClick={()=>setIndex(i)}/>)}</div><button disabled={index===chosen.slides.length-1} onClick={()=>setIndex(value=>Math.min(chosen.slides.length-1,value+1))}>Keyingi →</button></footer>
  </section>;
}
