import { sourceAtomsForChapter } from './lesson-source-atom-registry';
import { SUPPLIED_PDF_DETAIL_ATOMS } from './lesson-source-atoms-supplied-pdf-detail';
import { CHAPTER_7_ALL_SOURCE_ATOMS } from './chapter7-source-atom-complete';
import { CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS } from './chapter7-source-pdf-detail';
import { CHAPTER_7_COURSEBOOK_PAGE_SLIDES } from './coursebook-page-slides';
import { lessonChapter } from './lesson-content-source-complete';
import { rawPdfSemanticDetailsForChapter } from './raw-pdf-semantic-baseline';
import {
  CHAPTER_1_SOURCE_FILE_MANIFEST,
  CHAPTER_7_SOURCE_FILE_MANIFEST,
  CHAPTER_13_SOURCE_FILE_MANIFEST,
} from './source-file-fidelity-manifest';

export type SourceSemanticFidelityCategory = {
  expected: number;
  covered: number;
  missing: string[];
  complete: boolean;
};

const normalise = (value:string) => value
  .normalize('NFKC')
  .replace(/[’‘]/g,"'")
  .replace(/[–—−]/g,'-')
  .replace(/…/g,'...')
  .replace(/\\"/g,'"')
  .replace(/\\\\/g,'\\')
  .replace(/\s+/g,' ')
  .trim()
  .toLowerCase();

const visibleSlideText = (slide:unknown) => normalise(JSON.stringify(slide));

const category = (expected:number, missing:string[]):SourceSemanticFidelityCategory => ({
  expected,
  covered:Math.max(0,expected-missing.length),
  missing,
  complete:missing.length===0,
});

const manifestForChapter = (chapter:1|7|13) => chapter===1
  ? CHAPTER_1_SOURCE_FILE_MANIFEST
  : chapter===7
    ? CHAPTER_7_SOURCE_FILE_MANIFEST
    : CHAPTER_13_SOURCE_FILE_MANIFEST;

const pageSlide = (chapter:1|7|13, page:number, printedPage:number) => chapter===7
  ? CHAPTER_7_COURSEBOOK_PAGE_SLIDES.find((slide)=>slide.id===`ch7-source-page-${printedPage}`)
  : (lessonChapter(chapter)?.slides??[]).find((slide)=>slide.id===`h${chapter}-coursebook-page-${String(page).padStart(2,'0')}`);

const detailAtoms = (chapter:1|7|13) => chapter===7
  ? CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS
  : SUPPLIED_PDF_DETAIL_ATOMS.filter((atom)=>atom.chapter===chapter);

const allAtoms = (chapter:1|7|13) => chapter===7
  ? CHAPTER_7_ALL_SOURCE_ATOMS.map((atom)=>({
      id:atom.id,
      page:atom.printedPage,
      printedPage:atom.printedPage,
      sourceRef:atom.sourceRef,
      needles:atom.needles,
    }))
  : sourceAtomsForChapter(chapter).map((atom)=>({
      id:atom.id,
      page:atom.page,
      printedPage:chapter===13?atom.page+303:atom.page,
      sourceRef:atom.sourceRef,
      needles:atom.needles,
    }));

/** Every fingerprinted page must have a real learner-visible source screen. */
function sourcePageScreensCategory(chapter:1|7|13):SourceSemanticFidelityCategory{
  const manifest=manifestForChapter(chapter);
  const missing=manifest.pages
    .filter(({printedPage})=>{
      const page=chapter===13?printedPage-303:printedPage;
      return !pageSlide(chapter,page,printedPage);
    })
    .map(({printedPage})=>`p.${printedPage}: learner-visible source screen`);
  return category(manifest.pageCount,missing);
}

/**
 * The static baseline freezes every source-detail atom extracted from unbolded
 * explanatory/coursebook material. An atom cannot disappear, move page, or
 * silently lose one of its curated teaching lines while the formal badge stays
 * green.
 */
function rawPdfSemanticDetailCategory(chapter:1|7|13):SourceSemanticFidelityCategory{
  const expected=rawPdfSemanticDetailsForChapter(chapter);
  const actual=detailAtoms(chapter);
  const missing=expected.filter((item)=>{
    const atom=actual.find((candidate)=>candidate.id===item.id);
    if(!atom)return true;
    const atomPage=chapter===7
      ? (atom as (typeof CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS)[number]).printedPage
      : (atom as (typeof SUPPLIED_PDF_DETAIL_ATOMS)[number]).page;
    const printedPage=chapter===13?atomPage+303:atomPage;
    if(atomPage!==item.page||printedPage!==item.printedPage||atom.needles.length!==item.lineCount)return true;
    const slide=pageSlide(chapter,item.page,item.printedPage);
    if(!slide)return true;
    const visible=visibleSlideText(slide);
    return !visible.includes(normalise(atom.sourceRef))
      || atom.needles.some((line)=>!visible.includes(normalise(line)));
  }).map((item)=>`p.${item.printedPage}: ${item.id} (${item.lineCount} semantic lines)`);
  return category(expected.length,missing);
}

/**
 * The page-by-page UI is the final learner-visible projection. This gate checks
 * every registered source atom label and every exact source line on its own
 * source page, including prior knowledge, examples, activities, tables,
 * figures, reviews and unbolded PDF-detail material.
 */
function sourceAtomLinesVisibleCategory(chapter:1|7|13):SourceSemanticFidelityCategory{
  const atoms=allAtoms(chapter);
  const expected=atoms.reduce((total,atom)=>total+1+atom.needles.length,0);
  const missing:string[]=[];
  for(const atom of atoms){
    const slide=pageSlide(chapter,atom.page,atom.printedPage);
    const visible=slide?visibleSlideText(slide):'';
    if(!visible.includes(normalise(atom.sourceRef)))missing.push(`p.${atom.printedPage}: ${atom.id} source label`);
    atom.needles.forEach((line,index)=>{
      if(!visible.includes(normalise(line)))missing.push(`p.${atom.printedPage}: ${atom.id} line ${index+1}`);
    });
  }
  return category(expected,missing);
}

export const sourceSemanticFidelityCategories = (chapter:1|7|13):Record<string,SourceSemanticFidelityCategory> => ({
  source_page_screens:sourcePageScreensCategory(chapter),
  raw_pdf_semantic_details:rawPdfSemanticDetailCategory(chapter),
  source_atom_lines_visible:sourceAtomLinesVisibleCategory(chapter),
});
