import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter2-activity-visuals.css';

export const CHAPTER_2_ACTIVITY_VISUAL_IDS = [
  'h2-activity-2a','h2-activity-2b','h2-activity-2c',
  'h2-extension-2a','h2-extension-2b','h2-extension-2c',
  'h2-extension-2d','h2-extension-2e','h2-extension-2f',
] as const;

export function hasChapter2ActivityVisual(beat:LessonPresentationBeat){
  return CHAPTER_2_ACTIVITY_VISUAL_IDS.includes(beat.slideId as never);
}

const Task=({n,title,detail}:{n:string;title:string;detail?:string})=><section className="h2av-task"><span>{n}</span><div><strong>{title}</strong>{detail?<small>{detail}</small>:null}</div></section>;
const SourceTag=({children}:{children:React.ReactNode})=><div className="h2av-source">HODDER SOURCE TASK · {children}</div>;

function Activity2A(){return <div className="h2av-shell"><SourceTag>ACTIVITY 2A</SourceTag><div className="h2av-scenarios"><section><b>20 EMPLOYEES</b><strong>New mobile-phone battery development</strong><p>Choose: client-server or peer-to-peer</p><small>Give reasons for the choice.</small></section><section><b>FINANCIAL CONSULTANTS</b><strong>Taxation and overseas-export advice</strong><p>Choose: client-server or peer-to-peer</p><small>Give reasons for the choice.</small></section></div></div>}

function Activity2B(){return <div className="h2av-shell"><SourceTag>ACTIVITY 2B</SourceTag><div className="h2av-taskgrid"><Task n="1" title="LAN · MAN · WAN" detail="Explain differences; give three networking benefits; explain thick and thin client."/><Task n="2" title="BUS · STAR · MESH" detail="Draw each topology; give one benefit and one drawback of each."/><Task n="3" title="PUBLIC · PRIVATE CLOUD" detail="Explain differences; give two benefits and two drawbacks of cloud computing."/><Task n="4" title="20-FLOOR BUILDING" detail="Argue wired vs wireless connectivity and draw a conclusion for the manager."/><Task n="5" title="BIT STREAMING" detail="Define it; explain buffering; compare on-demand and real-time streaming."/></div></div>}

function Activity2C(){return <div className="h2av-shell"><SourceTag>ACTIVITY 2C</SourceTag><div className="h2av-flow"><section><b>PSTN</b><span>telephone call</span></section><i>↔</i><section><b>VoIP</b><span>computer + microphone + speakers</span></section><i>↔</i><section><b>SATELLITES</b><span>GEO · MEO · LEO</span></section></div><div className="h2av-orbits" aria-label="Hodder Figure 2.22 satellite orbit heights"><span><b>GEO</b><strong>35 800 km</strong><small>geostationary orbit</small></span><span><b>MEO</b><strong>5000–12 000 km</strong><small>medium Earth orbit</small></span><span><b>LEO</b><strong>500–2500 km</strong><small>low Earth orbit</small></span></div><p className="h2av-prompt">Describe both call processes, then explain the differences between GEO, MEO and LEO satellite technology.</p></div>}

function Extension2A(){return <div className="h2av-shell"><SourceTag>EXTENSION ACTIVITY 2A</SourceTag><div className="h2av-versus"><section><strong>PEER-TO-PEER</strong><span>network model</span></section><b>≠</b><section><strong>MESH</strong><span>network topology</span></section></div><p className="h2av-prompt">They may look similar. Describe the differences between the two models.</p></div>}

function Extension2B(){return <div className="h2av-shell"><SourceTag>EXTENSION ACTIVITY 2B</SourceTag><div className="h2av-equation"><strong>f = c / λ</strong><span>c = 3 × 10⁸ m/s</span></div><div className="h2av-emscale" aria-label="Hodder electromagnetic radiation wavelength and frequency scale"><div className="h2av-emhead"><b>radiation</b><b>wavelength (m)</b><b>frequency (Hz)</b></div>{[['radio waves','10²','3 MHz'],['microwaves','10⁻¹','3 GHz'],['infrared','10⁻³','300 GHz'],['visible light','10⁻⁵','30 THz'],['ultra violet','10⁻⁷','3 PHz'],['X-rays','10⁻⁹','300 PHz'],['gamma rays','10⁻¹¹','30 EHz']].map(([name,wavelength,frequency])=><div className="h2av-emrow" key={name}><strong>{name}</strong><span>{wavelength}</span><span>{frequency}</span></div>)}</div><p className="h2av-prompt">Confirm the frequency values in the Hodder electromagnetic-radiation table using the wavelengths given.</p></div>}

function Extension2C(){return <div className="h2av-shell"><SourceTag>EXTENSION ACTIVITY 2C</SourceTag><div className="h2av-gateway"><section><b>LAN A</b><small>protocol A</small></section><i/><section><b>GATEWAY</b><small>protocol conversion</small></section><i/><section><b>LAN B</b><small>protocol B</small></section><section className="third"><b>LAN C</b><small>protocol C</small></section></div><p className="h2av-prompt">Draw how a gateway connects three LANs using different protocols. Include all hardware devices and cables needed.</p></div>}

function Extension2D(){return <div className="h2av-shell"><SourceTag>EXTENSION ACTIVITY 2D</SourceTag><div className="h2av-loop"><span>CSMA/CD</span><i>collision?</i><b>RETRY</b><i>random wait</i><span>↺</span></div><p className="h2av-prompt">Figure 2.20 can form an endless loop. Suggest a modification so the process terminates if the channel has a problem or transmission takes an unacceptable time.</p></div>}

function Extension2E(){return <div className="h2av-shell"><SourceTag>EXTENSION ACTIVITY 2E</SourceTag><div className="h2av-nat"><section><b>PRIVATE IPs</b><span>inside network</span></section><i>→</i><strong>NAT ?</strong><i>→</i><section><b>PUBLIC NETWORK</b><span>internet side</span></section></div><p className="h2av-prompt">Network address translation (NAT) removes the need for each IP address to be unique. Find out how it works.</p></div>}

function Extension2F(){return <div className="h2av-shell"><SourceTag>EXTENSION ACTIVITY 2F</SourceTag><div className="h2av-codecompare"><section><b>JavaScript</b><span>variables</span><span>output statement(s)</span><span>line 09</span><span>line 05</span></section><section><b>PHP</b><span>variables</span><span>output statement(s)</span><span>line 03</span></section></div><p className="h2av-prompt">Inspect the two source code listings and identify the requested variables, outputs and line purposes. Do not infer missing code.</p></div>}

export function Chapter2ActivityVisual({beat}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.slideId){
    case'h2-activity-2a':return <Activity2A/>;
    case'h2-activity-2b':return <Activity2B/>;
    case'h2-activity-2c':return <Activity2C/>;
    case'h2-extension-2a':return <Extension2A/>;
    case'h2-extension-2b':return <Extension2B/>;
    case'h2-extension-2c':return <Extension2C/>;
    case'h2-extension-2d':return <Extension2D/>;
    case'h2-extension-2e':return <Extension2E/>;
    case'h2-extension-2f':return <Extension2F/>;
    default:return null;
  }
}
