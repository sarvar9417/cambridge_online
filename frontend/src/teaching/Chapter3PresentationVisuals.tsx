import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter3-presentation-visuals.css';

export const CHAPTER_3_VISUAL_IDS = [
  'h3-311-memory-map',
  'h3-311-primary-tree',
  'h3-311-dram-sram',
  'h3-311-embedded',
  'h3-311-hdd',
  'h3-311-ssd',
] as const;

export function hasChapter3PresentationVisual(beat: LessonPresentationBeat) {
  return CHAPTER_3_VISUAL_IDS.includes(beat.slideId as never);
}

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

export function Chapter3PresentationVisual({ beat }: { beat: LessonPresentationBeat; reveal: number }) {
  switch (beat.slideId) {
    case 'h3-311-memory-map': return <MemoryMap />;
    case 'h3-311-primary-tree': return <PrimaryTree />;
    case 'h3-311-dram-sram': return <DramSram />;
    case 'h3-311-embedded': return <Embedded />;
    case 'h3-311-hdd': return <Hdd />;
    case 'h3-311-ssd': return <Ssd />;
    default: return null;
  }
}
