import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { shuffleItems, type GamePair, type QuizQuestion } from './game-content';
import { formatClock, useGameAdvance, useGameSignal, type RecordAnswer } from './game-session';
import { AnswerCards } from './AnswerCards';

export type BoxMode = 'simple' | 'questions';

export function OpenBox({ pairs, questions, mode, onModeChange, blocked, recordAnswer }: {
  pairs: readonly GamePair[];
  questions: readonly QuizQuestion[];
  mode: BoxMode;
  onModeChange: (mode: BoxMode) => void;
  blocked: boolean;
  recordAnswer: RecordAnswer;
}) {
  const signal = useGameSignal();
  const [opened, setOpened] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [shuffle, setShuffle] = useState(false);
  const [autoReturn, setAutoReturn] = useState(true);
  const [questionTime, setQuestionTime] = useState(30);
  const [remainingMs, setRemainingMs] = useState(30_000);
  const heading = useRef<HTMLHeadingElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const returnFocus = useRef(false);
  const board = useMemo(() => shuffle ? shuffleItems(pairs) : pairs, [pairs, shuffle]);
  const active = selected === null ? null : board[selected];
  const question = mode === 'questions' && active ? questions.find((item) => item.id === 'quiz-' + active.id) : undefined;
  const answer = question ? answers[question.id] ?? null : null;
  const count = mode === 'questions' ? Object.keys(answers).length : opened.length;
  const settingsLocked = count > 0 || selected !== null;

  const submit = useCallback((index: number) => {
    if (blocked || !question || answer !== null) return;
    const correct = index === question.answerIndex;
    setAnswers((previous) => ({ ...previous, [question.id]: index }));
    recordAnswer({ id: question.id, prompt: question.prompt, submitted: question.options[index] ?? 'Time expired',
      expected: question.options[question.answerIndex]!, correct });
    signal(correct ? 'correct' : 'incorrect');
  }, [blocked, question, answer, recordAnswer, signal]);

  // Measure elapsed wall-clock time, not interval count. Browser throttling in
  // background tabs must not grant extra time; Pause freezes remaining time.
  useEffect(() => {
    if (blocked || !question || !questionTime || answer !== null) return;
    const deadline = Date.now() + remainingMs;
    const timer = window.setInterval(() =>
      setRemainingMs(Math.max(0, deadline - Date.now())), 200);
    return () => window.clearInterval(timer);
  }, [blocked, question?.id, questionTime, answer]);

  useEffect(() => {
    if (questionTime && remainingMs === 0) submit(-1);
  }, [questionTime, remainingMs, submit]);

  useEffect(() => {
    if (blocked) return;
    if (selected !== null) heading.current?.focus();
    else if (returnFocus.current) {
      grid.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
      returnFocus.current = false;
    }
  }, [selected, blocked]);

  function closeQuestion() {
    if (blocked || answer === null) return;
    returnFocus.current = true;
    setSelected(null);
    if (count === pairs.length) signal('complete');
  }
  useGameAdvance(autoReturn && Boolean(question) && answer !== null && !blocked, closeQuestion);

  function open(pair: GamePair, index: number) {
    if (blocked) return;
    if (mode === 'questions') {
      if (answers['quiz-' + pair.id] !== undefined) return;
      setRemainingMs(questionTime * 1000);
      setSelected(index);
      signal('open');
    } else if (opened.includes(pair.id)) {
      setRevealed((previous) => previous.includes(pair.id) ? previous.filter((id) => id !== pair.id) : [...previous, pair.id]);
      signal('flip');
    } else {
      setOpened((previous) => [...previous, pair.id]);
      signal('open');
      signal('review');
    }
  }

  if (!pairs.length) return <p>No challenge boxes available.</p>;
  return <div className="ig-content">
    <p className="ig-instruction">{mode === 'questions' ? 'Choose a box and answer its question.' : 'Tap a box to reveal its term. Tap the open box again to see its definition.'}</p>
    <div className="ig-template-options" role="group" aria-label="Open the Box options">
      {questions.length > 0 && <label>Box type <select value={mode} disabled={settingsLocked}
        onChange={(event) => onModeChange(event.target.value === 'questions' ? 'questions' : 'simple')}>
        <option value="simple">Simple boxes</option><option value="questions">Boxes with questions</option>
      </select></label>}
      <label><input type="checkbox" disabled={settingsLocked} checked={shuffle} onChange={(event) => setShuffle(event.target.checked)} /> Shuffle boxes</label>
      {mode === 'questions' && <>
        <label>Time per question <select value={questionTime} disabled={settingsLocked} onChange={(event) => setQuestionTime(Number(event.target.value))}>
          <option value="0">No limit</option><option value="15">15 seconds</option><option value="30">30 seconds</option><option value="60">60 seconds</option>
        </select></label>
        <label><input type="checkbox" checked={autoReturn} onChange={(event) => setAutoReturn(event.target.checked)} /> Automatically return to boxes</label>
      </>}
    </div>
    <div className="ig-score">{count} / {pairs.length} boxes {mode === 'questions' ? 'answered' : 'opened'}</div>
    {question ? <div className="ig-box-detail ig-box-question">
      <div>
        <span className="ig-eyebrow">BOX {selected! + 1}</span>
        {questionTime > 0 && <span className="ig-box-clock" role="timer">Question time · {formatClock(Math.ceil(remainingMs / 1000))}</span>}
        <h3 ref={heading} tabIndex={-1}>{question.prompt}</h3>
      </div>
      <AnswerCards options={question.options} answer={answer} correctIndex={question.answerIndex} blocked={blocked} onChoose={submit} />
      {answer !== null && <div className="ig-box-actions">
        <p className="ig-reveal" role="status">{answer === question.answerIndex ? 'Correct!' : answer < 0 ? "Time's up!" : 'Incorrect.'}
          {' '}Correct answer · {question.options[question.answerIndex]}</p>
        <button type="button" onClick={closeQuestion}>Back to boxes</button>
      </div>}
    </div> : <>
      <div className="ig-box-grid" ref={grid}>{board.map((pair, index) => {
        const questionId = 'quiz-' + pair.id;
        const recorded = answers[questionId];
        const marked = recorded !== undefined;
        const correct = marked && recorded === questions.find((item) => item.id === questionId)?.answerIndex;
        const isOpen = opened.includes(pair.id) || marked;
        return <button type="button" key={pair.id} disabled={marked}
          className={'ig-box ig-color-' + (index % 6) + (isOpen ? ' is-opened' : '') + (marked && !correct ? ' is-wrong' : '')}
          onClick={() => open(pair, index)}>
          <span>{index + 1}</span>
          <strong>{marked ? pair.definition : isOpen ? pair.term : 'Tap to open'}</strong>
          {marked && <small>{correct ? '✓ Correct' : recorded < 0 ? '✕ Time expired' : '✕ Incorrect'}</small>}
          {revealed.includes(pair.id) && <small>{pair.definition}</small>}
        </button>;
      })}</div>
      {mode === 'simple' && count === pairs.length && <div className="ig-box-actions">
        <button type="button" className="ig-primary-button" onClick={() => signal('complete')}>Finish boxes</button>
      </div>}
    </>}
  </div>;
}
