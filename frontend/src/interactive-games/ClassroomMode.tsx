import { useEffect, useState } from 'react';
import { gamePairProvenance, type GamePair } from './game-content';
import './classroom-mode.css';

interface Team {
  id: number;
  name: string;
  score: number;
}

interface ClassroomModeProps {
  pairs: readonly GamePair[];
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onNextRound: () => void;
  onExit: () => void;
}

const STARTING_TEAMS: Team[] = [
  { id: 1, name: 'Team A', score: 0 },
  { id: 2, name: 'Team B', score: 0 },
];

/** Teacher-led, projector-friendly practice. All scoring is manual and
 * session-only: no student identity, grades or practice records are written.
 */
export function ClassroomMode({ pairs, isFullscreen, onToggleFullscreen, onNextRound, onExit }: ClassroomModeProps) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [teams, setTeams] = useState<Team[]>(STARTING_TEAMS);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setIndex(0);
    setRevealed(false);
  }, [pairs]);

  const currentIndex = Math.min(index, Math.max(0, pairs.length - 1));
  const current = pairs[currentIndex];
  const provenance = current ? gamePairProvenance(current) : '';

  function move(next: number) {
    setIndex(Math.max(0, Math.min(next, pairs.length - 1)));
    setRevealed(false);
  }
  function changeScore(id: number, delta: number) {
    setTeams((previous) => previous.map((team) =>
      team.id === id ? { ...team, score: Math.max(0, Math.min(999, team.score + delta)) } : team));
    setConfirmClear(false);
  }
  function renameTeam(id: number, name: string) {
    setTeams((previous) => previous.map((team) => team.id === id ? { ...team, name: name.slice(0, 24) } : team));
  }
  function addTeam() {
    setTeams((previous) => {
      if (previous.length >= 4) return previous;
      const id = Math.max(...previous.map((team) => team.id)) + 1;
      return [...previous, { id, name: 'Team ' + String.fromCharCode(64 + id), score: 0 }];
    });
  }

  return <section className="ig-classroom" aria-label="Teacher classroom mode">
    <header className="ig-classroom-header">
      <div>
        <span className="ig-eyebrow">TEACHER-LED · PROJECTOR MODE</span>
        <h2>Classroom Mode</h2>
        <p>Reveal the definition, ask the class, and award team points manually. No grades or student results are saved.</p>
      </div>
      <div className="ig-classroom-header-actions">
        <button type="button" onClick={onToggleFullscreen}>
          {isFullscreen ? '⤢ Exit full screen' : '⛶ Full screen'}
        </button>
        <button type="button" onClick={onExit}>Exit classroom mode</button>
      </div>
    </header>

    <div className="ig-classroom-teams" role="group" aria-label="Manual team scoreboard">
      {teams.map((team) => <div className="ig-classroom-team" key={team.id}>
        <label htmlFor={'ig-classroom-team-' + team.id}>Team name</label>
        <input id={'ig-classroom-team-' + team.id} aria-label={'Team ' + team.id + ' name'}
          value={team.name} maxLength={24} onChange={(event) => renameTeam(team.id, event.target.value)} />
        <output aria-live="polite" aria-label={(team.name.trim() || 'Team ' + team.id) + ' score'}>{team.score}</output>
        <div className="ig-classroom-team-actions">
          <button type="button" aria-label={'Remove one point from team ' + team.id}
            disabled={team.score === 0} onClick={() => changeScore(team.id, -1)}>−1</button>
          <button type="button" aria-label={'Award one point to team ' + team.id}
            disabled={team.score >= 999} onClick={() => changeScore(team.id, 1)}>+1</button>
        </div>
        {teams.length > 2 && <button type="button" className="ig-classroom-remove-team"
          onClick={() => setTeams((previous) => previous.filter((item) => item.id !== team.id))}>
          Remove team
        </button>}
      </div>)}
    </div>
    <div className="ig-classroom-team-controls">
      <button type="button" onClick={addTeam} disabled={teams.length >= 4}>+ Add team</button>
      {confirmClear ? <>
        <span>Clear all team points?</span>
        <button type="button" onClick={() => { setTeams((previous) => previous.map((team) => ({ ...team, score: 0 }))); setConfirmClear(false); }}>
          Yes, clear scores
        </button>
        <button type="button" onClick={() => setConfirmClear(false)}>Cancel</button>
      </> : <button type="button" onClick={() => setConfirmClear(true)}>Clear scoreboard</button>}
    </div>

    {current ? <div className="ig-classroom-card">
      <div className="ig-classroom-progress">Vocabulary {currentIndex + 1} / {pairs.length}</div>
      <h3>{current.term}</h3>
      {provenance && <p className="ig-classroom-provenance">{provenance}</p>}
      {revealed ? <div className="ig-classroom-definition" role="status">
        <span>Definition</span>
        <p>{current.definition}</p>
      </div> : <p className="ig-classroom-prompt">Ask your class to explain this term before revealing the answer.</p>}
      <button className="ig-classroom-reveal" type="button" onClick={() => setRevealed((value) => !value)}>
        {revealed ? 'Hide definition' : 'Reveal definition'}
      </button>
      <nav className="ig-classroom-navigation" aria-label="Vocabulary navigation">
        <button type="button" disabled={currentIndex === 0} onClick={() => move(currentIndex - 1)}>← Previous term</button>
        <button type="button" disabled={currentIndex >= pairs.length - 1} onClick={() => move(currentIndex + 1)}>Next term →</button>
        <button type="button" onClick={onNextRound}>↻ Next vocabulary round</button>
      </nav>
    </div> : <p role="status">No vocabulary available for the selected classroom round.</p>}
    <p className="ig-classroom-footnote">Teacher-controlled formative activity. Points are temporary, manually awarded and never written to a student profile or gradebook.</p>
  </section>;
}
