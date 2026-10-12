import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');

describe('Live dynamic question count',()=>{
  it('uses the database eligible total as the automatic maximum',()=>{
    expect(page).toContain('const [eligibleTotal,setEligibleTotal]=useState<number|null>(null)');
    expect(page).toContain('const [eligibleCounts,setEligibleCounts]=useState<EligibleQuestionCounts|null>(null)');
    expect(page).toContain('Jami bazada: ${eligibleCounts.database}');
    expect(page).toContain('Live-ready: ${eligibleCounts.liveReady}');
    expect(page).toContain('Hozir tanlash mumkin: ${eligibleCounts.available}');
    expect(page).toContain('Maximum: ${eligibleTotal}');
    expect(page).toContain('max={eligibleTotal??undefined}');
    expect(page).not.toContain('max={20}');
  });

  it('pages the complete eligible pool without imposing a manual-selection cap',()=>{
    expect(page).toContain('eligibleParams(30,true,false,offset)');
    expect(page).toContain('setPoolOffset(offset)');
    expect(page).toContain('poolOffset+30>=eligibleTotal');
    expect(page).toContain('setQuestionCache((current)=>Object.fromEntries');
    expect(page).toContain('api<EligibleQuestionResponse>');
    expect(page).not.toContain('current.length>=20');
    expect(page).not.toContain('/20 ta savol');
  });

  it('recalculates availability from class, coursebook section and Live filters',()=>{
    expect(page).toContain('coursebookSectionCodes:coursebookSectionCodes.join');
    expect(page).toContain('includeDiagrams:String(includeDiagrams)');
    expect(page).toContain('excludeSeen:String(excludeSeen)');
    expect(page).toContain("[selectedClassId,coursebookSectionCodes,includeDiagrams,excludeSeen,builderSearch,marksMin,marksMax,yearFrom,yearTo,seriesFilter.join(','),componentFilter.join(','),variantFilter.join(',')]");
    expect(page).toContain('q:builderSearch.trim()');
    expect(page).toContain("series:seriesFilter.join(',')");
  });
});
