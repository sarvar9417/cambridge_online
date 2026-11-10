import { useEffect, useState, type ReactNode } from 'react';
import type {LiveEffectSettings} from '../lib/api';
import {LiveMascot3D} from './LiveMascot3D';
import { GearSix, Lightning, Medal, Sparkle, SpeakerHigh, SpeakerSlash, Trophy } from '@phosphor-icons/react';
import {
  celebrationTier, getRewardSummary, isRewardEntry, REWARD_LABELS,
  type CelebrationIntensity, type CelebrationTier, type RewardBadge, type RewardEntry,
} from './live-challenge-rewards';
import './live-challenge-celebration.css';

type EffectsPreferences={animation:boolean;sound:boolean;intensity:CelebrationIntensity};
const PREF_KEY='cambridge-live-challenge-effects-v2';
const DEFAULT_PREFS:EffectsPreferences={animation:true,sound:false,intensity:'balanced'};
const COPY:Record<CelebrationTier,{title:string;detail:string}> = {
  gold:{title:'OUTSTANDING!',detail:'An incredible result — keep shining!'},
  spark:{title:'WELL DONE!',detail:'Strong work! Keep your momentum.'},
  steady:{title:'GOOD EFFORT!',detail:'You are making progress. Keep going!'},
  support:{title:'KEEP LEARNING!',detail:'Review the mark scheme and try again.'},
};

function readPrefs():EffectsPreferences {
  try {
    const parsed=JSON.parse(window.localStorage.getItem(PREF_KEY)||'null');
    if(!parsed||typeof parsed!=='object')return DEFAULT_PREFS;
    return {
      animation:typeof parsed.animation==='boolean'?parsed.animation:true,
      sound:parsed.sound===true,
      intensity:['calm','balanced','spectacular'].includes(parsed.intensity)?parsed.intensity:'balanced',
    };
  } catch {return DEFAULT_PREFS;}
}

function updatePrefs(value:EffectsPreferences) {
  try {window.localStorage.setItem(PREF_KEY,JSON.stringify(value));} catch { /* storage may be disabled */ }
}

function rewardKey(sessionId:string,userId:string) {
  return `live-challenge-v2:${sessionId}:${userId}`;
}

function readProgress(key:string):RewardEntry[] {
  try {
    const parsed=JSON.parse(window.sessionStorage.getItem(key)||'[]');
    return Array.isArray(parsed)?parsed.filter(isRewardEntry):[];
  } catch {return [];}
}

export function playResultSound(tier:CelebrationTier) {
  try {
    type AudioContextConstructor = typeof AudioContext;
    const win=window as typeof window&{webkitAudioContext?:AudioContextConstructor};
    const Constructor=win.AudioContext??win.webkitAudioContext;
    if(!Constructor)return;
    const audio=new Constructor();
    const frequencies=tier==='gold'?[523,659,784]:tier==='spark'?[523,659]:tier==='steady'?[440]:[];
    if(!frequencies.length){void audio.close();return;}
    frequencies.forEach((frequency,index)=>{
      const start=audio.currentTime+index*.12;
      const oscillator=audio.createOscillator();
      const gain=audio.createGain();
      oscillator.type='sine';
      oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(.065,start+.018);
      gain.gain.exponentialRampToValueAtTime(.0001,start+.18);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start+.19);
    });
    window.setTimeout(()=>{void audio.close().catch(()=>undefined)},900);
  } catch { /* user agent blocked audio: visual feedback remains */ }
}

/** An original vector mascot, rendered with highlights/shadows and 3D-style depth. */
export function NeonMascot({tier}:{tier:CelebrationTier}) {
  return <svg viewBox="0 0 176 182" width="156" height="162" aria-hidden="true" className={`live-neon-mascot-svg live-neon-mascot--${tier}`}>
    <defs>
      <linearGradient id="robot-body" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#f2faff"/><stop offset=".45" stopColor="#98c8ff"/><stop offset="1" stopColor="#3a52b8"/></linearGradient>
      <linearGradient id="robot-face" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#18275b"/><stop offset="1" stopColor="#080e29"/></linearGradient>
      <linearGradient id="robot-arm" x1="0" x2="1"><stop stopColor="#d9ebff"/><stop offset="1" stopColor="#607dde"/></linearGradient>
      <radialGradient id="robot-glow"><stop stopColor="#a6f0ff" stopOpacity=".72"/><stop offset="1" stopColor="#38bdf8" stopOpacity="0"/></radialGradient>
      <filter id="robot-shadow" x="-45%" y="-45%" width="190%" height="190%"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>
    <ellipse cx="90" cy="170" rx="56" ry="9" fill="#111a46" opacity=".6" filter="url(#robot-shadow)"/>
    <circle cx="88" cy="88" r="82" fill="url(#robot-glow)"/>
    <path d="M50 120L31 139Q21 143 19 131L12 107Q10 99 19 96Q27 95 30 103L36 119L50 109" fill="url(#robot-arm)" stroke="#7792e4" strokeWidth="3" className="live-mascot-arm-left"/>
    <path d="M126 113L145 95Q151 88 157 96L169 112Q174 119 168 125Q161 130 156 124L149 115L137 136" fill="url(#robot-arm)" stroke="#7792e4" strokeWidth="3" className="live-mascot-arm-right"/>
    <rect x="52" y="112" width="76" height="55" rx="25" fill="url(#robot-body)" stroke="#8ac7ff" strokeWidth="2"/>
    <path d="M62 127Q88 119 117 127" stroke="#fff" strokeWidth="5" opacity=".65" fill="none" strokeLinecap="round"/>
    <rect x="75" y="151" width="26" height="7" rx="3" fill="#3655b8" opacity=".8"/>
    <path d="M89 34V22" stroke="#82b9ff" strokeWidth="7" strokeLinecap="round"/>
    <circle cx="89" cy="16" r="9" fill="#fcd34d" stroke="#fff3ab" strokeWidth="2"/>
    <rect x="19" y="31" width="140" height="102" rx="43" fill="url(#robot-body)" stroke="#c3e8ff" strokeWidth="3"/>
    <path d="M31 62Q48 30 105 34" stroke="#fff" opacity=".75" strokeWidth="7" strokeLinecap="round" fill="none"/>
    <rect x="31" y="49" width="116" height="69" rx="28" fill="url(#robot-face)"/>
    <ellipse cx="65" cy="79" rx="12" ry="15" fill="#67f5ff" className="live-mascot-eye"/>
    <ellipse cx="112" cy="79" rx="12" ry="15" fill="#67f5ff" className="live-mascot-eye"/>
    <ellipse cx="62" cy="74" rx="4" ry="5" fill="#fff" opacity=".95"/>
    <ellipse cx="109" cy="74" rx="4" ry="5" fill="#fff" opacity=".95"/>
    {tier==='support'?<path d="M77 105Q89 97 101 105" stroke="#88e7ff" strokeWidth="4" fill="none" strokeLinecap="round"/>:
      tier==='steady'?<path d="M76 102H101" stroke="#88e7ff" strokeWidth="4" fill="none" strokeLinecap="round"/>:
      <path d="M74 99Q89 116 104 99" stroke="#88e7ff" strokeWidth="4" fill="none" strokeLinecap="round"/>}
    <ellipse cx="43" cy="96" rx="6" ry="4" fill="#ffb4e4" opacity=".65"/>
    <ellipse cx="135" cy="96" rx="6" ry="4" fill="#ffb4e4" opacity=".65"/>
    {tier==='gold'?<path d="M148 20l4 11 11 4-11 4-4 11-4-11-11-4 11-4z" fill="#fde68a"/>:null}
  </svg>;
}

type MysteryPrize={title:string;detail:string};
const MYSTERY_PRIZES:Record<number,MysteryPrize>={
  3:{title:'Neon Star',detail:'Three reviewed questions — a new avatar star!'},
  5:{title:'Crystal Crown',detail:'Five reviewed questions — your avatar earned a crown!'},
  10:{title:'Galaxy Wings',detail:'Ten reviewed questions — your avatar earned wings!'},
};
type Cue={key:string;tier:CelebrationTier;score:number;possible:number;streak:number;newBadges:RewardBadge[];mystery?:MysteryPrize};

export function MysteryRewardChest({reward}:{reward:MysteryPrize}) {
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    const timer=window.setTimeout(()=>setOpen(true),650);
    return()=>window.clearTimeout(timer);
  },[]);
  return <div className={`live-mystery-reward${open?' is-open':''}`} aria-label="Mystery Reward">
    <button type="button" className="live-chest-button" onClick={()=>setOpen(true)} aria-expanded={open} aria-label="Open mystery reward chest">
      <span className="live-chest-shine" aria-hidden="true"/>
      <span className="live-chest-lid" aria-hidden="true"/>
      <span className="live-chest-body" aria-hidden="true"><span>✦</span></span>
    </button>
    <div className="live-chest-reveal" role="status">
      <strong>{open?reward.title:'Mystery Reward'}</strong>
      <small>{open?reward.detail:'Opening your achievement chest…'}</small>
    </div>
  </div>;
}

export function LiveChallengeCelebration({sessionId,userId,questionIndex,score,possible,policy}:{
  sessionId:string;userId:string;questionIndex:number;score:number|null|undefined;possible:number|null|undefined;policy?:LiveEffectSettings;
}) {
  const key=rewardKey(sessionId,userId);
  const [prefs,setPrefs]=useState<EffectsPreferences>(readPrefs);
  const [entries,setEntries]=useState<RewardEntry[]>(()=>readProgress(key));
  const [cue,setCue]=useState<Cue|null>(null);
  const summary=getRewardSummary(entries);

  const changePrefs=(next:EffectsPreferences)=>{
    setPrefs(next);
    updatePrefs(next);
  };

  useEffect(()=>{
    const entry={questionIndex,score,possible};
    if(!isRewardEntry(entry))return;
    const tier=celebrationTier(entry.score,entry.possible);
    if(!tier)return;
    const latest=readProgress(key);
    const before=getRewardSummary(latest);
    const next=[...latest.filter(row=>row.questionIndex!==questionIndex),entry];
    const after=getRewardSummary(next);
    const signature=`${entry.score}/${entry.possible}`;
    let announced=false;
    try {
      window.sessionStorage.setItem(key,JSON.stringify(next));
      const noticeKey=`${key}:shown:${questionIndex}`;
      announced=window.sessionStorage.getItem(noticeKey)===signature;
      window.sessionStorage.setItem(noticeKey,signature);
    } catch { /* still show feedback in private browsing */ }
    setEntries(next);
    if(announced)return;
    if(prefs.sound && policy?.sound!==false && policy?.publicCelebrations!==false)playResultSound(tier);
    if(!prefs.animation || policy?.animations===false || policy?.publicCelebrations===false)return;
    const newBadges=after.badges.filter(badge=>!before.badges.includes(badge));
    const mystery=after.reviewed!==before.reviewed?MYSTERY_PRIZES[after.reviewed]:undefined;
    const nextCue={key:`${questionIndex}:${signature}`,tier,score:entry.score,possible:entry.possible,streak:after.streak,newBadges,mystery};
    setCue(nextCue);
  },[key,questionIndex,score,possible,prefs.animation,prefs.intensity,prefs.sound,policy?.animations,policy?.sound,policy?.publicCelebrations]);

  useEffect(()=>{
    if(!cue)return;
    const timer=window.setTimeout(()=>setCue(current=>current?.key===cue.key?null:current),prefs.intensity==='spectacular'?4900:3200);
    return()=>window.clearTimeout(timer);
  },[cue,prefs.intensity]);

  return <>
    <div className="live-reward-bar" aria-label="Live Challenge rewards">
      <div className="live-reward-stats">
        <strong><Lightning weight="fill"/> {summary.streak} streak</strong>
        <span>{summary.reviewed} reviewed</span>
        {summary.badges.map(badge=><span className="live-reward-badge" key={badge} title={REWARD_LABELS[badge].description}>{REWARD_LABELS[badge].icon} {REWARD_LABELS[badge].title}</span>)}
      </div>
      <details className="live-fx-settings"><summary><GearSix/> Effects</summary>
        <div>
          <label><input type="checkbox" checked={prefs.animation} disabled={policy?.animations===false} onChange={event=>changePrefs({...prefs,animation:event.target.checked})}/> Animations</label>
          <label><input type="checkbox" checked={prefs.sound} disabled={policy?.sound===false} onChange={event=>{const sound=event.target.checked;changePrefs({...prefs,sound});if(sound)playResultSound('steady')}}/> {prefs.sound?<SpeakerHigh/>:<SpeakerSlash/>} Sound</label>
          <label>Intensity <select disabled={!prefs.animation} value={prefs.intensity} onChange={event=>changePrefs({...prefs,intensity:event.target.value as CelebrationIntensity})}>
            <option value="calm">Calm</option><option value="balanced">Balanced</option><option value="spectacular">Spectacular</option>
          </select></label>
        </div>
      </details>
    </div>
    {cue?<aside key={cue.key} className={`live-neon-cue live-neon-cue--${cue.tier} live-neon-cue--${prefs.intensity}`} aria-live="polite" aria-label="Celebration message">
      {prefs.intensity!=='calm'?<div className="live-neon-particles" aria-hidden="true">{Array.from({length:prefs.intensity==='spectacular'?18:10},(_,i)=><i key={i}/>)}</div>:null}
      <LiveMascot3D tier={cue.tier} fallback={<NeonMascot tier={cue.tier}/>} animate={prefs.intensity!=='calm'}/>
      <div className="live-neon-cue-copy"><small>CAMBRIDGE LIVE CHALLENGE</small><strong>{COPY[cue.tier].title}</strong><span className="live-neon-points">+{cue.score} <small>/ {cue.possible} marks</small></span><p>{COPY[cue.tier].detail}</p>
        {cue.streak>=2?<span className="live-neon-streak"><Lightning weight="fill"/> {cue.streak} ANSWERS STREAK</span>:null}
        {cue.newBadges.map(badge=><span className="live-neon-award" key={badge}>{REWARD_LABELS[badge].icon} ACHIEVEMENT: {REWARD_LABELS[badge].title}</span>)}
        {cue.mystery?<MysteryRewardChest key={cue.key} reward={cue.mystery}/>:null}
      </div>
    </aside>:null}
  </>;
}

export function LiveChallengeFinalCeremony({title,earned,possible,results,children}:{
  title:string;earned?:number|null;possible?:number|null;
  results?:Array<{questionPosition:number;score:number|null;marks:number}>;children?:ReactNode;
}) {
  const completed=getRewardSummary((results??[]).map(row=>({questionIndex:row.questionPosition,score:row.score,possible:row.marks})).filter(isRewardEntry));
  const percentage=typeof earned==='number'&&typeof possible==='number'&&possible>0
    ?Math.round(100*earned/possible):null;
  return <section className="live-neon-final" aria-label="Live Challenge Final Ceremony">
    <div className="live-neon-final-crown"><Trophy weight="fill"/><span aria-hidden="true"><Sparkle weight="fill"/></span></div>
    <div><span className="live-neon-final-eyebrow"><Medal weight="fill"/> FINAL CEREMONY</span><h2>{title}</h2>
      <p>{percentage===null?'Challenge completed. Cambridge marks determine the results.':'Your Cambridge results are ready. Well played!'}</p>
      {percentage!==null?<strong className="live-neon-final-percent">{earned} / {possible} <small>marks · {percentage}%</small></strong>:null}
      {completed.badges.length?<div className="live-neon-final-badges">{completed.badges.map(badge=><span key={badge} title={REWARD_LABELS[badge].description}>{REWARD_LABELS[badge].icon} {REWARD_LABELS[badge].title}</span>)}</div>:null}
    </div>
    {children}
  </section>;
}
