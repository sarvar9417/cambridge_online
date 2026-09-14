import type { LessonPresentationBeat } from './lesson-experience-model';

type Props={beat:LessonPresentationBeat;reveal:number};

type StageState='is-complete'|'is-current'|'is-upcoming';

const REBUILT_SCENE_IDS=new Set([
  'h14p-141-stack',
  'h14p-141-units',
  'h14p-141-protocol-map',
  'h14p-142-compare',
  'h14p-142-routing',
]);

function stageState(reveal:number,step:number):StageState{
  if(reveal<=0)return 'is-upcoming';
  if(step<reveal)return 'is-complete';
  if(step===reveal)return 'is-current';
  return 'is-upcoming';
}

export function hasChapter14PresentationRebuild(beat:LessonPresentationBeat){
  return REBUILT_SCENE_IDS.has(beat.id);
}

function TcpIpStackRebuild({reveal}:{reveal:number}){
  const layers=[
    {
      number:'4',
      name:'APPLICATION',
      unit:'Application data',
      job:'Gives programs access to network services and defines the application protocols used to exchange data.',
      detail:'Examples in this chapter: HTTP, FTP, SMTP, POP3/4, IMAP and DNS.',
    },
    {
      number:'3',
      name:'TRANSPORT',
      unit:'Segment',
      job:'Regulates the connection and breaks data into units for transport between hosts.',
      detail:'TCP supports sequencing, acknowledgement and retransmission when data is lost or corrupted.',
    },
    {
      number:'2',
      name:'INTERNET',
      unit:'Datagram',
      job:'Uses IP addressing so data can be routed from the source network/host towards the destination network/host.',
      detail:'The IP header carries source and destination IP addresses for internetwork routing.',
    },
    {
      number:'1',
      name:'LINK',
      unit:'Frame',
      job:'Moves data across the local network segment using the local network protocol and hardware addressing.',
      detail:'The IP datagram is placed inside a frame; local delivery uses link/MAC information and frame checking.',
    },
  ] as const;
  return <div className="h14r h14r-stack" aria-label="Four-layer TCP IP model with sending and receiving directions">
    <section className="h14r-intro">
      <span>ONE COMMUNICATION · FOUR RESPONSIBILITIES</span>
      <strong>Each layer solves a different part of the same delivery problem.</strong>
      <p>When sending, data moves <b>Application → Transport → Internet → Link</b>. At the receiving host, the order is reversed.</p>
    </section>
    <div className="h14r-stack-layout">
      <aside className="h14r-direction h14r-direction--send"><b>↓</b><strong>SENDING</strong><span>4 → 1</span></aside>
      <main>
        {layers.map((layer,index)=><section className={`h14r-layer ${stageState(reveal,index+1)}`} key={layer.name}>
          <b className="h14r-layer-number">{layer.number}</b>
          <div className="h14r-layer-copy"><header><strong>{layer.name}</strong><span>{layer.unit}</span></header><p>{layer.job}</p><small>{layer.detail}</small></div>
        </section>)}
      </main>
      <aside className="h14r-direction h14r-direction--receive"><b>↑</b><strong>RECEIVING</strong><span>1 → 4</span></aside>
    </div>
    <footer className="h14r-rule"><b>Why a stack?</b><span>Layering decomposes communication into manageable modules. A layer can perform its own task while working with the layers above and below it.</span></footer>
  </div>;
}

function ApplicationProtocolMapRebuild(){
  const protocols=[
    ['HTTP','WEB','Transfer the files/resources that make up web pages.'],
    ['FTP','FILES','Transfer files between computers/devices over a network.'],
    ['SMTP','EMAIL · SEND','Send email; the chapter later describes SMTP as a push protocol.'],
    ['POP3/4','EMAIL · RECEIVE','Receive/download email from a mail server.'],
    ['IMAP','EMAIL · RECEIVE + SYNC','Receive email while keeping the client and server mailbox synchronised.'],
    ['DNS','NAME → ADDRESS','Find the IP address associated with a domain name.'],
    ['RIP','ROUTING INFO','Allow routers to exchange routing information over an IP network.'],
    ['SNMP','NETWORK MANAGEMENT','Exchange network-management information between management software and network devices.'],
  ] as const;
  return <div className="h14r h14r-protocols" aria-label="Application layer protocol map">
    <section className="h14r-intro">
      <span>APPLICATION LAYER · CHOOSE BY TASK</span>
      <strong>Do not memorise a random acronym list. Match each protocol to the communication job it performs.</strong>
      <p>The application layer is where software uses agreed protocols for services such as web access, file transfer, email, name lookup and network management.</p>
    </section>
    <div className="h14r-protocol-grid">
      {protocols.map(([protocol,task,meaning])=><section key={protocol}><header><strong>{protocol}</strong><span>{task}</span></header><p>{meaning}</p></section>)}
    </div>
    <footer className="h14r-rule"><b>Fast recall</b><span><strong>HTTP = web · FTP = files · SMTP = send · POP/IMAP = receive · DNS = domain name to IP.</strong> RIP and SNMP support routing-information exchange and network management.</span></footer>
  </div>;
}

function MessageJourneyRebuild({reveal}:{reveal:number}){
  const sender=[
    {step:1,label:'APPLICATION DATA',parts:['DATA'],note:'The application creates the original message.'},
    {step:2,label:'SEGMENT',parts:['TCP HEADER','DATA'],note:'Transport control is added.'},
    {step:3,label:'DATAGRAM',parts:['IP HEADER','TCP HEADER','DATA'],note:'Internet-layer addressing is added.'},
    {step:4,label:'FRAME',parts:['LINK HEADER','IP HEADER','TCP HEADER','DATA','FRAME CHECK'],note:'Link information prepares the unit for local transmission.'},
  ] as const;
  return <div className="h14r h14r-journey" aria-label="End to end TCP IP encapsulation and receiving journey">
    <section className="h14r-intro">
      <span>ENCAPSULATION · END-TO-END MODEL</span>
      <strong>The message is not replaced at each layer — control information is wrapped around it.</strong>
      <p>Follow the same data from the sender, across the network, and into the receiving application.</p>
    </section>
    <div className="h14r-journey-grid">
      <section className="h14r-host h14r-host--sender">
        <header><span>SENDER</span><strong>Move down the stack</strong></header>
        {sender.map(item=><div className={`h14r-unit ${stageState(reveal,item.step)}`} key={item.label}>
          <b>{item.label}</b>
          <div>{item.parts.map(part=><span data-payload={part==='DATA'?'true':undefined} key={part}>{part}</span>)}</div>
          <small>{item.note}</small>
        </div>)}
      </section>
      <section className="h14r-network">
        <div className="h14r-network-path"><span>LOCAL LINK</span><i>→</i><b>ROUTER</b><i>→</i><b>INTERNET / NETWORKS</b><i>→</i><b>ROUTER</b><i>→</i><span>LOCAL LINK</span></div>
        <p>Routers use the destination IP information to choose a route. Link-layer framing handles each local transmission segment.</p>
      </section>
      <section className="h14r-host h14r-host--receiver">
        <header><span>RECEIVER</span><strong>Move up the stack</strong></header>
        <div className={`h14r-reverse ${stageState(reveal,4)}`}><b>LINK</b><p>Receive the frame and process the local link information.</p></div>
        <div className={`h14r-reverse ${stageState(reveal,3)}`}><b>INTERNET</b><p>Process the IP datagram and destination addressing.</p></div>
        <div className={`h14r-reverse ${stageState(reveal,2)}`}><b>TRANSPORT</b><p>Use sequence/error control so the data can be delivered correctly.</p></div>
        <div className={`h14r-reverse ${stageState(reveal,1)}`}><b>APPLICATION</b><p>Deliver the restored application data to the program.</p></div>
      </section>
    </div>
    <footer className="h14r-rule"><b>Remember the names</b><span>Application data → <strong>segment</strong> → <strong>datagram</strong> → <strong>frame</strong>. Receiving uses the same stack in reverse.</span></footer>
  </div>;
}

function SwitchingCompareRebuild(){
  return <div className="h14r h14r-switching" aria-label="Circuit switching and packet switching visual comparison">
    <section className="h14r-intro">
      <span>ONE MESSAGE · TWO DELIVERY STRATEGIES</span>
      <strong>The decisive question is whether the communication reserves one route or lets packets choose routes independently.</strong>
      <p>Use the route picture first, then connect it to bandwidth, order, faults and real-time behaviour.</p>
    </section>
    <div className="h14r-switch-grid">
      <section className="h14r-switch-card h14r-switch-card--circuit">
        <header><span>CIRCUIT SWITCHING</span><strong>Reserve one dedicated path</strong></header>
        <div className="h14r-circuit-path"><b>A</b><i/><i/><i/><i/><strong>B</strong><em className="h14r-moving-dot"/></div>
        <ul>
          <li>Set up the circuit before data transfer.</li>
          <li>All frames use the same route and arrive in order.</li>
          <li>The whole channel bandwidth is reserved for this communication.</li>
          <li>A fault on the dedicated route gives no alternative route for that established circuit.</li>
          <li>Works better for real-time applications in the coursebook comparison.</li>
        </ul>
      </section>
      <section className="h14r-switch-card h14r-switch-card--packet">
        <header><span>PACKET SWITCHING</span><strong>Split the message and route packets independently</strong></header>
        <div className="h14r-packet-paths"><b>A</b><div><i/><i/><i/></div><strong>B</strong><em className="h14r-moving-dot h14r-moving-dot--p1"/><em className="h14r-moving-dot h14r-moving-dot--p2"/></div>
        <ul>
          <li>No dedicated path is established for the whole communication.</li>
          <li>Different packets can use different available routes.</li>
          <li>Bandwidth is shared with other packets/data.</li>
          <li>Packets may arrive out of order and must be reassembled.</li>
          <li>Faulty lines can be bypassed by rerouting packets.</li>
        </ul>
      </section>
    </div>
    <footer className="h14r-rule"><b>Exam contrast</b><span><strong>Circuit = one reserved route.</strong> <strong>Packet = independent packets, shared routes, reassembly.</strong></span></footer>
  </div>;
}

function RouterJourneyRebuild({reveal}:{reveal:number}){
  const stages=[
    {
      n:'01',
      title:'READ THE HEADER',
      text:'Read the destination IP address and packet-control information such as the hop number.',
    },
    {
      n:'02',
      title:'LOOK UP THE ROUTE',
      text:'Compare the destination with the routing table: network destination, hops/metrics, gateway, netmask and interface.',
    },
    {
      n:'03',
      title:'CHOOSE THE NEXT HOP',
      text:'Select the shortest/best available route, identify the next router and use its MAC address for the next local transfer.',
    },
    {
      n:'04',
      title:'FORWARD · REPEAT · ARRIVE',
      text:'Forward the packet and repeat at later routers. If the hop number reaches 0 before the destination, the packet is deleted; at the destination packets are reassembled using sequence information.',
    },
  ] as const;
  return <div className="h14r h14r-routing" aria-label="Router packet forwarding decision journey">
    <section className="h14r-intro">
      <span>ROUTER JOURNEY · FIGURE 14.10</span>
      <strong>A router does not need the whole message. It needs enough header and table information to choose the next step.</strong>
      <p>Think of routing as the same decision loop repeated from router to router until the destination network is reached.</p>
    </section>
    <div className="h14r-routing-flow">
      {stages.map((stage,index)=><section className={`h14r-routing-stage ${stageState(reveal,index+1)}`} key={stage.n}>
        <b>{stage.n}</b><div><strong>{stage.title}</strong><p>{stage.text}</p></div>{index<stages.length-1?<i aria-hidden="true">→</i>:null}
      </section>)}
    </div>
    <div className="h14r-routing-evidence">
      <section><span>PACKET HEADER</span><b>destination IP · hop number · sequence · checksum</b></section>
      <section><span>ROUTING TABLE</span><b>network destination · hops/metrics · gateway · netmask · interface</b></section>
      <section><span>DECISION</span><b>next router / next hop → forward on the selected interface</b></section>
    </div>
    <footer className="h14r-rule"><b>Exam chain</b><span><strong>header → routing-table lookup → next-hop decision → forwarding → repeat → reassembly</strong></span></footer>
  </div>;
}

export function Chapter14PresentationRebuild({beat,reveal}:Props){
  if(beat.id==='h14p-141-stack')return <TcpIpStackRebuild reveal={reveal}/>;
  if(beat.id==='h14p-141-units')return <MessageJourneyRebuild reveal={reveal}/>;
  if(beat.id==='h14p-141-protocol-map')return <ApplicationProtocolMapRebuild/>;
  if(beat.id==='h14p-142-compare')return <SwitchingCompareRebuild/>;
  if(beat.id==='h14p-142-routing')return <RouterJourneyRebuild reveal={reveal}/>;
  return null;
}
