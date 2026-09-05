import { SOURCE_FINAL_CHAPTER_1, SOURCE_FINAL_CHAPTER_13 } from './lesson-content-source-final-hardening';
import type { HodderLessonChapter, HodderLessonSlide, LessonRichBlock } from './lesson-content-hodder-types';
import { SUPPLIED_PDF_DETAIL_ATOMS } from './lesson-source-atoms-supplied-pdf-detail';
import {
  CHAPTER_1_SOURCE_FILE_MANIFEST,
  CHAPTER_13_SOURCE_FILE_MANIFEST,
  type SourceFileFidelityManifest,
} from './source-file-fidelity-manifest';

const appendBlocks = (slide:HodderLessonSlide, blocks:LessonRichBlock[], sourceElements:string[]=[]):HodderLessonSlide => ({
  ...slide,
  richBlocks:[...(slide.richBlocks??[]),...blocks],
  sourceElements:[...(slide.sourceElements??[]),...sourceElements],
});

const patch = (slides:HodderLessonSlide[], id:string, mutate:(slide:HodderLessonSlide)=>HodderLessonSlide) =>
  slides.map(slide=>slide.id===id?mutate(slide):slide);

const suppliedDetailPageCount = (chapter:1|13) =>
  new Set(SUPPLIED_PDF_DETAIL_ATOMS.filter(atom=>atom.chapter===chapter).map(atom=>atom.page)).size;

const addFileFingerprints = (chapter:HodderLessonChapter, manifest:SourceFileFidelityManifest):HodderLessonChapter => {
  const detailPages=suppliedDetailPageCount(chapter.number);
  return {
    ...chapter,
    coverage:`${chapter.coverage} · exact supplied PDF locked (${manifest.pageCount}/${manifest.pageCount} page fingerprints) · ${detailPages}/${manifest.pageCount} supplied-PDF detail pages · ${manifest.pageCount}/${manifest.pageCount} full source transcript pages`,
    slides:chapter.slides.map(slide=>{
      const printedPages=(slide.sourcePages??[]).map(page=>chapter.number===13?page+303:page);
      const fingerprints=printedPages.flatMap(page=>{
        const match=manifest.pages.find(item=>item.printedPage===page);
        return match?[`SOURCE FILE PAGE ${page} · sha256:${match.sha256}`]:[];
      });
      if(!fingerprints.length)return slide;
      return {
        ...slide,
        sourceElements:[...(slide.sourceElements??[]),...fingerprints],
      };
    }),
  };
};

let chapter1Slides=[...SOURCE_FINAL_CHAPTER_1.slides];
chapter1Slides=patch(chapter1Slides,'h1-prior',slide=>appendBlocks(slide,[
  {
    kind:'steps',
    title:'Hodder p.1 · complete prior-knowledge diagnostic',
    items:[
      'State the column weightings for the binary number system.',
      'Carry out and convert to denary: 00110101 + 01001000; 01001101 + 01101110; 01011111 + 00011110; 01000111 + 01101111; 10000001 + 01110111; 10101010 + 10101010.',
      'State the column weightings for the hexadecimal (base 16) number system.',
      'Carry out and convert to denary: 107 + 257; 208 + A17; AAA + 777; 1FF + 7F7; 149 + F0F; 1251 + 2567; 34AB + C00A; A001 + D77F; 1009 + 9FF1; 2777 + ACF1.',
    ],
  },
  {
    kind:'bullets',
    items:[
      'Chapter source scope: binary magnitudes and decimal/binary prefixes; binary, denary and hexadecimal; binary addition/subtraction; hexadecimal and BCD; ASCII/Unicode; bitmap encoding/file size/resolution/colour depth; vector encoding; sound representation and sampling; lossy/lossless compression; compression of text, bitmap, vector, sound and video files.',
    ],
  },
],['Hodder p.1 complete chapter objectives','Hodder p.1 complete prior-knowledge question set']));

let chapter13Slides=[...SOURCE_FINAL_CHAPTER_13.slides];
chapter13Slides=patch(chapter13Slides,'h13-prior-131',slide=>appendBlocks(slide,[
  {
    kind:'steps',
    title:'Hodder p.304 · complete prior-knowledge diagnostic',
    items:[
      'Select an appropriate data type for: a name; a student’s mark; a recorded temperature; the start date for a job; whether an item is sold or not.',
      'Write pseudocode to define a record for a zoo animal containing Name, Species, Date of birth, Location, Whether the animal was born in the zoo or not, and Notes.',
    ],
  },
  {
    kind:'bullets',
    items:[
      'Chapter source scope: user-defined types; non-composite/composite types; choosing/designing a type; serial/sequential/random file organisation; sequential/direct access; hashing; binary floating point; binary↔denary floating conversion; normalisation; underflow/overflow; rounding errors.',
    ],
  },
],['Hodder p.304 complete chapter objectives','Hodder p.304 complete prior-knowledge question set']));

chapter13Slides=patch(chapter13Slides,'h13-prior-132',slide=>appendBlocks(slide,[
  {
    kind:'steps',
    title:'Hodder p.308 · complete file-I/O diagnostic',
    items:[
      'Describe three different modes that files can be opened in.',
      'Write pseudocode to create a text file, write several lines, read the text back, and append a line at the end.',
      'Write a program to test the pseudocode.',
    ],
  },
],['Hodder p.308 complete file-organisation prior-knowledge set']));

const chapter1Base={...SOURCE_FINAL_CHAPTER_1,slides:chapter1Slides};
const chapter13Base={...SOURCE_FINAL_CHAPTER_13,slides:chapter13Slides};

export const SOURCE_FILE_FIDELITY_CHAPTER_1=addFileFingerprints(chapter1Base,CHAPTER_1_SOURCE_FILE_MANIFEST);
export const SOURCE_FILE_FIDELITY_CHAPTER_13=addFileFingerprints(chapter13Base,CHAPTER_13_SOURCE_FILE_MANIFEST);
