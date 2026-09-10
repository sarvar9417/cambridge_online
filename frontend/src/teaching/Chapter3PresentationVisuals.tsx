import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter3-presentation-visuals.css';

export const CHAPTER_3_VISUAL_IDS = [
  'h3-311-memory-map',
  'h3-311-primary-tree',
  'h3-311-dram-sram',
  'h3-311-embedded',
  'h3-311-hdd',
  'h3-311-ssd',
  'h3-311-optical-spiral',
  'h3-311-dvd-dual-layer',
  'h3-311-optical-compare',
  'h3-312-laser-printer',
] as const;

export function hasChapter3PresentationVisual(beat: LessonPresentationBeat) {
  return CHAPTER_3_VISUAL_IDS.includes(beat.slideId as never);
}

const revealStyle=(reveal:number,step:number)=>({
  opacity:reveal>=step?1:.18,
  transform:reveal>=step?'translateY(0)':'translateY(18px)',
  transition:'opacity 220ms ease, transform 220ms ease',
});

function MemoryMap() {
  return <div className="h3v h3v-map" aria-label="Hodder Figure 3.2 memory and storage devices reconstruction">
    <div className="h3v-root">MEMORY + STORAGE</div>
    <div className="h3v-branches">
      <section><header>PRIMARY MEMORY</header><div className="h3v-chiprow"><b>RAM</b><b>ROM</b></div><small>directly accessible from CPU</small></section>
      <section><header>SECONDARY STORAGE</header><div className="h3v-chiprow"><b>HDD</b><b>SSD</b><b>REMOVABLE</b></div><small>DVD · CD · Blu-ray · flash memory stick · hard disk drive</small></section>
    </div>
  </div>;
}

function PrimaryTree() {
  return <div className="h3v h3v-tree" aria-label="Hodder Figure 3.3 structure of primary memory reconstruction">
    <div className="h3v-root">PRIMARY MEMORY</div>
    <div className="h3v-branches">
      <section><header>RAM</header><div className="h3v-chiprow"><b>SRAM</b><b>DRAM</b></div><small>volatile · read + write</small></section>
      <section><header>ROM</header><div className="h3v-chiprow"><b>PROM</b><b>EPROM</b><b>EEPROM</b></div><small>non-volatile family</small></section>
    </div>
  </div>;
}

function DramSram() {
  return <div className="h3v h3v-compare" aria-label="Hodder Table 3.1 DRAM and SRAM comparison">
    <section><header>DRAM</header><strong>capacitors + transistors</strong><span>refresh every 15 μs</span><span>typically 60 ns access</span><span>higher capacity</span><span>less expensive</span><footer>MAIN MEMORY</footer></section>
    <div className="h3v-vs">VS</div>
    <section><header>SRAM</header><strong>flip-flops</strong><span>no constant refresh</span><span>typically 25 ns access</span><span>faster data access</span><span>used where speed matters</span><footer>PROCESSOR CACHE</footer></section>
  </div>;
}

function Embedded() {
  return <div className="h3v h3v-embedded" aria-label="Hodder Table 3.3 embedded systems pros and cons reconstruction">
    <div className="h3v-device"><span>APP / WEB</span><i>→</i><b>MICROPROCESSOR</b><i>→</i><span>DEVICE</span></div>
    <div className="h3v-branches">
      <section><header>PROS</header><p>small · low cost · low power · real-time reaction · dedicated task · mass-production reliability</p></section>
      <section><header>CONS</header><p>difficult upgrades · specialist fault-finding · confusing interfaces · internet attack surface · waste when repair is impractical</p></section>
    </div>
  </div>;
}

function Hdd() {
  return <div className="h3v h3v-hdd" aria-label="Hodder Figure 3.6 hard disk tracks and sectors reconstruction">
    <div className="h3v-platter"><span className="track t1"/><span className="track t2"/><span className="track t3"/><span className="sector">SECTOR</span><span className="head">READ/WRITE HEAD</span></div>
    <section><b>MAGNETIC PLATTER</b><span>tracks</span><span>sectors</span><span>direct access</span><span>latency = rotation delay</span><span>fragmentation can slow access</span></section>
  </div>;
}

function Ssd() {
  return <div className="h3v h3v-ssd" aria-label="Hodder solid state drive NAND and EEPROM comparison">
    <section><header>FLASH MEMORY</header><b>NAND</b><span>blocks read / erased</span><span>lower cost</span><span>common SSD technology</span></section>
    <div className="h3v-core">NO MOVING PARTS<small>fast · light · thin · cool · lower power</small></div>
    <section><header>EEPROM</header><b>NOR</b><span>single bytes can be read / erased</span><span>faster operation</span><span>considerably more expensive</span></section>
  </div>;
}

function OpticalSpiral({reveal}:{reveal:number}) {
  return <div className="h3v h3v-optical" aria-label="Hodder Figure 3.7 CDs and DVDs use a single spiral track reconstruction">
    <div className="h3v-disc" style={revealStyle(reveal,1)}>
      <svg viewBox="0 0 420 420" role="img" aria-label="single spiral track from centre to outer part of optical disk">
        <circle cx="210" cy="210" r="190" className="h3v-disc-edge"/>
        <path className="h3v-spiral" d="M210 210 C238 190 264 214 252 242 C235 280 174 273 159 229 C139 169 194 121 252 137 C329 158 342 255 289 309 C220 379 99 342 64 245 C22 127 121 28 244 35 C349 41 409 127 399 222"/>
        <circle cx="210" cy="210" r="17" className="h3v-hub"/>
        <g className="h3v-pits"><circle cx="251" cy="239" r="5"/><circle cx="174" cy="225" r="5"/><circle cx="288" cy="307" r="5"/><circle cx="102" cy="305" r="5"/><circle cx="359" cy="113" r="5"/></g>
      </svg>
      <b>SINGLE SPIRAL TRACK</b><small>centre → outer edge</small>
    </div>
    <div className="h3v-optical-notes">
      <section style={revealStyle(reveal,2)}><header>LASER</header><p>reads and writes pits / bumps on the disk surface</p></section>
      <section style={revealStyle(reveal,3)}><header>SECTORS</header><p>allow direct access to data</p></section>
      <section style={revealStyle(reveal,4)}><header>R / RW</header><p>R = write once · RW = write/read many times</p></section>
    </div>
  </div>;
}

function DvdDualLayer({reveal}:{reveal:number}) {
  return <div className="h3v h3v-dual" aria-label="Hodder Figure 3.8 dual layering in a DVD reconstruction">
    <div className="h3v-layer-stack" style={revealStyle(reveal,1)}>
      <div className="h3v-layer"><b>FIRST RECORDING LAYER</b><small>polycarbonate layer</small></div>
      <div className="h3v-reflector">VERY THIN REFLECTOR</div>
      <div className="h3v-layer"><b>SECOND RECORDING LAYER</b><small>polycarbonate layer</small></div>
      <div className="h3v-beams"><span>↗ laser reads layer 1</span><span>↗ laser reads layer 2</span></div>
    </div>
    <div className="h3v-wavelengths">
      <section style={revealStyle(reveal,2)}><header>CD</header><strong>780 nm</strong><span>red laser</span></section>
      <div className="h3v-shorter" style={revealStyle(reveal,3)}>SHORTER λ → SMALLER PITS / TRACKS → MORE CAPACITY</div>
      <section style={revealStyle(reveal,4)}><header>DVD</header><strong>650 nm</strong><span>red laser</span></section>
    </div>
  </div>;
}

const opticalMedia=[
  {name:'CD',laser:'red',wavelength:'780 nm',construction:'single 1.2 mm polycarbonate layer',pitch:'1.60 µm'},
  {name:'DVD',laser:'red',wavelength:'650 nm',construction:'two 0.6 mm polycarbonate layers',pitch:'0.74 µm'},
  {name:'Blu-ray',laser:'blue',wavelength:'405 nm',construction:'single 1.1 mm polycarbonate layer',pitch:'0.30 µm'},
] as const;

function OpticalCompare({reveal}:{reveal:number}) {
  return <div className="h3v h3v-optical-compare" aria-label="Hodder Table 3.4 main differences between CDs DVDs and Blu-ray reconstruction">
    <div className="h3v-media-grid">
      {opticalMedia.map((medium,index)=><section key={medium.name} style={revealStyle(reveal,index+1)}>
        <header>{medium.name}</header>
        <strong>{medium.wavelength}</strong>
        <span>laser: {medium.laser}</span>
        <span>{medium.construction}</span>
        <footer>track pitch <b>{medium.pitch}</b></footer>
      </section>)}
    </div>
    <div className="h3v-media-rule" style={revealStyle(reveal,4)}><b>780 → 650 → 405 nm</b><span>track pitch: 1.60 → 0.74 → 0.30 µm</span><small>Blu-ray: up to five times more data than DVD · single-layer construction avoids DVD birefringence</small></div>
  </div>;
}

const laserStages=[
  {label:'1–4 · PREPARE',text:'document → printer driver → printer availability check → printer buffer'},
  {label:'5–6 · IMAGE',text:'positive drum → laser removes charge in image areas → positive toner sticks to negative areas'},
  {label:'7–9 · TRANSFER',text:'negative paper rolls over drum → toner transfers → paper charge is removed'},
  {label:'10–11 · FIX + RESET',text:'heated fuser rollers melt/fix toner → discharge lamp removes drum charge'},
] as const;

function LaserPrinter({reveal}:{reveal:number}) {
  return <div className="h3v h3v-laser" aria-label="Hodder Table 3.5 eleven-stage laser printer sequence reconstruction">
    <div className="h3v-print-flow">
      {laserStages.map((group,index)=><section key={group.label} style={revealStyle(reveal,index+1)}><header>{group.label}</header><p>{group.text}</p>{index<laserStages.length-1&&<i>→</i>}</section>)}
    </div>
    <div className="h3v-print-machine" style={revealStyle(reveal,4)}>
      <span>PRINTER BUFFER</span><b>LASER → PRINTING DRUM + TONER</b><span>PAPER → FUSER</span><small>DISCHARGE LAMP → drum ready for next page</small>
    </div>
  </div>;
}

export function Chapter3PresentationVisual({ beat, reveal }: { beat: LessonPresentationBeat; reveal: number }) {
  switch (beat.slideId) {
    case 'h3-311-memory-map': return <MemoryMap />;
    case 'h3-311-primary-tree': return <PrimaryTree />;
    case 'h3-311-dram-sram': return <DramSram />;
    case 'h3-311-embedded': return <Embedded />;
    case 'h3-311-hdd': return <Hdd />;
    case 'h3-311-ssd': return <Ssd />;
    case 'h3-311-optical-spiral': return <OpticalSpiral reveal={reveal}/>;
    case 'h3-311-dvd-dual-layer': return <DvdDualLayer reveal={reveal}/>;
    case 'h3-311-optical-compare': return <OpticalCompare reveal={reveal}/>;
    case 'h3-312-laser-printer': return <LaserPrinter reveal={reveal}/>;
    default: return null;
  }
}
