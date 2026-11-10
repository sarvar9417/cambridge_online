import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { formatClock, useGameAdvance, useGameSignal, type RecordAnswer } from './game-session';
import { AnswerCards } from './AnswerCards';
import {
  chapter7Pilot, findMatchOptions, scrambleTerm, shuffleItems,
  type GamePair, type QuizQuestion, type SpeakingPrompt,
} from './game-content';

/**
 * Pilot practice only. No answers here are persisted as assessed evidence.
 * Speaking cards present oral prompts but cannot verify actual spoken delivery.
 */
export function SpeakingCards({ prompts }: { prompts: readonly SpeakingPrompt[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const item = prompts[index];
  if (!item) return <p>No speaking prompts available.</p>;
  const go = (next: number) => { setIndex(next); setRevealed(false); };
  return <div className="ig-content">
    <p className="ig-instruction">Read the card and answer aloud in your own words. Reveal the talking points only after speaking. This page does not record or verify audio.</p>
    <div className="ig-score">Speaking prompt {index + 1} / {prompts.length}</div>
    <div className="ig-speaking-card">
      <span className="ig-eyebrow">SPEAKING CHALLENGE</span>
      <h3>{item.prompt}</h3>
      {revealed && <div className="ig-reveal" role="status"><strong>Suggested talking points</strong><p>{item.talkingPoints}</p></div>}
    </div>
    <div className="ig-card-controls">
      <button type="button" disabled={index === 0} onClick={() => go(index - 1)}>← Previous</button>
      <button type="button" onClick={() => setRevealed((value) => !value)}>{revealed ? 'Hide talking points' : 'Reveal talking points'}</button>
      <button type="button" disabled={index === prompts.length - 1} onClick={() => go(index + 1)}>Next →</button>
    </div>
  </div>;
}

/** A Quiz question has its own clock, independently of the optional whole-round timer. */
export const QUIZ_QUESTION_SECONDS = 30;
const QUIZ_QUESTION_MS = QUIZ_QUESTION_SECONDS * 1000;

type QuizResponse = { first: number | null; answer: number | null };

export function Quiz({ questions, blocked, recordAnswer }: {
  questions: readonly QuizQuestion[]; blocked: boolean; recordAnswer: RecordAnswer;
}) {
  const signal = useGameSignal();
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, QuizResponse>>({});
  const [correct, setCorrect] = useState(0);
  const [auto, setAuto] = useState(true);
  const [retry, setRetry] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(false);
  const ordered = useMemo(() => shuffleQuestions ? shuffleItems(questions) : questions, [questions, shuffleQuestions]);
  const question = ordered[index];
  const response = question ? responses[question.id] : undefined;
  const firstChoice = response?.first ?? null;
  const answer = response?.answer ?? null;
  const [clock, setClock] = useState({ id: questions[0]?.id ?? '', remainingMs: QUIZ_QUESTION_MS });
  const remainingByQuestion = useRef<Record<string, number>>({});
  const activeDeadline = useRef<{ id: string; value: number } | null>(null);
  const recordedTimeouts = useRef(new Set<string>());
  const remainingMs = question
    ? clock.id === question.id ? clock.remainingMs : remainingByQuestion.current[question.id] ?? QUIZ_QUESTION_MS
    : 0;
  const options = useMemo(() => {
    const indexes = question?.options.map((_, i) => i) ?? [];
    return shuffleAnswers ? shuffleItems(indexes) : indexes;
  }, [question, shuffleAnswers]);
  const last = index === questions.length - 1;
  const configuring = index === 0 && Object.keys(responses).length === 0;
  const next = () => {
    if (blocked || answer === null) return;
    setIndex((previous) => previous + 1);
    if (last) signal('complete');
  };
  useGameAdvance(auto && answer !== null && !blocked, next, undefined, index);

  // Keep a separate per-question deadline. Pausing and revisiting a question
  // preserves its remaining time; background-tab delays do not grant extra time.
  useEffect(() => {
    if (!question || blocked || answer !== null) return;
    const id = question.id;
    const initial = remainingByQuestion.current[id] ?? QUIZ_QUESTION_MS;
    const deadline = Date.now() + initial;
    activeDeadline.current = { id, value: deadline };
    setClock({ id, remainingMs: initial });
    signal('start');
    const tick = () => {
      const ms = Math.max(0, deadline - Date.now());
      remainingByQuestion.current[id] = ms;
      setClock({ id, remainingMs: ms });
    };
    const timer = window.setInterval(tick, 200);
    return () => {
      window.clearInterval(timer);
      remainingByQuestion.current[id] = Math.max(0, deadline - Date.now());
      if (activeDeadline.current?.id === id) activeDeadline.current = null;
    };
  }, [question?.id, blocked, answer, signal]);

  useEffect(() => {
    if (!question || blocked || answer !== null || remainingMs > 0 ||
        recordedTimeouts.current.has(question.id)) return;
    recordedTimeouts.current.add(question.id);
    if (firstChoice === null) {
      recordAnswer({ id: question.id, prompt: question.prompt, submitted: 'Time expired',
        expected: question.options[question.answerIndex]!, correct: false });
      signal('incorrect');
    }
    setResponses((previous) => {
      const stored = previous[question.id];
      if (stored && stored.answer !== null) return previous;
      return { ...previous, [question.id]: { first: stored?.first ?? null, answer: -1 } };
    });
  }, [question, answer, firstChoice, blocked, remainingMs, recordAnswer, signal]);

  if (!question) return <div className="ig-complete" role="status"><h3>Quiz completed!</h3><p>{correct} / {questions.length} correct on first attempt.</p></div>;

  function choose(optionIndex: number) {
    if (blocked || !question || answer !== null || firstChoice === optionIndex ||
        recordedTimeouts.current.has(question.id) ||
        (activeDeadline.current?.id === question.id && Date.now() >= activeDeadline.current.value)) return;
    const isCorrect = optionIndex === question.answerIndex;
    if (firstChoice === null) {
      recordAnswer({ id: question.id, prompt: question.prompt, submitted: question.options[optionIndex]!,
        expected: question.options[question.answerIndex]!, correct: isCorrect });
      if (isCorrect) setCorrect((previous) => previous + 1);
    }
    signal(isCorrect ? firstChoice === null ? 'correct' : 'review' : 'incorrect');
    setResponses((previous) => ({ ...previous, [question.id]: {
      first: firstChoice ?? optionIndex,
      answer: firstChoice === null && !isCorrect && retry ? null : optionIndex,
    } }));
  }

  return <div className="ig-content ig-quiz">
    <p className="ig-instruction">Each question has 30 seconds. Choose an answer before time runs out; unanswered questions count as incorrect. Review your first answers at the end.</p>
    <div className="ig-template-options" role="group" aria-label="Quiz options">
      <label><input type="checkbox" checked={auto} onChange={(event) => setAuto(event.target.checked)} /> Automatically proceed</label>
      <label><input type="checkbox" disabled={!configuring} checked={retry} onChange={(event) => setRetry(event.target.checked)} /> Allow one retry</label>
      <label><input type="checkbox" disabled={!configuring} checked={shuffleQuestions} onChange={(event) => setShuffleQuestions(event.target.checked)} /> Shuffle questions</label>
      <label><input type="checkbox" disabled={!configuring} checked={shuffleAnswers} onChange={(event) => setShuffleAnswers(event.target.checked)} /> Shuffle answers</label>
    </div>
    <div className="ig-score">Question {index + 1} / {questions.length} · {correct} correct on first attempt</div>
    <div className={'ig-quiz-clock' + (remainingMs <= 10000 ? ' is-low' : '') + (answer === -1 ? ' is-expired' : '')}
      role="timer" aria-label="Quiz question countdown">
      <span>⏱ Time per question · 30 seconds</span>
      <strong>{formatClock(Math.ceil(remainingMs / 1000))}</strong>
    </div>
    <progress className="ig-quiz-time-progress" max={QUIZ_QUESTION_MS} value={remainingMs}
      aria-label="Question time remaining" />
    <div className="ig-question" aria-live="polite">{question.prompt}</div>
    <AnswerCards options={question.options} order={options} answer={answer} correctIndex={question.answerIndex}
      firstWrong={firstChoice !== null && firstChoice !== question.answerIndex ? firstChoice : null}
      blocked={blocked || remainingMs === 0} onChoose={choose} />
    {firstChoice !== null && answer === null && <p className="ig-feedback" role="status">Incorrect. Choose a different answer for your one retry before time runs out.</p>}
    {answer !== null && <div className="ig-answer-feedback" role="status">
      <strong>{answer === -1 ? "Time's up!" : answer === question.answerIndex ? 'Correct!' : 'Correct answer'}</strong>
      {' '}{question.options[question.answerIndex]}
      {question.sourceContext && <small className="ig-source-context">{question.sourceContext}</small>}
      {auto && <button type="button" onClick={next}>{last ? 'See results →' : 'Next question →'}</button>}
    </div>}
    {!auto && <div className="ig-card-controls" role="group" aria-label="Quiz navigation">
      <button type="button" disabled={index === 0} onClick={() => setIndex((previous) => previous - 1)}>← Previous question</button>
      <button type="button" disabled={answer === null} onClick={next}>{last ? 'See results →' : 'Next question →'}</button>
    </div>}
  </div>;
}

export function FindTheMatch({ pairs }: { pairs: readonly GamePair[] }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const item = pairs[index];
  if (!item) return <div className="ig-complete" role="status"><h3>All definitions reviewed!</h3><p>{correct} / {pairs.length} correct on first attempt.</p></div>;
  const options = findMatchOptions(pairs, index);
  const choose = (id: string) => {
    if (answer !== null) return;
    setAnswer(id);
    if (id === item.id) setCorrect((previous) => previous + 1);
  };
  return <div className="ig-content">
    <p className="ig-instruction">Read the definition and find its correct term. Unlike Match Up, each question has four choices.</p>
    <div className="ig-score">Definition {index + 1} / {pairs.length} · {correct} correct</div>
    <div className="ig-question">{item.definition}</div>
    <div className="ig-answer-grid">{options.map((option) => <button key={option.id} type="button"
      className={'ig-answer-button' + (answer !== null && option.id === item.id ? ' is-correct' : '') + (answer === option.id && option.id !== item.id ? ' is-wrong' : '')}
      disabled={answer !== null} onClick={() => choose(option.id)}>{option.term}</button>)}</div>
    {answer !== null && <div className="ig-answer-feedback" role="status">
      <strong>{answer === item.id ? 'Correct!' : 'Not quite.'}</strong> The matching term is {item.term}.
      <button type="button" onClick={() => { setIndex((previous) => previous + 1); setAnswer(null); }}>
        {index === pairs.length - 1 ? 'See results →' : 'Next definition →'}
      </button>
    </div>}
  </div>;
}

export function Anagram({ pairs }: { pairs: readonly GamePair[] }) {
  const words = pairs.filter((item) => !item.term.includes(' ') && item.term.length >= 4);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const item = words[index];
  if (!item) return <div className="ig-complete" role="status"><h3>Anagram round complete!</h3>
    <p>{firstTry} / {words.length} solved on the first try.</p></div>;
  const finished = solved || revealed;
  function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (finished || !draft.trim()) return;
    const isCorrect = draft.trim().toLocaleLowerCase('en') === item.term.toLocaleLowerCase('en');
    if (isCorrect) {
      if (attempts === 0) setFirstTry((previous) => previous + 1);
      setSolved(true);
    } else setAttempts((previous) => previous + 1);
  }
  function next() {
    setIndex((previous) => previous + 1);
    setDraft('');
    setAttempts(0);
    setSolved(false);
    setRevealed(false);
  }
  return <div className="ig-content">
    <p className="ig-instruction">Unscramble the letters to form the Computer Science term. The hint is its definition.</p>
    <div className="ig-score">Word {index + 1} / {words.length} · {firstTry} solved on first try</div>
    <div className="ig-anagram-letters" aria-label={'Scrambled letters ' + scrambleTerm(item.term)}>{[...scrambleTerm(item.term)].map((letter, pos) => <span key={pos}>{letter}</span>)}</div>
    <p className="ig-anagram-hint"><strong>Clue:</strong> {item.definition}</p>
    <form className="ig-anagram-form" onSubmit={check}>
      <label htmlFor="ig-anagram-input">Your answer</label>
      <input id="ig-anagram-input" value={draft} disabled={finished} autoComplete="off"
        onChange={(event) => setDraft(event.target.value)} placeholder="Type the term" maxLength={80} />
      <button type="submit" disabled={finished || !draft.trim()}>Check answer</button>
    </form>
    {attempts > 0 && !finished && <p className="ig-feedback" role="status">Not quite. Try again or reveal the answer.</p>}
    {finished && <p className="ig-feedback" role="status">{solved ? 'Correct!' : 'Answer revealed, not counted as a correct attempt.'} {item.term}</p>}
    <div className="ig-card-controls">
      <button type="button" disabled={finished} onClick={() => setRevealed(true)}>Reveal answer</button>
      <button type="button" disabled={!finished} onClick={next}>{index === words.length - 1 ? 'See results →' : 'Next anagram →'}</button>
    </div>
  </div>;
}

export const pilotExtras = {
  speaking: chapter7Pilot.speaking,
  quiz: chapter7Pilot.quiz,
};
