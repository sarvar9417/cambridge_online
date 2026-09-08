import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { navigate } from '../lib/router';
import type { LessonTopic, TopicPage } from '../teaching/lesson-topic-plan';
import type { LessonSlide } from '../teaching/lesson-content-full';

 type CheckpointSlide = LessonSlide & {
  learningObjectiveCodes?: string[];
  checkpointLabel?: string;
  checkpointUnavailableReason?: string;
  checkpointSyllabusCode?: '9618' | '0478';
  checkpointYearFrom?: number;
  checkpointYearTo?: number;
};

type ExamQuestion = {
  id: string;
  displayRef: string;
  stem: string;
  contextMd: string | null;
  marks: number;
  year: number;
  hasDiagram: boolean;
  hasDependency: boolean;
};

type CheckpointResponse = {
  data: ExamQuestion[];
  learningObjectiveCodes: string[];
  yearFrom: number;
  yearTo: number;
};

function StudentQuestionCard({ question, index }: { question:ExamQuestion; index:number }) {
  const requiresSourceContext=question.hasDiagram||question.hasDependency;
  return <article className={`student-topic-exam-question${requiresSourceContext?' requires-source-context':''}`}>
    <header>
      <span className="student-topic-exam-number">{String(index+1).padStart(2,'0')}</span>
      <div><small>{question.year} · Cambridge Past Paper</small><strong>{question.displayRef}</strong></div>
      <b>{question.marks} mark{question.marks===1?'':'s'}</b>
    </header>
    {requiresSourceContext?
      <div className="student-topic-exam-source-guard">
        <strong>To‘liq source context kerak</strong>
        <p>Bu savolda original diagramma yoki oldingi qismga bog‘liqlik bor. Dars sahifasida kesilgan savol ko‘rsatilmaydi.</p>
      </div>
      :<>
        {question.contextMd&&<p className="student-topic-exam-context">{question.contextMd}</p>}
        <p className="student-topic-exam-stem">{question.stem}</p>
      </>}
    <footer>
      <span>{requiresSourceContext?'Incomplete preview blocked':'Exact approved question text'}</span>
      <button type="button" onClick={()=>navigate('oquvchi/organish')}>{requiresSourceContext?'To‘liq savolni ochish →':'Mashqda ishlash →'}</button>
    </footer>
  </article>;
}

export function StudentTopicPastPaper({ page, topic }: { page:TopicPage; topic:LessonTopic }) {
  const checkpoints=useMemo(()=>(page.slides as CheckpointSlide[]).filter(slide=>slide.examPractice),[page]);
  const live=useMemo(()=>checkpoints.filter(slide=>(slide.learningObjectiveCodes??[]).length>0),[checkpoints]);
  const codes=useMemo(()=>[...new Set(live.flatMap(slide=>slide.learningObjectiveCodes??[]))],[live]);
  const unavailable=useMemo(()=>checkpoints.filter(slide=>Boolean(slide.checkpointUnavailableReason)),[checkpoints]);
  const syllabuses=useMemo(()=>[...new Set(live.map(slide=>slide.checkpointSyllabusCode??'9618'))],[live]);
  const syllabusCode=syllabuses[0]??'9618';
  const yearFrom=live.length?Math.min(...live.map(slide=>slide.checkpointYearFrom??2021)):2021;
  const yearTo=live.length?Math.max(...live.map(slide=>slide.checkpointYearTo??2026)):2026;
  const mixedSyllabus=syllabuses.length>1;
  const [questions,setQuestions]=useState<ExamQuestion[]>([]);
  const [loading,setLoading]=useState(Boolean(codes.length));
  const [error,setError]=useState('');

  useEffect(()=>{
    let cancelled=false;
    if(!codes.length||mixedSyllabus){
      setQuestions([]);
      setLoading(false);
      setError(mixedSyllabus?'Bu topic checkpointlari turli syllabuslarni aralashtirib yuborgan.':'');
      return()=>{cancelled=true;};
    }
    (async()=>{
      setLoading(true);
      setError('');
      try{
        const query=new URLSearchParams({yearFrom:String(yearFrom),yearTo:String(yearTo),syllabusCode});
        codes.forEach(code=>query.append('loCodes',code));
        const result=await api<CheckpointResponse>(`/lesson-checkpoints?${query}`);
        if(cancelled)return;
        setQuestions([...new Map(result.data.map(question=>[question.id,question] as const)).values()]);
      }catch(cause){
        if(!cancelled)setError(cause instanceof Error?cause.message:'Past Paper savollarini yuklab bo‘lmadi.');
      }finally{
        if(!cancelled)setLoading(false);
      }
    })();
    return()=>{cancelled=true;};
  },[codes.join('|'),mixedSyllabus,syllabusCode,yearFrom,yearTo]);

  return <section className="student-topic-exam" aria-label={`${topic.code} Past Paper practice`}>
    <header className="student-topic-exam-head">
      <div><span>CAMBRIDGE PAST PAPER</span><h2>{topic.code==='overview'?'Chapter practice':`${topic.code} ${topic.title}`}</h2></div>
      {!loading&&!error&&codes.length>0&&<strong>{questions.length} question{questions.length===1?'':'s'}</strong>}
    </header>
    <p className="student-topic-exam-intro">Topicni o‘rgandingiz. Endi aynan shu topicga source-safe moslangan Cambridge savollari bilan tekshiring.</p>

    {loading&&<div className="student-topic-exam-state">Approved Cambridge savollari yuklanmoqda…</div>}
    {error&&<div className="student-topic-exam-state is-error">{error}</div>}
    {!loading&&!error&&!codes.length&&<div className="student-topic-exam-state">Bu topic uchun exact approved Past Paper savoli hozir mavjud emas. Yaqin, lekin noto‘g‘ri savol bilan almashtirilmadi.</div>}
    {!loading&&!error&&codes.length>0&&!questions.length&&<div className="student-topic-exam-state">Tanlangan yillar oralig‘ida exact approved savol topilmadi.</div>}

    {questions.length>0&&<div className="student-topic-exam-list">{questions.map((question,index)=><StudentQuestionCard question={question} index={index} key={question.id}/>)}</div>}

    {unavailable.length>0&&<aside className="student-topic-exam-note">{unavailable.length} checkpoint mapping uchun exact savol topilmagan; loose substitute qo‘shilmadi.</aside>}
  </section>;
}
