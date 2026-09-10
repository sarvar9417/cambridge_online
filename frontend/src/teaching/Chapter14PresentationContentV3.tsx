import type { LessonPresentationBeat } from './lesson-experience-model';
import { Chapter14PresentationContentV2 } from './Chapter14PresentationContentV2';

type Props={beat:LessonPresentationBeat;reveal:number};
type Detail=[string,string];

function SourceStrip({page,title,items}:{page:string;title:string;items:Detail[]}){
  return <aside className="h14f-source-strip" aria-label={`${title} source detail`}>
    <header><span>{page}</span><strong>{title}</strong></header>
    <div>{items.map(([label,text])=><section key={label}><b>{label}</b><p>{text}</p></section>)}</div>
  </aside>;
}

function PriorKnowledge141(){
  const checks=[
    ['01 · IP + TCP','Explain IP and TCP, then explain what protocols are and why they are used.'],
    ['02 · PEER-TO-PEER','Explain how peer-to-peer networks operate and give their advantages and disadvantages.'],
    ['03 · STACK + QUEUE','Explain stack and queue, then give an example use of each structure.'],
    ['04 · ETHERNET','Explain Ethernet, IP-address conflicts when using Ethernet, and how a conflict can be overcome.'],
    ['05 · DNS + HTTP','Explain DNS and HTTP, then explain the role of status flags.'],
  ];
  return <div className="h14m-content-v2 h14f-prior" aria-label="Chapter 14.1 prior knowledge">
    <header><span>HODDER p.328 · WHAT YOU SHOULD ALREADY KNOW</span><strong>Five checks before 14.1</strong><p>Use these as retrieval questions. They are prerequisite knowledge from Chapter 2, not new definitions to memorise from Chapter 14.</p></header>
    <main>{checks.map(([label,text])=><section key={label}><b>{label}</b><p>{text}</p></section>)}</main>
  </div>;
}

function PriorKnowledge142(){
  return <div className="h14m-content-v2 h14f-prior h14f-prior--142" aria-label="Chapter 14.2 prior knowledge">
    <header><span>HODDER p.337 · WHAT YOU SHOULD ALREADY KNOW</span><strong>Bridge from Chapter 2 to switching</strong><p>The coursebook asks learners to reactivate PSTN, VoIP and packet-routing knowledge before 14.2.</p></header>
    <main>
      <section><b>01A · PSTN</b><p>Explain how the public switched telephone network is used when making a phone call.</p></section>
      <section><b>01B · VoIP</b><p>Explain how VoIP can be used to make a video call over the internet.</p></section>
      <section className="wide"><b>02 · THREE-PACKET ROUTE</b><p>Draw how a message containing three packets could be routed independently from computer A to computer B.</p></section>
    </main>
  </div>;
}

function Table145(){
  const rows=[
    ['Actual route must be set up before transmission begins','YES','NO'],
    ['A dedicated transmission path is required','YES','NO'],
    ['Each packet uses the same route','YES','NO'],
    ['Packets arrive at the destination in the correct order','YES','NO'],
    ['All the bandwidth of the channel is required','YES','NO'],
    ['Is bandwidth wasted?','YES','NO'],
  ];
  return <div className="h14m-content-v2 h14f-table145" aria-label="Table 14.5 circuit and packet switching comparison">
    <header><span>HODDER p.340 · TABLE 14.5</span><strong>Feature</strong><b>Circuit switching</b><b>Packet switching</b></header>
    {rows.map(([feature,circuit,packet])=><section key={feature}><strong>{feature}</strong><b>{circuit}</b><b>{packet}</b></section>)}
    <footer>Fault rerouting is taught on the dedicated failure scene; it is not substituted for the source table’s final “bandwidth wasted?” row.</footer>
  </div>;
}

function supplement(beatId:string){
  switch(beatId){
    case 'h14p-141-units':
      return <SourceStrip page="HODDER pp.329–330" title="TERMINOLOGY THAT MUST STAY DISTINCT" items={[
        ['PACKET','A message/data is split into smaller groups of bits for network transmission.'],
        ['SEGMENT','The transport-layer unit of data associated with transport-layer protocols.'],
        ['HOST','A computer or device that can communicate with other computers/devices on a network.'],
        ['HOST-TO-HOST','The source term for TCP communication between two devices.'],
      ]}/>;
    case 'h14p-141-http':
      return <SourceStrip page="HODDER p.331" title="HTTP SOURCE MEANING" items={[
        ['CLIENT / SERVER','The browser sends request messages to web servers; the servers respond.'],
        ['MESSAGE FORMAT','HTTP defines the format of messages sent and received.'],
        ['APPLICATION LAYER','The web browser initiates the request and converts returned HTML for display or media playback.'],
        ['HYPERLINKS','The source describes hyperlinks here as rules used when transferring data over the internet.'],
      ]}/>;
    case 'h14p-141-ftp-detail':
      return <SourceStrip page="HODDER pp.331–332" title="FTP SOURCE DETAIL" items={[
        ['BROWSER ACCESS','A web browser can connect to an FTP address in a way similar to HTTP.'],
        ['SOURCE EXAMPLE','ftp://username@ftp.example.gov/'],
        ['SINGLE APPLICATION TASK','FTP is presented here as the application protocol whose task is transferring files over a network.'],
      ]}/>;
    case 'h14p-141-email-mechanics':
      return <SourceStrip page="HODDER p.332" title="EMAIL DEFINITIONS" items={[
        ['BINARY FILE','Not text-only; the source describes it as computer/machine-readable rather than human-readable.'],
        ['MIME HEADER','Placed at the beginning of transmission so the client can select the required media player for an attachment.'],
        ['SERVER TO SERVER','SMTP remains used when transferring email between email servers.'],
      ]}/>;
    case 'h14p-141-ip-link':
      return <SourceStrip page="HODDER p.334" title="INTERNET / DATA-LINK SOURCE DETAIL" items={[
        ['INTERNET LAYER','Identifies the intended network and host; IP is the common protocol and supports inter-network routing.'],
        ['DATA-LINK','Identifies/moves local traffic, maps IP to MAC, identifies the network protocol in the packet header and delivers packets to the network.'],
        ['PHYSICAL NETWORK LAYER','Specifies the requirements of the hardware to be used for the network.'],
      ]}/>;
    case 'h14p-141-ethernet-detail':
      return <SourceStrip page="HODDER pp.334–335" title="ETHERNET AS A LOCAL CONTROL PROTOCOL" items={[
        ['LAN ROLE','Ethernet connects computers/devices to form a LAN and controls movement of frames.'],
        ['SIMULTANEOUS TRANSMISSION','Its protocols are used to avoid two or more devices transmitting at the same time.'],
        ['EXTERNAL DEVICES','Ethernet itself is local; communicating outside the LAN requires IP above Ethernet.'],
      ]}/>;
    case 'h14p-141-wireless':
      return <SourceStrip page="HODDER p.335" title="WIRELESS SOURCE LOCK" items={[
        ['CSMA/CA','WiFi uses carrier sense multiple access with collision avoidance.'],
        ['NOT CSMA/CD','The coursebook explicitly warns that CSMA/CA is a different concept from CSMA/CD in Chapter 2.'],
        ['DCF','Transmit only when a channel is free; missing acknowledgement leads to a random wait before retrying. The source links this to WLAN data security and integrity.'],
      ]}/>;
    case 'h14p-141-bittorrent-terms':
      return <SourceStrip page="HODDER pp.335–337" title="BITTORRENT SOURCE DETAIL" items={[
        ['SCALE','The source contrasts small peer-to-peer networks with BitTorrent, which can involve thousands of internet users.'],
        ['AVAILABILITY','Number of complete copies of the torrent contents distributed amongst the swarm; a torrent is the file being shared.'],
        ['SHARE RATIO','uploaded data ÷ downloaded data; >1 is a positive impact, <1 is a negative impact on the swarm.'],
        ['HISTORICAL SNAPSHOT','The book reports about 12% BitTorrent video-file sharing versus about 50% YouTube at the time of writing; this is a historical source figure, not a current statistic.'],
      ]}/>;
    case 'h14p-142-objectives':
      return <SourceStrip page="HODDER p.337" title="14.2 KEY TERMS" items={[
        ['CIRCUIT SWITCHING','A dedicated circuit/channel lasts for the duration of the communication.'],
        ['PACKET SWITCHING','A message is broken into packets that can be sent along paths independently.'],
        ['HOP NUMBER','Header value used to prevent packets that never reach a destination from clogging routes.'],
        ['HEADER + ROUTING TABLE','The header carries key packet data; the routing table provides information for the shortest/best route.'],
      ]}/>;
    case 'h14p-142-circuit-route':
      return <SourceStrip page="HODDER p.338" title="FIGURE 14.7 SOURCE CONDITIONS" items={[
        ['EXACT ROUTE','A → R2 → R5 → R8 → R7 → R10 → B.'],
        ['CONDITION','Communication takes place provided device B is not busy.'],
        ['MAIN USES','Public telephone networks, private telephone networks and private data networks.'],
      ]}/>;
    case 'h14p-142-packet-route':
      return <SourceStrip page="HODDER p.339" title="HOW A PACKET ROUTE IS SELECTED" items={[
        ['INDEPENDENT PATHS','Each packet follows its own path from start point to destination.'],
        ['QUEUE LOAD','Routing selection depends on the number of datagram packets waiting to be processed at each node/router.'],
        ['SHORTEST AVAILABLE PATH','The shortest path available is selected; packets can therefore arrive in a different order and must be reassembled.'],
      ]}/>;
    default:return null;
  }
}

export function Chapter14PresentationContentV3({beat,reveal}:Props){
  if(beat.id==='h14p-141-hook')return <PriorKnowledge141/>;
  if(beat.id==='h14p-142-hook')return <PriorKnowledge142/>;
  if(beat.id==='h14p-142-compare')return <Table145/>;

  const extra=supplement(beat.id);
  const core=<Chapter14PresentationContentV2 beat={beat} reveal={reveal}/>;
  if(!extra)return core;
  return <div className="h14f-composite" data-beat={beat.id}><div className="h14f-core">{core}</div>{extra}</div>;
}
