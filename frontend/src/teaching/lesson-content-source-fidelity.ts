import { HODDER_CHAPTER_1 } from './lesson-content-hodder-ch1';
import { HODDER_CHAPTER_13 } from './lesson-content-hodder-ch13';
import {
  checkpoint,
  noDirectCheckpoint,
  type HodderLessonChapter,
  type HodderLessonSlide,
  type LessonRichBlock,
} from './lesson-content-hodder-types';

const insertAfter=(slides:HodderLessonSlide[],afterId:string,addition:HodderLessonSlide)=>{
  const index=slides.findIndex(slide=>slide.id===afterId);
  if(index<0)throw new Error(`Missing Hodder lesson anchor: ${afterId}`);
  return [...slides.slice(0,index+1),addition,...slides.slice(index+1)];
};

const patch=(slides:HodderLessonSlide[],id:string,mutate:(slide:HodderLessonSlide)=>HodderLessonSlide)=>
  slides.map(slide=>slide.id===id?mutate(slide):slide);

const appendBlocks=(slide:HodderLessonSlide,blocks:LessonRichBlock[],elements:string[]=[]):HodderLessonSlide=>({
  ...slide,
  richBlocks:[...(slide.richBlocks??[]),...blocks],
  sourceElements:[...(slide.sourceElements??[]),...elements],
});

const sourceNote=(
  title:string,
  sourceText:string,
  examSafeText:string,
  sourceLabel='Hodder printed source',
  examSafeLabel='Cambridge 2027–2029 / teaching-safe form',
):LessonRichBlock=>({
  kind:'source-note',
  title,
  sourceLabel,
  sourceText,
  examSafeLabel,
  examSafeText,
});

let chapter1Slides=[...HODDER_CHAPTER_1.slides];

chapter1Slides=patch(chapter1Slides,'h1-memory-units',slide=>appendBlocks(slide,[
  {kind:'callout',tone:'info',title:'Cambridge assessed objective',text:'Binary magnitudes and the difference between binary prefixes and decimal prefixes are explicit Cambridge 9618 assessed content. Use kibi/kilo, mebi/mega, gibi/giga and tebi/tera precisely.'},
],['Cambridge 9618 binary/decimal-prefix objective']));

chapter1Slides=insertAfter(chapter1Slides,'h1-memory-units',checkpoint(
  'h1-cp-memory-prefixes',
  '1.1 Data representation',
  'Past papers: binary versus decimal memory prefixes',
  ['1.1-lo-00'],
  [6,7],
  'amber',
));

chapter1Slides=patch(chapter1Slides,'h1-114-bcd',slide=>appendBlocks(slide,[
  {kind:'code',title:'Hodder storage detail · 3165',lines:[
    'Method 1 · four single bytes',
    '0000 0011   0000 0001   0000 0110   0000 0101',
    'Method 2 · two packed bytes',
    '0011 0001   0110 0101',
  ]},
  {kind:'callout',tone:'info',title:'Why this matters',text:'BCD is digit-oriented, but the physical packing can differ. The Hodder page explicitly contrasts one byte per digit with two BCD digits packed into each byte.'},
],['BCD four-single-byte and two-packed-byte storage example']));

chapter1Slides=patch(chapter1Slides,'h1-115-ascii',slide=>appendBlocks(slide,[
  {kind:'code',title:'Hodder case-bit example',lines:[
    'a = 01100001₂ = 61₁₆    A = 01000001₂ = 41₁₆',
    'y = 01111001₂ = 79₁₆    Y = 01011001₂ = 59₁₆',
    'The sixth bit changes from 1 to 0 for these lower/upper-case pairs.',
  ]},
],['ASCII lower/upper-case sixth-bit example']));

chapter1Slides=patch(chapter1Slides,'h1-bitmap-resolution',slide=>appendBlocks(slide,[
  {kind:'figure',figure:{
    kind:'pixel-scale',
    title:'Figure 1.3 reconstructed · enlargement and pixelation',
    stages:[
      {label:'A · original',level:1,note:'higher effective pixel density'},
      {label:'B',level:2},
      {label:'C',level:3},
      {label:'D',level:4},
      {label:'E · enlarged',level:5,note:'pixels become visually obvious'},
    ],
    caption:'The number of stored pixels is unchanged while each pixel covers a larger physical area as the bitmap is enlarged.',
  }},
  {kind:'steps',title:'Hodder 1920 × 1080 / 5.5-inch worked PPI',items:[
    'Square the two resolution dimensions and add them.',
    'Take the square root to obtain about 2202.907 pixels along the diagonal.',
    '2202.907 ÷ 5.5 ≈ 401 pixels per inch.',
  ]},
],['Figure 1.3 board reconstruction','401 ppi worked example']));

chapter1Slides=patch(chapter1Slides,'h1-123-sound-wave',slide=>appendBlocks(slide,[
  {kind:'paragraph',text:'Hodder first establishes the physical model: sound needs a medium and cannot travel through a vacuum; particle oscillations create pressure changes. Frequency describes repetition, wavelength is the spatial period and amplitude relates to loudness.'},
  {kind:'figure',figure:{
    kind:'wave',
    title:'Figure 1.5 reconstructed · frequency',
    series:[
      {label:'High frequency',cycles:6},
      {label:'Low frequency',cycles:2},
    ],
    caption:'Both traces use the same horizontal time span. More cycles in that span means higher frequency.',
  }},
  {kind:'figure',figure:{
    kind:'wave',
    title:'Figure 1.6 reconstructed · sampled analogue wave',
    series:[{label:'Sampled sound',cycles:4,samples:20}],
    caption:'Sampling measures the analogue amplitude at discrete time intervals before approximate values are encoded in binary.',
  }},
],['Figure 1.5 board reconstruction','Figure 1.6 board reconstruction','Sound medium/vacuum, wavelength and amplitude detail']));

chapter1Slides=patch(chapter1Slides,'h1-131-mp3-jpeg',slide=>appendBlocks(slide,[
  {kind:'callout',tone:'info',title:'Hodder quantitative source detail',text:'The source gives MP3 bit rates of about 80–320 kbit/s and says roughly 200 kbit/s or above can approach normal-CD quality. It also gives a simplified JPEG raw-bitmap reduction factor of about 5–15 depending on original quality. Treat these as coursebook examples, not universal codec guarantees.'},
],['MP3 80–320 kbit/s source detail','JPEG 5–15 reduction-factor source detail']));

chapter1Slides=patch(chapter1Slides,'h1-rle-images',slide=>appendBlocks(slide,[
  {kind:'figure',figure:{
    kind:'grid',
    title:'Figure 1.7 reconstructed · 8 × 8 black/white F',
    rows:[
      '11111111',
      '10000001',
      '10111111',
      '10111111',
      '10000011',
      '10111111',
      '10111111',
      '10111111',
    ],
    legend:[
      {symbol:'1',label:'white square'},
      {symbol:'0',label:'black square'},
    ],
    caption:'Read adjacent equal cells as runs. Hodder’s simplified example compares 64 uncompressed cells with 30 RLE values.',
  }},
  {kind:'figure',figure:{
    kind:'grid',
    title:'Figure 1.8 reconstructed · four-colour RGB run pattern',
    rows:[
      'WWGGGGWW',
      'WGRRRGGW',
      'WGRRRRGW',
      'WGGGGGGW',
      'WGGRRGGW',
      'WGRRRRGW',
      'WWGGGGWW',
      'WWWWWWWW',
    ],
    legend:[
      {symbol:'W',label:'white · 255,255,255'},
      {symbol:'G',label:'green · 0,255,0'},
      {symbol:'R',label:'red · 255,0,0'},
    ],
    caption:'The board reconstruction keeps the RGB/run idea visible. Hodder’s simplified source compares 192 uncompressed RGB values with 92 RLE values.',
  }},
],['Figure 1.7 board reconstruction','Figure 1.8 board reconstruction']));

chapter1Slides=insertAfter(chapter1Slides,'h1-sound-editing',noDirectCheckpoint(
  'h1-cp-sound-editing',
  '1.2 Multimedia',
  'Past papers: sound-editing operations',
  'Sound-editing features are included in Hodder for complete teaching coverage, but there is no exact 2021–2025 historical LO dedicated to editing operations. The checkpoint remains explicit rather than mixing in sampling questions.',
  [20],
));

chapter1Slides=insertAfter(chapter1Slides,'h1-132-general',noDirectCheckpoint(
  'h1-cp-general-reduction',
  '1.3 File compression',
  'Past papers: general media-size reduction methods',
  'Figure 1.9 combines several source-quality reductions across image, sound and video. The historical corpus has compression LOs, but no exact LO representing this combined Hodder-only list, so the lesson does not silently broaden the checkpoint.',
  [24],
));

let chapter13Slides=[...HODDER_CHAPTER_13.slides];

chapter13Slides=patch(chapter13Slides,'h13-record',slide=>appendBlocks(slide,[
  sourceNote(
    'TbookRecord editorial correction is now explicit',
    'The printed Hodder example on page 307 shows noPages : STRING and fiction : STRING.',
    'CamPath keeps the teaching example as noPages : INTEGER and fiction : BOOLEAN because those types match the field meanings. The correction is labelled rather than silently attributed to Hodder.',
  ),
],['Explicit TbookRecord source/editorial distinction']));

chapter13Slides=patch(chapter13Slides,'h13-sets-classes',slide=>appendBlocks(slide,[
  sourceNote(
    'Set identifier correction is now explicit',
    "The printed Hodder example declares TYPE Sletter = SET OF CHAR, then prints DEFINE vowel (...) : letters.",
    "Current Cambridge pseudocode requires the variable to use the declared set type identifier, so the teaching form uses DEFINE vowel (...) : Sletter.",
  ),
],['Explicit set-identifier source/editorial distinction']));

chapter13Slides=patch(chapter13Slides,'h13-serial',slide=>appendBlocks(slide,[
  {kind:'figure',figure:{
    kind:'sequence',
    title:'Figure 13.1 reconstructed · serial organisation',
    items:[
      {label:'Record 1',note:'first arrival'},
      {label:'Record 2'},
      {label:'Record 3'},
      {label:'…'},
      {label:'Newest',note:'append here'},
    ],
    caption:'Physical order follows arrival order.',
  }},
],['Figure 13.1 board reconstruction']));

chapter13Slides=patch(chapter13Slides,'h13-sequential',slide=>appendBlocks(slide,[
  {kind:'figure',figure:{
    kind:'sequence',
    title:'Figures 13.2–13.3 reconstructed · keyed sequential order',
    items:[
      {label:'1'},{label:'2'},{label:'3'},{label:'4'},{label:'5',note:'inserted in key order'},{label:'7'},{label:'8'},
    ],
    caption:'A new record is physically inserted at its correct key position.',
  }},
],['Figures 13.2–13.3 board reconstruction']));

chapter13Slides=patch(chapter13Slides,'h13-seq-access',slide=>appendBlocks(slide,[
  {kind:'figure',figure:{
    kind:'sequence',
    title:'Figure 13.5 reconstructed · ordered sequential search for Customer 6',
    items:[
      {label:'1'},{label:'2'},{label:'3'},{label:'4'},{label:'5'},{label:'7',note:'stop: 7 > target 6'},{label:'8'},
    ],
    caption:'Because the sequential file is ordered by key, reaching Customer 7 proves Customer 6 is absent; the rest of the file need not be searched.',
  }},
],['Figure 13.5 board reconstruction']));

chapter13Slides=patch(chapter13Slides,'h13-random',slide=>appendBlocks(slide,[
  {kind:'figure',figure:{
    kind:'sequence',
    title:'Figure 13.4 reconstructed · random organisation',
    items:[
      {label:'8'},{label:'2'},{label:'4'},{label:'7'},{label:'3'},{label:'1'},{label:'…'},
    ],
    caption:'Physical order is not key order; the hash gives the home address.',
  }},
],['Figure 13.4 board reconstruction']));

const currentRandomFileSlide:HodderLessonSlide={
  id:'h13-current-random-file-pseudocode',
  section:'13.2 File organisation and access',
  subtopicCode:'13.2',
  eyebrow:'CAMBRIDGE 2027–2029 · PSEUDOCODE ALIGNMENT',
  title:'Translate the hashing idea into the current random-file commands',
  lead:'Hodder explains physical addressing and hashing. The current Cambridge Pseudocode Guide additionally defines the exam-safe file operations used to move the random-file pointer and read/write a record.',
  sourceLabel:'Cambridge 2027–2029 Pseudocode Guide',
  sourcePages:[26,27],
  sourceElements:['9.2 Handling random files','OPENFILE ... FOR RANDOM','SEEK','GETRECORD','PUTRECORD'],
  richBlocks:[
    {kind:'code',title:'Current Cambridge command pattern',lines:[
      'OPENFILE "StudentFile.Dat" FOR RANDOM',
      'SEEK "StudentFile.Dat", Address',
      'GETRECORD "StudentFile.Dat", RecordVariable',
      'SEEK "StudentFile.Dat", Address',
      'PUTRECORD "StudentFile.Dat", RecordVariable',
      'CLOSEFILE "StudentFile.Dat"',
    ]},
    {kind:'steps',title:'Connect this to hashing',items:[
      'Use the record key as the input to the hashing algorithm.',
      'Calculate the home address (and collision probe/overflow location if required).',
      'SEEK moves the file pointer to that record position.',
      'GETRECORD reads the record; PUTRECORD writes/replaces the record at the current position.',
    ]},
    {kind:'callout',tone:'warning',title:'Source layers stay separate',text:'This slide is sourced from the current Cambridge Pseudocode Guide, not retroactively inserted into the 2019 Hodder text. The Hodder explanation remains visible as the conceptual layer.'},
  ],
  visual:'files',
  accent:'indigo',
};

chapter13Slides=insertAfter(chapter13Slides,'h13-hash-collision',currentRandomFileSlide);

chapter13Slides=patch(chapter13Slides,'h13-float-format',slide=>appendBlocks(slide,[
  {kind:'figure',figure:{
    kind:'bitfield',
    title:'Figures 13.6–13.7 reconstructed · floating-point fields',
    fields:[
      {label:'Mantissa',bits:'0 1 0 1 1 0 1 0',detail:'binary point is assumed after the sign bit'},
      {label:'Exponent',bits:'0 0 0 0 0 1 0 0',detail:'two’s-complement signed power of 2'},
    ],
    caption:'Interpret the mantissa and exponent separately, then combine them as M × 2^E.',
  }},
],['Figures 13.6–13.7 board reconstruction']));

chapter13Slides=patch(chapter13Slides,'h13-normalisation',slide=>appendBlocks(slide,[
  {kind:'figure',figure:{
    kind:'bitfield',
    title:'Examples 13.8–13.9 reconstructed · normalisation shift',
    fields:[
      {label:'Positive · before',bits:'0 0 0 1 1 1 0 0   0 0 0 0 0 1 0 1',detail:'0.0011100 × 2^5'},
      {label:'Positive · after',bits:'0 1 1 1 0 0 0 0   0 0 0 0 0 0 1 1',detail:'0.1110000 × 2^3'},
      {label:'Negative · before',bits:'1 1 1 0 1 1 0 0   0 0 0 0 1 0 1 0',detail:'shift until mantissa begins 1.0'},
      {label:'Negative · after',bits:'1 0 1 1 0 0 0 0   0 0 0 0 1 0 0 0',detail:'exponent compensates for the shift'},
    ],
    caption:'Normalisation changes the representation but not the numerical value.',
  }},
],['Examples 13.8–13.9 board reconstruction']));

chapter13Slides=patch(chapter13Slides,'h13-precision-range',slide=>appendBlocks(slide,[
  {kind:'figure',figure:{
    kind:'bitfield',
    title:'Figures 13.10–13.13 reconstructed · extreme 8+8 values',
    fields:[
      {label:'Maximum positive',bits:'0 1 1 1 1 1 1 1   0 1 1 1 1 1 1 1',detail:'largest + mantissa with largest + exponent'},
      {label:'Smallest + magnitude',bits:'0 1 0 0 0 0 0 0   1 0 0 0 0 0 0 0',detail:'normalised + mantissa with most negative exponent'},
      {label:'Smallest − magnitude',bits:'1 0 1 1 1 1 1 1   1 0 0 0 0 0 0 0',detail:'closest representable negative magnitude'},
      {label:'Largest − magnitude',bits:'1 0 0 0 0 0 0 0   0 1 1 1 1 1 1 1',detail:'largest negative magnitude'},
    ],
    caption:'The exact bit patterns make the representable limits concrete.',
  }},
  {kind:'figure',figure:{
    kind:'bitfield',
    title:'Figures 13.14–13.16 reconstructed · fixed 16-bit allocation trade-off',
    fields:[
      {label:'12 + 4',bits:'011111111111 | 0111',detail:'high precision · small range'},
      {label:'8 + 8',bits:'01111111 | 01111111',detail:'balanced precision/range'},
      {label:'4 + 12',bits:'0111 | 011111111111',detail:'low precision · extremely large range'},
    ],
    caption:'Within the same total word size, mantissa bits buy precision and exponent bits buy range.',
  }},
],['Figures 13.10–13.16 board reconstruction']));

export const SOURCE_COMPLETE_CHAPTER_1:HodderLessonChapter={
  ...HODDER_CHAPTER_1,
  slides:chapter1Slides,
};

export const SOURCE_COMPLETE_CHAPTER_13:HodderLessonChapter={
  ...HODDER_CHAPTER_13,
  slides:chapter13Slides,
};
