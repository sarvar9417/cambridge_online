import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { api, type ReviewQuestion } from '../lib/api';
import './corpus.css';

type PaperState = 'reviewed' | 'needs_review' | 'running' | 'failed' | 'queued' | 'not_started';

interface CorpusPaper {
  id: string; label: string; year: number; series: string; component: number; variant: number;
  hasMarkScheme: boolean; questions: number; leaves: number; needsReview: number;
  state: PaperState; error: string | null;
}

interface CorpusSummary {
  papers: CorpusPaper[];
  totals: Record<PaperState, number>;
  findings: Array<{ code: string; severity: string; open: number }>;
}

const STATE_LABEL: Record<PaperState, string> = {
  reviewed: 'Tekshirilgan',
  needs_review: 'Tekshirilmagan',
  running: 'Ishlanmoqda',
  failed: 'To‘xtagan',
  queued: 'Navbatda',
  not_started: 'Boshlanmagan',
};

const COMMAND_WORDS = [
  'State', 'Give', 'Name', 'Identify', 'Define', 'Describe', 'Explain', 'Compare',
  'Calculate', 'Complete', 'Draw', 'Write', 'Evaluate', 'Justify', 'Suggest', 'Show', 'Other',
];

/**
 * Building the corpus: which papers are in, which stopped, and what is waiting
 * to be checked.
 *
 * Moved off the single scrolling page. The review queue used to sit between the
 * class list and the grading queue, which mixed the operator's job of getting
 * papers in with the teacher's job of marking answers.
 */
export function CorpusPage() {
  const [summary, setSummary] = useState<CorpusSummary | null>(null);
  const [review, setReview] = useState<ReviewQuestion[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [finding, setFinding] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<PaperState | 'all'>('all');

  const loadReview = useCallback(async (findingCode: string) => {
    const query = findingCode ? `?findingCode=${encodeURIComponent(findingCode)}` : '';
    const result = await api<{ data: ReviewQuestion[] }>(`/ingestion/review${query}`);
    setReview(result.data);
    setReviewIndex(0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<CorpusSummary>('/admin/corpus'),
      api<{ data: ReviewQuestion[] }>('/ingestion/review'),
    ])
      .then(([corpus, queue]) => {
        if (cancelled) return;
        setSummary(corpus);
        setReview(queue.data);
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Yuklanmadi.'); });
    return () => { cancelled = true; };
  }, []);

  const item = review[Math.min(reviewIndex, Math.max(0, review.length - 1))];

  const decide = useCallback(async (id: string, decision: 'approved' | 'rejected') => {
    try {
      await api(`/ingestion/review/${id}/${decision}`, { method: 'POST' });
      setReview((current) => current.filter((entry) => entry.id !== id));
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Qaror saqlanmadi.');
    }
  }, []);

  // Keyboard review, kept from the old screen: the queue is worked through one
  // question at a time and reaching for the mouse each time is the slow part.
  useEffect(() => {
    if (!review.length) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const current = review[Math.min(reviewIndex, review.length - 1)];
      if (!current) return;
      const key = event.key.toLowerCase();
      if (event.key === 'ArrowLeft') setReviewIndex((value) => Math.max(0, value - 1));
      if (event.key === 'ArrowRight' || key === 's') setReviewIndex((value) => Math.min(review.length - 1, value + 1));
      if (key === 'e') setEditing(true);
      if (key === 'a' || key === 'r') {
        event.preventDefault();
        void decide(current.id, key === 'a' ? 'approved' : 'rejected');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [review, reviewIndex, decide]);

  const saveEdit = async (event: FormEvent<HTMLFormElement>, target: ReviewQuestion) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const updated = await api<{ stem_md: string; marks: number | null; command_word: string | null }>(
        `/ingestion/review/${target.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            stemMd: data.get('stemMd'),
            marks: data.get('marks') === '' ? null : Number(data.get('marks')),
            commandWord: data.get('commandWord') || null,
          }),
        },
      );
      setReview((current) => current.map((entry) => (entry.id === target.id
        ? { ...entry, stem_md: updated.stem_md, marks: updated.marks, command_word: updated.command_word }
        : entry)));
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Saqlanmadi.');
    }
  };

  const papers = useMemo(
    () => (summary?.papers ?? []).filter((paper) => stateFilter === 'all' || paper.state === stateFilter),
    [summary, stateFilter],
  );

  const findingCodes = useMemo(
    () => Array.from(new Set(review.flatMap((entry) => entry.findings.map((f) => f.code)))).sort(),
    [review],
  );

  if (error && !summary) return <p className="cp-error" role="alert">{error}</p>;
  if (!summary) return <p className="cp-loading">Yuklanmoqda…</p>;

  return (
    <div className="cp">
      <header className="cp-head">
        <h1>Korpus</h1>
        <p>Paperlarni kiritish va tekshirish. Savol tanlash va vazifa berish — “O‘qitish” bo‘limida.</p>
      </header>

      {error ? <p className="cp-error" role="alert">{error}</p> : null}

      <div className="cp-totals" role="tablist" aria-label="Holat bo‘yicha filtr">
        <button
          role="tab" aria-selected={stateFilter === 'all'}
          className={stateFilter === 'all' ? 'is-active' : ''}
          onClick={() => setStateFilter('all')}
        >
          Hammasi <b>{summary.papers.length}</b>
        </button>
        {(Object.keys(STATE_LABEL) as PaperState[])
          .filter((state) => summary.totals[state] > 0)
          .map((state) => (
            <button
              key={state} role="tab" aria-selected={stateFilter === state}
              className={`${stateFilter === state ? 'is-active' : ''} cp-state--${state}`}
              onClick={() => setStateFilter(state)}
            >
              {STATE_LABEL[state]} <b>{summary.totals[state]}</b>
            </button>
          ))}
      </div>

      <section className="cp-card">
        <h2>Tekshirish navbati</h2>
        {review.length === 0 ? (
          <p className="cp-empty">Navbat bo‘sh — tekshirilmagan savol yo‘q.</p>
        ) : (
          <>
            <div className="cp-review-tools">
              <span className="cp-counter">{Math.min(reviewIndex + 1, review.length)} / {review.length}</span>
              <select
                aria-label="Finding bo‘yicha filtr" value={finding}
                onChange={(event) => { setFinding(event.target.value); void loadReview(event.target.value); }}
              >
                <option value="">Barcha findinglar</option>
                {findingCodes.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
              <button
                className="cp-secondary" title="Oxirgi qarorni qaytarish"
                onClick={async () => { await api('/ingestion/review/undo', { method: 'POST' }); await loadReview(finding); }}
              >
                Qaytarish
              </button>
              <button
                disabled={!finding}
                title={finding ? undefined : 'Avval finding tanlang'}
                onClick={async () => {
                  if (!confirm(`${finding} findingli navbatni tasdiqlaysizmi?`)) return;
                  await api('/ingestion/review/bulk-approve', { method: 'POST', body: JSON.stringify({ findingCode: finding }) });
                  await loadReview(finding);
                }}
              >
                Barchasini tasdiqlash
              </button>
            </div>

            {item ? (
              <article className="cp-review" key={item.id}>
                <div className="cp-review-meta">
                  <strong>{item.display_ref} · {item.marks} ball</strong>
                  <small>{item.command_word} · ishonch {Math.round(Number(item.extract_confidence) * 100)}%</small>
                  <small className="cp-source">{item.storage_path}</small>
                </div>

                {editing ? (
                  <form className="cp-review-edit" onSubmit={(event) => saveEdit(event, item)}>
                    <label>Savol matni
                      <textarea name="stemMd" defaultValue={item.stem_md} minLength={10} required />
                    </label>
                    <label>Ball
                      <input name="marks" type="number" min="0" max="100" defaultValue={item.marks ?? ''} />
                    </label>
                    <label>Command word
                      <select name="commandWord" defaultValue={item.command_word ?? ''}>
                        <option value="">Tanlanmagan</option>
                        {COMMAND_WORDS.map((word) => <option key={word}>{word}</option>)}
                      </select>
                    </label>
                    <div className="cp-review-actions">
                      <button>Saqlash</button>
                      <button type="button" className="cp-secondary" onClick={() => setEditing(false)}>Bekor qilish</button>
                    </div>
                  </form>
                ) : (
                  <p className="cp-stem">{item.stem_md}</p>
                )}

                {item.findings.map((f) => (
                  <span className={`cp-finding cp-finding--${f.severity}`} key={f.id ?? `${f.code}-${f.message}`}>
                    {f.code} · {f.message}
                  </span>
                ))}

                <div className="cp-review-actions">
                  <button
                    className="cp-secondary" disabled={reviewIndex === 0}
                    onClick={() => setReviewIndex((value) => Math.max(0, value - 1))}
                  >←</button>
                  <button className="cp-secondary" onClick={() => setEditing(true)}>Tahrirlash (E)</button>
                  <button onClick={() => decide(item.id, 'approved')}>Tasdiqlash (A)</button>
                  <button className="cp-danger" onClick={() => decide(item.id, 'rejected')}>Rad etish (R)</button>
                  <button
                    className="cp-secondary" disabled={reviewIndex >= review.length - 1}
                    onClick={() => setReviewIndex((value) => Math.min(review.length - 1, value + 1))}
                  >→</button>
                </div>
                <p className="cp-hint">Klaviatura: ← → yurish · E tahrirlash · A tasdiqlash · R rad etish</p>
              </article>
            ) : null}
          </>
        )}
      </section>

      {summary.findings.length ? (
        <section className="cp-card">
          <h2>Ochiq findinglar</h2>
          <p className="cp-sub">Qaysi qoida ishlayotgani — bitta tizimli muammomi yoki ko‘p turlimi</p>
          <div className="cp-findings">
            {summary.findings.map((f) => (
              <span key={f.code} className={`cp-finding cp-finding--${f.severity}`}>
                {f.code} <b>{f.open}</b>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="cp-card">
        <h2>Paperlar</h2>
        <p className="cp-sub">{papers.length} ta ko‘rsatilmoqda</p>
        <div className="cp-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Paper</th><th>MS</th><th>Savol</th><th>Leaf</th><th>Tekshirilmagan</th><th>Holat</th>
              </tr>
            </thead>
            <tbody>
              {papers.map((paper) => (
                <tr key={paper.id} className={`cp-row--${paper.state}`}>
                  <td>{paper.label}</td>
                  <td>{paper.hasMarkScheme ? '✓' : '—'}</td>
                  <td className="num">{paper.questions || '—'}</td>
                  <td className="num">{paper.leaves || '—'}</td>
                  <td className="num">{paper.needsReview || '—'}</td>
                  <td>
                    <span className={`cp-pill cp-pill--${paper.state}`}>{STATE_LABEL[paper.state]}</span>
                    {paper.error ? <small className="cp-row-error">{paper.error}</small> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
