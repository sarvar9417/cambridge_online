import { useEffect, useState } from 'react';
import type { ClassItem, GradingItem } from '../lib/api';
import './grading-queue.css';

export type GradingView = 'by_question' | 'by_student' | 'confidence';

export interface GradingQueueProps {
  items: GradingItem[];
  classes: ClassItem[];
  classId: string;
  view: GradingView;
  onClassChange: (classId: string) => void;
  onViewChange: (view: GradingView) => void;
  onTogglePoint: (item: GradingItem, pointId: string, matched: boolean) => void;
  onSetScore: (item: GradingItem, score: number) => void;
  onRelease: (item: GradingItem) => void;
}

/** What the ticked points add up to, which is the mark about to be released. */
export function scoreOf(item: GradingItem) {
  return item.points.reduce((sum, point) => sum + (point.matched ? point.marks : 0), 0);
}

const VIEWS: Array<{ id: GradingView; label: string; hint: string }> = [
  { id: 'by_question', label: 'Savol', hint: 'Bir savolni hamma o‘quvchida ketma-ket' },
  { id: 'by_student', label: 'O‘quvchi', hint: 'Bir o‘quvchining hamma javobi ketma-ket' },
  { id: 'confidence', label: 'Ishonch past', hint: 'AI eng ikkilangani birinchi' },
];

/**
 * Marking one answer at a time.
 *
 * The queue is worked through in a sitting, so it is built around one answer
 * rather than a list of them: the current one is large and readable, the rest
 * are a count. The question and the answer are set in the serif face because
 * they are read; the mark scheme is interface and stays in the UI face.
 *
 * Grouping matters more than it looks. Marking one question across every
 * student keeps the same mark scheme in the teacher's head and is far faster
 * than moving between questions, which is why that is the default.
 */
export function GradingQueue({
  items, classes, classId, view,
  onClassChange, onViewChange, onTogglePoint, onSetScore, onRelease,
}: GradingQueueProps) {
  const [index, setIndex] = useState(0);
  const position = Math.min(index, Math.max(0, items.length - 1));
  const item = items[position];

  // Changing filter or view rebuilds the queue, so the cursor has to go back to
  // the start or it lands on an answer the teacher did not choose.
  useEffect(() => { setIndex(0); }, [classId, view]);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'ArrowLeft') setIndex((value) => Math.max(0, value - 1));
      if (event.key === 'ArrowRight') setIndex((value) => Math.min(items.length - 1, value + 1));
      // Digits tick mark points, which is the whole job: 1 for MP1, 2 for MP2.
      const digit = Number(event.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= item.points.length) {
        const point = item.points[digit - 1]!;
        onTogglePoint(item, point.id, !point.matched);
      }
      if (event.key.toLowerCase() === 'c') { event.preventDefault(); onRelease(item); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, items.length, onTogglePoint, onRelease]);

  return (
    <div className="gq">
      <header className="gq-head">
        <div>
          <h1>Tekshirish</h1>
          <p>{items.length ? `${items.length} ta javob kutmoqda` : 'Navbat bo‘sh'}</p>
        </div>

        <div className="gq-tools">
          <select
            aria-label="Sinf bo‘yicha filtr" value={classId}
            onChange={(event) => onClassChange(event.target.value)}
          >
            <option value="">Barcha sinflar</option>
            {classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.name}</option>)}
          </select>
          <div className="gq-segmented" role="group" aria-label="Tekshirish tartibi">
            {VIEWS.map((option) => (
              <button
                key={option.id} type="button" title={option.hint}
                className={view === option.id ? 'is-active' : ''}
                aria-pressed={view === option.id}
                onClick={() => onViewChange(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {!item ? (
        <p className="gq-empty">
          Tekshiriladigan javob yo‘q. O‘quvchilar topshirgach ular shu yerda paydo bo‘ladi.
        </p>
      ) : (
        <>
          <div className="gq-progress">
            <div className="gq-bar" aria-hidden="true">
              <i style={{ width: `${((position + 1) / items.length) * 100}%` }} />
            </div>
            <span>{position + 1} / {items.length}</span>
          </div>

          <article className="gq-card" key={item.id}>
            <div className="gq-card-head">
              <div>
                <strong>{item.studentName}</strong>
                <small>{item.displayRef} · {item.marks} ball</small>
              </div>
              <span className="gq-score">
                <b>{scoreOf(item)}</b>/{item.marks}
              </span>
            </div>

            <p className="gq-stem">{item.stemMd}</p>

            <div className="gq-answer">
              <span className="gq-label">O‘quvchining javobi</span>
              <blockquote>{item.text || 'Javob yozilmagan'}</blockquote>
            </div>

            {item.points.length > 0 ? (
              <div className="gq-points">
                <span className="gq-label">Mark scheme</span>
                {item.points.map((point, order) => (
                  <label key={point.id} className={`gq-point${point.matched ? ' is-awarded' : ''}`}>
                    <input
                      type="checkbox" checked={Boolean(point.matched)}
                      onChange={(event) => onTogglePoint(item, point.id, event.target.checked)}
                    />
                    <kbd>{order + 1}</kbd>
                    <span className="gq-point-text"><strong>{point.code}</strong> {point.text}</span>
                    <span className="gq-point-marks">{point.marks}</span>
                  </label>
                ))}
              </div>
            ) : (
              <label className="gq-manual">
                <span className="gq-label">Ball</span>
                <span>
                  <input
                    type="number" min={0} max={item.marks} defaultValue={0}
                    onBlur={(event) => onSetScore(item, Number(event.target.value))}
                  />
                  {' / '}{item.marks}
                </span>
                <small>Bu savolda mark scheme yo‘q, ballni o‘zingiz qo‘yasiz.</small>
              </label>
            )}

            <div className="gq-actions">
              <button
                type="button" className="gq-secondary" disabled={position === 0}
                onClick={() => setIndex((value) => Math.max(0, value - 1))}
              >←</button>
              <button type="button" className="gq-primary" onClick={() => onRelease(item)}>
                Natijani chiqarish (C)
              </button>
              <button
                type="button" className="gq-secondary" disabled={position >= items.length - 1}
                onClick={() => setIndex((value) => Math.min(items.length - 1, value + 1))}
              >→</button>
            </div>

            <p className="gq-hint">
              Klaviatura: ← → javoblar orasida · 1…{Math.max(1, item.points.length)} ball nuqtasini belgilash ·
              C natijani chiqarish
            </p>
          </article>
        </>
      )}
    </div>
  );
}
