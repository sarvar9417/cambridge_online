import { useMemo, useState, type FormEvent } from 'react';
import type { Assignment, ClassItem, ExportItem } from '../lib/api';
import { navigate } from '../lib/router';
import './teacher-assignments.css';

export interface TeacherAssignmentsProps {
  assignments: Assignment[];
  classes: ClassItem[];
  exports: ExportItem[];
  filterClassId: string;
  generating: boolean;
  onToggleGenerate: () => void;
  onGenerate: (event: FormEvent<HTMLFormElement>) => void;
  onExport: (assignmentId: string, kind: 'question_paper' | 'combined') => void;
  onDownload: (item: ExportItem) => void;
}

type State = 'draft' | 'open' | 'closed';

const when = (iso: string | null) => (iso
  ? new Date(iso).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '—');

export function stateOf(assignment: Assignment, now = Date.now()): State {
  if (!assignment.publishedAt) return 'draft';
  if (assignment.dueAt && new Date(assignment.dueAt).getTime() < now) return 'closed';
  return 'open';
}

const STATE_LABEL: Record<State, string> = {
  draft: 'Nashr qilinmagan',
  open: 'Ochiq',
  closed: 'Yopilgan',
};

const EXPORT_LABEL: Record<ExportItem['kind'], string> = {
  question_paper: 'Savollar PDF',
  mark_scheme: 'Mark scheme PDF',
  combined: 'Savollar va mark scheme',
  feedback: 'Natija PDF',
};

const EXPORT_STATUS: Record<ExportItem['status'], string> = {
  queued: 'Navbatda', running: 'Tayyorlanmoqda', succeeded: 'Tayyor', failed: 'Xato',
};

/**
 * The teacher's assignments.
 *
 * The list used to be a title, a mark total and two export buttons, which left
 * out everything a teacher opens this screen to find: whether it is live, when
 * it closes, how many have handed it in and how much is waiting to be marked.
 *
 * There were also two ways to build one. The manual form offered checkboxes
 * against the first twenty questions in the bank -- no filters, no search, no
 * dependency check -- next to a question bank that does all of it properly.
 * That form is gone; the button goes to the bank.
 */
export function TeacherAssignments({
  assignments, classes, exports, filterClassId,
  generating, onToggleGenerate, onGenerate, onExport, onDownload,
}: TeacherAssignmentsProps) {
  const [showDone, setShowDone] = useState(false);

  const filtered = useMemo(() => {
    const rows = assignments.filter((item) => showDone || stateOf(item) !== 'closed');
    return [...rows].sort((a, b) => {
      // Anything waiting to be marked comes first: it is the only thing on this
      // screen with someone waiting at the other end of it.
      if ((b.pendingGrading > 0 ? 1 : 0) !== (a.pendingGrading > 0 ? 1 : 0)) {
        return (b.pendingGrading > 0 ? 1 : 0) - (a.pendingGrading > 0 ? 1 : 0);
      }
      return +new Date(a.dueAt ?? 0) - +new Date(b.dueAt ?? 0);
    });
  }, [assignments, showDone]);

  const closedCount = assignments.filter((item) => stateOf(item) === 'closed').length;
  const classNameFor = classes.find((item) => item.id === filterClassId)?.name;
  const recentExports = exports.slice(0, 4);

  return (
    <div className="ta">
      <header className="ta-head">
        <div>
          <h1>Vazifalar{classNameFor ? ` · ${classNameFor}` : ''}</h1>
          <p>
            {filtered.length
              ? `${filtered.length} ta ko‘rsatilmoqda${closedCount ? ` · ${closedCount} yopilgan` : ''}`
              : 'Hali vazifa berilmagan'}
          </p>
        </div>
        <div className="ta-actions">
          <button type="button" onClick={onToggleGenerate}>
            {generating ? 'Bekor qilish' : 'Avto yaratish'}
          </button>
          <button
            type="button" className="ta-primary"
            onClick={() => navigate(`oqitish/savol-banki${filterClassId ? `?sinf=${filterClassId}` : ''}`)}
          >
            Savol bankidan tuzish
          </button>
        </div>
      </header>

      {generating ? (
        <form className="ta-form" onSubmit={onGenerate}>
          <p className="ta-note">
            Belgilangan ballga yetguncha savollarni o‘zi tanlaydi. Aniq savollarni o‘zingiz
            tanlamoqchi bo‘lsangiz, savol bankidan foydalaning.
          </p>
          <label>Sinf
            <select name="classId" defaultValue={filterClassId || undefined}>
              {classes.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Nomi<input name="title" minLength={3} required /></label>
          <label>Maqsad ball
            <input name="targetMarks" type="number" min="1" max="100" defaultValue="25" required />
          </label>
          <label className="ta-check">
            <input name="excludeSeen" type="checkbox" defaultChecked /> Ko‘rilgan savollarni chiqarish
          </label>
          <label className="ta-check">
            <input name="excludeDiagrams" type="checkbox" /> Diagrammasiz
          </label>
          <button className="ta-primary">Yaratish</button>
        </form>
      ) : null}

      {filtered.length === 0 ? (
        <p className="ta-empty">
          Savol bankidan savol tanlab vazifa tuzing, yoki maqsad ballni aytib avtomatik yaratishga
          qo‘ying.
        </p>
      ) : (
        <ul className="ta-list">
          {filtered.map((assignment) => {
            const state = stateOf(assignment);
            const handedIn = assignment.classSize
              ? Math.round((assignment.submittedCount / assignment.classSize) * 100) : 0;
            return (
              <li key={assignment.id} className={`ta-row ta-row--${state}`}>
                <div className="ta-row-main">
                  <div className="ta-row-text">
                    <strong>{assignment.title}</strong>
                    <small>
                      {assignment.className} · {assignment.totalMarks} ball
                      {assignment.timeLimitMin ? ` · ${assignment.timeLimitMin} daqiqa` : ''}
                      {assignment.mode !== 'online' ? ` · ${assignment.mode}` : ''}
                    </small>
                  </div>
                  <span className={`ta-state ta-state--${state}`}>{STATE_LABEL[state]}</span>
                </div>

                <div className="ta-progress">
                  <div className="ta-bar" role="img"
                    aria-label={`${assignment.classSize} o‘quvchidan ${assignment.submittedCount} tasi topshirdi`}>
                    <i style={{ width: `${handedIn}%` }} />
                  </div>
                  <span className="ta-figures">
                    <b>{assignment.submittedCount}</b>/{assignment.classSize} topshirdi
                    {' · '}muddat {when(assignment.dueAt)}
                  </span>
                </div>

                <div className="ta-row-actions">
                  {assignment.pendingGrading > 0 ? (
                    <button
                      type="button" className="ta-primary"
                      onClick={() => navigate(`oqitish/tekshirish?sinf=${assignment.classId}`)}
                    >
                      Tekshirish · {assignment.pendingGrading}
                    </button>
                  ) : null}
                  <button type="button" onClick={() => onExport(assignment.id, 'question_paper')}>
                    Savollar PDF
                  </button>
                  <button type="button" onClick={() => onExport(assignment.id, 'combined')}>
                    Savol + MS
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {closedCount > 0 ? (
        <button type="button" className="ta-link" onClick={() => setShowDone((value) => !value)}>
          {showDone ? 'Yopilganlarni yashirish' : `Yopilganlarni ko‘rsatish (${closedCount})`}
        </button>
      ) : null}

      {recentExports.length ? (
        <section className="ta-exports" aria-live="polite">
          <h2>PDF tayyorlash</h2>
          {recentExports.map((item) => (
            <div className="ta-export" key={item.id}>
              <div>
                <strong>{EXPORT_LABEL[item.kind]}</strong>
                <small>{new Date(item.created_at).toLocaleString('uz-UZ')}</small>
              </div>
              <span className={`ta-export-status status-${item.status}`}>{EXPORT_STATUS[item.status]}</span>
              {item.status === 'succeeded'
                ? <button type="button" onClick={() => onDownload(item)}>Yuklab olish</button>
                : null}
              {item.error ? <small className="ta-export-error">{item.error}</small> : null}
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
