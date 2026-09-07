export type IGCSECh1TeachingFamily =
  | 'learning_outline'
  | 'concept'
  | 'worked_example'
  | 'activity'
  | 'find_out_more'
  | 'advice'
  | 'link'
  | 'figure'
  | 'table'
  | 'extension'
  | 'summary'
  | 'key_terms'
  | 'exam_style';

export type IGCSECh1PageInventory = {
  printedPage: number;
  pdfPage: number;
  section: '1.1 Number systems' | '1.2 Text, sound and images' | '1.3 Data storage and file compression' | 'Extension / review';
  families: IGCSECh1TeachingFamily[];
  anchors: string[];
};

const p = (
  printedPage:number,
  section:IGCSECh1PageInventory['section'],
  families:IGCSECh1TeachingFamily[],
  anchors:string[],
):IGCSECh1PageInventory => ({ printedPage, pdfPage:printedPage+12, section, families, anchors });

/**
 * Independent, page-by-page teaching inventory for the exact supplied 2021
 * IGCSE/O Level coursebook Chapter 1 (printed pp.2-44 / PDF pp.14-56).
 *
 * The anchors are concise semantic descriptions, not reproduced textbook prose.
 * Every teaching page must remain attached to at least one lesson session before
 * this chapter may advance from `inventoried` to `delivered`.
 */
export const IGCSE_CH1_PAGE_INVENTORY: readonly IGCSECh1PageInventory[] = [
  p(2,'1.1 Number systems',['learning_outline','concept'],['chapter learning outline','why computers represent data in binary','two-state switching model']),
  p(3,'1.1 Number systems',['concept','worked_example'],['denary and binary place value','binary to denary conversion','8-bit and 12-bit worked conversions']),
  p(4,'1.1 Number systems',['worked_example','activity'],['16-bit binary to denary','Activity 1.1 binary to denary','denary to binary by powers of two']),
  p(5,'1.1 Number systems',['worked_example','figure'],['denary to binary by repeated division','142 and 59 conversion methods','division/remainder diagrams']),
  p(6,'1.1 Number systems',['worked_example','figure'],['16-bit denary to binary conversion','35000 worked conversion','remainder diagram']),
  p(7,'1.1 Number systems',['activity','concept','table'],['Activity 1.2 denary to binary','hexadecimal system and place values','binary-hex-denary lookup table']),
  p(8,'1.1 Number systems',['worked_example','table'],['binary to hexadecimal grouping','padding incomplete four-bit groups','binary-hex-denary mapping']),
  p(9,'1.1 Number systems',['activity','worked_example'],['Activity 1.3 binary to hex','hexadecimal to binary','worked 45A and BF08 conversions']),
  p(10,'1.1 Number systems',['activity','worked_example'],['Activity 1.4 hex to binary','hexadecimal to denary using place values','worked 45A and C8F']),
  p(11,'1.1 Number systems',['activity','worked_example','figure'],['Activity 1.5 hex to denary','denary to hexadecimal by repeated division','worked 2004 and 8463']),
  p(12,'1.1 Number systems',['activity','concept','find_out_more','figure'],['Activity 1.6 denary to hex','uses of hexadecimal','error codes','memory-dump enrichment']),
  p(13,'1.1 Number systems',['concept','find_out_more','link'],['MAC addresses in hexadecimal','IPv4 and IPv6 address notation','device-address investigations','links to networking chapter']),
  p(14,'1.1 Number systems',['concept','figure'],['HTML colour codes','RGB hexadecimal components','six-digit web colours and 16.7 million combinations']),
  p(15,'1.1 Number systems',['activity','concept','advice'],['Activity 1.7 hexadecimal applications','binary addition rules','overflow definition and word-size warning']),
  p(16,'1.1 Number systems',['worked_example','activity'],['8-bit binary addition','overflow example','Activities 1.8 and 1.9']),
  p(17,'1.1 Number systems',['worked_example','activity','concept'],['binary addition practice','Activity 1.10','logical binary shifts introduction']),
  p(18,'1.1 Number systems',['worked_example','concept'],['logical left shift','logical right shift','multiplication/division effect and discarded bits']),
  p(19,'1.1 Number systems',['worked_example','concept'],['multi-place logical shifts','overflow/loss from shifts','interpretation of shifted values']),
  p(20,'1.1 Number systems',['activity','concept'],['Activity 1.11 logical shifts','two’s-complement introduction','negative-weight most-significant bit']),
  p(21,'1.1 Number systems',['worked_example','concept'],['reading positive and negative two’s-complement values','8-bit range','worked interpretation examples']),
  p(22,'1.1 Number systems',['worked_example','activity'],['forming negatives using invert-and-add-one','interpreting two’s complement','Activity 1.12']),
  p(23,'1.1 Number systems',['worked_example','concept'],['two’s-complement conversion method','range reasoning','worked negative conversion']),
  p(24,'1.1 Number systems',['worked_example','concept'],['additional two’s-complement examples','12-bit signed representation']),
  p(25,'1.2 Text, sound and images',['worked_example','activity','concept'],['12-bit two’s-complement example','Activities 1.13 and 1.14','ASCII and Unicode introduction']),
  p(26,'1.2 Text, sound and images',['table','concept'],['standard ASCII printable table','7-bit codes and control-code range']),
  p(27,'1.2 Text, sound and images',['concept','find_out_more'],['uppercase/lowercase ASCII patterns','ordered character ranges','Unicode motivation and wider scripts']),
  p(28,'1.2 Text, sound and images',['concept','table','find_out_more'],['Unicode code representation','multilingual character examples','character-set comparison/enrichment']),
  p(29,'1.2 Text, sound and images',['concept','figure'],['sound digitisation','analogue waveform to samples','sampling points and amplitude']),
  p(30,'1.2 Text, sound and images',['concept','figure','link'],['sampling rate','sampling resolution / bit depth','quality-file-size trade-offs','audio sampling diagram']),
  p(31,'1.2 Text, sound and images',['activity','concept','figure'],['Activity 1.15 sound representation','bitmap image and pixel representation','image resolution and colour depth']),
  p(32,'1.3 Data storage and file compression',['concept','table','advice'],['binary storage units KiB to EiB','powers-of-two measurement','decimal/binary unit distinction']),
  p(33,'1.3 Data storage and file compression',['concept','worked_example'],['image file-size calculation','sound file-size calculation','worked unit conversions']),
  p(34,'1.3 Data storage and file compression',['activity','concept'],['Activity 1.16 file-size calculations','why compression is needed','bandwidth/storage/transmission consequences','lossy versus lossless']),
  p(35,'1.3 Data storage and file compression',['concept'],['lossy compression principles','audio perceptual compression','MP3/MP4/JPEG applications and trade-offs']),
  p(36,'1.3 Data storage and file compression',['concept'],['lossless compression','run-length encoding principle','when repetition makes RLE effective']),
  p(37,'1.3 Data storage and file compression',['worked_example','figure'],['RLE black-and-white image example','RLE colour-image example','compressed versus original size']),
  p(38,'Extension / review',['extension','worked_example'],['A-Level extension boundary','Binary Coded Decimal representation and uses','two’s-complement subtraction extension']),
  p(39,'Extension / review',['worked_example','summary'],['two’s-complement subtraction example','extension practice','chapter learning summary']),
  p(40,'Extension / review',['key_terms'],['31 formal chapter key terms and definitions']),
  p(41,'Extension / review',['exam_style'],['exam-style questions 1-2: sampling, images, compression and RLE']),
  p(42,'Extension / review',['exam_style'],['exam-style questions 3-6: shifts, binary arithmetic, two’s complement, bitmap and compression']),
  p(43,'Extension / review',['exam_style'],['exam-style questions 7-8: binary registers, storage units, image colour and compression']),
  p(44,'Extension / review',['exam_style'],['exam-style question 9: mixed matching across two’s complement, GiB, powers of two, hex and binary addition']),
] as const;

export const IGCSE_CH1_ACTIVITY_IDS = Array.from({length:16},(_,index)=>`Activity 1.${index+1}`) as readonly string[];

export const IGCSE_CH1_KEY_TERMS = [
  'bit','binary number system','hexadecimal number system','error code','MAC address','IP address','HTML','overflow error','logical shift','two’s complement','ASCII code','character set','Unicode','sampling resolution','bit depth','colour depth','sampling rate','bitmap image','pixel','image resolution','pixelated (image)','pixel density','compression','bandwidth','lossy (file compression)','lossless (file compression)','audio compression','MP3','MP4','JPEG','run length encoding (RLE)',
] as const;

export const IGCSE_CH1_EXAM_STYLE_QUESTION_IDS = Array.from({length:9},(_,index)=>`Exam-style question ${index+1}`) as readonly string[];

export type IGCSECh1SessionPlan = {
  id:string;
  title:string;
  printedPages:number[];
  required:boolean;
  purpose:'learn'|'practice'|'review'|'extension'|'assessment';
};

/** 45-minute teaching sequence. Every printed source page belongs to a session. */
export const IGCSE_CH1_SESSION_PLAN: readonly IGCSECh1SessionPlan[] = [
  {id:'0478-c1-s01',title:'Why binary and binary place value',printedPages:[2,3],required:true,purpose:'learn'},
  {id:'0478-c1-s02',title:'Binary to denary: worked conversion and practice',printedPages:[4],required:true,purpose:'practice'},
  {id:'0478-c1-s03',title:'Denary to binary: two conversion methods',printedPages:[5,6,7],required:true,purpose:'learn'},
  {id:'0478-c1-s04',title:'Binary and hexadecimal conversion',printedPages:[8,9],required:true,purpose:'learn'},
  {id:'0478-c1-s05',title:'Hexadecimal and denary conversion',printedPages:[10,11],required:true,purpose:'learn'},
  {id:'0478-c1-s06',title:'Why hexadecimal is used: errors, addresses and web colours',printedPages:[12,13,14],required:true,purpose:'learn'},
  {id:'0478-c1-s07',title:'Binary addition and overflow',printedPages:[15,16,17],required:true,purpose:'learn'},
  {id:'0478-c1-s08',title:'Logical binary shifts',printedPages:[18,19,20],required:true,purpose:'learn'},
  {id:'0478-c1-s09',title:'Two’s complement fundamentals',printedPages:[21,22],required:true,purpose:'learn'},
  {id:'0478-c1-s10',title:'Two’s complement conversion and practice',printedPages:[23,24,25],required:true,purpose:'practice'},
  {id:'0478-c1-s11',title:'ASCII and Unicode',printedPages:[26,27,28],required:true,purpose:'learn'},
  {id:'0478-c1-s12',title:'Sound representation and sampling',printedPages:[29,30],required:true,purpose:'learn'},
  {id:'0478-c1-s13',title:'Bitmap images, pixels, resolution and colour depth',printedPages:[31],required:true,purpose:'learn'},
  {id:'0478-c1-s14',title:'Data storage units and file-size calculations',printedPages:[32,33],required:true,purpose:'learn'},
  {id:'0478-c1-s15',title:'Why compression is needed; lossy and lossless methods',printedPages:[34,35,36],required:true,purpose:'learn'},
  {id:'0478-c1-s16',title:'Run-length encoding worked practice',printedPages:[37],required:true,purpose:'practice'},
  {id:'0478-c1-s17',title:'A-Level extension: BCD and subtraction with two’s complement',printedPages:[38,39],required:false,purpose:'extension'},
  {id:'0478-c1-s18',title:'Key terms and chapter review',printedPages:[40],required:true,purpose:'review'},
  {id:'0478-c1-s19',title:'Exam-style review set A',printedPages:[41,42],required:true,purpose:'assessment'},
  {id:'0478-c1-s20',title:'Exam-style review set B',printedPages:[43,44],required:true,purpose:'assessment'},
] as const;

const allSessionPages = new Set(IGCSE_CH1_SESSION_PLAN.flatMap((session)=>session.printedPages));

export const IGCSE_CH1_SOURCE_INVENTORY_AUDIT = {
  printedPageFrom:2,
  printedPageTo:44,
  pdfPageFrom:14,
  pdfPageTo:56,
  pagesExpected:43,
  pagesInventoried:IGCSE_CH1_PAGE_INVENTORY.length,
  pagesAssignedToSessions:allSessionPages.size,
  activities:IGCSE_CH1_ACTIVITY_IDS.length,
  keyTerms:IGCSE_CH1_KEY_TERMS.length,
  examStyleQuestions:IGCSE_CH1_EXAM_STYLE_QUESTION_IDS.length,
  complete:
    IGCSE_CH1_PAGE_INVENTORY.length===43
    && allSessionPages.size===43
    && Array.from({length:43},(_,index)=>index+2).every((page)=>allSessionPages.has(page)),
} as const;
