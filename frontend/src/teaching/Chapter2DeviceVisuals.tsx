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

const Node=({children,kind='device'}:{children:React.ReactNode;kind?:string})=><span className={`h2dv-node h2dv-node--${kind}`}>{children}</span>;
const Arrow=({label}:{label?:string})=><span className="h2dv-arrow"><i>→</i>{label?<small>{label}</small>:null}</span>;

function Softmodem(){return <div className="h2dv-softmodem">
  <section><small>HOST COMPUTER</small><strong>CPU + RAM</strong><p>software performs modem processing</p></section>
  <Arrow label="minimal hardware"/>
  <section className="accent"><small>SOFTMODEM</small><strong>software modem</strong><p>uses host resources instead of dedicated modem hardware</p></section>
  <footer>lower hardware cost ↔ greater use of the computer's own processing resources</footer>
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
  <footer>known destination → one port · unknown destination → flood to other ports</footer>
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
  <section className="gate"><small>NETWORK ENTRANCE / EXIT</small><strong>GATEWAY</strong><p>converts data packets from one protocol to another</p></section>
  <Arrow/>
  <section><small>LAN B</small><strong>PROTOCOL B</strong><Node>devices</Node></section>
  <footer>used when communication crosses a network boundary; can also act as router, firewall or server</footer>
</div>}

function RouterGatewayCompare(){return <div className="h2dv-compare">
  <section><small>ROUTER</small><strong>forward between networks</strong><p>reads incoming packets and chooses where to forward them</p><p>joins networks such as LAN → WAN</p></section>
  <div className="versus">VS</div>
  <section><small>GATEWAY</small><strong>translate between protocols</strong><p>acts as an entrance/exit point</p><p>connects dissimilar LANs and converts packet protocols</p></section>
</div>}

function Modem(){return <div className="h2dv-modem">
  <Node>computer<br/><small>DIGITAL</small></Node><Arrow label="modulate"/><Node kind="modem">MODEM</Node><Arrow label="public channel"/>
  <div className="h2dv-wave"><i/><i/><i/><i/><i/></div>
  <Arrow label="demodulate"/><Node>computer<br/><small>DIGITAL</small></Node>
  <footer>modulator-demodulator: digital → analogue for transmission; received analogue → digital for the computer</footer>
</div>}

function Nic(){return <div className="h2dv-nic">
  <section><small>NETWORK INTERFACE CARD</small><strong>NIC</strong><p>connects a device to a network/internet</p><code>MAC address generated at manufacture</code></section>
  <section className="wireless"><small>WIRELESS NIC / CONTROLLER</small><strong>WNIC</strong><p>antenna communicates via microwaves</p><code>USB plug-in or internal integrated circuit</code></section>
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
