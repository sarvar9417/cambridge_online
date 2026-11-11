import { useMemo, useState, type DragEvent } from 'react';
import { COMPARE_DECKS, type CompareDeck } from './concept-compare-bank';
import { useGameSignal } from './game-session';
import type { GameScope } from './remote-games';
import './concept-compare.css';

type Side = 'A' | 'B';
type Selected = Partial<Record<Side, true>>;
interface Item { index: number; statement: string; expected: string; }
const match = (actual: Selected | undefined, expected: string) =>
  (Boolean(actual?.A) === expected.includes('A') ? 1 : 0) +
  (Boolean(actual?.B) === expected.includes('B') ? 1 : 0);
function shuffled<T,>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** A ninth, independent 9618 game — existing definition Match Up stays unchanged. */
export function ConceptCompareGame({ courseCode, scopes }: {
  courseCode: '9618' | '0478'; scopes: readonly GameScope[];
}) {
  const signal = useGameSignal();
  // Chapter membership is currently the only comparison-bank scope.
  const chapters = new Set(scopes.map(scope => scope.chapterNo));
  const available = COMPARE_DECKS.filter(deck => chapters.has(deck.chapterNo));
  const [deckId, setDeckId] = useState<string>('');
  const [quick, setQuick] = useState(false);
  const [shuffleRevision, setShuffleRevision] = useState(0);
  const [placed, setPlaced] = useState<Record<number, Selected>>({});
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const deck: CompareDeck | undefined = available.find(item => item.id === deckId) ?? available[0];
  const items = useMemo<Item[]>(() => {
    if (!deck) return [];
    const original = deck.cards.map(([statement, expected], index) => ({ statement, expected, index }));
    const mixed = shuffled(original);
    return quick ? mixed.slice(0, 8) : mixed;
  }, [deck?.id, quick, shuffleRevision]);
  const markedCount = items.filter(item => Boolean(placed[item.index]?.A || placed[item.index]?.B)).length;
  const totalScore = items.reduce((sum, item) => sum + match(placed[item.index], item.expected), 0);
  const fullyCorrect = items.filter(item => match(placed[item.index], item.expected) === 2).length;
  const possible = items.length * 2;

  function reset(next?: { deckId?: string; quick?: boolean }) {
    setPlaced({});
    setSubmitted(false);
    setStarted(false);
    setActiveCard(null);
    if (next?.deckId !== undefined) setDeckId(next.deckId);
    if (next?.quick !== undefined) setQuick(next.quick);
    setShuffleRevision(value => value + 1);
  }
  function update(index: number, side: Side, remove = false) {
    if (submitted || !deck || !deck.cards[index]) return;
    if (!started) { setStarted(true); signal('start'); }
    setPlaced(old => {
      const selected = { ...(old[index] ?? {}) };
      if (remove) delete selected[side];
      else selected[side] = true;
      return { ...old, [index]: selected };
    });
    setActiveCard(null);
  }
  function drop(event: DragEvent<HTMLElement>, side: Side) {
    event.preventDefault();
    const index = Number(event.dataTransfer.getData('text/plain'));
    if (Number.isSafeInteger(index) && items.some(item => item.index === index)) update(index, side);
  }
  function submit() {
    if (submitted || markedCount !== items.length || !items.length) return;
    setSubmitted(true);
    if (totalScore) signal('correct', totalScore);
    if (possible > totalScore) signal('incorrect', possible - totalScore);
    signal('complete');
  }

  if (courseCode !== '9618') return <div className="ig-content ig-compare-empty" role="status">
    <p>Concept Compare is currently available for Cambridge 9618 only.</p>
  </div>;
  if (!deck) return <div className="ig-content ig-compare-empty" role="status">
    <h3>No comparison pairs in this selection yet.</h3>
    <p>Select a chapter with a curated comparison deck: 2, 3, 4, 5, 6, 7, 8, 14, 15, 16, 17 or 18.</p>
    <p>Current content is chapter-filtered; section-level comparison mapping is not yet verified.</p>
  </div>;

  return <div className="ig-content ig-compare">
    <p className="ig-instruction">Move each statement to one or BOTH terms. A shared statement stays available for both columns. All answers are checked together at the end.</p>
    <div className="ig-compare-controls">
      <label>Comparison
        <select aria-label="Comparison pair" value={deck.id} disabled={submitted}
          onChange={event => reset({ deckId: event.target.value })}>
          {available.map(item => <option key={item.id} value={item.id}>Chapter {item.chapterNo} · {item.a} vs {item.b}</option>)}
        </select>
      </label>
      <label>Cards
        <select aria-label="Comparison length" value={quick ? 'quick' : 'complete'} disabled={started || submitted}
          onChange={event => reset({ quick: event.target.value === 'quick' })}>
          <option value="complete">Complete ({deck.cards.length})</option>
          <option value="quick">Quick (8)</option>
        </select>
      </label>
    </div>
    <div className="ig-score" role="status">{markedCount} / {items.length} statements assigned {submitted ? '· ' + totalScore + ' / ' + possible + ' points' : ''}</div>
    <div className="ig-compare-targets">
      {(['A','B'] as const).map(side => <section key={side} className="ig-compare-target"
        onDragOver={event => { if (!submitted) event.preventDefault(); }}
        onDrop={event => drop(event, side)} aria-label={side === 'A' ? deck.a : deck.b}>
        <h3>{side === 'A' ? deck.a : deck.b}</h3>
        <p>Drop a statement here or use its Add button.</p>
        {items.filter(item => placed[item.index]?.[side]).map(item =>
          <div key={item.index} className={'ig-compare-placement ' +
            (submitted ? (item.expected.includes(side) ? 'is-correct' : 'is-wrong') : '')}>
            <span>{item.statement}</span>
            {!submitted && <button type="button" aria-label={'Remove from ' + (side === 'A' ? deck.a : deck.b)}
              onClick={() => update(item.index, side, true)}>×</button>}
          </div>)}
      </section>)}
    </div>
    <div className="ig-compare-bank">
      <h3>Mixed statements</h3>
      <p className="ig-instruction">Drag any card to a column, or press Add to place it. The card remains here so you can use it in the other column too.</p>
      {items.map(item => {
        const chosen = placed[item.index] ?? {};
        const exact = match(chosen, item.expected) === 2;
        return <div key={item.index} className={'ig-compare-card' +
          (activeCard === item.index ? ' is-active' : '') +
          (submitted ? exact ? ' is-correct' : ' is-wrong' : '')}
          draggable={!submitted}
          onDragStart={event => { event.dataTransfer.setData('text/plain', String(item.index)); setActiveCard(item.index); }}
          onDragEnd={() => setActiveCard(null)}>
          <div className="ig-compare-card-text"><span className="ig-compare-number">{item.index + 1}</span>
            <strong>{item.statement}</strong></div>
          <div className="ig-compare-side-buttons">
            {(['A','B'] as const).map(side => <button key={side} type="button" disabled={submitted}
              className={chosen[side] ? 'is-placed' : ''}
              aria-pressed={Boolean(chosen[side])}
              aria-label={(chosen[side] ? 'Remove from ' : 'Add to ') + (side === 'A' ? deck.a : deck.b)}
              onClick={() => update(item.index, side, Boolean(chosen[side]))}>
              {chosen[side] ? '✓ ' : '+ '}{side === 'A' ? deck.a : deck.b}
            </button>)}
          </div>
          {submitted && <p className="ig-compare-answer">{exact ? '✓ Fully correct' :
            'Correct placement: ' + (item.expected === 'AB' ? deck.a + ' AND ' + deck.b :
              item.expected === 'A' ? deck.a : deck.b)}
            {' · ' + match(chosen, item.expected) + '/2 points'}</p>}
        </div>;
      })}
    </div>
    {!submitted ? <button type="button" className="ig-primary-button ig-compare-submit"
      disabled={markedCount !== items.length} onClick={submit}>
      Check Answers · {markedCount}/{items.length}
    </button> : <div className="ig-compare-summary" role="status">
      <h3>{totalScore} / {possible} points · {Math.round(totalScore / possible * 100)}%</h3>
      <p>{fullyCorrect} of {items.length} statements fully matched. Each A/B decision is scored separately — incorrectly selecting both cannot earn full marks.</p>
      <p>Source: Hodder 9618, Chapter {deck.chapterNo}, pp. {deck.pages}. Curated learning statements, not a complete official Mark Scheme audit.</p>
      <p>First submission is the assessment. Use the parent “Play this round again” control for a fresh practice run.</p>
    </div>}
    {!submitted && <p className="ig-compare-provenance">Source: Hodder 9618, Chapter {deck.chapterNo}, pp. {deck.pages}. Statements are paraphrased for formative practice; individual MS point verification remains pending.</p>}
  </div>;
}