export type Chapter14DeepLiveRequirement={
  page:number;
  label:string;
  requiredAnchors:string[];
  scenes:string[];
};

/**
 * Strong live-projector contract for the supplied Hodder Chapter 14 pp.328–345.
 * This is intentionally stricter than page coverage: a page passes only when
 * its source-significant facts are observable in the live presentation code.
 */
export const CHAPTER_14_DEEP_LIVE_REQUIREMENTS:Chapter14DeepLiveRequirement[]=[
  {page:328,label:'chapter objectives + 14.1 retrieval',scenes:['h14p-141-hook','h14p-141-objectives'],requiredAnchors:['The complete Chapter 14 learning map','WHY PROTOCOLS','STACK IMPLEMENTATION','ROUTER','NETWORK DELIVERY','Five checks before 14.1','IP-address conflicts','status flags']},
  {page:329,label:'key terms + protocol agreement + Figure 14.1 start',scenes:['h14p-141-protocol','h14p-141-stack','h14p-141-units'],requiredAnchors:['DARPA','STACK STRUCTURE','Each of the four layers is implemented using software','PACKET','SEGMENT','HOST-TO-HOST','metadata is data that describes/gives information about other data','peer-to-peer file-sharing community']},
  {page:330,label:'layer implementation + Table 14.1 + terminology',scenes:['h14p-141-stack','h14p-141-units','h14p-141-protocol-map'],requiredAnchors:['DECOMPOSITION','application layer','RIP','SNMP','paging memory management','router connects to many other routers']},
  {page:331,label:'HTTP sequence + FTP browser access',scenes:['h14p-141-http','h14p-141-ftp-detail'],requiredAnchors:['CLIENT / SERVER','MESSAGE FORMAT','port 80','DNS','ftp://username@ftp.example.gov/']},
  {page:332,label:'FTP + SMTP/MIME + POP/IMAP',scenes:['h14p-141-ftp-detail','h14p-141-email-mechanics'],requiredAnchors:['331 Anonymous access allowed','PUSH PROTOCOL','computer/machine-readable rather than human-readable','MIME HEADER','PULL PROTOCOL','SMTP remains used when transferring email between email servers']},
  {page:333,label:'email synchronisation + transport/TCP/PAR/host',scenes:['h14p-141-pop-imap','h14p-141-transport-family','h14p-141-tcp'],requiredAnchors:['IMAP as a more recent protocol','server and client are not kept synchronised','Positive acknowledgement with re-transmission','Hosts can include clients and servers','UDP','SCTP']},
  {page:334,label:'handshake + internet/data-link/physical + Ethernet',scenes:['h14p-141-tcp','h14p-141-ip-link','h14p-141-ethernet-detail'],requiredAnchors:['synchronisation sequence bits','PHYSICAL NETWORK LAYER','communicating between networks','avoid two or more devices transmitting at the same time','FF:FF:FF:FF:FF:FF']},
  {page:335,label:'Ethernet details + wireless + BitTorrent start',scenes:['h14p-141-ethernet-detail','h14p-141-wireless','h14p-141-bittorrent'],requiredAnchors:['advertise services','CSMA/CA','NOT CSMA/CD','additional Bluetooth protocols','wireless MANs (WMAN)','20 MiB → 20 × 1 MiB']},
  {page:336,label:'BitTorrent process + terminology',scenes:['h14p-141-bittorrent','h14p-141-bittorrent-terms'],requiredAnchors:['peer details + IP addresses','more seeds','remain online','LEECH · TWO SOURCE DESCRIPTIONS','AVAILABILITY','SWARM','SEED','SHARE RATIO','LURKER','about 12% BitTorrent']},
  {page:337,label:'Figure 14.6 + 14.2 retrieval/key terms',scenes:['h14p-141-bittorrent-terms','h14p-142-hook','h14p-142-objectives'],requiredAnchors:['12 peers connected','SEED × 6','LEECH × 2','NEW × 3','FIGURE 14.6 LEGEND','Bridge from Chapter 2 to switching','THREE-PACKET ROUTE','ROUTING TABLE']},
  {page:338,label:'circuit switching + Table 14.3 + Figure 14.7',scenes:['h14p-142-circuit-stages','h14p-142-circuit-pros-cons','h14p-142-circuit-route'],requiredAnchors:['Analogue or digital','empty frames','A → R2 → R5 → R8 → R7 → R10 → B','provided device B is not busy','Public telephone networks, private telephone networks and private data networks']},
  {page:339,label:'packet switching + exact Figure 14.8',scenes:['h14p-142-packet-basics','h14p-142-packet-route'],requiredAnchors:['P1 → P4 → P3 → P2','A → R2 → R5 → R8 → R7 → R10 → B','A → R6 → R8 → R9 → R10 → B','A → R2 → R1 → R3 → R4 → R10 → B','A → R6 → R5 → R3 → R7 → R10 → B','number of datagram packets waiting','shortest path available']},
  {page:340,label:'Tables 14.4/14.5 + hopping/checksum/priority',scenes:['h14p-142-packet-pros-cons','h14p-142-compare','h14p-142-hop','h14p-142-packet-control'],requiredAnchors:['distance and duration','Is bandwidth wasted?','bouncing from router to router','network protocol and routing table','checksum or parity check','high priority value indicates which packet queue']},
  {page:341,label:'packet header + routing fields',scenes:['h14p-142-header','h14p-142-header-extended','h14p-142-routing-fields'],requiredAnchors:['IPv4 and IPv6','6 × 4 = 24 bytes','DF = do not fragment','MF = more fragments','NEXT-ROUTER MAC','METRICS','GATEWAY','NETMASK','INTERFACE']},
  {page:342,label:'Figure 14.10 + Example 14.1',scenes:['h14p-142-routing','h14p-142-video-example'],requiredAnchors:['new MAC address is added to the packet header','no route can be found or hop number = 0','picture/sound may lose synchronisation','competing traffic','full bandwidth']},
  {page:343,label:'Example 14.2 + Activity 14A',scenes:['h14p-142-web-page','h14p-142-activity14a'],requiredAnchors:['reassemble packets to rebuild the page','TCP/IP + EMAIL','ETHERNET','BITTORRENT','ROUTING','VoIP']},
  {page:344,label:'End-of-chapter Q1–Q3',scenes:['h14p-142-practice'],requiredAnchors:['Q1 · p.344','Q2 · p.344','Q3 · p.344','9608 · Paper 32 Q3 · November 2015']},
  {page:345,label:'End-of-chapter Q4',scenes:['h14p-142-practice'],requiredAnchors:['Q4 · p.345','hop number/hopping','checksum','headers and routing tables']},
];

export const CHAPTER_14_DEEP_LIVE_PAGES=CHAPTER_14_DEEP_LIVE_REQUIREMENTS.map(item=>item.page);
