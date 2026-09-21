import type { LessonPresentationBeat } from './lesson-experience-model';

type Chapter3LessonFrame = {
  number: number;
  boundary?: string;
  title: string;
  question: string;
  pages: number[];
  objectives: string[];
  starter: string;
  recap: string[];
};

const COMPONENT_LESSONS: readonly Chapter3LessonFrame[] = [
  {
    number: 1,
    title: 'How does a computer store working data?',
    question: 'How do primary memory, ROM technologies and embedded systems differ in purpose and behaviour?',
    pages: [69,70,71,72],
    objectives: [
      'Distinguish memory from secondary storage.',
      'Explain RAM, ROM, SRAM, DRAM, PROM, EPROM and EEPROM using the Hodder distinctions.',
      'Compare DRAM and SRAM using structure, refresh, speed, capacity and cost.',
      'Evaluate benefits and drawbacks of embedded systems.',
    ],
    starter: 'A computer has RAM, ROM and an SSD. Which one is working memory, which survives power loss, and which stores most user files?',
    recap: [
      'Explain why RAM is volatile while ROM is non-volatile.',
      'Compare DRAM and SRAM using at least three source-backed differences.',
      'State one use of PROM or EPROM.',
      'Give one benefit and one drawback of an embedded system in an internet-connected appliance.',
    ],
  },
  {
    number: 2,
    boundary: 'h3-311-hdd',
    title: 'Which secondary-storage technology fits the job?',
    question: 'How do magnetic, solid-state and optical storage differ in operation, access and capacity?',
    pages: [73,74,75,76,77],
    objectives: [
      'Explain HDD tracks, sectors, latency, fragmentation and direct access.',
      'Explain why SSDs reduce latency and compare NAND flash with EEPROM/NOR.',
      'Explain how CDs, DVDs and Blu-ray store and read data using laser light.',
      'Relate laser wavelength and track pitch to optical storage capacity.',
    ],
    starter: 'A laptop needs fast silent storage; an archive needs removable optical media. Which technologies would you choose and why?',
    recap: [
      'Explain why HDD latency exists.',
      'Give two reasons an SSD is usually faster and more robust than an HDD.',
      'Describe the single spiral track used by CDs and DVDs.',
      'Explain why Blu-ray can store more data than DVD using wavelength and track pitch.',
    ],
  },
  {
    number: 3,
    boundary: 'h3-312-laser-printer',
    title: 'How do hardware devices convert digital data into useful output?',
    question: 'How do printers, audio devices, displays and VR systems transform stored data into physical output?',
    pages: [77,78,79,80,81,82,83],
    objectives: [
      'Trace the Hodder laser-printer and inkjet-printer sequences.',
      'Distinguish additive 3D printing from subtractive manufacture.',
      'Explain DAC use in speakers and ADC use in microphones.',
      'Explain OLED/touch-screen operation and the main VR-headset mechanisms.',
    ],
    starter: 'A digital file becomes toner on paper, sound from a speaker and a 3D object. What conversion stages are needed in each case?',
    recap: [
      'Describe the major stages of laser printing in the correct order.',
      'Explain how an inkjet print head produces and places droplets.',
      'Explain why a speaker requires a DAC and a microphone path requires an ADC.',
      'State two mechanisms used by a VR headset to create and track a 3D experience.',
    ],
  },
  {
    number: 4,
    boundary: 'h3-312-sensors-adc-dac',
    title: 'How do sensors turn measurements into monitoring and control?',
    question: 'How does a computer acquire analogue data, decide what it means and act on the physical world?',
    pages: [84,85,86,87,88,89],
    objectives: [
      'Explain sensor input and analogue-to-digital conversion.',
      'Match common sensor types to suitable applications.',
      'Distinguish monitoring from control.',
      'Explain feedback using the Hodder ABS control example.',
    ],
    starter: 'A greenhouse measures temperature and humidity, then opens a vent automatically. Which parts are sensing, processing, conversion and control?',
    recap: [
      'Trace physical property → sensor → ADC → computer.',
      'Choose a suitable sensor for a stated real-world application.',
      'Explain the difference between monitoring and control.',
      'Describe how feedback changes later sensor readings in a control system.',
    ],
  },
] as const;

const LOGIC_LESSONS: readonly Chapter3LessonFrame[] = [
  {
    number: 1,
    title: 'How do logic gates turn binary inputs into decisions?',
    question: 'How do gate rules, truth tables and Boolean notation describe the same logic?',
    pages: [89,90,91,92,93,94],
    objectives: [
      'Recognise NOT, AND, OR, NAND, NOR and XOR gates.',
      'Construct complete truth tables from the number of inputs.',
      'Apply gate rules to trace a multi-stage circuit.',
      'Relate a circuit trace to Boolean values at intermediate points.',
    ],
    starter: 'With three binary inputs, how many input combinations must a complete truth table contain, and why?',
    recap: [
      'State the output rule for each of the six required gate types.',
      'Explain why three inputs require eight truth-table rows.',
      'Trace one multi-stage circuit using named intermediate values.',
      'Explain how XOR differs from OR.',
    ],
  },
  {
    number: 2,
    boundary: 'h3-324-example32',
    title: 'How do we build a circuit from a written condition?',
    question: 'How can a real requirement be translated into gates, intermediate expressions and a verified truth table?',
    pages: [95,96,97,98],
    objectives: [
      'Translate written conditions into NOT, AND and OR operations.',
      'Construct a circuit from the Hodder Example 3.2 conditions.',
      'Verify a circuit by completing its truth table.',
      'Apply the same method to the wind-turbine safety problem in Example 3.3.',
    ],
    starter: 'If an alarm should activate when A is true AND B is false, which gates are required before the final output?',
    recap: [
      'Translate a written condition into a Boolean expression.',
      'Draw the equivalent gate sequence.',
      'Verify the result with a truth table.',
      'Explain why intermediate labels make a complex circuit easier to trace.',
    ],
  },
  {
    number: 3,
    boundary: 'h3-325-real-world-design',
    title: 'How can logic circuits be simplified and implemented efficiently?',
    question: 'How do design constraints, NAND building blocks and multi-input gates change a circuit without changing its logic?',
    pages: [99,100,101,102,103],
    objectives: [
      'Explain why cost, build complexity, reliability and fault tracing affect real circuit design.',
      'Build AND, OR and NOT behaviour from NAND gates.',
      'Explain the value of simplifying a logic circuit.',
      'Relate multi-input AND/OR gates to equivalent networks of two-input gates.',
    ],
    starter: 'Two circuits have the same truth table, but one uses fewer gates. Which practical advantages might the simpler circuit have?',
    recap: [
      'Give two practical reasons to simplify a logic circuit.',
      'Explain how NAND can act as a universal building block.',
      'State the output condition for a four-input AND gate.',
      'Explain how an equivalent cascaded two-input network can be verified.',
    ],
  },
] as const;

function frame(
  lesson: Chapter3LessonFrame,
  prefix: 'h3c' | 'h3l',
  topicLabel: string,
  suffix: 'cover' | 'objectives' | 'starter' | 'recap',
): LessonPresentationBeat {
  const common = {
    id: `${prefix}-l${lesson.number}-${suffix}`,
    slideId: `${prefix}-l${lesson.number}-${suffix}`,
    eyebrow: `LESSON ${lesson.number} OF ${prefix === 'h3c' ? COMPONENT_LESSONS.length : LOGIC_LESSONS.length} · ${topicLabel}`,
    sourcePages: lesson.pages,
    showSource: false,
    visual: 'types' as const,
  };
  if (suffix === 'cover') return {
    ...common,
    kind: 'concept',
    sceneRole: 'hook',
    title: lesson.title,
    lead: lesson.question,
  };
  if (suffix === 'objectives') return {
    ...common,
    kind: 'key-idea',
    sceneRole: 'objective',
    title: 'Learning objectives',
    bullets: lesson.objectives,
  };
  if (suffix === 'starter') return {
    ...common,
    kind: 'check',
    sceneRole: 'challenge',
    title: 'Starter: think, pair, share',
    prompt: lesson.starter,
  };
  return {
    ...common,
    kind: 'check',
    sceneRole: 'recap',
    title: `Lesson ${lesson.number} retrieval check`,
    bullets: lesson.recap,
  };
}

function opening(lesson:Chapter3LessonFrame,prefix:'h3c'|'h3l',topicLabel:string){
  return [
    frame(lesson,prefix,topicLabel,'cover'),
    frame(lesson,prefix,topicLabel,'objectives'),
    frame(lesson,prefix,topicLabel,'starter'),
  ];
}

function frameSequence(
  teaching:LessonPresentationBeat[],
  lessons:readonly Chapter3LessonFrame[],
  prefix:'h3c'|'h3l',
  topicLabel:string,
){
  const result:LessonPresentationBeat[]=[...opening(lessons[0]!,prefix,topicLabel)];
  let active=0;
  const inserted=new Set<number>([0]);
  for(const beat of teaching){
    const nextIndex=lessons.findIndex((lesson,index)=>index>0&&lesson.boundary===beat.slideId);
    if(nextIndex>active&&!inserted.has(nextIndex)){
      result.push(frame(lessons[active]!,prefix,topicLabel,'recap'),...opening(lessons[nextIndex]!,prefix,topicLabel));
      inserted.add(nextIndex);
      active=nextIndex;
    }
    result.push(beat);
  }
  result.push(frame(lessons[active]!,prefix,topicLabel,'recap'));
  return result;
}

export function frameChapter3ComponentsPresentation(teaching:LessonPresentationBeat[]){
  return frameSequence(teaching,COMPONENT_LESSONS,'h3c','CHAPTER 3.1 COMPUTERS AND THEIR COMPONENTS');
}

export function frameChapter3LogicPresentation(teaching:LessonPresentationBeat[]){
  return frameSequence(teaching,LOGIC_LESSONS,'h3l','CHAPTER 3.2 LOGIC GATES AND LOGIC CIRCUITS');
}

export const CHAPTER_3_COMPONENT_LESSON_COUNT=COMPONENT_LESSONS.length;
export const CHAPTER_3_LOGIC_LESSON_COUNT=LOGIC_LESSONS.length;
