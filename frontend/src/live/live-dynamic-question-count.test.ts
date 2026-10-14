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
    expect(page).toContain("max={user.role==='student'?Math.min(12,eligibleTotal??12):eligibleTotal??undefined}");
    expect(page).not.toContain('max={20}');
  });

  it('pages and searches the full eligible pool without capping the selectable total',()=>{
    expect(page).toContain('const pageSize=20');
    expect(page).toContain('eligibleParams(pageSize,true,false,page*pageSize,search)');
    expect(page).toContain('api<EligibleQuestionResponse>');
    expect(page).toContain('setPoolTotal(result.total)');
    expect(page).toContain('Savollarni qidirish');
    expect(page).not.toContain('current.length>=20');
    expect(page).not.toContain('/20 ta savol');
  });

  it('recalculates availability from class, coursebook section and Live filters',()=>{
    expect(page).toContain("coursebookSectionCodes:syllabusCode==='9618'?coursebookSectionCodes.join");
    expect(page).toContain('includeDiagrams:String(includeDiagrams)');
    expect(page).toContain('excludeSeen:String(excludeSeen)');
    expect(page).toContain('[selectedClassId,syllabusCode,selected0478SubtopicIds,coursebookSectionCodes,includeDiagrams,excludeSeen,difficulty,marksMin,marksMax,yearFrom,yearTo,series,components]');
  });
});
