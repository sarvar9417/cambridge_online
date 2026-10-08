import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');

describe('Live dynamic question count',()=>{
  it('uses the database eligible total as the automatic maximum',()=>{
    expect(page).toContain('const [eligibleTotal,setEligibleTotal]=useState<number|null>(null)');
    expect(page).toContain('Tanlangan filtrlarda');
    expect(page).toContain('Maximum: ${eligibleTotal}');
    expect(page).toContain('max={eligibleTotal??undefined}');
    expect(page).not.toContain('max={20}');
  });

  it('loads the complete eligible pool for manual selection instead of stopping at 20 or 30',()=>{
    expect(page).toContain('eligibleParams(total)');
    expect(page).toContain('{data:EligibleQuestion[];total:number}');
    expect(page).not.toContain('current.length>=20');
    expect(page).not.toContain('/20 ta savol');
    expect(page).not.toContain("limit:'30'");
  });

  it('recalculates availability from class, topic, subtopic and Live filters',()=>{
    expect(page).toContain('includeDiagrams:String(includeDiagrams)');
    expect(page).toContain('excludeSeen:String(excludeSeen)');
    expect(page).toContain('[selectedClassId,topicIds,subtopicIds,includeDiagrams,excludeSeen]');
  });
});
