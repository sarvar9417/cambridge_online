import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useGameSignal } from './game-session';
import { findMatchOptions, shuffleItems, type GamePair } from './game-content';
import { AnswerCards } from './AnswerCards';
import './spin-wheel.css';

const colours = ['#3944a7', '#007287', '#a72a4b', '#9b530b', '#187047', '#7739a6', '#1b5fa1', '#a33b2b'];
const spinPower = {
  low: { turns: 3, duration: 2300 },
  high: { turns: 6, duration: 4100 },
} as const;

export type WheelOptions = { power: keyof typeof spinPower; shuffle: boolean };
type Drag = { id: number; angle: number; moved: number; velocity: number; time: number; interrupted: boolean };

const fullTurn = (angle: number) => ((angle % 360) + 360) % 360;

function pointerAngle(event: PointerEvent<HTMLDivElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  return Math.atan2(event.clientY - bounds.top - bounds.height / 2,
    event.clientX - bounds.left - bounds.width / 2) * 180 / Math.PI;
}

export function SpinWheel({ pairs, options, onOptionsChange, blocked = false, ended = false }: {
  pairs: readonly GamePair[];
  options: WheelOptions;
  onOptionsChange: (options: WheelOptions) => void;
  blocked?: boolean;
  ended?: boolean;
}) {
  const signal = useGameSignal();
  const playSignal = useRef(signal);
  const reviewed = useRef(new Set<string>());
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [winner, setWinner] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [spins, setSpins] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [labelMode, setLabelMode] = useState<'term' | 'definition'>('definition');
  const drag = useRef<Drag | null>(null);
  const frame = useRef(0);
  const animation = useRef<{ start: number; elapsed: number; step: (time: number) => void } | null>(null);
  const angle = useRef(0);
  const lastTick = useRef(-Infinity);
  const disc = useRef<HTMLDivElement>(null);
  const spinButton = useRef<HTMLButtonElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef(false);
  const order = useMemo(() => options.shuffle ? shuffleItems(pairs) : pairs, [pairs, options.shuffle]);
  const active = order.filter((item) => !eliminated.includes(item.id));
  const sector = 360 / Math.max(1, active.length);
  const result = winner === null ? null : active[winner];
  const label = (item: GamePair) => labelMode === 'term' ? item.term : item.definition;
  const answerLabel = (item: GamePair) => labelMode === 'term' ? item.definition : item.term;
  // A removed sector can still be used as a distractor, so elimination never shrinks the test.
  // Answer cards must keep exactly the same randomized order while the
  // result is displayed, including after the learner clicks an answer.
  const answerOptions = useMemo(() => result ? findMatchOptions(pairs, pairs.indexOf(result)) : [],
    [pairs, result]);
  const hasQuiz = answerOptions.length > 0;

  useEffect(() => { playSignal.current = signal; }, [signal]);
  useEffect(() => () => window.cancelAnimationFrame(frame.current), []);
  // Unlike a finished session, Pause must freeze the animation rather than
  // discarding the spin. Resume continues from the exact animation progress.
  useEffect(() => {
    if (ended) {
      window.cancelAnimationFrame(frame.current);
      frame.current = 0;
      animation.current = null;
      drag.current = null;
      setSpinning(false);
      setDragging(false);
      return;
    }
    if (blocked) {
      window.cancelAnimationFrame(frame.current);
      frame.current = 0;
      if (animation.current) {
        animation.current.elapsed = Math.max(0, performance.now() - animation.current.start);
      }
      drag.current = null;
      setDragging(false);
    } else if (animation.current && !frame.current) {
      animation.current.start = performance.now() - animation.current.elapsed;
      frame.current = window.requestAnimationFrame(animation.current.step);
    }
  }, [blocked, ended]);
  useEffect(() => {
    if (blocked) return;
    if (winner !== null) resultHeading.current?.focus();
    else if (returnFocus.current) {
      spinButton.current?.focus({ preventScroll: true });
      returnFocus.current = false;
    }
  }, [winner, blocked]);

  function rotate(next: number, time?: number) {
    const crossesSector = Math.floor(angle.current / sector + .5) !== Math.floor(next / sector + .5);
    if (active.length > 1 && crossesSector && time !== undefined && time - lastTick.current >= 40) {
      lastTick.current = time;
      playSignal.current('tick');
    }
    angle.current = next;
    disc.current?.style.setProperty('--wheel-angle', `${next}deg`);
  }

  function landAt(target: number, duration: number, continuation = false) {
    const from = angle.current;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const finish = () => {
      frame.current = 0;
      animation.current = null;
      rotate(fullTurn(target));
      // Slice zero is centred on the fixed pointer at the left of the wheel.
      setWinner(Math.floor(fullTurn(-target + sector / 2) / sector));
      setSpinning(false);
    };
    if (!continuation) {
      setSpins((count) => count + 1);
      signal('spin');
    }
    if (reducedMotion) { finish(); return; }
    setSpinning(true);
    const spin = { start: performance.now(), elapsed: 0, step: (_time: number) => {} };
    const animate = (now: number) => {
      if (animation.current !== spin) return;
      const elapsed = Math.max(0, Math.min(1, (now - spin.start) / duration));
      rotate(from + (target - from) * (1 - (1 - elapsed) ** 3), now);
      if (elapsed === 1) finish();
      else frame.current = window.requestAnimationFrame(animate);
    };
    spin.step = animate;
    animation.current = spin;
    frame.current = window.requestAnimationFrame(animate);
  }

  function spin() {
    if (blocked || !active.length || drag.current || frame.current || result) return;
    const index = Math.floor(Math.random() * active.length);
    const target = -index * sector;
    const { turns, duration } = spinPower[options.power];
    landAt(angle.current + turns * 360 + fullTurn(target - angle.current), duration);
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (blocked || !active.length || result || drag.current || event.button !== 0) return;
    const interrupted = Boolean(frame.current);
    window.cancelAnimationFrame(frame.current);
    frame.current = 0;
    setSpinning(false);
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, angle: pointerAngle(event), moved: 0, velocity: 0, time: event.timeStamp, interrupted };
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    if (blocked || gesture?.id !== event.pointerId) return;
    const next = pointerAngle(event);
    const delta = fullTurn(next - gesture.angle + 180) - 180;
    if (!delta) return;
    const elapsed = Math.max(8, event.timeStamp - gesture.time);
    gesture.velocity = delta / elapsed;
    gesture.angle = next;
    gesture.time = event.timeStamp;
    gesture.moved += Math.abs(delta);
    rotate(angle.current + delta, performance.now());
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    if (gesture?.id !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (blocked || event.type !== 'pointerup') return;
    if (gesture.moved < 5 && !gesture.interrupted) return;
    const speed = event.timeStamp - gesture.time < 110 ? Math.min(2.4, Math.abs(gesture.velocity)) : 0;
    const duration = speed > .08 ? Math.min(spinPower[options.power].duration, 350 + speed * 1500) : 260;
    const coast = Math.sign(gesture.velocity) * speed * duration / 3;
    const target = Math.round((angle.current + coast) / sector) * sector;
    landAt(target, duration, gesture.interrupted);
  }

  function closeResult(remove: boolean) {
    if (!result) return;
    if (remove) {
      setEliminated((previous) => [...previous, result.id]);
      rotate(0);
      if (active.length === 1) signal('complete');
    }
    returnFocus.current = true;
    setWinner(null);
    setShowAnswer(false);
    setSelectedAnswer(null);
  }

  function reviewResult() {
    if (result && !reviewed.current.has(result.id)) {
      reviewed.current.add(result.id);
      signal('review');
    }
    signal('flip');
  }

  function chooseAnswer(id: string) {
    if (!result || blocked || selectedAnswer !== null) return;
    setSelectedAnswer(id);
    reviewResult();
  }

  function toggleAnswer() {
    if (!showAnswer) reviewResult();
    setShowAnswer(!showAnswer);
  }

  if (!pairs.length) return <p>No wheel topics available.</p>;
  const gradient = active.length === 1 ? colours[0] : 'conic-gradient(from ' + (270 - sector / 2) + 'deg, ' + active.map((_, index) => {
    const colour = colours[index % colours.length]!;
    const fill = winner !== null && index !== winner ? `color-mix(in srgb, ${colour} 42%, #12162e)` : colour;
    return `${fill} ${index * sector}deg ${(index + 1) * sector}deg`;
  }).join(', ') + ')';
  const busy = spinning || dragging || Boolean(result);

  return <div className="ig-content ig-spin-wheel">
    <div className="ig-wheel-settings" role="group" aria-label="Wheel options">
      <div className="ig-wheel-switch" role="group" aria-label="Wheel segment content">
        <button type="button" disabled={busy} aria-pressed={labelMode === 'definition'} onClick={() => setLabelMode('definition')}>Definitions</button>
        <button type="button" disabled={busy} aria-pressed={labelMode === 'term'} onClick={() => setLabelMode('term')}>Terms</button>
      </div>
      <label>Spin power <select value={options.power} disabled={busy}
        onChange={(event) => onOptionsChange({ ...options, power: event.target.value === 'high' ? 'high' : 'low' })}>
        <option value="low">Low</option><option value="high">High</option>
      </select></label>
      <label><input type="checkbox" checked={options.shuffle} disabled={busy || spins > 0}
        onChange={(event) => onOptionsChange({ ...options, shuffle: event.target.checked })} /> Shuffle item order</label>
    </div>
    <div className="ig-wheel-stage">
      <div className="ig-wheel-caption">
        <p className="ig-instruction">Drag the wheel or press Spin It.</p>
        <span>{spins} spins · {active.length} segments remaining</span>
      </div>
      {active.length > 0 ? <>
        <div className="ig-wheel-viewport" hidden={hasQuiz}>
          <div className={'ig-wheel-camera' + (result ? ' is-zoomed' : '')}>
            <span className="ig-wheel-pointer" aria-hidden="true" />
            <div className={'ig-wheel-wrap' + (dragging ? ' is-dragging' : '')}
              onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag}
              onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
              <div ref={disc} className="ig-wheel-disc" style={{ background: gradient }} role="img" aria-label={`${active.length} wheel sectors`}>
                <svg className="ig-wheel-radial" viewBox="-160 -160 320 320" aria-hidden="true">
                  {active.map((item, index) => {
                    const text = label(item);
                    const size = Math.min(24, 300 / active.length, Math.max(10, 175 / text.length));
                    const limit = Math.floor(175 / size);
                    const shortLabel = text.length > limit ? text.slice(0, limit - 1).trimEnd() + '…' : text;
                    return <g key={item.id} transform={`rotate(${index * sector})`}>
                      <title>{text}</title>
                      {active.length > 1 && <line x1="-160" x2="-25" y1="0" y2="0" transform={`rotate(${-sector / 2})`} />}
                      <text className="ig-wheel-label" x="-98" y="0" textAnchor="middle" dominantBaseline="central" fontSize={size}>
                        {shortLabel}
                      </text>
                    </g>;
                  })}
                </svg>
              </div>
              <button type="button" className="ig-wheel-hub" aria-label="Spin It from the wheel center" disabled={busy}
                onPointerDown={(event) => event.stopPropagation()} onClick={spin}>Spin It</button>
            </div>
          </div>
        </div>
        {result ? <div className={'ig-wheel-result' + (hasQuiz ? ' ig-wheel-quiz' : '')}>
          <span className="ig-eyebrow">{hasQuiz ? 'SELECTED QUESTION' : 'SELECTED SEGMENT'}</span>
          <h3 ref={resultHeading} tabIndex={-1}>{label(result)}</h3>
          {hasQuiz && <>
            <AnswerCards options={answerOptions.map(answerLabel)} cardClass="ig-wheel-choice" blocked={blocked}
              correctIndex={answerOptions.findIndex((option) => option.id === result.id)}
              answer={selectedAnswer === null ? null : answerOptions.findIndex((option) => option.id === selectedAnswer)}
              onChoose={(index) => chooseAnswer(answerOptions[index]!.id)} />
            <p className="ig-wheel-answer-status" role="status">{selectedAnswer === null ? null
              : selectedAnswer === result.id ? 'Correct!' : <>Correct answer · <strong>{answerLabel(result)}</strong></>}</p>
          </>}
          <div className="ig-wheel-actions">
            {!hasQuiz && <button type="button" onClick={toggleAnswer} aria-expanded={showAnswer}>{showAnswer ? 'Hide answer' : 'Reveal answer'}</button>}
            <button type="button" onClick={() => closeResult(false)}>Resume</button>
            <button type="button" onClick={() => closeResult(true)}>Eliminate</button>
          </div>
          {showAnswer && <p className="ig-reveal" role="status">{answerLabel(result)}</p>}
        </div> : <div className="ig-wheel-controls">
          <button ref={spinButton} type="button" className="ig-primary-button" onClick={spin} disabled={busy}>{spinning ? 'Spinning…' : 'Spin It'}</button>
        </div>}
      </> : <div className="ig-complete" role="status">All segments have been eliminated.</div>}
    </div>
  </div>;
}
