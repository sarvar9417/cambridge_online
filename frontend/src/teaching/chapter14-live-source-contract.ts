export type Chapter14LiveSourceContractItem={
  pages:number[];
  source:string;
  scenes:string[];
};

/**
 * Contract between the supplied Hodder pp.328–345 and the live projector deck.
 * A page is counted only when its source-significant teaching content appears in
 * the presentation experience, not merely in study notes or a hidden audit file.
 */
export const CHAPTER_14_LIVE_SOURCE_CONTRACT:Chapter14LiveSourceContractItem[]=[
  {pages:[328],source:'14.1 chapter objectives + five prior-knowledge checks',scenes:['h14p-141-hook','h14p-141-objectives']},
  {pages:[329],source:'14.1 key terms + need for protocols + parity agreement + Figure 14.1 begins',scenes:['h14p-141-protocol','h14p-141-stack','h14p-141-units']},
  {pages:[330],source:'TCP/IP direction/decomposition + application layer + Table 14.1 + packet/router terminology',scenes:['h14p-141-stack','h14p-141-units','h14p-141-protocol-map']},
  {pages:[331],source:'Figure 14.2 + HTTP client/server/message format/request sequence + FTP browser address',scenes:['h14p-141-http','h14p-141-ftp-detail']},
  {pages:[332],source:'FTP details + SMTP/push + binary files/MIME + POP/IMAP/pull + Figure 14.3',scenes:['h14p-141-ftp-detail','h14p-141-email','h14p-141-email-mechanics']},
  {pages:[333],source:'Figure 14.4 email setup + POP vs IMAP + transport layer + TCP/PAR/host-to-host',scenes:['h14p-141-email','h14p-141-pop-imap','h14p-141-transport-family','h14p-141-tcp']},
  {pages:[334],source:'TCP handshake + internet/data-link/physical network layers + IP functions + Figure 14.5',scenes:['h14p-141-tcp','h14p-141-ip-link','h14p-141-ethernet']},
  {pages:[335],source:'Ethernet field details + CSMA/CA/DCF + Bluetooth + WiMax + BitTorrent introduction',scenes:['h14p-141-ethernet-detail','h14p-141-wireless','h14p-141-bittorrent']},
  {pages:[336],source:'BitTorrent tracker/pieces/peers + availability/seed/leech/lurker/share ratio + Figure 14.6 setup',scenes:['h14p-141-bittorrent','h14p-141-bittorrent-terms']},
  {pages:[337],source:'Figure 14.6 + 14.2 prior knowledge + switching/header/routing key terms',scenes:['h14p-141-bittorrent-terms','h14p-142-hook','h14p-142-objectives']},
  {pages:[338],source:'circuit switching definition/stages + Table 14.3 + Figure 14.7 route + main uses',scenes:['h14p-142-circuit-stages','h14p-142-circuit-route','h14p-142-circuit-pros-cons']},
  {pages:[339],source:'packet switching definition + queue-load routing + shortest available path + Figure 14.8 four packets',scenes:['h14p-142-packet-basics','h14p-142-packet-route']},
  {pages:[340],source:'Table 14.4 + Table 14.5 + hopping + checksum/parity + priority queue',scenes:['h14p-142-packet-pros-cons','h14p-142-compare','h14p-142-hop','h14p-142-packet-control']},
  {pages:[341],source:'Figure 14.9 packet header + extended header fields + routing-table fields',scenes:['h14p-142-header','h14p-142-header-extended','h14p-142-routing-fields']},
  {pages:[342],source:'Figure 14.10 router decision + Example 14.1 video conferencing',scenes:['h14p-142-routing','h14p-142-video-example']},
  {pages:[343],source:'Example 14.2 web-page packet switching + Activity 14A',scenes:['h14p-142-web-page','h14p-142-activity14a']},
  {pages:[344],source:'End-of-chapter Questions 1–3',scenes:['h14p-142-practice']},
  {pages:[345],source:'End-of-chapter Question 4: switching, hopping, checksum, headers and routing tables',scenes:['h14p-142-practice']},
];

export const CHAPTER_14_LIVE_PRINTED_PAGES=Array.from({length:18},(_,index)=>328+index);

export function chapter14LivePagesCovered(){
  return [...new Set(CHAPTER_14_LIVE_SOURCE_CONTRACT.flatMap(item=>item.pages))].sort((a,b)=>a-b);
}
