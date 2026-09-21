import type { LessonPresentationBeat } from './lesson-experience-model';

type Chapter4LessonFrame = {
  number:number;
  boundary?:string;
  title:string;
  question:string;
  pages:number[];
  objectives:string[];
  starter:string;
  recap:string[];
};

const CPU_LESSONS:readonly Chapter4LessonFrame[]=[
  {
    number:1,
    title:'What is inside the processor?',
    question:'How do the Von Neumann model, CPU components and registers cooperate to execute stored instructions?',
    pages:[107,108,109,110,111],
    objectives:[
      'Explain the Von Neumann stored-program model.',
      'Explain the roles of ALU, CU, system clock and immediate-access store.',
      'State the purposes of PC, MAR, MDR/MBR, CIR, IX and status registers.',
      'Interpret N, V, C and Z status flags after an operation.',
    ],
    starter:'A CPU is given an instruction address, a data value and a result to store. Which registers are most likely involved at each stage?',
    recap:[
      'Sketch the main Von Neumann components and connect them correctly.',
      'Distinguish PC, MAR, MDR and CIR.',
      'Explain why SRAM is suitable for processor cache but not normally main memory.',
      'Interpret one NVCZ flag pattern from a binary result.',
    ],
  },
  {
    number:2,
    boundary:'h4-414-system-buses',
    title:'How does the processor communicate and how can it run faster?',
    question:'How do system buses, clock speed, cache, cores and ports affect processor communication and performance?',
    pages:[112,113,114,115,116],
    objectives:[
      'Distinguish address, data and control buses by direction and purpose.',
      'Relate bus width to addressable memory and transferable word size.',
      'Evaluate clock speed, cache, cores and overclocking as performance factors.',
      'Compare common ports and explain the USB detection/driver sequence.',
    ],
    starter:'Two CPUs have the same clock speed, but one has wider buses, more cache and more cores. Why might their real performance differ?',
    recap:[
      'Explain why the address bus is normally unidirectional but the data bus is bidirectional.',
      'State one performance benefit and one limitation of increasing clock speed.',
      'Explain why adding cores does not automatically multiply performance.',
      'Trace what happens when a new USB device is connected.',
    ],
  },
  {
    number:3,
    boundary:'h4-416-fetch-cycle',
    title:'How does the fetch-execute cycle run and respond to interrupts?',
    question:'How do registers, buses and control signals move one instruction from memory to execution, then service an interrupt safely?',
    pages:[116,117,118,119,120],
    objectives:[
      'Trace the fetch-execute cycle using PC, MAR, MDR and CIR.',
      'Express the cycle with the Hodder register-transfer notation.',
      'Explain when and why interrupts are checked.',
      'Describe the interrupt-service sequence and return to the interrupted program.',
    ],
    starter:'The CPU is halfway through a program when a printer signals that it needs attention. When should the CPU respond, and what state must be preserved?',
    recap:[
      'Put the fetch-execute register transfers in the correct order.',
      'Explain how PC changes during the fetch stage.',
      'State why an interrupt is normally serviced between instructions.',
      'Describe how the CPU resumes the original program after the interrupt service routine.',
    ],
  },
] as const;

const ASSEMBLY_LESSONS:readonly Chapter4LessonFrame[]=[
  {
    number:1,
    title:'How does assembly represent processor instructions?',
    question:'How are machine code, mnemonics, operands and a two-pass assembler connected?',
    pages:[121,122,123,124,125],
    objectives:[
      'Distinguish machine code from assembly language.',
      'Explain opcode, operand, mnemonic and symbolic label.',
      'Explain why a two-pass assembler builds a symbol table before final translation.',
      'Use the Hodder instruction families for data movement, I/O, arithmetic, jumps and comparisons.',
    ],
    starter:'Why would a programmer prefer LDD first over writing the equivalent binary machine instruction by hand?',
    recap:[
      'Distinguish opcode and operand.',
      'Explain what a symbol table stores.',
      'State why two assembler passes are useful.',
      'Choose a suitable instruction from the Hodder set for one data-movement or branch task.',
    ],
  },
  {
    number:2,
    boundary:'h4-424-addressing-modes',
    title:'How does an instruction find the data it needs?',
    question:'How do addressing modes and worked traces change the meaning of the same operand?',
    pages:[125,126,127,128,129],
    objectives:[
      'Distinguish direct/absolute, indirect, indexed, immediate, relative and symbolic addressing.',
      'Trace the three-number assembly program.',
      'Trace an indexed loop using IX, ACC, counter and total.',
      'Apply the instruction set to Activity 4B tasks.',
    ],
    starter:'If memory[200] contains 20 and memory[20] contains 5, what should LDD 200 and LDI 200 load into ACC?',
    recap:[
      'Give one example for each addressing mode.',
      'Explain why labels make a program easier to edit.',
      'Trace how ACC changes in the three-number sum program.',
      'Explain how IX lets one loop process successive array elements.',
    ],
  },
] as const;

const BIT_LESSONS:readonly Chapter4LessonFrame[]=[
  {
    number:1,
    title:'How can individual bits be shifted, tested, set and cleared?',
    question:'How do shift instructions and masks support low-level arithmetic, monitoring and control?',
    pages:[130,131,132],
    objectives:[
      'Distinguish logical, arithmetic and cyclic shifts.',
      'Apply LSL and LSR to ACC.',
      'Use AND as a mask to test a bit.',
      'Use OR and XOR to set or clear selected bits in monitoring/control data.',
    ],
    starter:'A register stores eight sensor flags. How could a program test only sensor bit 3 without changing the other seven bits?',
    recap:[
      'Show one logical, one arithmetic and one cyclic shift.',
      'Explain how an arithmetic right shift preserves sign.',
      'Use an AND mask to test one selected flag bit.',
      'Explain how OR and XOR can change selected bits without rewriting the whole register.',
    ],
  },
] as const;

function frame(
  lesson:Chapter4LessonFrame,
  prefix:'h4c'|'h4a'|'h4b',
  total:number,
  topicLabel:string,
  suffix:'cover'|'objectives'|'starter'|'recap',
):LessonPresentationBeat{
  const common={
    id:`${prefix}-l${lesson.number}-${suffix}`,
    slideId:`${prefix}-l${lesson.number}-${suffix}`,
    eyebrow:`LESSON ${lesson.number} OF ${total} · ${topicLabel}`,
    sourcePages:lesson.pages,
    showSource:false,
    visual:'types' as const,
  };
  if(suffix==='cover')return {...common,kind:'concept',sceneRole:'hook',title:lesson.title,lead:lesson.question};
  if(suffix==='objectives')return {...common,kind:'key-idea',sceneRole:'objective',title:'Learning objectives',bullets:lesson.objectives};
  if(suffix==='starter')return {...common,kind:'check',sceneRole:'challenge',title:'Starter: think, pair, share',prompt:lesson.starter};
  return {...common,kind:'check',sceneRole:'recap',title:`Lesson ${lesson.number} retrieval check`,bullets:lesson.recap};
}

function opening(lesson:Chapter4LessonFrame,prefix:'h4c'|'h4a'|'h4b',total:number,label:string){
  return [
    frame(lesson,prefix,total,label,'cover'),
    frame(lesson,prefix,total,label,'objectives'),
    frame(lesson,prefix,total,label,'starter'),
  ];
}

function frameSequence(
  teaching:LessonPresentationBeat[],
  lessons:readonly Chapter4LessonFrame[],
  prefix:'h4c'|'h4a'|'h4b',
  label:string,
){
  const result:LessonPresentationBeat[]=[...opening(lessons[0]!,prefix,lessons.length,label)];
  let active=0;
  const inserted=new Set<number>([0]);
  for(const beat of teaching){
    const next=lessons.findIndex((lesson,index)=>index>0&&lesson.boundary===beat.slideId);
    if(next>active&&!inserted.has(next)){
      result.push(frame(lessons[active]!,prefix,lessons.length,label,'recap'),...opening(lessons[next]!,prefix,lessons.length,label));
      inserted.add(next);
      active=next;
    }
    result.push(beat);
  }
  result.push(frame(lessons[active]!,prefix,lessons.length,label,'recap'));
  return result;
}

export const frameChapter4CpuPresentation=(teaching:LessonPresentationBeat[]) =>
  frameSequence(teaching,CPU_LESSONS,'h4c','CHAPTER 4.1 CPU ARCHITECTURE');

export const frameChapter4AssemblyPresentation=(teaching:LessonPresentationBeat[]) =>
  frameSequence(teaching,ASSEMBLY_LESSONS,'h4a','CHAPTER 4.2 ASSEMBLY LANGUAGE');

export const frameChapter4BitPresentation=(teaching:LessonPresentationBeat[]) =>
  frameSequence(teaching,BIT_LESSONS,'h4b','CHAPTER 4.3 BIT MANIPULATION');

export const CHAPTER_4_CPU_LESSON_COUNT=CPU_LESSONS.length;
export const CHAPTER_4_ASSEMBLY_LESSON_COUNT=ASSEMBLY_LESSONS.length;
export const CHAPTER_4_BIT_LESSON_COUNT=BIT_LESSONS.length;
