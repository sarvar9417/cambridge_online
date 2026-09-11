import type { HodderLessonSlide } from './lesson-content-hodder-types';
import type { LessonPresentationBeat } from './lesson-experience-model';
import { authoredStaticScene, buildAuthoredStoryboard, type AuthoredSceneSpec } from './authored-presentation-storyboard';

const s=(spec:AuthoredSceneSpec)=>spec;

const OVERVIEW:AuthoredSceneSpec[]=[
  s({id:'h1p-overview-hook',slideId:'h1-prior',role:'hook',eyebrow:'CHAPTER 1 · STARTER',title:'What can you already do with binary and hexadecimal?',lead:true,block:{index:0}}),
  s({id:'h1p-overview-map',slideId:'h1-overview',role:'objective',eyebrow:'CHAPTER 1 · LEARNING ROUTE',title:'Information representation and multimedia',block:{index:0}}),
];

const TOPIC_11:AuthoredSceneSpec[]=[
  s({id:'h1p-111-foundation',slideId:'h1-111-number-systems',role:'concept',eyebrow:'1.1 · NEW CONCEPT',lead:true,keyTerms:[0,3]}),
  s({id:'h1p-111-position',slideId:'h1-111-number-systems',role:'compare',eyebrow:'1.1 · VISUAL MODEL',title:'Denary and binary are both positional systems',block:{index:0}}),
  s({id:'h1p-111-hardware',slideId:'h1-111-number-systems',role:'concept',eyebrow:'1.1 · WHY BINARY?',block:{index:1}}),

  s({id:'h1p-112-convert-b2d',slideId:'h1-112-convert',role:'process',eyebrow:'1.1.2 · STEP BY STEP',title:'Binary → denary',block:{index:0}}),
  s({id:'h1p-112-convert-d2b-columns',slideId:'h1-112-convert',role:'process',eyebrow:'1.1.2 · STEP BY STEP',title:'Denary → binary using column weights',block:{index:1}}),
  s({id:'h1p-112-convert-d2b-division',slideId:'h1-112-convert',role:'process',eyebrow:'1.1.2 · STEP BY STEP',title:'Denary → binary using repeated division',block:{index:2}}),
  s({id:'h1p-112-convert-example',slideId:'h1-112-convert',role:'challenge',eyebrow:'1.1.2 · WORKED CHECK',title:'Can you reconstruct the model conversion?',example:true}),
  s({id:'h1p-112-convert-practice',slideId:'h1-112-convert',role:'challenge',eyebrow:'1.1.2 · PRACTICE',title:'Practise both conversion directions',block:{index:3}}),

  s({id:'h1p-112-signed-compare',slideId:'h1-112-signed',role:'compare',eyebrow:'1.1.2 · COMPARE',lead:true,keyTerms:[0,1],formula:true}),
  s({id:'h1p-112-signed-method',slideId:'h1-112-signed',role:'process',eyebrow:'1.1.2 · TWO’S COMPLEMENT',title:'Build a negative value in three moves',block:{index:0}}),
  s({id:'h1p-112-signed-practice',slideId:'h1-112-signed',role:'challenge',eyebrow:'1.1.2 · PRACTICE',title:'Represent positive and negative values',block:{index:1}}),
  s({id:'h1p-112-signed-extension',slideId:'h1-112-signed',role:'challenge',eyebrow:'1.1.2 · EXTEND',title:'Extend the signed pattern to 16 bits',block:{index:2},keyTerms:[2]}),

  s({id:'h1p-112-arithmetic-models',slideId:'h1-112-arithmetic',role:'visual',eyebrow:'1.1.2 · WORKED MODELS',lead:true,block:{index:0}}),
  s({id:'h1p-112-arithmetic-overflow',slideId:'h1-112-arithmetic',role:'concept',eyebrow:'1.1.2 · OVERFLOW',title:'Correct mathematics can still exceed the word size',block:{index:2}}),
  s({id:'h1p-112-arithmetic-practice',slideId:'h1-112-arithmetic',role:'challenge',eyebrow:'1.1.2 · PRACTICE',title:'Consolidate addition and subtraction',block:{index:1}}),

  s({id:'h1p-memory-si',slideId:'h1-memory-units',role:'visual',eyebrow:'MEMORY SIZE · DECIMAL PREFIXES',title:'SI storage units use powers of 1000',lead:true,block:{index:0}}),
  s({id:'h1p-memory-iec',slideId:'h1-memory-units',role:'visual',eyebrow:'MEMORY SIZE · BINARY PREFIXES',title:'IEC memory units use powers of 1024',block:{index:1}}),

  s({id:'h1p-113-hex-map-a',slideId:'h1-113-hex',role:'visual',eyebrow:'1.1.3 · HEXADECIMAL',title:'One hex digit maps to four bits · 0–7',lead:true,block:{index:0,range:[0,8]}}),
  s({id:'h1p-113-hex-map-b',slideId:'h1-113-hex',role:'visual',eyebrow:'1.1.3 · HEXADECIMAL',title:'One hex digit maps to four bits · 8–F',block:{index:0,range:[8,16]}}),
  s({id:'h1p-113-binary-to-hex',slideId:'h1-113-hex',role:'process',eyebrow:'1.1.3 · STEP BY STEP',title:'Binary → hexadecimal',block:{index:1}}),
  s({id:'h1p-113-hex-to-binary',slideId:'h1-113-hex',role:'process',eyebrow:'1.1.3 · STEP BY STEP',title:'Hexadecimal → binary',block:{index:2}}),
  s({id:'h1p-113-hex-example',slideId:'h1-113-hex',role:'challenge',eyebrow:'1.1.3 · WORKED CHECK',title:'Follow the source conversion examples',example:true}),
  s({id:'h1p-113-hex-practice',slideId:'h1-113-hex',role:'challenge',eyebrow:'1.1.3 · PRACTICE',title:'Practise both directions',block:{index:3}}),

  s({id:'h1p-hex-uses-concept',slideId:'h1-hex-uses',role:'concept',eyebrow:'HEXADECIMAL · APPLICATION',lead:true,block:{index:0}}),
  s({id:'h1p-hex-uses-dump',slideId:'h1-hex-uses',role:'visual',eyebrow:'HEXADECIMAL · MEMORY DUMP',title:'Read the address column separately from the stored bytes',block:{index:1}}),

  s({id:'h1p-114-bcd-map-a',slideId:'h1-114-bcd',role:'visual',eyebrow:'1.1.4 · BCD',title:'Valid BCD digit codes · 0–4',lead:true,block:{index:0,range:[0,5]}}),
  s({id:'h1p-114-bcd-map-b',slideId:'h1-114-bcd',role:'visual',eyebrow:'1.1.4 · BCD',title:'Valid BCD digit codes · 5–9',block:{index:0,range:[5,10]}}),
  s({id:'h1p-114-bcd-encode',slideId:'h1-114-bcd',role:'process',eyebrow:'1.1.4 · VISUAL MODEL',title:'3165 is four separate digit codes',block:{index:1}}),
  s({id:'h1p-114-bcd-practice',slideId:'h1-114-bcd',role:'challenge',eyebrow:'1.1.4 · PRACTICE',title:'Recognise valid BCD digits before converting',block:{index:2}}),

  s({id:'h1p-bcd-uses',slideId:'h1-bcd-uses',role:'concept',eyebrow:'BCD · APPLICATION',lead:true,block:{index:0}}),
  s({id:'h1p-bcd-correction',slideId:'h1-bcd-uses',role:'process',eyebrow:'BCD · STEP BY STEP',title:'Why add 0110 after an invalid digit result?',block:{index:1}}),
  s({id:'h1p-bcd-practice',slideId:'h1-bcd-uses',role:'challenge',eyebrow:'BCD · PRACTICE',title:'Carry out BCD addition',block:{index:2}}),

  s({id:'h1p-115-ascii-core',slideId:'h1-115-ascii',role:'concept',eyebrow:'1.1.5 · ASCII',lead:true,block:{index:0}}),
  s({id:'h1p-115-ascii-table',slideId:'h1-115-ascii',role:'visual',eyebrow:'1.1.5 · ASCII CODES',title:'Selected standard ASCII values',block:{index:1}}),
  s({id:'h1p-115-unicode-core',slideId:'h1-115-unicode',role:'compare',eyebrow:'1.1.5 · ASCII → UNICODE',lead:true,block:{index:0}}),
  s({id:'h1p-115-unicode-tables',slideId:'h1-115-unicode',role:'visual',eyebrow:'1.1.5 · COURSEBOOK TABLES',title:'Why Unicode is needed beyond 8-bit extensions',block:{index:1}}),
];

const TOPIC_12:AuthoredSceneSpec[]=[
  s({id:'h1p-121-bitmap-core',slideId:'h1-121-bitmap-basics',role:'concept',eyebrow:'1.2.1 · BITMAP MODEL',lead:true,keyTerms:true}),
  s({id:'h1p-121-bitmap-depth',slideId:'h1-121-bitmap-basics',role:'visual',eyebrow:'1.2.1 · PIXEL DATA',title:'Resolution and colour depth control bitmap data volume',block:{index:0}}),
  s({id:'h1p-bitmap-resolution-compare',slideId:'h1-bitmap-resolution',role:'compare',eyebrow:'BITMAP QUALITY · COMPARE',lead:true,block:{index:0}}),
  s({id:'h1p-bitmap-resolution-density',slideId:'h1-bitmap-resolution',role:'process',eyebrow:'BITMAP QUALITY · STEP BY STEP',title:'Calculate pixel density from resolution and physical size',block:{index:1}}),
  s({id:'h1p-bitmap-resolution-extension',slideId:'h1-bitmap-resolution',role:'challenge',eyebrow:'BITMAP QUALITY · EXTEND',title:'Connect pixel choices to displayed web content',block:{index:2}}),
  s({id:'h1p-bitmap-size-formula',slideId:'h1-bitmap-size',role:'visual',eyebrow:'BITMAP FILE SIZE',lead:true,formula:true,block:{index:0}}),
  s({id:'h1p-bitmap-size-example',slideId:'h1-bitmap-size',role:'challenge',eyebrow:'BITMAP FILE SIZE · WORKED CHECK',title:'1920 × 1080 at 24-bit colour',example:true}),
  s({id:'h1p-bitmap-size-extension',slideId:'h1-bitmap-size',role:'challenge',eyebrow:'BITMAP FILE SIZE · EXTEND',title:'Scale the same method to UHD',block:{index:1}}),

  s({id:'h1p-122-vector-core',slideId:'h1-122-vector',role:'concept',eyebrow:'1.2.2 · VECTOR GRAPHICS',lead:true,block:{index:0}}),
  s({id:'h1p-122-vector-figure',slideId:'h1-122-vector',role:'visual',eyebrow:'FIGURE 1.4 · VECTOR MODEL',title:'A picture can be reconstructed from geometric objects',block:{index:1}}),
  s({id:'h1p-bitmap-vector-table',slideId:'h1-bitmap-vector-choice',role:'compare',eyebrow:'TABLE 1.8 · COMPARE',lead:true,block:{index:0}}),
  s({id:'h1p-bitmap-vector-choice',slideId:'h1-bitmap-vector-choice',role:'challenge',eyebrow:'1.2 · APPLY',title:'Choose the representation from the task requirements',block:{index:1}}),

  s({id:'h1p-123-sound-wave',slideId:'h1-123-sound-wave',role:'concept',eyebrow:'1.2.3 · SOUND',lead:true,block:{index:0}}),
  s({id:'h1p-123-sound-figures',slideId:'h1-123-sound-wave',role:'visual',eyebrow:'FIGURES 1.5–1.6 · VISUAL MODEL',title:'Sampling turns an analogue wave into stored numeric values',block:{index:1}}),
  s({id:'h1p-sampling-tradeoff',slideId:'h1-sampling-quality',role:'compare',eyebrow:'SAMPLING · QUALITY VS SIZE',lead:true,block:{index:0}}),
  s({id:'h1p-sampling-process',slideId:'h1-sampling-quality',role:'process',eyebrow:'SAMPLING · STEP BY STEP',title:'Digitise one sound clip',block:{index:1}}),
  s({id:'h1p-sound-editing',slideId:'h1-sound-editing',role:'concept',eyebrow:'SOUND · EDITING',lead:true,block:{index:0}}),
  s({id:'h1p-video-extension',slideId:'h1-124-video',role:'concept',eyebrow:'1.2.4 · VIDEO · COURSEBOOK EXTENSION',lead:true,block:{index:0}}),
];

const TOPIC_13:AuthoredSceneSpec[]=[
  s({id:'h1p-13-need',slideId:'h1-13-need',role:'compare',eyebrow:'1.3 · FILE COMPRESSION',lead:true,keyTerms:true,block:{index:0}}),
  s({id:'h1p-131-lossy-media',slideId:'h1-131-mp3-jpeg',role:'concept',eyebrow:'1.3.1 · LOSSY APPLICATIONS',lead:true,block:{index:0}}),
  s({id:'h1p-131-extension',slideId:'h1-131-mp3-jpeg',role:'challenge',eyebrow:'1.3.1 · EXTEND',title:'Compare perceptual compression with RLE',block:{index:1}}),
  s({id:'h1p-rle-text-method',slideId:'h1-rle-text',role:'process',eyebrow:'RLE · STEP BY STEP',lead:true,block:{index:0}}),
  s({id:'h1p-rle-text-example',slideId:'h1-rle-text',role:'visual',eyebrow:'RLE · TEXT MODEL',title:'Store a run as count + value',block:{index:1}}),
  s({id:'h1p-rle-text-warning',slideId:'h1-rle-text',role:'concept',eyebrow:'RLE · LIMITATION',title:'Naive RLE can make data larger',block:{index:2}}),
  s({id:'h1p-rle-images-table',slideId:'h1-rle-images',role:'visual',eyebrow:'RLE · IMAGE MODEL',lead:true,block:{index:0}}),
  s({id:'h1p-rle-images-metadata',slideId:'h1-rle-images',role:'concept',eyebrow:'RLE · SOURCE DETAIL',title:'Classroom size reductions are simplified models',block:{index:1}}),
  s({id:'h1p-132-general',slideId:'h1-132-general',role:'compare',eyebrow:'1.3.2 · GENERAL REDUCTION',lead:true,block:{index:0}}),
  s({id:'h1p-132-quality',slideId:'h1-132-general',role:'concept',eyebrow:'1.3.2 · QUALITY CONSEQUENCE',title:'Reducing source data is not lossless coding',block:{index:1}}),
];

export function chapter1PresentationStoryboard(topicCode:string,slides:readonly HodderLessonSlide[]):LessonPresentationBeat[]|null {
  if(topicCode==='overview')return [
    authoredStaticScene('h1p-overview-prior-activity','h1-prior','hook','CHAPTER 1 · PRIOR ACTIVITY','Reconstruct the source binary-addition task',[1],{
      bullets:['Carry out these binary additions and convert each answer to denary:'],
    }),
    ...buildAuthoredStoryboard(slides,OVERVIEW),
  ];
  const opening=topicCode==='1.1'?[
    authoredStaticScene('h1p-11-hook','h1-111-number-systems','hook','1.1 · STARTER','How can the same bits represent numbers, text and machine data?',[2],{
      lead:'Representation only works when the system knows the base, width or character encoding used to interpret the stored pattern.',
    }),
    authoredStaticScene('h1p-11-objectives','h1-111-number-systems','objective','1.1 · LESSON GOALS','By the end of 1.1 you should be able to…',[2,15],{
      bullets:['Convert and calculate with binary, denary and hexadecimal.','Represent signed integers with two’s complement and explain overflow.','Use BCD, ASCII and Unicode appropriately.','Distinguish decimal and binary storage prefixes.'],
    }),
  ]:topicCode==='1.2'?[
    authoredStaticScene('h1p-12-hook','h1-121-bitmap-basics','hook','1.2 · STARTER','A photograph and a sound clip are both bits. What changes between them?',[15,19],{
      lead:'The stored bits need a representation model: pixels for a bitmap, geometric objects for vectors, and sampled amplitude values for sound.',
    }),
    authoredStaticScene('h1p-12-objectives','h1-121-bitmap-basics','objective','1.2 · LESSON GOALS','By the end of 1.2 you should be able to…',[15,21],{
      bullets:['Explain bitmap, vector and sampled-sound representations.','Calculate raw bitmap storage from resolution and colour depth.','Explain the quality/file-size effects of image and sound sampling choices.','Choose an appropriate representation for a multimedia task.'],
    }),
  ]:topicCode==='1.3'?[
    authoredStaticScene('h1p-13-hook','h1-13-need','hook','1.3 · STARTER','Can every file be made smaller without losing anything?',[21],{
      lead:'Compression decisions depend on whether exact reconstruction is required and whether repeated or perceptually unimportant data can be exploited.',
    }),
    authoredStaticScene('h1p-13-objectives','h1-13-need','objective','1.3 · LESSON GOALS','By the end of 1.3 you should be able to…',[21,24],{
      bullets:['Distinguish lossy and lossless compression.','Explain why MP3/JPEG-style reduction can be acceptable for media.','Trace run-length encoding for text and images.','Explain how sampling rate, resolution, frame rate and image properties affect file size.'],
    }),
  ]:[];
  const specs=topicCode==='1.1'?TOPIC_11:topicCode==='1.2'?TOPIC_12:topicCode==='1.3'?TOPIC_13:null;
  if(!specs)return null;
  const result=[...opening,...buildAuthoredStoryboard(slides,specs)];
  if(topicCode==='1.1')result.push(authoredStaticScene('h1p-11-recap','h1-115-unicode','recap','1.1 · RETRIEVAL','Rebuild the data-representation route from memory',[2,15],{
    bullets:['Why does binary fit two-state hardware?','How do you convert and calculate with binary and hexadecimal?','How does two’s complement represent a negative integer?','When would BCD, ASCII or Unicode be the right representation?'],
  }));
  if(topicCode==='1.2')result.push(authoredStaticScene('h1p-12-recap','h1-124-video','recap','1.2 · RETRIEVAL','Choose the right representation and justify it',[15,21],{
    bullets:['Bitmap: explain resolution, colour depth and raw file size.','Vector: explain object/attribute storage and scaling.','Sound: explain sampling rate, sampling resolution and digitisation.','State one quality-versus-size trade-off for each medium.'],
  }));
  if(topicCode==='1.3')result.push(authoredStaticScene('h1p-13-recap','h1-132-general','exam','1.3 · CAMBRIDGE CHECK','Compression: explain the method, not just the label',[21,26],{
    activity:{title:'30-second transfer',prompt:'Explain when lossless compression is required, then trace how RLE would encode one run of repeated values.',reveal:'Lossless is required when the exact original data must be reconstructed. RLE replaces an adjacent repeated run with its count and value; it is effective when long runs occur.'},
  }));
  return result;
}

export function chapter1PresentationClosing():LessonPresentationBeat[] {
  return [
    authoredStaticScene('h1p-chapter-activity','h1-activity-1i','challenge','CHAPTER 1 · ACTIVITY 1I','Use the chapter concepts together',[25],{
      bullets:['Define lossy and lossless compression and give examples.','Describe sound digitisation and why compressed music can remain acceptable.','Explain RLE with an example.','Compare bitmap and vector images and justify a representation for a realistic scenario.'],
    }),
    authoredStaticScene('h1p-chapter-review','h1-hodder-review','recap','CHAPTER 1 · RETRIEVAL','What must you be able to reconstruct without notes?',[25,26],{
      bullets:['Signed binary: interpretation, creation, range and overflow.','BCD: representation, arithmetic and applications.','Bitmap/sound: sampling, resolution, file size and metadata.','Compression: choice, RLE and quality trade-offs.','Binary/hexadecimal: arithmetic, conversions and practical uses.'],
    }),
  ];
}
