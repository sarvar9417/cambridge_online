import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter3-sensor-visuals.css';

export const CHAPTER_3_SENSOR_VISUAL_IDS = [
  'h3-312-sensors-adc-dac',
  'h3-312-sensor-applications',
  'h3-312-monitor-control',
  'h3-312-abs-control',
  'h3-32-logic-gates-intro',
] as const;

export function hasChapter3SensorVisual(beat: LessonPresentationBeat) {
  return CHAPTER_3_SENSOR_VISUAL_IDS.includes(beat.slideId as never);
}

const revealStyle = (reveal: number, step: number) => ({
  opacity: reveal >= step ? 1 : 0.16,
  transform: reveal >= step ? 'translateY(0)' : 'translateY(14px)',
  transition: 'opacity 220ms ease, transform 220ms ease',
});

function SensorAdcDac({ reveal }: { reveal: number }) {
  return <div className="h3sv h3sv-convert" aria-label="Hodder Figure 3.19 analogue and digital conversion reconstruction">
    <div className="h3sv-chain">
      <section style={revealStyle(reveal, 1)}><header>PHYSICAL PROPERTY</header><b>~ analogue data ~</b><small>temperature · pressure · acidity</small></section>
      <i>→</i><section style={revealStyle(reveal, 2)}><header>SENSOR + ADC</header><b>ADC</b><small>continuous value → discrete digital value</small></section>
      <i>→</i><section style={revealStyle(reveal, 3)}><header>COMPUTER</header><b>10011100…</b><small>analyse against stored values</small></section>
    </div>
    <div className="h3sv-control" style={revealStyle(reveal, 4)}><b>CONTROL OUTPUT</b><span>computer → DAC when required → actuator</span><strong>relay · solenoid · motor · valve</strong><small>output can change the next sensor input → feedback</small></div>
  </div>;
}

function SensorApplications({ reveal }: { reveal: number }) {
  const items = [
    ['TEMP', 'heating · process · greenhouse'], ['HUMIDITY', 'soil/air · industrial dampness'], ['LIGHT', 'street lights · headlights'],
    ['IR / MOTION', 'wipers · alarm · people count'], ['PRESSURE', 'alarm · weight · gas'], ['SOUND', 'alarm · dripping liquid'],
    ['GAS', 'pollution · greenhouse · leaks'], ['pH', 'soil · river pollution'], ['MAGNETIC', 'devices · ABS'],
  ] as const;
  return <div className="h3sv h3sv-sensors" aria-label="Hodder Table 3.7 common sensors visual summary">
    {items.map((item, index) => <section key={item[0]} style={revealStyle(reveal, Math.floor(index / 3) + 1)}><strong>{item[0]}</strong><span>{item[1]}</span></section>)}
  </div>;
}

function MonitorControl({ reveal }: { reveal: number }) {
  return <div className="h3sv h3sv-monitor" aria-label="Hodder Figure 3.20 monitoring and control flow reconstruction">
    <div className="h3sv-common" style={revealStyle(reveal, 1)}><b>SENSORS</b><i>→</i><b>ADC <small>if necessary</small></b><i>→</i><b>MICROPROCESSOR / COMPUTER</b><span>analyse against stored values</span></div>
    <div className="h3sv-fork">
      <section className="h3sv-watch" style={revealStyle(reveal, 2)}><header>MONITORING</header><b>outside range</b><i>↓</i><strong>warning / alarm</strong><small>system does not alter what is being monitored</small></section>
      <section className="h3sv-act" style={revealStyle(reveal, 3)}><header>CONTROL</header><b>outside range</b><i>↓</i><strong>valves / motors / devices</strong><small>output changes the next sensor inputs</small><footer>↺ FEEDBACK LOOP</footer></section>
    </div>
  </div>;
}

function AbsControl({ reveal }: { reveal: number }) {
  return <div className="h3sv h3sv-abs" aria-label="Hodder Figure 3.21 anti-lock braking sensor control reconstruction">
    <div className="h3sv-car" style={revealStyle(reveal, 1)}><span>◉</span><span>◉</span><b>ABS</b><span>◉</span><span>◉</span><small>magnetic field sensors compare wheel rotation</small></div>
    <div className="h3sv-abs-loop">
      <section style={revealStyle(reveal, 2)}><strong>1</strong><span>wheel too slow → sensor data</span></section>
      <section style={revealStyle(reveal, 2)}><strong>2</strong><span>compare other 3 wheels</span></section>
      <section style={revealStyle(reveal, 3)}><strong>3</strong><span>reduce braking pressure</span></section>
      <section style={revealStyle(reveal, 3)}><strong>4</strong><span>wheel speed rises to match</span></section>
      <section style={revealStyle(reveal, 4)}><strong>↺</strong><span>repeat several times each second</span></section>
    </div>
    <div className="h3sv-judder" style={revealStyle(reveal, 4)}>BRAKE PEDAL “JUDDER” <small>rapid switching as pressure is constantly adjusted</small></div>
  </div>;
}

function LogicIntro({ reveal }: { reveal: number }) {
  const gates = ['NOT', 'AND', 'OR', 'NAND', 'NOR', 'XOR'] as const;
  return <div className="h3sv h3sv-logic" aria-label="Hodder Figure 3.22 six logic gate types overview">
    <div className="h3sv-gates">{gates.map((gate, index) => <section key={gate} style={revealStyle(reveal, index < 3 ? 1 : 2)}><span>A</span><b>{gate}</b><span>Q</span></section>)}</div>
    <div className="h3sv-truth" style={revealStyle(reveal, 3)}><strong>TRUTH TABLE</strong><span>2 inputs → 2² = 4 combinations</span><span>3 inputs → 2³ = 8 combinations</span></div>
    <div className="h3sv-boolean" style={revealStyle(reveal, 4)}><b>BOOLEAN ALGEBRA</b><span>TRUE ↔ 1</span><span>FALSE ↔ 0</span></div>
  </div>;
}

export function Chapter3SensorVisual({ beat, reveal }: { beat: LessonPresentationBeat; reveal: number }) {
  switch (beat.slideId) {
    case 'h3-312-sensors-adc-dac': return <SensorAdcDac reveal={reveal}/>;
    case 'h3-312-sensor-applications': return <SensorApplications reveal={reveal}/>;
    case 'h3-312-monitor-control': return <MonitorControl reveal={reveal}/>;
    case 'h3-312-abs-control': return <AbsControl reveal={reveal}/>;
    case 'h3-32-logic-gates-intro': return <LogicIntro reveal={reveal}/>;
    default: return null;
  }
}
