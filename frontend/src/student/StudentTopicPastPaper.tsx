import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
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

function StudentQuestionCard({ question }: { question:ExamQuestion }) {
  return <article className="student-topic-exam-question">
    <header>
      <strong>{question.displayRef}</strong>
      <span className="student-topic-exam-marks">[{question.marks}]</span>
    </header>
    {question.contextMd&&<p className="student-topic-exam-context">{question.contextMd}</p>}
    <p className="student-topic-exam-stem">{question.stem}</p>
  </article>;
}

export function StudentTopicPastPaper({ page, topic }: { page:TopicPage; topic:LessonTopic }) {
  const checkpoints=useMemo(()=>(page.slides as CheckpointSlide[]).filter(slide=>slide.examPractice),[page]);
  const live=useMemo(()=>checkpoints.filter(slide=>(slide.learningObjectiveCodes??[]).length>0),[checkpoints]);
  const codes=useMemo(()=>[...new Set(live.flatMap(slide=>slide.learningObjectiveCodes??[]))],[live]);
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
      setError(mixedSyllabus?'Past Paper savollarini yuklab bo‘lmadi.':'');
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

  const completeQuestions=questions.filter(question=>!question.hasDiagram&&!question.hasDependency);

  return <section className="student-topic-exam" aria-label={`${topic.code} Past Paper`}>
    {loading&&<div className="student-topic-exam-state">Past Paper savollari yuklanmoqda…</div>}
    {error&&<div className="student-topic-exam-state is-error">{error}</div>}
    {!loading&&!error&&!codes.length&&<div className="student-topic-exam-state">Bu topic uchun Past Paper savoli mavjud emas.</div>}
    {!loading&&!error&&codes.length>0&&!questions.length&&<div className="student-topic-exam-state">Past Paper savoli topilmadi.</div>}
    {!loading&&!error&&questions.length>0&&!completeQuestions.length&&<div className="student-topic-exam-state">Savolni to‘liq ko‘rsatish uchun source context yetarli emas.</div>}
    {completeQuestions.length>0&&<div className="student-topic-exam-list">{completeQuestions.map(question=><StudentQuestionCard question={question} key={question.id}/>)}</div>}
  </section>;
}
