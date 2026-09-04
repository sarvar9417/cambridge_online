import { useMemo } from 'react';
import type { Assignment, Flashcard, MasteryItem, ResultItem, User } from '../lib/api';
import { navigate, useRoute } from '../lib/router';
import { StudentAssignments } from './StudentAssignments';
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

type Urgency = 'overdue' | 'today' | 'soon' | 'later';

/** Days until the deadline, floored, so "tomorrow" never rounds to today. */
export function daysUntil(dueAt: string, now = Date.now()) {
  return Math.floor((new Date(dueAt).getTime() - now) / 86_400_000);
}

export function urgencyOf(dueAt: string, now = Date.now()): Urgency {
  const ms = new Date(dueAt).getTime() - now;
  if (ms < 0) return 'overdue';
  if (ms < 86_400_000) return 'today';
  if (ms < 3 * 86_400_000) return 'soon';
  return 'later';
}

const DUE_LABEL: Record<Urgency, string> = {
  overdue: 'Muddati o‘tgan',
  today: 'Bugun',
  soon: 'Yaqin kunda',
  later: 'Keyinroq',
};

/** Open means the student can still work on it. */
export const isOpen = (assignment: Assignment) =>
  !assignment.submissionStatus
  || assignment.submissionStatus === 'not_started'
  || assignment.submissionStatus === 'in_progress';

const greeting = (hour = new Date().getHours()) =>
  hour < 5 ? 'Xayrli tun' : hour < 12 ? 'Xayrli tong' : hour < 18 ? 'Xayrli kun' : 'Xayrli kech';

/**
 * StudentHome remains the routed student landing section, but the dedicated
 * assignments route delegates to StudentAssignments. This keeps the route
 * contract stable while moving the old inline assignment table into a real
 * student workspace without disturbing teacher/admin sections in App.tsx.
 */
export function StudentHome(props: StudentHomeProps) {
  const route = useRoute();
  if (route.page === 'vazifalar') {
    return <StudentAssignments assignments={props.assignments} onStart={props.onStart} />;
  }
  return <StudentHomeDashboard {...props} />;
}

/**
 * The first screen a student sees.
 *
 * It answers the two questions a student actually arrives with: what do I have
 * to do, and am I getting better. Everything displayed here is already loaded
 * for the student; this component only prioritises it.
 */
function StudentHomeDashboard({
  user, assignments, results, mastery, flashcards, onStart, onPractice, practicing,
}: StudentHomeProps) {
  const open = useMemo(
    () => assignments.filter(isOpen).sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt)),
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

  // The weakest subtopics the student has actually attempted. A topic never
  // touched scores zero and would crowd out the ones they are genuinely losing
  // marks on.
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

  return (
    <div className="sh">
      <header className="sh-hero">
        <div>
          <p className="sh-greeting">{greeting()}, {user.fullName.split(' ')[0]}</p>
          <h1>{headline}</h1>
        </div>
        {average !== null ? (
          <div className="sh-average" title="Chiqarilgan natijalar bo‘yicha o‘rtacha">
            <span className="sh-average-value">{average}%</span>
            <span className="sh-average-label">o‘rtacha</span>
          </div>
        ) : null}
      </header>

      <section className="sh-card">
        <div className="sh-card-head">
          <h2>Topshirish kerak</h2>
          {open.length > 3 ? (
            <button type="button" className="sh-link" onClick={() => navigate('oquvchi/vazifalar')}>
              Hammasi ({open.length}) →
            </button>
          ) : null}
        </div>

        {open.length === 0 ? (
          <p className="sh-empty">Hammasi topshirilgan. Bo‘sh vaqtda kartochkalarni takrorlash mumkin.</p>
        ) : (
          <ul className="sh-due">
            {open.slice(0, 3).map((assignment) => {
              const urgency = urgencyOf(assignment.dueAt);
              const days = daysUntil(assignment.dueAt);
              return (
                <li key={assignment.id} className={`sh-due-row sh-due-row--${urgency}`}>
                  <div className="sh-due-text">
                    <strong>{assignment.title}</strong>
                    <small>
                      {assignment.className} · {assignment.totalMarks} ball
                      {assignment.timeLimitMin ? ` · ${assignment.timeLimitMin} daqiqa` : ''}
                    </small>
                  </div>
                  <span className={`sh-due-chip sh-due-chip--${urgency}`}>
                    {urgency === 'overdue' ? `${Math.abs(days)} kun kechikdi`
                      : urgency === 'today' ? 'Bugun'
                        : `${days} kundan keyin`}
                  </span>
                  <button type="button" onClick={() => onStart(assignment.id)}>
                    {assignment.submissionStatus === 'in_progress' ? 'Davom etish' : 'Boshlash'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="sh-cols">
        <section className="sh-card">
          <div className="sh-card-head">
            <h2>Ustida ishlash kerak</h2>
            {mastery.length ? (
              <button type="button" className="sh-link" onClick={() => navigate('oquvchi/organish')}>
                Bilim xaritasi →
              </button>
            ) : null}
          </div>

          {weakest.length === 0 ? (
            <p className="sh-empty">
              Hali yetarli javob yo‘q. Bir nechta vazifa topshirgach, bu yerda qaysi mavzuda
              qiynalayotganing ko‘rinadi.
            </p>
          ) : (
            <ul className="sh-weak">
              {weakest.map((item) => (
                <li key={item.subtopic_id}>
                  <div className="sh-weak-text">
                    <strong>{item.code} {item.title}</strong>
                    <small>{item.marksEarned}/{item.marksPossible} ball · {item.attempts} urinish</small>
                  </div>
                  <div className="sh-weak-track" aria-hidden="true">
                    <i style={{ width: `${Math.round(item.score * 100)}%` }} />
                  </div>
                  <button
                    type="button" disabled={practicing === item.subtopic_id}
                    onClick={() => onPractice(item)}
                  >
                    {practicing === item.subtopic_id ? '…' : 'Mashq'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="sh-stack">
          {flashcards.length ? (
            <section className="sh-card sh-card--action">
              <h2>Kartochkalar</h2>
              <p className="sh-flash-count">{flashcards.length}</p>
              <p className="sh-empty">ta kartochka bugun takrorlanadi</p>
              <button type="button" onClick={() => navigate('oquvchi/organish')}>Takrorlash →</button>
            </section>
          ) : null}

          <section className="sh-card">
            <h2>So‘nggi natijalar</h2>
            {recent.length === 0 ? (
              <p className="sh-empty">Hali natija chiqarilmagan.</p>
            ) : (
              <ul className="sh-results">
                {recent.map((result) => (
                  <li key={result.id}>
                    <div className="sh-result-text">
                      <strong>{result.title}</strong>
                      <small>{result.totalScore}/{result.totalMax}</small>
                    </div>
                    <span className={`sh-score ${result.percentage >= 50 ? 'is-good' : 'is-low'}`}>
                      {Math.round(result.percentage)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {results.length > 3 ? (
              <button type="button" className="sh-link" onClick={() => navigate('oquvchi/natijalar')}>
                Hammasi →
              </button>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
