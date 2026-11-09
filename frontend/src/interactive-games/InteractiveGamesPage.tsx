import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { GAME_CATALOG, type GameKind, type GamePair } from './game-content';
import {
  GAME_LENGTHS, createQuizQuestions, createSpeakingPrompts, gameIsAvailable, poolForMode,
  selectGamePairs, validGameScopes, normalizeGameScopes,
  type GameScope, type LiveGameCatalog, type LiveGamePack,
} from './remote-games';
import { GameScopePicker } from './GameScopePicker';
import { OpenBox, Quiz, SpinWheel } from './ExtraGames';
import { formatClock, GameSignalContext, GAME_TIMER_OPTIONS, soundEffect, useGameSignal, type GameSignal } from './game-session';
import { MatchUpBoard, SpeakingDeck, FindMatchBoard, AnagramTiles } from './WordwallStyleModes';
import './interactive-games.css';
import './remote-games.css';
import './game-polish.css';

/** Source-backed multi-chapter practice, with session-only feedback. */
export function InteractiveGamesPage({ isTeacher }: { isTeacher: boolean }) {
  const [catalog, setCatalog] = useState<LiveGameCatalog | null>(null);
  const [pack, setPack] = useState<LiveGamePack | null>(null);
  const [scopes, setScopes] = useState<GameScope[]>([]);
  const initializedScopes = useRef(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [packLoading, setPackLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [packError, setPackError] = useState('');
  const [mode, setMode] = useState<GameKind>('match-up');
  const [round, setRound] = useState(0);
  const [playSession, setPlaySession] = useState(0);
  const [questionCount, setQuestionCount] = useState(29);
  const [seconds, setSeconds] = useState(0);
  const [timeLimit, setTimeLimit] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [fullscreenError, setFullscreenError] = useState('');

  // The catalogue is fetched on load and whenever the user explicitly refreshes.
  // Newly imported chapters can be chosen without changing client code.
  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setCatalogError('');
    void api<{ data: LiveGameCatalog }>('/content/interactive-games/catalog?courseCode=9618')
      .then(({ data }) => {
        if (!active) return;
        setCatalog(data);
        setScopes((previous) => {
          if (!initializedScopes.current) {
            initializedScopes.current = true;
            return data.chapters.length ? [{ chapterNo: data.chapters[0]!.chapterNo, kind: 'chapter' }] : [];
          }
          const valid = validGameScopes(previous, data);
          return JSON.stringify(valid) === JSON.stringify(previous) ? previous : valid;
        });
      })
      .catch((cause) => {
        if (active) {
          setCatalog(null);
          setPack(null);
          setCatalogError(cause instanceof Error ? cause.message : 'Chapter catalogue could not be loaded.');
        }
      })
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, [refreshVersion]);

  const scopesKey = JSON.stringify(normalizeGameScopes(scopes));
  useEffect(() => {
    if (!catalog || scopes.length === 0) {
      setPack(null);
      setPackLoading(false);
      return;
    }
    let active = true;
    setPackLoading(true);
    setPackError('');
    setPack(null);
    void api<{ data: LiveGamePack }>('/content/interactive-games/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseCode: '9618', scopes: normalizeGameScopes(scopes) }),
    })
      .then(({ data }) => {
        if (!active) return;
        setPack(data);
      })
      .catch((cause) => {
        if (active) {
          setPackError(cause instanceof Error ? cause.message : 'Selected content could not be loaded.');
          setPack(null);
        }
      })
      .finally(() => { if (active) setPackLoading(false); });
    return () => { active = false; };
  }, [scopesKey, catalog, refreshVersion]);

  const timeExpired = timeLimit > 0 && seconds >= timeLimit;
  const roundEnded = finished || timeExpired;
  useEffect(() => {
    if (paused || roundEnded || !pack) return;
    const timer = window.setInterval(() => setSeconds((time) => time + 1), 1000);
    return () => window.clearInterval(timer);
  }, [paused, roundEnded, pack, timeLimit]);

  const signal = useCallback((kind: GameSignal, count = 1) => {
    if (kind === 'correct') setCorrectCount((score) => score + Math.max(0, count));
    if (kind === 'incorrect') setWrongCount((score) => score + Math.max(0, count));
    if (kind === 'review') setReviewedCount((total) => total + Math.max(0, count));
    if (kind === 'complete') setFinished(true);
    if (soundOn) soundEffect(kind);
  }, [soundOn]);

  const allPairs = pack?.pairs ?? [];
  const currentMode = gameIsAvailable(mode, allPairs)
    ? mode : GAME_CATALOG.find((game) => gameIsAvailable(game.id, allPairs))?.id ?? mode;
  const eligiblePairs = useMemo(() => poolForMode(pack?.pairs ?? [], currentMode), [pack, currentMode]);
  const pairs = useMemo(() => selectGamePairs(eligiblePairs, questionCount, round), [eligiblePairs, questionCount, round]);
  const speaking = useMemo(() => createSpeakingPrompts(pairs), [pairs]);
  const questions = useMemo(() => createQuizQuestions(pairs), [pairs]);
  const activeGame = GAME_CATALOG.find((game) => game.id === currentMode)!;
  const ready = Boolean(pack && pairs.length);
  const time = formatClock(timeLimit > 0 ? timeLimit - seconds : seconds);
  const chosenChapterCount = new Set(scopes.map((scope) => scope.chapterNo)).size;

  function clearSession() {
    setCorrectCount(0);
    setWrongCount(0);
    setReviewedCount(0);
    setSeconds(0);
    setFinished(false);
    setPaused(false);
  }
  function resetGame(nextMode?: GameKind, advanceRound = false) {
    if (nextMode) setMode(nextMode);
    if (advanceRound) setRound((value) => value + 1);
    setPlaySession((value) => value + 1);
    clearSession();
  }
  function changeScopes(next: GameScope[]) {
    const normalized = normalizeGameScopes(next);
    if (JSON.stringify(normalized) === scopesKey) return;
    setScopes(normalized);
    setPack(null);
    setRound(0);
    setPlaySession((value) => value + 1);
    clearSession();
  }
  function toggleFullscreen() {
    setFullscreenError('');
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => setFullscreenError('Unable to exit fullscreen.'));
    } else {
      const element = document.querySelector('.ig-page');
      if (element instanceof HTMLElement && element.requestFullscreen) {
        void element.requestFullscreen().catch(() => setFullscreenError('Fullscreen is unavailable.'));
      } else setFullscreenError('Fullscreen is unavailable in this browser.');
    }
  }

  return <GameSignalContext.Provider value={signal}><section className="ig-page" aria-label="Interactive Games">
    <div className="ig-session-bar" role="group" aria-label="Game session controls">
      <span className={'ig-clock' + (timeExpired ? ' is-expired' : '')} role="timer">◷ {timeLimit > 0 ? 'Remaining ' : 'Elapsed '}{time}</span>
      <span className="ig-session-name">Interactive Games · {chosenChapterCount} chapters, {scopes.length} selections</span>
      <label className="ig-timer-select">Time limit
        <select aria-label="Time limit" value={timeLimit} onChange={(event) => {
          setTimeLimit(Number(event.target.value));
          resetGame();
        }}>
          {GAME_TIMER_OPTIONS.map((option) => <option key={option.seconds} value={option.seconds}>{option.label}</option>)}
        </select>
      </label>
      <button type="button" className="ig-sound-toggle" onClick={() => setSoundOn((value) => !value)} aria-pressed={soundOn}>{soundOn ? '🔊 Sound on' : '🔇 Sound off'}</button>
      <button type="button" className="ig-pause-button" disabled={!ready || roundEnded} onClick={() => setPaused((value) => !value)}>{paused ? '▶ Resume timer' : 'Ⅱ Pause timer'}</button>
      <button type="button" className="ig-finish-button" disabled={!ready || roundEnded} onClick={() => setFinished(true)}>■ Finish game</button>
      <button type="button" onClick={toggleFullscreen}>⛶ Full screen</button>
      {fullscreenError && <span role="alert">{fullscreenError}</span>}
    </div>
    <div className="ig-hero">
      <div>
        <span className="ig-eyebrow">CAMBRIDGE 9618 · LIVE CURRICULUM BANK</span>
        <h1>Learn by playing.</h1>
        <p>Select any combination of chapters, syllabus topics and Hodder sections. Play all eight games from the combined source-backed vocabulary bank.</p>
        <div className="ig-pills">
          <span>{chosenChapterCount ? chosenChapterCount + ' chapters selected' : 'Select chapters'}</span>
          <span>{scopes.length} curriculum selections</span>
          <span>{isTeacher ? 'Teacher preview' : 'Student practice'}</span>
        </div>
      </div>
      <div className="ig-hero-mark" aria-hidden="true">8<span>play modes</span></div>
    </div>

    {catalog && <GameScopePicker catalog={catalog} scopes={scopes} onChange={changeScopes} disabled={catalogLoading} />}
    <div className="ig-data-controls" role="group" aria-label="Game setup">
      <label>Round size
        <select aria-label="Round size" value={questionCount} disabled={!ready}
          onChange={(event) => {
            setQuestionCount(Number(event.target.value));
            setRound(0);
            setPlaySession((value) => value + 1);
            clearSession();
          }}>
          {GAME_LENGTHS.map((size) => <option key={size} value={size}>{size} terms</option>)}
        </select>
      </label>
      <button className="ig-data-refresh" type="button" onClick={() => {
        setRefreshVersion((value) => value + 1);
        setPack(null);
        resetGame();
      }}>↻ Refresh database</button>
    </div>

    {catalogLoading && <p className="ig-data-message" role="status">Loading the latest chapter catalogue…</p>}
    {packLoading && <p className="ig-data-message" role="status">Combining selected chapters, topics and sections…</p>}
    {catalogError && <p className="ig-data-error" role="alert">Chapter catalogue failed: {catalogError} <button type="button" onClick={() => setRefreshVersion((value) => value + 1)}>Retry</button></p>}
    {packError && <p className="ig-data-error" role="alert">Selected content failed: {packError} <button type="button" onClick={() => setRefreshVersion((value) => value + 1)}>Retry</button></p>}
    {catalog && catalog.chapters.length === 0 && !catalogLoading && <p className="ig-data-message" role="status">No glossary-ready chapters are available yet.</p>}
    {pack && <div className="ig-notice" role="note">
      <strong>{pack.pairs.length} unique glossary terms loaded from {chosenChapterCount} chapters.</strong> Playing {pairs.length} this round.
      {pack.contentStatus === 'needs_review'
        ? ' Some terms are pending review. Use for provisional practice only, not approved exam answers.'
        : ' All selected terms have been approved.'}
      {' '}Results are temporary practice feedback, not official assessment grades.
    </div>}
    {pack && pack.pairs.length === 0 && <p className="ig-data-message">
      This selection currently has no linked glossary terms. Select more topics, sections or complete chapters.
    </p>}
    {pack && ready && <>
      <div className="ig-games" role="group" aria-label="Choose a game">
        {GAME_CATALOG.map((game, i) => <button key={game.id} type="button"
          disabled={!gameIsAvailable(game.id, allPairs)} aria-pressed={currentMode === game.id}
          className={'ig-game-tile' + (currentMode === game.id ? ' is-selected' : '')}
          onClick={() => resetGame(game.id)}>
          <span className="ig-game-number">0{i + 1}</span>
          <strong>{game.label}</strong>
          <small>{gameIsAvailable(game.id, allPairs) ? game.description : 'This selection needs more suitable terms.'}</small>
        </button>)}
      </div>
      <div className="ig-workspace">
        <div className="ig-workspace-head">
          <div><span className="ig-eyebrow">NOW PLAYING</span><h2>{activeGame.label}</h2>
            <p>{chosenChapterCount} chapters · {scopes.length} selections · {pairs.length} terms in this round</p>
          </div>
          <button className="ig-reset" type="button" onClick={() => resetGame(undefined, true)}>↻ New round</button>
        </div>
        <div className="ig-session-metrics" role="status" aria-label="Current practice results">
          <span>✓ {correctCount} correct</span><span>✕ {wrongCount} mistakes</span><span>◈ {reviewedCount} reviewed</span>
          <span>{timeLimit ? 'Countdown' : 'Stopwatch'} · {time}</span>
        </div>
        <fieldset className="ig-game-stage" disabled={paused || roundEnded}
          key={[scopesKey, questionCount, currentMode, round, playSession, refreshVersion].join(':')}>
          {currentMode === 'match-up' && <MatchUpBoard pairs={pairs} />}
          {currentMode === 'flash-cards' && <FlashCards pairs={pairs} />}
          {currentMode === 'speaking-cards' && <SpeakingDeck prompts={speaking} />}
          {currentMode === 'spin-wheel' && <SpinWheel pairs={pairs} />}
          {currentMode === 'open-box' && <OpenBox pairs={pairs} />}
          {currentMode === 'quiz' && <Quiz questions={questions} />}
          {currentMode === 'find-the-match' && <FindMatchBoard pairs={pairs} />}
          {currentMode === 'anagram' && <AnagramTiles pairs={pairs} />}
        </fieldset>
        {paused && !roundEnded && <div className="ig-paused-banner" role="status">Paused — resume the timer to continue playing.</div>}
        {roundEnded && <div className="ig-result-panel" role="status">
          <span className="ig-eyebrow">{timeExpired ? "TIME'S UP" : 'ROUND SUMMARY'}</span>
          <h3>{timeExpired ? "Time's up!" : 'Round finished!'}</h3>
          <p><strong>{activeGame.label}</strong> · {formatClock(seconds)} played</p>
          <div className="ig-result-stats">
            <span><strong>{correctCount}</strong>Correct first attempts</span>
            <span><strong>{wrongCount}</strong>Incorrect attempts</span>
            <span><strong>{reviewedCount}</strong>Items reviewed</span>
          </div>
          <p className="ig-result-disclaimer">Practice feedback only. Revealed cards and speaking prompts are not assessed mastery. Scores are not saved to your account.</p>
          <div className="ig-result-actions">
            <button type="button" onClick={() => resetGame()}>↻ Play this round again</button>
            <button type="button" onClick={() => resetGame(undefined, true)}>Next vocabulary round →</button>
          </div>
        </div>}
      </div>
      <p className="ig-source">Source: {pack.source}. Pending-review vocabulary is clearly labelled.</p>
    </>}
  </section></GameSignalContext.Provider>;
}

function FlashCards({ pairs }: { pairs: GamePair[] }) {
  const signal = useGameSignal();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = pairs[index];
  if (!card) return <p>No cards available.</p>;
  function go(next: number) { setIndex(next); setRevealed(false); }
  function flip() {
    if (!revealed) signal('review');
    signal('flip');
    setRevealed((value) => !value);
  }
  return <div className="ig-content">
    <p className="ig-instruction">Recall the definition before revealing the answer. This is revision, not an assessed score.</p>
    <div className="ig-score">Card {index + 1} / {pairs.length}</div>
    <button type="button" className={'ig-flashcard' + (revealed ? ' is-flipped' : '')}
      onClick={flip}>
      <span className="ig-eyebrow">{revealed ? 'KEY TERM' : 'DEFINITION'}</span>
      <strong>{revealed ? card.term : card.definition}</strong>
      <small>{revealed ? 'Click to see the definition' : 'Click to reveal the term'}</small>
    </button>
    <div className="ig-card-controls">
      <button type="button" disabled={index === 0} onClick={() => go(index - 1)}>← Previous</button>
      <button type="button" onClick={flip}>{revealed ? 'Show definition' : 'Flip card'}</button>
      <button type="button" disabled={index === pairs.length - 1} onClick={() => go(index + 1)}>Next →</button>
    </div>
  </div>;
}

