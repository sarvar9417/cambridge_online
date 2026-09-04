import { useMemo } from 'react';
import type { Assignment } from '../lib/api';
import './student-assignments.css';

export type StudentAssignmentBucket = 'in_progress' | 'todo' | 'submitted' | 'completed';

export function studentAssignmentBucket(assignment: Assignment): StudentAssignmentBucket {
  switch (assignment.submissionStatus) {
    case 'in_progress': return 'in_progress';
    case 'submitted': return 'submitted';
    case 'graded':
    case 'released': return 'completed';
    default: return 'todo';
  }
}

export function assignmentDueState(dueAt: string, now = Date.now()) {
  const remaining = new Date(dueAt).getTime() - now;
  if (remaining < 0) return 'overdue' as const;
  if (remaining < 86_400_000) return 'today' as const;
  if (remaining < 3 * 86_400_000) return 'soon' as const;
  return 'later' as const;
}

const when = (iso: string) => new Date(iso).toLocaleString('uz-UZ', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

const dueLabel = (assignment: Assignment) => {
  const state = assignmentDueState(assignment.dueAt);
  if (state === 'overdue') return `Muddati o‘tgan · ${when(assignment.dueAt)}`;
  if (state === 'today') return `Bugun · ${when(assignment.dueAt)}`;
  if (state === 'soon') return `Yaqin muddat · ${when(assignment.dueAt)}`;
  return `Muddat · ${when(assignment.dueAt)}`;
};

const statusLabel = (assignment: Assignment) => {
  switch (assignment.submissionStatus) {
    case 'in_progress': return 'Jarayonda';
    case 'submitted': return 'Topshirildi · baholash kutilmoqda';
    case 'graded': return 'Baholandi';
    case 'released': return 'Natija chiqarildi';
    case 'not_started': return 'Boshlanmagan';
    default: return 'Boshlanmagan';
  }
};

export interface StudentAssignmentsProps {
  assignments: Assignment[];
  onStart: (assignmentId: string) => void;
}

export function StudentAssignments({ assignments, onStart }: StudentAssignmentsProps) {
  const grouped = useMemo(() => {
    const groups: Record<StudentAssignmentBucket, Assignment[]> = {
      in_progress: [], todo: [], submitted: [], completed: [],
    };
    for (const assignment of assignments) groups[studentAssignmentBucket(assignment)].push(assignment);
    groups.in_progress.sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt));
    groups.todo.sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt));
    groups.submitted.sort((a, b) => +new Date(b.dueAt) - +new Date(a.dueAt));
    groups.completed.sort((a, b) => +new Date(b.dueAt) - +new Date(a.dueAt));
    return groups;
  }, [assignments]);

  const outstanding = grouped.todo.length + grouped.in_progress.length;

  const renderCard = (assignment: Assignment) => {
    const bucket = studentAssignmentBucket(assignment);
    const actionable = bucket === 'todo' || bucket === 'in_progress';
    const dueState = assignmentDueState(assignment.dueAt);
    return (
      <article className={`sa-item sa-item--${bucket}`} key={assignment.id}>
        <div className="sa-item-main">
          <div className="sa-item-title">
            <strong>{assignment.title}</strong>
            <span className={`sa-status sa-status--${bucket}`}>{statusLabel(assignment)}</span>
          </div>
          <p>
            {assignment.className} · {assignment.totalMarks} ball
            {assignment.timeLimitMin ? ` · ${assignment.timeLimitMin} daqiqa` : ''}
          </p>
          <small className={`sa-due sa-due--${dueState}`}>{dueLabel(assignment)}</small>
        </div>
        {actionable ? (
          <button type="button" onClick={() => onStart(assignment.id)}>
            {bucket === 'in_progress' ? 'Davom etish' : 'Boshlash'}
          </button>
        ) : (
          <span className="sa-done" aria-label={statusLabel(assignment)}>✓</span>
        )}
      </article>
    );
  };

  return (
    <div className="sa" id="student-assignments">
      <header className="sa-head">
        <div>
          <p className="sa-eyebrow">Vazifalar</p>
          <h1>{outstanding ? `${outstanding} ta vazifa bajarilishi kerak.` : 'Barcha vazifalar topshirilgan.'}</h1>
          <p>Avval jarayondagi ishni tugat, keyin eng yaqin muddatli vazifadan davom et.</p>
        </div>
        <div className="sa-summary" aria-label={`${assignments.length} ta jami vazifa`}>
          <strong>{outstanding}</strong>
          <span>ochiq</span>
        </div>
      </header>

      {assignments.length === 0 ? (
        <section className="sa-empty">
          <h2>Hozircha vazifa yo‘q</h2>
          <p>O‘qituvchi yangi vazifa berganda u shu yerda paydo bo‘ladi.</p>
        </section>
      ) : (
        <div className="sa-sections">
          {grouped.in_progress.length > 0 && (
            <section className="sa-section">
              <div className="sa-section-head"><h2>Jarayonda</h2><span>{grouped.in_progress.length}</span></div>
              <div className="sa-list">{grouped.in_progress.map(renderCard)}</div>
            </section>
          )}

          {grouped.todo.length > 0 && (
            <section className="sa-section">
              <div className="sa-section-head"><h2>Bajarilishi kerak</h2><span>{grouped.todo.length}</span></div>
              <div className="sa-list">{grouped.todo.map(renderCard)}</div>
            </section>
          )}

          {grouped.submitted.length > 0 && (
            <section className="sa-section sa-section--quiet">
              <div className="sa-section-head"><h2>Topshirilgan</h2><span>{grouped.submitted.length}</span></div>
              <div className="sa-list">{grouped.submitted.map(renderCard)}</div>
            </section>
          )}

          {grouped.completed.length > 0 && (
            <section className="sa-section sa-section--quiet">
              <div className="sa-section-head"><h2>Yakunlangan</h2><span>{grouped.completed.length}</span></div>
              <div className="sa-list">{grouped.completed.map(renderCard)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
