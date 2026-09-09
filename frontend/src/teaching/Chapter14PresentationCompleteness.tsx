import type { LessonPresentationBeat } from './lesson-experience-model';

export function Chapter14PresentationCompleteness({beat}:{beat:LessonPresentationBeat}){
  switch(beat.id){
    case 'h14p-141-hook':
      return <aside className="h14v6-source-ribbon"><strong>SOURCE RECALL</strong><span>IP + TCP + protocols</span><i>·</i><span>P2P operation + pros/cons</span><i>·</i><span>stack + queue + uses</span><i>·</i><span>Ethernet + IP conflicts</span><i>·</i><span>DNS + HTTP + status flags</span></aside>;
    case 'h14p-141-http':
      return <aside className="h14v6-source-ribbon"><strong>HTTP DETAIL</strong><span>The source also states that server TCP sends an acknowledgement once the connection is established, before the web page is returned in HTML format.</span></aside>;
    case 'h14p-141-tcp':
      return <aside className="h14v6-source-ribbon"><strong>TERM</strong><span>Host = a computer or device that can communicate with another host; TCP is often described here as a host-to-host transmission protocol.</span></aside>;
    case 'h14p-141-bittorrent-terms':
      return <aside className="h14v6-source-ribbon"><strong>SOURCE-ERA CONTEXT</strong><span>At the time the coursebook was written, it cited BitTorrent at about 12% of video-file sharing and YouTube at about 50%.</span></aside>;
    case 'h14p-142-circuit-stages':
      return <aside className="h14v6-source-ribbon"><strong>APPLICATIONS</strong><span>Public telephone networks</span><i>·</i><span>private telephone networks</span><i>·</i><span>private data networks</span></aside>;
    case 'h14p-142-packet-route':
      return <aside className="h14v6-source-ribbon"><strong>ROUTE SELECTION</strong><span>The source links route selection to datagram packets waiting at routers and selection of the shortest available path.</span></aside>;
    default:
      return null;
  }
}
