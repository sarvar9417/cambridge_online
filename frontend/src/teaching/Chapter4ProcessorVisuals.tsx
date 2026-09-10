import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter4-processor-visuals.css';

export const CHAPTER_4_PROCESSOR_VISUAL_IDS = [
  'h4-411-von-neumann',
  'h4-412-cpu-components',
  'h4-413-registers',
  'h4-413-status-flags',
  'h4-414-system-buses',
  'h4-414-performance',
  'h4-415-ports-usb',
] as const;

export function hasChapter4ProcessorVisual(beat: LessonPresentationBeat) {
  return CHAPTER_4_PROCESSOR_VISUAL_IDS.includes(beat.slideId as never);
}

const revealStyle = (reveal: number, step: number) => ({
  opacity: reveal >= step ? 1 : 0.14,
  transform: reveal >= step ? 'translateY(0)' : 'translateY(14px)',
  transition: 'opacity 220ms ease, transform 220ms ease',
});

function VonNeumann({ reveal }: { reveal: number }) {
  return <div className="h4pv h4pv-vn" aria-label="Hodder Figure 4.1 Von Neumann architecture reconstruction">
    <div className="h4pv-bus h4pv-address" style={revealStyle(reveal, 1)}><b>ADDRESS BUS</b><span>CPU → memory</span></div>
    <section className="h4pv-cpu" style={revealStyle(reveal, 2)}>
      <header>CPU</header>
      <div className="h4pv-cu"><b>CONTROL UNIT (CU)</b><span>PC · CIR · system clock</span></div>
      <div className="h4pv-alu"><b>ARITHMETIC AND LOGIC UNIT (ALU)</b><span>ACC · status registers</span></div>
      <small>MAR sends an address · MDR carries data</small>
    </section>
    <section className="h4pv-memory" style={revealStyle(reveal, 3)}><b>MEMORY</b><span>programs + data</span><small>stored-program concept</small></section>
    <div className="h4pv-bus h4pv-data" style={revealStyle(reveal, 4)}><b>DATA BUS</b><span>CPU ↔ memory</span></div>
    <div className="h4pv-bus h4pv-control" style={revealStyle(reveal, 4)}><b>CONTROL BUS</b><span>synchronising signals</span></div>
  </div>;
}

function CpuComponents({ reveal }: { reveal: number }) {
  const items = [
    ['ALU', 'arithmetic + logic', 'ACC holds temporary calculation values'],
    ['CU', 'read + interpret instruction', 'control signals synchronise components'],
    ['SYSTEM CLOCK', 'timing signals', 'keeps operations synchronised'],
    ['IAS', 'data + programs needed now', 'primary (RAM) memory'],
  ] as const;
  return <div className="h4pv h4pv-components" aria-label="Hodder processor components visual summary">
    {items.map((item, index) => <section key={item[0]} style={revealStyle(reveal, index + 1)}><strong>{item[0]}</strong><b>{item[1]}</b><span>{item[2]}</span></section>)}
    <div className="h4pv-shift" style={revealStyle(reveal, 4)}><code>00110111 ≪ 2 → 11011100</code><small>Hodder example: ×4</small></div>
  </div>;
}

function Registers({ reveal }: { reveal: number }) {
  const registers = [
    ['PC', 'next instruction address'], ['MAR', 'address being read / written'], ['MDR / MBR', 'data just read / about to write'],
    ['CIR', 'instruction being decoded / executed'], ['IX', 'index addressing'], ['SR', 'operation flags'],
  ] as const;
  return <div className="h4pv h4pv-registers" aria-label="Hodder Table 4.1 common registers visual summary">
    <div className="h4pv-register-bank">
      {registers.map((item, index) => <section key={item[0]} style={revealStyle(reveal, Math.floor(index / 2) + 1)}><b>{item[0]}</b><span>{item[1]}</span></section>)}
    </div>
    <footer style={revealStyle(reveal, 4)}><b>REGISTER BANK</b><span>temporary processor storage · general purpose or special purpose</span></footer>
  </div>;
}

function StatusFlags({ reveal }: { reveal: number }) {
  const flags = [['N', 'negative'], ['V', 'overflow'], ['C', 'carry'], ['Z', 'zero']] as const;
  return <div className="h4pv h4pv-flags" aria-label="Hodder status register NVCZ examples">
    <div className="h4pv-flag-row">{flags.map((item, index) => <section key={item[0]} style={revealStyle(reveal, 1)}><b>{item[0]}</b><span>{item[1]}</span></section>)}</div>
    <div className="h4pv-sum" style={revealStyle(reveal, 2)}><code>01110111 + 00111000</code><strong>10101111</strong><span>NVCZ = 1100</span></div>
    <div className="h4pv-sum" style={revealStyle(reveal, 3)}><code>10001000 + 11000111</code><strong>101001111</strong><span>NVCZ = 0110</span></div>
    <aside style={revealStyle(reveal, 4)}><b>EXTENSION 4A</b><span>parity P · interrupt I · zero Z · half-carry H</span></aside>
  </div>;
}

function SystemBuses({ reveal }: { reveal: number }) {
  return <div className="h4pv h4pv-buses" aria-label="Hodder Figure 4.2 system buses reconstruction">
    <div className="h4pv-nodes" style={revealStyle(reveal, 1)}><b>CPU</b><b>MEMORY</b><b>I/O PORTS</b></div>
    <section className="h4pv-line address" style={revealStyle(reveal, 2)}><strong>ADDRESS BUS →</strong><span>unidirectional CPU → memory</span><small>16-bit → 65 536 locations</small></section>
    <section className="h4pv-line data" style={revealStyle(reveal, 3)}><strong>← DATA BUS →</strong><span>bidirectional</span><small>width sets transferable word length</small></section>
    <section className="h4pv-line control" style={revealStyle(reveal, 4)}><strong>← CONTROL BUS →</strong><span>bidirectional control signals</span><small>usually 8 bits wide in the source</small></section>
  </div>;
}

function Performance({ reveal }: { reveal: number }) {
  return <div className="h4pv h4pv-performance" aria-label="Hodder Figure 4.3 processor performance factors">
    <div className="h4pv-clock" style={revealStyle(reveal, 1)}><b>3.5 GHz</b><span>3.5 billion clock cycles / second</span><small>clock speed alone ≠ overall performance</small></div>
    <div className="h4pv-perf-grid">
      <section style={revealStyle(reveal, 2)}><strong>BUS WIDTH</strong><span>address + data buses</span></section>
      <section style={revealStyle(reveal, 2)}><strong>OVERCLOCKING</strong><span>instability + overheating risk</span></section>
      <section style={revealStyle(reveal, 3)}><strong>CACHE</strong><span>SRAM · frequently used instructions/data</span></section>
      <section style={revealStyle(reveal, 3)}><strong>CORES</strong><span>more cores help, but communication adds overhead</span></section>
    </div>
    <div className="h4pv-cores" style={revealStyle(reveal, 4)}><span>●──● <b>2 cores · 1 channel</b></span><span>●╲╱●<br/>●╱╲● <b>4 cores · 6 channels</b></span></div>
  </div>;
}

function PortsUsb({ reveal }: { reveal: number }) {
  return <div className="h4pv h4pv-ports" aria-label="Hodder Figure 4.4 ports and USB sequence">
    <div className="h4pv-port-types" style={revealStyle(reveal, 1)}><section><b>USB</b><span>asynchronous serial</span></section><section><b>HDMI</b><span>port</span></section><section><b>VGA</b><span>port</span></section></div>
    <div className="h4pv-usb-wire" style={revealStyle(reveal, 2)}><strong>4-WIRE SHIELDED USB CABLE</strong><span>2 × power / earth</span><span>2 × data transmission</span></div>
    <div className="h4pv-usb-flow">
      <section style={revealStyle(reveal, 3)}><b>1</b><span>voltage change → device detected</span></section><i>→</i>
      <section style={revealStyle(reveal, 3)}><b>2</b><span>device recognised → driver loaded</span></section><i>→</i>
      <section style={revealStyle(reveal, 4)}><b>3</b><span>new device → find driver or prompt download</span></section>
    </div>
  </div>;
}

export function Chapter4ProcessorVisual({ beat, reveal }: { beat: LessonPresentationBeat; reveal: number }) {
  switch (beat.slideId) {
    case 'h4-411-von-neumann': return <VonNeumann reveal={reveal}/>;
    case 'h4-412-cpu-components': return <CpuComponents reveal={reveal}/>;
    case 'h4-413-registers': return <Registers reveal={reveal}/>;
    case 'h4-413-status-flags': return <StatusFlags reveal={reveal}/>;
    case 'h4-414-system-buses': return <SystemBuses reveal={reveal}/>;
    case 'h4-414-performance': return <Performance reveal={reveal}/>;
    case 'h4-415-ports-usb': return <PortsUsb reveal={reveal}/>;
    default: return null;
  }
}
