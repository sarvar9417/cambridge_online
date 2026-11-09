import { useEffect, useState } from 'react';
import {
  chapter7Pilot, GAME_CATALOG,
  type GameKind, type GamePair,
} from './game-content';
import { OpenBox, Quiz, SpinWheel } from './ExtraGames';
import { MatchUpBoard, SpeakingDeck, FindMatchBoard, AnagramTiles } from './WordwallStyleModes';
import './interactive-games.css';

/**
 * Phase-1 standalone client-only pilot.
 * Future game sets and persistent sessions require an authenticated backend API.
 * Results on this page are NOT stored as assessment evidence.
 */
export function InteractiveGamesPage({ isTeacher }: { isTeacher: boolean }) {
  const [mode, setMode] = useState<GameKind>('match-up');
  const [round, setRound] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  useEffect(() => {
    if (paused) return;
    const interval = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [paused]);
  const time = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  const toggleFullscreen = () => {
    setFullscreenError('');
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => setFullscreenError('Could not exit fullscreen mode.'));
    } else {
      const element = document.querySelector('.ig-page');
      if (element instanceof HTMLElement && element.requestFullscreen) {
        void element.requestFullscreen().catch(() => setFullscreenError('Fullscreen is unavailable in this browser.'));
      } else setFullscreenError('Fullscreen is unavailable in this browser.');
    }
  };
  const active = GAME_CATALOG.find((entry) => entry.id === mode)!;
  return <section className="ig-page" aria-label="Interactive Games">
    <div className="ig-session-bar" role="group" aria-label="Game session controls">
      <span className="ig-clock" role="timer">◷ {time}</span>
      <span className="ig-session-name">Interactive Games · Section {chapter7Pilot.sectionCode}</span>
      <button type="button" onClick={() => setPaused((value) => !value)}>{paused ? '▶ Resume timer' : 'Ⅱ Pause timer'}</button>
      <button type="button" onClick={toggleFullscreen}>⛶ Full screen</button>
      {fullscreenError && <span role="alert">{fullscreenError}</span>}
    </div>
    <div className="ig-hero">
      <div>
        <span className="ig-eyebrow">CAMBRIDGE 9618 · INTERACTIVE GAMES</span>
        <h1>Learn by playing.</h1>
        <p>Short, focused games for Cambridge Computer Science. Choose a game to practise the same key ideas in a new way.</p>
        <div className="ig-pills"><span>Chapter {chapter7Pilot.chapterNo}</span><span>Section {chapter7Pilot.sectionCode}</span><span>{isTeacher ? 'Teacher preview' : 'Independent practice'}</span></div>
      </div>
      <div className="ig-hero-mark" aria-hidden="true">8<span>play modes</span></div>
    </div>
    <div className="ig-notice" role="note">
      <strong>Chapter 7.1 pilot content.</strong> This is a curated practice set, not the complete Chapter 7 question bank.
      {isTeacher ? ' Preview what learners will see.' : ' Results are shown on this device only and are not yet saved to your account.'}
    </div>
    <div className="ig-games" role="group" aria-label="Choose a game">
      {GAME_CATALOG.map((game, i) => <button key={game.id} type="button" aria-pressed={mode === game.id}
        className={'ig-game-tile' + (mode === game.id ? ' is-selected' : '')}
        onClick={() => { setMode(game.id); setRound(0); setSeconds(0); setPaused(false); }}>
        <span className="ig-game-number">0{i + 1}</span>
        <strong>{game.label}</strong>
        <small>{game.description}</small>
      </button>)}
    </div>
    <div className="ig-workspace">
      <div className="ig-workspace-head">
        <div><span className="ig-eyebrow">NOW PLAYING</span><h2>{active.label}</h2><p>{chapter7Pilot.sectionTitle}</p></div>
        <button className="ig-reset" type="button" onClick={() => { setRound((current) => current + 1); setSeconds(0); setPaused(false); }}>↻ Restart</button>
      </div>
      <div key={mode + ':' + round}>
        {mode === 'match-up' && <MatchUpBoard pairs={chapter7Pilot.pairs} />}
        {mode === 'flash-cards' && <FlashCards pairs={chapter7Pilot.pairs} />}
        {mode === 'speaking-cards' && <SpeakingDeck prompts={chapter7Pilot.speaking} />}
        {mode === 'spin-wheel' && <SpinWheel pairs={chapter7Pilot.pairs} />}
        {mode === 'open-box' && <OpenBox pairs={chapter7Pilot.pairs} />}
        {mode === 'quiz' && <Quiz questions={chapter7Pilot.quiz} />}
        {mode === 'find-the-match' && <FindMatchBoard pairs={chapter7Pilot.pairs} />}
        {mode === 'anagram' && <AnagramTiles pairs={chapter7Pilot.pairs} />}
      </div>
    </div>
    <p className="ig-source">Source: {chapter7Pilot.source}. Material is adapted and shortened for practice.</p>
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

