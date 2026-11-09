import { useMemo, useState, type DragEvent } from 'react';
import { scrambleTerm, type GamePair, type SpeakingPrompt } from './game-content';
import { isAnagramEligible } from './remote-games';
import './wordwall-modes.css';

/** Chapter-scalable, submit-to-mark matching board.
 * Keyboard users can click a term and then a target instead of dragging.
 */
export function MatchUpBoard({ pairs }: { pairs: readonly GamePair[] }) {
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
    assign(targetId, event.dataTransfer.getData('text/plain'));
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
              <button type="button" disabled={submitted || (!chosen && !activeTerm)} aria-label={(chosen ? chosen.term : 'Place term') + '. Answer slot for ' + item.definition}
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
        onClick={() => setSubmitted(true)}>Submit Answers</button>
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
  const [pile, setPile] = useState(() => prompts.map((_, index) => index));
  const [history, setHistory] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const current = history.length ? prompts[history[history.length - 1]!] : null;
  function shuffle() {
    const next = [...pile];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j]!, next[i]!];
    }
    setPile(next);
  }
  function deal() {
    if (!pile.length) return;
    const index = pile[pile.length - 1]!;
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
    <p className="ig-instruction">Shuffle the deck and deal a card. Speak about the prompt before revealing the suggested talking points. This activity does not record or verify audio.</p>
    <div className="ig-score" role="status">{history.length} dealt · {pile.length} remaining</div>
    <div className="ig-deck-stage">
      <button type="button" className="ig-deck-stack" onClick={deal} disabled={!pile.length} aria-label={'Deal a card. ' + pile.length + ' cards left'}>
        <span className="ig-deck-pattern" aria-hidden="true">◆</span><small>{pile.length} cards</small>
      </button>
      <div className="ig-dealt-card" role="region" aria-label="Current speaking card">
        {current ? <>
          <span className="ig-eyebrow">YOUR SPEAKING PROMPT</span>
          <p>{current.prompt}</p>
          {revealed && <div className="ig-reveal"><strong>Suggested talking points</strong><p>{current.talkingPoints}</p></div>}
          <button type="button" onClick={() => setRevealed((value) => !value)}>{revealed ? 'Hide talking points' : 'Reveal talking points'}</button>
        </> : <p className="ig-dealt-placeholder">{pile.length ? 'Deal a card to reveal a question.' : 'All cards have been dealt. Undo or restart.'}</p>}
      </div>
    </div>
    <div className="ig-deck-controls">
      <button type="button" onClick={shuffle} disabled={pile.length < 2}>Shuffle</button>
      <button type="button" onClick={undo} disabled={!history.length}>Undo</button>
      <button type="button" onClick={deal} disabled={!pile.length}>Deal</button>
    </div>
  </div>;
}

/** Persistent multi-tile board; each successful answer removes a tile. */
export function FindMatchBoard({ pairs }: { pairs: readonly GamePair[] }) {
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
      setRemaining((previous) => previous.filter((candidate) => candidate !== id));
      setWrongId(null);
    } else {
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
        {board.filter((item) => remaining.includes(item.id)).map((item, index) =>
          <button type="button" key={item.id} onClick={() => choose(item.id)}
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

/** Numbered, movable letter tiles. Click/tap to place, click a slot to remove; drag/drop also works. */
export function AnagramTiles({ pairs }: { pairs: readonly GamePair[] }) {
  const words = useMemo(() => pairs.filter((item) => isAnagramEligible(item.term)), [pairs]);
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const [failed, setFailed] = useState(0);
  const [complete, setComplete] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const item = words[index];
  if (!item) return <div className="ig-complete"><h3>Anagram complete!</h3><p>{firstTry} / {words.length} solved independently on the first attempt.</p></div>;
  const scrambled = [...scrambleTerm(item.term)];
  const locked = complete || revealed;
  const answer = placed.map((position) => scrambled[position]).join('');
  function place(letterIndex: number, slotIndex = placed.length) {
    if (locked || !Number.isInteger(letterIndex) || !Number.isInteger(slotIndex) || placed.includes(letterIndex) || letterIndex < 0 || letterIndex >= scrambled.length || slotIndex < 0 || slotIndex > placed.length) return;
    setPlaced((previous) => [...previous.slice(0, slotIndex), letterIndex, ...previous.slice(slotIndex)]);
  }
  function check() {
    if (locked || placed.length !== scrambled.length) return;
    if (answer.toLocaleLowerCase('en') === item.term.toLocaleLowerCase('en')) {
      setComplete(true);
      if (failed === 0) setFirstTry((previous) => previous + 1);
    } else setFailed((previous) => previous + 1);
  }
  function next() {
    setIndex((previous) => previous + 1); setPlaced([]); setFailed(0); setComplete(false); setRevealed(false);
  }
  return <div className="ig-content ig-anagram">
    <p className="ig-instruction">Arrange each letter in the blank slots. Select letter tiles or drag them into place. Select a filled slot to return that letter.</p>
    <div className="ig-score">Word {index + 1} of {words.length} · {firstTry} solved on first try</div>
    <p className="ig-anagram-hint">{item.definition}</p>
    <div className="ig-anagram-letters" role="group" aria-label="Letter bank">{scrambled.map((letter, tileIndex) =>
      <button key={tileIndex} type="button" className="ig-anagram-letter" draggable={!locked && !placed.includes(tileIndex)}
        disabled={locked || placed.includes(tileIndex)} onClick={() => place(tileIndex)}
        onDragStart={(event) => event.dataTransfer.setData('text/plain', String(tileIndex))}
        aria-label={'Use letter ' + letter + ' at position ' + (tileIndex + 1)}>{letter}</button>)}</div>
    <div className="ig-anagram-slots" role="group" aria-label="Answer slots">{scrambled.map((_, slotIndex) => <div
      key={slotIndex} className="ig-anagram-slot" onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); const tile = event.dataTransfer.getData('text/plain'); if (/^\d+$/.test(tile)) place(Number(tile), slotIndex); }}>
      <button type="button" disabled={locked || placed[slotIndex] === undefined}
        aria-label={'Answer position ' + (slotIndex + 1) + (placed[slotIndex] === undefined ? ' empty' : ', remove ' + scrambled[placed[slotIndex]!])}
        onClick={() => setPlaced((previous) => previous.filter((_, i) => i !== slotIndex))}>{placed[slotIndex] !== undefined ? scrambled[placed[slotIndex]!] : '·'}</button>
    </div>)}</div>
    {failed > 0 && !locked && <p className="ig-feedback" role="status">Not quite. Rearrange the letters and try again.</p>}
    {locked && <p className="ig-feedback" role="status">{complete ? 'Correct!' : 'Answer revealed, not counted as an independent correct answer.'} {item.term}</p>}
    <div className="ig-card-controls">
      <button type="button" disabled={locked || !placed.length} onClick={() => setPlaced((previous) => previous.slice(0, -1))}>Undo</button>
      <button type="button" disabled={locked || !placed.length} onClick={() => setPlaced([])}>Clear</button>
      <button type="button" disabled={locked || placed.length !== scrambled.length} onClick={check}>Check answer</button>
      <button type="button" disabled={locked} onClick={() => setRevealed(true)}>Reveal answer</button>
      <button type="button" disabled={!locked} onClick={next}>{index === words.length - 1 ? 'See results →' : 'Next anagram →'}</button>
    </div>
  </div>;
}
