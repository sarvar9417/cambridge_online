import { describe, expect, it } from 'vitest';
import { lessonChapter, type LessonRichBlock } from './lesson-content-source-complete';

type Chapter = NonNullable<ReturnType<typeof lessonChapter>>;
const sourceElements = (chapter: Chapter) => new Set(chapter.slides.flatMap(slide=>slide.sourceElements??[]));
const ids = (chapter: Chapter) => chapter.slides.map(slide=>slide.id);
const slide=(chapter:Chapter,id:string)=>{
  const found=chapter.slides.find(item=>item.id===id);
  expect(found,`Missing slide: ${id}`).toBeTruthy();
  return found!;
};
const blockText=(blocks:LessonRichBlock[]|undefined)=>JSON.stringify(blocks??[]);
const figureKinds=(chapter:Chapter)=>chapter.slides.flatMap(item=>(item.richBlocks??[]).flatMap(block=>block.kind==='figure'?[block.figure.kind]:[]));

const ch1Elements = [
  'Chapter 1 learning objectives','Chapter 1 What you should already know','1.1 Key terms','1.1.1 Number systems','1.1.2 Binary number system',
  ...Array.from({length:8},(_,i)=>`Example 1.${i+1}`),
  ...'ABCDEFGHI'.split('').map(letter=>`Activity 1${letter}`),
  ...'ABCD'.split('').map(letter=>`Extension Activity 1${letter}`),
  ...Array.from({length:9},(_,i)=>`Table 1.${i+1}`),
  ...Array.from({length:9},(_,i)=>`Figure 1.${i+1}`),
  '1.1.3 Hexadecimal number system','Use of hexadecimal system','Memory dumps','1.1.4 Binary-coded decimal system','Uses of BCD','BCD addition worked example',
  '1.1.5 ASCII codes and Unicodes','Unicode discussion','1.2 Key terms','1.2.1 Bit-map images','Calculating bit-map image file sizes','Bitmap file header',
  '1.2.2 Vector graphics','Bitmap/vector task-choice discussion','1.2.3 Sound files','Sampling-rate discussion','Sampling-resolution discussion','Sound editing feature list',
  '1.2.4 Video','1.3 Key terms','Need for compression','1.3.1 File compression applications','MP3/MP4 discussion','JPEG discussion','Vector compression discussion',
  'RLE introduction','RLE text example','RLE flag mechanism','RLE black-and-white image example','RLE colour image example','1.3.2 General methods of compressing files',
  'Chapter 1 end-of-chapter questions',
];

const ch13Elements = [
  'Chapter 13 learning objectives','13.1 What you should already know','13.1 Key terms','User-defined data type introduction','13.1.1 Non-composite data types','Enumerated data type','Pointer data type',
  '13.1.2 Composite data types','TbookRecord example','Sets','Classes','13.2 What you should already know','13.2 Key terms','13.2.1 File organisation and file access',
  'Serial file organisation','Sequential file organisation','Random file organisation','Sequential access','Direct access','13.2.2 Hashing algorithms','Open hashing','Closed hashing',
  '13.3 What you should already know','13.3 Key terms','13.3.1 Floating-point number representation','Potential rounding errors and approximations','Floating-point problems',
  'Overflow discussion','Underflow discussion','Normalised zero issue',
  ...'ABCDEFGHI'.split('').map(letter=>`Activity 13${letter}`),
  ...'ABCDEF'.split('').map(letter=>`Extension Activity 13${letter}`),
  ...Array.from({length:9},(_,i)=>`Example 13.${i+1}`),
  ...Array.from({length:16},(_,i)=>`Figure 13.${i+1}`),
  'Table 13.1','Table 13.2','Chapter 13 end-of-chapter questions: floating point','Chapter 13 end-of-chapter questions: user-defined types','Chapter 13 end-of-chapter questions: file organisation',
];

describe('uploaded Hodder chapter source inventory',()=>{
  it('represents every tracked Chapter 1 source element',()=>{
    const chapter=lessonChapter(1)!;const represented=sourceElements(chapter);
    for(const element of ch1Elements) expect(represented.has(element),`Missing Chapter 1 source element: ${element}`).toBe(true);
    expect(chapter.coverage).toContain('26/26 source pages');
  });

  it('represents every tracked Chapter 13 source element',()=>{
    const chapter=lessonChapter(13)!;const represented=sourceElements(chapter);
    for(const element of ch13Elements) expect(represented.has(element),`Missing Chapter 13 source element: ${element}`).toBe(true);
    expect(chapter.coverage).toContain('24/24 source pages');
  });
});

describe('section-end Past Paper checkpoints',()=>{
  const checkpointIds={
    1:[
      'h1-cp-number-purpose','h1-cp-base-convert','h1-cp-arithmetic','h1-cp-memory-prefixes','h1-cp-hex','h1-cp-bcd','h1-cp-character-purpose','h1-cp-character-rep',
      'h1-cp-bitmap','h1-cp-vector','h1-cp-format-choice','h1-cp-sound-digitise','h1-cp-sampling','h1-cp-sound-editing','h1-cp-video','h1-cp-compression-need','h1-cp-rle','h1-cp-general-reduction',
    ],
    13:[
      'h13-cp-udt-need','h13-cp-noncomposite','h13-cp-composite','h13-cp-type-choice','h13-cp-file-org','h13-cp-file-access','h13-cp-org-access-choice','h13-cp-hashing',
      'h13-cp-float-format','h13-cp-float-to-denary','h13-cp-denary-to-float','h13-cp-approximation','h13-cp-normalise','h13-cp-precision-range','h13-cp-rounding','h13-cp-approx-final',
    ],
  } as const;

  for(const chapterNo of [1,13] as const){
    it(`keeps every Chapter ${chapterNo} checkpoint and places checkpoints after the section Exam Lens`,()=>{
      const chapter=lessonChapter(chapterNo)!;
      for(const checkpointId of checkpointIds[chapterNo]){
        const checkpoint=slide(chapter,checkpointId);
        expect(checkpoint.examPractice,checkpointId).toBe(true);
        expect(Boolean(checkpoint.learningObjectiveCodes?.length||checkpoint.checkpointUnavailableReason),checkpointId).toBe(true);
        const section=checkpoint.subtopicCode!;
        const sectionSlides=chapter.slides.filter(item=>item.subtopicCode===section);
        const lensIndex=sectionSlides.findIndex(item=>item.id===`pdf-first-lens-${section.replace('.','')}`);
        const checkpointIndex=sectionSlides.findIndex(item=>item.id===checkpointId);
        expect(lensIndex,`${checkpointId} missing section Exam Lens`).toBeGreaterThanOrEqual(0);
        expect(checkpointIndex,`${checkpointId} must follow section Exam Lens`).toBeGreaterThan(lensIndex);
      }
      for(const section of chapter.subtopics.filter(value=>/^\d+\.\d+\s/.test(value))){
        const code=section.split(' ')[0]!;
        const sectionSlides=chapter.slides.filter(item=>item.subtopicCode===code);
        expect(sectionSlides.at(-1)?.examPractice,`${code} must end in Past Paper practice`).toBe(true);
      }
    });
  }

  it('keeps the current random-file pseudocode alignment before the section-end hashing checkpoint',()=>{
    const c=lessonChapter(13)!;const order=ids(c);
    expect(order.indexOf('h13-current-random-file-pseudocode')).toBe(order.indexOf('h13-hash-collision')+1);
    expect(order.indexOf('h13-cp-hashing')).toBeGreaterThan(order.indexOf('h13-current-random-file-pseudocode'));
  });

  it('never falls back to subtopic-wide questions for Chapter 1 or 13 checkpoints',()=>{
    for(const chapterNo of [1,13]){
      const chapter=lessonChapter(chapterNo)!;
      for(const item of chapter.slides.filter(item=>item.examPractice)){
        expect(Boolean(item.learningObjectiveCodes?.length||item.checkpointUnavailableReason),item.id).toBe(true);
      }
    }
  });

  it('keeps the intentional no-live-question explanation for video',()=>{
    expect(slide(lessonChapter(1)!,'h1-cp-video').checkpointUnavailableReason).toContain('beyond the 9618 syllabus');
  });
});

describe('semantic source fidelity',()=>{
  it('routes the memory-prefix checkpoint through the current 2026–2028 target',()=>{
    const c=lessonChapter(1)!;const checkpoint=slide(c,'h1-cp-memory-prefixes');
    expect(checkpoint.learningObjectiveCodes).toEqual(['1.1.1']);
    expect(checkpoint.checkpointUnavailableReason).toBeUndefined();
    expect(blockText(slide(c,'h1-memory-units').richBlocks)).toContain('kibi/kilo');
    expect(blockText(slide(c,'h1-memory-units').richBlocks)).toContain('tebi/tera');
  });

  it('labels Hodder source text separately from the exam-safe editorial form',()=>{
    const c=lessonChapter(13)!;
    const record=blockText(slide(c,'h13-record').richBlocks);
    expect(record).toContain('noPages : STRING');
    expect(record).toContain('fiction : STRING');
    expect(record).toContain('noPages : INTEGER');
    expect(record).toContain('fiction : BOOLEAN');
    const set=blockText(slide(c,'h13-sets-classes').richBlocks);
    expect(set).toContain(': letters');
    expect(set).toContain(': Sletter');
  });

  it('includes the current Cambridge random-file pseudocode without relabelling it as Hodder',()=>{
    const c=lessonChapter(13)!;const current=slide(c,'h13-current-random-file-pseudocode');const text=blockText(current.richBlocks);
    expect(current.sourceLabel).toBe('Cambridge 2027–2029 Pseudocode Guide');
    for(const token of ['OPENFILE','FOR RANDOM','SEEK','GETRECORD','PUTRECORD'])expect(text).toContain(token);
  });

  it('preserves the high-value Hodder details found by the PDF audit',()=>{
    const c=lessonChapter(1)!;
    expect(blockText(slide(c,'h1-114-bcd').richBlocks)).toContain('four single bytes');
    expect(blockText(slide(c,'h1-114-bcd').richBlocks)).toContain('two packed bytes');
    expect(blockText(slide(c,'h1-115-ascii').richBlocks)).toContain('sixth bit');
    expect(blockText(slide(c,'h1-bitmap-resolution').richBlocks)).toContain('401 pixels per inch');
    expect(blockText(slide(c,'h1-123-sound-wave').richBlocks)).toContain('vacuum');
    expect(blockText(slide(c,'h1-131-mp3-jpeg').richBlocks)).toContain('80–320');
    expect(blockText(slide(c,'h1-131-mp3-jpeg').richBlocks)).toContain('5–15');
  });

  it('requires real board-readable source figure reconstructions, not just source-element names',()=>{
    const c1=lessonChapter(1)!;const c13=lessonChapter(13)!;
    expect(figureKinds(c1)).toEqual(expect.arrayContaining(['grid','wave','pixel-scale']));
    expect(figureKinds(c13)).toEqual(expect.arrayContaining(['sequence','bitfield']));
    expect(blockText(slide(c1,'h1-rle-images').richBlocks)).toContain('Figure 1.7 reconstructed');
    expect(blockText(slide(c1,'h1-rle-images').richBlocks)).toContain('Figure 1.8 reconstructed');
    expect(blockText(slide(c13,'h13-seq-access').richBlocks)).toContain('Figure 13.5 reconstructed');
    const precision=blockText(slide(c13,'h13-precision-range').richBlocks);
    expect(precision).toContain('011111111111 | 0111');
    expect(precision).toContain('0111 | 011111111111');
  });
});
