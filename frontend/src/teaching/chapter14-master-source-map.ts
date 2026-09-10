export type Chapter14SourceItem={
  id:string;pages:number[];kind:'objective'|'prior'|'term'|'concept'|'table'|'figure'|'example'|'activity'|'exam';label:string;anchors:string[];
};

/** Source-completeness contract for Hodder 9618 Chapter 14, printed pp. 328–345. */
export const CHAPTER_14_MASTER_SOURCE_MAP:Chapter14SourceItem[]=[
  {id:'objectives',pages:[328],kind:'objective',label:'Chapter learning objectives',anchors:['need for protocols','four layers','HTTP','FTP','POP3/4','IMAP','SMTP','BitTorrent','circuit switching','packet switching','router']},
  {id:'prior-141',pages:[328],kind:'prior',label:'14.1 prior knowledge',anchors:['IP and TCP','peer-to-peer','stack','queue','Ethernet','IP conflicts','DNS','HTTP','status flags']},
  {id:'terms-141',pages:[329],kind:'term',label:'14.1 key terms',anchors:['Protocol','Packet','Segment','Push protocol','Binary file','MIME','Pull protocol','Host-to-host','Host','Metadata','Pieces','Tracker','Swarm','Seed','Leech','Lurker']},
  {id:'need-protocols',pages:[329],kind:'concept',label:'Need for protocols',anchors:['agreed by sender and recipient','even or odd parity']},
  {id:'fig-14-1',pages:[329,330],kind:'figure',label:'Figure 14.1 TCP/IP stack',anchors:['APPLICATION LAYER','TRANSPORT LAYER','INTERNET (NETWORK) LAYER','LINK NETWORK','Sending','Receiving','decomposition']},
  {id:'table-14-1',pages:[330],kind:'table',label:'Table 14.1 application protocols',anchors:['HTTP','SMTP','POP3/4','IMAP','DNS','FTP','RIP','SNMP']},
  {id:'packet-names',pages:[330],kind:'concept',label:'Layer data-unit terminology',anchors:['frames','datagrams','segments','each layer adds its own header']},
  {id:'fig-14-2-http',pages:[330,331],kind:'figure',label:'Figure 14.2 HTTP/web resources',anchors:['web server','video server','adverts server','page text','images','video links','advert links','layout of pages']},
  {id:'http-sequence',pages:[331],kind:'concept',label:'HTTP request sequence',anchors:['URL','port 80','DNS server','acknowledgement','HTML format','media player']},
  {id:'ftp',pages:[331,332],kind:'concept',label:'FTP',anchors:['ftp://username@ftp.example.gov/','331 Anonymous access allowed','delete','close','rename','cd','lcd','ftp server','host_name','user id','password']},
  {id:'smtp-mime',pages:[332],kind:'concept',label:'SMTP and MIME',anchors:['text-based','connection-based','push protocol','binary files','MIME header','media player']},
  {id:'fig-14-3-4-email',pages:[332,333],kind:'figure',label:'Figures 14.3 and 14.4 email protocol set-up',anchors:['SMTP/MIME','client’s ISP email server','internet','recipient’s domain email server','POP/IMAP']},
  {id:'table-14-2',pages:[333],kind:'table',label:'Table 14.2 POP3/4 vs IMAP',anchors:['does not keep the server and client in synchronisation','keeps the server and client in synchronisation','original remaining on the server']},
  {id:'transport-tcp',pages:[333,334],kind:'concept',label:'Transport layer and TCP/PAR',anchors:['TCP','UDP','SCTP','positive acknowledgement with re-transmission','host-to-host','synchronisation sequence bits']},
  {id:'ip-link',pages:[334],kind:'concept',label:'Internet/network and data-link layers',anchors:['routing','IP addresses of both sender and recipient','maps IP addresses to MAC','frames']},
  {id:'fig-14-5',pages:[334,335],kind:'figure',label:'Figure 14.5 Ethernet frame',anchors:['Pre-amble','8 bytes','Start frame','Destination','Source','Ethernet type/length','Actual message','Frame check sequence','Interpacket gap','FF:FF:FF:FF:FF:FF','1539','9000']},
  {id:'wireless',pages:[335],kind:'concept',label:'Wireless protocols',anchors:['IEEE 802.11','CSMA/CA','DCF','IEEE 802.15','IEEE 802.16','802.16-2004','802.16-2005']},
  {id:'bittorrent',pages:[335,336,337],kind:'concept',label:'BitTorrent mechanics and terminology',anchors:['torrent','metadata','pieces','20 × 1MiB','tracker','seed','swarm','availability','share ratio','lurker','12%','50%']},
  {id:'fig-14-6',pages:[337],kind:'figure',label:'Figure 14.6 BitTorrent swarm',anchors:['12 peers','six peers are acting as seeds','Two peers are behaving as leeches','three peers have just joined']},
  {id:'prior-142-terms',pages:[337],kind:'prior',label:'14.2 prior knowledge and terms',anchors:['PSTN','VoIP','three packets','Circuit switching','Packet switching','Hop number','Header','Routing table']},
  {id:'table-14-3',pages:[338],kind:'table',label:'Table 14.3 circuit switching pros/cons',anchors:['dedicated','whole of the bandwidth','same order','real-time','not very flexible','no alternative routing','greater bandwidth','establish a link']},
  {id:'fig-14-7',pages:[338],kind:'figure',label:'Figure 14.7 circuit route',anchors:['A–R2','R2–R5','R5–R8','R8–R7','R7–R10','R10–B','provided B is not busy','public telephone networks','private data networks']},
  {id:'fig-14-8',pages:[339],kind:'figure',label:'Figure 14.8 packet switching',anchors:['four packets','each packet follows its own path','shortest path available','different order','reassembled']},
  {id:'table-14-4-5',pages:[340],kind:'table',label:'Tables 14.4 and 14.5 packet/circuit comparison',anchors:['re-routing','re-send','real-time data streams','share its bandwidth','reassembled','RAM','dedicated transmission path']},
  {id:'hop-check-priority',pages:[340],kind:'concept',label:'Hop number, checksum/parity and priority',anchors:['hop number','decreased by 1','deleted','checksum','re-send','priority value','packet queue']},
  {id:'fig-14-9-header',pages:[341],kind:'figure',label:'Figure 14.9 packet header',anchors:['source computer','destination computer','current hop number','length of packet','number of packets','sequence number','checksum value','DF','MF','fragmentation offset','6 × 4 = 24bytes']},
  {id:'routing-table',pages:[341,342],kind:'concept',label:'Routing tables and Figure 14.10',anchors:['number of hops','MAC address of the next router','metrics','network destination','gateway','netmask','interface','no route can be found','hop number = 0']},
  {id:'example-14-1',pages:[342],kind:'example',label:'Example 14.1 video conferencing',anchors:['synchronisation','pauses','degraded quality','drop out','only one route','full bandwidth']},
  {id:'example-14-2',pages:[343],kind:'example',label:'Example 14.2 web page by packet switching',anchors:['divided up into data packets','destination','routing table','MAC address of the next router','hop value','different route','reassembles']},
  {id:'activity-14a',pages:[343],kind:'activity',label:'Activity 14A',anchors:['four layers','SMTP and MIME','Ethernet frame','peer','swarm','tracker','leech','seed','packet header and a routing table','VoIP']},
  {id:'eoc',pages:[344,345],kind:'exam',label:'End-of-chapter questions 1–4',anchors:['Question 1','Question 2','Question 3','Question 4','circuit switching','packet switching','hop number','checksum','routing tables']},
];

export const CHAPTER_14_MASTER_PRINTED_PAGES=Array.from({length:18},(_,index)=>328+index);
export const chapter14SourcePagesCovered=()=>[...new Set(CHAPTER_14_MASTER_SOURCE_MAP.flatMap(item=>item.pages))].sort((a,b)=>a-b);
