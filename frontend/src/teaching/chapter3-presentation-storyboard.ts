import type { HodderLessonSlide } from './lesson-content-hodder-types';
import type { LessonPresentationBeat } from './lesson-experience-model';
import { authoredStaticScene, buildAuthoredStoryboard, type AuthoredSceneSpec } from './authored-presentation-storyboard';

const s=(spec:AuthoredSceneSpec)=>spec;

const OVERVIEW:AuthoredSceneSpec[]=[
  s({id:'h3p-overview-prior',slideId:'h3-overview',role:'hook',eyebrow:'CHAPTER 3 · PRIOR KNOWLEDGE',title:'What is the difference between memory, storage, input and output?',block:{index:0}}),
  s({id:'h3p-overview-route',slideId:'h3-overview',role:'objective',eyebrow:'CHAPTER 3 · LEARNING ROUTE',title:'Hardware: from stored bits to physical input/output and logic decisions',lead:true,bullets:true}),
];

const TOPIC_31:AuthoredSceneSpec[]=[
  s({id:'h3p-311-memory-storage',slideId:'h3-311-memory-storage',role:'compare',eyebrow:'3.1.1 · MEMORY VS STORAGE',lead:true,block:{index:0}}),
  s({id:'h3p-311-memory-map',slideId:'h3-311-memory-map',role:'visual',eyebrow:'FIGURE 3.2 · MEMORY / STORAGE MAP',lead:true,visual:true}),
  s({id:'h3p-311-primary-tree',slideId:'h3-311-primary-tree',role:'visual',eyebrow:'FIGURE 3.3 · PRIMARY MEMORY',lead:true,bullets:true,visual:true}),
  s({id:'h3p-311-dram-sram-a',slideId:'h3-311-dram-sram',role:'compare',eyebrow:'TABLE 3.1 · DRAM VS SRAM',title:'Technology, refresh and access speed',lead:true,block:{index:0,range:[0,3]}}),
  s({id:'h3p-311-dram-sram-b',slideId:'h3-311-dram-sram',role:'compare',eyebrow:'TABLE 3.1 · DRAM VS SRAM',title:'Capacity, cache use and power',block:{index:0,range:[3,5]}}),
  s({id:'h3p-311-dram-sram-timing',slideId:'h3-311-dram-sram',role:'visual',eyebrow:'3.1.1 · TIMING EXAMPLE',title:'Compare the source access-time example',example:true}),
  s({id:'h3p-311-ram-rom-table',slideId:'h3-311-ram-rom',role:'compare',eyebrow:'TABLE 3.2 · RAM VS ROM',lead:true,block:{index:0}}),
  s({id:'h3p-311-prom-eprom',slideId:'h3-311-ram-rom',role:'concept',eyebrow:'3.1.1 · PROGRAMMABLE ROM',title:'PROM and EPROM change how ROM can be programmed',bullets:true}),
  s({id:'h3p-311-embedded-a',slideId:'h3-311-embedded',role:'compare',eyebrow:'TABLE 3.3 · EMBEDDED SYSTEMS',title:'Dedicated processing: benefits and drawbacks · part 1',lead:true,block:{index:0,range:[0,3]}}),
  s({id:'h3p-311-embedded-b',slideId:'h3-311-embedded',role:'compare',eyebrow:'TABLE 3.3 · EMBEDDED SYSTEMS',title:'Dedicated processing: benefits and drawbacks · part 2',block:{index:0,range:[3,5]}}),

  s({id:'h3p-311-hdd',slideId:'h3-311-hdd',role:'concept',eyebrow:'3.1.1 · HDD',lead:true,bullets:true}),
  s({id:'h3p-311-hdd-extension',slideId:'h3-311-hdd',role:'challenge',eyebrow:'EXTENSION 3A',title:'Apply RAM and ROM to embedded appliances',block:{index:0}}),
  s({id:'h3p-311-ssd',slideId:'h3-311-ssd',role:'compare',eyebrow:'3.1.1 · SSD',lead:true,block:{index:0}}),
  s({id:'h3p-311-ssd-extension',slideId:'h3-311-ssd',role:'challenge',eyebrow:'EXTENSION 3B',title:'Investigate HDD track geometry and performance',block:{index:1}}),
  s({id:'h3p-311-optical-spiral',slideId:'h3-311-optical-spiral',role:'concept',eyebrow:'FIGURE 3.7 · OPTICAL MEDIA',lead:true,bullets:true}),
  s({id:'h3p-311-optical-extension',slideId:'h3-311-optical-spiral',role:'challenge',eyebrow:'EXTENSION 3C',title:'Investigate outer-track speed and optical capacity',block:{index:0}}),
  s({id:'h3p-311-dvd-layer',slideId:'h3-311-dvd-dual-layer',role:'visual',eyebrow:'FIGURE 3.8 · DVD DUAL LAYER',lead:true,bullets:true,visual:true}),
  s({id:'h3p-311-optical-compare',slideId:'h3-311-optical-compare',role:'compare',eyebrow:'TABLE 3.4 · CD VS DVD VS BLU-RAY',lead:true,block:{index:0}}),
  s({id:'h3p-311-optical-detail',slideId:'h3-311-optical-compare',role:'concept',eyebrow:'3.1.1 · OPTICAL DETAIL',title:'Shorter wavelength permits tighter storage geometry',bullets:true}),
  s({id:'h3p-311-pram',slideId:'h3-311-pram-extension',role:'challenge',eyebrow:'EXTENSION 3D · PHASE-CHANGE MEMORY',lead:true,block:{index:0}}),

  s({id:'h3p-312-laser-printer',slideId:'h3-312-laser-printer',role:'process',eyebrow:'TABLE 3.5 · LASER PRINTER',lead:true,block:{index:0}}),
  s({id:'h3p-312-inkjet-methods',slideId:'h3-312-inkjet-printer',role:'compare',eyebrow:'FIGURE 3.10 · INKJET METHODS',lead:true,block:{index:0}}),
  s({id:'h3p-312-inkjet-sequence',slideId:'h3-312-inkjet-printer',role:'process',eyebrow:'TABLE 3.6 · INKJET SEQUENCE',title:'Trace the nine source stages in order',block:{index:1}}),
  s({id:'h3p-312-3d-compare',slideId:'h3-312-3d-printer',role:'compare',eyebrow:'FIGURES 3.11–3.12 · 3D PRINTING',lead:true,block:{index:0}}),
  s({id:'h3p-312-3d-example',slideId:'h3-312-3d-printer',role:'visual',eyebrow:'FIGURE 3.12 · APPLICATION',title:'Build an artificial-bone framework layer by layer',example:true}),
  s({id:'h3p-312-speaker',slideId:'h3-312-speaker-dac',role:'process',eyebrow:'FIGURES 3.13–3.14 · DIGITAL → SOUND',lead:true,bullets:true}),
  s({id:'h3p-312-microphone',slideId:'h3-312-microphone-adc',role:'process',eyebrow:'FIGURES 3.15–3.16 · SOUND → DIGITAL',lead:true,bullets:true}),
  s({id:'h3p-312-microphone-example',slideId:'h3-312-microphone-adc',role:'visual',eyebrow:'FIGURE 3.16 · ADC EXAMPLE',title:'Follow “HUT” from sound wave to digital values',example:true}),
  s({id:'h3p-312-oled-core',slideId:'h3-312-oled-touch',role:'concept',eyebrow:'FIGURE 3.17 · OLED',lead:true,bullets:true}),
  s({id:'h3p-312-touch-a',slideId:'h3-312-oled-touch',role:'compare',eyebrow:'3.1.2 · TOUCH SCREENS',title:'Capacitive vs resistive · sensing mechanism',block:{index:0,range:[0,2]}}),
  s({id:'h3p-312-touch-b',slideId:'h3-312-oled-touch',role:'compare',eyebrow:'3.1.2 · TOUCH SCREENS',title:'Capacitive vs resistive · usability trade-offs',block:{index:0,range:[2,4]}}),
  s({id:'h3p-312-vr',slideId:'h3-312-vr-headset',role:'process',eyebrow:'3.1.2 · VR HEADSET',lead:true,bullets:true}),

  s({id:'h3p-312-sensor-conversion',slideId:'h3-312-sensors-adc-dac',role:'process',eyebrow:'FIGURE 3.19 · SENSOR → ADC → COMPUTER → DAC',lead:true,bullets:true}),
  s({id:'h3p-312-sensors-a',slideId:'h3-312-sensor-applications',role:'visual',eyebrow:'TABLE 3.7 · COMMON SENSORS',title:'Temperature, moisture and light',lead:true,block:{index:0,range:[0,3]}}),
  s({id:'h3p-312-sensors-b',slideId:'h3-312-sensor-applications',role:'visual',eyebrow:'TABLE 3.7 · COMMON SENSORS',title:'Motion, pressure and sound',block:{index:0,range:[3,6]}}),
  s({id:'h3p-312-sensors-c',slideId:'h3-312-sensor-applications',role:'visual',eyebrow:'TABLE 3.7 · COMMON SENSORS',title:'Gas, pH and magnetic field',block:{index:0,range:[6,9]}}),
  s({id:'h3p-312-monitor-control',slideId:'h3-312-monitor-control',role:'compare',eyebrow:'FIGURE 3.20 + TABLE 3.8 · MONITORING VS CONTROL',lead:true,block:{index:0}}),
  s({id:'h3p-312-abs',slideId:'h3-312-abs-control',role:'process',eyebrow:'FIGURE 3.21 · ABS FEEDBACK LOOP',lead:true,block:{index:0}}),
  s({id:'h3p-31-activity',slideId:'h3-31-activity-3a-3e',role:'challenge',eyebrow:'ACTIVITY 3A · APPLY',title:'Memory, storage, printers, 3D printing and control',lead:true,block:{index:0}}),
  s({id:'h3p-31-extension-3e',slideId:'h3-31-activity-3a-3e',role:'challenge',eyebrow:'EXTENSION 3E',title:'Keyboard and mouse mechanisms',block:{index:1}}),
];

const TOPIC_32:AuthoredSceneSpec[]=[
  s({id:'h3p-32-logic-intro',slideId:'h3-32-logic-gates-intro',role:'concept',eyebrow:'3.2.1 · LOGIC GATES',lead:true,bullets:true}),
  s({id:'h3p-32-extension-3f',slideId:'h3-32-logic-gates-intro',role:'challenge',eyebrow:'EXTENSION 3F',title:'Compare QLED and OLED',block:{index:0}}),

  s({id:'h3p-322-combinations',slideId:'h3-322-truth-table-not',role:'concept',eyebrow:'3.2.2 · TRUTH-TABLE SIZE',lead:true,bullets:[0,3]}),
  s({id:'h3p-322-not-rule',slideId:'h3-322-truth-table-not',role:'concept',eyebrow:'FIGURE 3.23 · NOT',title:'NOT inverts one input',bullets:[3,5]}),
  s({id:'h3p-322-not-table',slideId:'h3-322-truth-table-not',role:'visual',eyebrow:'TABLE 3.10 · NOT',title:'The two-row NOT truth table',block:{index:0}}),

  s({id:'h3p-323-and-or',slideId:'h3-323-and-or-nand-nor',role:'compare',eyebrow:'TABLES 3.11–3.12 · AND / OR',lead:true,block:{index:0,range:[0,2]}}),
  s({id:'h3p-323-nand-nor',slideId:'h3-323-and-or-nand-nor',role:'compare',eyebrow:'TABLES 3.13–3.14 · NAND / NOR',title:'NAND and NOR invert the corresponding base rule',block:{index:0,range:[2,4]}}),
  s({id:'h3p-323-xor-rule',slideId:'h3-323-xor-example31',role:'concept',eyebrow:'FIGURE 3.28 · XOR',lead:true,bullets:[0,4]}),
  s({id:'h3p-323-xor-table',slideId:'h3-323-xor-example31',role:'visual',eyebrow:'TABLE 3.15 · XOR',title:'XOR outputs 1 when the inputs differ',block:{index:0}}),
  s({id:'h3p-323-example31-route',slideId:'h3-323-xor-example31',role:'process',eyebrow:'EXAMPLE 3.1 · CIRCUIT ROUTE',title:'Name each intermediate value before tracing rows',bullets:[4,5]}),
  s({id:'h3p-323-extension-3g',slideId:'h3-323-xor-example31',role:'challenge',eyebrow:'EXTENSION 3G',title:'Prove two Boolean expressions are XOR',block:{index:1}}),

  s({id:'h3p-324-example31-pq-a',slideId:'h3-324-example31-parts12',role:'visual',eyebrow:'EXAMPLE 3.1 · PART 1',title:'P = A AND B; Q = B NOR C · rows 1–4',lead:true,block:{index:0,range:[0,4]}}),
  s({id:'h3p-324-example31-pq-b',slideId:'h3-324-example31-parts12',role:'visual',eyebrow:'EXAMPLE 3.1 · PART 1',title:'P = A AND B; Q = B NOR C · rows 5–8',block:{index:0,range:[4,8]}}),
  s({id:'h3p-324-example31-r-a',slideId:'h3-324-example31-parts12',role:'process',eyebrow:'EXAMPLE 3.1 · PART 2',title:'R = P OR Q · rows 1–4',block:{index:1,range:[0,4]}}),
  s({id:'h3p-324-example31-r-b',slideId:'h3-324-example31-parts12',role:'process',eyebrow:'EXAMPLE 3.1 · PART 2',title:'R = P OR Q · rows 5–8',block:{index:1,range:[4,8]}}),
  s({id:'h3p-324-example31-final-a',slideId:'h3-324-example31-part3-activity3b',role:'visual',eyebrow:'EXAMPLE 3.1 · FINAL TABLE',title:'Combine P, Q, R and X · rows 1–4',lead:true,block:{index:0,range:[0,4]}}),
  s({id:'h3p-324-example31-final-b',slideId:'h3-324-example31-part3-activity3b',role:'visual',eyebrow:'EXAMPLE 3.1 · FINAL TABLE',title:'Combine P, Q, R and X · rows 5–8',block:{index:0,range:[4,8]}}),
  s({id:'h3p-324-activity3b',slideId:'h3-324-example31-part3-activity3b',role:'challenge',eyebrow:'ACTIVITY 3B',title:'Repeat the intermediate-value method on five circuits',block:{index:1}}),

  s({id:'h3p-324-example32-translate',slideId:'h3-324-example32',role:'process',eyebrow:'EXAMPLE 3.2 · WORDS → BOOLEAN → CIRCUIT',lead:true,bullets:true}),
  s({id:'h3p-324-example32-truth-a',slideId:'h3-324-example32-truth-activity3c',role:'visual',eyebrow:'EXAMPLE 3.2 · CHECK',title:'Truth table · rows 1–4',lead:true,block:{index:0,range:[0,4]}}),
  s({id:'h3p-324-example32-truth-b',slideId:'h3-324-example32-truth-activity3c',role:'visual',eyebrow:'EXAMPLE 3.2 · CHECK',title:'Truth table · rows 5–8',block:{index:0,range:[4,8]}}),
  s({id:'h3p-324-activity3c',slideId:'h3-324-example32-truth-activity3c',role:'challenge',eyebrow:'ACTIVITY 3C',title:'Build circuits and truth tables from five statements',block:{index:1}}),
  s({id:'h3p-324-example33-inputs',slideId:'h3-324-example32-truth-activity3c',role:'concept',eyebrow:'EXAMPLE 3.3 · WIND TURBINE',title:'Translate the three sensor thresholds into binary meanings',bullets:true}),
  s({id:'h3p-324-example33-stage1',slideId:'h3-324-example33-stage1',role:'process',eyebrow:'EXAMPLE 3.3 · CONDITIONS',lead:true,bullets:true}),
  s({id:'h3p-324-example33-truth-a',slideId:'h3-324-example33-truth-activity3d',role:'visual',eyebrow:'EXAMPLE 3.3 · VERIFY',title:'Wind-turbine truth table · rows 1–4',lead:true,block:{index:0,range:[0,4]}}),
  s({id:'h3p-324-example33-truth-b',slideId:'h3-324-example33-truth-activity3d',role:'visual',eyebrow:'EXAMPLE 3.3 · VERIFY',title:'Wind-turbine truth table · rows 5–8',block:{index:0,range:[4,8]}}),
  s({id:'h3p-324-activity3d',slideId:'h3-324-example33-truth-activity3d',role:'challenge',eyebrow:'ACTIVITY 3D',title:'Apply the design method to two safety systems',block:{index:1}}),

  s({id:'h3p-325-design',slideId:'h3-325-real-world-design',role:'concept',eyebrow:'3.2.5 · REAL-WORLD DESIGN',lead:true,bullets:true}),
  s({id:'h3p-325-nand',slideId:'h3-325-nand-building-blocks',role:'visual',eyebrow:'FIGURES 3.29–3.31 · NAND BUILDING BLOCKS',lead:true,visual:true}),
  s({id:'h3p-325-activity3e',slideId:'h3-325-nand-building-blocks',role:'challenge',eyebrow:'ACTIVITY 3E',title:'Prove and rebuild circuits using NAND only',block:{index:0}}),
  s({id:'h3p-326-multi-input-and',slideId:'h3-326-multi-input-and',role:'concept',eyebrow:'3.2.6 · MULTI-INPUT GATES',lead:true,bullets:true}),
  s({id:'h3p-326-and-or',slideId:'h3-326-four-input-and-or',role:'compare',eyebrow:'FIGURES 3.33–3.34 · MULTI-INPUT AND / OR',lead:true,bullets:true}),
  s({id:'h3p-326-four-or',slideId:'h3-326-four-input-or-activity3f',role:'visual',eyebrow:'FIGURE 3.35 · FOUR-INPUT OR',lead:true,visual:true}),
  s({id:'h3p-326-activity3f',slideId:'h3-326-four-input-or-activity3f',role:'challenge',eyebrow:'ACTIVITY 3F',title:'Rebuild multi-input NAND/NOR with two-input gates',block:{index:0}}),

  s({id:'h3p-end-q1-3',slideId:'h3-end-questions-1-3',role:'exam',eyebrow:'END OF CHAPTER · QUESTIONS 1–3',lead:true,bullets:true}),
  s({id:'h3p-end-q4-5',slideId:'h3-end-questions-4-5',role:'exam',eyebrow:'END OF CHAPTER · QUESTIONS 4–5',lead:true,bullets:true}),
  s({id:'h3p-end-q5c-6',slideId:'h3-end-questions-5c-6',role:'exam',eyebrow:'END OF CHAPTER · QUESTIONS 5c–6',lead:true,bullets:true}),
];

function opening(topicCode:'3.1'|'3.2'):LessonPresentationBeat[] {
  if(topicCode==='3.1')return [
    authoredStaticScene('h3p-31-hook','h3-311-memory-storage','hook','3.1 · STARTER','A computer is fast only if data can move through the right hardware at the right time',[69,84],{
      lead:'This section connects memory and storage to printers, displays, audio devices, sensors and feedback-driven control systems.',
    }),
    authoredStaticScene('h3p-31-objectives','h3-overview','objective','3.1 · LESSON GOALS','By the end of 3.1 you should be able to…',[68],{
      bullets:['Compare memory/storage technologies and explain RAM/ROM families.','Explain the mechanisms of major input, output and storage devices.','Trace analogue/digital conversion through sensors, ADC/DAC and actuators.','Distinguish monitoring from control and trace a feedback loop such as ABS.'],
    }),
  ];
  return [
    authoredStaticScene('h3p-32-hook','h3-32-logic-gates-intro','hook','3.2 · STARTER','A logic circuit is a chain of small binary decisions. How can we prove its output for every input?',[89],{
      lead:'The section builds from individual gate rules to truth tables, intermediate values, Boolean statements and real-world circuit design.',
    }),
    authoredStaticScene('h3p-32-objectives','h3-overview','objective','3.2 · LESSON GOALS','By the end of 3.2 you should be able to…',[68],{
      bullets:['Recognise NOT, AND, OR, NAND, NOR and XOR rules and truth tables.','Trace multi-stage logic circuits with intermediate values.','Translate between problem statements, Boolean expressions, circuits and truth tables.','Apply NAND building blocks and understand multi-input gate equivalence.'],
    }),
  ];
}

export function chapter3PresentationStoryboard(topicCode:string,slides:readonly HodderLessonSlide[]):LessonPresentationBeat[]|null {
  if(topicCode==='overview')return buildAuthoredStoryboard(slides,OVERVIEW);
  if(topicCode==='3.1'){
    const result=[...opening('3.1'),...buildAuthoredStoryboard(slides,TOPIC_31)];
    result.splice(9,0,authoredStaticScene('h3p-31-memory-check','h3-cp-primary-memory','exam','3.1 · CAMBRIDGE CHECK','Can you distinguish the primary-memory families precisely?',[70,71,72,74],{
      activity:{title:'Explain, compare, apply',prompt:'Compare DRAM with SRAM and RAM with ROM, then state where a programmable ROM family would be appropriate.',reveal:'DRAM uses capacitors and needs refreshing; SRAM uses flip-flops and is faster, so it is used for cache. RAM is volatile and writable; ROM is non-volatile and normally fixed. PROM is programmed once; EPROM can be erased with ultraviolet light and reprogrammed.'},
    }));
    result.push(authoredStaticScene('h3p-31-recap','h3-31-activity-3a-3e','recap','3.1 · RETRIEVAL','Rebuild the hardware route from memory',[69,88],{
      bullets:['Memory/storage: RAM, ROM, DRAM, SRAM, HDD, SSD and optical media.','Output/input mechanisms: printers, 3D printing, speaker/DAC, microphone/ADC, OLED/touch and VR.','Sensors and conversion: physical property → sensor → ADC → processor → optional DAC/actuator.','Monitoring vs control: explain how feedback changes the next sensor input, then trace ABS.'],
    }));
    return result;
  }
  if(topicCode==='3.2'){
    return [
      ...opening('3.2'),
      ...buildAuthoredStoryboard(slides,TOPIC_32),
      authoredStaticScene('h3p-32-recap','h3-end-questions-5c-6','recap','3.2 · RETRIEVAL','Prove a logic design rather than guessing it',[89,106],{
        bullets:['State each gate rule and predict its output before drawing a truth table.','For a multi-stage circuit, name intermediate outputs and calculate them row by row.','Translate words → logic statement/Boolean form → circuit → truth table, then cross-check both routes.','Explain how NAND can act as a building block and why simplification matters in physical circuit design.'],
      }),
    ];
  }
  return null;
}
