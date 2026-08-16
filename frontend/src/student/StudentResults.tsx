import type { ResultDetail, ResultItem, User } from '../lib/api';
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

const when = (iso: string) =>
  new Date(iso).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Where a student finds out why they lost a mark.
 *
 * This is the most educational screen in the product, so it is laid out as
 * reading matter rather than as a table: the question in the serif face, their
 * own answer quoted back, then the mark scheme walked point by point.
 *
 * Green and red carry their one meaning here -- mark awarded, mark not awarded.
 * This is the screen that meaning was reserved for, which is why deadlines and
 * queues elsewhere use amber instead.
 */
export function StudentResults({
  user, results, detail, openResultId, appealDraft, onOpen, onClose, onAppealDraft, onAppeal,
}: StudentResultsProps) {
  const average = results.length
    ? Math.round(results.reduce((sum, item) => sum + item.percentage, 0) / results.length)
    : null;

  if (detail) {
    const earned = detail.reduce((sum, item) => sum + item.finalScore, 0);
    const total = detail.reduce((sum, item) => sum + item.marks, 0);
    const opened = results.find((result) => result.id === openResultId);

    return (
      <div className="sr">
        <header className="sr-detail-head">
          <button type="button" className="sr-back" onClick={onClose}>← Natijalarga</button>
          <div>
            <h1>{opened?.title ?? 'Javoblar tahlili'}</h1>
            <p>{earned}/{total} ball · {detail.length} ta savol</p>
          </div>
        </header>

        <ol className="sr-questions">
          {detail.map((item) => {
            const full = item.finalScore === item.marks;
            const zero = item.finalScore === 0;
            return (
              <li key={item.gradingId} className="sr-question">
                <div className="sr-question-head">
                  <span className="sr-ref">{item.displayRef}</span>
                  <span className={`sr-mark ${full ? 'is-full' : zero ? 'is-zero' : 'is-part'}`}>
                    {item.finalScore}/{item.marks}
                  </span>
                </div>

                <p className="sr-stem">{item.stemMd}</p>

                <div className="sr-answer">
                  <span className="sr-answer-label">Sening javobing</span>
                  <blockquote>{item.answerText || 'Javob yozilmagan'}</blockquote>
                </div>

                {/* Written for the student and, until now, never shown to them. */}
                {item.feedback ? (
                  <div className="sr-feedback">
                    <span className="sr-feedback-label">Izoh</span>
                    <p>{item.feedback}</p>
                  </div>
                ) : null}

                {item.points.length ? (
                  <div className="sr-points">
                    <span className="sr-points-label">Ball taqsimoti</span>
                    {item.points.map((point) => (
                      <div className={`sr-point${point.matched ? ' is-awarded' : ''}`} key={point.code}>
                        <span className="sr-point-mark" aria-hidden="true">{point.matched ? '✓' : '×'}</span>
                        <span className="sr-point-text">{point.text}</span>
                        <span className="sr-point-marks">{point.matched ? `+${point.marks}` : '0'}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {user.role === 'student' ? (
                  item.appealStatus ? (
                    <p className={`sr-appeal-status sr-appeal-status--${item.appealStatus}`}>
                      Apellyatsiya: {item.appealStatus === 'open' ? 'ko‘rib chiqilmoqda'
                        : item.appealStatus === 'accepted' ? 'qabul qilindi' : 'rad etildi'}
                    </p>
                  ) : full ? null : (
                    // Only offered where marks were actually lost: an appeal on
                    // full marks is a form nobody should be invited to fill in.
                    <details className="sr-appeal">
                      <summary>Bahoga rozi emasmisan?</summary>
                      <textarea
                        value={appealDraft[item.gradingId] ?? ''}
                        onChange={(event) => onAppealDraft(item.gradingId, event.target.value)}
                        placeholder="Nima uchun ko‘proq ball olishing kerak deb hisoblaysan? Javobingning qaysi qismini nazarda tutyapsan?"
                      />
                      <button
                        type="button"
                        disabled={!(appealDraft[item.gradingId] ?? '').trim()}
                        onClick={() => onAppeal(item)}
                      >
                        Apellyatsiya yuborish
                      </button>
                    </details>
                  )
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div className="sr">
      <header className="sr-head">
        <div>
          <h1>Natijalar</h1>
          <p>{results.length ? `${results.length} ta chiqarilgan natija` : 'Hali natija yo‘q'}</p>
        </div>
        {average !== null ? (
          <div className="sr-average">
            <span className="sr-average-value">{average}%</span>
            <span className="sr-average-label">o‘rtacha</span>
          </div>
        ) : null}
      </header>

      {results.length === 0 ? (
        <p className="sr-empty">
          Vazifa topshirib, o‘qituvchi bahoni chiqargach natijalar shu yerda ko‘rinadi.
        </p>
      ) : (
        <ul className="sr-list">
          {results.map((result) => (
            <li key={result.id}>
              <button type="button" className="sr-row" onClick={() => onOpen(result.id)}>
                <div className="sr-row-text">
                  <strong>{result.title}</strong>
                  <small>
                    {user.role === 'student' ? result.className : result.studentName}
                    {' · '}{when(result.releasedAt)}
                  </small>
                </div>

                <div className="sr-row-bar" aria-hidden="true">
                  <i
                    className={result.percentage >= 50 ? 'is-good' : 'is-low'}
                    style={{ width: `${Math.max(2, Math.min(100, result.percentage))}%` }}
                  />
                </div>

                <div className="sr-row-score">
                  <span className={result.percentage >= 50 ? 'is-good' : 'is-low'}>
                    {Math.round(result.percentage)}%
                  </span>
                  <small>{result.totalScore}/{result.totalMax}</small>
                </div>

                {result.grade ? <span className="sr-grade">{result.grade}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
