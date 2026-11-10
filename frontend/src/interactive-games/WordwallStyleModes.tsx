import { useMemo, useRef, useState, type DragEvent } from 'react';
import { scrambleTerm, shuffleItems, type GamePair, type SpeakingPrompt } from './game-content';
import { isAnagramTile } from './remote-games';
import { useGameAdvance, useGameSignal, type RecordAnswer } from './game-session';
import './wordwall-modes.css';

/** Chapter-scalable, submit-to-mark matching board.
 * Keyboard users can click a term and then a target instead of dragging.
 */
export function MatchUpBoard({ pairs, recordAnswer }: { pairs: readonly GamePair[]; recordAnswer: RecordAnswer }) {
  const signal = useGameSignal();
  const [pageSize, setPageSize] = useState<number | 'all'>(10);
  const visiblePageSize = pageSize === 'all' ? pairs.length : pageSize;
  const [randomLayout, setRandomLayout] = useState(false);
  const [retryEnabled, setRetryEnabled] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [locked, setLocked] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [firstScore, setFirstScore] = useState(0);
  const pages = Math.max(1, Math.ceil(pairs.length / visiblePageSize));
  const items = useMemo(() => pairs.slice(page * visiblePageSize, (page + 1) * visiblePageSize), [pairs, page, visiblePageSize]);
  const terms = useMemo(() => randomLayout ? shuffleItems(items) : items, [items, randomLayout]);
  const definitions = useMemo(() => randomLayout ? shuffleItems(items) : [...items].reverse(), [items, randomLayout]);
  const placed = Object.values(answers);
  const pageCorrect = items.filter((item) => answers[item.id] === item.id).length;
  const canRetry = retryEnabled && !retrying && pageCorrect < items.length;

  function returnTerm(termId: string) {
    if (submitted) return;
    setAnswers((previous) => Object.fromEntries(Object.entries(previous)
      .filter(([target, term]) => term !== termId || locked.includes(target))));
    setActiveTerm(null);
  }

  function assign(targetId: string, termId: string) {
    if (submitted || locked.includes(targetId) || locked.includes(termId) || !items.some((item) => item.id === termId)) return;
    setStarted(true);
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
    if (submitted || placed.length !== items.length) return;
    setSubmitted(true);
    if (retrying) {
      if (pageCorrect > locked.length) signal('review', pageCorrect - locked.length);
    } else {
      setFirstScore((previous) => previous + pageCorrect);
      if (pageCorrect) signal('correct', pageCorrect);
      if (items.length > pageCorrect) signal('incorrect', items.length - pageCorrect);
      for (const item of items) {
        recordAnswer({ id: item.id, prompt: item.definition,
          submitted: items.find((term) => term.id === answers[item.id])!.term,
          expected: item.term, correct: answers[item.id] === item.id });
      }
    }
    if (page === pages - 1 && !canRetry) signal('complete');
  }

  function nextPage() {
    if (!submitted) return;
    if (page < pages - 1) {
      setPage((current) => current + 1);
      setAnswers({});
      setLocked([]);
      setRetrying(false);
      setSubmitted(false);
      setActiveTerm(null);
    }
  }

  function retryPage() {
    const correctIds = items.filter((item) => answers[item.id] === item.id).map((item) => item.id);
    setLocked(correctIds);
    setAnswers(Object.fromEntries(correctIds.map((id) => [id, id])));
    setRetrying(true);
    setSubmitted(false);
  }

  return <div className="ig-content ig-match-board">
    <p className="ig-instruction">Drag each term beside its definition or select a term and then a slot. Place every term to submit.</p>
    <div className="ig-template-options" role="group" aria-label="Match Up options">
      <label>Matches per page <select value={pageSize} disabled={started} onChange={(event) => setPageSize(event.target.value === 'all' ? 'all' : Number(event.target.value))}>
        <option value="5">5</option><option value="10">10</option><option value="20">20</option>
        <option value="30">30</option>
        <option value="all">All ({pairs.length})</option>
      </select></label>
      <label><input type="checkbox" checked={randomLayout} disabled={started} onChange={(event) => setRandomLayout(event.target.checked)} /> Shuffle layout</label>
      <label><input type="checkbox" checked={retryEnabled} disabled={started} onChange={(event) => setRetryEnabled(event.target.checked)} /> Allow one retry</label>
    </div>
    <div className="ig-score" role="status">Page {page + 1} of {pages} · {placed.length} of {items.length} placed</div>
    <div className="ig-match-board-grid">
      <div className="ig-term-bank" onDragOver={(event) => { if (!submitted) event.preventDefault(); }} onDrop={(event) => {
        event.preventDefault();
        if (!event.currentTarget.closest('fieldset:disabled')) returnTerm(event.dataTransfer.getData('text/plain'));
      }}><h3>Move these terms</h3>
        {terms.map((item, index) => !placed.includes(item.id) && <button key={item.id} type="button" disabled={submitted} draggable={!submitted}
          aria-pressed={activeTerm === item.id} className={'ig-bank-term ig-color-' + (index % 6) + (activeTerm === item.id ? ' is-selected' : '')}
          onDragStart={(event) => { event.dataTransfer.setData('text/plain', item.id); setActiveTerm(item.id); }}
          onClick={() => setActiveTerm(item.id)}>{item.term}</button>)}
      </div>
      <div className="ig-match-definitions"><h3>Drop term beside definition</h3>
        {definitions.map((item) => {
          const chosen = items.find((candidate) => candidate.id === answers[item.id]);
          const isCorrect = answers[item.id] === item.id;
          return <div key={item.id} className={'ig-match-row' + (locked.includes(item.id) || (submitted && isCorrect) ? ' is-correct' : submitted ? ' is-wrong' : '')}>
            <div className="ig-drop-target" onDragOver={(event) => { if (!submitted) event.preventDefault(); }} onDrop={(event) => drop(event, item.id)}>
              <button type="button" draggable={Boolean(chosen) && !submitted && !locked.includes(item.id)}
                onDragStart={(event) => { if (chosen) event.dataTransfer.setData('text/plain', chosen.id); }}
                disabled={submitted || locked.includes(item.id) || (!chosen && !activeTerm)} aria-label={(chosen ? chosen.term : 'Place term') + '. Answer slot for ' + item.definition}
                onClick={() => { if (activeTerm) assign(item.id, activeTerm); else if (chosen) returnTerm(chosen.id); }}>
                {chosen ? chosen.term : 'Place term'}
              </button>
            </div>
            <div className="ig-match-description">{item.definition}
              {submitted && !isCorrect && !canRetry && <small>Correct: {item.term}</small>}
            </div>
          </div>;
        })}
      </div>
    </div>
    <div className="ig-match-actions">
      {!submitted ? <button type="button" className="ig-primary-button" disabled={placed.length !== items.length}
        onClick={submitPage}>Submit Answers</button>
        : <>
          <p role="status"><strong>{pageCorrect} / {items.length} correct.</strong> First-submission total: {firstScore} / {pairs.length}.</p>
          {canRetry && <button type="button" onClick={retryPage}>Retry incorrect matches</button>}
          {page < pages - 1 ? <button type="button" className="ig-primary-button" onClick={nextPage}>Next page →</button>
            : canRetry && <button type="button" className="ig-primary-button" onClick={() => signal('complete')}>See results →</button>}
        </>}
    </div>
  </div>;
}

/** Speaking practice is a physical deck: shuffle, deal and undo, without claiming speech has been recorded. */
export function SpeakingDeck({ prompts }: { prompts: readonly SpeakingPrompt[] }) {
  const signal = useGameSignal();
  const [pile, setPile] = useState(() => shuffleItems(prompts));
  const [history, setHistory] = useState<SpeakingPrompt[][]>([]);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [dealSize, setDealSize] = useState(1);
  const [autoShuffle, setAutoShuffle] = useState(false);
  const [slowDeal, setSlowDeal] = useState(false);
  const seen = useRef(new Set<string>());
  const current = history.at(-1) ?? [];
  const canDeal = pile.length > 0 || (autoShuffle && prompts.length > 0);

  function deal() {
    if (!canDeal) return;
    signal('deal');
    const fresh = pile.length === 0;
    const deck = fresh ? shuffleItems(prompts) : pile;
    const batch = deck.slice(0, dealSize);
    const newCards = batch.filter((item) => !seen.current.has(item.id));
    for (const item of newCards) seen.current.add(item.id);
    if (newCards.length) signal('review', newCards.length);
    setPile(deck.slice(batch.length));
    setHistory((previous) => fresh ? [batch] : [...previous, batch]);
    setRevealed([]);
  }

  function undo() {
    if (!current.length) return;
    setHistory((previous) => previous.slice(0, -1));
    setPile((previous) => [...current, ...previous]);
    setRevealed([]);
  }

  return <div className="ig-content">
    <p className="ig-instruction">Deal a card from the shuffled deck. Name the term and explain it in your own words before revealing the answer. This activity does not record audio.</p>
    <div className="ig-template-options" role="group" aria-label="Speaking Cards options">
      <label>Cards per deal <select value={dealSize} onChange={(event) => setDealSize(Number(event.target.value))}>
        <option value="1">1</option><option value="2">2</option><option value="3">3</option>
      </select></label>
      <label>Deal animation <select value={slowDeal ? 'slow' : 'fast'} onChange={(event) => setSlowDeal(event.target.value === 'slow')}>
        <option value="fast">Fast</option><option value="slow">Slow</option>
      </select></label>
      <label><input type="checkbox" checked={autoShuffle} onChange={(event) => setAutoShuffle(event.target.checked)} /> Reshuffle when empty</label>
    </div>
    <div className="ig-score" role="status">{prompts.length - pile.length} dealt · {pile.length} remaining</div>
    <div className={'ig-deck-stage' + (slowDeal ? ' is-slow-deal' : '')}>
      <button type="button" className="ig-deck-stack" onClick={deal} disabled={!canDeal} aria-label={'Deal cards. ' + pile.length + ' cards left'}>
        <span className="ig-deck-pattern" aria-hidden="true">◆</span><small>{pile.length} cards</small>
      </button>
      <div className="ig-dealt-cards" role="region" aria-label="Current speaking cards" aria-live="polite">
        {current.map((item) => {
          const show = revealed.includes(item.id);
          return <div className="ig-dealt-card" key={item.id}>
            <span className="ig-eyebrow">YOUR SPEAKING PROMPT</span><p>{item.prompt}</p>
            {show && <div className="ig-reveal"><strong>Matching term</strong><p>{item.talkingPoints}</p></div>}
            <button type="button" aria-expanded={show} onClick={() => {
              if (!show) signal('flip');
              setRevealed((previous) => show ? previous.filter((id) => id !== item.id) : [...previous, item.id]);
            }}>{show ? 'Hide term' : 'Reveal term'}</button>
          </div>;
        })}
        {!current.length && <div className="ig-dealt-card"><p className="ig-dealt-placeholder">Deal to reveal a prompt.</p></div>}
      </div>
    </div>
    <div className="ig-deck-controls">
      <button type="button" onClick={() => { signal('flip'); setPile(shuffleItems(pile)); }} disabled={pile.length < 2}>Shuffle</button>
      <button type="button" onClick={undo} disabled={!history.length}>Undo</button>
      <button type="button" onClick={() => canDeal ? deal() : signal('complete')} disabled={!prompts.length}>
        {canDeal ? 'Deal' : 'Finish deck'}
      </button>
    </div>
  </div>;
}

/** Persistent multi-tile board; each successful answer removes a tile. */
export function FindMatchBoard({ pairs, recordAnswer }: { pairs: readonly GamePair[]; recordAnswer: RecordAnswer }) {
  const signal = useGameSignal();
  const [clues] = useState(() => shuffleItems(pairs));
  const [board] = useState(() => shuffleItems(pairs));
  const [index, setIndex] = useState(0);
  const [limit, setLimit] = useState(3);
  const [remove, setRemove] = useState(true);
  const [mistakes, setMistakes] = useState(0);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const current = clues[index];
  const lives = limit ? limit - mistakes : null;
  const finished = !current || lives === 0;
  const matched = new Set(clues.slice(0, index).map((item) => item.id));

  function choose(item: GamePair) {
    if (!current || finished) return;
    const correct = item.id === current.id;
    if (!wrongId) recordAnswer({ id: current.id, prompt: current.definition, submitted: item.term, expected: current.term, correct });
    if (correct) {
      signal(wrongId ? 'review' : 'correct');
      if (index === clues.length - 1) signal('complete');
      setIndex((previous) => previous + 1);
      setWrongId(null);
      setFeedback(`Correct · ${item.term}${remove ? ' removed' : ''}.`);
    } else {
      signal('incorrect');
      if (lives === 1) signal('complete');
      setMistakes((previous) => previous + 1);
      setWrongId(item.id);
      setFeedback('Incorrect tile. Try another.');
    }
  }

  return <div className="ig-content ig-findmatch">
    <div className="ig-template-options" role="group" aria-label="Find the Match options">
      <label>Lives <select value={limit} disabled={index > 0 || mistakes > 0} onChange={(event) => setLimit(Number(event.target.value))}>
        <option value="0">Unlimited</option><option value="1">1</option><option value="3">3</option><option value="5">5</option>
      </select></label>
      <label><input type="checkbox" checked={remove} disabled={index > 0 || mistakes > 0} onChange={(event) => setRemove(event.target.checked)} /> Remove matched tiles</label>
    </div>
    <div className="ig-find-status">
      <span className="ig-score" role="status">{index} / {pairs.length} matched</span>
      {lives !== null && <span role="status" aria-label={lives + ' lives remaining'} className="ig-hearts">{'♥'.repeat(lives)}{'♡'.repeat(limit - lives)}</span>}
    </div>
    {!finished ? <>
      <div className="ig-find-clue"><span className="ig-eyebrow">Tap the matching tile</span><p aria-live="polite">{current.definition}</p></div>
      <div className="ig-find-grid">
        {board.map((item, position) => remove && matched.has(item.id)
          ? <span key={item.id} className="ig-find-gap" aria-hidden="true" />
          : <button type="button" key={item.id} onClick={() => choose(item)}
            className={'ig-find-tile ig-color-' + (position % 6) + (wrongId === item.id ? ' is-wrong' : '')}>{item.term}</button>)}
      </div>
      {feedback && <p className="ig-feedback" role="status">{feedback}</p>}
    </> : <div className="ig-complete" role="status">
      <h3>{lives === 0 ? 'Game over' : 'All matches found!'}</h3>
      <p>{index} / {pairs.length} matched · {mistakes} incorrect attempts</p>
    </div>}
  </div>;
}

/** Letter and digit tiles occupy exact slots; separators stay in place. */
export function AnagramTiles({ pairs, blocked, recordAnswer }: {
  pairs: readonly GamePair[]; blocked: boolean; recordAnswer: RecordAnswer;
}) {
  const signal = useGameSignal();
  const [index, setIndex] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [started, setStarted] = useState(false);
  const [instant, setInstant] = useState(true);
  const [auto, setAuto] = useState(true);
  const [showClue, setShowClue] = useState(true);
  const [rearrange, setRearrange] = useState(false);
  const item = pairs[index];
  if (!item) return <div className="ig-complete" role="status">
    <h3>Anagram complete!</h3><p>{firstTry} / {pairs.length} solved on the first attempt.</p>
  </div>;
  return <div className="ig-content ig-anagram">
    <div className="ig-template-options" role="group" aria-label="Anagram options">
      <label>Marking <select value={instant ? 'letter' : 'submit'} disabled={started}
        onChange={(event) => setInstant(event.target.value === 'letter')}>
        <option value="letter">Every letter</option><option value="submit">On submit</option>
      </select></label>
      <label>Letter layout <select value={rearrange ? 'inline' : 'bank'} disabled={started}
        onChange={(event) => setRearrange(event.target.value === 'inline')}>
        <option value="bank">Letters above word</option><option value="inline">Rearrange letters in the word</option>
      </select></label>
      <label><input type="checkbox" checked={auto} onChange={(event) => setAuto(event.target.checked)} /> Automatically proceed</label>
      <label><input type="checkbox" checked={showClue} onChange={(event) => setShowClue(event.target.checked)} /> Show clue</label>
    </div>
    <AnagramWord key={item.id + ':' + rearrange} item={item} progress={`Word ${index + 1} of ${pairs.length} · ${firstTry} solved on first try`}
      last={index === pairs.length - 1} instant={instant} auto={auto && !blocked} showClue={showClue}
      rearrange={rearrange} recordAnswer={recordAnswer}
      onStart={() => setStarted(true)} onFirstTry={() => setFirstTry((value) => value + 1)} onNext={() => {
        if (blocked) return;
        if (index === pairs.length - 1) signal('complete');
        setIndex((value) => value + 1);
      }} />
  </div>;
}

function AnagramWord({ item, progress, last, instant, auto, showClue, rearrange, recordAnswer, onStart, onFirstTry, onNext }: {
  item: GamePair; progress: string; last: boolean; instant: boolean; auto: boolean; showClue: boolean; rearrange: boolean;
  recordAnswer: RecordAnswer; onStart: () => void; onFirstTry: () => void; onNext: () => void;
}) {
  const signal = useGameSignal();
  const characters = [...item.term.toUpperCase()];
  const solution = characters.filter(isAnagramTile).join('');
  const scrambled = [...scrambleTerm(solution)];
  const initialSlots = () => scrambled.map((_, index) => rearrange ? index : null);
  const [history, setHistory] = useState<(number | null)[][]>(() => [initialSlots()]);
  const [pickedTile, setPickedTile] = useState<number | null>(null);
  const [firstMistake, setFirstMistake] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [outcome, setOutcome] = useState<'correct' | 'revealed' | null>(null);
  const slots = history[history.length - 1]!;
  const nextEmpty = slots.indexOf(null);
  const isCorrectSlot = (tile: number | null | undefined, slot: number) => tile != null && scrambled[tile] === solution[slot];
  const isLocked = (slot: number) => instant && isCorrectSlot(slots[slot], slot);
  useGameAdvance(auto && outcome === 'correct', onNext);

  function update(next: (number | null)[]) {
    setHistory((previous) => [...previous, next]);
    setPickedTile(null);
    setFeedback('');
  }

  function wrong(answer: string, message: string) {
    if (firstMistake === null) {
      setFirstMistake(answer);
      recordAnswer({ id: item.id, prompt: item.definition, submitted: answer, expected: item.term, correct: false });
    }
    setFeedback(message);
    signal('incorrect');
  }

  function finish(revealed: boolean) {
    const firstCorrect = !firstMistake && !revealed;
    setOutcome(revealed ? 'revealed' : 'correct');
    setFeedback('');
    if (firstMistake === null) recordAnswer({ id: item.id, prompt: item.definition,
      submitted: revealed ? 'Answer revealed' : item.term, expected: item.term, correct: firstCorrect });
    if (firstCorrect) onFirstTry();
    signal(firstCorrect ? 'correct' : 'review');
  }

  function place(tile: number, slot: number) {
    if (outcome || !Number.isInteger(tile) || tile < 0 || tile >= scrambled.length || slot < 0 || slot >= slots.length) return;
    const previousSlot = slots.indexOf(tile);
    if (previousSlot === slot || isLocked(slot) || (previousSlot >= 0 && isLocked(previousSlot))) return;
    onStart();
    signal('start');
    if (instant && !rearrange && scrambled[tile] !== solution[slot]) {
      wrong(`${scrambled[tile]} in slot ${slot + 1}`, `That letter does not fit in slot ${slot + 1}. Try another.`);
      return;
    }
    const next = [...slots];
    if (previousSlot >= 0) next[previousSlot] = next[slot]!;
    next[slot] = tile;
    update(next);
    if (instant && next.every(isCorrectSlot)) finish(false);
    else if (instant && rearrange && !isCorrectSlot(tile, slot) && !isCorrectSlot(next[previousSlot], previousSlot)) {
      wrong(`${scrambled[tile]} in slot ${slot + 1}`, 'Neither tile is in its correct position yet.');
    }
  }

  function check() {
    if (outcome || nextEmpty >= 0) return;
    const submitted = slots.map((tile) => scrambled[tile!]).join('');
    if (submitted === solution) finish(false);
    else wrong(submitted, 'Not quite. Rearrange the tiles and try again.');
  }

  let slotIndex = 0;
  return <>
    <p className="ig-instruction">{rearrange ? 'Drag a letter onto another to swap them, or select two letters.' : 'Drag letters into slots, or tap a letter to place it in the next blank.'}</p>
    <div className="ig-score">{progress}</div>
    {showClue && <p className="ig-anagram-hint">{item.definition}</p>}
    {!rearrange && <div className="ig-anagram-letters" role="group" aria-label="Letter bank">{scrambled.map((letter, tile) =>
      <button key={tile} type="button" className="ig-anagram-letter" draggable={!outcome && !slots.includes(tile)}
        disabled={Boolean(outcome) || slots.includes(tile) || nextEmpty < 0} onClick={() => place(tile, nextEmpty)}
        onDragStart={(event) => event.dataTransfer.setData('application/x-cambridge-anagram', String(tile))}
        aria-label={`Use tile ${letter} at position ${tile + 1}`}>{letter}</button>)}</div>}
    <div className="ig-anagram-slots" role="group" aria-label="Answer slots">{characters.map((character, index) => {
      if (!isAnagramTile(character)) return <span key={index} className="ig-anagram-separator" aria-hidden="true">{character}</span>;
      const slot = slotIndex++;
      const tile = slots[slot];
      const letter = tile == null ? null : scrambled[tile]!;
      const locked = isLocked(slot);
      return <div key={index} className={'ig-anagram-slot' + (locked ? ' is-correct' : '')} onDragOver={(event) => {
        if (!outcome && !locked && !event.currentTarget.closest('fieldset:disabled')) event.preventDefault();
      }} onDrop={(event) => {
        event.preventDefault();
        const source = event.dataTransfer.getData('application/x-cambridge-anagram');
        if (!event.currentTarget.closest('fieldset:disabled') && /^\d+$/.test(source)) place(Number(source), slot);
      }}>
        <button type="button" disabled={Boolean(outcome) || !letter || locked} draggable={!outcome && Boolean(letter) && !locked}
          aria-label={letter ? `${letter}, position ${slot + 1}${locked ? ', correct' : ''}` : `Empty answer position ${slot + 1}`}
          aria-pressed={rearrange && !locked ? pickedTile === tile : undefined}
          onDragStart={(event) => event.dataTransfer.setData('application/x-cambridge-anagram', String(tile))}
          onClick={() => {
            if (!rearrange) update(slots.map((value, position) => position === slot ? null : value));
            else if (pickedTile === null || pickedTile === tile) setPickedTile(pickedTile === tile ? null : tile!);
            else place(pickedTile, slot);
          }}>{letter ?? '·'}</button>
      </div>;
    })}</div>
    {feedback && <p className="ig-feedback" role="status">{feedback}</p>}
    {outcome && <p className="ig-feedback" role="status">{outcome === 'correct' ? 'Correct!' : 'Answer revealed.'} {item.term}</p>}
    <div className="ig-card-controls">
      {!instant && <>
        <button type="button" disabled={Boolean(outcome) || history.length < 2} onClick={() => {
          setHistory((previous) => previous.slice(0, -1)); setPickedTile(null); setFeedback('');
        }}>Undo</button>
        <button type="button" disabled={Boolean(outcome) || slots.every((tile) => tile === null)} onClick={() => update(initialSlots())}>{rearrange ? 'Reset letters' : 'Clear'}</button>
        <button type="button" disabled={Boolean(outcome) || nextEmpty >= 0} onClick={check}>Submit answer</button>
      </>}
      <button type="button" disabled={Boolean(outcome)} onClick={() => { onStart(); finish(true); }}>Reveal answer</button>
      <button type="button" disabled={!outcome} onClick={onNext}>{last ? 'See results →' : 'Next anagram →'}</button>
    </div>
  </>;
}
