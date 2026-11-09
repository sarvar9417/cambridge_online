import { useMemo, useState } from 'react';
import {
  chapter7Pilot, GAME_CATALOG, GROUPS,
  isCorrectGroup, isCorrectPair,
  type GameKind, type GamePair, type GroupName,
} from './game-content';
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
      <div className="ig-hero-mark" aria-hidden="true">4<span>play modes</span></div>
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
        {mode === 'matching-pairs' && <MatchingPairs pairs={chapter7Pilot.pairs} />}
        {mode === 'flash-cards' && <FlashCards pairs={chapter7Pilot.pairs} />}
        {mode === 'group-sort' && <GroupSort />}
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

interface MemoryCard { key: string; pairId: string; face: string; }
function MatchingPairs({ pairs }: { pairs: GamePair[] }) {
  const deck = useMemo(() => {
    const cards: MemoryCard[] = pairs.flatMap((pair) => [
      { key: 'term-' + pair.id, pairId: pair.id, face: pair.term },
      { key: 'definition-' + pair.id, pairId: pair.id, face: pair.definition },
    ]);
    const order = [5, 10, 0, 13, 2, 9, 14, 1, 8, 7, 12, 3, 6, 15, 4, 11];
    return order.map((index) => cards[index]).filter((card): card is MemoryCard => Boolean(card));
  }, [pairs]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [turns, setTurns] = useState(0);
  const [feedback, setFeedback] = useState('Select two cards to find a matching term and definition.');

  function flip(index: number) {
    const card = deck[index];
    if (!card || matched.includes(card.pairId) || open.includes(index)) return;
    const picks = open.length === 2 ? [index] : [...open, index];
    setOpen(picks);
    if (picks.length !== 2) return;
    setTurns((current) => current + 1);
    const first = deck[picks[0]];
    if (first?.pairId === card.pairId && first.key !== card.key) {
      setMatched((current) => [...current, card.pairId]);
      setFeedback('Pair found! Keep going.');
    } else {
      setFeedback('These cards do not match. Select another card to continue.');
    }
  }

  return <div className="ig-content">
    <p className="ig-instruction">Reveal two cards. Find the term and its definition. Wrong pairs stay visible until your next choice.</p>
    <div className="ig-score" role="status">{matched.length} / {pairs.length} pairs found · {turns} attempts</div>
    <div className="ig-memory-grid">{deck.map((card, index) => {
      const complete = matched.includes(card.pairId);
      const revealed = open.includes(index);
      return <button key={card.key} type="button" disabled={complete} aria-pressed={revealed}
        aria-label={complete ? 'Matched: ' + card.face : revealed ? card.face : 'Hidden card ' + (index + 1)}
        className={'ig-memory-card' + (revealed ? ' is-open' : '') + (complete ? ' is-complete' : '')}
        onClick={() => flip(index)}>{complete ? <span>✓ Matched</span> : revealed ? <span>{card.face}</span> : <span className="ig-memory-back">?</span>}</button>;
    })}</div>
    <p className="ig-feedback" aria-live="polite">{matched.length === pairs.length ? 'Excellent! You found every pair.' : feedback}</p>
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

function GroupSort() {
  const items = chapter7Pilot.groups;
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<GroupName | null>(null);
  const [correct, setCorrect] = useState(0);
  const item = items[index];
  if (!item) return <div className="ig-complete" role="status"><h3>Round complete!</h3><p>{correct} / {items.length} correct on first attempt.</p></div>;
  function choose(group: GroupName) {
    if (selected) return;
    setSelected(group);
    if (isCorrectGroup(item, group)) setCorrect((current) => current + 1);
  }
  return <div className="ig-content">
    <p className="ig-instruction">Read the statement and identify which concept it most directly describes.</p>
    <div className="ig-score">Question {index + 1} / {items.length} · {correct} correct</div>
    <div className="ig-sort-prompt">{item.statement}</div>
    <div className="ig-sort-choices">{GROUPS.map((group) => <button type="button" key={group}
      disabled={Boolean(selected)} className={'ig-sort-choice' + (selected && group === item.group ? ' is-correct' : '') + (selected === group && group !== item.group ? ' is-wrong' : '')}
      onClick={() => choose(group)}>{group}</button>)}</div>
    {selected && <div className="ig-sort-result" role="status"><strong>{selected === item.group ? 'Correct!' : 'Not quite.'}</strong> The best match is {item.group}.
      <button type="button" onClick={() => { setIndex((current) => current + 1); setSelected(null); }}>Next question →</button>
    </div>}
  </div>;
}
