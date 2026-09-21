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

const CHAPTER_3_SLIDES=slidesFor(3,CHAPTER_3_SLIDE_META);

const CHAPTER_3_DRIVE_PPTX='https://docs.google.com/presentation/d/1hvWdQBlwXbwTJcX0TaofL39ogTxWbCoM/edit?usp=drivesdk&ouid=111028846541723094078&rtpof=true&sd=true';
const CHAPTER_3_PROJECT_PPTX='/9618/presentations/chapter-03/9618_Chapter_03_Hardware_Project_Mirror.pptx';

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

export function realSlideDeckFor(course:string,chapter:number,topicCode:string):RealSlideDeck|null{
  if(course!=='9618')return null;
  if(chapter===3)return chapter3Deck(topicCode);
  return null;
}

export const CHAPTER_3_REAL_SLIDE_COUNT=CHAPTER_3_SLIDES.length;
export const CHAPTER_3_REAL_PPTX_DRIVE_URL=CHAPTER_3_DRIVE_PPTX;
export const CHAPTER_3_PROJECT_PPTX_URL=CHAPTER_3_PROJECT_PPTX;
