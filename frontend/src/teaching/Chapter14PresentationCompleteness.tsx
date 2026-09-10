import type { LessonPresentationBeat } from './lesson-experience-model';

export function Chapter14PresentationCompleteness({beat}:{beat:LessonPresentationBeat}){
  switch(beat.id){
    case 'h14p-141-hook':
      return <aside className="h14v6-source-ribbon"><strong>SOURCE RECALL</strong><span>IP + TCP + protocols</span><i>·</i><span>P2P operation + pros/cons</span><i>·</i><span>stack + queue + uses</span><i>·</i><span>Ethernet + IP conflicts</span><i>·</i><span>DNS + HTTP + status flags</span></aside>;
    case 'h14p-141-ftp-detail':
      return <aside className="h14v6-source-ribbon"><strong>FTP SERVER</strong><span>The FTP server stores files that users can download as required.</span></aside>;
    case 'h14p-141-http':
      return <aside className="h14v6-source-ribbon"><strong>HTTP DETAIL</strong><span>In the source sequence TCP creates packets and sends them via port 80; server TCP sends an acknowledgement once communication is established, then the web server returns the page in HTML format.</span></aside>;
    case 'h14p-141-email-mechanics':
      return <aside className="h14v6-source-ribbon"><strong>BINARY FILE</strong><span>The source describes a binary file here as not text-only, machine-readable but not human-readable; MIME enables media attachments and its header helps the client select the required media player.</span></aside>;
    case 'h14p-141-tcp':
      return <aside className="h14v6-source-ribbon"><strong>TERM</strong><span>Host = a computer or device that can communicate with another host; TCP is often described here as a host-to-host transmission protocol.</span></aside>;
    case 'h14p-141-ethernet-detail':
      return <aside className="h14v6-source-ribbon"><strong>LAN BOUNDARY</strong><span>Ethernet is a local protocol; communication with external devices requires IP above Ethernet.</span></aside>;
    case 'h14p-141-bittorrent':
      return <aside className="h14v6-source-ribbon"><strong>PIECES</strong><span>The source example says a 20 MiB file may be split into 20 × 1 MiB pieces; pieces need not arrive sequentially and are rearranged into the final file.</span></aside>;
    case 'h14p-141-bittorrent-terms':
      return <aside className="h14v6-source-ribbon"><strong>SOURCE-ERA CONTEXT</strong><span>At the time the coursebook was written, it cited BitTorrent at about 12% of video-file sharing and YouTube at about 50%.</span></aside>;
    case 'h14p-142-circuit-stages':
      return <aside className="h14v6-source-ribbon"><strong>APPLICATIONS</strong><span>Public telephone networks</span><i>·</i><span>private telephone networks</span><i>·</i><span>private data networks</span></aside>;
    case 'h14p-142-circuit-route':
      return <aside className="h14v6-source-ribbon"><strong>FIGURE 14.7</strong><span>The dedicated route remains reserved for the duration of communication; the source notes communication proceeds provided device B is not busy.</span></aside>;
    case 'h14p-142-packet-route':
      return <aside className="h14v6-source-ribbon"><strong>ROUTE SELECTION</strong><span>The source links route selection to datagram packets waiting at routers and selection of the shortest available path.</span></aside>;
    case 'h14p-142-header-extended':
      return <aside className="h14v6-source-ribbon"><strong>HEADER-LENGTH EXAMPLE</strong><span>The source gives a header-length value of 6 as 6 × 4 = 24 bytes.</span></aside>;
    case 'h14p-142-routing':
      return <aside className="h14v6-source-ribbon"><strong>FAIL-CLOSED ROUTING</strong><span>If no route can be found, or hop number = 0, Figure 14.10 states that the router deletes the data packet.</span></aside>;
    default:
      return null;
  }
}
