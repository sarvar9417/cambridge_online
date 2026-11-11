import {Medal,Trophy} from '@phosphor-icons/react';

export type PodiumStanding={
  rank:number;studentName:string;score:number;possible:number;
};

/**
 * Presentation only. Ranking is NEVER recalculated; we display the ordered
 * marks-first standings returned by the authorized round-summary endpoint.
 */
export function LiveChallengeFinalPodium({standings}:{standings:readonly PodiumStanding[]}){
  const top=standings.slice(0,3);
  if(!top.length)return null;
  return <section className="live-neon-podium" aria-label="Final Ceremony podium">
    <header><Trophy size={23} weight="fill"/><div><small>FINAL CEREMONY</small><h3>Cambridge Challenge podium</h3></div></header>
    <ol className="live-neon-podium-stands">{top.map((person,index)=><li key={person.studentName+`:${index}`}
      className={`live-neon-podium-place live-neon-podium-place--${Math.min(person.rank,3)}`}
      aria-label={`Position ${person.rank}: ${person.studentName}`}>
      <span className="live-neon-podium-medal" aria-hidden="true"><Medal weight="fill"/></span>
      <strong>{person.studentName}</strong>
      <small>{Number.isInteger(person.score)?person.score:person.score.toFixed(1)} / {person.possible} marks</small>
      <div className="live-neon-podium-plinth"><b>{person.rank}</b></div>
    </li>)}</ol>
    <p>Based on official Cambridge marks. Existing tie-break rules remain unchanged.</p>
  </section>;
}
