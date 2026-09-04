import type { PracticeTarget, ResultDetail, ResultItem, User } from '../lib/api';
import { navigate } from '../lib/router';
import { StructuredQuestionView, structuredQuestionAssetsReady, structuredQuestionUsable } from './StructuredQuestionView';
import './student-results.css';

export interface StudentResultsProps {
  user: User;
  results: ResultItem[];
  detail: ResultDetail[] | null;
  openResultId: string | null;
  appealDraft: Record<string, string>;
  onOpen: (id: string) => void;
  onClose: () => void;
  onAppealDraft: (gradingId: string, value: string) => void;
  onAppeal: (item: ResultDetail) => void;
}

export type RemediationTarget = PracticeTarget & {lostMarks:number;questions:number};

export function remediationTargets(detail: ResultDetail[]): RemediationTarget[] {
  const grouped = new Map<string, RemediationTarget>();
  for (const item of detail) {
    const lostMarks = Math.max(0, Number(item.marks) - Number(item.finalScore));
    if (!lostMarks) continue;
    for (const target of item.practiceTargets ?? []) {
      const existing = grouped.get(target.subtopicId);
      if (existing) {
        existing.lostMarks += lostMarks;
        existing.questions += 1;
      } else grouped.set(target.subtopicId, {...target,lostMarks,questions:1});
    }
  }
  return [...grouped.values()].sort((a,b)=>b.lostMarks-a.lostMarks || a.code.localeCompare(b.code,undefined,{numeric:true}));
}

const when = (iso: string) => new Date(iso).toLocaleDateString('uz-UZ', { day:'numeric', month:'long', year:'numeric' });
const practise = (target: PracticeTarget) => navigate(`oquvchi/organish?subtopic=${encodeURIComponent(target.subtopicId)}`);

export function StudentResults({
  user, results, detail, openResultId, appealDraft, onOpen, onClose, onAppealDraft, onAppeal,
}: StudentResultsProps) {
  const average = results.length ? Math.round(results.reduce((sum,item)=>sum+item.percentage,0)/results.length) : null;

  if (detail) {
    const earned=detail.reduce((sum,item)=>sum+item.finalScore,0);
    const total=detail.reduce((sum,item)=>sum+item.marks,0);
    const opened=results.find((result)=>result.id===openResultId);
    const targets=remediationTargets(detail);

    return <div className="sr">
      <header className="sr-detail-head">
        <button type="button" className="sr-back" onClick={onClose}>← Natijalarga</button>
        <div><h1>{opened?.title ?? 'Javoblar tahlili'}</h1><p>{earned}/{total} ball · {detail.length} ta savol</p></div>
      </header>

      {user.role==='student' && targets.length ? <section className="sr-remediation">
        <div><span>KEYINGI QADAM</span><h2>Xatolarimni mashq qilish</h2><p>Yo‘qotilgan ballar aynan shu Cambridge syllabus subtopiclariga bog‘langan.</p></div>
        <div className="sr-remediation-targets">{targets.slice(0,3).map((target)=><button type="button" key={target.subtopicId} onClick={()=>practise(target)}>
          <strong>{target.code} {target.title}</strong><span>{target.lostMarks} yo‘qotilgan ball · {target.questions} savol</span><b>Mashq →</b>
        </button>)}</div>
      </section> : null}

      <ol className="sr-questions">{detail.map((item)=>{
        const full=item.finalScore===item.marks;
        const zero=item.finalScore===0;
        const structuredPresent=item.contentJson!=null;
        const structuredValid=structuredPresent&&item.contentVersion===1&&structuredQuestionUsable(item.contentJson);
        const structuredReady=structuredValid&&structuredQuestionAssetsReady(item.contentJson!,item.assetUrls??{});
        const targetsForQuestion=item.practiceTargets??[];
        return <li key={item.gradingId} className="sr-question">
          <div className="sr-question-head"><span className="sr-ref">{item.displayRef}</span>{structuredReady?<span className="sr-source-backed">Source-backed</span>:null}<span className={`sr-mark ${full?'is-full':zero?'is-zero':'is-part'}`}>{item.finalScore}/{item.marks}</span></div>
          {structuredPresent?<div className="sr-structured-question"><StructuredQuestionView content={item.contentJson!} assetUrls={item.assetUrls}/></div>:<p className="sr-stem">{item.stemMd}</p>}
          <div className="sr-answer"><span className="sr-answer-label">Sening javobing</span><blockquote>{item.answerText||'Javob yozilmagan'}</blockquote></div>
          {item.feedback?<div className="sr-feedback"><span className="sr-feedback-label">Izoh</span><p>{item.feedback}</p></div>:null}
          {item.points.length?<div className="sr-points"><span className="sr-points-label">Ball taqsimoti</span>{item.points.map((point)=><div className={`sr-point${point.matched?' is-awarded':''}`} key={point.code}><span className="sr-point-mark" aria-hidden="true">{point.matched?'✓':'×'}</span><span className="sr-point-text">{point.text}</span><span className="sr-point-marks">{point.matched?`+${point.marks}`:'0'}</span></div>)}</div>:null}
          {user.role==='student'&&!full&&targetsForQuestion.length?<div className="sr-question-practice"><span>Shu xato uchun:</span>{targetsForQuestion.slice(0,2).map((target)=><button type="button" key={target.subtopicId} onClick={()=>practise(target)}>{target.code} mashq →</button>)}</div>:null}
          {user.role==='student' ? item.appealStatus ? <p className={`sr-appeal-status sr-appeal-status--${item.appealStatus}`}>Apellyatsiya: {item.appealStatus==='open'?'ko‘rib chiqilmoqda':item.appealStatus==='accepted'?'qabul qilindi':'rad etildi'}</p> : full ? null : <details className="sr-appeal"><summary>Bahoga rozi emasmisan?</summary><textarea value={appealDraft[item.gradingId]??''} onChange={(event)=>onAppealDraft(item.gradingId,event.target.value)} placeholder="Nima uchun ko‘proq ball olishing kerak deb hisoblaysan? Javobingning qaysi qismini nazarda tutyapsan?"/><button type="button" disabled={!(appealDraft[item.gradingId]??'').trim()} onClick={()=>onAppeal(item)}>Apellyatsiya yuborish</button></details> : null}
        </li>;
      })}</ol>
    </div>;
  }

  return <div className="sr">
    <header className="sr-head"><div><h1>Natijalar</h1><p>{results.length?`${results.length} ta chiqarilgan natija`:'Hali natija yo‘q'}</p></div>{average!==null?<div className="sr-average"><span className="sr-average-value">{average}%</span><span className="sr-average-label">o‘rtacha</span></div>:null}</header>
    {results.length===0?<p className="sr-empty">Vazifa topshirib, o‘qituvchi bahoni chiqargach natijalar shu yerda ko‘rinadi.</p>:<ul className="sr-list">{results.map((result)=><li key={result.id}><button type="button" className="sr-row" onClick={()=>onOpen(result.id)}><div className="sr-row-text"><strong>{result.title}</strong><small>{user.role==='student'?result.className:result.studentName}{' · '}{when(result.releasedAt)}</small></div><div className="sr-row-bar" aria-hidden="true"><i className={result.percentage>=50?'is-good':'is-low'} style={{width:`${Math.max(2,Math.min(100,result.percentage))}%`}}/></div><div className="sr-row-score"><span className={result.percentage>=50?'is-good':'is-low'}>{Math.round(result.percentage)}%</span><small>{result.totalScore}/{result.totalMax}</small></div>{result.grade?<span className="sr-grade">{result.grade}</span>:null}</button></li>)}</ul>}
  </div>;
}
