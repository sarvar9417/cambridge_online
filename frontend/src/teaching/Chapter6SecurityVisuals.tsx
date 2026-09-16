import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter6-security-visuals.css';

export const CHAPTER_6_SECURITY_VISUAL_IDS = [
  'h6-612-accounts-passwords',
  'h6-612-signatures-firewall',
  'h6-612-antimalware-encryption-biometrics',
  'h6-613-pharming',
  'h6-614-recovery',
  'h6-621-validation',
  'h6-622-modulo11-checksum',
  'h6-622-parity-block',
  'h6-622-arq',
] as const;

export function hasChapter6SecurityVisual(beat:LessonPresentationBeat){
  return CHAPTER_6_SECURITY_VISUAL_IDS.includes(beat.slideId as never);
}

const state=(reveal:number,step:number)=>reveal>=step?'is-active':'is-upcoming';

function AccountsAccess({reveal}:{reveal:number}){
  return <div className="h6sec h6sec-access" aria-label="Authentication and access rights hierarchy visual">
    <section className={state(reveal,1)}><b>USERNAME + PASSWORD</b><span>authenticate the user</span></section>
    <i aria-hidden="true">→</i>
    <section className={`h6sec-gate ${state(reveal,2)}`}><b>ACCESS LEVEL</b><span>authorise only permitted areas</span></section>
    <i aria-hidden="true">→</i>
    <div className="h6sec-access-levels">
      <span className={state(reveal,2)}>PUBLIC</span>
      <span className={state(reveal,3)}>STAFF</span>
      <span className={state(reveal,3)}>SENIOR STAFF</span>
    </div>
    <footer className={state(reveal,3)}>Strong passwords should be difficult to guess or crack and not be based on obvious personal information.</footer>
  </div>;
}

function Firewall({reveal}:{reveal:number}){
  return <div className="h6sec h6sec-firewall" aria-label="Firewall filtering incoming and outgoing network traffic">
    <section className={`h6sec-network ${state(reveal,1)}`}><b>EXTERNAL NETWORK</b><span>incoming traffic</span></section>
    <div className={`h6sec-wall ${state(reveal,2)}`}><strong>FIREWALL</strong><span>check traffic against rules</span><div><em>ALLOW</em><em>BLOCK</em><em>LOG</em></div></div>
    <section className={`h6sec-network ${state(reveal,2)}`}><b>COMPUTER / INTERNAL NETWORK</b><span>outgoing traffic</span></section>
    <footer className={state(reveal,3)}>Can block destinations or IP addresses and warn when local software attempts an external connection.</footer>
  </div>;
}

function LayeredProtection({reveal}:{reveal:number}){
  const layers=[
    ['FIREWALL','filter network traffic'],
    ['ANTIVIRUS','signatures · heuristics · quarantine'],
    ['ANTI-SPYWARE','detect and remove spyware'],
    ['ENCRYPTION','stolen data unreadable without key'],
    ['BIOMETRICS','fingerprint · retina · face · voice'],
  ] as const;
  return <div className="h6sec h6sec-layers" aria-label="Layered data security controls visual">
    <div className={`h6sec-data ${state(reveal,1)}`}><b>DATA</b><span>confidentiality and controlled access</span></div>
    {layers.map(([name,note],index)=><section className={state(reveal,index<2?1:index<4?2:3)} key={name}><b>{name}</b><span>{note}</span></section>)}
    <footer className={state(reveal,3)}>No single control covers every attack path.</footer>
  </div>;
}

function Pharming({reveal}:{reveal:number}){
  return <div className="h6sec h6sec-pharming" aria-label="Pharming and DNS cache poisoning redirect visual">
    <section className={state(reveal,1)}><b>USER TYPES</b><span>legitimate-looking domain</span></section><i>→</i>
    <section className={`h6sec-dns ${state(reveal,2)}`}><b>DNS / LOCAL NAME DATA</b><span>poisoned or maliciously changed address</span></section><i>→</i>
    <section className={`h6sec-fake ${state(reveal,3)}`}><b>FRAUDULENT WEBSITE</b><span>browser is redirected</span></section>
    <footer className={state(reveal,3)}>Unlike phishing, pharming can redirect the user without the same deliberate response to a deceptive message or link.</footer>
  </div>;
}

function Recovery({reveal}:{reveal:number}){
  const rows=[
    ['ACCIDENTAL LOSS','save · backup · restrict access'],
    ['HARDWARE FAULT','backup · UPS · regular saving'],
    ['SOFTWARE FAULT','backup · frequent saving'],
    ['INCORRECT OPERATION','backup · training'],
  ] as const;
  return <div className="h6sec h6sec-recovery" aria-label="Data recovery risks and safeguards visual">
    {rows.map(([risk,safeguards],index)=><section className={state(reveal,index<2?1:index<3?2:3)} key={risk}><b>{risk}</b><i aria-hidden="true">→</i><span>{safeguards}</span></section>)}
    <footer className={state(reveal,3)}>Keep backups on another medium and in a separate location; assign responsibility for making them.</footer>
  </div>;
}

function Validation({reveal}:{reveal:number}){
  const checks=['TYPE','RANGE','FORMAT','LENGTH','PRESENCE','EXISTENCE','LIMIT','CONSISTENCY','UNIQUENESS'];
  return <div className="h6sec h6sec-validation" aria-label="Common validation checks visual">
    <header className={state(reveal,1)}><b>ENTERED VALUE</b><span>Does it satisfy the defined rule?</span></header>
    <div className="h6sec-check-grid">{checks.map((check,index)=><span className={state(reveal,index<3?1:index<6?2:3)} key={check}>{check}</span>)}</div>
    <footer className={state(reveal,3)}><b>VALID ≠ FACTUALLY CORRECT</b><span>A plausible but wrong value can still pass validation.</span></footer>
  </div>;
}

function ModuloChecksum({reveal}:{reveal:number}){
  return <div className="h6sec h6sec-verify" aria-label="Modulo 11 check digit and checksum comparison visual">
    <section className={state(reveal,1)}><header><b>CHECK DIGIT · MODULO-11</b></header><ol><li>digits × descending weights</li><li>add products</li><li>divide by 11</li><li>derive / compare check digit</li></ol><footer>structured identifier</footer></section>
    <section className={state(reveal,2)}><header><b>CHECKSUM</b></header><ol><li>calculate before transmission</li><li>send block + checksum</li><li>recalculate at receiver</li><li>match or retransmit</li></ol><footer>transmitted data block</footer></section>
  </div>;
}

const block=[
  ['1','0','1','1','0','1'],
  ['0','1','1','0','1','0'],
  ['1','1','0','1','0','0'],
  ['0','1','1','1','1','0'],
];
function ParityBlock({reveal}:{reveal:number}){
  return <div className="h6sec h6sec-parity" aria-label="Two dimensional parity block locating one changed bit">
    <div className="h6sec-parity-labels"><b>ROWS</b><span>horizontal parity → failing byte</span></div>
    <div className={`h6sec-parity-grid ${state(reveal,1)}`}>
      {block.flatMap((row,rowIndex)=>row.map((bit,colIndex)=><span className={rowIndex===2&&colIndex===3?'is-error':''} key={`${rowIndex}-${colIndex}`}>{bit}</span>))}
    </div>
    <aside className={state(reveal,2)}><b>PARITY BYTE / COLUMNS</b><span>vertical parity → failing bit position</span></aside>
    <footer className={state(reveal,3)}><b>INTERSECTION</b><span>one failing row + one failing column locates a single changed bit.</span></footer>
  </div>;
}

function Arq({reveal}:{reveal:number}){
  return <div className="h6sec h6sec-arq" aria-label="Automatic repeat request acknowledgement and timeout cycle">
    <section className={state(reveal,1)}><b>SENDER</b><span>send packet</span></section>
    <div className={`h6sec-arq-channel ${state(reveal,1)}`}><strong>PACKET →</strong><span>← POSITIVE ACKNOWLEDGEMENT</span></div>
    <section className={state(reveal,2)}><b>RECEIVER</b><span>check packet for error</span></section>
    <footer className={state(reveal,3)}><span>ERROR → request retransmission</span><span>NO ACK BEFORE TIMEOUT → retransmit</span></footer>
  </div>;
}

export function Chapter6SecurityVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.slideId){
    case 'h6-612-accounts-passwords': return <AccountsAccess reveal={reveal}/>;
    case 'h6-612-signatures-firewall': return <Firewall reveal={reveal}/>;
    case 'h6-612-antimalware-encryption-biometrics': return <LayeredProtection reveal={reveal}/>;
    case 'h6-613-pharming': return <Pharming reveal={reveal}/>;
    case 'h6-614-recovery': return <Recovery reveal={reveal}/>;
    case 'h6-621-validation': return <Validation reveal={reveal}/>;
    case 'h6-622-modulo11-checksum': return <ModuloChecksum reveal={reveal}/>;
    case 'h6-622-parity-block': return <ParityBlock reveal={reveal}/>;
    case 'h6-622-arq': return <Arq reveal={reveal}/>;
    default: return null;
  }
}
