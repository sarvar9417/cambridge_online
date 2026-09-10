import type { LessonPresentationBeat } from './lesson-experience-model';

const visible=(reveal:number,step:number)=>reveal>=step?'is-visible':'';

type Props={beat:LessonPresentationBeat;reveal:number};

export function Chapter14EndOfChapterMaster({beat,reveal}:Props){
  if(beat.id!=='h14p-142-practice')return null;
  const groups=[
    {
      label:'Q1 · PROTOCOLS + P2P',
      title:'Connect the Chapter 14 vocabulary',
      text:'Match lurker, leech, seed, tracker and BitTorrent to their descriptions; complete the TCP/IP layers; then describe protocols used to send and receive email.',
      pages:'p.344',
    },
    {
      label:'Q2 · ETHERNET + BITTORRENT',
      title:'Move from frame anatomy to file sharing',
      text:'Complete the Ethernet-data section, state what metadata means, and describe how BitTorrent shares files between peers.',
      pages:'p.344',
    },
    {
      label:'Q3 · SWITCHING',
      title:'Apply switching to real communication',
      text:'Explain circuit switching, justify why it can suit video conferencing, then explain how a web page is transferred using packet switching.',
      pages:'p.344',
    },
    {
      label:'Q4 · ROUTING + CONTROL',
      title:'Finish with the highest-integration question',
      text:'Classify circuit/packet-switching statements, explain hop number and checksum, then describe how packet headers and routing tables route packets efficiently.',
      pages:'p.345',
    },
  ];
  return <div className="h14eoc" aria-label="Chapter 14 end-of-chapter Questions 1 to 4">
    <div className="h14eoc-spine" aria-hidden="true"/>
    {groups.map((group,index)=><section key={group.label} className={visible(reveal,index+1)}>
      <header><span>{group.label}</span><small>{group.pages}</small></header>
      <strong>{group.title}</strong>
      <p>{group.text}</p>
    </section>)}
    <footer className={visible(reveal,4)}>
      <b>CAMBRIDGE TRANSFER</b>
      <span>Do not memorise isolated definitions only. The final question combines switching, packet control and routing in one explanation.</span>
    </footer>
  </div>;
}
