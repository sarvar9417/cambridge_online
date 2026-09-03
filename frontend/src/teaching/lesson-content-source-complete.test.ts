import { describe, expect, it } from 'vitest';
import { lessonChapter } from './lesson-content-source-complete';

type Chapter = NonNullable<ReturnType<typeof lessonChapter>>;
const sourceElements = (chapter: Chapter) => new Set(chapter.slides.flatMap(slide=>slide.sourceElements??[]));
const ids = (chapter: Chapter) => chapter.slides.map(slide=>slide.id);

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

describe('granular part checkpoints',()=>{
  const assertImmediatelyAfter=(chapter:Chapter,contentId:string,checkpointId:string)=>{
    const order=ids(chapter);expect(order.indexOf(checkpointId),checkpointId).toBe(order.indexOf(contentId)+1);
    const checkpoint=chapter.slides.find(slide=>slide.id===checkpointId)!;
    expect(checkpoint.examPractice).toBe(true);
    expect(Boolean(checkpoint.learningObjectiveCodes?.length||checkpoint.checkpointUnavailableReason)).toBe(true);
  };

  it('places exact checkpoint slides after every Chapter 1 logical teaching part',()=>{
    const c=lessonChapter(1)!;
    for(const pair of [
      ['h1-111-number-systems','h1-cp-number-purpose'],['h1-112-convert','h1-cp-base-convert'],['h1-112-arithmetic','h1-cp-arithmetic'],
      ['h1-hex-uses','h1-cp-hex'],['h1-bcd-uses','h1-cp-bcd'],['h1-115-ascii','h1-cp-character-purpose'],['h1-115-unicode','h1-cp-character-rep'],
      ['h1-bitmap-size','h1-cp-bitmap'],['h1-122-vector','h1-cp-vector'],['h1-bitmap-vector-choice','h1-cp-format-choice'],['h1-123-sound-wave','h1-cp-sound-digitise'],
      ['h1-sampling-quality','h1-cp-sampling'],['h1-124-video','h1-cp-video'],['h1-13-need','h1-cp-compression-need'],['h1-rle-images','h1-cp-rle'],
    ] as const) assertImmediatelyAfter(c,pair[0],pair[1]);
    expect(c.slides.find(slide=>slide.id==='h1-cp-video')?.checkpointUnavailableReason).toContain('beyond the 9618 syllabus');
  });

  it('places exact checkpoint slides after every Chapter 13 logical teaching part',()=>{
    const c=lessonChapter(13)!;
    for(const pair of [
      ['h13-udt-why','h13-cp-udt-need'],['h13-pointer','h13-cp-noncomposite'],['h13-sets-classes','h13-cp-composite'],['h13-activity-13c','h13-cp-type-choice'],
      ['h13-random','h13-cp-file-org'],['h13-direct-access','h13-cp-file-access'],['h13-org-access-choice','h13-cp-org-access-choice'],['h13-hash-collision','h13-cp-hashing'],
      ['h13-float-format','h13-cp-float-format'],['h13-float-to-denary','h13-cp-float-to-denary'],['h13-denary-to-float','h13-cp-denary-to-float'],
      ['h13-approximation','h13-cp-approximation'],['h13-normalisation','h13-cp-normalise'],['h13-precision-range','h13-cp-precision-range'],['h13-rounding-program','h13-cp-rounding'],['h13-over-under-zero','h13-cp-approx-final'],
    ] as const) assertImmediatelyAfter(c,pair[0],pair[1]);
  });

  it('never falls back to subtopic-wide questions for Chapter 1 or 13 checkpoints',()=>{
    for(const chapterNo of [1,13]){
      const chapter=lessonChapter(chapterNo)!;
      for(const slide of chapter.slides.filter(slide=>slide.examPractice)){
        expect(Boolean(slide.learningObjectiveCodes?.length||slide.checkpointUnavailableReason),slide.id).toBe(true);
      }
    }
  });
});
