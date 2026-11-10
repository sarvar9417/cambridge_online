import { useMemo, useState, type FormEvent } from 'react';
import { useGameAdvance, useGameSignal, type RecordAnswer } from './game-session';
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

export function OpenBox({ pairs, questions }: { pairs: readonly GamePair[]; questions: readonly QuizQuestion[] }) {
  const signal = useGameSignal();
  const [opened, setOpened] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [mode, setMode] = useState<'simple' | 'questions'>('simple');
  const [choices, setChoices] = useState<Record<string, number>>({});
  const active = selected === null ? null : pairs[selected];
  const question = mode === 'questions' && active ? questions.find((item) => item.id === 'quiz-' + active.id) : undefined;
  const choice = question ? choices[question.id] : undefined;
  if (!pairs.length) return <p>No challenge boxes available.</p>;

  function open(index: number) {
    if (!opened.includes(index)) {
      signal('open');
      signal('review');
      setOpened((previous) => [...previous, index]);
    }
    setSelected(index);
    setRevealed(false);
  }

  return <div className="ig-content">
    <p className="ig-instruction">Choose any numbered box to reveal its contents. Opened boxes remain marked on the board.</p>
    {questions.length > 0 && <div className="ig-template-options">
      <label>Box type <select value={mode} disabled={opened.length > 0}
        onChange={(event) => setMode(event.target.value === 'questions' ? 'questions' : 'simple')}>
        <option value="simple">Simple boxes</option><option value="questions">Boxes with questions</option>
      </select></label>
    </div>}
    <div className="ig-score">{opened.length} / {pairs.length} boxes opened</div>
    {active ? <div className="ig-box-detail" aria-live="polite">
      <span className="ig-eyebrow">BOX {selected! + 1}</span>
      <h3>{question ? question.prompt : `Explain: ${active.term}`}</h3>
      {question ? <>
        <div className="ig-answer-grid">{question.options.map((option, index) => <button key={index} type="button"
          className={'ig-answer-button' + (choice !== undefined && index === question.answerIndex ? ' is-correct'
            : choice === index ? ' is-wrong' : '')} disabled={choice !== undefined} onClick={() => {
            setChoices((previous) => ({ ...previous, [question.id]: index }));
            signal('flip');
          }}>{option}</button>)}</div>
        {choice !== undefined && <p className="ig-reveal">{choice === question.answerIndex ? 'Correct!' : 'Correct answer'} · {question.options[question.answerIndex]}</p>}
      </> : <>
        <button type="button" aria-expanded={revealed} onClick={() => { if (!revealed) signal('flip'); setRevealed(!revealed); }}>
          {revealed ? 'Hide answer' : 'Reveal answer'}</button>
        {revealed && <p className="ig-reveal">{active.definition}</p>}
      </>}
      <div className="ig-box-actions"><button type="button" onClick={() => setSelected(null)}>Back to boxes</button></div>
    </div> : <>
      <div className="ig-box-grid">{pairs.map((pair, index) => <button type="button" key={pair.id}
        className={'ig-box ig-color-' + (index % 6) + (opened.includes(index) ? ' is-opened' : '')}
        aria-label={`Box ${index + 1}${opened.includes(index) ? ', opened' : ', tap to open'}`} onClick={() => open(index)}>
        <span>{index + 1}</span><strong>{opened.includes(index) ? 'Opened' : 'Tap to open'}</strong>
      </button>)}</div>
      {opened.length === pairs.length && <div className="ig-box-actions">
        <button type="button" className="ig-primary-button" onClick={() => signal('complete')}>Finish boxes</button>
      </div>}
    </>}
  </div>;
}

export function Quiz({ questions, blocked, recordAnswer }: {
  questions: readonly QuizQuestion[]; blocked: boolean; recordAnswer: RecordAnswer;
}) {
  const signal = useGameSignal();
  const [index, setIndex] = useState(0);
  const [firstChoice, setFirstChoice] = useState<number | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [auto, setAuto] = useState(true);
  const [retry, setRetry] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(false);
  const ordered = useMemo(() => shuffleQuestions ? shuffleItems(questions) : questions, [questions, shuffleQuestions]);
  const question = ordered[index];
  const options = useMemo(() => {
    const indexes = question?.options.map((_, i) => i) ?? [];
    return shuffleAnswers ? shuffleItems(indexes) : indexes;
  }, [question, shuffleAnswers]);
  const last = index === questions.length - 1;
  const configuring = index === 0 && firstChoice === null;
  const next = () => {
    if (blocked || answer === null) return;
    setIndex((previous) => previous + 1);
    setFirstChoice(null);
    setAnswer(null);
    if (last) signal('complete');
  };
  useGameAdvance(auto && answer !== null && !blocked, next);
  if (!question) return <div className="ig-complete" role="status"><h3>Quiz completed!</h3><p>{correct} / {questions.length} correct on first attempt.</p></div>;

  function choose(optionIndex: number) {
    if (blocked || !question || answer !== null || firstChoice === optionIndex) return;
    const isCorrect = optionIndex === question.answerIndex;
    if (firstChoice === null) {
      setFirstChoice(optionIndex);
      recordAnswer({ id: question.id, prompt: question.prompt, submitted: question.options[optionIndex]!,
        expected: question.options[question.answerIndex]!, correct: isCorrect });
      if (isCorrect) setCorrect((previous) => previous + 1);
    }
    signal(isCorrect ? firstChoice === null ? 'correct' : 'review' : 'incorrect');
    if (firstChoice === null && !isCorrect && retry) return;
    setAnswer(optionIndex);
  }

  return <div className="ig-content ig-quiz">
    <p className="ig-instruction">Choose an answer to see it marked immediately. Review your first answers at the end.</p>
    <div className="ig-template-options" role="group" aria-label="Quiz options">
      <label><input type="checkbox" checked={auto} onChange={(event) => setAuto(event.target.checked)} /> Automatically proceed</label>
      <label><input type="checkbox" disabled={!configuring} checked={retry} onChange={(event) => setRetry(event.target.checked)} /> Allow one retry</label>
      <label><input type="checkbox" disabled={!configuring} checked={shuffleQuestions} onChange={(event) => setShuffleQuestions(event.target.checked)} /> Shuffle questions</label>
      <label><input type="checkbox" disabled={!configuring} checked={shuffleAnswers} onChange={(event) => setShuffleAnswers(event.target.checked)} /> Shuffle answers</label>
    </div>
    <div className="ig-score">Question {index + 1} / {questions.length} · {correct} correct on first attempt</div>
    <div className="ig-question" aria-live="polite">{question.prompt}</div>
    <div className="ig-answer-grid">{options.map((optionIndex, position) => <button key={`${question.id}-${optionIndex}`} type="button"
      className={'ig-answer-button' + (answer !== null && optionIndex === question.answerIndex ? ' is-correct' : '') +
        ((firstChoice === optionIndex || answer === optionIndex) && optionIndex !== question.answerIndex ? ' is-wrong' : '')}
      disabled={answer !== null || firstChoice === optionIndex} onClick={() => choose(optionIndex)}>
      <span>{String.fromCharCode(65 + position)}</span>{question.options[optionIndex]}</button>)}</div>
    {firstChoice !== null && answer === null && <p className="ig-feedback" role="status">Incorrect. Choose a different answer for your one retry.</p>}
    {answer !== null && <div className="ig-answer-feedback" role="status">
      <strong>{answer === question.answerIndex ? 'Correct!' : 'Correct answer'}</strong> {question.options[question.answerIndex]}
      <button type="button" onClick={next}>{last ? 'See results →' : 'Next question →'}</button>
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
