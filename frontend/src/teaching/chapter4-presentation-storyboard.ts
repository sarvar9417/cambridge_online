import type { HodderLessonSlide } from './lesson-content-hodder-types';
import type { LessonPresentationBeat } from './lesson-experience-model';
import { authoredStaticScene, buildAuthoredStoryboard, type AuthoredSceneSpec } from './authored-presentation-storyboard';

const s=(spec:AuthoredSceneSpec)=>spec;

const OVERVIEW:AuthoredSceneSpec[]=[
  s({id:'h4p-overview-prior',slideId:'h4-overview',role:'hook',eyebrow:'CHAPTER 4 · PRIOR KNOWLEDGE',title:'What must a processor remember while it executes one instruction?',block:{index:0}}),
  s({id:'h4p-overview-route',slideId:'h4-overview',role:'objective',eyebrow:'CHAPTER 4 · LEARNING ROUTE',title:'Processor fundamentals: architecture → fetch/execute → assembly → bit manipulation',lead:true}),
];

const TOPIC_41:AuthoredSceneSpec[]=[
  s({id:'h4p-411-von-neumann',slideId:'h4-411-von-neumann',role:'visual',eyebrow:'4.1.1 · VON NEUMANN',lead:true,bullets:true,visual:true}),
  s({id:'h4p-412-components',slideId:'h4-412-cpu-components',role:'compare',eyebrow:'4.1.2 · CPU COMPONENTS',lead:true,block:{index:0}}),
  s({id:'h4p-412-shift-example',slideId:'h4-412-cpu-components',role:'visual',eyebrow:'4.1.2 · ALU EXAMPLE',title:'A left shift can perform multiplication by a power of two',example:true}),
  s({id:'h4p-413-registers-a',slideId:'h4-413-registers',role:'compare',eyebrow:'TABLE 4.1 · REGISTERS',title:'CIR, IX and MAR',lead:true,block:{index:0,range:[0,3]}}),
  s({id:'h4p-413-registers-b',slideId:'h4-413-registers',role:'compare',eyebrow:'TABLE 4.1 · REGISTERS',title:'MDR/MBR, PC and SR',block:{index:0,range:[3,6]}}),
  s({id:'h4p-413-flags',slideId:'h4-413-status-flags',role:'compare',eyebrow:'STATUS REGISTER · NVCZ',lead:true,block:{index:0}}),
  s({id:'h4p-413-flag-examples',slideId:'h4-413-status-flags',role:'visual',eyebrow:'STATUS REGISTER · WORKED VALUES',title:'Read NVCZ after binary addition',example:true}),
  s({id:'h4p-413-extension4a',slideId:'h4-413-status-flags',role:'challenge',eyebrow:'EXTENSION 4A',title:'When would P, I, Z and H flags be set?',block:{index:1}}),
  s({id:'h4p-414-buses',slideId:'h4-414-system-buses',role:'compare',eyebrow:'FIGURE 4.2 · SYSTEM BUSES',lead:true,block:{index:0}}),
  s({id:'h4p-414-address-space',slideId:'h4-414-system-buses',role:'visual',eyebrow:'4.1.4 · ADDRESS-BUS WIDTH',title:'Bus width changes the directly addressable space',example:true}),
  s({id:'h4p-414-performance-core',slideId:'h4-414-performance',role:'concept',eyebrow:'4.1.4 · PERFORMANCE',lead:true,bullets:true}),
  s({id:'h4p-414-cores',slideId:'h4-414-performance',role:'compare',eyebrow:'FIGURE 4.3 · MULTIPLE CORES',title:'More cores do not guarantee proportional speed-up',block:{index:0}}),
  s({id:'h4p-415-usb',slideId:'h4-415-ports-usb',role:'process',eyebrow:'4.1.5 · USB',lead:true,bullets:true}),
  s({id:'h4p-415-usb-tradeoffs',slideId:'h4-415-ports-compare',role:'compare',eyebrow:'TABLE 4.2 · USB',title:'USB advantages and limitations',lead:true,block:{index:0}}),
  s({id:'h4p-415-hdmi-vga',slideId:'h4-415-ports-compare',role:'compare',eyebrow:'TABLE 4.3 · HDMI VS VGA',title:'Digital HDMI and analogue VGA',block:{index:1}}),
  s({id:'h4p-415-bandwidth',slideId:'h4-415-ports-compare',role:'visual',eyebrow:'4.1.5 · DISPLAY BANDWIDTH',title:'Why modern display links need higher bandwidth',example:true}),
  s({id:'h4p-416-fetch-cycle',slideId:'h4-416-fetch-cycle',role:'process',eyebrow:'FIGURE 4.5 · FETCH-EXECUTE',lead:true,block:{index:0}}),
  s({id:'h4p-416-rtn',slideId:'h4-416-rtn',role:'process',eyebrow:'4.1.6 · REGISTER TRANSFER NOTATION',lead:true,block:{index:0}}),
  s({id:'h4p-416-rtn-brackets',slideId:'h4-416-rtn',role:'concept',eyebrow:'4.1.6 · RTN DETAIL',title:'Distinguish a register value from memory at the address it holds',example:true}),
  s({id:'h4p-416-interrupt-cycle',slideId:'h4-416-interrupt-cycle',role:'process',eyebrow:'FIGURE 4.6 · INTERRUPT CYCLE',lead:true,bullets:true}),
  s({id:'h4p-417-interrupt-causes',slideId:'h4-417-interrupts',role:'compare',eyebrow:'4.1.7 · INTERRUPT CAUSES',lead:true,block:{index:0}}),
  s({id:'h4p-417-isr-route',slideId:'h4-417-interrupts',role:'process',eyebrow:'4.1.7 · INTERRUPT SERVICE ROUTINE',title:'Save state → run ISR → restore state',bullets:true}),
  s({id:'h4p-41-activity4a',slideId:'h4-41-activity4a',role:'challenge',eyebrow:'ACTIVITY 4A · CONSOLIDATE',lead:true,block:{index:0}}),
  s({id:'h4p-41-source-fidelity',slideId:'h4-41-activity4a',role:'concept',eyebrow:'ACTIVITY 4A · SOURCE NOTE',title:'Preserve the printed values when analysing the source',example:true}),
];

const TOPIC_42:AuthoredSceneSpec[]=[
  s({id:'h4p-42-prior',slideId:'h4-42-prior-keyterms',role:'hook',eyebrow:'4.2 · PRIOR KNOWLEDGE',title:'Which language can the CPU execute directly?',block:{index:0}}),
  s({id:'h4p-42-keyterms',slideId:'h4-42-prior-keyterms',role:'concept',eyebrow:'4.2 · KEY TERMS',title:'Build the assembly-language vocabulary before tracing code',block:{index:1}}),
  s({id:'h4p-421-machine-assembly',slideId:'h4-421-machine-assembly',role:'compare',eyebrow:'4.2.1 · ASSEMBLY VS MACHINE CODE',lead:true,block:{index:0}}),
  s({id:'h4p-421-opcode-operand',slideId:'h4-421-machine-assembly',role:'concept',eyebrow:'4.2.1 · INSTRUCTION STRUCTURE',title:'Opcode says what; operand says with what',bullets:true}),
  s({id:'h4p-422-two-pass',slideId:'h4-422-two-pass-assembler',role:'compare',eyebrow:'4.2.2 · TWO-PASS ASSEMBLER',lead:true,block:{index:0}}),
  s({id:'h4p-422-forward-reference',slideId:'h4-422-two-pass-assembler',role:'process',eyebrow:'4.2.2 · FORWARD REFERENCE',title:'Pass 1 resolves labels before Pass 2 writes object code',example:true}),

  s({id:'h4p-423-data-movement-a',slideId:'h4-423-instruction-set',role:'compare',eyebrow:'TABLE 4.4 · DATA MOVEMENT',title:'Load instructions and their addressing meaning',lead:true,block:{index:0,range:[0,5]}}),
  s({id:'h4p-423-data-movement-b',slideId:'h4-423-instruction-set',role:'compare',eyebrow:'TABLE 4.4 · DATA MOVEMENT',title:'Move, store and end',block:{index:0,range:[5,8]}}),
  s({id:'h4p-423-other-families',slideId:'h4-423-instruction-set',role:'compare',eyebrow:'TABLES 4.5–4.8 · INSTRUCTION FAMILIES',title:'I/O, arithmetic, jump and compare',block:{index:1}}),
  s({id:'h4p-423-number-prefixes',slideId:'h4-423-instruction-set',role:'concept',eyebrow:'4.2.3 · OPERAND NOTATION',title:'B, &, and # identify source number formats',bullets:true}),

  s({id:'h4p-424-addressing-a',slideId:'h4-424-addressing-modes',role:'compare',eyebrow:'4.2.4 · ADDRESSING MODES',title:'Direct, indirect and indexed',lead:true,block:{index:0,range:[0,3]}}),
  s({id:'h4p-424-addressing-b',slideId:'h4-424-addressing-modes',role:'compare',eyebrow:'4.2.4 · ADDRESSING MODES',title:'Immediate, relative and symbolic',block:{index:0,range:[3,6]}}),
  s({id:'h4p-424-labels',slideId:'h4-424-addressing-modes',role:'concept',eyebrow:'TABLE 4.9 · LABELS',title:'Labels decouple source code from fixed absolute addresses',block:{index:1},bullets:true}),

  s({id:'h4p-425-program1-code',slideId:'h4-425-three-number-program',role:'process',eyebrow:'4.2.5 · WORKED TRACE 1',title:'Translate total = first + second + third',lead:true,block:{index:0}}),
  s({id:'h4p-425-program1-symbols',slideId:'h4-425-three-number-program',role:'visual',eyebrow:'WORKED TRACE 1 · SYMBOL TABLE',title:'Resolve each label to an address',block:{index:1}}),
  s({id:'h4p-425-program1-trace',slideId:'h4-425-three-number-program',role:'visual',eyebrow:'WORKED TRACE 1 · TRACE TABLE',title:'Follow ACC until total becomes 90',block:{index:2}}),
  s({id:'h4p-425-program2-code',slideId:'h4-425-indexed-loop',role:'process',eyebrow:'4.2.5 · WORKED TRACE 2',title:'Use IX and a counter to traverse three values',lead:true,block:{index:0}}),
  s({id:'h4p-425-program2-symbols',slideId:'h4-425-indexed-loop',role:'visual',eyebrow:'WORKED TRACE 2 · SYMBOL TABLE',title:'Map loop, number, counter and total',block:{index:1}}),
  s({id:'h4p-425-program2-trace',slideId:'h4-425-indexed-loop',role:'visual',eyebrow:'WORKED TRACE 2 · MILESTONES',title:'Watch ACC, IX, counter and total change together',block:{index:2}}),
  s({id:'h4p-42-activity4b',slideId:'h4-42-activity4b',role:'challenge',eyebrow:'ACTIVITY 4B · APPLY',lead:true,block:{index:0}}),
  s({id:'h4p-42-activity4b-data',slideId:'h4-42-activity4b',role:'visual',eyebrow:'ACTIVITY 4B · SUPPLIED DATA',title:'Dry-run the provided program before writing your own',example:true}),
];

const TOPIC_43:AuthoredSceneSpec[]=[
  s({id:'h4p-43-shift-types',slideId:'h4-43-binary-shifts',role:'compare',eyebrow:'4.3.1 · SHIFT TYPES',lead:true,block:{index:0}}),
  s({id:'h4p-43-arithmetic-purpose',slideId:'h4-43-binary-shifts',role:'concept',eyebrow:'4.3.1 · ARITHMETIC SHIFT',title:'Shifts can multiply or divide by powers of two',block:{index:1},bullets:true}),
  s({id:'h4p-431-lsl-lsr',slideId:'h4-431-lsl-lsr',role:'compare',eyebrow:'TABLE 4.10 · LSL / LSR',lead:true,block:{index:0},bullets:true}),
  s({id:'h4p-432-mask-table',slideId:'h4-432-mask-operations',role:'compare',eyebrow:'TABLE 4.11 · MASK OPERATIONS',lead:true,block:{index:0}}),
  s({id:'h4p-432-mask-code',slideId:'h4-432-mask-operations',role:'process',eyebrow:'4.3.2 · SENSOR FLAG',title:'AND checks bit 3; XOR clears it after processing',block:{index:1},bullets:true}),
  s({id:'h4p-43-activity4c',slideId:'h4-43-activity4c',role:'challenge',eyebrow:'ACTIVITY 4C · SHIFT AND MASK',lead:true,block:{index:0}}),
  s({id:'h4p-eoc-q1-4',slideId:'h4-eoc-questions-1-4',role:'exam',eyebrow:'END OF CHAPTER · QUESTIONS 1–4',lead:true,block:{index:0}}),
  s({id:'h4p-eoc-q5-system',slideId:'h4-eoc-question-5',role:'exam',eyebrow:'END OF CHAPTER · QUESTION 5',title:'Intruder detector: understand the system before tracing code',lead:true,block:{index:0}}),
  s({id:'h4p-eoc-q5-code',slideId:'h4-eoc-question-5',role:'process',eyebrow:'QUESTION 5 · SOURCE ASSEMBLY',title:'Trace one sensor bit per loop',block:{index:1}}),
  s({id:'h4p-eoc-q5-tasks',slideId:'h4-eoc-question-5',role:'challenge',eyebrow:'QUESTION 5 · EXAM TASKS',title:'Dry-run, complete and adapt the program',block:{index:2},example:true}),
];

function opening(topicCode:'4.1'|'4.2'|'4.3'):LessonPresentationBeat[] {
  if(topicCode==='4.1')return [
    authoredStaticScene('h4p-41-hook','h4-411-von-neumann','hook','4.1 · STARTER','The CPU can only execute correctly if data, addresses and control signals arrive in the right order',[109,119],{lead:'Architecture, registers and buses become one repeated fetch-execute cycle; interrupts modify that cycle without losing program state.'}),
    authoredStaticScene('h4p-41-objectives','h4-overview','objective','4.1 · LESSON GOALS','By the end of 4.1 you should be able to…',[107],{bullets:['Explain Von Neumann architecture, CPU components and special-purpose registers.','Compare address, data and control buses and relate widths to performance.','Explain ports, the fetch-execute cycle and Register Transfer Notation.','Trace how an interrupt is recognised, prioritised and serviced by an ISR.']}),
  ];
  if(topicCode==='4.2')return [
    authoredStaticScene('h4p-42-objectives','h4-42-prior-keyterms','objective','4.2 · LESSON GOALS','By the end of 4.2 you should be able to…',[121,129],{bullets:['Relate assembly language to machine code using opcode and operand structure.','Explain two-pass assembly, labels, symbols and forward references.','Select addressing modes and use the Hodder instruction set accurately.','Trace simple programs using ACC, IX, symbol tables and trace tables.']}),
  ];
  return [
    authoredStaticScene('h4p-43-hook','h4-43-binary-shifts','hook','4.3 · STARTER','How can one byte act as eight independent on/off sensor flags?',[130,132],{lead:'Bit manipulation uses shifts and masks so individual bits can be moved, checked, set and cleared without changing the whole value.'}),
    authoredStaticScene('h4p-43-objectives','h4-43-binary-shifts','objective','4.3 · LESSON GOALS','By the end of 4.3 you should be able to…',[130,132],{bullets:['Distinguish logical, arithmetic and cyclic shifts.','Use LSL and LSR on ACC and explain the inserted or preserved bits.','Use AND, OR and XOR masks to check, set and clear flags.','Apply shifts and masking in monitoring/control assembly problems.']}),
  ];
}

export function chapter4PresentationStoryboard(topicCode:string,slides:readonly HodderLessonSlide[]):LessonPresentationBeat[]|null {
  if(topicCode==='overview')return buildAuthoredStoryboard(slides,OVERVIEW);
  if(topicCode==='4.1')return [
    ...opening('4.1'),
    ...buildAuthoredStoryboard(slides,TOPIC_41),
    authoredStaticScene('h4p-41-recap','h4-41-activity4a','recap','4.1 · RETRIEVAL','Reconstruct one complete processor cycle from memory',[109,120],{bullets:['Architecture: CPU components, registers, buses and performance factors.','Fetch: PC → MAR → MDR → CIR, increment PC, decode and execute.','RTN: distinguish [register] from [[address register]].','Interrupt: detect → prioritise → save state → ISR → restore state → resume.']}),
  ];
  if(topicCode==='4.2')return [
    ...opening('4.2'),
    ...buildAuthoredStoryboard(slides,TOPIC_42),
    authoredStaticScene('h4p-42-exam','h4-42-activity4b','exam','4.2 · EXAM CHECK','Choose the addressing mode before you trace the instruction',[125,129],{activity:{title:'Explain the result',prompt:'If memory[200] = 300 and memory[300] = 50, state ACC after LDM #200, LDD 200 and LDI 200.',reveal:'LDM #200 uses immediate addressing so ACC = 200. LDD 200 uses direct addressing so ACC = 300. LDI 200 follows the address stored at 200, so ACC = 50.'}}),
    authoredStaticScene('h4p-42-recap','h4-42-activity4b','recap','4.2 · RETRIEVAL','Trace assembly by separating translation, addressing and state',[121,129],{bullets:['Instruction = opcode + operand; assembly mnemonics translate to machine code.','Two-pass assembly resolves symbols/forward references before object code is completed.','Addressing mode determines how the operand leads to the value.','Trace ACC, IX, memory and control flow one instruction at a time.']}),
  ];
  if(topicCode==='4.3')return [
    ...opening('4.3'),
    ...buildAuthoredStoryboard(slides,TOPIC_43),
    authoredStaticScene('h4p-43-recap','h4-eoc-question-5','recap','4.3 · RETRIEVAL','Use the bit pattern as state, not just as a number',[130,135],{bullets:['Logical shift inserts zeros; arithmetic shift preserves sign; cyclic shift wraps displaced bits.','LSL/LSR operate on ACC in the Hodder instruction subset.','AND can test a masked bit; OR can set it; XOR can clear a set bit.','In a sensor program, trace the mask/value and counter together to explain the system behaviour.']}),
  ];
  return null;
}
