import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter4-fetch-assembly-visuals.css';

export const CHAPTER_4_FETCH_ASSEMBLY_VISUAL_IDS = [
  'h4-415-ports-compare',
  'h4-416-fetch-cycle',
  'h4-416-rtn',
  'h4-416-interrupt-cycle',
  'h4-417-interrupts',
  'h4-41-activity4a',
  'h4-42-prior-keyterms',
  'h4-421-machine-assembly',
  'h4-422-two-pass-assembler',
] as const;

export function hasChapter4FetchAssemblyVisual(beat: LessonPresentationBeat) {
  return CHAPTER_4_FETCH_ASSEMBLY_VISUAL_IDS.includes(beat.slideId as never);
}

const revealStyle = (reveal: number, step: number) => ({
  opacity: reveal >= step ? 1 : 0.12,
  transform: reveal >= step ? 'translateY(0)' : 'translateY(14px)',
  transition: 'opacity 220ms ease, transform 220ms ease',
});

function PortsCompare({ reveal }: { reveal: number }) {
  return <div className="h4fa h4fa-ports" aria-label="Hodder Tables 4.2 and 4.3 USB HDMI VGA comparison">
    <div className="h4fa-port-head" style={revealStyle(reveal, 1)}><b>USB</b><b>HDMI</b><b>VGA</b></div>
    <section style={revealStyle(reveal, 2)}><strong>USB</strong><span>auto detection · one-way connector · backward compatibility</span><small>&lt;500 megabits/s · about 5 m cable</small></section>
    <section style={revealStyle(reveal, 3)}><strong>HDMI</strong><span>digital audio + visual · 16:9 · 1920 × 1080 · 120 Hz</span><small>~10 gigabits/s · HDCP authentication</small></section>
    <section style={revealStyle(reveal, 4)}><strong>VGA</strong><span>analogue · 640 × 480 · up to 60 Hz with 16 colours</span><small>200 × 320 → up to 256 colours</small></section>
  </div>;
}

function FetchCycle({ reveal }: { reveal: number }) {
  const steps = [
    ['PC', 'next instruction address'],
    ['MAR', 'PC → MAR via address bus'],
    ['MDR', 'memory contents → MDR'],
    ['CIR', 'MDR → CIR'],
    ['PC + 1', 'increment program counter'],
    ['DECODE → EXECUTE', 'control signals to components'],
  ] as const;
  return <div className="h4fa h4fa-cycle" aria-label="Hodder Figure 4.5 fetch execute cycle reconstruction">
    {steps.map((step, index) => <section key={step[0]} style={revealStyle(reveal, Math.min(index + 1, 4))}><b>{step[0]}</b><span>{step[1]}</span>{index < steps.length - 1 && <i>→</i>}</section>)}
    <aside style={revealStyle(reveal, 4)}><strong>cycle boundary</strong><span>any interrupts to service?</span></aside>
  </div>;
}

function Rtn({ reveal }: { reveal: number }) {
  const rows = [
    ['MAR ← [PC]', 'PC contents copied into MAR'],
    ['PC ← [PC] + 1', 'PC incremented'],
    ['MDR ← [[MAR]]', 'data at address held in MAR copied into MDR'],
    ['CIR ← [MDR]', 'MDR contents copied into CIR'],
  ] as const;
  return <div className="h4fa h4fa-rtn" aria-label="Hodder Register Transfer Notation p117">
    {rows.map((row, index) => <section key={row[0]} style={revealStyle(reveal, index + 1)}><code>{row[0]}</code><span>{row[1]}</span></section>)}
    <aside style={revealStyle(reveal, 4)}><b>[[MAR]]</b><span>follow the address, then read the data stored there</span></aside>
  </div>;
}

function InterruptCycle({ reveal }: { reveal: number }) {
  return <div className="h4fa h4fa-interrupt-cycle" aria-label="Hodder Figure 4.6 interrupt process during fetch execute">
    <div className="h4fa-register-change" style={revealStyle(reveal, 1)}><code>0000 0000</code><i>→ hard-drive write fault →</i><code>0000 1000</code></div>
    <div className="h4fa-interrupt-flow">
      <section style={revealStyle(reveal, 2)}><b>FETCH</b><span>check interrupt register</span></section>
      <i>→</i><section style={revealStyle(reveal, 2)}><b>EXECUTE</b><span>decoded instruction</span></section>
      <i>→</i><section style={revealStyle(reveal, 3)}><b>INTERRUPT?</b><span>priority checked</span></section>
      <i>→</i><section style={revealStyle(reveal, 4)}><b>ISR</b><span>suspend task · service · restore</span></section>
    </div>
  </div>;
}

function Interrupts({ reveal }: { reveal: number }) {
  const causes = ['timing signal', 'I/O process', 'hardware fault', 'user interaction', 'software error'] as const;
  return <div className="h4fa h4fa-interrupts" aria-label="Hodder 4.1.7 interrupt causes and service sequence">
    <div className="h4fa-cause-grid">{causes.map((cause, index) => <section key={cause} style={revealStyle(reveal, index < 3 ? 1 : 2)}><b>{cause}</b></section>)}</div>
    <div className="h4fa-state-flow" style={revealStyle(reveal, 3)}><span>save PC + registers</span><i>→</i><span>load ISR start address</span><i>→</i><span>service interrupt</span><i>→</i><span>restore state</span></div>
    <aside style={revealStyle(reveal, 4)}>interrupted task continues from the point before the interrupt</aside>
  </div>;
}

function Activity4A({ reveal }: { reveal: number }) {
  const zones = [['REGISTERS', 'CIR · MAR · PC · N/C/V'], ['BUSES', 'address · data · control'], ['PORTS', 'HDMI ↔ VGA'], ['CYCLE', 'fetch-execute · RTN'], ['VOCABULARY', 'complete the source paragraph']] as const;
  return <div className="h4fa h4fa-activity" aria-label="Hodder Activity 4A retrieval map">
    {zones.map((zone, index) => <section key={zone[0]} style={revealStyle(reveal, index + 1)}><b>{zone[0]}</b><span>{zone[1]}</span></section>)}
    <aside style={revealStyle(reveal, 4)}><b>PRINTED SOURCE</b><span>Activity 4A retains “60 GHz” and “120 GHz” refresh-rate wording exactly as printed.</span></aside>
  </div>;
}

function AssemblyMap({ reveal }: { reveal: number }) {
  return <div className="h4fa h4fa-assembly-map" aria-label="Hodder 4.2 assembly language key terms relationship">
    <section className="machine" style={revealStyle(reveal, 1)}><b>MACHINE CODE</b><span>CPU uses it directly</span><small>binary · chip specific</small></section>
    <i style={revealStyle(reveal, 2)}>⇅ assembler</i>
    <section className="assembly" style={revealStyle(reveal, 2)}><b>ASSEMBLY LANGUAGE</b><span>mnemonics</span><small>source code</small></section>
    <div className="h4fa-key-strip" style={revealStyle(reveal, 3)}><span>opcode</span><span>operand</span><span>instruction set</span><span>object code</span></div>
    <div className="h4fa-key-strip" style={revealStyle(reveal, 4)}><span>absolute/direct</span><span>indirect</span><span>indexed</span><span>immediate</span><span>relative</span><span>symbolic</span></div>
  </div>;
}

function MachineAssembly({ reveal }: { reveal: number }) {
  const rows = [['LDD Total', '0140', '00000000110000000'], ['ADD 20', '0214', '00000001000011000'], ['STO Total', '0340', '00000001110000000']] as const;
  return <div className="h4fa h4fa-machine" aria-label="Hodder assembly mnemonic machine code examples">
    <header style={revealStyle(reveal, 1)}><b>assembly mnemonic</b><b>machine code hex</b><b>machine code binary</b></header>
    {rows.map((row, index) => <section key={row[0]} style={revealStyle(reveal, index + 2)}><code>{row[0]}</code><code>{row[1]}</code><code>{row[2]}</code></section>)}
    <footer style={revealStyle(reveal, 4)}><span><b>opcode</b> = operation</span><span><b>operand</b> = data used by the opcode</span></footer>
  </div>;
}

function TwoPass({ reveal }: { reveal: number }) {
  return <div className="h4fa h4fa-two-pass" aria-label="Hodder two pass assembler forward reference example">
    <section style={revealStyle(reveal, 1)}><b>PASS 1</b><span>addresses · opcode check · labels → symbol table</span></section>
    <section style={revealStyle(reveal, 2)}><b>SYMBOL TABLE</b><code>Notfound → 100</code><code>Found → 104</code></section>
    <section style={revealStyle(reveal, 3)}><b>PASS 2</b><span>opcode + operand → object code</span></section>
    <aside style={revealStyle(reveal, 4)}><code>JPN Found</code><span>Found is a forward reference: its address is not known at the first encounter.</span></aside>
  </div>;
}

export function Chapter4FetchAssemblyVisual({ beat, reveal }: { beat: LessonPresentationBeat; reveal: number }) {
  switch (beat.slideId) {
    case 'h4-415-ports-compare': return <PortsCompare reveal={reveal}/>;
    case 'h4-416-fetch-cycle': return <FetchCycle reveal={reveal}/>;
    case 'h4-416-rtn': return <Rtn reveal={reveal}/>;
    case 'h4-416-interrupt-cycle': return <InterruptCycle reveal={reveal}/>;
    case 'h4-417-interrupts': return <Interrupts reveal={reveal}/>;
    case 'h4-41-activity4a': return <Activity4A reveal={reveal}/>;
    case 'h4-42-prior-keyterms': return <AssemblyMap reveal={reveal}/>;
    case 'h4-421-machine-assembly': return <MachineAssembly reveal={reveal}/>;
    case 'h4-422-two-pass-assembler': return <TwoPass reveal={reveal}/>;
    default: return null;
  }
}
