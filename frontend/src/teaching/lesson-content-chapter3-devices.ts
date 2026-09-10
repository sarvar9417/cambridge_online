import type { HodderLessonSlide } from './lesson-content-hodder-types';

const source = (page: number, elements: string[]) => ({
  sourcePages: [page],
  sourceLabel: `Hodder Chapter 3 · p.${page}`,
  sourceElements: [`Hodder p.${page}`, ...elements],
});

/**
 * Source-specific continuation of 3.1.2 from the exact connected Hodder book.
 * Kept as a separate batch so later source pages can be added without turning
 * the core chapter transcription into one monolithic component.
 */
export const CHAPTER_3_DEVICE_SLIDES: readonly HodderLessonSlide[] = [
  {
    id: 'h3-312-inkjet-printer',
    section: '3.1 Computers and their components',
    subtopicCode: '3.1.2',
    eyebrow: 'FIGURE 3.10 + TABLE 3.6 · INKJET PRINTER',
    title: 'Inkjet printing moves a nozzle head across the page and advances the paper line by line',
    lead: 'Hodder identifies the print head, ink cartridge(s), stepper motor and belt, and paper feed, then gives a nine-stage print sequence. The source caption for Table 3.6 says “Sequence to print using a laser printer” even though it appears in the inkjet-printer section; that label is preserved rather than silently corrected.',
    richBlocks: [
      {
        kind: 'comparison',
        leftTitle: 'Thermal bubble',
        rightTitle: 'Piezoelectric',
        rows: [
          ['Tiny resistors heat the ink until a bubble forms and ejects a droplet', 'A crystal receives a small electric charge and vibrates'],
          ['Bubble collapse creates a small vacuum that draws fresh ink into the print head', 'Crystal vibration ejects ink and draws more ink in for the next operation'],
        ],
      },
      {
        kind: 'steps',
        title: 'Table 3.6 · “Sequence to print using a laser printer” · source caption retained',
        items: [
          '1–4 · document data → printer driver → printer availability check → printer buffer',
          '5 · paper-feed sensor checks paper and reports paper-out or jam errors',
          '6–7 · print head moves side to side; four ink colours are sprayed in exact amounts; paper advances after each pass',
          '8 · stages from paper feed repeat while data remains in the printer buffer',
          '9 · an empty buffer causes the printer to interrupt the processor and request more data',
        ],
      },
    ],
    visual: 'types',
    accent: 'cyan',
    ...source(78, ['Figure 3.10 An inkjet printer', 'Table 3.6 Sequence to print using a laser printer', 'thermal bubble', 'piezoelectric', 'printer buffer', 'interrupt']),
  },
  {
    id: 'h3-312-3d-printer',
    section: '3.1 Computers and their components',
    subtopicCode: '3.1.2',
    eyebrow: 'FIGURES 3.11–3.12 · 3D PRINTING',
    title: '3D printing builds a solid object layer by layer',
    lead: 'The source contrasts additive manufacturing with subtractive manufacturing and describes direct and binder 3D printing.',
    richBlocks: [
      {
        kind: 'comparison',
        leftTitle: 'Additive manufacturing',
        rightTitle: 'Subtractive manufacturing',
        rows: [
          ['Builds the object layer by layer', 'Removes material from a larger solid piece'],
          ['Can use powdered resin, metal, paper or ceramic', 'Examples include carving and CNC machining'],
          ['Direct 3D printing moves the print head across and vertically through the build', 'Material not required in the final object is cut or carved away'],
          ['Binder printing uses a dry-powder pass followed by a binder pass', '—'],
        ],
      },
    ],
    example: {
      title: 'Figure 3.12 source example',
      lines: ['Artificial bone framework', 'Binder 3D printing', 'Many layers, each 100 µm thick, made from powdered metal'],
    },
    visual: 'types',
    accent: 'amber',
    ...source(79, ['Figure 3.11 A 3D printer', 'Figure 3.12 Artificial bone framework', 'additive manufacturing', 'subtractive manufacturing', 'binder 3D printing', '100 µm layers']),
  },
  {
    id: 'h3-312-speaker-dac',
    section: '3.1 Computers and their components',
    subtopicCode: '3.1.2',
    eyebrow: 'FIGURES 3.13–3.14 · SPEAKER OUTPUT',
    title: 'Digital sound passes through a DAC and amplifier before the loudspeaker produces sound waves',
    lead: 'Hodder traces stored digital data through digital-to-analogue conversion, amplification and then the loudspeaker mechanism.',
    bullets: [
      'The DAC converts digital data into an electric current.',
      'The amplifier raises the small DAC output to a current large enough to drive the loudspeaker.',
      'Current through a coil around an iron core creates a temporary electromagnet near a permanent magnet.',
      'Variation in current changes the magnetic field and makes the iron core vibrate.',
      'The attached cone vibrates and produces sound waves.',
    ],
    visual: 'types',
    accent: 'emerald',
    ...source(80, ['Figure 3.13 Digital to analogue conversion', 'Figure 3.14 loudspeaker', 'DAC', 'amplifier', 'temporary electromagnet', 'speaker cone']),
  },
  {
    id: 'h3-312-microphone-adc',
    section: '3.1 Computers and their components',
    subtopicCode: '3.1.2',
    eyebrow: 'FIGURES 3.15–3.16 · MICROPHONE INPUT',
    title: 'A microphone converts sound vibrations into an analogue current; an ADC can digitise it',
    lead: 'The source follows sound waves through the diaphragm and coil mechanism, then shows the analogue-to-digital path for computer storage and manipulation.',
    bullets: [
      'Sound makes the air vibrate and the microphone diaphragm vibrates with it.',
      'A cone links the diaphragm to a copper coil wrapped around a permanent magnet.',
      'Coil movement disturbs the magnetic field and induces an analogue electric current.',
      'The current may be amplified, recorded, or sent to a computer sound card.',
      'An ADC converts the analogue signal into digital values that a computer can store or process.',
    ],
    example: {
      title: 'Figure 3.16 source example',
      lines: ['Sound wave for “HUT” → ADC → digital values'],
    },
    visual: 'types',
    accent: 'rose',
    ...source(81, ['Figure 3.15 microphone', 'Figure 3.16 Analogue to digital conversion', 'ADC', 'sound card', 'HUT example']),
  },
  {
    id: 'h3-312-oled-touch',
    section: '3.1 Computers and their components',
    subtopicCode: '3.1.2',
    eyebrow: 'FIGURES 3.17–3.18 · OLED + TOUCH SCREENS',
    title: 'OLED pixels emit light directly; touch layers can also turn the display into an input device',
    lead: 'Hodder explains OLED structure, RGB sub-pixels and then compares capacitive and resistive touch-screen technologies.',
    richBlocks: [
      {
        kind: 'comparison',
        leftTitle: 'Capacitive',
        rightTitle: 'Resistive',
        rows: [
          ['Layers of glass behave like a capacitor; touch changes electric current', 'Polyester top layer and glass bottom layer complete a circuit when pressed'],
          ['On-board microprocessor determines touch coordinates', 'Signals are interpreted by a microprocessor to determine coordinates'],
          ['Good visibility in strong sunlight; multi-touch; durable', 'Relatively inexpensive; accepts fingers, gloves or stylus'],
          ['Normally bare-finger input, with newer special-stylus support', 'Poor strong-sunlight visibility; no multi-touch; lower durability'],
        ],
      },
    ],
    bullets: [
      'OLED organic films sit between a metallic cathode and glass anode and emit light when an electric field is applied.',
      'No backlight is required, allowing very thin displays.',
      'Each screen pixel uses red, green and blue sub-pixels at different intensities.',
      'The source gives 1680 × 1080 as an example screen resolution.',
    ],
    visual: 'types',
    accent: 'indigo',
    ...source(82, ['Figure 3.17 OLED technology', 'Figure 3.18 pixel matrix', 'RGB sub-pixels', '1680 × 1080', 'capacitive touch screen', 'resistive touch screen']),
  },
  {
    id: 'h3-312-vr-headset',
    section: '3.1 Computers and their components',
    subtopicCode: '3.1.2',
    eyebrow: 'VIRTUAL HEADSETS · SOURCE MECHANISM',
    title: 'A VR headset coordinates stereo display, lenses, tracking sensors and binaural sound',
    lead: 'Hodder uses a dangerous-area engineering example and then describes how video, optics, motion tracking and surround sound create the sense of presence.',
    bullets: [
      'Video reaches the headset from a computer by HDMI or from a smartphone fitted into the headset.',
      'Two image feeds are displayed and lenses reshape/focus the image for each eye to create a 3D effect.',
      'The source states a typical 110° field of view for a pseudo-360° surround experience.',
      'A 60–120 images-per-second frame rate is used for realistic motion.',
      'Gyroscopic or accelerometer sensors, and sometimes LEDs with mini cameras, track head movement.',
      'Binaural sound makes audio appear to come from different directions and distances.',
    ],
    visual: 'types',
    accent: 'cyan',
    ...source(83, ['Virtual headsets', 'HDMI', 'LCD/OLED', '110° field of view', '60–120 images per second', 'gyroscopic sensors', 'accelerometers', 'binaural sound']),
  },
];
