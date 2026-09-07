import type { HodderLessonSlide } from './lesson-content-hodder-types';
import {
  IGCSE_CH1_ACTIVITY_IDS,
  IGCSE_CH1_EXAM_STYLE_QUESTION_IDS,
  IGCSE_CH1_KEY_TERMS,
  IGCSE_CH1_PAGE_INVENTORY,
  IGCSE_CH1_SESSION_PLAN,
} from './igcse-ch1-source-inventory';

type Term = { term:string; definition:string };
type SessionConfig = {
  id:string;
  title:string;
  section:string;
  sourcePages:number[];
  eyebrow:string;
  lead:string;
  bullets:string[];
  formula?:string;
  example?:HodderLessonSlide['example'];
  terms?:Term[];
  activityTitle:string;
  activityPrompt:string;
  activityReveal?:string;
  sourceElements:string[];
  visual:HodderLessonSlide['visual'];
  accent:HodderLessonSlide['accent'];
};

const s=(config:SessionConfig):HodderLessonSlide[]=>[
  {
    id:`${config.id}-learn`,section:config.section,eyebrow:config.eyebrow,title:config.title,lead:config.lead,
    bullets:config.bullets,formula:config.formula,example:config.example,keyTerms:config.terms,
    sourcePages:config.sourcePages,sourceElements:config.sourceElements,sourceLabel:'0478 coursebook source',
    visual:config.visual,accent:config.accent,
  },
  {
    id:`${config.id}-practice`,section:config.section,eyebrow:'YOUR TURN · SOURCE-BACKED PRACTICE',title:`Practise: ${config.title}`,
    lead:'Use the idea from this session. Work independently first, then compare your reasoning with the guidance.',
    activity:{title:config.activityTitle,prompt:config.activityPrompt,...(config.activityReveal?{reveal:config.activityReveal}:{})},
    sourcePages:config.sourcePages,sourceElements:config.sourceElements,sourceLabel:'0478 coursebook practice',
    visual:config.visual,accent:config.accent,
  },
];

const sessions:SessionConfig[]=[
  {id:'0478-c1-s01',section:'S01 · Why binary',title:'Why computers represent data in binary',sourcePages:[2,3],eyebrow:'CHAPTER 1 · SESSION 01',lead:'Computers need a representation that matches reliable electronic states. Binary gives two values that can map to switching states.',bullets:['A bit is one binary digit: 0 or 1.','Denary is base 10; binary is base 2.','The value of a digit depends on its column weight.','To convert binary to denary, add the weights of columns containing 1.'],formula:'8-bit weights: 128 · 64 · 32 · 16 · 8 · 4 · 2 · 1',example:{title:'Convert 11101110₂',lines:['128 + 64 + 32 + 8 + 4 + 2','= 238'],answer:'11101110₂ = 238₁₀'},terms:[{term:'bit',definition:'A single binary digit, either 0 or 1.'},{term:'binary number system',definition:'Base-2 representation using only 0 and 1.'}],activityTitle:'Read a binary value',activityPrompt:'Convert 00110101₂ to denary. Show which column weights you use.',activityReveal:'32 + 16 + 4 + 1 = 53.',sourceElements:['learning outline','binary represents data','binary place value','worked binary-to-denary examples'],visual:'binary',accent:'indigo'},
  {id:'0478-c1-s02',section:'S02 · Binary → denary',title:'Convert binary values of different widths',sourcePages:[4],eyebrow:'CHAPTER 1 · SESSION 02',lead:'The same place-value rule works for 8-bit, 12-bit and 16-bit values; only the available powers of two change.',bullets:['Start at the rightmost 2⁰ column.','Write the weight above each bit.','Ignore 0 bits and add only the weights under 1 bits.','Check that your answer is within the maximum value for the bit width.'],example:{title:'16-bit method',lines:['Mark every 1-bit column.','Add the corresponding powers of two.','Recheck the total against the bit pattern.']},activityTitle:'Activity 1.1 · adapted',activityPrompt:'Convert several 8-bit and 12-bit binary values to denary. For each one, write the column weights you added.',sourceElements:['Activity 1.1','16-bit binary-to-denary worked example'],visual:'binary',accent:'cyan'},
  {id:'0478-c1-s03',section:'S03 · Denary → binary',title:'Convert denary to binary using two reliable methods',sourcePages:[5,6,7],eyebrow:'CHAPTER 1 · SESSION 03',lead:'You can build the value from powers of two or repeatedly divide by two and read the remainders in reverse order.',bullets:['Method 1: subtract the largest possible power of two and mark that column 1.','Method 2: repeatedly divide by 2 and record every remainder.','Read division remainders from bottom to top.','Pad with leading zeros when a fixed bit width is required.'],example:{title:'Convert 142₁₀',lines:['128 fits → remainder 14','8 fits → remainder 6','4 fits → remainder 2','2 fits → remainder 0'],answer:'10001110₂'},activityTitle:'Activity 1.2 · adapted',activityPrompt:'Choose three denary values. Convert each using both methods and verify that both binary answers match.',sourceElements:['Activity 1.2','repeated-division figures','16-bit conversion example'],visual:'binary',accent:'indigo'},
  {id:'0478-c1-s04',section:'S04 · Binary ↔ hexadecimal',title:'Use four-bit groups to move between binary and hexadecimal',sourcePages:[8,9],eyebrow:'CHAPTER 1 · SESSION 04',lead:'One hexadecimal digit maps exactly to four binary bits because 16 = 2⁴.',bullets:['Group binary from the right in blocks of four.','Pad only the leftmost incomplete group with zeros.','Replace each four-bit group with one hexadecimal digit.','For hex to binary, expand every hex digit to exactly four bits.'],formula:'1 hex digit ↔ 4 bits',example:{title:'1011 1110 0001₂',lines:['1011 → B','1110 → E','0001 → 1'],answer:'BE1₁₆'},activityTitle:'Activity 1.3 · adapted',activityPrompt:'Convert five binary patterns to hexadecimal, including at least one whose leftmost group needs zero-padding.',sourceElements:['binary-hex-denary table','Activity 1.3','worked binary↔hex examples'],visual:'bases',accent:'indigo'},
  {id:'0478-c1-s05',section:'S05 · Hexadecimal ↔ denary',title:'Convert hexadecimal and denary values',sourcePages:[10,11],eyebrow:'CHAPTER 1 · SESSION 05',lead:'Hexadecimal is a positional base-16 system. Use powers of 16 for hex-to-denary and repeated division by 16 for denary-to-hex.',bullets:['A–F represent denary 10–15.','Hex place weights include 1, 16, 256, 4096, …','For denary to hex, repeatedly divide by 16.','Remainders 10–15 become A–F.'],formula:'value = Σ(hex digit × 16^position)',example:{title:'Convert 45A₁₆',lines:['4×256 = 1024','5×16 = 80','A = 10'],answer:'1114₁₀'},activityTitle:'Activities 1.4–1.5 · adapted',activityPrompt:'Do one hex→binary, one hex→denary and one denary→hex conversion. Show every step.',sourceElements:['Activity 1.4','Activity 1.5','worked hex-denary examples','repeated-division hex figures'],visual:'bases',accent:'cyan'},
  {id:'0478-c1-s06',section:'S06 · Uses of hexadecimal',title:'Recognise why hexadecimal is used in real systems',sourcePages:[12,13,14],eyebrow:'CHAPTER 1 · SESSION 06',lead:'Hexadecimal makes long binary values shorter and easier for humans to inspect while retaining a direct relationship with bits.',bullets:['Error codes can identify faults or locations compactly.','MAC addresses are commonly written as hexadecimal byte groups.','IPv6 uses hexadecimal groups to represent a 128-bit address.','HTML/CSS colour notation uses hexadecimal RGB intensity values.','A six-digit RGB hex colour can represent 256³ colour combinations.'],terms:[{term:'error code',definition:'A code generated to identify an error or fault condition.'},{term:'MAC address',definition:'A hardware network identifier commonly written as hexadecimal groups.'},{term:'IP address',definition:'An address used to identify a device/location on an IP network.'},{term:'HTML',definition:'A markup language used to structure web pages; hexadecimal notation can specify colours.'}],activityTitle:'Activity 1.6 + Find out more · adapted',activityPrompt:'For each item—error code, MAC address, IPv6 address and web colour—explain why hexadecimal is more convenient than a long binary string.',sourceElements:['Activity 1.6','error-code figure','memory-dump Find out more','MAC-address Find out more','IP-address Find out more','networking Links','HTML colour-code figures'],visual:'bases',accent:'emerald'},
  {id:'0478-c1-s07',section:'S07 · Binary addition',title:'Add binary values and detect overflow',sourcePages:[15,16,17],eyebrow:'CHAPTER 1 · SESSION 07',lead:'Binary addition follows place-value carry rules. A fixed-width register can overflow when the mathematical result needs more bits than are available.',bullets:['0+0=0; 0+1=1; 1+1=10.','Carry into the next column when a column total is 2 or 3.','An 8-bit unsigned result must fit from 0 to 255.','Overflow is a storage-width problem, not a calculation mistake.'],terms:[{term:'overflow error',definition:'A result is too large for the allocated number of bits.'}],example:{title:'Spot overflow',lines:['11110000','+ 00110000','= 1 00100000'],answer:'Nine bits are required, so an 8-bit register overflows.'},activityTitle:'Activities 1.7–1.10 · adapted',activityPrompt:'Complete four 8-bit additions. Identify any result that cannot be stored in 8 bits and explain why.',sourceElements:['Activity 1.7','Activity 1.8','Activity 1.9','Activity 1.10','binary-addition examples','overflow Advice'],visual:'arithmetic',accent:'rose'},
  {id:'0478-c1-s08',section:'S08 · Logical shifts',title:'Predict the effect of logical left and right shifts',sourcePages:[18,19,20],eyebrow:'CHAPTER 1 · SESSION 08',lead:'A logical shift moves every bit and inserts zeros into emptied positions. Bits shifted out of the register are lost.',bullets:['Left shift by one usually multiplies an unsigned value by 2 if no significant bit is lost.','Right shift by one usually performs integer division by 2.','Multiple shifts repeat the effect by powers of two.','If a 1 is discarded, the simple multiply/divide interpretation may no longer preserve the original value.'],terms:[{term:'logical shift',definition:'Moves all bits left or right, inserts zeros and discards bits that leave the register.'}],activityTitle:'Activity 1.11 · adapted',activityPrompt:'Apply one left shift and one right shift to 00110110. Give the new bit patterns and denary values, then explain the numerical effect.',activityReveal:'Left: 01101100 = 108. Right: 00011011 = 27.',sourceElements:['Activity 1.11','logical-shift worked examples'],visual:'arithmetic',accent:'amber'},
  {id:'0478-c1-s09',section:'S09 · Two’s complement',title:'Read signed binary using two’s complement',sourcePages:[21,22],eyebrow:'CHAPTER 1 · SESSION 09',lead:'Two’s complement gives the most significant bit a negative weight and provides one representation of zero.',bullets:['For 8 bits the weights are −128, 64, 32, 16, 8, 4, 2, 1.','A leading 0 indicates a non-negative value; a leading 1 indicates a negative value.','Add the signed column weights to interpret the pattern.','8-bit two’s-complement range is −128 to +127.'],terms:[{term:'two’s complement',definition:'A signed binary representation in which the most significant bit has a negative weight.'}],formula:'8-bit signed range: −128 … +127',activityTitle:'Interpret signed values',activityPrompt:'Find the denary values of 00101101 and 10111001 using signed column weights.',sourceElements:['two’s-complement introduction','worked signed-value examples'],visual:'arithmetic',accent:'rose'},
  {id:'0478-c1-s10',section:'S10 · Negative values',title:'Create and convert negative two’s-complement values',sourcePages:[23,24,25],eyebrow:'CHAPTER 1 · SESSION 10',lead:'To create a negative fixed-width two’s-complement value, write the positive value, invert every bit and add 1.',bullets:['Keep the same fixed bit width throughout.','Invert all bits, including leading zeros.','Add 1 to the least significant bit.','To check, interpret the result using signed weights.','The same method extends to wider words such as 12 bits.'],example:{title:'Write −53 in 8 bits',lines:['53 = 00110101','invert → 11001010','add 1 → 11001011'],answer:'−53 = 11001011₂'},activityTitle:'Activities 1.12–1.14 · adapted',activityPrompt:'Convert three negative denary values to 8-bit two’s complement and three negative two’s-complement patterns back to denary.',sourceElements:['Activity 1.12','Activity 1.13','Activity 1.14','12-bit two’s-complement example'],visual:'arithmetic',accent:'rose'},
  {id:'0478-c1-s11',section:'S11 · Character sets',title:'Represent text using ASCII and Unicode',sourcePages:[26,27,28],eyebrow:'CHAPTER 1 · SESSION 11',lead:'Computers store character codes as numbers. A character set defines which number corresponds to which character.',bullets:['Standard ASCII uses 7-bit codes and includes control codes.','Printable ASCII letters, digits and punctuation occupy organised ranges.','Uppercase and lowercase letters have predictable code relationships.','Unicode provides a much larger repertoire for scripts and symbols worldwide.'],terms:[{term:'ASCII code',definition:'A standard character-code set for keyboard characters and controls.'},{term:'character set',definition:'A defined mapping between characters and numeric codes.'},{term:'Unicode',definition:'A universal character repertoire supporting writing systems and symbols around the world.'}],activityTitle:'Character-code investigation',activityPrompt:'Use an ASCII table to compare A with a and 0 with 9. Explain why consecutive code ranges are useful to programs.',sourceElements:['ASCII table','uppercase/lowercase pattern','Unicode discussion','multilingual table','character-set Find out more'],visual:'characters',accent:'emerald'},
  {id:'0478-c1-s12',section:'S12 · Sound',title:'Digitise sound by sampling an analogue waveform',sourcePages:[29,30],eyebrow:'CHAPTER 1 · SESSION 12',lead:'A microphone produces an analogue signal. A computer records measurements of its amplitude at regular time intervals and stores each measurement as a binary value.',bullets:['Sampling rate = samples taken each second.','Sampling resolution/bit depth = bits used for each sample.','Higher sampling rate captures more time detail but creates more data.','Greater sample resolution gives more amplitude levels but creates more data.','Both choices affect quality and file size.'],terms:[{term:'sampling rate',definition:'The number of sound samples recorded each second.'},{term:'sampling resolution',definition:'The number of bits used to store each sample amplitude.'},{term:'bit depth',definition:'The number of bits used for the smallest encoded unit, such as a sound sample.'}],activityTitle:'Predict quality and size',activityPrompt:'Compare two recordings: 22 kHz/8-bit and 44 kHz/16-bit. Which should be more accurate? Which should be larger? Explain both answers.',sourceElements:['sound waveform figures','sampling-rate discussion','sampling-resolution discussion','sound Link'],visual:'sound',accent:'cyan'},
  {id:'0478-c1-s13',section:'S13 · Images',title:'Represent a bitmap image with pixels, resolution and colour depth',sourcePages:[31],eyebrow:'CHAPTER 1 · SESSION 13',lead:'A bitmap stores a grid of pixels. The number of pixels and the number of bits used per pixel determine detail, colour range and uncompressed data size.',bullets:['Pixel means picture element.','Image resolution gives pixel dimensions such as width × height.','Colour depth gives bits used to encode one pixel.','n bits can encode up to 2ⁿ colour values.','Increasing resolution or colour depth normally increases file size.'],terms:[{term:'bitmap image',definition:'An image stored as a grid of pixels.'},{term:'pixel',definition:'The smallest picture element in a bitmap.'},{term:'image resolution',definition:'The pixel dimensions of an image.'},{term:'colour depth',definition:'The number of bits used to encode a pixel colour.'},{term:'pixelated (image)',definition:'Visible block-like pixels caused by enlarging a bitmap beyond its useful detail.'},{term:'pixel density',definition:'The number of pixels packed into a given physical display area.'}],activityTitle:'Activity 1.15 · adapted',activityPrompt:'For a 1920×1080 bitmap, explain separately what changes when resolution increases and when colour depth increases.',sourceElements:['Activity 1.15','bitmap-image figure','pixel/resolution/colour-depth concepts'],visual:'pixels',accent:'cyan'},
  {id:'0478-c1-s14',section:'S14 · Storage & file size',title:'Use binary storage units and calculate uncompressed file sizes',sourcePages:[32,33],eyebrow:'CHAPTER 1 · SESSION 14',lead:'File-size calculations combine the number of encoded items with bits per item, then convert bits to bytes and larger binary units.',bullets:['1 byte = 8 bits.','1 KiB = 2¹⁰ bytes; 1 MiB = 2²⁰; 1 GiB = 2³⁰.','Bitmap size ≈ width × height × colour depth.','Sound size ≈ sample rate × sample resolution × duration × channels.','Always state units and convert carefully.'],formula:'image bits = width × height × colour depth',example:{title:'Bitmap calculation route',lines:['pixels = width × height','bits = pixels × colour depth','bytes = bits ÷ 8','convert bytes to KiB/MiB/GiB']},activityTitle:'Activity 1.16 · adapted',activityPrompt:'Calculate one image-file size and one sound-file size. Show the value in bits, bytes and an appropriate binary unit.',sourceElements:['binary storage-unit tables','file-size Examples 1–3','Activity 1.16','storage Advice'],visual:'binary',accent:'amber'},
  {id:'0478-c1-s15',section:'S15 · Compression',title:'Explain why compression is needed and choose lossy or lossless',sourcePages:[34,35,36],eyebrow:'CHAPTER 1 · SESSION 15',lead:'Compression reduces file size to save storage and transmission time. The correct method depends on whether information may be discarded.',bullets:['Lossless compression allows the original data to be reconstructed.','Lossy compression permanently discards selected information.','Images, audio and video often tolerate carefully designed lossy reduction.','Program/source/text data usually needs lossless preservation.','Smaller files use less storage and bandwidth and transfer faster.'],terms:[{term:'compression',definition:'Reducing file size by removing or encoding redundancy.'},{term:'bandwidth',definition:'The maximum data-transfer rate of a communication channel.'},{term:'lossy (file compression)',definition:'Compression that permanently discards some original information.'},{term:'lossless (file compression)',definition:'Compression from which the original can be reconstructed exactly.'},{term:'audio compression',definition:'Methods that reduce sound-file size, often using properties of human hearing.'},{term:'MP3',definition:'A commonly used lossy audio format.'},{term:'MP4',definition:'A multimedia container commonly used with compressed audio/video.'},{term:'JPEG',definition:'A common lossy compression method for photographic images.'}],activityTitle:'Choose the method',activityPrompt:'Choose lossy or lossless compression for a photograph, a source-code file, a music preview and an executable. Justify each decision.',sourceElements:['compression need','lossy/lossless comparison','audio compression','MP3','MP4','JPEG'],visual:'compression',accent:'emerald'},
  {id:'0478-c1-s16',section:'S16 · Run-length encoding',title:'Apply run-length encoding to repeated data',sourcePages:[37],eyebrow:'CHAPTER 1 · SESSION 16',lead:'Run-length encoding stores repeated sequences as a value plus the number of repetitions. It works best when long runs occur often.',bullets:['RLE is lossless.','A run records both the repeated symbol/value and its count.','Alternating or highly varied data may not compress well.','File headers and other metadata still contribute to the real file size.'],terms:[{term:'run length encoding (RLE)',definition:'A lossless technique that replaces consecutive repeated values with a value-and-count representation.'}],example:{title:'Simple row',lines:['AAAAABBBCC','A×5, B×3, C×2'],answer:'Longer runs produce larger savings.'},activityTitle:'RLE worked practice',activityPrompt:'Design an 8×8 two-colour pattern with long runs. Write an RLE representation row by row and compare the number of stored values with the uncompressed grid.',sourceElements:['RLE black-and-white worked example','RLE colour-image worked example','RLE figures'],visual:'compression',accent:'amber'},
  {id:'0478-c1-s17',section:'S17 · Extension',title:'Extension: BCD and subtraction using two’s complement',sourcePages:[38,39],eyebrow:'OPTIONAL A-LEVEL BRIDGE',lead:'The source includes two beyond-syllabus bridges. They should remain available without being mistaken for required IGCSE content.',bullets:['BCD represents each denary digit separately using four bits.','BCD is useful where decimal digits themselves matter, such as displays.','Binary subtraction can be implemented by adding the two’s complement of the number being subtracted.','These ideas prepare students for deeper data-representation study.'],activityTitle:'Extension questions',activityPrompt:'Encode 271 in BCD, then carry out one binary subtraction by converting the subtrahend to two’s complement and adding.',sourceElements:['Extension','BCD Topic 1','two’s-complement subtraction Topic 2','extension Examples 1–2','Questions to try'],visual:'bases',accent:'rose'},
  {id:'0478-c1-s18',section:'S18 · Key terms & summary',title:'Consolidate the complete Chapter 1 vocabulary and learning outcomes',sourcePages:[40],eyebrow:'CHAPTER REVIEW · VOCABULARY',lead:'Use the chapter vocabulary as an active recall checklist. A term is only useful when you can define it and apply it in context.',bullets:['Number systems and signed representation.','Character, sound and image representation.','Storage units and file-size calculation.','Compression methods and their trade-offs.'],terms:[],activityTitle:'Vocabulary retrieval',activityPrompt:'Without notes, define ten terms chosen at random from the chapter. Then add one example or use for each term.',sourceElements:['31 formal key terms','chapter summary'],visual:'recap',accent:'indigo'},
  {id:'0478-c1-s19',section:'S19 · Exam-style review A',title:'Exam-style review: multimedia, shifts and signed binary',sourcePages:[41,42],eyebrow:'BOOK EXAM PRACTICE · SET A',lead:'Practise the command words and multi-step reasoning that the source chapter brings together at the end.',bullets:['Sampling resolution and sound accuracy.','Image resolution, colour depth and file-size calculation.','Compression choice and RLE.','Logical shifts and their effect on denary value.','Binary addition, overflow and two’s complement.'],activityTitle:'Exam-style questions 1–6 · adapted review',activityPrompt:'Attempt a mixed set covering sampling, bitmap calculations, RLE, logical shifts, binary addition, two’s complement and compression. Show all working for calculations.',sourceElements:['Exam-style question 1','Exam-style question 2','Exam-style question 3','Exam-style question 4','Exam-style question 5','Exam-style question 6'],visual:'recap',accent:'indigo'},
  {id:'0478-c1-s20',section:'S20 · Exam-style review B',title:'Exam-style review: registers, storage and mixed representation',sourcePages:[43,44],eyebrow:'BOOK EXAM PRACTICE · SET B',lead:'Finish the unit by switching between representations and explaining storage/compression decisions under exam conditions.',bullets:['Read and write binary register values.','Use binary storage units in capacity calculations.','Relate colour bytes to the number of possible colours.','Connect two’s complement, powers of two, hexadecimal and binary arithmetic.'],activityTitle:'Exam-style questions 7–9 · adapted review',activityPrompt:'Complete a timed mixed review. After marking, classify each error as knowledge, conversion, unit, arithmetic or explanation error and retry only the weak categories.',sourceElements:['Exam-style question 7','Exam-style question 8','Exam-style question 9'],visual:'recap',accent:'emerald'},
];

const glossaryDefinitions:Record<(typeof IGCSE_CH1_KEY_TERMS)[number],string>={
  'bit':'A single binary digit, 0 or 1.',
  'binary number system':'Base-2 representation using the digits 0 and 1.',
  'hexadecimal number system':'Base-16 representation using 0–9 and A–F.',
  'error code':'A code generated to identify an error or fault.',
  'MAC address':'A hardware network interface identifier commonly shown in hexadecimal.',
  'IP address':'An address used to identify a device on an IP network.',
  'HTML':'A markup language used to structure web pages; hexadecimal codes can represent colours.',
  'overflow error':'A result that does not fit in the allocated word size.',
  'logical shift':'Movement of all bits left or right with zeros inserted and outgoing bits discarded.',
  'two’s complement':'A signed binary representation with a negative most-significant-bit weight.',
  'ASCII code':'A standard mapping from characters/control codes to numeric values.',
  'character set':'A defined collection of characters and their codes.',
  'Unicode':'A universal character repertoire covering many writing systems and symbols.',
  'sampling resolution':'Bits used to represent each recorded sound amplitude.',
  'bit depth':'Bits used to encode the smallest stored unit, such as a sound sample.',
  'colour depth':'Bits used to encode the colour of one pixel.',
  'sampling rate':'Number of sound samples taken per second.',
  'bitmap image':'An image represented as a grid of pixels.',
  'pixel':'The smallest picture element in a bitmap.',
  'image resolution':'The pixel dimensions of an image.',
  'pixelated (image)':'A blocky appearance caused when individual bitmap pixels become visible.',
  'pixel density':'The number of pixels packed into a physical display area.',
  'compression':'Reduction of file size by removing or more efficiently encoding data.',
  'bandwidth':'The maximum rate at which data can be transferred through a channel.',
  'lossy (file compression)':'Compression that permanently removes some information.',
  'lossless (file compression)':'Compression that permits exact reconstruction of the original.',
  'audio compression':'Techniques used to reduce the size of digital sound data.',
  'MP3':'A widely used lossy audio compression format.',
  'MP4':'A common multimedia container used with compressed audio/video.',
  'JPEG':'A common lossy format for photographic images.',
  'run length encoding (RLE)':'A lossless method that stores repeated runs as value-and-count pairs.',
};

const baseSlides=sessions.flatMap(s);
const glossarySlideIndex=baseSlides.findIndex(slide=>slide.id==='0478-c1-s18-learn');
if(glossarySlideIndex>=0){
  baseSlides[glossarySlideIndex]={...baseSlides[glossarySlideIndex],keyTerms:IGCSE_CH1_KEY_TERMS.map(term=>({term,definition:glossaryDefinitions[term]}))};
}

export const IGCSE_CHAPTER_1 = {
  unitKey:'0478-1' as const,
  syllabusCode:'0478' as const,
  number:1 as const,
  level:'IGCSE' as const,
  title:'Data representation',
  subtitle:'Binary, hexadecimal, signed values, text, sound, images, storage and compression — source-backed from the complete supplied Chapter 1.',
  subtopics:['1.1 Number systems','1.2 Text, sound and images','1.3 Data storage and file compression','Extension & exam review'],
  sourceNote:'Cambridge IGCSE and O Level Computer Science, Second Edition · supplied full-book PDF · printed pp.2–44.',
  coverage:'43/43 teaching pages · 16/16 activities · 31/31 key terms · 9/9 book exam-style questions · 20 session route',
  slides:baseSlides,
};

const slidePages=new Set(IGCSE_CHAPTER_1.slides.flatMap(slide=>slide.sourcePages??[]));
const sourceElements=new Set(IGCSE_CHAPTER_1.slides.flatMap(slide=>slide.sourceElements??[]));
const representedTerms=new Set(IGCSE_CHAPTER_1.slides.flatMap(slide=>slide.keyTerms?.map(term=>term.term)??[]));
const representedSections=new Set(IGCSE_CHAPTER_1.slides.map(slide=>slide.section));

export const IGCSE_CH1_DELIVERY_AUDIT={
  pagesExpected:43,
  pagesDelivered:IGCSE_CH1_PAGE_INVENTORY.filter(page=>slidePages.has(page.printedPage)).length,
  activitiesExpected:IGCSE_CH1_ACTIVITY_IDS.length,
  activitiesDelivered:IGCSE_CH1_ACTIVITY_IDS.filter(id=>sourceElements.has(id)||[...sourceElements].some(value=>value.startsWith(id))).length,
  keyTermsExpected:IGCSE_CH1_KEY_TERMS.length,
  keyTermsDelivered:IGCSE_CH1_KEY_TERMS.filter(term=>representedTerms.has(term)).length,
  examStyleExpected:IGCSE_CH1_EXAM_STYLE_QUESTION_IDS.length,
  examStyleDelivered:IGCSE_CH1_EXAM_STYLE_QUESTION_IDS.filter(id=>sourceElements.has(id)).length,
  sessionsExpected:IGCSE_CH1_SESSION_PLAN.length,
  sessionsDelivered:IGCSE_CH1_SESSION_PLAN.filter(session=>representedSections.has(`S${session.id.slice(-2)} · ${session.title.split(':')[0].replace(/^Why binary and binary place value$/,'Why binary')}`)).length,
  complete:false,
} as const;

export const IGCSE_CH1_DELIVERY_COMPLETE =
  IGCSE_CH1_DELIVERY_AUDIT.pagesDelivered===IGCSE_CH1_DELIVERY_AUDIT.pagesExpected
  && IGCSE_CH1_DELIVERY_AUDIT.activitiesDelivered===IGCSE_CH1_DELIVERY_AUDIT.activitiesExpected
  && IGCSE_CH1_DELIVERY_AUDIT.keyTermsDelivered===IGCSE_CH1_DELIVERY_AUDIT.keyTermsExpected
  && IGCSE_CH1_DELIVERY_AUDIT.examStyleDelivered===IGCSE_CH1_DELIVERY_AUDIT.examStyleExpected
  && representedSections.size===20;
