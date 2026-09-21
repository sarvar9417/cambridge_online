export type RealSlideDeckSlide={
  number:number;
  title:string;
  sourcePages?:number[];
  sourceLabel?:string;
  imageUrl:string;
};

export type RealSlideDeck={
  id:string;
  course:'9618';
  chapter:number;
  topicCode:string;
  title:string;
  subtitle:string;
  pptxDriveUrl:string;
  pptxFileName:string;
  projectPptxUrl:string;
  projectPptxFileName:string;
  slides:RealSlideDeckSlide[];
};

type SlideMeta=Omit<RealSlideDeckSlide,'imageUrl'>;

export const REAL_SLIDE_IMAGE_WIDTH=2560;
export const REAL_SLIDE_IMAGE_HEIGHT=1440;
export const REAL_SLIDE_IMAGE_FORMAT='webp' as const;

function slidesFor(chapter:number,meta:readonly SlideMeta[]):RealSlideDeckSlide[]{
  return meta.map(slide=>({
    ...slide,
    sourcePages:slide.sourcePages?[...slide.sourcePages]:undefined,
    imageUrl:`/9618/presentations/chapter-${String(chapter).padStart(2,'0')}/slides/slide-${String(slide.number).padStart(2,'0')}.${REAL_SLIDE_IMAGE_FORMAT}`,
  }));
}

const CHAPTER_3_SLIDE_META:readonly SlideMeta[]=[
  {number:1,title:'3 Hardware',sourcePages:[68]},
  {number:2,title:'3.1.1 Types of memory and storage',sourcePages:[69,70]},
  {number:3,title:'Primary memory: RAM, ROM, DRAM and SRAM',sourcePages:[70,71,72]},
  {number:4,title:'PROM, EPROM and embedded systems',sourcePages:[72,73]},
  {number:5,title:'Secondary storage devices',sourcePages:[73,74,75,76]},
  {number:6,title:'Flash memory and optical storage',sourcePages:[74,75,76,77]},
  {number:7,title:'Printers and 3D printing',sourcePages:[77,78,79,80]},
  {number:8,title:'Sound, screens and touch technology',sourcePages:[81,82,83,84]},
  {number:9,title:'Sensors, monitoring and control',sourcePages:[84,85,86,87,88,89]},
  {number:10,title:'EEPROM, flash memory and SSD internals',sourcePages:[72,74,75]},
  {number:11,title:'HDD operation: tracks, sectors and latency',sourcePages:[73,74]},
  {number:12,title:'Optical storage in detail',sourcePages:[75,76,77]},
  {number:13,title:'Laser printer: full printing sequence',sourcePages:[77,78]},
  {number:14,title:'Inkjet printer: droplets, nozzles and page movement',sourcePages:[79,80]},
  {number:15,title:'3D printing methods and manufacturing ideas',sourcePages:[80,81]},
  {number:16,title:'Sound hardware: DAC, ADC and sampling',sourcePages:[81,82]},
  {number:17,title:'Screens, OLED and touch-screen technologies',sourcePages:[82,83,84]},
  {number:18,title:'Virtual reality headsets',sourcePages:[84]},
  {number:19,title:'Sensor systems: analogue data, ADC, DAC and feedback',sourcePages:[84,85,86,87,88,89]},
  {number:20,title:'Six logic gates: function and truth tables',sourcePages:[90,91,92,93,94]},
  {number:21,title:'Building logic circuits from statements',sourcePages:[95,96,97,98,99,100,101,102,103]},
  {number:22,title:'Chapter 3 complete review and exam practice',sourcePages:[104,105,106]},
];

const CHAPTER_4_SLIDE_META:readonly SlideMeta[]=[
  {number:1,title:'4 Processor Fundamentals',sourcePages:[107]},
  {number:2,title:'Von Neumann architecture and the stored program concept',sourcePages:[107,108]},
  {number:3,title:'CPU components: ALU, CU, clock and IAS',sourcePages:[108]},
  {number:4,title:'Registers: PC, MAR, MDR, CIR, ACC, IX and status register',sourcePages:[109]},
  {number:5,title:'Status register flags: C, N, V and Z',sourcePages:[110,111]},
  {number:6,title:'System buses: address, data and control',sourcePages:[111]},
  {number:7,title:'Processor performance factors',sourcePages:[112,113]},
  {number:8,title:'Cache memory and multi-core processors',sourcePages:[113]},
  {number:9,title:'Ports: USB, HDMI and VGA',sourcePages:[114]},
  {number:10,title:'USB: serial transfer and plug-and-play',sourcePages:[114,115]},
  {number:11,title:'HDMI compared with VGA',sourcePages:[115]},
  {number:12,title:'Fetch-execute cycle overview',sourcePages:[116]},
  {number:13,title:'Fetch stage in Register Transfer Notation',sourcePages:[117]},
  {number:14,title:'Decode and execute stages',sourcePages:[117]},
  {number:15,title:'Interrupt handling and the ISR',sourcePages:[118]},
  {number:16,title:'4.2 Assembly Language',sourcePages:[119]},
  {number:17,title:'Assembly language and machine code',sourcePages:[119,120]},
  {number:18,title:'Two-pass assembler',sourcePages:[120,121]},
  {number:19,title:'Assembly instruction groups',sourcePages:[122,123]},
  {number:20,title:'Addressing modes',sourcePages:[123,124]},
  {number:21,title:'Worked assembly trace',sourcePages:[125,126]},
  {number:22,title:'Indexed addressing and loops',sourcePages:[126,127,128]},
  {number:23,title:'4.3 Bit Manipulation',sourcePages:[129]},
  {number:24,title:'Logical, arithmetic and cyclic shifts',sourcePages:[129,130]},
  {number:25,title:'Logical shift instructions: LSL and LSR',sourcePages:[130]},
  {number:26,title:'Bit masks with AND, OR and XOR',sourcePages:[130,131]},
  {number:27,title:'Monitoring and control with a sensor bit',sourcePages:[131,132]},
  {number:28,title:'2026 exam focus and mark-scheme habits',sourceLabel:'Cambridge 2026 Paper 11 Q3 and Paper 13 Q7 mark schemes'},
  {number:29,title:'Chapter 4 complete review and exam practice',sourcePages:[133,134,135]},
];

const CHAPTER_5_SLIDE_META:readonly SlideMeta[]=[
  {number:1,title:'5 System Software',sourcePages:[136]},
  {number:2,title:'Operating system: the essential bridge',sourcePages:[138,139]},
  {number:3,title:'Start-up: from BIOS to OS in RAM',sourcePages:[138,139]},
  {number:4,title:'GUI, CLI and post-WIMP interfaces',sourcePages:[139,140,141]},
  {number:5,title:'Memory management',sourcePages:[141,142]},
  {number:6,title:'Security management',sourcePages:[142]},
  {number:7,title:'Process, hardware and file management',sourcePages:[142]},
  {number:8,title:'Printer management scenario',sourcePages:[142]},
  {number:9,title:'Utility software overview',sourcePages:[143,144,145,146]},
  {number:10,title:'Disk formatter and bad sectors',sourcePages:[143]},
  {number:11,title:'Antivirus workflow',sourcePages:[144]},
  {number:12,title:'Defragmentation: before and after',sourcePages:[144,145]},
  {number:13,title:'Disk analysis, compression and backup',sourcePages:[145,146]},
  {number:14,title:'Program libraries',sourcePages:[147]},
  {number:15,title:'Static libraries and DLL files',sourcePages:[148]},
  {number:16,title:'Language translators: precise meanings',sourcePages:[150]},
  {number:17,title:'Assembler and loader',sourcePages:[150]},
  {number:18,title:'Compiler vs interpreter',sourcePages:[151,152]},
  {number:19,title:'Partial compilation and bytecode',sourcePages:[152,153]},
  {number:20,title:'IDE overview',sourcePages:[153,154]},
  {number:21,title:'Source-code editor features',sourcePages:[154,155]},
  {number:22,title:'Debugger workflow',sourcePages:[155]},
  {number:23,title:'2026 exam focus: system software',sourceLabel:'Cambridge 2026 system-software mark-scheme habits'},
  {number:24,title:'Chapter 5 complete review',sourcePages:[157,158]},
];

const CHAPTER_3_SLIDES=slidesFor(3,CHAPTER_3_SLIDE_META);
const CHAPTER_4_SLIDES=slidesFor(4,CHAPTER_4_SLIDE_META);
const CHAPTER_5_SLIDES=slidesFor(5,CHAPTER_5_SLIDE_META);

const CHAPTER_3_DRIVE_PPTX='https://docs.google.com/presentation/d/1hvWdQBlwXbwTJcX0TaofL39ogTxWbCoM/edit?usp=drivesdk&ouid=111028846541723094078&rtpof=true&sd=true';
const CHAPTER_3_PROJECT_PPTX='/9618/presentations/chapter-03/9618_Chapter_03_Hardware_Project_Mirror.pptx';
const CHAPTER_4_DRIVE_PPTX='https://docs.google.com/presentation/d/19BNaVlBMDda967NYqRUIyAjAEkF6elYI/edit?usp=drivesdk&ouid=111028846541723094078&rtpof=true&sd=true';
const CHAPTER_4_PROJECT_PPTX='/9618/presentations/chapter-04/9618_Chapter_04_Processor_Fundamentals_Project_Mirror.pptx';
const CHAPTER_5_DRIVE_PPTX='https://docs.google.com/presentation/d/1rfHQbyArf0CnPfMrAJ0hezWflWY__i5k/edit?usp=drivesdk&ouid=111028846541723094078&rtpof=true&sd=true';
const CHAPTER_5_PROJECT_PPTX='/9618/presentations/chapter-05/9618_Chapter_05_System_Software_Project_Mirror.pptx';

function chapter3Deck(topicCode:string):RealSlideDeck{
  const logic=topicCode==='3.2'||topicCode.startsWith('3.2.');
  return {
    id:logic?'9618-ch3-logic-real':'9618-ch3-hardware-real',
    course:'9618',
    chapter:3,
    topicCode:logic?'3.2':'3.1',
    title:logic?'Logic gates and logic circuits':'Computers and their components',
    subtitle:'Chapter 3 Hardware · real slide deck',
    pptxDriveUrl:CHAPTER_3_DRIVE_PPTX,
    pptxFileName:'9618_Chapter_03_Hardware_Real_Deck.pptx',
    projectPptxUrl:CHAPTER_3_PROJECT_PPTX,
    projectPptxFileName:'9618_Chapter_03_Hardware_Project_Mirror.pptx',
    slides:CHAPTER_3_SLIDES.map(slide=>({...slide,sourcePages:slide.sourcePages?[...slide.sourcePages]:undefined})),
  };
}

function chapter4Deck(topicCode:string):RealSlideDeck{
  const code=topicCode.startsWith('4.3')?'4.3':topicCode.startsWith('4.2')?'4.2':'4.1';
  const title=code==='4.3'?'Bit Manipulation':code==='4.2'?'Assembly Language':'Central Processing Unit (CPU) Architecture';
  return {
    id:`9618-ch4-${code.replace('.','')}-real`,
    course:'9618',
    chapter:4,
    topicCode:code,
    title,
    subtitle:'Chapter 4 Processor Fundamentals · real slide deck',
    pptxDriveUrl:CHAPTER_4_DRIVE_PPTX,
    pptxFileName:'9618_Chapter_04_Processor_Fundamentals_Real_Deck.pptx',
    projectPptxUrl:CHAPTER_4_PROJECT_PPTX,
    projectPptxFileName:'9618_Chapter_04_Processor_Fundamentals_Project_Mirror.pptx',
    slides:CHAPTER_4_SLIDES.map(slide=>({...slide,sourcePages:slide.sourcePages?[...slide.sourcePages]:undefined})),
  };
}

function chapter5Deck(topicCode:string):RealSlideDeck{
  const code=topicCode.startsWith('5.2')?'5.2':'5.1';
  return {
    id:`9618-ch5-${code.replace('.','')}-real`,
    course:'9618',
    chapter:5,
    topicCode:code,
    title:code==='5.2'?'Language Translators':'Operating Systems',
    subtitle:'Chapter 5 System Software · real slide deck',
    pptxDriveUrl:CHAPTER_5_DRIVE_PPTX,
    pptxFileName:'9618_Chapter_05_System_Software_Real_Deck.pptx',
    projectPptxUrl:CHAPTER_5_PROJECT_PPTX,
    projectPptxFileName:'9618_Chapter_05_System_Software_Project_Mirror.pptx',
    slides:CHAPTER_5_SLIDES.map(slide=>({...slide,sourcePages:slide.sourcePages?[...slide.sourcePages]:undefined})),
  };
}

export function realSlideDeckFor(course:string,chapter:number,topicCode:string):RealSlideDeck|null{
  if(course!=='9618')return null;
  if(chapter===3)return chapter3Deck(topicCode);
  if(chapter===4)return chapter4Deck(topicCode);
  if(chapter===5)return chapter5Deck(topicCode);
  return null;
}

export const CHAPTER_3_REAL_SLIDE_COUNT=CHAPTER_3_SLIDES.length;
export const CHAPTER_3_REAL_PPTX_DRIVE_URL=CHAPTER_3_DRIVE_PPTX;
export const CHAPTER_3_PROJECT_PPTX_URL=CHAPTER_3_PROJECT_PPTX;
export const CHAPTER_4_REAL_SLIDE_COUNT=CHAPTER_4_SLIDES.length;
export const CHAPTER_4_REAL_PPTX_DRIVE_URL=CHAPTER_4_DRIVE_PPTX;
export const CHAPTER_4_PROJECT_PPTX_URL=CHAPTER_4_PROJECT_PPTX;
export const CHAPTER_5_REAL_SLIDE_COUNT=CHAPTER_5_SLIDES.length;
export const CHAPTER_5_REAL_PPTX_DRIVE_URL=CHAPTER_5_DRIVE_PPTX;
export const CHAPTER_5_PROJECT_PPTX_URL=CHAPTER_5_PROJECT_PPTX;
