import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { GAME_CATALOG, type GameKind, type GamePair } from './game-content';
import {
  GAME_LENGTHS, createQuizQuestions, createSpeakingPrompts, gameIsAvailable, poolForMode, selectGamePairs,
  type LiveGameCatalog, type LiveGamePack,
} from './remote-games';
import { OpenBox, Quiz, SpinWheel } from './ExtraGames';
import { MatchUpBoard, SpeakingDeck, FindMatchBoard, AnagramTiles } from './WordwallStyleModes';
import './interactive-games.css';
import './remote-games.css';

/**
 * Database-driven revision. Every page request reads the latest glossary and
 * Hodder chapter/section mapping. Game results are practice-only and temporary.
 */
export function InteractiveGamesPage({ isTeacher }: { isTeacher: boolean }) {
  const [catalog, setCatalog] = useState<LiveGameCatalog | null>(null);
  const [pack, setPack] = useState<LiveGamePack | null>(null);
  const [chapterNo, setChapterNo] = useState<number | null>(null);
  const [sectionCode, setSectionCode] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [packLoading, setPackLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<GameKind>('match-up');
  const [round, setRound] = useState(0);
  const [playSession, setPlaySession] = useState(0);
  const [questionCount, setQuestionCount] = useState(29);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    void api<{ data: LiveGameCatalog }>('/content/interactive-games/catalog?courseCode=9618')
      .then(({ data }) => {
        if (!active) return;
        setCatalog(data);
        setChapterNo((old) => data.chapters.some((ch) => ch.chapterNo === old)
          ? old : data.chapters[0]?.chapterNo ?? null);
        setError('');
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Chapter catalogue could not be loaded.');
      })
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, [refreshVersion]);

  useEffect(() => {
    if (chapterNo === null || !catalog) return;
    let active = true;
    setPackLoading(true);
    setPack(null);
    const query = new URLSearchParams({ courseCode: '9618', chapterNo: String(chapterNo) });
    if (sectionCode) query.set('sectionCode', sectionCode);
    void api<{ data: LiveGamePack }>('/content/interactive-games/pack?' + query.toString())
      .then(({ data }) => {
        if (!active) return;
        setPack(data);
        setError('');
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Game content could not be loaded.');
      })
      .finally(() => { if (active) setPackLoading(false); });
    return () => { active = false; };
  }, [chapterNo, sectionCode, refreshVersion, catalog]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setSeconds((time) => time + 1), 1000);
    return () => window.clearInterval(timer);
  }, [paused]);

  const chapter = catalog?.chapters.find((ch) => ch.chapterNo === chapterNo);
  const section = chapter?.sections.find((s) => s.code === sectionCode);
  const allPairs = pack?.pairs ?? [];
  const currentMode = gameIsAvailable(mode, allPairs)
    ? mode : GAME_CATALOG.find((game) => gameIsAvailable(game.id, allPairs))?.id ?? mode;
  const eligiblePairs = useMemo(() => poolForMode(pack?.pairs ?? [], currentMode), [pack, currentMode]);
  const pairs = useMemo(() => selectGamePairs(eligiblePairs, questionCount, round), [eligiblePairs, questionCount, round]);
  const speaking = useMemo(() => createSpeakingPrompts(pairs), [pairs]);
  const questions = useMemo(() => createQuizQuestions(pairs), [pairs]);
  const active = GAME_CATALOG.find((game) => game.id === currentMode)!;
  const ready = Boolean(pack && pairs.length);
  const time = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');

  function resetGame(nextMode?: GameKind) {
    if (nextMode) setMode(nextMode);
    // Changing templates keeps the SAME vocabulary round, so learners can
    // reinforce the same concepts using different interactions.
    // "New round" (no nextMode) alone moves on to the next batch.
    if (!nextMode || nextMode === mode) setRound((value) => value + 1);
    setPlaySession((value) => value + 1);
    setSeconds(0);
    setPaused(false);
  }
  function changeChapter(value: string) {
    const number = Number(value);
    setChapterNo(Number.isFinite(number) && number > 0 ? number : null);
    setSectionCode('');
    setPack(null);
    setRound(0);
    setPlaySession((value) => value + 1);
    setSeconds(0);
  }
  function changeSection(value: string) {
    setSectionCode(value);
    setPack(null);
    setRound(0);
    setSeconds(0);
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

  return <section className="ig-page" aria-label="Interactive Games">
    <div className="ig-session-bar" role="group" aria-label="Game session controls">
      <span className="ig-clock" role="timer">◷ {time}</span>
      <span className="ig-session-name">Interactive Games · {sectionCode || 'Chapter ' + (chapterNo ?? '—')}</span>
      <button type="button" onClick={() => setPaused((value) => !value)}>{paused ? '▶ Resume timer' : 'Ⅱ Pause timer'}</button>
      <button type="button" onClick={toggleFullscreen}>⛶ Full screen</button>
      {fullscreenError && <span role="alert">{fullscreenError}</span>}
    </div>
    <div className="ig-hero">
      <div>
        <span className="ig-eyebrow">CAMBRIDGE 9618 · LIVE CURRICULUM BANK</span>
        <h1>Learn by playing.</h1>
        <p>Choose a chapter and section. Every game is built from the latest terms and definitions already in the Cambridge database.</p>
        <div className="ig-pills">
          <span>{chapter ? 'Chapter ' + chapter.chapterNo : 'Select a chapter'}</span>
          <span>{section ? 'Section ' + section.code : 'Full chapter'}</span>
          <span>{isTeacher ? 'Teacher preview' : 'Student practice'}</span>
        </div>
      </div>
      <div className="ig-hero-mark" aria-hidden="true">8<span>play modes</span></div>
    </div>

    <div className="ig-data-controls" role="group" aria-label="Select chapter and section">
      <label>Chapter
        <select aria-label="Chapter" disabled={!catalog || !catalog.chapters.length} value={chapterNo ?? ''}
          onChange={(event) => changeChapter(event.target.value)}>
          {catalog?.chapters.map((ch) => <option key={ch.chapterNo} value={ch.chapterNo}>
            {ch.chapterNo}. {ch.title} ({ch.termCount} terms)
          </option>)}
        </select>
      </label>
      <label>Section
        <select aria-label="Section" value={sectionCode} disabled={!chapter} onChange={(event) => changeSection(event.target.value)}>
          <option value="">All sections — Chapter {chapterNo ?? ''}</option>
          {chapter?.sections.map((item) => <option value={item.code} key={item.code}>
            {item.code} — {item.title} ({item.termCount})
          </option>)}
        </select>
      </label>
      <label>Round size
        <select aria-label="Round size" value={questionCount} disabled={!ready}
          onChange={(event) => { setQuestionCount(Number(event.target.value)); setRound(0); setPlaySession((value) => value + 1); setSeconds(0); }}>
          {GAME_LENGTHS.map((size) => <option key={size} value={size}>{size} terms</option>)}
        </select>
      </label>
      <button className="ig-data-refresh" type="button" onClick={() => { setRefreshVersion((value) => value + 1); resetGame(); }}>↻ Refresh database</button>
    </div>

    {catalogLoading && <p className="ig-data-message" role="status">Loading the latest chapter catalogue…</p>}
    {!catalogLoading && catalog?.chapters.length === 0 && <p className="ig-data-message" role="status">
      No game-ready glossary content is available for your syllabus yet.
    </p>}
    {packLoading && <p className="ig-data-message" role="status">Loading the latest terms from the database…</p>}
    {error && <p className="ig-data-error" role="alert">{error}</p>}
    {pack && <div className="ig-notice" role="note">
      <strong>{pack.pairs.length} unique glossary terms loaded.</strong> Playing {pairs.length} this round.
      {pack.contentStatus === 'needs_review'
        ? ' Some or all terms are pending curriculum review. They are shown for provisional practice only, not as approved exam answers.'
        : ' All selected terms have been approved.'}
      {' '}Scores are temporary practice feedback, not official assessment results.
    </div>}
    {pack && pack.pairs.length === 0 && <p className="ig-data-message">
      No linked glossary terms were found for this section. Select the full chapter to practise newly imported terms
      that have not yet been linked to a precise subsection.
    </p>}

    {pack && ready && <>
      <div className="ig-games" role="group" aria-label="Choose a game">
        {GAME_CATALOG.map((game, i) => <button key={game.id} type="button"
          disabled={!gameIsAvailable(game.id, allPairs)} aria-pressed={currentMode === game.id}
          className={'ig-game-tile' + (currentMode === game.id ? ' is-selected' : '')}
          onClick={() => resetGame(game.id)}>
          <span className="ig-game-number">0{i + 1}</span>
          <strong>{game.label}</strong>
          <small>{gameIsAvailable(game.id, allPairs) ? game.description : 'This round needs more suitable terms.'}</small>
        </button>)}
      </div>
      <div className="ig-workspace">
        <div className="ig-workspace-head">
          <div><span className="ig-eyebrow">NOW PLAYING</span><h2>{active.label}</h2>
            <p>{chapter?.title}{section ? ' · ' + section.title : ''}</p>
          </div>
          <button className="ig-reset" type="button" onClick={() => resetGame()}>↻ New round</button>
        </div>
        <div key={[chapterNo, sectionCode, questionCount, currentMode, round, playSession, refreshVersion].join(':')}>
          {currentMode === 'match-up' && <MatchUpBoard pairs={pairs} />}
          {currentMode === 'flash-cards' && <FlashCards pairs={pairs} />}
          {currentMode === 'speaking-cards' && <SpeakingDeck prompts={speaking} />}
          {currentMode === 'spin-wheel' && <SpinWheel pairs={pairs} />}
          {currentMode === 'open-box' && <OpenBox pairs={pairs} />}
          {currentMode === 'quiz' && <Quiz questions={questions} />}
          {currentMode === 'find-the-match' && <FindMatchBoard pairs={pairs} />}
          {currentMode === 'anagram' && <AnagramTiles pairs={pairs} />}
        </div>
      </div>
      <p className="ig-source">Source: {pack.source}. Live glossary data is used as-is; pending-review content is clearly labelled.</p>
    </>}
  </section>;
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
    <button type="button" className="ig-flashcard" aria-label={revealed ? 'Term: ' + card.term : 'Definition: ' + card.definition + '. Flip to reveal the term.'}
      onClick={() => setRevealed((value) => !value)}>
      <span className="ig-eyebrow">{revealed ? 'KEY TERM' : 'DEFINITION'}</span>
      <strong>{revealed ? card.term : card.definition}</strong>
      <small>{revealed ? 'Click to see the definition' : 'Click to reveal the term'}</small>
    </button>
    <div className="ig-card-controls">
      <button type="button" disabled={index === 0} onClick={() => go(index - 1)}>← Previous</button>
      <button type="button" onClick={() => setRevealed((value) => !value)}>{revealed ? 'Show definition' : 'Flip card'}</button>
      <button type="button" disabled={index === pairs.length - 1} onClick={() => go(index + 1)}>Next →</button>
    </div>
  </div>;
}

