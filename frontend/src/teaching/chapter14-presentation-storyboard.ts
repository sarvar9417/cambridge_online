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
  scene('h14p-141-protocol-map','h14-application-layer','compare','APPLICATION LAYER','Which protocol does what?',[330,331,332],{
    richBlock:{kind:'table',table:{headers:['Protocol','Main purpose'],rows:[
      ['HTTP','Transfer the files/resources that make up web pages.'],
      ['FTP','Transfer files between computers/devices.'],
      ['SMTP','Send email.'],
      ['MIME','Allow non-text/media email attachments to be handled.'],
      ['POP3/4 or IMAP','Receive email from a mail server.'],
      ['DNS','Find the IP address associated with a domain name.'],
    ]}},
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
  scene('h14p-141-email','h14-email-detail','process','EMAIL PROTOCOLS','Sending and receiving email use different protocols',[332,333],{
    teacherNote:'Ask which protocol acts on the sender side and which acts on the recipient side before revealing the labels.',
    richBlock:{kind:'figure',figure:{kind:'sequence',title:'Email path',items:[
      {label:'Sender / client',note:'Creates the message and attachments.'},
      {label:'SMTP + MIME',note:'SMTP sends; MIME supports media/binary attachments.'},
      {label:'Sender ISP mail server'},
      {label:'Internet'},
      {label:'Recipient domain mail server'},
      {label:'POP / IMAP → recipient',note:'The recipient retrieves or synchronises the message.'},
    ]}},
  }),
  scene('h14p-141-pop-imap','h14-pop-imap','compare','EMAIL · POP3/4 VS IMAP','The key difference is synchronisation',[333],{
    richBlock:{kind:'comparison',leftTitle:'POP3/4',rightTitle:'IMAP',rows:[
      ['Does not keep client and server synchronised in the coursebook model.','Keeps client and server synchronised.'],
      ['Downloaded mail is removed from the server in the coursebook model.','A copy is downloaded while the original remains on the server until manually deleted.'],
      ['The downloaded mailbox becomes local to the client.','The server mailbox remains the synchronised reference copy.'],
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
  scene('h14p-141-ethernet','h14-ethernet-frame','visual','LINK LAYER · ETHERNET','An Ethernet frame carries addressing, payload and integrity information',[334,335],{
    richBlock:{kind:'figure',figure:{kind:'bitfield',title:'Typical Ethernet frame',fields:[
      {label:'Pre-amble',bits:'8 bytes'},
      {label:'Start frame',bits:'1 byte'},
      {label:'Destination',bits:'6 bytes',detail:'Destination MAC address.'},
      {label:'Source',bits:'6 bytes',detail:'Source MAC address.'},
      {label:'Type / length',bits:'2 bytes'},
      {label:'Actual message',bits:'46–1500 bytes'},
      {label:'Frame check sequence',bits:'4 bytes',detail:'Includes integrity checking.'},
    ]}},
  }),
  scene('h14p-141-wireless','h14-wireless','compare','LOCAL WIRELESS PROTOCOLS','WiFi, Bluetooth and WiMax use different IEEE protocol families',[335],{
    richBlock:{kind:'table',table:{headers:['Technology','Protocol family','Coursebook focus'],rows:[
      ['WiFi','IEEE 802.11','Uses CSMA/CA with acknowledgement and a random wait before retrying.'],
      ['Bluetooth','IEEE 802.15','Short-range data communication.'],
      ['WiMax','IEEE 802.16','Designed originally for wireless MANs; fixed and mobile variants are described.'],
    ]}},
  }),
  scene('h14p-141-bittorrent','h14-bittorrent-intro','process','PEER-TO-PEER · BITTORRENT','A file is shared as pieces between many peers',[335,336,337],{
    teacherNote:'Build the swarm gradually. First establish tracker metadata, then peers, then piece exchange, then seeds.',
    richBlock:{kind:'figure',figure:{kind:'sequence',title:'BitTorrent process',items:[
      {label:'Create a .torrent file',note:'It contains metadata about the file to be shared.'},
      {label:'Split the file into pieces',note:'Peers can obtain different pieces independently.'},
      {label:'Peers contact the tracker',note:'The tracker stores connection details for peers in the swarm.'},
      {label:'Peers exchange pieces',note:'A peer becomes a source for pieces it already has.'},
      {label:'Completed peers become seeds',note:'They continue making the file/pieces available to others.'},
    ]}},
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
      'Routing depends on current network/routing conditions.',
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
  scene('h14p-142-compare','h14-switching-compare','compare','CIRCUIT VS PACKET','The two switching methods differ in route, order and bandwidth use',[340],{
    richBlock:{kind:'table',table:{headers:['Feature','Circuit switching','Packet switching'],rows:[
      ['Route set up before transmission','Yes','No'],
      ['Dedicated transmission path','Yes','No'],
      ['Same route for all transmitted units','Yes','No'],
      ['Arrival order guaranteed','Yes','Not guaranteed'],
      ['All channel bandwidth reserved','Yes','No'],
      ['Alternative routing after a fault','No for the established circuit','Yes, packets can be rerouted'],
    ]}},
  }),
  scene('h14p-142-hop','h14-hop-checksum-priority','process','PACKET CONTROL · HOP NUMBER','Hop count prevents packets from circulating forever',[340],{
    teacherNote:'Reveal the countdown one router at a time. Before hop 0 appears, ask students to predict what the router must do.',
    richBlock:{kind:'figure',figure:{kind:'sequence',title:'Hop-number countdown',items:[
      {label:'Start · hop 4'},
      {label:'Router 1 · hop 3'},
      {label:'Router 2 · hop 2'},
      {label:'Router 3 · hop 1'},
      {label:'Next router · hop 0',note:'If the destination has not been reached, the packet is deleted.'},
    ]}},
  }),
  scene('h14p-142-header','h14-packet-header','visual','FIGURE 14.9 · PACKET HEADER','The header tells the network where the packet is going and how to handle it',[341],{
    teacherNote:'Do not memorise all bit lengths first. Reveal fields by purpose: addressing → lifetime → ordering → integrity.',
    richBlock:{kind:'figure',figure:{kind:'bitfield',title:'Main TCP/IP packet-header fields',fields:[
      {label:'Source IP address',bits:'32 bits'},
      {label:'Destination IP address',bits:'32 bits'},
      {label:'Hop number',bits:'8 bits'},
      {label:'Packet length',bits:'16 bits'},
      {label:'Number of packets',bits:'16 bits'},
      {label:'Sequence number',bits:'16 bits',detail:'Used to restore the original order.'},
      {label:'Header checksum',bits:'16 bits',detail:'Supports error detection.'},
    ]}},
  }),
  scene('h14p-142-routing','h14-routing-table','process','ROUTERS · ROUTING TABLES','A router reads the destination and chooses the next hop',[341,342],{
    teacherNote:'Model the router as a decision point: destination in header → lookup → compare metrics → choose next hop.',
    richBlock:{kind:'steps',title:'Router decision',items:[
      'Read the destination information in the packet header.',
      'Compare it with the routing table.',
      'Use route information/metrics to identify an efficient path.',
      'Forward the packet to the selected next hop / interface.',
    ]},
  }),
  scene('h14p-142-web-page','h14-example-142','process','WORKED PROCESS · WEB PAGE','Trace one web-page request through packet switching',[343],{
    richBlock:{kind:'steps',title:'From browser request to destination',items:[
      'Divide the web page into data packets.',
      'Put destination IP and control data into each packet header.',
      'At each router compare the header with the routing table.',
      'Choose the next router/hop and forward the packet.',
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
  if(topicCode==='14.1')return PROTOCOLS;
  if(topicCode==='14.2')return SWITCHING;
  return null;
}

export const CHAPTER_14_PRESENTATION_SCENE_COUNT = PROTOCOLS.length + SWITCHING.length;
