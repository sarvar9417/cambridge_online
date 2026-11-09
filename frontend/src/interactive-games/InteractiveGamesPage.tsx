import { useMemo, useState } from 'react';
import {
  chapter7Pilot, GAME_CATALOG, isCorrectPair,
  type GameKind, type GamePair,
} from './game-content';
import { Anagram, FindTheMatch, OpenBox, Quiz, SpeakingCards, SpinWheel } from './ExtraGames';
import './interactive-games.css';

/**
 * Phase-1 standalone client-only pilot.
 * Future game sets and persistent sessions require an authenticated backend API.
 * Results on this page are NOT stored as assessment evidence.
 */
export function InteractiveGamesPage({ isTeacher }: { isTeacher: boolean }) {
  const [mode, setMode] = useState<GameKind>('match-up');
  const [round, setRound] = useState(0);
  const active = GAME_CATALOG.find((entry) => entry.id === mode)!;
  return <section className="ig-page" aria-label="Interactive Games">
    <div className="ig-hero">
      <div>
        <span className="ig-eyebrow">CAMBRIDGE 9618 · INTERACTIVE GAMES</span>
        <h1>Learn by playing.</h1>
        <p>Short, focused games for Cambridge Computer Science. Choose a game to practise the same key ideas in a new way.</p>
        <div className="ig-pills"><span>Chapter {chapter7Pilot.chapterNo}</span><span>Section {chapter7Pilot.sectionCode}</span><span>{isTeacher ? 'Teacher preview' : 'Independent practice'}</span></div>
      </div>
      <div className="ig-hero-mark" aria-hidden="true">8<span>play modes</span></div>
    </div>
    <div className="ig-notice" role="note">
      <strong>Chapter 7.1 pilot content.</strong> This is a curated practice set, not the complete Chapter 7 question bank.
      {isTeacher ? ' Preview what learners will see.' : ' Results are shown on this device only and are not yet saved to your account.'}
    </div>
    <div className="ig-games" role="group" aria-label="Choose a game">
      {GAME_CATALOG.map((game, i) => <button key={game.id} type="button" aria-pressed={mode === game.id}
        className={'ig-game-tile' + (mode === game.id ? ' is-selected' : '')}
        onClick={() => { setMode(game.id); setRound(0); }}>
        <span className="ig-game-number">0{i + 1}</span>
        <strong>{game.label}</strong>
        <small>{game.description}</small>
      </button>)}
    </div>
    <div className="ig-workspace">
      <div className="ig-workspace-head">
        <div><span className="ig-eyebrow">NOW PLAYING</span><h2>{active.label}</h2><p>{chapter7Pilot.sectionTitle}</p></div>
        <button className="ig-reset" type="button" onClick={() => setRound((current) => current + 1)}>↻ Restart</button>
      </div>
      <div key={mode + ':' + round}>
        {mode === 'match-up' && <MatchUp pairs={chapter7Pilot.pairs} />}
        {mode === 'flash-cards' && <FlashCards pairs={chapter7Pilot.pairs} />}
        {mode === 'speaking-cards' && <SpeakingCards prompts={chapter7Pilot.speaking} />}
        {mode === 'spin-wheel' && <SpinWheel pairs={chapter7Pilot.pairs} />}
        {mode === 'open-box' && <OpenBox pairs={chapter7Pilot.pairs} />}
        {mode === 'quiz' && <Quiz questions={chapter7Pilot.quiz} />}
        {mode === 'find-the-match' && <FindTheMatch pairs={chapter7Pilot.pairs} />}
        {mode === 'anagram' && <Anagram pairs={chapter7Pilot.pairs} />}
      </div>
    </div>
    <p className="ig-source">Source: {chapter7Pilot.source}. Material is adapted and shortened for practice.</p>
  </section>;
}

function MatchUp({ pairs }: { pairs: GamePair[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [solved, setSolved] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');
  const definitions = useMemo(() => [...pairs].reverse(), [pairs]);
  const firstTry = solved.filter((id) => attempts[id] === 1).length;

  function answer(definitionId: string) {
    if (!active || solved.includes(definitionId)) return;
    setAttempts((previous) => ({ ...previous, [active]: (previous[active] ?? 0) + 1 }));
    if (isCorrectPair(active, definitionId)) {
      setSolved((previous) => [...previous, active]);
      setFeedback('Correct match! Choose the next term.');
      setActive(null);
    } else setFeedback('Not quite. Try another definition for this term.');
  }

  return <div className="ig-content">
    <p className="ig-instruction">Select a term on the left, then select its definition on the right. You can also use the keyboard.</p>
    <div className="ig-score" role="status">{solved.length} / {pairs.length} matched · {firstTry} correct on first attempt</div>
    <div className="ig-match-grid">
      <div className="ig-choice-column"><h3>Terms</h3>{pairs.map((pair) => <button key={pair.id} type="button"
        disabled={solved.includes(pair.id)} aria-pressed={active === pair.id}
        className={'ig-choice' + (active === pair.id ? ' is-active' : '') + (solved.includes(pair.id) ? ' is-complete' : '')}
        onClick={() => { setActive(pair.id); setFeedback('Now choose the matching definition.'); }}>
        {pair.term}{solved.includes(pair.id) ? ' ✓' : ''}</button>)}</div>
      <div className="ig-choice-column"><h3>Definitions</h3>{definitions.map((pair) => <button key={pair.id} type="button"
        disabled={solved.includes(pair.id) || !active} className={'ig-choice' + (solved.includes(pair.id) ? ' is-complete' : '')}
        onClick={() => answer(pair.id)}>{pair.definition}</button>)}</div>
    </div>
    <p className="ig-feedback" aria-live="polite">{solved.length === pairs.length ? 'All pairs completed! Restart to practise again.' : feedback}</p>
  </div>;
}

function FlashCards({ pairs }: { pairs: GamePair[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = pairs[index];
  if (!card) return <p>No cards available.</p>;
  function go(next: number) { setIndex(next); setRevealed(false); }
  return <div className="ig-content">
    <p className="ig-instruction">Recall the definition before revealing the answer. This is revision, not an assessed score.</p>
    <div className="ig-score">Card {index + 1} / {pairs.length}</div>
    <button type="button" className="ig-flashcard" aria-label={revealed ? 'Definition: ' + card.definition : 'Term: ' + card.term + '. Reveal definition.'}
      onClick={() => setRevealed((value) => !value)}>
      <span className="ig-eyebrow">{revealed ? 'DEFINITION' : 'KEY TERM'}</span>
      <strong>{revealed ? card.definition : card.term}</strong>
      <small>{revealed ? 'Click to see the term' : 'Click to reveal definition'}</small>
    </button>
    <div className="ig-card-controls">
      <button type="button" disabled={index === 0} onClick={() => go(index - 1)}>← Previous</button>
      <button type="button" onClick={() => setRevealed((value) => !value)}>{revealed ? 'Show term' : 'Reveal answer'}</button>
      <button type="button" disabled={index === pairs.length - 1} onClick={() => go(index + 1)}>Next →</button>
    </div>
  </div>;
}

