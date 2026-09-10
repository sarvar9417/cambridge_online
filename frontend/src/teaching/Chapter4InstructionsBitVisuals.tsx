import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter4-instructions-bit-visuals.css';

export const CHAPTER_4_INSTRUCTIONS_BIT_VISUAL_IDS = [
  'h4-423-instruction-set',
  'h4-424-addressing-modes',
  'h4-425-three-number-program',
  'h4-425-indexed-loop',
  'h4-42-activity4b',
  'h4-43-binary-shifts',
  'h4-431-lsl-lsr',
  'h4-432-mask-operations',
  'h4-43-activity4c',
  'h4-eoc-questions-1-4',
  'h4-eoc-question-5',
] as const;

export function hasChapter4InstructionsBitVisual(beat: LessonPresentationBeat) {
  return CHAPTER_4_INSTRUCTIONS_BIT_VISUAL_IDS.includes(beat.slideId as never);
}

const rs = (reveal: number, step: number) => ({
  opacity: reveal >= step ? 1 : 0.1,
  transform: reveal >= step ? 'translateY(0) scale(1)' : 'translateY(12px) scale(.985)',
  transition: 'opacity 220ms ease, transform 220ms ease',
});

function InstructionSet({ reveal }: { reveal: number }) {
  const groups = [['MOVE','LDM LDD LDI LDX LDR MOV STO END'],['I/O','IN OUT'],['MATH','ADD SUB INC DEC'],['JUMP','JMP JPE JPN END'],['COMPARE','CMP CMI']] as const;
  return <div className="h4ib h4ib-groups" aria-label="Hodder Tables 4.4 to 4.8 assembly instruction families">
    {groups.map((g,i)=><section key={g[0]} style={rs(reveal,Math.min(i+1,4))}><b>{g[0]}</b><code>{g[1]}</code></section>)}
    <aside style={rs(reveal,4)}><span><b>B</b> binary</span><span><b>&amp;</b> hexadecimal</span><span><b>#</b> denary</span></aside>
  </div>;
}

function Addressing({ reveal }: { reveal: number }) {
  const modes = [['DIRECT','LDD 200','memory[200]'],['INDIRECT','LDI 200','memory[memory[200]]'],['INDEXED','LDX 200','memory[200 + IX]'],['IMMEDIATE','LDM #200','200'],['RELATIVE','JMR #5','PC/current + 5'],['SYMBOLIC','LDD MyStore','label → address']] as const;
  return <div className="h4ib h4ib-address" aria-label="Hodder 4.2.4 addressing modes visual">
    {modes.map((m,i)=><section key={m[0]} style={rs(reveal,Math.min(Math.floor(i/2)+1,4))}><b>{m[0]}</b><code>{m[1]}</code><span>{m[2]}</span></section>)}
    <aside style={rs(reveal,4)}>absolute = direct · labels provide symbolic addresses</aside>
  </div>;
}

function ThreeNumber({ reveal }: { reveal: number }) {
  return <div className="h4ib h4ib-flow" aria-label="Hodder 4.2.5 three number assembly worked trace">
    <section style={rs(reveal,1)}><b>HIGH LEVEL</b><code>total = first + second + third</code></section>
    <i>↓</i>
    <section style={rs(reveal,2)}><b>ASSEMBLY</b><code>LDD first → ADD second → ADD third → STO total</code></section>
    <i>↓</i>
    <div className="h4ib-values" style={rs(reveal,3)}><span>20</span><span>+30</span><span>+40</span><strong>= 90</strong></div>
    <aside style={rs(reveal,4)}><code>start 100 · first 106 · second 107 · third 108 · total 109</code></aside>
  </div>;
}

function IndexedLoop({ reveal }: { reveal: number }) {
  const rounds = [['IX 0','number[0] = 5','total 5'],['IX 1','number[1] = 7','total 12'],['IX 2','number[2] = 3','total 15'],['counter 3','CMP #3','END']] as const;
  return <div className="h4ib h4ib-loop" aria-label="Hodder indexed register loop worked trace p127 p128">
    <header style={rs(reveal,1)}><code>LDX number → ADD total → STO total → INC IX</code></header>
    {rounds.map((r,i)=><section key={r[0]} style={rs(reveal,i+1)}><b>{r[0]}</b><span>{r[1]}</span><strong>{r[2]}</strong></section>)}
    <footer style={rs(reveal,4)}><code>JPN loop</code><span>repeat while ACC ≠ 3</span></footer>
  </div>;
}

function ActivityB({ reveal }: { reveal: number }) {
  return <div className="h4ib h4ib-activity" aria-label="Hodder Activity 4B assembly practice">
    <section style={rs(reveal,1)}><b>ADDRESSING</b><span>LDM #200 · LDD 200 · LDI 200</span></section>
    <section style={rs(reveal,2)}><b>TRACE</b><span>#30 − #40 + #20 · compare #10 · conditional path</span></section>
    <section style={rs(reveal,3)}><b>CREATE</b><span>output ASCII values for four array elements</span></section>
    <aside style={rs(reveal,4)}>symbol table + trace table + program purpose</aside>
  </div>;
}

function BinaryShifts({ reveal }: { reveal: number }) {
  return <div className="h4ib h4ib-shifts" aria-label="Hodder 4.3.1 exact binary shift examples">
    <section style={rs(reveal,1)}><b>LOGICAL LEFT ×3</b><code>10101111 → 01111000</code><span>zeros enter</span></section>
    <section style={rs(reveal,2)}><b>ARITHMETIC RIGHT ×3</b><code>10101111 → 11110101</code><span>sign preserved</span></section>
    <section style={rs(reveal,3)}><b>CYCLIC LEFT ×3</b><code>10101111 → 01111101</code><span>bits wrap around</span></section>
    <aside style={rs(reveal,4)}>arithmetic shifts can multiply/divide by powers of two</aside>
  </div>;
}

function LslLsr({ reveal }: { reveal: number }) {
  return <div className="h4ib h4ib-lsl" aria-label="Hodder Table 4.10 LSL and LSR visual">
    <section style={rs(reveal,1)}><b>LSL n</b><div><i>←</i><code>ACC</code><span>0 0 0 → right</span></div></section>
    <section style={rs(reveal,2)}><b>LSR n</b><div><span>left ← 0 0 0</span><code>ACC</code><i>→</i></div></section>
    <aside style={rs(reveal,3)}>Shifts are always performed on ACC</aside>
  </div>;
}

function MaskOps({ reveal }: { reveal: number }) {
  return <div className="h4ib h4ib-mask" aria-label="Hodder Table 4.11 sensor 3 masking reconstruction">
    <header style={rs(reveal,1)}><code>SENSORS</code><strong>… bit 3 …</strong><code>#B100</code></header>
    <section style={rs(reveal,2)}><b>AND</b><span>check bit</span><code>AND #B100</code></section>
    <section style={rs(reveal,3)}><b>OR</b><span>set bit</span></section>
    <section style={rs(reveal,3)}><b>XOR</b><span>clear set bit</span><code>XOR #B100</code></section>
    <aside style={rs(reveal,4)}>logical result → ACC · operand acts as mask</aside>
  </div>;
}

function ActivityC({ reveal }: { reveal: number }) {
  return <div className="h4ib h4ib-activity" aria-label="Hodder Activity 4C bit manipulation practice">
    <section style={rs(reveal,1)}><b>START</b><code>ACC = B00011001</code></section>
    <section style={rs(reveal,2)}><b>SHIFT</b><code>LSL #4 · LSR #5</code></section>
    <section style={rs(reveal,3)}><b>MASK</b><span>set bit 4 · clear bit 1</span></section>
    <section style={rs(reveal,4)}><b>IDENTIFY</b><code>00110101 → 10101000</code></section>
  </div>;
}

function Eoc14({ reveal }: { reveal: number }) {
  return <div className="h4ib h4ib-eoc" aria-label="Hodder Chapter 4 end questions 1 to 4 map">
    {['Q1 · fetch cycle + performance','Q2 · ports + printer interrupt','Q3 · registers + printer interrupt','Q4 · three shift types'].map((q,i)=><section key={q} style={rs(reveal,i+1)}><b>{q}</b></section>)}
    <aside style={rs(reveal,4)}><code>2.5 GHz → 3.2 GHz</code><span>source overclocking prompt</span></aside>
  </div>;
}

function Eoc5({ reveal }: { reveal: number }) {
  return <div className="h4ib h4ib-intruder" aria-label="Hodder Chapter 4 Question 5 intruder sensor dry run">
    <header style={rs(reveal,1)}><span>Sensor 4</span><span>Sensor 3</span><span>Sensor 2</span><span>Sensor 1</span><code>B00001010</code></header>
    <section style={rs(reveal,2)}><code>AND VALUE</code><span>test one sensor bit</span><code>COUNT++</code></section>
    <section style={rs(reveal,3)}><code>VALUE + VALUE</code><span>move mask to next bit</span><code>CMP #8</code></section>
    <section style={rs(reveal,4)}><code>TEST: CMP …</code><b>JGT ALARM</b><span>two-or-more threshold to infer</span></section>
    <footer style={rs(reveal,4)}>9608 · Paper 32 Q6 · June 2016</footer>
  </div>;
}

export function Chapter4InstructionsBitVisual({ beat, reveal }: { beat: LessonPresentationBeat; reveal: number }) {
  switch (beat.slideId) {
    case 'h4-423-instruction-set': return <InstructionSet reveal={reveal}/>;
    case 'h4-424-addressing-modes': return <Addressing reveal={reveal}/>;
    case 'h4-425-three-number-program': return <ThreeNumber reveal={reveal}/>;
    case 'h4-425-indexed-loop': return <IndexedLoop reveal={reveal}/>;
    case 'h4-42-activity4b': return <ActivityB reveal={reveal}/>;
    case 'h4-43-binary-shifts': return <BinaryShifts reveal={reveal}/>;
    case 'h4-431-lsl-lsr': return <LslLsr reveal={reveal}/>;
    case 'h4-432-mask-operations': return <MaskOps reveal={reveal}/>;
    case 'h4-43-activity4c': return <ActivityC reveal={reveal}/>;
    case 'h4-eoc-questions-1-4': return <Eoc14 reveal={reveal}/>;
    case 'h4-eoc-question-5': return <Eoc5 reveal={reveal}/>;
    default: return null;
  }
}
