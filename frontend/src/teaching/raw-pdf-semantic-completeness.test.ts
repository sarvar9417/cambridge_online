import { describe, expect, it } from 'vitest';
import { BOOK_COMPLETENESS_AUDITS } from './book-completeness-audit';
import { SUPPLIED_PDF_DETAIL_ATOMS } from './lesson-source-atoms-supplied-pdf-detail';
import { CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS } from './chapter7-source-pdf-detail';
import {
  RAW_PDF_SEMANTIC_DETAIL_BASELINE,
  RAW_PDF_SEMANTIC_DETAIL_COUNTS,
  rawPdfSemanticDetailsForChapter,
} from './raw-pdf-semantic-baseline';
import {
  CHAPTER_1_SOURCE_FILE_MANIFEST,
  CHAPTER_7_SOURCE_FILE_MANIFEST,
  CHAPTER_13_SOURCE_FILE_MANIFEST,
} from './source-file-fidelity-manifest';

describe('raw PDF semantic completeness gate',()=>{
  it('locks the independent unbolded/source-detail inventory size',()=>{
    expect(RAW_PDF_SEMANTIC_DETAIL_COUNTS).toEqual({1:29,7:18,13:24});
    expect(RAW_PDF_SEMANTIC_DETAIL_BASELINE[1]).toHaveLength(29);
    expect(RAW_PDF_SEMANTIC_DETAIL_BASELINE[7]).toHaveLength(18);
    expect(RAW_PDF_SEMANTIC_DETAIL_BASELINE[13]).toHaveLength(24);
    expect(SUPPLIED_PDF_DETAIL_ATOMS.filter((atom)=>atom.chapter===1)).toHaveLength(29);
    expect(SUPPLIED_PDF_DETAIL_ATOMS.filter((atom)=>atom.chapter===13)).toHaveLength(24);
    expect(CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS).toHaveLength(18);
  });

  it('pins every semantic-detail baseline entry to a fingerprinted source page',()=>{
    const pages={
      1:new Set(CHAPTER_1_SOURCE_FILE_MANIFEST.pages.map((page)=>page.printedPage)),
      7:new Set(CHAPTER_7_SOURCE_FILE_MANIFEST.pages.map((page)=>page.printedPage)),
      13:new Set(CHAPTER_13_SOURCE_FILE_MANIFEST.pages.map((page)=>page.printedPage)),
    } as const;
    for(const chapter of [1,7,13] as const){
      for(const item of rawPdfSemanticDetailsForChapter(chapter)){
        expect(pages[chapter].has(item.printedPage),`${chapter}:${item.id}`).toBe(true);
        expect(item.lineCount,`${chapter}:${item.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('makes semantic source detail and every source atom line blocking Book Completeness',()=>{
    for(const chapter of [1,7,13] as const){
      const audit=BOOK_COMPLETENESS_AUDITS[chapter];
      for(const key of ['source_page_screens','raw_pdf_semantic_details','source_atom_lines_visible'] as const){
        const result=audit.categories[key];
        expect(result,`${chapter}:${key}`).toBeTruthy();
        expect(result!.missing,`${chapter}:${key}: ${result!.missing.join(' | ')}`).toEqual([]);
        expect(result!.covered,`${chapter}:${key}`).toBe(result!.expected);
        expect(result!.complete,`${chapter}:${key}`).toBe(true);
      }
      expect(audit.categories.raw_pdf_semantic_details?.expected).toBe(RAW_PDF_SEMANTIC_DETAIL_COUNTS[chapter]);
      expect(audit.complete).toBe(true);
    }
  });
});
