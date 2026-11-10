import { useState, type KeyboardEvent } from 'react';
import { gamePairProvenance, shuffleItems, type GamePair } from './game-content';
import { useGameSignal } from './game-session';

export function FlashCards({ pairs }: { pairs: readonly GamePair[] }) {
  const signal = useGameSignal();
  const [deck, setDeck] = useState(pairs);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(() => new Set<string>());
  const [marking, setMarking] = useState(false);
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [repeatMissed, setRepeatMissed] = useState(false);
  const [auto, setAuto] = useState(false);
  const card = deck[index];
  if (!card) return <p>No cards available.</p>;
  const cardId = card.id;

  function go(next: number) {
    if (next < 0 || next >= deck.length) return;
    signal('start');
    setIndex(next);
    setFlipped(false);
  }

  function flip() {
    if (!flipped && !reviewed.has(cardId)) {
      setReviewed((previous) => new Set(previous).add(cardId));
      signal('review');
    }
    signal('flip');
    setFlipped(!flipped);
  }

  function next(nextMarks = marks) {
    if (index < deck.length - 1) { go(index + 1); return; }
    const missed = repeatMissed && marking ? deck.filter((item) => nextMarks[item.id] === false) : [];
    if (missed.length) {
      setDeck(shuffleItems(missed));
      setIndex(0);
      setFlipped(false);
      setMarks({});
    } else signal('complete');
  }

  function mark(knew: boolean) {
    const nextMarks = { ...marks, [cardId]: knew };
    setMarks(nextMarks);
    if (auto) next(nextMarks);
  }

  function arrows(event: KeyboardEvent<HTMLDivElement>) {
    if (!(event.target instanceof HTMLButtonElement) || event.target.disabled) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
    if (event.key === 'ArrowRight' && index < deck.length - 1) { event.preventDefault(); go(index + 1); }
  }

  return <div className="ig-content" onKeyDown={arrows}>
    <p className="ig-instruction">Think of the matching term, then flip the card. Use the arrows to move through the deck.</p>
    <div className="ig-template-options" role="group" aria-label="Flash Cards options">
      <label><input type="checkbox" checked={marking} onChange={(event) => setMarking(event.target.checked)} /> Self-mark cards</label>
      {marking && <>
        <label><input type="checkbox" checked={repeatMissed} onChange={(event) => setRepeatMissed(event.target.checked)} /> Repeat missed cards</label>
        <label><input type="checkbox" checked={auto} onChange={(event) => setAuto(event.target.checked)} /> Automatically proceed after marking</label>
      </>}
      <button type="button" disabled={deck.length < 2} onClick={() => {
        setDeck(shuffleItems(deck)); setIndex(0); setFlipped(false);
      }}>Shuffle</button>
    </div>
    <div className="ig-score">Card {index + 1} / {deck.length} · {reviewed.size} reviewed</div>
    <button type="button" className={'ig-flashcard' + (flipped ? ' is-flipped' : '')} onClick={flip}>
      <span className="ig-eyebrow">{flipped ? 'KEY TERM' : 'DEFINITION'}</span>
      <strong>{flipped ? card.term : card.definition}</strong>
      {marking && flipped && marks[cardId] !== undefined && <span className={'ig-flashcard-mark' + (marks[cardId] ? ' is-correct' : ' is-wrong')}>
        {marks[cardId] ? '✓ Knew it' : '✕ Practise again'}
      </span>}
      <small>{flipped ? 'Click to see the definition' : 'Click to reveal the term'}</small>
    </button>
    {flipped && gamePairProvenance(card) && <p className="ig-source-context" role="note">{gamePairProvenance(card)}</p>}
    {marking && flipped && <div className="ig-card-controls" role="group" aria-label="Self-mark this card">
      <button type="button" aria-pressed={marks[card.id] === true} onClick={() => mark(true)}>✓ Knew it</button>
      <button type="button" aria-pressed={marks[card.id] === false} onClick={() => mark(false)}>✕ Practise again</button>
    </div>}
    <div className="ig-card-controls">
      <button type="button" disabled={index === 0} onClick={() => go(index - 1)}>← Previous</button>
      <button type="button" onClick={flip}>{flipped ? 'Show definition' : 'Flip card'}</button>
      <button type="button" onClick={() => next()}>{index < deck.length - 1 ? 'Next →'
        : repeatMissed && marking && deck.some((item) => marks[item.id] === false) ? 'Review missed cards' : 'Finish deck'}</button>
    </div>
  </div>;
}
