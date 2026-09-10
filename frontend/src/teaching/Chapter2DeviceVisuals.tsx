import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter2-device-visuals.css';

export const CHAPTER_2_DEVICE_VISUAL_SLIDES=[
  'h2-216-softmodem',
  'h2-217-repeaters',
  'h2-217-hubs',
  'h2-217-switches',
  'h2-217-bridges',
  'h2-217-routers',
  'h2-217-gateways',
  'h2-217-routers-gateways',
  'h2-217-modems',
  'h2-217-nic-wnic',
] as const;

export function hasChapter2DeviceVisual(beat:LessonPresentationBeat){
  return CHAPTER_2_DEVICE_VISUAL_SLIDES.includes(beat.slideId as never);
}

function DeviceArt({kind,label}:{kind:string;label:string}){
  const wireless=kind==='router'||kind==='modem';
  return <svg className={`h2dv-art h2dv-art--${kind}`} viewBox="0 0 180 104" role="img" aria-label={`${label} device illustration`}>
    {wireless?<><path className="antenna" d="M35 34 25 7M145 34l10-27"/><circle className="signal-ring ring-a" cx="90" cy="16" r="10"/><circle className="signal-ring ring-b" cx="90" cy="16" r="22"/></>:null}
    {kind==='device'?<><rect className="screen" x="43" y="17" width="94" height="58" rx="7"/><path d="M75 88h30M90 75v13"/></>:<><rect className="chassis" x="24" y="34" width="132" height="49" rx="10"/><path className="chassis-top" d="M35 34 52 23h78l15 11"/>{[0,1,2,3,4].map(index=><rect className="port" key={index} x={42+index*21} y="58" width="13" height="9" rx="2"/>)}<circle className="status" cx="139" cy="48" r="3"/></>}
    {kind==='nic'?<><path className="board" d="M34 22h105v55H34z"/><path d="M49 77v12h11V77m12 0v12h11V77m12 0v12h11V77"/></>:null}
  </svg>;
}
const Node=({children,kind='device'}:{children:React.ReactNode;kind?:string})=><span className={`h2dv-node h2dv-node--${kind}`}><DeviceArt kind={kind} label={String(children)}/>{children}</span>;
const Arrow=({label}:{label?:string})=><span className="h2dv-arrow"><i>→</i><b className="h2dv-moving-packet">DATA</b>{label?<small>{label}</small>:null}</span>;

function Softmodem(){return <div className="h2dv-softmodem">
  <section><DeviceArt kind="device" label="host computer"/><small>HOST COMPUTER</small><strong>CPU + RAM</strong><p>software performs modem processing</p></section>
  <Arrow label="minimal hardware"/>
  <section className="accent"><small>SOFTMODEM</small><strong>software modem</strong><p>uses host resources instead of dedicated modem hardware</p></section>
  <footer>minimal hardware · host processor and RAM replace conventional modem hardware</footer>
</div>}

function Repeater(){return <div className="h2dv-repeater">
  <div className="signal signal--weak"><b>attenuated signal</b><i/><i/><i/><i/></div>
  <section><small>NON-LOGICAL DEVICE</small><strong>REPEATER</strong><p>boosts every detected signal</p></section>
  <div className="signal signal--strong"><b>regenerated / boosted signal</b><i/><i/><i/><i/></div>
  <footer><span>copper: analogue</span><span>fibre: digital</span><span>wireless: fills Wi-Fi dead spots</span></footer>
</div>}

function Hub(){return <div className="h2dv-hub">
  <Node>sender</Node><Arrow/><Node kind="hub">HUB</Node>
  <div className="h2dv-fanout">{['port A','port B','port C','port D'].map(x=><Node key={x}>{x}</Node>)}</div>
  <footer>one incoming transmission → broadcast to every connected port</footer>
</div>}

function Switch(){return <div className="h2dv-switch">
  <section className="h2dv-mac-table"><strong>MAC ADDRESS TABLE</strong><div><span>port 1</span><code>AA:…</code></div><div><span>port 2</span><code>BB:…</code></div><div><span>port 3</span><code>CC:…</code></div></section>
  <div className="h2dv-switch-flow"><Node>frame</Node><Arrow label="read destination MAC"/><Node kind="switch">SWITCH</Node><Arrow label="matching port only"/><Node>recipient</Node></div>
  <footer>the packet carries source and recipient MAC addresses · the intended destination receives the data</footer>
</div>}

function Bridge(){return <div className="h2dv-bridge">
  <section><small>LAN / SEGMENT A</small><div><Node>computer</Node><Node>server</Node><Node kind="switch">switch</Node></div></section>
  <Arrow/>
  <Node kind="bridge">BRIDGE</Node>
  <Arrow/>
  <section><small>LAN / SEGMENT B</small><div><Node>computer</Node><Node>computer</Node><Node kind="switch">switch</Node></div></section>
  <footer>connects LANs or LAN parts that use the same protocol; avoids sending every packet everywhere</footer>
</div>}

function Router(){return <div className="h2dv-router">
  <section className="lan"><small>LAN</small><Node>computer</Node><Node>server</Node><Node kind="switch">SWITCH</Node></section>
  <Arrow label="IP part identifies network"/>
  <Node kind="router">ROUTER</Node>
  <Arrow label="route to another network"/>
  <section className="wan"><small>LAN or WAN / internet</small><Node>next network</Node></section>
  <footer>router inspects the packet, forwards toward the appropriate network, then local delivery can use the destination MAC address</footer>
</div>}

function Gateway(){return <div className="h2dv-gateway">
  <section><small>LAN A</small><strong>PROTOCOL A</strong><Node>devices</Node></section>
  <Arrow/>
  <section className="gate"><DeviceArt kind="gateway" label="gateway"/><small>NETWORK ENTRANCE / EXIT</small><strong>GATEWAY</strong><p>converts data packets from one protocol to another</p></section>
  <Arrow/>
  <section><small>LAN B</small><strong>PROTOCOL B</strong><Node>devices</Node></section>
  <footer>used when communication crosses a network boundary; can also act as router, firewall or server</footer>
</div>}

function RouterGatewayCompare(){return <div className="h2dv-compare">
  <section><DeviceArt kind="router" label="router"/><small>ROUTER</small><strong>forward between networks</strong><p>reads incoming packets and chooses where to forward them</p><p>joins networks such as LAN → WAN</p></section>
  <div className="versus">VS</div>
  <section><DeviceArt kind="gateway" label="gateway"/><small>GATEWAY</small><strong>translate between protocols</strong><p>acts as an entrance/exit point</p><p>connects dissimilar LANs and converts packet protocols</p></section>
</div>}

function Modem(){return <div className="h2dv-modem">
  <Node>computer<br/><small>DIGITAL</small></Node><Arrow label="modulate"/><Node kind="modem">MODEM</Node><Arrow label="public channel"/>
  <div className="h2dv-wave"><i/><i/><i/><i/><i/></div>
  <Arrow label="demodulate"/><Node>computer<br/><small>DIGITAL</small></Node>
  <footer>modulator-demodulator: digital → analogue for transmission; received analogue → digital for the computer</footer>
</div>}

function Nic(){return <div className="h2dv-nic">
  <section><DeviceArt kind="nic" label="network interface card"/><small>NETWORK INTERFACE CARD</small><strong>NIC</strong><p>connects a device to a network/internet</p><code>MAC address generated at manufacture</code></section>
  <section className="wireless"><DeviceArt kind="router" label="wireless network interface card"/><small>WIRELESS NIC / CONTROLLER</small><strong>WNIC</strong><p>antenna communicates via microwaves</p><code>USB plug-in or internal integrated circuit</code></section>
  <footer>both provide the device's network interface; WNIC adds wireless radio communication</footer>
</div>}

export function Chapter2DeviceVisual({beat}:{beat:LessonPresentationBeat;reveal:number}){
  switch(beat.slideId){
    case 'h2-216-softmodem': return <Softmodem/>;
    case 'h2-217-repeaters': return <Repeater/>;
    case 'h2-217-hubs': return <Hub/>;
    case 'h2-217-switches': return <Switch/>;
    case 'h2-217-bridges': return <Bridge/>;
    case 'h2-217-routers': return <Router/>;
    case 'h2-217-gateways': return <Gateway/>;
    case 'h2-217-routers-gateways': return <RouterGatewayCompare/>;
    case 'h2-217-modems': return <Modem/>;
    case 'h2-217-nic-wnic': return <Nic/>;
    default: return null;
  }
}
