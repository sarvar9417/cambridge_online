import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter6-security-visuals.css';

export const CHAPTER_6_SECURITY_VISUAL_IDS = [
  'h6-611-privacy',
  'h6-612-accounts-passwords',
  'h6-612-signatures-firewall',
  'h6-612-antimalware-encryption-biometrics',
  'h6-613-biometric-hacking-malware',
  'h6-613-malware-phishing',
  'h6-613-pharming',
  'h6-614-recovery',
  'h6-62-integrity-overview',
  'h6-621-validation',
  'h6-622-entry-verification',
  'h6-622-modulo11-checksum',
  'h6-622-parity',
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


function Privacy({reveal}:{reveal:number}){
  const principles=[
    ['LAWFUL + PURPOSE','process lawfully for a stated purpose'],
    ['RELEVANT + ACCURATE','collect only needed data and keep it correct'],
    ['TIME-LIMITED','do not keep longer than necessary'],
    ['DATA SUBJECT RIGHTS','handle data according to subject rights'],
    ['SECURE','protect against unauthorised access'],
    ['TRANSFER PROTECTION','do not transfer where adequate protection is absent'],
  ] as const;
  return <div className="h6sec h6sec-privacy" aria-label="Data privacy and protection principles visual">
    <div className={'h6sec-privacy-core '+state(reveal,1)}><b>DATA PRIVACY</b><span>keep sensitive data from unauthorised parties</span></div>
    <div className="h6sec-privacy-grid">{principles.map(([title,note],index)=><section className={state(reveal,index<2?1:index<4?2:3)} key={title}><b>{title}</b><span>{note}</span></section>)}</div>
    <footer className={state(reveal,3)}>legislation can deter misuse, but law alone cannot guarantee privacy</footer>
  </div>;
}

function BiometricHackingMalware({reveal}:{reveal:number}){
  return <div className="h6sec h6sec-biometric-threats" aria-label="Biometrics ethical hacking malicious hacking and virus visual">
    <section className={state(reveal,1)}><b>FINGERPRINT</b><span>ridge + valley pattern</span></section>
    <section className={state(reveal,1)}><b>RETINA</b><span>blood-vessel pattern</span></section>
    <div className={'h6sec-threat-split '+state(reveal,2)}><span><b>ETHICAL HACKING</b> authorised testing to find weaknesses</span><span><b>MALICIOUS HACKING</b> unauthorised access to steal, alter, corrupt or delete data</span></div>
    <footer className={state(reveal,3)}><b>VIRUS</b><span>malicious code that can replicate/copy itself and damage files, programs or system operation</span></footer>
  </div>;
}

function MalwarePhishing({reveal}:{reveal:number}){
  const threats=[['WORM','stand-alone · replicates · spreads'],['LOGIC BOMB','activates when trigger condition is met'],['TROJAN','malware disguised as legitimate software'],['BOT','automated software; can be abused for attacks'],['SPYWARE','secretly gathers information / key logging'],['PHISHING','deceptive message or link requires victim action']] as const;
  return <div className="h6sec h6sec-malware" aria-label="Malware family and phishing comparison visual">
    <div className="h6sec-malware-grid">{threats.map(([name,note],index)=><section className={state(reveal,index<2?1:index<4?2:3)} key={name}><b>{name}</b><span>{note}</span></section>)}</div>
    <footer className={state(reveal,3)}>awareness training · avoid untrusted links/attachments · update browser/security tools · monitor accounts · use firewall</footer>
  </div>;
}

function IntegrityOverview({reveal}:{reveal:number}){
  return <div className="h6sec h6sec-integrity" aria-label="Data integrity validation verification checksum and parity map">
    <div className={'h6sec-integrity-core '+state(reveal,1)}><b>DATA INTEGRITY</b><span>accuracy · completeness · consistency</span></div>
    <div className="h6sec-integrity-paths">
      <section className={state(reveal,1)}><b>VALIDATION</b><span>reasonable + meets input criteria</span></section>
      <section className={state(reveal,2)}><b>VERIFICATION</b><span>entered / transferred correctly</span></section>
      <section className={state(reveal,2)}><b>CHECK DIGIT</b><span>extra digit for input-error detection</span></section>
      <section className={state(reveal,3)}><b>CHECKSUM</b><span>recalculate after transmission</span></section>
      <section className={state(reveal,3)}><b>PARITY</b><span>agreed even/odd number of 1-bits</span></section>
    </div>
  </div>;
}

function EntryVerification({reveal}:{reveal:number}){
  return <div className="h6sec h6sec-entry-verification" aria-label="Double entry visual check and check digit verification visual">
    <section className={state(reveal,1)}><b>DOUBLE ENTRY</b><span>enter twice independently</span><i>COMPARE</i></section>
    <section className={state(reveal,2)}><b>VISUAL CHECK</b><span>screen value ↔ original source</span><i>COMPARE</i></section>
    <section className={state(reveal,3)}><b>CHECK DIGIT</b><span>barcode · ISBN · VIN</span><i>CALCULATE + COMPARE</i></section>
    <footer className={state(reveal,3)}>can detect incorrect digits, transpositions, omitted/added digits and some phonetic-number errors</footer>
  </div>;
}

function Parity({reveal}:{reveal:number}){
  const even=['1','0','1','0','1','0','1','0'];
  const odd=['1','0','1','0','1','0','1','1'];
  return <div className="h6sec h6sec-parity-basic" aria-label="Even and odd parity byte visual">
    <section className={state(reveal,1)}><header>EVEN PARITY</header><div>{even.map((bit,index)=><span key={index}>{bit}</span>)}</div><small>even number of 1-bits</small></section>
    <section className={state(reveal,2)}><header>ODD PARITY</header><div>{odd.map((bit,index)=><span key={index}>{bit}</span>)}</div><small>odd number of 1-bits</small></section>
    <footer className={state(reveal,3)}><b>RECEIVER RECALCULATES</b><span>parity mismatch → transmission error detected; simple parity does not identify the changed bit</span></footer>
  </div>;
}

export function Chapter6SecurityVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.slideId){
    case 'h6-611-privacy': return <Privacy reveal={reveal}/>;
    case 'h6-612-accounts-passwords': return <AccountsAccess reveal={reveal}/>;
    case 'h6-612-signatures-firewall': return <Firewall reveal={reveal}/>;
    case 'h6-612-antimalware-encryption-biometrics': return <LayeredProtection reveal={reveal}/>;
    case 'h6-613-biometric-hacking-malware': return <BiometricHackingMalware reveal={reveal}/>;
    case 'h6-613-malware-phishing': return <MalwarePhishing reveal={reveal}/>;
    case 'h6-613-pharming': return <Pharming reveal={reveal}/>;
    case 'h6-614-recovery': return <Recovery reveal={reveal}/>;
    case 'h6-62-integrity-overview': return <IntegrityOverview reveal={reveal}/>;
    case 'h6-621-validation': return <Validation reveal={reveal}/>;
    case 'h6-622-entry-verification': return <EntryVerification reveal={reveal}/>;
    case 'h6-622-modulo11-checksum': return <ModuloChecksum reveal={reveal}/>;
    case 'h6-622-parity': return <Parity reveal={reveal}/>;
    case 'h6-622-parity-block': return <ParityBlock reveal={reveal}/>;
    case 'h6-622-arq': return <Arq reveal={reveal}/>;
    default: return null;
  }
}
