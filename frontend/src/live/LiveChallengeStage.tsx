import {useEffect,useState} from 'react';
import {GearSix,Lightning,SpeakerHigh,SpeakerSlash,Sparkle} from '@phosphor-icons/react';
import {api,type LiveEffectSettings} from '../lib/api';
import {randomId} from '../lib/random-id';
import {celebrationTier,type CelebrationTier} from './live-challenge-rewards';
import {LiveMascot3D} from './LiveMascot3D';
import {NeonMascot,playResultSound} from './LiveChallengeCelebration';
import './live-neon-arena-v2.css';

export const DEFAULT_LIVE_POLICY:LiveEffectSettings={
  animations:true,sound:false,intensity:'balanced',publicCelebrations:true,
};

const MOMENT_TITLE:Record<CelebrationTier,string>={
  gold:'BRILLIANT WORK!',spark:'CONGRATULATIONS!',
  steady:'NICE PROGRESS!',support:'KEEP GOING!',
};

function isValidScore(score:number|null|undefined,possible:number|null|undefined):score is number {
  return typeof score==='number'&&Number.isFinite(score)
    &&typeof possible==='number'&&Number.isFinite(possible)&&possible>0
    &&score>=0&&score<=possible;
}

/**
 * The teacher sees a private moment immediately after an authoritative save.
 * The audience sees a moment only when released round summary data has arrived.
 * No private learner names or unreleased grades enter shared displays.
 */
export function LiveChallengeMoment({eventId,score,possible,context,policy,publicView=false}:{
  eventId:string;score:number|null|undefined;possible:number|null|undefined;
  context:string;policy?:LiveEffectSettings;publicView?:boolean;
}){
  const effects=policy??DEFAULT_LIVE_POLICY;
  const [visible,setVisible]=useState(false);
  const tier=isValidScore(score,possible)?celebrationTier(score,Number(possible)):null;
  useEffect(()=>{
    if(!tier||!effects.animations||(publicView&&!effects.publicCelebrations))return;
    const key=`cambridge-live-moment:${eventId}`;
    try{
      if(window.sessionStorage.getItem(key)==='shown')return;
      window.sessionStorage.setItem(key,'shown');
    }catch{/* private browsing still shows one moment */}
    setVisible(true);
    let armed=false;try{armed=window.sessionStorage.getItem('cambridge-live-projector-audio')==='armed'}catch{/* blocked storage */}
    if(effects.sound&&(!publicView||armed))playResultSound(tier);
  },[eventId,tier,effects.animations,effects.sound,effects.intensity,effects.publicCelebrations,publicView]);
  useEffect(()=>{
    if(!visible)return;
    const timer=window.setTimeout(()=>setVisible(false),effects.intensity==='spectacular'?5400:3400);
    return()=>window.clearTimeout(timer);
  },[visible,effects.intensity,eventId]);
  if(!visible||!tier||!isValidScore(score,possible))return null;
  return <aside key={eventId} className={`live-neon-cue live-neon-shared-cue live-neon-cue--${tier} live-neon-cue--${effects.intensity}`} role="status" aria-live="polite">
    {effects.intensity!=='calm'?<div className="live-neon-particles" aria-hidden="true">{Array.from({length:14},(_,i)=><i key={i}/>)}</div>:null}
    <LiveMascot3D tier={tier} fallback={<NeonMascot tier={tier}/>} animate={effects.intensity!=='calm'}/>
    <div className="live-neon-cue-copy">
      <small>NEON ARENA · LIVE CHALLENGE</small>
      <strong>{MOMENT_TITLE[tier]}</strong>
      <span className="live-neon-points">{publicView?'Class average: ':'+'}{Number.isInteger(score)?score:score.toFixed(1)} <small>/ {possible} marks</small></span>
      <p>{context}</p>
    </div>
  </aside>;
}

export function LiveChallengeTeacherEffects({sessionId,policy,version,onSaved}:{
  sessionId:string;policy?:LiveEffectSettings;version:number;onSaved:()=>Promise<void>;
}){
  const live=policy??DEFAULT_LIVE_POLICY;
  const [draft,setDraft]=useState<LiveEffectSettings>(live);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [saved,setSaved]=useState(false);
  useEffect(()=>setDraft(live),[live.animations,live.sound,live.intensity,live.publicCelebrations]);
  const changed=Object.keys(live).some(key=>draft[key as keyof LiveEffectSettings]!==live[key as keyof LiveEffectSettings]);
  const save=async()=>{
    if(!changed||busy)return;
    setError('');setSaved(false);setBusy(true);
    try{
      await api(`/live-exams/${sessionId}/effects`,{
        method:'POST',headers:{'Idempotency-Key':randomId()},
        body:JSON.stringify({...draft,expectedVersion:version}),
      });
      await onSaved();
      setSaved(true);
    }catch(cause){setError(cause instanceof Error?cause.message:'Effects sozlamalari saqlanmadi.')}
    finally{setBusy(false)}
  };
  return <details className="live-neon-teacher-controls" aria-label="Teacher celebration controls">
    <summary><GearSix size={18}/> Neon Arena · Teacher Effects</summary>
    <div className="live-neon-teacher-control-body">
      <p>Sozlamalar butun xonaga sinxron qo‘llanadi. Cambridge ballari va Mark Scheme o‘zgarmaydi.</p>
      <div className="live-neon-teacher-toggles">
        <label><input type="checkbox" checked={draft.animations} onChange={e=>setDraft(v=>({...v,animations:e.target.checked}))}/> Celebration animations</label>
        <label><input type="checkbox" checked={draft.sound} onChange={e=>setDraft(v=>({...v,sound:e.target.checked}))}/> Sound effects (browser permission may be needed)</label>
        <label><input type="checkbox" checked={draft.publicCelebrations} onChange={e=>setDraft(v=>({...v,publicCelebrations:e.target.checked}))}/> Student & projector celebrations after release</label>
        <label>Celebration intensity
          <select value={draft.intensity} onChange={e=>setDraft(v=>({...v,intensity:e.target.value as LiveEffectSettings['intensity']}))}>
            <option value="calm">Calm</option><option value="balanced">Balanced</option><option value="spectacular">Spectacular</option>
          </select>
        </label>
      </div>
      <div className="live-neon-teacher-actions">
        <button type="button" className="live-secondary" onClick={()=>playResultSound('gold')}><SpeakerHigh/> Test sound</button>
        <button type="button" disabled={!changed||busy} onClick={()=>void save()}>{busy?'Saqlanmoqda…':'Apply to all screens'}</button>
      </div>
      {saved&&!changed?<small role="status">✓ Xonaning yangi sozlamalari saqlandi.</small>:null}
      {error?<p className="live-error" role="alert">{error}</p>:null}
    </div>
  </details>;
}

/** Audio requires a user gesture in many browsers, even if teacher enabled it. */
export function LiveProjectorSoundControl({enabled}:{enabled:boolean}){
  const [armed,setArmed]=useState(false);
  useEffect(()=>{
    try{window.sessionStorage.removeItem('cambridge-live-projector-audio');}catch{/* ignore */}
  },[]);
  if(!enabled)return null;
  return <button type="button" className="live-neon-projector-sound" aria-pressed={armed}
    onClick={()=>{
      try{window.sessionStorage.setItem('cambridge-live-projector-audio',armed?'off':'armed')}catch{/* ignored */}
      setArmed(!armed);
      if(!armed)playResultSound('steady');
    }}>
    {armed?<SpeakerHigh/>:<SpeakerSlash/>} {armed?'Audio armed':'Activate projector audio'}
  </button>;
}

export function LiveNeonArenaHeader({questionIndex,questionCount}:{questionIndex:number;questionCount:number}){
  return <div className="live-neon-arena-strip" aria-label="Neon Arena progress">
    <span><Sparkle weight="fill"/> NEON ARENA</span>
    <div className="live-neon-arena-progress"><i style={{width:`${Math.min(100,Math.max(0,100*(questionIndex+1)/Math.max(1,questionCount)))}%`}}/></div>
    <small><Lightning weight="fill"/> ROUND {Math.min(questionIndex+1,Math.max(1,questionCount))} / {Math.max(1,questionCount)}</small>
  </div>;
}
