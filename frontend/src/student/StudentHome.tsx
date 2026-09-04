import { useMemo } from 'react';
import type { Assignment, Flashcard, MasteryItem, ResultItem, User } from '../lib/api';
import { navigate } from '../lib/router';
import { StudentNextAction } from './StudentNextAction';
import './student-home.css';

export interface StudentHomeProps {
  user: User;
  assignments: Assignment[];
  results: ResultItem[];
  mastery: MasteryItem[];
  flashcards: Flashcard[];
  onStart: (assignmentId: string) => void;
  onPractice: (item: MasteryItem) => void;
  practicing: string | null;
}

type Urgency = 'none' | 'overdue' | 'today' | 'soon' | 'later';

export function daysUntil(dueAt: string | null, now = Date.now()) {
  if (!dueAt) return null;
  return Math.floor((new Date(dueAt).getTime() - now) / 86_400_000);
}

export function urgencyOf(dueAt: string | null, now = Date.now()): Urgency {
  if (!dueAt) return 'none';
  const ms = new Date(dueAt).getTime() - now;
  if (ms < 0) return 'overdue';
  if (ms < 86_400_000) return 'today';
  if (ms < 3 * 86_400_000) return 'soon';
  return 'later';
}

const DUE_LABEL: Record<Urgency, string> = {
  none: 'Muddat belgilanmagan',
  overdue: 'Muddati o‘tgan',
  today: 'Bugun',
  soon: 'Yaqin kunda',
  later: 'Keyinroq',
};

export const isOpen = (assignment: Assignment) =>
  !assignment.submissionStatus
  || assignment.submissionStatus === 'not_started'
  || assignment.submissionStatus === 'in_progress';

const dueSortValue = (assignment: Assignment) => assignment.dueAt
  ? new Date(assignment.dueAt).getTime()
  : Number.POSITIVE_INFINITY;

const greeting = (hour = new Date().getHours()) =>
  hour < 5 ? 'Xayrli tun' : hour < 12 ? 'Xayrli tong' : hour < 18 ? 'Xayrli kun' : 'Xayrli kech';

export function StudentHome({
  user, assignments, results, mastery, flashcards, onStart, onPractice, practicing,
}: StudentHomeProps) {
  const open = useMemo(
    () => assignments.filter(isOpen).sort((a, b) => dueSortValue(a) - dueSortValue(b)),
    [assignments],
  );
  const next = open[0];
  const recent = useMemo(
    () => [...results].sort((a, b) => +new Date(b.releasedAt) - +new Date(a.releasedAt)).slice(0, 3),
    [results],
  );
  const average = useMemo(() => {
    if (!results.length) return null;
    return Math.round(results.reduce((sum, item) => sum + item.percentage, 0) / results.length);
  }, [results]);
  const weakest = useMemo(
    () => mastery.filter((item) => item.attempts > 0).sort((a, b) => a.score - b.score).slice(0, 3),
    [mastery],
  );
  const overdue = open.filter((item) => urgencyOf(item.dueAt) === 'overdue').length;
  const headline = overdue > 0
    ? `${overdue} ta vazifaning muddati o‘tgan.`
    : next
      ? `Keyingi vazifa: ${DUE_LABEL[urgencyOf(next.dueAt)].toLowerCase()}.`
      : flashcards.length
        ? `${flashcards.length} ta kartochka takrorlashni kutmoqda.`
        : 'Hozircha topshiriladigan vazifa yo‘q.';

  return <div className="sh">
    <header className="sh-hero">
      <div><p className="sh-greeting">{greeting()}, {user.fullName.split(' ')[0]}</p><h1>{headline}</h1></div>
      {average !== null ? <div className="sh-average" title="Chiqarilgan natijalar bo‘yicha o‘rtacha"><span className="sh-average-value">{average}%</span><span className="sh-average-label">o‘rtacha</span></div> : null}
    </header>

    <StudentNextAction assignments={assignments} results={results} mastery={mastery} flashcards={flashcards} onStart={onStart} onPractice={onPractice} />

    <section className="sh-card">
      <div className="sh-card-head"><h2>Topshirish kerak</h2>{open.length > 3 ? <button type="button" className="sh-link" onClick={() => navigate('oquvchi/vazifalar')}>Hammasi ({open.length}) →</button> : null}</div>
      {open.length === 0 ? <p className="sh-empty">Hammasi topshirilgan. Bo‘sh vaqtda kartochkalarni takrorlash mumkin.</p> : <ul className="sh-due">
        {open.slice(0, 3).map((assignment) => {
          const urgency=urgencyOf(assignment.dueAt);
          const days=daysUntil(assignment.dueAt);
          return <li key={assignment.id} className={`sh-due-row sh-due-row--${urgency}`}>
            <div className="sh-due-text"><strong>{assignment.title}</strong><small>{assignment.className} · {assignment.totalMarks} ball{assignment.timeLimitMin ? ` · ${assignment.timeLimitMin} daqiqa` : ''}</small></div>
            <span className={`sh-due-chip sh-due-chip--${urgency}`}>{urgency === 'none' ? 'Muddat yo‘q' : urgency === 'overdue' ? `${Math.abs(days ?? 0)} kun kechikdi` : urgency === 'today' ? 'Bugun' : `${days ?? 0} kundan keyin`}</span>
            <button type="button" onClick={() => onStart(assignment.id)}>{assignment.submissionStatus === 'in_progress' ? 'Davom etish' : 'Boshlash'}</button>
          </li>;
        })}
      </ul>}
    </section>

    <div className="sh-cols">
      <section className="sh-card">
        <div className="sh-card-head"><h2>Ustida ishlash kerak</h2>{mastery.length ? <button type="button" className="sh-link" onClick={() => navigate('oquvchi/organish')}>Bilim xaritasi →</button> : null}</div>
        {weakest.length === 0 ? <p className="sh-empty">Hali yetarli javob yo‘q. Bir nechta vazifa topshirgach, bu yerda qaysi mavzuda qiynalayotganing ko‘rinadi.</p> : <ul className="sh-weak">
          {weakest.map((item) => <li key={item.subtopic_id}>
            <div className="sh-weak-text"><strong>{item.code} {item.title}</strong><small>{item.marksEarned}/{item.marksPossible} ball · {item.attempts} urinish</small></div>
            <div className="sh-weak-track" aria-hidden="true"><i style={{width:`${Math.round(item.score * 100)}%`}} /></div>
            <button type="button" disabled={!item.practiceReady || practicing === item.subtopic_id} title={item.practiceReady ? '5 ta source-backed savol bilan mashq' : `${item.practiceQuestionCount ?? 0}/5 savol tayyor`} onClick={() => onPractice(item)}>{practicing === item.subtopic_id ? '…' : item.practiceReady ? 'Mashq' : 'Pool kutilmoqda'}</button>
          </li>)}
        </ul>}
      </section>

      <div className="sh-stack">
        {flashcards.length ? <section className="sh-card sh-card--action"><h2>Kartochkalar</h2><p className="sh-flash-count">{flashcards.length}</p><p className="sh-empty">ta kartochka bugun takrorlanadi</p><button type="button" onClick={() => navigate('oquvchi/organish')}>Takrorlash →</button></section> : null}
        <section className="sh-card">
          <h2>So‘nggi natijalar</h2>
          {recent.length === 0 ? <p className="sh-empty">Hali natija chiqarilmagan.</p> : <ul className="sh-results">{recent.map((result) => <li key={result.id}><div className="sh-result-text"><strong>{result.title}</strong><small>{result.totalScore}/{result.totalMax}</small></div><span className={`sh-score ${result.percentage >= 50 ? 'is-good' : 'is-low'}`}>{Math.round(result.percentage)}%</span></li>)}</ul>}
          {results.length > 3 ? <button type="button" className="sh-link" onClick={() => navigate('oquvchi/natijalar')}>Hammasi →</button> : null}
        </section>
      </div>
    </div>
  </div>;
}
