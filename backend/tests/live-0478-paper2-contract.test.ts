import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';

const root=resolve(process.cwd(),'..');
const source=(path:string)=>readFileSync(resolve(root,path),'utf8');
const service=source('backend/src/services/live-exam-service.ts');
const routes=source('backend/src/routes/live-exams.ts');
const migration=source('backend/src/database/migrations/0211_live_0478_paper2_syllabus_isolation.sql');

describe('0478 Paper 2 Live Challenge isolation',()=>{
  it('validates syllabusCode at all three creation/selection endpoints',()=>{
    expect(routes).toContain("const liveSyllabusCode=z.enum(['9618','0478']).default('9618')");
    expect(routes.match(/syllabusCode:liveSyllabusCode/g)?.length).toBeGreaterThanOrEqual(3);
    expect(routes).toContain('syllabusCode:query.syllabusCode');
  });
  it('filters by source syllabus, and 0478 only by Paper 2, in count and candidate SQL',()=>{
    expect(service).toContain("source_syllabus.code=${syllabusParameter}");
    expect(service).toContain("source_syllabus.code=$1");
    expect(service.match(/source_component.number=2/g)?.length).toBeGreaterThanOrEqual(2);
    expect(service).toContain("syllabusCode==='0478'");
    expect(service).toContain("'live_0478_paper2_only'");
  });
  it('uses matching source syllabus readiness instead of 9618 classroom LOs',()=>{
    expect(service).toContain("syllabusCode==='0478'?'sp.syllabus_id':'live_class.syllabus_id'");
    expect(service).toContain("syllabusCode==='0478'?'sp.syllabus_id':'readiness_class.syllabus_id'");
    expect(service).toContain('await this.requireQuestionSourceScope(expandedQuestionIds');
    expect(service).toContain('await this.requireQuestionSourceScope(expandedIds');
    expect(service).toContain("syllabusCode: input.syllabusCode??'9618'");
  });
  it('retains legacy 9618 assessment but bars 0478 marks from 9618 mastery',()=>{
    expect(migration).toContain("coalesce(nullif(p_settings->>'syllabusCode',''),sy.code)=sy.code");
    expect(migration).toContain("NEW.settings->>'practiceMode' IS NULL");
    expect(migration).toContain('live_session_evidence_syllabus_matches_v1(NEW.class_id,NEW.settings)');
    expect(migration).not.toContain('DISABLE TRIGGER');
  });
  it('gives student hosts the public 0478 topic menu without privileged question bank access',()=>{
    expect(routes).toContain("where sy.code='0478'");
    expect(routes).toContain('t.number between 7 and 10');
    expect(routes).toContain("res.json({coursebookSections,topics:topics?.rows??[]})");
  });
});
