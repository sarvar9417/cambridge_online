import type { Attempt } from '../lib/api';
import { AttemptContext } from '../AttemptContext';
import { StructuredQuestionView, structuredQuestionUsable } from './StructuredQuestionView';
import './student-attempt-workspace.css';

export function formatRemainingTime(seconds: number | null) {
  if (seconds === null) return null;
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`;
}

export const isAnswered = (value: string | undefined) => Boolean(value?.trim());
export const answerWordCount = (value: string | undefined) => value?.trim() ? value.trim().split(/\s+/).length : 0;

export interface StudentAttemptWorkspaceProps {
  attempt: Attempt;
  index: number;
  answers: Record<string, string>;
  remainingSeconds: number | null;
  online: boolean;
  error: string;
  submitConfirm: boolean;
  onBack: () => void;
  onSelect: (index: number) => void;
  onAnswerChange: (questionId: string, value: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onRequestSubmit: () => void;
  onCancelSubmit: () => void;
  onSubmit: () => void;
}

export function StudentAttemptWorkspace({
  attempt, index, answers, remainingSeconds, online, error, submitConfirm,
  onBack, onSelect, onAnswerChange, onPrevious, onNext, onRequestSubmit, onCancelSubmit, onSubmit,
}: StudentAttemptWorkspaceProps) {
  const question = attempt.questions[index];
  if (!question) return null;

  const answeredCount = attempt.questions.filter((item) => isAnswered(answers[item.id])).length;
  const timer = formatRemainingTime(remainingSeconds);
  const expired = remainingSeconds === 0;
  const structuredPresent = question.contentJson != null;
  const structuredReady = structuredPresent
    && question.contentVersion === 1
    && structuredQuestionUsable(question.contentJson);
  const sourceContentBlocked = structuredPresent && !structuredReady;
  const answerDisabled = expired || sourceContentBlocked;

  return (
    <main className="saw">
      <header className="saw-topbar">
        <div className="saw-topbar-left">
          <button type="button" className="saw-back" onClick={onBack} aria-label="Vazifalarga qaytish">←</button>
          <div>
            <strong>Vazifa</strong>
            <small>{attempt.questions.length} ta savol · {answeredCount} ta javob berilgan</small>
          </div>
        </div>
        <div className="saw-topbar-actions">
          <span className={`saw-sync ${online ? 'is-online' : 'is-offline'}`} aria-live="polite">
            {online ? '✓ Sinxronlandi' : '● Oflayn · javoblar qurilmada saqlanmoqda'}
          </span>
          {timer !== null && <time className={`saw-timer${remainingSeconds !== null && remainingSeconds < 300 ? ' is-urgent' : ''}`}>{timer}</time>}
          <button type="button" className="saw-submit" onClick={onRequestSubmit} disabled={expired || sourceContentBlocked}>Topshirish</button>
        </div>
      </header>

      {error && <p className="saw-error" role="alert">{error}</p>}

      <div className="saw-layout">
        <aside className="saw-nav" aria-label="Savollar">
          <div className="saw-nav-head">
            <strong>Savollar</strong>
            <span>{answeredCount}/{attempt.questions.length}</span>
          </div>
          <div className="saw-nav-grid">
            {attempt.questions.map((item, itemIndex) => {
              const answered = isAnswered(answers[item.id]);
              const active = itemIndex === index;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`${active ? 'is-active ' : ''}${answered ? 'is-answered' : ''}`.trim()}
                  aria-current={active ? 'step' : undefined}
                  aria-label={`${itemIndex + 1}-savol${answered ? ', javob berilgan' : ', javobsiz'}`}
                  title={item.displayRef}
                  onClick={() => onSelect(itemIndex)}
                >
                  <span>{itemIndex + 1}</span>
                  {answered && <i aria-hidden="true">✓</i>}
                </button>
              );
            })}
          </div>
          <div className="saw-nav-legend">
            <span><i className="is-current" /> Hozirgi</span>
            <span><i className="is-done" /> Javob berilgan</span>
          </div>
        </aside>

        <section className="saw-paper">
          <div className="saw-question-meta">
            <span>Savol {index + 1}/{attempt.questions.length}</span>
            <span>{question.displayRef}</span>
            {question.commandWord && <strong>{question.commandWord}</strong>}
            {structuredReady && <span className="saw-source-backed">Source-backed</span>}
            <b>{question.marks} ball</b>
          </div>

          <article className="saw-question">
            {structuredReady && question.contentJson ? (
              <StructuredQuestionView content={question.contentJson} assetUrls={question.assetUrls} />
            ) : structuredPresent ? (
              <div className="structured-question-invalid" role="alert">
                Savolning source-backed tarkibini tekshirib bo‘lmadi. Savol to‘liq ko‘rsatilmaguncha javob berish bloklandi.
              </div>
            ) : (
              <>
                {question.contextMd && <AttemptContext value={question.contextMd} />}
                <h1>{question.stemMd}</h1>
              </>
            )}
          </article>

          <section className="saw-answer">
            <div className="saw-answer-head">
              <label htmlFor={`answer-${question.id}`}>Javobing</label>
              <span>{answerWordCount(answers[question.id])} so‘z · avtomatik saqlanadi</span>
            </div>
            <textarea
              id={`answer-${question.id}`}
              className={question.answerKind === 'code' || question.answerKind === 'pseudocode' ? 'is-code' : ''}
              disabled={answerDisabled}
              value={answers[question.id] ?? ''}
              onChange={(event) => onAnswerChange(question.id, event.target.value)}
              placeholder={sourceContentBlocked ? 'Savol tarkibi tekshirilmaguncha javob berib bo‘lmaydi.' : expired ? 'Vaqt tugagan.' : 'Javobingni shu yerga yoz...'}
            />
          </section>

          <nav className="saw-bottom-nav" aria-label="Savollar orasida yurish">
            <button type="button" className="secondary" disabled={index === 0} onClick={onPrevious}>← Oldingi</button>
            <span>{index + 1} / {attempt.questions.length}</span>
            <button type="button" disabled={index === attempt.questions.length - 1} onClick={onNext}>Keyingi →</button>
          </nav>
        </section>
      </div>

      {submitConfirm && (
        <div className="modal-backdrop" role="presentation">
          <section className="submit-dialog saw-submit-dialog" role="dialog" aria-modal="true" aria-labelledby="submit-title">
            <h2 id="submit-title">Topshirishga tayyormisan?</h2>
            <div className="saw-submit-summary">
              <span><strong>{answeredCount}</strong><small>javob berilgan</small></span>
              <span><strong>{attempt.questions.length - answeredCount}</strong><small>javobsiz</small></span>
              <span><strong>{attempt.questions.length}</strong><small>jami savol</small></span>
            </div>
            {answeredCount < attempt.questions.length && (
              <p className="saw-unanswered">
                Javobsiz: {attempt.questions.filter((item) => !isAnswered(answers[item.id])).map((item) => item.displayRef).join(', ')}
              </p>
            )}
            <p>Topshirgandan keyin javoblarni o‘zgartira olmaysan.</p>
            <div>
              <button type="button" className="secondary" onClick={onCancelSubmit}>Ortga</button>
              <button type="button" onClick={onSubmit}>Topshirish</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
