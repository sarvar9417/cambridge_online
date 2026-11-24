import type { LiveQuizPlayer } from './live-quiz-api';

/** The server snapshot is the only source of scores. Equal scores retain its
 * tie order; the viewer is not given a synthetic rank or fictional points. */
export function ArenaLeaderboard({players,selfId,gold=false,limit=10}:{
  players:readonly LiveQuizPlayer[];selfId?:string;gold?:boolean;limit?:number;
}){
  const ranked=[...players].sort((a,b)=>b.score-a.score);
  const visible=ranked.slice(0,limit);
  const ownIndex=ranked.findIndex(player=>player.id===selfId);
  if(ownIndex>=limit)visible.push(ranked[ownIndex]!);
  return <section className="lq-leaderboard lq-arena-board" aria-label={gold?'Gold leaderboard':'Leaderboard'}>
    <h3>🏆 {gold?'Gold standings':'Leaderboard'} <small>{ranked.length} players</small></h3>
    {visible.map(player=>{
      const rank=ranked.findIndex(item=>item.id===player.id)+1;
      return <div key={player.id} className={player.id===selfId?'is-self':undefined}>
        <span className="lq-rank">{rank}</span>
        <span className="lq-player-name">{player.avatar} {player.nickname}{player.id===selfId?' (you)':''}</span>
        <strong>{player.score.toLocaleString('en')}{gold?' 🪙':' pts'}</strong>
      </div>;
    })}
    {!ranked.length&&<p className="lq-board-empty">No players yet</p>}
    {ranked.length>limit&&<p className="lq-small">Top {limit} of {ranked.length} players{ownIndex>=limit?' + your position':''}</p>}
  </section>;
}

/** Decorative companion to the existing semantic countdown, not a second
 * independent clock. Both always receive the authoritative remaining time. */
export function ArenaCountdown({remaining,total}:{remaining:number;total:number}){
  const seconds=Math.max(0,Math.ceil(remaining));
  const fraction=Math.max(0,Math.min(1,seconds/Math.max(1,total)));
  return <div className={'lq-arena-countdown'+(seconds<=5?' is-urgent':'')} aria-hidden="true">
    <svg viewBox="0 0 100 100" focusable="false"><circle cx="50" cy="50" r="44" fill="none" stroke="#3d4878" strokeWidth="7"/>
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round"
        pathLength="100" strokeDasharray={`${fraction*100} 100`} transform="rotate(-90 50 50)"/></svg>
    <strong>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</strong>
  </div>;
}
