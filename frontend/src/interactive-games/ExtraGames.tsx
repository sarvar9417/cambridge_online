import { useState, type FormEvent } from 'react';
import { useGameSignal } from './game-session';
import {
  chapter7Pilot, findMatchOptions, scrambleTerm,
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

export function SpinWheel({ pairs }: { pairs: readonly GamePair[] }) {
  const signal = useGameSignal();
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spins, setSpins] = useState(0);
  const [wheelPage, setWheelPage] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [labelMode, setLabelMode] = useState<'term' | 'definition'>('definition');
  const active = pairs.filter((item) => !eliminated.includes(item.id));
  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(active.length / PAGE_SIZE));
  const safePage = Math.min(wheelPage, pageCount - 1);
  const visible = active.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const selected = pairs.find((item) => item.id === result);
  if (!pairs.length) return <p>No wheel topics available.</p>;
  const sector = 360 / Math.max(1, visible.length);
  const colours = ['#4442a5','#00636b','#9d2936','#935000','#186936','#7633a5','#16558e','#924900'];
  const gradient = visible.length
    ? 'conic-gradient(' + visible.map((_, i) => colours[i % colours.length] + ' ' + (i * sector) + 'deg ' + ((i + 1) * sector) + 'deg').join(',') + ')'
    : '#64748b';
  function turnPage(direction: -1 | 1) {
    setWheelPage((page) => Math.min(Math.max(0, page + direction), pageCount - 1));
    setRotation(0);
    setResult(null);
    setShowAnswer(false);
  }
  function spin() {
    if (!visible.length || selected) return;
    const choiceIndex = Math.floor(Math.random() * visible.length);
    const next = visible[choiceIndex]!;
    const targetAngle = (360 - (choiceIndex + .5) * sector + 360) % 360;
    setRotation((previous) => previous + 1440 + (targetAngle - (previous % 360) + 360) % 360);
    setResult(next.id);
    setSpins((previous) => previous + 1);
    setShowAnswer(false);
    signal('spin');
  }
  function eliminate() {
    if (!selected) return;
    setEliminated((previous) => [...previous, selected.id]);
    setResult(null);
    setRotation(0);
    setShowAnswer(false);
    signal('review');
    if (active.length === 1) signal('complete');
  }
  return <div className="ig-content">
    <p className="ig-instruction">Spin for a random Cambridge term or definition. Long chapters are divided into readable wheel sets; use Next set to reach every term.</p>
    <div className="ig-score">{spins} spins · {active.length} segments remaining</div>
    <div className="ig-wheel-switch" role="group" aria-label="Wheel segment content">
      <button type="button" aria-pressed={labelMode === 'definition'} onClick={() => setLabelMode('definition')}>Definitions</button>
      <button type="button" aria-pressed={labelMode === 'term'} onClick={() => setLabelMode('term')}>Terms</button>
    </div>
    <div className="ig-wheel-pager" role="group" aria-label="Wheel page">
      <button type="button" disabled={safePage === 0} onClick={() => turnPage(-1)}>← Previous set</button>
      <span>Wheel set {safePage + 1} of {pageCount} · {visible.length} readable slices</span>
      <button type="button" disabled={safePage >= pageCount - 1} onClick={() => turnPage(1)}>Next set →</button>
    </div>
    <div className="ig-wheel-layout">
      <div className="ig-wheel-wrap">
        <span className="ig-wheel-pointer" aria-hidden="true">▼</span>
        <div className="ig-wheel-disc" style={{ background: gradient, transform: 'rotate(' + rotation + 'deg)' }}
          role="group" aria-label={visible.length + ' visible wheel sectors'}>
          {visible.map((item, index) => {
            const label = labelMode === 'term' ? item.term : item.definition;
            return <span key={item.id} className="ig-wheel-label"
              style={{ transform: 'rotate(' + ((index + .5) * sector) + 'deg) translateY(-102px) rotate(' + (-(index + .5) * sector) + 'deg)' }}
              title={label}>{label.length > 21 ? label.slice(0, 20) + '…' : label}</span>;
          })}
          <span className="ig-wheel-hub" aria-hidden="true">CS</span>
        </div>
      </div>
      <div className="ig-wheel-panel">
        <button type="button" className="ig-primary-button" onClick={spin} disabled={!visible.length || Boolean(selected)}>Spin the wheel</button>
        {selected && <div className="ig-wheel-result" aria-live="polite">
          <span className="ig-eyebrow">SELECTED SEGMENT</span>
          <h3>{labelMode === 'term' ? selected.term : selected.definition}</h3>
          <p>Explain or identify the correct concept before revealing the solution.</p>
          <button type="button" onClick={() => { if (!showAnswer) signal('flip'); setShowAnswer((value) => !value); }}>{showAnswer ? 'Hide answer' : 'Reveal definition'}</button>
          {showAnswer && <p className="ig-reveal">{selected.term} — {selected.definition}</p>}
          <div className="ig-wheel-actions">
            <button type="button" onClick={() => { setResult(null); setShowAnswer(false); }}>Resume</button>
            <button type="button" onClick={eliminate}>Eliminate this segment</button>
          </div>
        </div>}
        {!active.length && <div className="ig-complete" role="status">All segments have been explored.</div>}
      </div>
    </div>
  </div>;
}

export function OpenBox({ pairs }: { pairs: readonly GamePair[] }) {
  const signal = useGameSignal();
  const [opened, setOpened] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  if (!pairs.length) return <p>No challenge boxes available.</p>;
  const active = selected === null ? null : pairs[selected];
  const open = (index: number) => {
    if (!opened.includes(index)) {
      signal('open');
      signal('review');
      if (opened.length + 1 === pairs.length) signal('complete');
    }
    setOpened((previous) => previous.includes(index) ? previous : [...previous, index]);
    setSelected(index);
    setRevealed(false);
  };
  return <div className="ig-content">
    <p className="ig-instruction">Open a mystery box. Explain the term or challenge, then reveal the suggested answer. Opening a box is not scored.</p>
    <div className="ig-score">{opened.length} / {pairs.length} boxes explored</div>
    <div className="ig-box-grid">
      {pairs.map((pair, index) => <button type="button" key={pair.id}
        aria-pressed={selected === index} className={'ig-box ig-color-' + (index % 6) + (opened.includes(index) ? ' is-opened' : '') + (selected === index ? ' is-selected' : '')}
        onClick={() => open(index)}><span>{opened.includes(index) ? '✓' : index + 1}</span><strong>{opened.includes(index) ? 'Opened' : 'Tap to open'}</strong></button>)}
    </div>
    {active && <div className="ig-box-detail" aria-live="polite">
      <span className="ig-eyebrow">BOX {selected! + 1} · CHALLENGE</span>
      <h3>Explain: {active.term}</h3>
      <button type="button" onClick={() => { if (!revealed) signal('flip'); setRevealed((value) => !value); }}>{revealed ? 'Hide answer' : 'Reveal answer'}</button>
      {revealed && <p className="ig-reveal">{active.definition}</p>}
    </div>}
  </div>;
}

export function Quiz({ questions }: { questions: readonly QuizQuestion[] }) {
  const signal = useGameSignal();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const question = questions[index];
  if (!question) return <div className="ig-complete" role="status"><h3>Quiz completed!</h3><p>{correct} / {questions.length} correct on first attempt.</p></div>;
  function choose(optionIndex: number) {
    if (answer !== null) return;
    setAnswer(optionIndex);
    if (optionIndex === question.answerIndex) {
      setCorrect((previous) => previous + 1);
      signal('correct');
    } else signal('incorrect');
  }
  return <div className="ig-content ig-quiz">
    <p className="ig-instruction">Choose one answer per question. The explanation appears after your choice; answers cannot be changed.</p>
    <div className="ig-score">Question {index + 1} / {questions.length} · {correct} correct</div>
    <div className="ig-question">{question.prompt}</div>
    <div className="ig-answer-grid">{question.options.map((optionText, optionIndex) => <button key={optionIndex} type="button"
      className={'ig-answer-button' + (answer !== null && optionIndex === question.answerIndex ? ' is-correct' : '') + (answer === optionIndex && optionIndex !== question.answerIndex ? ' is-wrong' : '')}
      disabled={answer !== null} onClick={() => choose(optionIndex)}>
      <span>{String.fromCharCode(65 + optionIndex)}</span>{optionText}</button>)}</div>
    {answer !== null && <div className="ig-answer-feedback" role="status">
      <strong>{answer === question.answerIndex ? 'Correct!' : 'Not quite.'}</strong> {question.explanation}
      <button type="button" onClick={() => { if (index === questions.length - 1) signal('complete'); setIndex((previous) => previous + 1); setAnswer(null); }}>
        {index === questions.length - 1 ? 'See results →' : 'Next question →'}
      </button>
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
