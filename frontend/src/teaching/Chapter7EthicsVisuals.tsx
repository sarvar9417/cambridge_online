import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter7-ethics-visuals.css';

export const CHAPTER_7_ETHICS_VISUAL_IDS = [
  'h7-71-foundations',
  'h7-712-bcs-ieee',
  'h7-712-software-code',
  'h7-712-mikhail',
  'h7-713-public-impact',
  'h7-721-software-copyright',
  'h7-722-drm',
  'h7-723-commercial-free-open',
  'h7-723-freeware-shareware',
  'h7-731-ai-definition',
  'h7-733-jobs-economy',
  'h7-733-environment',
  'h7-733-transport-justice',
  'h7-733-advertising-data',
] as const;

export function hasChapter7EthicsVisual(beat:LessonPresentationBeat){
  return CHAPTER_7_ETHICS_VISUAL_IDS.includes(beat.slideId as never);
}

const state=(reveal:number,step:number)=>reveal>=step?'is-active':'is-upcoming';

function FourLenses({reveal}:{reveal:number}){
  const lenses=[
    ['LEGAL','permitted or prohibited by law'],
    ['MORAL','personal / social right and wrong'],
    ['ETHICAL','professional principles and codes'],
    ['CULTURAL','shared attitudes, values and practices'],
  ] as const;
  return <div className="h7eth h7eth-lenses" aria-label="Legal moral ethical and cultural analysis lenses">
    <div className={`h7eth-core ${state(reveal,1)}`}><b>COMPUTING ACTION</b><span>analyse the same scenario through four distinct lenses</span></div>
    <div className="h7eth-lens-grid">{lenses.map(([name,note],index)=><section className={state(reveal,index<2?2:3)} key={name}><b>{name}</b><span>{note}</span></section>)}</div>
    <footer className={state(reveal,3)}>Immoral is not automatically illegal; unethical professional behaviour means breaking accepted professional standards.</footer>
  </div>;
}

function ProfessionalBodies({reveal}:{reveal:number}){
  return <div className="h7eth h7eth-bodies" aria-label="BCS IEEE and ACM professional ethics bodies">
    <section className={state(reveal,1)}><b>BCS</b><strong>CODE OF CONDUCT</strong><span>Public Interest</span><span>Professional Competence & Integrity</span><span>Duty to Relevant Authority</span><span>Duty to the Profession</span></section>
    <section className={state(reveal,2)}><b>IEEE</b><strong>CODE OF ETHICS</strong><span>public safety and welfare</span><span>honest claims and criticism</span><span>avoid conflicts and bribery</span><span>maintain competence</span></section>
    <section className={state(reveal,3)}><b>IEEE + ACM</b><strong>SOFTWARE ENGINEERING</strong><span>professional responsibilities applied to software projects</span></section>
  </div>;
}

function EightPrinciples({reveal}:{reveal:number}){
  const principles=['PUBLIC','CLIENT + EMPLOYER','PRODUCT','JUDGEMENT','MANAGEMENT','PROFESSION','COLLEAGUES','SELF'];
  return <div className="h7eth h7eth-principles" aria-label="Eight software engineering ethical principles">
    <div className={`h7eth-principle-core ${state(reveal,1)}`}><b>SOFTWARE ENGINEER</b><span>professional responsibility</span></div>
    <div className="h7eth-principle-grid">{principles.map((principle,index)=><span className={state(reveal,index<3?1:index<6?2:3)} key={principle}>{principle}</span>)}</div>
    <footer className={state(reveal,3)}>Use the principles to justify a decision; do not only name a code heading.</footer>
  </div>;
}

function MikhailCase({reveal}:{reveal:number}){
  const issues=[
    ['CODE REUSE','property + authorisation'],
    ['OUTSOURCING','supervision + competence'],
    ['CONFIDENTIAL ACCESS','employer passwords and files'],
    ['PERSONAL GAIN','profession / client / employer interest'],
    ['CREDIT','acknowledge work of others'],
    ['FAIR TREATMENT','avoid irrelevant prejudice'],
  ] as const;
  return <div className="h7eth h7eth-case" aria-label="Mikhail professional ethics case study map">
    <header className={state(reveal,1)}><b>MIKHAIL CASE</b><span>one project can breach several professional duties at once</span></header>
    <div>{issues.map(([issue,note],index)=><section className={state(reveal,index<2?1:index<4?2:3)} key={issue}><b>{issue}</b><span>{note}</span></section>)}</div>
    <footer className={state(reveal,3)}>Trace each action to the professional duty it affects and explain the breach.</footer>
  </div>;
}

function PublicImpact({reveal}:{reveal:number}){
  return <div className="h7eth h7eth-public" aria-label="Public impact case studies visual">
    <div className={`h7eth-public-core ${state(reveal,1)}`}><b>PUBLIC WELL-BEING</b><span>safety · public interest · benefits · concerns</span></div>
    <section className={state(reveal,2)}><b>AIRPORT NETWORK FAILURE</b><span>technical fault → operational disruption</span></section>
    <section className={state(reveal,2)}><b>BATTERY DEFECT</b><span>hardware defect → safety + recall consequences</span></section>
    <section className={state(reveal,3)}><b>SOFTWARE INCOMPATIBILITY</b><span>version mismatch → manufacturing error risk</span></section>
    <footer className={state(reveal,3)}>A technical design decision can become a social, safety and economic issue for the public.</footer>
  </div>;
}

function CopyrightControls({reveal}:{reveal:number}){
  const controls=['PRODUCT KEY','LICENCE AGREEMENT','GENUINE LABEL / HOLOGRAM','ORIGINAL MEDIA','DONGLE','LEGAL ENFORCEMENT'];
  return <div className="h7eth h7eth-copyright" aria-label="Software copyright and anti-piracy controls">
    <div className={`h7eth-lock ${state(reveal,1)}`}><b>COPYRIGHTED SOFTWARE</b><span>licensed use ≠ unlimited ownership</span></div>
    <div className="h7eth-control-grid">{controls.map((control,index)=><span className={state(reveal,index<2?1:index<4?2:3)} key={control}>{control}</span>)}</div>
    <footer className={state(reveal,3)}>Controls restrict unauthorised copying, redistribution or use outside the licence terms.</footer>
  </div>;
}

function Drm({reveal}:{reveal:number}){
  return <div className="h7eth h7eth-drm" aria-label="Digital rights management permission path">
    <section className={state(reveal,1)}><b>DIGITAL PRODUCT</b><span>software · music · video · ebook</span></section><i>→</i>
    <section className={`h7eth-drm-gate ${state(reveal,2)}`}><b>DRM</b><span>key · account · device · online authorisation</span></section><i>→</i>
    <div className="h7eth-drm-results"><span className={state(reveal,3)}>ALLOW LICENSED ACTION</span><span className={state(reveal,3)}>BLOCK UNAUTHORISED COPY / TRANSFER</span></div>
    <footer className={state(reveal,3)}>Permission to access or run a product does not automatically grant permission to copy or redistribute it.</footer>
  </div>;
}

function LicenceModels({reveal}:{reveal:number}){
  const models=[
    ['COMMERCIAL','paid licence · use under stated conditions'],
    ['FREE SOFTWARE','freedoms to run, study, modify and redistribute under its licence'],
    ['OPEN SOURCE','source available for collaborative development under licence terms'],
  ] as const;
  return <div className="h7eth h7eth-licences" aria-label="Commercial free and open source software licence models">
    {models.map(([name,note],index)=><section className={state(reveal,index+1)} key={name}><b>{name}</b><span>{note}</span></section>)}
    <footer className={state(reveal,3)}>Compare what the licence permits: use, source-code access, modification and redistribution.</footer>
  </div>;
}

function FreewareShareware({reveal}:{reveal:number}){
  return <div className="h7eth h7eth-freeware" aria-label="Freeware and shareware comparison">
    <section className={state(reveal,1)}><b>FREEWARE</b><strong>NO CHARGE</strong><span>still copyrighted</span><span>licence can restrict modification or redistribution</span></section>
    <section className={state(reveal,2)}><b>SHAREWARE</b><strong>TRY FIRST</strong><span>trial / limited use initially</span><span>payment for continued or full use</span></section>
    <footer className={state(reveal,3)}>Price alone does not tell you what legal rights the software licence grants.</footer>
  </div>;
}

function AiDefinition({reveal}:{reveal:number}){
  const uses=['EXPERT SYSTEMS','ROBOTICS','VISION / RECOGNITION','AUTONOMOUS SYSTEMS','DATA ANALYSIS'];
  return <div className="h7eth h7eth-ai" aria-label="Artificial intelligence concept and application map">
    <div className={`h7eth-ai-core ${state(reveal,1)}`}><b>ARTIFICIAL INTELLIGENCE</b><span>machines carrying out tasks associated with intelligent behaviour</span></div>
    <div>{uses.map((use,index)=><span className={state(reveal,index<2?1:index<4?2:3)} key={use}>{use}</span>)}</div>
    <footer className={state(reveal,3)}>Chapter 7 focuses on impact: who benefits, who is displaced, what risks appear and what safeguards are needed?</footer>
  </div>;
}

function JobsEconomy({reveal}:{reveal:number}){
  return <div className="h7eth h7eth-jobs" aria-label="Artificial intelligence employment and economy impact balance">
    <section className={state(reveal,1)}><b>AUTOMATION</b><span>some existing roles can be reduced or changed</span></section>
    <section className={state(reveal,2)}><b>RETRAINING</b><span>workers may need new skills as tasks change</span></section>
    <section className={state(reveal,2)}><b>NEW ROLES</b><span>new technical and support work can appear</span></section>
    <section className={state(reveal,3)}><b>ECONOMY + LEISURE</b><span>productivity gains and changing work patterns affect society</span></section>
    <footer className={state(reveal,3)}>Evaluate both displacement and opportunity rather than treating AI employment effects as one-directional.</footer>
  </div>;
}

function Environment({reveal}:{reveal:number}){
  return <div className="h7eth h7eth-environment" aria-label="Artificial intelligence environmental monitoring and forecasting visual">
    <section className={state(reveal,1)}><b>WEATHER + ENERGY DATA</b><span>solar · tide · thermal · wind</span></section><i>→</i>
    <section className={state(reveal,2)}><b>AI ANALYSIS</b><span>large inter-related data sets</span></section><i>→</i>
    <section className={state(reveal,3)}><b>FORECAST / ACTION</b><span>resource planning · environmental response</span></section>
    <aside className={state(reveal,2)}><b>ECOSYSTEM MONITORING</b><span>model environmental change and respond before effects become irreversible</span></aside>
  </div>;
}

function TransportJustice({reveal}:{reveal:number}){
  return <div className="h7eth h7eth-justice" aria-label="Artificial intelligence transport and criminal justice questions">
    <section className={state(reveal,1)}><b>TRANSPORT</b><span>autonomous vehicles · efficiency · driver employment</span></section>
    <section className={state(reveal,2)}><b>CRIMINAL JUSTICE</b><span>facial recognition · legal automation · parole / sentencing trials</span></section>
    <div className={state(reveal,3)}><b>QUESTIONS TO TEST</b><span>warrant / privacy?</span><span>how is a decision challenged?</span><span>how is bias detected and controlled?</span></div>
  </div>;
}

function AdvertisingData({reveal}:{reveal:number}){
  return <div className="h7eth h7eth-data" aria-label="AI data collection personality profiling and targeted advertising flow">
    <div className="h7eth-data-inputs"><span className={state(reveal,1)}>SEARCH ENGINES</span><span className={state(reveal,1)}>SOCIAL MEDIA</span><span className={state(reveal,1)}>WEBSITE VISITS</span></div>
    <i>→</i><section className={state(reveal,2)}><b>MACHINE-LEARNING ANALYSIS</b><span>combine behaviour data</span></section>
    <i>→</i><section className={state(reveal,3)}><b>PERSONALITY / INTEREST PROFILE</b><span>tailor advertising to a specific user</span></section>
    <footer className={state(reveal,3)}>The same data-rich capability raises questions about monitoring, consent and privacy.</footer>
  </div>;
}

export function Chapter7EthicsVisual({beat,reveal}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.slideId){
    case 'h7-71-foundations': return <FourLenses reveal={reveal}/>;
    case 'h7-712-bcs-ieee': return <ProfessionalBodies reveal={reveal}/>;
    case 'h7-712-software-code': return <EightPrinciples reveal={reveal}/>;
    case 'h7-712-mikhail': return <MikhailCase reveal={reveal}/>;
    case 'h7-713-public-impact': return <PublicImpact reveal={reveal}/>;
    case 'h7-721-software-copyright': return <CopyrightControls reveal={reveal}/>;
    case 'h7-722-drm': return <Drm reveal={reveal}/>;
    case 'h7-723-commercial-free-open': return <LicenceModels reveal={reveal}/>;
    case 'h7-723-freeware-shareware': return <FreewareShareware reveal={reveal}/>;
    case 'h7-731-ai-definition': return <AiDefinition reveal={reveal}/>;
    case 'h7-733-jobs-economy': return <JobsEconomy reveal={reveal}/>;
    case 'h7-733-environment': return <Environment reveal={reveal}/>;
    case 'h7-733-transport-justice': return <TransportJustice reveal={reveal}/>;
    case 'h7-733-advertising-data': return <AdvertisingData reveal={reveal}/>;
    default: return null;
  }
}
