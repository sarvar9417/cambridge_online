import { describe, expect, it } from 'vitest';
import { lessonChapter } from './lesson-content-source-complete';
import { COMPLETE_SOURCE_ATOMS } from './lesson-source-atom-registry';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { CHAPTER_7_PAGE_SOURCE_ATOMS } from './chapter7-source-atoms';
import {
  CHAPTER_1_SOURCE_FILE_MANIFEST,
  CHAPTER_7_SOURCE_FILE_MANIFEST,
  CHAPTER_13_SOURCE_FILE_MANIFEST,
  SOURCE_FILE_FIDELITY_MANIFESTS,
} from './source-file-fidelity-manifest';

const text=(value:unknown)=>JSON.stringify(value).toLowerCase();
const shaPattern=/^[0-9a-f]{64}$/;

describe('exact supplied PDF fidelity contract',()=>{
  it('locks all three audits to the exact user-supplied source files',()=>{
    expect(SOURCE_FILE_FIDELITY_MANIFESTS.map(item=>item.pageCount)).toEqual([26,41,24]);
    for(const manifest of SOURCE_FILE_FIDELITY_MANIFESTS){
      expect(manifest.sourceFileSha256).toMatch(shaPattern);
      expect(manifest.pages).toHaveLength(manifest.pageCount);
      expect(new Set(manifest.pages.map(page=>page.printedPage)).size).toBe(manifest.pageCount);
      manifest.pages.forEach(page=>expect(page.sha256).toMatch(shaPattern));
    }
  });

  it('has a fingerprint for every source page in the three supplied extracts',()=>{
    expect(CHAPTER_1_SOURCE_FILE_MANIFEST.pages.map(page=>page.printedPage)).toEqual(
      Array.from({length:26},(_,index)=>index+1),
    );
    expect(CHAPTER_13_SOURCE_FILE_MANIFEST.pages.map(page=>page.printedPage)).toEqual(
      Array.from({length:24},(_,index)=>304+index),
    );
    expect(CHAPTER_7_SOURCE_FILE_MANIFEST.pages.map(page=>page.printedPage)).toEqual(
      Array.from({length:41},(_,index)=>258+index),
    );
  });

  it('requires every fingerprinted Chapter 1 and 13 page to remain represented by source atoms',()=>{
    const chapter1Pages=new Set(COMPLETE_SOURCE_ATOMS.filter(atom=>atom.chapter===1).map(atom=>atom.page));
    const chapter13Pages=new Set(COMPLETE_SOURCE_ATOMS.filter(atom=>atom.chapter===13).map(atom=>atom.page+303));
    CHAPTER_1_SOURCE_FILE_MANIFEST.pages.forEach(page=>expect(chapter1Pages.has(page.printedPage),`Chapter 1 p.${page.printedPage}`).toBe(true));
    CHAPTER_13_SOURCE_FILE_MANIFEST.pages.forEach(page=>expect(chapter13Pages.has(page.printedPage),`Chapter 13 p.${page.printedPage}`).toBe(true));
  });

  it('requires every fingerprinted Chapter 7 page to remain represented by a page source atom',()=>{
    const pages=new Set(CHAPTER_7_PAGE_SOURCE_ATOMS.map(atom=>atom.printedPage));
    CHAPTER_7_SOURCE_FILE_MANIFEST.pages.forEach(page=>expect(pages.has(page.printedPage),`Chapter 7 p.${page.printedPage}`).toBe(true));
  });

  it('keeps the complete source diagnostics visible while preserving the existing lesson routes',()=>{
    const chapter1=lessonChapter(1);
    const chapter13=lessonChapter(13);
    expect(chapter1).not.toBeNull();
    expect(chapter13).not.toBeNull();
    const ch1=text(chapter1);
    const ch13=text(chapter13);
    expect(ch1).toContain('00110101 + 01001000');
    expect(ch1).toContain('2777 + acf1');
    expect(ch1).toContain('binary magnitudes and decimal/binary prefixes');
    expect(ch13).toContain('whether the animal was born in the zoo or not');
    expect(ch13).toContain('append a line at the end');
    expect(ch13).toContain('serial/sequential/random file organisation');
    expect(chapter1?.coverage).toContain('26/26 page fingerprints');
    expect(chapter13?.coverage).toContain('24/24 page fingerprints');
  });

  it('keeps Chapter 7 source-atom route intact and adds exact supplied-file locking',()=>{
    expect(CHAPTER_7.coverage).toContain('source-exhaustive book deep dive');
    expect(CHAPTER_7.coverage).toContain('41/41 source pages audited');
    expect(CHAPTER_7.coverage).toContain('41/41 exact supplied-PDF page fingerprints');
    expect(text(CHAPTER_7)).toContain('requirements specification');
    expect(text(CHAPTER_7)).toContain('activity 7.20');
  });
});
