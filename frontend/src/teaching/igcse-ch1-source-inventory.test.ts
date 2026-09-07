import { describe, expect, it } from 'vitest';
import {
  IGCSE_CH1_ACTIVITY_IDS,
  IGCSE_CH1_EXAM_STYLE_QUESTION_IDS,
  IGCSE_CH1_KEY_TERMS,
  IGCSE_CH1_PAGE_INVENTORY,
  IGCSE_CH1_SESSION_PLAN,
  IGCSE_CH1_SOURCE_INVENTORY_AUDIT,
} from './igcse-ch1-source-inventory';

describe('0478 Chapter 1 exact source inventory',()=>{
  it('inventories every printed teaching page 2-44 / PDF 14-56 exactly once',()=>{
    expect(IGCSE_CH1_PAGE_INVENTORY).toHaveLength(43);
    expect(IGCSE_CH1_PAGE_INVENTORY.map(page=>page.printedPage)).toEqual(Array.from({length:43},(_,i)=>i+2));
    expect(IGCSE_CH1_PAGE_INVENTORY.map(page=>page.pdfPage)).toEqual(Array.from({length:43},(_,i)=>i+14));
    expect(new Set(IGCSE_CH1_PAGE_INVENTORY.map(page=>page.printedPage)).size).toBe(43);
    for(const page of IGCSE_CH1_PAGE_INVENTORY){
      expect(page.families.length,`printed p.${page.printedPage}`).toBeGreaterThan(0);
      expect(page.anchors.length,`printed p.${page.printedPage}`).toBeGreaterThan(0);
    }
  });

  it('preserves the complete formal key-term and practice identifiers',()=>{
    expect(IGCSE_CH1_ACTIVITY_IDS).toHaveLength(16);
    expect(IGCSE_CH1_KEY_TERMS).toHaveLength(31);
    expect(IGCSE_CH1_EXAM_STYLE_QUESTION_IDS).toHaveLength(9);
    expect(IGCSE_CH1_KEY_TERMS).toContain('logical shift');
    expect(IGCSE_CH1_KEY_TERMS).toContain('run length encoding (RLE)');
    expect(IGCSE_CH1_ACTIVITY_IDS[0]).toBe('Activity 1.1');
    expect(IGCSE_CH1_ACTIVITY_IDS.at(-1)).toBe('Activity 1.16');
  });

  it('assigns every source page to a real 45-minute session without duplicate ownership',()=>{
    const owned=IGCSE_CH1_SESSION_PLAN.flatMap(session=>session.printedPages.map(page=>({page,session:session.id})));
    expect(new Set(owned.map(item=>item.page)).size).toBe(43);
    expect(owned).toHaveLength(43);
    expect(owned.map(item=>item.page).sort((a,b)=>a-b)).toEqual(Array.from({length:43},(_,i)=>i+2));
    expect(IGCSE_CH1_SESSION_PLAN).toHaveLength(20);
    expect(IGCSE_CH1_SESSION_PLAN.filter(session=>session.purpose==='extension').every(session=>!session.required)).toBe(true);
  });

  it('keeps all book feature families represented in the inventory',()=>{
    const families=new Set(IGCSE_CH1_PAGE_INVENTORY.flatMap(page=>page.families));
    [
      'learning_outline','concept','worked_example','activity','find_out_more','advice','link','figure','table','extension','summary','key_terms','exam_style',
    ].forEach(family=>expect(families.has(family as never),family).toBe(true));
  });

  it('reports the inventory complete only when both page accounting and session assignment are exhaustive',()=>{
    expect(IGCSE_CH1_SOURCE_INVENTORY_AUDIT).toMatchObject({
      printedPageFrom:2,
      printedPageTo:44,
      pdfPageFrom:14,
      pdfPageTo:56,
      pagesExpected:43,
      pagesInventoried:43,
      pagesAssignedToSessions:43,
      activities:16,
      keyTerms:31,
      examStyleQuestions:9,
      complete:true,
    });
  });
});
