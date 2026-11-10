import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { randomId } from '../lib/random-id';
import { GAME_CATALOG, type GameKind } from './game-content';
import {
  DEFAULT_GAME_LENGTH, GAME_LENGTHS, GAME_STAGE_LIMITS, createQuizQuestions, createSpeakingPrompts, gameIsAvailable, poolForMode,
  selectModeStage, validGameScopes, normalizeGameScopes,
  type GameScope, type LiveGameCatalog, type LiveGamePack,
} from './remote-games';
import { GameScopePicker } from './GameScopePicker';
import { missedPracticePairs, practiceAttempts, type PracticeHistory, type SavePracticeRequest } from './practice-history';
import { Quiz } from './ExtraGames';
import { OpenBox, type BoxMode } from './OpenBox';
import { FlashCards } from './FlashCards';
import { SpinWheel, type WheelOptions } from './SpinWheel';
import { formatClock, GameSignalContext, GAME_TIMER_OPTIONS, soundEffect, type AnswerReview, type GameSignal } from './game-session';
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
  const [boxMode, setBoxMode] = useState<BoxMode>('simple');
  const [round, setRound] = useState(0);
  const [playSession, setPlaySession] = useState(0);
  const [questionCount, setQuestionCount] = useState(DEFAULT_GAME_LENGTH);
  const [customRoundSize, setCustomRoundSize] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [timeLimit, setTimeLimit] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [wheelOptions, setWheelOptions] = useState<WheelOptions>({ power: 'low', shuffle: false });
  const [stopwatch, setStopwatch] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [answers, setAnswers] = useState<AnswerReview[]>([]);
  const [practiceHistory, setPracticeHistory] = useState<PracticeHistory | null>(null);
  const [practiceHistoryError, setPracticeHistoryError] = useState('');
  const [practiceSaveState, setPracticeSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [practiceSaveError, setPracticeSaveError] = useState('');
  const [practiceRunId, setPracticeRunId] = useState(() => randomId());
  const [mistakesOnly, setMistakesOnly] = useState(false);
  const [dueOnly, setDueOnly] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const update = () => setIsFullscreen(document.fullscreenElement === document.querySelector('.ig-page'));
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

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
        if (!initializedScopes.current && data.chapters.length) {
          initializedScopes.current = true;
          setScopes([{ chapterNo: data.chapters[0]!.chapterNo, kind: 'chapter' }]);
        } else {
          setScopes((previous) => validGameScopes(previous, data));
        }
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

  const scopesKey = JSON.stringify(scopes);
  useEffect(() => {
    if (catalogLoading || !catalog || scopes.length === 0) {
      setPack(null);
      setPackLoading(false);
      setPackError('');
      return;
    }
    const request = new AbortController();
    let active = true;
    setPackLoading(true);
    setPackError('');
    setPack(null);
    void api<{ data: LiveGamePack }>('/content/interactive-games/collection', {
      method: 'POST',
      signal: request.signal,
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
    return () => { active = false; request.abort(); };
  }, [scopes, catalog, catalogLoading]);

  useEffect(() => {
    if (isTeacher) return;
    let active = true;
    void api<{ data: PracticeHistory }>('/content/interactive-games/practice?courseCode=9618')
      .then(({ data }) => { if (active) { setPracticeHistory(data); setPracticeHistoryError(''); } })
      .catch(() => { if (active) setPracticeHistoryError('Practice history is temporarily unavailable.'); });
    return () => { active = false; };
  }, [isTeacher]);

  const timeExpired = timeLimit > 0 && seconds >= timeLimit;
  const roundEnded = finished || timeExpired;
  useEffect(() => {
    if (!started || paused || roundEnded || !pack) return;
    const timer = window.setInterval(() => setSeconds((time) => time + 1), 1000);
    return () => window.clearInterval(timer);
  }, [started, paused, roundEnded, pack, timeLimit]);

  const signal = useCallback((kind: GameSignal, count = 1) => {
    if (kind !== 'complete' && kind !== 'tick') setStarted(true);
    if (kind === 'correct') setCorrectCount((score) => score + Math.max(0, count));
    if (kind === 'incorrect') setWrongCount((score) => score + Math.max(0, count));
    if (kind === 'review') setReviewedCount((total) => total + Math.max(0, count));
    if (kind === 'complete') setFinished(true);
    if (soundOn && kind !== 'start') soundEffect(kind);
  }, [soundOn]);

  const allPairs = pack?.pairs ?? [];
  const missedPairs = useMemo(() => missedPracticePairs(pack?.pairs ?? [], practiceHistory?.needsReviewIds ?? []),
    [pack, practiceHistory]);
  const duePairs = useMemo(() => missedPracticePairs(pack?.pairs ?? [], practiceHistory?.dueReviewIds ?? []),
    [pack, practiceHistory]);
  const reviewOnly = mistakesOnly || dueOnly;
  const reviewPairs = dueOnly ? duePairs : missedPairs;
  const currentMode = reviewOnly ? 'flash-cards' : gameIsAvailable(mode, allPairs)
    ? mode : GAME_CATALOG.find((game) => gameIsAvailable(game.id, allPairs))?.id ?? mode;
  const eligiblePairs = useMemo(
    () => poolForMode(reviewOnly ? reviewPairs : (pack?.pairs ?? []), currentMode),
    [pack, currentMode, reviewOnly, reviewPairs]);
  const pairs = useMemo(() => selectModeStage(eligiblePairs, questionCount, round, currentMode),
    [eligiblePairs, questionCount, round, currentMode]);
  const selectedCount = Math.min(eligiblePairs.length, questionCount);
  const staged = Boolean(GAME_STAGE_LIMITS[currentMode] && selectedCount > GAME_STAGE_LIMITS[currentMode]!);
  const stageSize = GAME_STAGE_LIMITS[currentMode] ?? selectedCount;
  const stageTotal = staged ? Math.ceil(selectedCount / stageSize) : 1;
  const stageNumber = staged ? round % stageTotal + 1 : 1;
  const speaking = useMemo(() => createSpeakingPrompts(pairs), [pairs]);
  const questions = useMemo(() => createQuizQuestions(pairs), [pairs]);
  const activeGame = GAME_CATALOG.find((game) => game.id === currentMode)!;
  const ready = Boolean(pack && pairs.length);
  const maxSelectableRoundSize = Math.max(DEFAULT_GAME_LENGTH, eligiblePairs.length);
  const isWheel = currentMode === 'spin-wheel';
  const boxQuestions = gameIsAvailable('quiz', pairs) ? questions : [];
  const effectiveBoxMode = boxQuestions.length ? boxMode : 'simple';
  const isScored = ['match-up', 'quiz', 'find-the-match', 'anagram'].includes(currentMode) ||
    (currentMode === 'open-box' && effectiveBoxMode === 'questions');
  const showClock = timeLimit > 0 || stopwatch;
  const stageDisabled = paused || roundEnded || (timeLimit > 0 && !started);
  const time = formatClock(timeLimit > 0 ? timeLimit - seconds : seconds);
  const chosenChapterCount = new Set(scopes.map((scope) => scope.chapterNo)).size;
  const distinctTermLabels = new Set((pack?.pairs ?? []).map((pair) => pair.term.trim().toLocaleLowerCase('en'))).size;

  const recordAnswer = useCallback((answer: AnswerReview) => {
    setAnswers((previous) => previous.some((item) => item.id === answer.id) ? previous : [...previous, answer]);
  }, []);

  function clearSession() {
    setPracticeRunId(randomId());
    setPracticeSaveState('idle');
    setPracticeSaveError('');
    setAnswers([]);
    setCorrectCount(0);
    setWrongCount(0);
    setReviewedCount(0);
    setSeconds(0);
    setFinished(false);
    setStarted(false);
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
    setMistakesOnly(false);
    setDueOnly(false);
    setPack(null);
    setPackError('');
    setRound(0);
    setPlaySession((value) => value + 1);
    clearSession();
  }
  function changeRoundSize(next: number) {
    if (!Number.isSafeInteger(next) || next < 10 || next === questionCount) return;
    setQuestionCount(next);
    setRound(0);
    setPlaySession((value) => value + 1);
    clearSession();
  }
  function refresh() {
    setMistakesOnly(false);
    setDueOnly(false);
    setCatalogLoading(true);
    setRefreshVersion((value) => value + 1);
    setPack(null);
    resetGame();
  }
  async function savePractice() {
    if (isTeacher || !pack || !roundEnded || practiceSaveState === 'saving' ||
      practiceSaveState === 'saved') return;
    const payload: SavePracticeRequest = {
      runId: practiceRunId,
      courseCode: '9618',
      mode: currentMode,
      scopes: normalizeGameScopes(scopes),
      durationSeconds: Math.min(86400, seconds),
      correctFirstAttempts: Math.min(500, correctCount),
      incorrectFirstAttempts: Math.min(500, wrongCount),
      reviewedCount: Math.min(500, reviewedCount),
      attempts: practiceAttempts(answers, pairs, currentMode === 'flash-cards' ? 'self_rating' : 'scored_response'),
    };
    setPracticeSaveState('saving');
    setPracticeSaveError('');
    try {
      await api('/content/interactive-games/practice', {
        method: 'POST', body: JSON.stringify(payload),
      });
      setPracticeSaveState('saved');
      try {
        const { data } = await api<{ data: PracticeHistory }>('/content/interactive-games/practice?courseCode=9618');
        setPracticeHistory(data);
        setPracticeHistoryError('');
      } catch { setPracticeHistoryError('Saved, but history could not be refreshed.'); }
    } catch (cause) {
      setPracticeSaveState('error');
      setPracticeSaveError(cause instanceof Error ? cause.message : 'Practice result could not be saved.');
    }
  }

  function startMistakeReview() {
    if (!missedPairs.length) return;
    setDueOnly(false);
    setMistakesOnly(true);
    setMode('flash-cards');
    setRound(0);
    resetGame('flash-cards');
  }

  function startDueReview() {
    if (!duePairs.length) return;
    setMistakesOnly(false);
    setDueOnly(true);
    setMode('flash-cards');
    setRound(0);
    resetGame('flash-cards');
  }

  function toggleFullscreen() {
    setFullscreenError('');
    if (document.fullscreenElement) {
      void document.exitFullscreen().then(() => setIsFullscreen(false))
        .catch(() => setFullscreenError('Unable to exit fullscreen.'));
    } else {
      const element = document.querySelector('.ig-page');
      if (element instanceof HTMLElement && element.requestFullscreen) {
        void element.requestFullscreen().then(() => setIsFullscreen(true))
          .catch(() => setFullscreenError('Fullscreen is unavailable.'));
      } else setFullscreenError('Fullscreen is unavailable in this browser.');
    }
  }

  return <GameSignalContext.Provider value={signal}><section className="ig-page" aria-label="Interactive Games">
    <div className="ig-session-bar" role="group" aria-label="Game session controls">
      {showClock && <span className={'ig-clock' + (timeExpired ? ' is-expired' : '')} role="timer">◷ {timeLimit > 0 ? 'Remaining ' : 'Elapsed '}{time}</span>}
      <span className="ig-session-name">Interactive Games · {chosenChapterCount} chapters, {scopes.length} selections</span>
      <label className="ig-timer-select">Round time limit
        <select aria-label="Time limit" value={!timeLimit && stopwatch ? 'count-up' : timeLimit}
          onChange={(event) => {
            const countUp = event.target.value === 'count-up';
            setStopwatch(countUp);
            setTimeLimit(countUp ? 0 : Number(event.target.value));
            resetGame();
          }}>
          <option value="count-up">Count up</option>
          {GAME_TIMER_OPTIONS.map((option) => <option key={option.seconds} value={option.seconds}>{option.label}</option>)}
        </select>
      </label>
      <button type="button" className="ig-sound-toggle" onClick={() => setSoundOn((value) => !value)} aria-pressed={soundOn}>{soundOn ? '🔊 Sound on' : '🔇 Sound off'}</button>
      <button type="button" className="ig-pause-button" disabled={!ready || roundEnded || (timeLimit > 0 && !started)} onClick={() => setPaused((value) => !value)}>{paused ? '▶ Resume game' : 'Ⅱ Pause game'}</button>
      <button type="button" className="ig-finish-button" disabled={!ready || roundEnded} onClick={() => setFinished(true)}>■ Finish game</button>
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
        <select aria-label="Round size" value={customRoundSize ? 'custom' : String(questionCount)} disabled={!ready}
          onChange={(event) => {
            if (event.target.value === 'custom') {
              setCustomRoundSize(true);
            } else {
              setCustomRoundSize(false);
              changeRoundSize(Number(event.target.value));
            }
          }}>
          {GAME_LENGTHS.map((size) => <option key={size} value={size}>{size} terms</option>)}
          <option value="custom">Custom number…</option>
        </select>
        {customRoundSize && <input className="ig-round-custom" aria-label="Custom round size"
          type="number" inputMode="numeric" min={10} max={maxSelectableRoundSize}
          step={1} value={questionCount} disabled={!ready}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isSafeInteger(value) && value >= 10) changeRoundSize(Math.min(value, maxSelectableRoundSize));
          }} />}
        {ready && questionCount > eligiblePairs.length && <small className="ig-round-available" role="status">
          This selection has {eligiblePairs.length} suitable terms. All available terms will be used without repeats.
        </small>}
      </label>
      <button className="ig-data-refresh" type="button" onClick={refresh}>↻ Refresh database</button>
    </div>

    {catalogLoading && <p className="ig-data-message" role="status">Loading the latest chapter catalogue…</p>}
    {packLoading && <p className="ig-data-message" role="status">Combining selected chapters, topics and sections…</p>}
    {catalogError && <p className="ig-data-error" role="alert">Chapter catalogue failed: {catalogError} <button type="button" onClick={refresh}>Retry</button></p>}
    {packError && <p className="ig-data-error" role="alert">Selected content failed: {packError} <button type="button" onClick={refresh}>Retry</button></p>}
    {catalog && catalog.chapters.length === 0 && !catalogLoading && <p className="ig-data-message" role="status">No glossary-ready chapters are available yet.</p>}
    {pack && <div className="ig-notice" role="note">
      <strong>{pack.pairs.length} glossary entries loaded from {chosenChapterCount} chapters.</strong> Playing {pairs.length} this round.
      {pack.pairs.length > distinctTermLabels
        ? ` ${pack.pairs.length - distinctTermLabels} additional chapter-specific entries are preserved; scored games avoid ambiguous duplicate answer labels.` : ''}
      {pack.pairs.some((pair) => pair.isOfficialKeyTerm !== undefined) &&
        ` (${pack.pairs.filter((pair) => pair.isOfficialKeyTerm === true).length} official Key Terms; ${pack.pairs.filter((pair) => pair.isOfficialKeyTerm === false).length} supplementary concepts.)`}
      {pack.contentStatus === 'needs_review'
        ? ' Some supplementary definitions are pending review and need individual source verification. Use for provisional practice only.'
        : ' All selected entries are available for practice; source-screened definitions are not individually expert-verified.'}
      {' '}Results are formative practice only, not official assessment grades.
    </div>}
    {pack && pack.pairs.length === 0 && <p className="ig-data-message">
      This selection currently has no linked glossary terms. Select more topics, sections or complete chapters.
    </p>}
    {pack && ready && <>
      {!isTeacher && <section className="ig-practice-history" aria-label="My practice history">
        <h3>My practice history</h3>
        <p>Private formative record. Mistake review uses first attempts; repeating a corrected answer does not prove mastery.</p>
        {practiceHistoryError && <p role="status">{practiceHistoryError}</p>}
        {practiceHistory?.recent.length ? <p>{practiceHistory.recent.length} recent saved rounds</p>
          : <p>No saved rounds yet.</p>}
        {practiceHistory?.needsReviewIds.length ? <p>{practiceHistory.needsReviewIds.length}
          {practiceHistory.needsReviewIds.length === 1 ? ' term' : ' terms'} previously missed</p> : null}
        {practiceHistory?.dueReviewIds?.length ? <p>{practiceHistory.dueReviewIds.length}
          {practiceHistory.dueReviewIds.length === 1 ? ' term is' : ' terms are'} due for spaced review</p> : <p>No spaced reviews due right now.</p>}
        {practiceHistory?.recent.length ? <details>
          <summary>Recent practice results</summary>
          <ol>{practiceHistory.recent.map((run) => <li key={run.runId}>
            {run.mode} · {run.correctFirstAttempts} {run.mode === 'flash-cards' ? 'self-rated as known' : 'first-try correct'} ·
            {run.incorrectFirstAttempts} {run.mode === 'flash-cards' ? 'self-rated for revision' : 'mistakes'} · {run.reviewedCount} reviewed
          </li>)}</ol>
        </details> : null}
        {reviewOnly ? <button type="button" onClick={() => { setMistakesOnly(false); setDueOnly(false); resetGame(); }}>
          Return to all selected vocabulary
        </button> : <>
          <button type="button" disabled={!missedPairs.length} onClick={startMistakeReview}>
            Review my mistakes ({missedPairs.length}) in Flash Cards
          </button>
          <button type="button" disabled={!duePairs.length} onClick={startDueReview}>
            Start spaced review ({duePairs.length})
          </button>
        </>}
      </section>}
      <div className="ig-games" role="group" aria-label="Choose a game">
        {GAME_CATALOG.map((game, i) => <button key={game.id} type="button"
          disabled={(reviewOnly && game.id !== 'flash-cards') || !gameIsAvailable(game.id, reviewOnly ? reviewPairs : allPairs)} aria-pressed={currentMode === game.id}
          className={'ig-game-tile' + (currentMode === game.id ? ' is-selected' : '')}
          onClick={() => resetGame(game.id)}>
          <span className="ig-game-number">0{i + 1}</span>
          <strong>{game.label}</strong>
          <small>{gameIsAvailable(game.id, reviewOnly ? reviewPairs : allPairs) ? game.description : 'This selection needs more suitable terms.'}</small>
        </button>)}
      </div>
      <div className="ig-workspace">
        <div className="ig-workspace-head">
          <div><span className="ig-eyebrow">NOW PLAYING</span><h2>{activeGame.label}</h2>
            <p>{chosenChapterCount} chapters · {scopes.length} selections · {pairs.length} terms in this round
              {staged ? ` · Stage ${stageNumber} of ${stageTotal} (${selectedCount} selected)` : ''}</p>
          </div>
          <div className="ig-workspace-head-actions">
            <button className="ig-fullscreen-toggle" type="button" onClick={toggleFullscreen}
              aria-pressed={isFullscreen}>{isFullscreen ? '⤢ Exit full screen' : '⛶ Full screen'}</button>
            <button className="ig-reset" type="button" onClick={() => resetGame(undefined, true)}>↻ New round</button>
          </div>
          {fullscreenError && <span role="alert">{fullscreenError}</span>}
        </div>
        {staged && <p className="ig-stage-notice" role="status">
          This game shows up to {stageSize} terms at a time for readability. {selectedCount} terms selected ·
          stage {stageNumber} of {stageTotal}. Use Next vocabulary round to practise the remaining terms.
        </p>}
        {currentMode === 'quiz' && <p className="ig-stage-notice">
          Quiz question time: 30 seconds each. The separate round time limit above is optional.
        </p>}
        <div className="ig-session-metrics" role="status" aria-label="Current practice results">
          {isScored && <><span>✓ {correctCount} correct</span><span>✕ {wrongCount} mistakes</span></>}
          <span>◈ {reviewedCount} reviewed</span>
          {showClock && <span>{timeLimit ? 'Countdown' : 'Stopwatch'} · {time}</span>}
        </div>
        {timeLimit > 0 && !started && !roundEnded && <div className="ig-start-panel">
          <p>The timer starts when you are ready.</p>
          <button type="button" className="ig-primary-button" onClick={() => setStarted(true)}>Start timed round</button>
        </div>}
        <fieldset className="ig-game-stage" disabled={stageDisabled}
          key={[scopesKey, questionCount, currentMode, round, playSession, refreshVersion].join(':')}>
          {currentMode === 'match-up' && <MatchUpBoard pairs={pairs} recordAnswer={recordAnswer} />}
          {currentMode === 'flash-cards' && <FlashCards
            key={dueOnly ? 'spaced-review' : mistakesOnly ? 'mistake-review' : 'all-cards'}
            pairs={pairs}
            requireSelfMark={dueOnly}
            onResult={recordAnswer}
          />}
          {currentMode === 'speaking-cards' && <SpeakingDeck prompts={speaking} />}
          {isWheel && <SpinWheel pairs={pairs} options={wheelOptions} onOptionsChange={setWheelOptions}
            blocked={stageDisabled} ended={roundEnded} />}
          {currentMode === 'open-box' && <OpenBox pairs={pairs} questions={boxQuestions} mode={effectiveBoxMode} onModeChange={setBoxMode}
            blocked={stageDisabled} recordAnswer={recordAnswer} />}
          {currentMode === 'quiz' && <Quiz questions={questions} blocked={stageDisabled} recordAnswer={recordAnswer} />}
          {currentMode === 'find-the-match' && <FindMatchBoard pairs={pairs} recordAnswer={recordAnswer} />}
          {currentMode === 'anagram' && <AnagramTiles pairs={pairs} blocked={stageDisabled} recordAnswer={recordAnswer} />}
        </fieldset>
        {paused && !roundEnded && <div className="ig-paused-banner" role="status">Paused — resume the timer to continue playing.</div>}
        {roundEnded && <div className="ig-result-panel" role="status">
          <span className="ig-eyebrow">{timeExpired ? "TIME'S UP" : 'ROUND SUMMARY'}</span>
          <h3>{timeExpired ? "Time's up!" : 'Round finished!'}</h3>
          <p><strong>{activeGame.label}</strong> · {formatClock(seconds)} played</p>
          <div className="ig-result-stats">
            {isScored && <>
              <span><strong>{correctCount}</strong>Correct first attempts</span>
              <span><strong>{wrongCount}</strong>Incorrect attempts</span>
            </>}
            <span><strong>{reviewedCount}</strong>Items reviewed</span>
          </div>
          {isScored && answers.length > 0 && <details className="ig-answer-review">
            <summary>Review answers ({answers.length})</summary>
            <ol>{answers.map((answer) => <li key={answer.id}>
              <strong>{answer.prompt}</strong>
              <div>{answer.correct ? '✓ Correct' : '✕ First answer'} · {answer.submitted}</div>
              {!answer.correct && <div>Correct answer · {answer.expected}</div>}
            </li>)}</ol>
          </details>}
          {currentMode === 'flash-cards' && <details className="ig-answer-review">
            <summary>Show cards ({pairs.length})</summary>
            <ol>{pairs.map((pair) => <li key={pair.id}><strong>{pair.term}</strong><div>{pair.definition}</div></li>)}</ol>
          </details>}
          <p className="ig-result-disclaimer">Practice feedback only. Revealed cards and speaking prompts are not assessed mastery.
            Only student-submitted formative results can be saved; they are not official grades.</p>
          {!isTeacher && <div className="ig-practice-save">
            <button type="button" disabled={practiceSaveState === 'saving' || practiceSaveState === 'saved'}
              onClick={() => void savePractice()}>
              {practiceSaveState === 'saved' ? '✓ Practice saved'
                : practiceSaveState === 'saving' ? 'Saving practice…' : 'Save practice to my history'}
            </button>
            {practiceSaveState === 'error' && <p role="alert">{practiceSaveError}</p>}
            {practiceSaveState === 'saved' && <p role="status">Saved as practice only; not an official assessment.</p>}
          </div>}
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
