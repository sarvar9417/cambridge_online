import type { LessonPresentationBeat } from './lesson-experience-model';

const scene = (
  id:string,
  slideId:string,
  sceneRole:NonNullable<LessonPresentationBeat['sceneRole']>,
  eyebrow:string,
  title:string,
  sourcePages:number[],
  content:Partial<LessonPresentationBeat> = {},
):LessonPresentationBeat => ({
  id,
  slideId,
  kind:sceneRole==='challenge'||sceneRole==='exam'?'activity':sceneRole==='visual'||sceneRole==='process'?'visual':sceneRole==='compare'?'key-idea':'concept',
  sceneRole,
  eyebrow,
  title,
  sourcePages,
  showSource:false,
  ...content,
});

const PROTOCOLS:LessonPresentationBeat[] = [
  scene('h14p-141-hook','h14-need-protocols','hook','CHAPTER 14 · STARTER','Two computers want to communicate. What must they agree first?',[329],{
    lead:'Think for 20 seconds. If the sender and receiver use different rules, can the same data still be interpreted correctly?',
  }),
  scene('h14p-141-objectives','h14-overview','objective','14.1 · LESSON GOALS','By the end of this lesson you should be able to…',[328,329],{
    bullets:[
      'Explain why agreed protocols are required for successful communication.',
      'Describe the four TCP/IP layers and the direction data moves when sending and receiving.',
      'Apply HTTP, email, TCP/IP, Ethernet and BitTorrent terminology to real communication scenarios.',
    ],
  }),
  scene('h14p-141-protocol','h14-need-protocols','concept','14.1.1 · THE NEED FOR PROTOCOLS','Communication only works when both sides use agreed rules',[329],{
    keyTerms:[{term:'Protocol',definition:'A set of rules governing communication across a network; the rules are agreed by both sender and recipient.'}],
    lead:'Parity checking is a simple example: both sides must agree whether even or odd parity is being used.',
  }),
  scene('h14p-141-stack','h14-tcpip-stack','process','14.1.2 · TCP/IP','The four-layer TCP/IP stack',[329,330],{
    teacherNote:'Reveal one layer at a time. Ask students what changes when the same data travels back to the receiver.',
    richBlock:{kind:'figure',figure:{kind:'sequence',title:'Sending: move down the stack',items:[
      {label:'4 · APPLICATION',note:'Programs and application protocols exchange data.'},
      {label:'3 · TRANSPORT',note:'TCP manages host-to-host delivery, sequence and retransmission.'},
      {label:'2 · INTERNET',note:'IP adds addressing and supports routing between networks.'},
      {label:'1 · LINK',note:'Frames move across the local network using link-layer addressing.'},
    ],caption:'Receiving reverses the order: Link → Internet → Transport → Application.'}},
  }),
  scene('h14p-141-units','h14-packet-names','process','ENCAPSULATION · TERMINOLOGY','The data unit changes name as it moves through the stack',[330],{
    teacherNote:'Emphasise that each layer adds control information. Keep the original data visible inside the growing unit.',
    richBlock:{kind:'figure',figure:{kind:'sequence',title:'Layer-by-layer naming',items:[
      {label:'Application data',note:'Created by software such as a browser or mail client.'},
      {label:'Segment',note:'Transport-layer unit.'},
      {label:'Datagram',note:'Internet-layer IP unit.'},
      {label:'Frame',note:'Data-link-layer unit used for local transmission.'},
    ]}},
  }),
  scene('h14p-141-protocol-map','h14-application-layer','compare','APPLICATION LAYER','Which protocol does what?',[330],{
    teacherNote:'Keep this as the map only. FTP mechanics and email mechanics are taught on their own screens next.',
    richBlock:{kind:'table',table:{headers:['Protocol','Main purpose'],rows:[
      ['HTTP','Transfer the files/resources that make up web pages.'],
      ['SMTP','Send email.'],
      ['POP3/4 or IMAP','Receive email from a mail server.'],
      ['DNS','Find the IP address associated with a domain name.'],
      ['FTP','Transfer files between computers/devices.'],
      ['RIP / SNMP','Routing-information and network-management protocols named in Table 14.1.'],
    ]}},
  }),
  scene('h14p-141-ftp-detail','h14-ftp','process','APPLICATION PROTOCOL · FTP','FTP does more than simply move a file',[331,332],{
    teacherNote:'Reveal the connection, anonymous-access example, command set and session credentials separately.',
    richBlock:{kind:'steps',title:'FTP source details',items:[
      'Connect to an FTP address.',
      'Recognise anonymous FTP and the coursebook confirmation message.',
      'Use FTP commands such as delete, close, rename, cd and lcd.',
      'Start a session with host name, user ID and password.',
    ]},
  }),
  scene('h14p-141-http','h14-http','process','APPLICATION PROTOCOL · HTTP','What happens after a user enters a URL?',[331],{
    teacherNote:'Do not read the steps. Reveal them and ask: “What service is needed next?” before each click.',
    richBlock:{kind:'figure',figure:{kind:'sequence',title:'HTTP request journey',items:[
      {label:'1 · User enters a URL',note:'The browser begins the request.'},
      {label:'2 · HTTP(S) passes the request to TCP',note:'Application layer → transport layer.'},
      {label:'3 · DNS resolves the domain name',note:'The corresponding IP address is found.'},
      {label:'4 · TCP prepares the transmission',note:'Packets/segments and acknowledgements support delivery.'},
      {label:'5 · Web server returns HTML/resources',note:'The response travels back to the client.'},
      {label:'6 · Browser interprets the response',note:'The page is displayed to the user.'},
    ]}},
  }),
  scene('h14p-141-email','h14-email-detail','process','EMAIL PROTOCOLS','Follow one email from sender to recipient',[332,333],{
    teacherNote:'Keep this screen about the journey. The push/pull/MIME mechanics are deliberately on the next screen.',
    richBlock:{kind:'figure',figure:{kind:'sequence',title:'Email path',items:[
      {label:'Sender / client'},
      {label:'SMTP + MIME'},
      {label:'Sender ISP mail server'},
      {label:'Internet'},
      {label:'Recipient domain mail server'},
      {label:'POP / IMAP → recipient'},
    ]}},
  }),
  scene('h14p-141-email-mechanics','h14-email-detail','concept','EMAIL · SOURCE DETAIL','Push, pull and MIME explain how the email protocols differ',[332],{
    teacherNote:'Ask students to classify each mechanism before revealing the explanation.',
    richBlock:{kind:'steps',title:'Email protocol mechanics',items:[
      'SMTP is text-based, connection-based and described as a push protocol.',
      'MIME handles media/binary attachments and uses a MIME header.',
      'POP/IMAP are described as pull protocols.',
      'The coursebook notes increased HTTP use while SMTP remains used between mail servers.',
    ]},
  }),
  scene('h14p-141-pop-imap','h14-pop-imap','compare','EMAIL · POP3/4 VS IMAP','The key difference is synchronisation',[333],{
    richBlock:{kind:'comparison',leftTitle:'POP3/4',rightTitle:'IMAP',rows:[
      ['Does not keep client and server synchronised in the coursebook model.','Keeps client and server synchronised.'],
      ['Downloaded mail is removed from the server in the coursebook model.','A copy is downloaded while the original remains on the server until manually deleted.'],
      ['The downloaded mailbox becomes local to the client.','The server mailbox remains the synchronised reference copy.'],
    ]},
  }),
  scene('h14p-141-transport-family','h14-tcp-handshake','concept','TRANSPORT LAYER','TCP is the focus, but the source names three transport protocols',[333],{
    teacherNote:'Do not imply UDP or SCTP are taught in depth here. The source explicitly says it will only consider TCP.',
    richBlock:{kind:'steps',title:'Transport protocol family',items:[
      'TCP is the protocol considered in detail.',
      'UDP is named as a transport-layer protocol.',
      'SCTP is named as a transport-layer protocol.',
      'TCP uses positive acknowledgement with retransmission (PAR).',
    ]},
  }),
  scene('h14p-141-tcp','h14-tcp-handshake','process','TRANSPORT PROTOCOL · TCP','TCP establishes a connection before data transfer',[333,334],{
    teacherNote:'Reveal the handshake as a dialogue: X speaks, Y acknowledges, X acknowledges, then data transfer starts.',
    richBlock:{kind:'figure',figure:{kind:'sequence',title:'Host-to-host handshake',items:[
      {label:'1 · X → Y',note:'Host X sends synchronisation sequence information.'},
      {label:'2 · Y → X',note:'Host Y sends acknowledgement plus its own synchronisation information.'},
      {label:'3 · X → Y',note:'Host X acknowledges Y.'},
      {label:'4 · Data transfer',note:'Communication can now take place.'},
    ],caption:'TCP also uses acknowledgement and retransmission when delivery fails.'}},
  }),
  scene('h14p-141-ip-link','h14-internet-link','compare','TCP/IP · INTERNET + LINK','IP gets data between networks; the link layer moves frames locally',[334],{
    richBlock:{kind:'comparison',leftTitle:'Internet layer',rightTitle:'Link layer',rows:[
      ['Uses IP to identify the intended network and host.','Encapsulates IP datagrams into frames for local transmission.'],
      ['Adds sender and recipient IP addresses.','Maps IP addressing to physical/MAC addressing on the local segment.'],
      ['Supports routing between networks.','Follows the local network protocol and hardware requirements.'],
    ]},
  }),
  scene('h14p-141-ethernet','h14-ethernet-frame','visual','FIGURE 14.5 · ETHERNET FRAME','Build the Ethernet frame one field at a time',[334],{
    teacherNote:'Keep this screen on the frame anatomy only; explain broadcast/type-length/checksum/VLAN on the next screen.',
    richBlock:{kind:'figure',figure:{kind:'bitfield',title:'Typical Ethernet frame',fields:[
      {label:'Pre-amble',bits:'8 bytes'},
      {label:'Start frame',bits:'1 byte'},
      {label:'Destination',bits:'6 bytes'},
      {label:'Source',bits:'6 bytes'},
      {label:'Ethernet type / length',bits:'2 bytes'},
      {label:'Actual message',bits:'46–1500 bytes'},
      {label:'Frame check sequence',bits:'4 bytes'},
      {label:'Interpacket gap',bits:'12 bytes'},
    ]}},
  }),
  scene('h14p-141-ethernet-detail','h14-ethernet-frame','concept','ETHERNET · SOURCE DETAIL','Four details explain how the frame is interpreted',[334,335],{
    teacherNote:'Reveal only one detail at a time. These are second-level source details, not the opening definition of Ethernet.',
    richBlock:{kind:'steps',title:'Ethernet source details',items:[
      'Broadcast destination FF:FF:FF:FF:FF:FF.',
      'Ethernet type/length threshold at 1539 in the source example.',
      'Frame check includes a checksum for integrity.',
      'The source notes VLAN can increase frame data size to around 9000 bytes.',
    ]},
  }),
  scene('h14p-141-wireless','h14-wireless','compare','LOCAL WIRELESS PROTOCOLS','WiFi, Bluetooth and WiMax use different IEEE protocol families',[335],{
    richBlock:{kind:'table',table:{headers:['Technology','Protocol family','Coursebook focus'],rows:[
      ['WiFi','IEEE 802.11','Uses CSMA/CA with DCF, acknowledgement and a random wait before retrying.'],
      ['Bluetooth','IEEE 802.15','Short-range data communication.'],
      ['WiMax','IEEE 802.16','Fixed 802.16-2004 and mobile 802.16-2005 are described.'],
    ]}},
  }),
  scene('h14p-141-bittorrent','h14-bittorrent-intro','process','FIGURE 14.6 · BITTORRENT','Watch pieces move through a swarm',[335,336,337],{
    teacherNote:'Keep this scene visual. Explain terminology and share ratio on the next screen.',
    richBlock:{kind:'figure',figure:{kind:'sequence',title:'BitTorrent process',items:[
      {label:'Create a torrent containing metadata.'},
      {label:'Peers obtain the torrent and contact the tracker.'},
      {label:'The file is split into pieces.'},
      {label:'Peers exchange pieces and become sources for pieces they hold.'},
      {label:'Completed peers can remain as seeds; pieces are rearranged into the final file.'},
    ]}},
  }),
  scene('h14p-141-bittorrent-terms','h14-bittorrent-intro','concept','BITTORRENT · KEY TERMS','Swarm behaviour depends on availability and sharing',[336],{
    teacherNote:'Use the formula only after students can distinguish seed, leech and lurker.',
    richBlock:{kind:'steps',title:'BitTorrent terminology',items:[
      'Swarm',
      'Availability',
      'Seed',
      'Tracker',
      'Leech and share ratio',
      'Lurker',
    ]},
  }),
  scene('h14p-141-check','h14-recap','exam','14.1 · CAMBRIDGE CHECK','Explain why protocols are needed and name the four TCP/IP layers',[329,330],{
    activity:{
      title:'30-second retrieval',
      prompt:'Without notes: explain why two devices need an agreed protocol, then name the four TCP/IP layers in sending order.',
      reveal:'Protocol: both sender and receiver must follow agreed communication rules. Sending order: Application → Transport → Internet → Link.',
    },
  }),
];

const SWITCHING:LessonPresentationBeat[] = [
  scene('h14p-142-hook','h14-key-terms-142','hook','14.2 · STARTER','A phone call and a web download move data differently. Why?',[337],{
    lead:'Think about whether one dedicated path should remain reserved, or whether separate packets should be free to take different routes.',
  }),
  scene('h14p-142-objectives','h14-key-terms-142','objective','14.2 · LESSON GOALS','By the end of this lesson you should be able to…',[337],{
    bullets:[
      'Explain circuit switching and packet switching.',
      'Compare their route, order and bandwidth characteristics.',
      'Explain how packet headers, hop numbers, routers and routing tables move packets to a destination.',
    ],
  }),
  scene('h14p-142-circuit-stages','h14-circuit-basics','process','14.2.1 · CIRCUIT SWITCHING','Circuit switching reserves one route for the whole communication',[338],{
    richBlock:{kind:'figure',figure:{kind:'sequence',title:'Three stages',items:[
      {label:'1 · Establish the circuit',note:'A dedicated channel is created between sender and receiver.'},
      {label:'2 · Transfer data',note:'Communication usually works in both directions.'},
      {label:'3 · Terminate the circuit',note:'The reserved route is released when communication ends.'},
    ]}},
  }),
  scene('h14p-142-circuit-route','h14-circuit-route','process','FIGURE 14.7 · DEDICATED ROUTE','Every frame follows the same established route',[338],{
    teacherNote:'Point out that other possible links still exist physically, but this communication has one reserved circuit.',
    richBlock:{kind:'figure',figure:{kind:'sequence',title:'Coursebook route',items:[
      {label:'Device A → Router A'},
      {label:'R2'},
      {label:'R5'},
      {label:'R8'},
      {label:'R7'},
      {label:'R10'},
      {label:'Router B → Device B'},
    ],caption:'The same route remains reserved for the duration of the communication.'}},
  }),
  scene('h14p-142-circuit-failure','h14-circuit-pros-cons','challenge','THINK · DEDICATED ROUTE','What happens if one link on the dedicated circuit fails?',[338],{
    activity:{
      title:'Predict before revealing',
      prompt:'The communication is using one established circuit. One link on that route fails. Can the same transmission simply choose another route?',
      reveal:'No. In the coursebook comparison, a fault on the dedicated line has no alternative routing available for that established circuit.',
    },
  }),
  scene('h14p-142-packet-basics','h14-packet-basics','concept','14.2.2 · PACKET SWITCHING','Packet switching lets packets travel independently',[339],{
    bullets:[
      'The message is split into packets.',
      'Each packet can follow its own route.',
      'Routing selection can depend on waiting datagram packets and the shortest available path.',
      'Packets may arrive in a different order and must be reassembled.',
    ],
  }),
  scene('h14p-142-packet-route','h14-packet-route','process','FIGURE 14.8 · INDEPENDENT PACKETS','Different packets can take different routes and arrive out of order',[339],{
    teacherNote:'Pause after each packet appears. Ask students why using different routes can improve resilience.',
    richBlock:{kind:'figure',figure:{kind:'sequence',title:'Packet-switching journey',items:[
      {label:'1 · Split the message',note:'Create packets with control information in their headers.'},
      {label:'2 · Packet 1 chooses a route'},
      {label:'3 · Packet 2 chooses another route'},
      {label:'4 · Packet 3 chooses another route'},
      {label:'5 · Packet 4 chooses another route'},
      {label:'6 · Destination reassembles the packets',note:'Sequence information restores the original order.'},
    ]}},
  }),
  scene('h14p-142-compare','h14-switching-compare','compare','TABLE 14.5 · CIRCUIT VS PACKET','Compare the two methods before judging their strengths',[340],{
    teacherNote:'This is the compact comparison only. Benefits/drawbacks are deliberately split into the next two screens.',
    richBlock:{kind:'table',table:{headers:['Feature','Circuit switching','Packet switching'],rows:[
      ['Route set up before transmission','Yes','No'],
      ['Dedicated transmission path','Yes','No'],
      ['Same route for all transmitted units','Yes','No'],
      ['Arrival order guaranteed','Yes','Not guaranteed'],
      ['All channel bandwidth reserved','Yes','No'],
      ['Alternative routing after a fault','No for the established circuit','Yes, packets can be rerouted'],
    ]}},
  }),
  scene('h14p-142-circuit-pros-cons','h14-circuit-pros-cons','compare','TABLE 14.3 · CIRCUIT SWITCHING','Benefits and drawbacks of a dedicated circuit',[338],{
    teacherNote:'Reveal benefit/drawback pairs. Ask students which points matter most for real-time communication.',
    richBlock:{kind:'steps',title:'Circuit switching pros and cons',items:['pair 1','pair 2','pair 3','pair 4','pair 5','pair 6']},
  }),
  scene('h14p-142-packet-pros-cons','h14-packet-pros-cons','compare','TABLE 14.4 · PACKET SWITCHING','Benefits and drawbacks of independent packets',[340],{
    teacherNote:'Link rerouting and shared bandwidth back to the animated packet routes.',
    richBlock:{kind:'steps',title:'Packet switching pros and cons',items:['pair 1','pair 2','pair 3','pair 4','pair 5','pair 6']},
  }),
  scene('h14p-142-video-example','h14-example-141','process','EXAMPLE 14.1 · VIDEO CONFERENCING','Why can packet switching hurt a real-time video call?',[342],{
    teacherNote:'Reveal the four packet-switching symptoms first. Only then reveal why circuit switching can improve the situation.',
    richBlock:{kind:'steps',title:'Example 14.1',items:[
      'Picture and sound synchronisation.',
      'Pauses caused by reassembly delay.',
      'Degraded quality from competing traffic.',
      'Possible packet drop-out; then compare circuit-switching features.',
    ]},
  }),
  scene('h14p-142-hop','h14-hop-checksum-priority','process','PACKET CONTROL · HOP NUMBER','Hop count prevents packets from circulating forever',[340],{
    teacherNote:'Keep this screen only on lifetime/hopping. Error checking and priority are taught separately next.',
    richBlock:{kind:'figure',figure:{kind:'sequence',title:'Hop-number countdown',items:[
      {label:'Start · hop 4'},
      {label:'Router 1 · hop 3'},
      {label:'Router 2 · hop 2'},
      {label:'Router 3 · hop 1'},
      {label:'Next router · hop 0',note:'If the destination has not been reached, the packet is deleted.'},
    ]}},
  }),
  scene('h14p-142-packet-control','h14-hop-checksum-priority','concept','PACKET CONTROL · CHECKING + PRIORITY','Headers can also support error checking and queue priority',[340],{
    richBlock:{kind:'steps',title:'Packet control details',items:[
      'Checksum/parity checking at the destination.',
      'Request a re-send if the check does not match.',
      'Priority value can determine the packet queue.',
    ]},
  }),
  scene('h14p-142-header','h14-packet-header','visual','FIGURE 14.9 · PACKET HEADER','Start with the seven fields used in the TCP/IP example',[341],{
    teacherNote:'Teach purpose before bit length: addressing → lifetime → size/count → ordering → integrity.',
    richBlock:{kind:'figure',figure:{kind:'bitfield',title:'Main TCP/IP packet-header fields',fields:[
      {label:'Source IP address',bits:'32 bits'},
      {label:'Destination IP address',bits:'32 bits'},
      {label:'Hop number',bits:'8 bits'},
      {label:'Packet length',bits:'16 bits'},
      {label:'Number of packets',bits:'16 bits'},
      {label:'Sequence number',bits:'16 bits'},
      {label:'Header checksum',bits:'16 bits'},
    ]}},
  }),
  scene('h14p-142-header-extended','h14-packet-header','visual','PACKET HEADER · EXTENDED FIELDS','The general header contains additional control fields',[341],{
    teacherNote:'These are source-completeness details. Do not mix them into the first packet-header explanation.',
    richBlock:{kind:'steps',title:'Additional header fields',items:[
      'Protocol version · 4 bits',
      'Header length · 4 bits',
      'Priority · 8 bits',
      'Fragmentation flags · 3 bits',
      'Fragment offset · 13 bits',
      'Transport protocol · 8 bits (TCP / UDP)',
    ]},
  }),
  scene('h14p-142-routing','h14-routing-table','process','FIGURE 14.10 · ROUTER DECISION','A router reads the destination and chooses the next hop',[341,342],{
    teacherNote:'Model only the decision loop here: header → lookup → metric → next hop. Table anatomy comes next.',
    richBlock:{kind:'steps',title:'Router decision',items:[
      'Read destination information in the packet header.',
      'Compare it with the routing table.',
      'Use route information/metrics to identify an efficient path.',
      'Forward the packet to the selected next hop/interface.',
    ]},
  }),
  scene('h14p-142-routing-fields','h14-routing-table','concept','ROUTING TABLE · SOURCE DETAIL','Seven fields describe how a route can be selected',[341],{
    richBlock:{kind:'steps',title:'Routing-table fields',items:[
      'Hops + next-router MAC',
      'Metrics + network destination',
      'Gateway + netmask',
      'Interface',
    ]},
  }),
  scene('h14p-142-web-page','h14-example-142','process','EXAMPLE 14.2 · WEB PAGE','Trace one web-page transfer through packet switching',[343],{
    richBlock:{kind:'steps',title:'From web server to destination',items:[
      'Divide the web page into data packets.',
      'Put the destination IP address into each packet header.',
      'At each router compare the header with the routing table.',
      'Determine the next router/hop and add its MAC address to the header.',
      'Check the hop value while the packet travels.',
      'Allow packets to take different routes.',
      'Reassemble packets at the destination to rebuild the page.',
    ]},
  }),
  scene('h14p-142-exam','h14-activity-14a','exam','CAMBRIDGE-STYLE CHECK','Describe how a packet header and routing table are used to route a packet',[343],{
    activity:{
      title:'Exam response',
      prompt:'Give a concise explanation of how a router uses information in a packet header together with its routing table to forward the packet efficiently.',
      reveal:'The router reads destination information from the header, compares it with routing-table entries/metrics, selects the best available next hop/interface and forwards the packet. The process repeats at later routers until the destination is reached.',
    },
  }),
  scene('h14p-142-activity14a','h14-activity-14a','recap','ACTIVITY 14A · CONSOLIDATION','Use the coursebook activity as a five-part retrieval lesson',[343],{
    teacherNote:'Let students attempt each group before revealing the next group. This screen is a task map, not an answer sheet.',
    richBlock:{kind:'steps',title:'Activity 14A groups',items:['TCP/IP + email','Ethernet','BitTorrent','Routing','VoIP']},
  }),
  scene('h14p-142-practice','h14-recap','exam','END-OF-CHAPTER QUESTIONS','Finish with the source question set, not another summary',[344],{
    teacherNote:'Use these as exam-style transfer after the concept and activity screens. The wording here is a compact map of the source question groups.',
    richBlock:{kind:'steps',title:'End-of-chapter practice',items:['Question 1','Question 2','Question 3']},
  }),
  scene('h14p-142-recap','h14-recap','recap','CHAPTER 14 · FINAL RETRIEVAL','Can you explain the complete journey without notes?',[345],{
    bullets:[
      'Name the four TCP/IP layers in sending order.',
      'State the roles of HTTP, SMTP and IMAP.',
      'Explain one key difference between circuit and packet switching.',
      'Explain why a sequence number is required.',
      'Explain what happens when a hop number reaches zero before the destination.',
    ],
  }),
];

export function chapter14PresentationStoryboard(topicCode:string){
  if(topicCode==='overview')return [...PROTOCOLS,...SWITCHING];
  if(topicCode==='14.1')return PROTOCOLS;
  if(topicCode==='14.2')return SWITCHING;
  return null;
}

export const CHAPTER_14_PRESENTATION_SCENE_COUNT = PROTOCOLS.length + SWITCHING.length;
