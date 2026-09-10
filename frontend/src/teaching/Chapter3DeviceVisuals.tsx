import type { LessonPresentationBeat } from './lesson-experience-model';
import './chapter3-device-visuals.css';

export const CHAPTER_3_DEVICE_VISUAL_IDS = [
  'h3-312-inkjet-printer',
  'h3-312-3d-printer',
  'h3-312-speaker-dac',
  'h3-312-microphone-adc',
  'h3-312-oled-touch',
  'h3-312-vr-headset',
] as const;

export function hasChapter3DeviceVisual(beat: LessonPresentationBeat) {
  return CHAPTER_3_DEVICE_VISUAL_IDS.includes(beat.slideId as never);
}

const revealStyle = (reveal: number, step: number) => ({
  opacity: reveal >= step ? 1 : 0.16,
  transform: reveal >= step ? 'translateY(0)' : 'translateY(16px)',
  transition: 'opacity 220ms ease, transform 220ms ease',
});

function InkjetPrinter({ reveal }: { reveal: number }) {
  const stages = [
    ['1–4', 'DRIVER + BUFFER', 'document → printer driver → availability check → printer buffer'],
    ['5', 'PAPER SENSOR', 'paper present? · paper-out / jam error returns to computer'],
    ['6–7', 'PRINT + ADVANCE', 'head moves side to side → four ink colours sprayed in exact amounts → paper advances after each pass'],
    ['8–9', 'REPEAT / INTERRUPT', 'repeat while buffer has data → empty buffer interrupts processor for more data'],
  ] as const;
  return <div className="h3dv h3dv-inkjet" aria-label="Hodder Figure 3.10 and Table 3.6 inkjet printer reconstruction">
    <div className="h3dv-printhead" style={revealStyle(reveal, 1)}>
      <div className="h3dv-rail"><span>STEPPER MOTOR + BELT</span><b>PRINT HEAD · NOZZLES</b></div>
      <div className="h3dv-drops"><i/><i/><i/><i/></div>
      <div className="h3dv-paper">PAPER FEED <small>sensor</small></div>
      <div className="h3dv-tech"><span>THERMAL BUBBLE<small>heat → bubble → droplet → vacuum draws fresh ink</small></span><span>PIEZOELECTRIC<small>charged crystal vibrates → droplet ejected → fresh ink drawn in</small></span></div>
    </div>
    <div className="h3dv-stage-grid">{stages.map((stage, index) => <section key={stage[0]} style={revealStyle(reveal, index + 1)}><strong>{stage[0]}</strong><header>{stage[1]}</header><p>{stage[2]}</p></section>)}</div>
  </div>;
}

function ThreeDPrinter({ reveal }: { reveal: number }) {
  return <div className="h3dv h3dv-3d" aria-label="Hodder Figures 3.11 and 3.12 additive and subtractive manufacturing reconstruction">
    <section className="h3dv-build" style={revealStyle(reveal, 1)}><header>ADDITIVE</header><div className="h3dv-layers"><i/><i/><i/><i/><i/><i/></div><b>BUILD UP LAYER BY LAYER</b><small>resin · metal · paper · ceramic</small></section>
    <div className="h3dv-vs" style={revealStyle(reveal, 2)}>VS</div>
    <section className="h3dv-cut" style={revealStyle(reveal, 2)}><header>SUBTRACTIVE</header><div className="h3dv-block"><i/></div><b>REMOVE MATERIAL</b><small>carving · CNC machining</small></section>
    <div className="h3dv-methods" style={revealStyle(reveal, 3)}><span><b>DIRECT 3D</b> print head moves across + vertically</span><span><b>BINDER 3D</b> dry powder pass → binder pass</span><span><b>FIGURE 3.12</b> artificial bone · powdered metal · 100 µm layers</span></div>
  </div>;
}

function SpeakerDac({ reveal }: { reveal: number }) {
  return <div className="h3dv h3dv-signal" aria-label="Hodder Figures 3.13 and 3.14 digital to analogue speaker process reconstruction">
    <div className="h3dv-signal-flow">
      <section style={revealStyle(reveal,1)}><header>DIGITAL FILE</header><b>10010101011</b></section><i>→</i>
      <section style={revealStyle(reveal,2)}><header>DAC</header><span>digital → electric current</span></section><i>→</i>
      <section style={revealStyle(reveal,3)}><header>AMPLIFIER</header><span>raises current</span></section><i>→</i>
      <section style={revealStyle(reveal,4)}><header>SPEAKER</header><span>current → sound waves</span></section>
    </div>
    <div className="h3dv-speaker" style={revealStyle(reveal,4)}><span>varying current</span><b>COIL + IRON CORE</b><span>temporary electromagnet ↔ permanent magnet</span><b>CONE VIBRATES</b><strong>))) SOUND WAVES )))</strong></div>
  </div>;
}

function MicrophoneAdc({ reveal }: { reveal: number }) {
  return <div className="h3dv h3dv-mic" aria-label="Hodder Figures 3.15 and 3.16 microphone and analogue to digital conversion reconstruction">
    <div className="h3dv-mic-chain">
      <section style={revealStyle(reveal,1)}><header>SOUND WAVES</header><strong>))) HUT )))</strong></section><i>→</i>
      <section style={revealStyle(reveal,2)}><header>DIAPHRAGM + COIL</header><span>vibration disturbs permanent-magnet field</span></section><i>→</i>
      <section style={revealStyle(reveal,3)}><header>ANALOGUE CURRENT</header><span>induced electric current</span></section><i>→</i>
      <section style={revealStyle(reveal,4)}><header>ADC / SOUND CARD</header><span>analogue → digital values</span></section>
    </div>
    <div className="h3dv-bits" style={revealStyle(reveal,4)}><b>1000 0001</b><b>0001 1110</b><b>1000 1110</b><b>…</b><small>Figure 3.16 · digital values can be stored or manipulated</small></div>
  </div>;
}

function OledTouch({ reveal }: { reveal: number }) {
  return <div className="h3dv h3dv-oled" aria-label="Hodder Figures 3.17 and 3.18 OLED pixel matrix and touch-screen comparison reconstruction">
    <div className="h3dv-oled-stack" style={revealStyle(reveal,1)}><span>METALLIC CATHODE</span><b>ORGANIC FILMS</b><span>GLASS ANODE</span><small>electric field → light · no backlight required</small></div>
    <div className="h3dv-pixel" style={revealStyle(reveal,2)}><span>R</span><span>G</span><span>B</span><b>PIXEL</b><small>different sub-pixel intensities → millions of colours · example 1680 × 1080</small></div>
    <div className="h3dv-touch-grid">
      <section style={revealStyle(reveal,3)}><header>CAPACITIVE</header><p>glass layers create electric fields → touch changes current → microprocessor finds coordinates</p><footer>sunlight ✓ · multi-touch ✓ · durable</footer></section>
      <section style={revealStyle(reveal,4)}><header>RESISTIVE</header><p>polyester + glass layers complete a circuit when pressed → signals locate coordinates</p><footer>finger / glove / stylus ✓ · multi-touch ✕</footer></section>
    </div>
  </div>;
}

function VrHeadset({ reveal }: { reveal: number }) {
  return <div className="h3dv h3dv-vr" aria-label="Hodder virtual headset mechanism reconstruction">
    <div className="h3dv-headset" style={revealStyle(reveal,1)}><span className="eye">LEFT FEED</span><b>LENSES</b><span className="eye">RIGHT FEED</span><small>LCD / OLED display → focused and reshaped image for each eye → 3D effect</small></div>
    <div className="h3dv-vr-metrics"><section style={revealStyle(reveal,2)}><strong>110°</strong><span>field of view</span></section><section style={revealStyle(reveal,2)}><strong>60–120</strong><span>images per second</span></section></div>
    <div className="h3dv-vr-track" style={revealStyle(reveal,3)}><b>HEAD MOVEMENT</b><i>→</i><span>gyroscope / accelerometer · LEDs + mini cameras</span><i>→</i><b>IMAGE REACTS</b></div>
    <div className="h3dv-audio" style={revealStyle(reveal,4)}>BINAURAL SOUND <small>direction + distance reinforce the 3D experience</small></div>
  </div>;
}

export function Chapter3DeviceVisual({ beat, reveal }: { beat: LessonPresentationBeat; reveal: number }) {
  switch (beat.slideId) {
    case 'h3-312-inkjet-printer': return <InkjetPrinter reveal={reveal}/>;
    case 'h3-312-3d-printer': return <ThreeDPrinter reveal={reveal}/>;
    case 'h3-312-speaker-dac': return <SpeakerDac reveal={reveal}/>;
    case 'h3-312-microphone-adc': return <MicrophoneAdc reveal={reveal}/>;
    case 'h3-312-oled-touch': return <OledTouch reveal={reveal}/>;
    case 'h3-312-vr-headset': return <VrHeadset reveal={reveal}/>;
    default: return null;
  }
}
