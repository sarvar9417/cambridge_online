import { useMemo, useRef, useState, type DragEvent } from 'react';
import { scrambleTerm, type GamePair, type SpeakingPrompt } from './game-content';
import { isAnagramTile } from './remote-games';
import { useGameSignal } from './game-session';
import './wordwall-modes.css';

/** Chapter-scalable, submit-to-mark matching board.
 * Keyboard users can click a term and then a target instead of dragging.
 */
export function MatchUpBoard({ pairs }: { pairs: readonly GamePair[] }) {
  const signal = useGameSignal();
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [firstScore, setFirstScore] = useState(0);
  const pages = Math.max(1, Math.ceil(pairs.length / PAGE_SIZE));
  const items = pairs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const definitions = useMemo(() => [...items].reverse(), [page, pairs]);
  const placed = Object.values(answers);
  const pageCorrect = items.filter((item) => answers[item.id] === item.id).length;

  function assign(targetId: string, termId: string) {
    if (submitted || !items.some((item) => item.id === termId)) return;
    signal('start');
    setAnswers((previous) => {
      const next = { ...previous };
      // A single movable term can fill only one drop slot.
      for (const [target, selected] of Object.entries(next)) if (selected === termId) delete next[target];
      next[targetId] = termId;
      return next;
    });
    setActiveTerm(null);
  }

  function drop(event: DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    if (!event.currentTarget.closest('fieldset:disabled')) {
      assign(targetId, event.dataTransfer.getData('text/plain'));
    }
  }

  function submitPage() {
    if (submitted) return;
    setSubmitted(true);
    if (pageCorrect) signal('correct', pageCorrect);
    if (items.length > pageCorrect) signal('incorrect', items.length - pageCorrect);
    if (page >= pages - 1) signal('complete');
  }

  function nextPage() {
    if (!submitted) return;
    if (page < pages - 1) {
      setFirstScore((previous) => previous + pageCorrect);
      setPage((current) => current + 1);
      setAnswers({});
      setSubmitted(false);
      setActiveTerm(null);
    }
  }

  return <div className="ig-content ig-match-board">
    <p className="ig-instruction">Drag each term into the blank beside its definition. You can also select a term and then select a blank. Submit once you have finished placing the terms.</p>
    <div className="ig-score" role="status">Page {page + 1} of {pages} · {placed.length} of {items.length} placed{page > 0 ? ' · ' + firstScore + ' correct in previous pages' : ''}</div>
    <div className="ig-match-board-grid">
      <div className="ig-term-bank"><h3>Move these terms</h3>
        {items.map((item, index) => <button key={item.id} type="button" disabled={submitted || placed.includes(item.id)} draggable={!submitted && !placed.includes(item.id)}
          aria-pressed={activeTerm === item.id} className={'ig-bank-term ig-color-' + (index % 6) + (activeTerm === item.id ? ' is-selected' : '')}
          onDragStart={(event) => { event.dataTransfer.setData('text/plain', item.id); setActiveTerm(item.id); }}
          onClick={() => setActiveTerm(item.id)}>{item.term}</button>)}
      </div>
      <div className="ig-match-definitions"><h3>Drop term beside definition</h3>
        {definitions.map((item) => {
          const chosen = items.find((candidate) => candidate.id === answers[item.id]);
          const isCorrect = answers[item.id] === item.id;
          return <div key={item.id} className={'ig-match-row' + (submitted ? isCorrect ? ' is-correct' : ' is-wrong' : '')}>
            <div className="ig-drop-target" onDragOver={(event) => { if (!submitted) event.preventDefault(); }} onDrop={(event) => drop(event, item.id)}>
              <button type="button" draggable={Boolean(chosen) && !submitted}
                onDragStart={(event) => { if (chosen) event.dataTransfer.setData('text/plain', chosen.id); }}
                disabled={submitted || (!chosen && !activeTerm)} aria-label={(chosen ? chosen.term : 'Place term') + '. Answer slot for ' + item.definition}
                onClick={() => { if (activeTerm) assign(item.id, activeTerm); else if (chosen) setAnswers((previous) => { const next = { ...previous }; delete next[item.id]; return next; }); }}>
                {chosen ? chosen.term : 'Place term'}
              </button>
            </div>
            <div className="ig-match-description">{item.definition}
              {submitted && !isCorrect && <small>Correct: {item.term}</small>}
            </div>
          </div>;
        })}
      </div>
    </div>
    <div className="ig-match-actions">
      {!submitted ? <button type="button" className="ig-primary-button" disabled={!placed.length}
        onClick={submitPage}>Submit Answers</button>
        : <>
          <p role="status"><strong>{pageCorrect} / {items.length} correct.</strong> These are your first submitted answers; corrections are shown separately.</p>
          {page < pages - 1 ? <button type="button" className="ig-primary-button" onClick={nextPage}>Next page →</button>
            : <p role="status"><strong>Completed.</strong> Total first-submission score: {firstScore + pageCorrect} / {pairs.length}.</p>}
        </>}
    </div>
  </div>;
}

/** Speaking practice is a physical deck: shuffle, deal and undo, without claiming speech has been recorded. */
export function SpeakingDeck({ prompts }: { prompts: readonly SpeakingPrompt[] }) {
  const signal = useGameSignal();
  const [pile, setPile] = useState(() => prompts.map((_, index) => index));
  const [history, setHistory] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const seen = useRef(new Set<number>());
  const current = history.length ? prompts[history[history.length - 1]!] : null;
  function shuffle() {
    signal('flip');
    const next = [...pile];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j]!, next[i]!];
    }
    setPile(next);
  }
  function deal() {
    if (!pile.length) return;
    signal('deal');
    const index = pile[pile.length - 1]!;
    if (!seen.current.has(index)) {
      seen.current.add(index);
      signal('review');
    }
    setPile((previous) => previous.slice(0, -1));
    setHistory((previous) => [...previous, index]);
    setRevealed(false);
  }
  function undo() {
    if (!history.length) return;
    const last = history[history.length - 1]!;
    setHistory((previous) => previous.slice(0, -1));
    setPile((previous) => [...previous, last]);
    setRevealed(false);
  }
  return <div className="ig-content">
    <p className="ig-instruction">Shuffle the deck and deal a card. Name the term and explain it in your own words before revealing the answer. This activity does not record or verify audio.</p>
    <div className="ig-score" role="status">{history.length} dealt · {pile.length} remaining</div>
    <div className="ig-deck-stage">
      <button type="button" className="ig-deck-stack" onClick={deal} disabled={!pile.length} aria-label={'Deal a card. ' + pile.length + ' cards left'}>
        <span className="ig-deck-pattern" aria-hidden="true">◆</span><small>{pile.length} cards</small>
      </button>
      <div className="ig-dealt-card" role="region" aria-label="Current speaking card">
        {current ? <>
          <span className="ig-eyebrow">YOUR SPEAKING PROMPT</span>
          <p>{current.prompt}</p>
          {revealed && <div className="ig-reveal"><strong>Matching term</strong><p>{current.talkingPoints}</p></div>}
          <button type="button" onClick={() => { if (!revealed) signal('flip'); setRevealed((value) => !value); }}>{revealed ? 'Hide term' : 'Reveal term'}</button>
        </> : <p className="ig-dealt-placeholder">{pile.length ? 'Deal a card to reveal a question.' : 'All cards have been dealt. Undo or restart.'}</p>}
      </div>
    </div>
    <div className="ig-deck-controls">
      <button type="button" onClick={shuffle} disabled={pile.length < 2}>Shuffle</button>
      <button type="button" onClick={undo} disabled={!history.length}>Undo</button>
      <button type="button" onClick={() => pile.length ? deal() : signal('complete')} disabled={!prompts.length}>
        {pile.length ? 'Deal' : 'Finish deck'}
      </button>
    </div>
  </div>;
}

/** Persistent multi-tile board; each successful answer removes a tile. */
export function FindMatchBoard({ pairs }: { pairs: readonly GamePair[] }) {
  const signal = useGameSignal();
  const [remaining, setRemaining] = useState(() => pairs.map((item) => item.id));
  const [lives, setLives] = useState(3);
  const [mistakes, setMistakes] = useState(0);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const current = pairs.find((item) => remaining.includes(item.id));
  const board = useMemo(() => {
    // A stable mixed grid is still predictable under tests; it is intentionally not the question order.
    return [...pairs].sort((a, b) => a.term.localeCompare(b.term));
  }, [pairs]);
  const finished = !current || lives <= 0;

  function choose(id: string) {
    if (!current || finished || !remaining.includes(id)) return;
    if (id === current.id) {
      signal(wrongId ? 'review' : 'correct');
      if (remaining.length === 1) signal('complete');
      setRemaining((previous) => previous.filter((candidate) => candidate !== id));
      setWrongId(null);
    } else {
      signal('incorrect');
      if (lives === 1) signal('complete');
      setMistakes((previous) => previous + 1);
      setLives((previous) => Math.max(0, previous - 1));
      setWrongId(id);
    }
  }

  return <div className="ig-content ig-findmatch">
    <div className="ig-find-status">
      <span className="ig-score" role="status">{pairs.length - remaining.length} / {pairs.length} matched</span>
      <span role="status" aria-label={lives + ' lives remaining'} className="ig-hearts">{'♥'.repeat(lives)}{'♡'.repeat(3 - lives)}</span>
    </div>
    {!finished ? <>
      <div className="ig-find-clue"><span className="ig-eyebrow">Tap the matching tile</span><p>{current.definition}</p></div>
      <div className="ig-find-grid">
        {board.map((item, index) => remaining.includes(item.id) && <button type="button" key={item.id} onClick={() => choose(item.id)}
            className={'ig-find-tile ig-color-' + (index % 6) + (wrongId === item.id ? ' is-wrong' : '')}>{item.term}</button>)}
      </div>
      {wrongId && <p className="ig-feedback" role="status">Incorrect tile. {lives} {lives === 1 ? 'life' : 'lives'} remaining.</p>}
    </> : <div className="ig-complete" role="status">
      <h3>{lives === 0 ? 'Game over' : 'All matches found!'}</h3>
      <p>{pairs.length - remaining.length} / {pairs.length} correct · {mistakes} incorrect attempts</p>
      {current && <p>Unfinished definition: {current.definition} — {current.term}</p>}
    </div>}
  </div>;
}

/** Letter and digit tiles occupy exact slots; separators stay in place. */
export function AnagramTiles({ pairs }: { pairs: readonly GamePair[] }) {
  const signal = useGameSignal();
  const [index, setIndex] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const item = pairs[index];
  if (!item) return <div className="ig-complete" role="status">
    <h3>Anagram complete!</h3><p>{firstTry} / {pairs.length} solved independently on the first attempt.</p>
  </div>;
  return <AnagramWord key={item.id} item={item} progress={'Word ' + (index + 1) + ' of ' + pairs.length + ' · ' + firstTry + ' solved on first try'}
    last={index === pairs.length - 1} onFirstTry={() => setFirstTry((value) => value + 1)}
    onNext={() => {
      if (index === pairs.length - 1) signal('complete');
      setIndex((value) => value + 1);
    }} />;
}

function AnagramWord({ item, progress, last, onFirstTry, onNext }: {
  item: GamePair; progress: string; last: boolean; onFirstTry: () => void; onNext: () => void;
}) {
  const signal = useGameSignal();
  const characters = [...item.term.toUpperCase()];
  const solution = characters.filter(isAnagramTile).join('');
  const scrambled = [...scrambleTerm(solution)];
  const [history, setHistory] = useState<(number | null)[][]>(() => [scrambled.map(() => null)]);
  const [attempted, setAttempted] = useState(false);
  const [incorrect, setIncorrect] = useState(false);
  const [outcome, setOutcome] = useState<'correct' | 'revealed' | null>(null);
  const slots = history[history.length - 1]!;
  const nextEmpty = slots.indexOf(null);

  function update(next: (number | null)[]) {
    setHistory((previous) => [...previous, next]);
    setIncorrect(false);
  }

  function place(tile: number, slot: number) {
    if (outcome || !Number.isInteger(tile) || tile < 0 || tile >= scrambled.length || slot < 0 || slot >= slots.length) return;
    const previousSlot = slots.indexOf(tile);
    if (previousSlot === slot) return;
    signal('start');
    const next = [...slots];
    if (previousSlot >= 0) next[previousSlot] = next[slot]!;
    next[slot] = tile;
    update(next);
  }

  function check() {
    if (outcome || nextEmpty >= 0) return;
    if (slots.map((tile) => scrambled[tile!]).join('') === solution) {
      setOutcome('correct');
      if (!attempted) onFirstTry();
      signal(attempted ? 'review' : 'correct');
    } else {
      setAttempted(true);
      setIncorrect(true);
      signal('incorrect');
    }
  }

  let slotIndex = 0;
  return <div className="ig-content ig-anagram">
    <p className="ig-instruction">Tap the tiles to build the answer, or drag them into any slot. Tap a filled slot to put its tile back.</p>
    <div className="ig-score">{progress}</div>
    <p className="ig-anagram-hint">{item.definition}</p>
    <div className="ig-anagram-letters" role="group" aria-label="Letter bank">{scrambled.map((letter, tile) =>
      <button key={tile} type="button" className="ig-anagram-letter" draggable={!outcome && !slots.includes(tile)}
        disabled={Boolean(outcome) || slots.includes(tile) || nextEmpty < 0} onClick={() => place(tile, nextEmpty)}
        onDragStart={(event) => event.dataTransfer.setData('application/x-cambridge-anagram', String(tile))}
        aria-label={'Use tile ' + letter + ' at position ' + (tile + 1)}>{letter}</button>)}</div>
    <div className="ig-anagram-slots" role="group" aria-label="Answer slots">{characters.map((character, index) => {
      if (!isAnagramTile(character)) return <span key={index} className="ig-anagram-separator" aria-hidden="true">{character}</span>;
      const slot = slotIndex++;
      const tile = slots[slot];
      const letter = tile === null || tile === undefined ? null : scrambled[tile]!;
      return <div key={index} className="ig-anagram-slot" onDragOver={(event) => {
        if (!outcome && !event.currentTarget.closest('fieldset:disabled')) event.preventDefault();
      }} onDrop={(event) => {
        event.preventDefault();
        const source = event.dataTransfer.getData('application/x-cambridge-anagram');
        if (!event.currentTarget.closest('fieldset:disabled') && /^\d+$/.test(source)) place(Number(source), slot);
      }}>
        <button type="button" disabled={Boolean(outcome) || tile == null} draggable={!outcome && tile != null}
          aria-label={'Answer position ' + (slot + 1) + (letter ? ', remove ' + letter : ' · empty')}
          onDragStart={(event) => event.dataTransfer.setData('application/x-cambridge-anagram', String(tile))}
          onClick={() => update(slots.map((value, position) => position === slot ? null : value))}>{letter ?? '·'}</button>
      </div>;
    })}</div>
    {incorrect && <p className="ig-feedback" role="status">Not quite. Rearrange the tiles and try again.</p>}
    {outcome && <p className="ig-feedback" role="status">{outcome === 'correct' ? 'Correct!' : 'Answer revealed.'} {item.term}</p>}
    <div className="ig-card-controls">
      <button type="button" disabled={Boolean(outcome) || history.length < 2} onClick={() => {
        setHistory((previous) => previous.slice(0, -1));
        setIncorrect(false);
      }}>Undo</button>
      <button type="button" disabled={Boolean(outcome) || slots.every((tile) => tile === null)} onClick={() => update(slots.map(() => null))}>Clear</button>
      <button type="button" disabled={Boolean(outcome) || nextEmpty >= 0} onClick={check}>Check answer</button>
      <button type="button" disabled={Boolean(outcome)} onClick={() => { signal('review'); setOutcome('revealed'); }}>Reveal answer</button>
      <button type="button" disabled={!outcome} onClick={onNext}>{last ? 'See results →' : 'Next anagram →'}</button>
    </div>
  </div>;
}
