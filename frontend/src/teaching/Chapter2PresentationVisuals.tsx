import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter2-presentation-visuals.css';

const VISUAL_IDS=[
  'h2-overview','h2-21-infra','h2-21-benefits','h2-21-drawbacks','h2-212-client-server','h2-212-p2p','h2-212-comparison','h2-213-topologies','h2-214-sizes',
] as const;
export const CHAPTER_2_SOURCE_VISUAL_SLIDES=[...VISUAL_IDS];
export function hasChapter2PresentationVisual(beat:LessonPresentationBeat){return CHAPTER_2_SOURCE_VISUAL_SLIDES.includes(beat.slideId as never);}

function NetworkScale(){return <div className="h2pv-scale"><section><strong>PAN</strong><span>1–10 m</span></section><i>→</i><section><strong>LAN</strong><span>10 m–1000 m</span></section><i>→</i><section><strong>MAN</strong><span>1–100 km</span></section><i>→</i><section><strong>WAN</strong><span>100 km–1000+ km</span></section></div>}
function ClientServer(){return <div className="h2pv-client"><div className="clients"><span>CLIENT A</span><span>CLIENT B</span><span>CLIENT C</span></div><div className="links"><i/><i/><i/></div><section><small>DEDICATED</small><strong>SERVER</strong><p>central files · access control · security database · backup</p></section><footer>request → process → response</footer></div>}
function Peer(){return <div className="h2pv-peer">{['PEER A','PEER B','PEER C','PEER D','PEER E'].map((x,i)=><section key={x} data-i={i}><strong>{x}</strong><small>supplier + consumer</small></section>)}<svg viewBox="0 0 600 250" aria-hidden="true"><path d="M120 60L300 35L480 60L455 195L300 220L145 195Z M120 60L455 195 M480 60L145 195 M300 35L300 220"/></svg><footer>no central server · Hodder: normally no more than 10 nodes</footer></div>}
function Topologies(){return <div className="h2pv-topologies"><section><b>BUS</b><div className="bus"><i/><i/><i/><i/><span/></div><small>one central cable · terminators · one transmitter at a time</small></section><section><b>STAR</b><div className="star"><strong>SWITCH</strong>{[1,2,3,4].map(n=><i key={n}/>)}</div><small>dedicated links · central hub/switch</small></section><section><b>MESH</b><div className="mesh">{[1,2,3,4,5].map(n=><i key={n}/>)}</div><small>routing = shortest route · flooding = all routes</small></section><section><b>HYBRID</b><div className="hybrid"><span>BUS</span><span>STAR</span><span>MESH</span></div><small>combination of topologies</small></section></div>}
function Infrastructure(){return <div className="h2pv-infra"><section><small>HARDWARE</small><strong>LAN cards · routers · switches</strong><span>wireless routers · cabling</span></section><section><small>SOFTWARE</small><strong>network management</strong><span>firewall · security utilities</span></section><section><small>SERVICES</small><strong>DSL · satellite · wireless</strong><span>IP addressing</span></section></div>}
function Pros({negative=false}:{negative?:boolean}){const items=negative?['initial cabling/server cost','complex management','server failure can affect whole network','malware/hacking can spread']:['share printers/devices','cheaper network licences','share files + central reliable data','central backup','email + instant messaging','manager applies access rights'];return <div className={`h2pv-pros ${negative?'negative':''}`}>{items.map((x,i)=><section key={x}><span>{String(i+1).padStart(2,'0')}</span><strong>{x}</strong></section>)}</div>}
function Overview(){return <div className="h2pv-overview"><div className="core"><strong>COMMUNICATION</strong><small>CHAPTER 2</small></div>{['NETWORKS','MODELS','TOPOLOGIES','CLOUD','WIRED / WIRELESS','ETHERNET','STREAMING','INTERNET','IP · URL · DNS'].map((x,i)=><span key={x} data-i={i}>{x}</span>)}</div>}

export function Chapter2PresentationVisual({beat}:{beat:LessonPresentationBeat;reveal:number}){
  if(beat.slideId==='h2-overview')return <Overview/>;
  if(beat.slideId==='h2-21-infra')return <Infrastructure/>;
  if(beat.slideId==='h2-21-benefits')return <Pros/>;
  if(beat.slideId==='h2-21-drawbacks')return <Pros negative/>;
  if(beat.slideId==='h2-212-client-server')return <ClientServer/>;
  if(beat.slideId==='h2-212-p2p')return <Peer/>;
  if(beat.slideId==='h2-212-comparison')return <div className="h2pv-compare"><ClientServer/><Peer/></div>;
  if(beat.slideId==='h2-213-topologies')return <Topologies/>;
  return <NetworkScale/>;
}
