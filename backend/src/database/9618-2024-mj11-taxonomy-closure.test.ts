import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0174_9618_2024_mj11_taxonomy_closure.sql',import.meta.url),'utf8');

const reviewedRefs=[
  '9618/11/M/J/24 Q1(a)',
  '9618/11/M/J/24 Q1(b)',
  '9618/11/M/J/24 Q2(b)',
  '9618/11/M/J/24 Q2(c)(i)',
  '9618/11/M/J/24 Q2(c)(ii)',
  '9618/11/M/J/24 Q2(c)(iii)',
  '9618/11/M/J/24 Q2(d)',
  '9618/11/M/J/24 Q3(a)',
  '9618/11/M/J/24 Q3(b)',
  '9618/11/M/J/24 Q4(a)',
  '9618/11/M/J/24 Q4(b)',
  '9618/11/M/J/24 Q5(a)',
  '9618/11/M/J/24 Q5(b)',
  '9618/11/M/J/24 Q5(c)(i)',
  '9618/11/M/J/24 Q6(a)',
  '9618/11/M/J/24 Q6(b)',
  '9618/11/M/J/24 Q6(c)(i)',
  '9618/11/M/J/24 Q6(c)(ii)',
  '9618/11/M/J/24 Q7',
  '9618/11/M/J/24 Q8(a)',
  '9618/11/M/J/24 Q8(b)(i)',
  '9618/11/M/J/24 Q8(b)(ii)',
] as const;

describe('0174 9618/11/M/J/24 taxonomy closure',()=>{
  it('pins the repair to the exact approved Cambridge source paper',()=>{
    expect(sql).toContain("sy.version_label='2024-2025'");
    expect(sql).toContain("sp.year=2024");
    expect(sql).toContain("sp.series='MJ'::exam_series");
    expect(sql).toContain("c.number=1");
    expect(sql).toContain("sp.variant=1");
    expect(sql).toContain("2e39e6c2ee1e65d621df71b4b7fbe41a16f1e4ed8e252fb1612a6d14b13de063");
    expect(sql).toContain('v_resolved<>22');
  });

  it('reviews all twenty-two low-confidence leaves',()=>{
    for(const ref of reviewedRefs) expect(sql).toContain(ref);
    expect(sql).toContain("review_tag='manual-source-audit-0174-mj24-11'");
    expect(sql).toContain("'taxonomy_catalog','backend/src/database/catalogs/9618-2024-2025.json'");
    expect(sql).toContain('v_reviewed<>22');
    expect(sql).toContain('v_low<>0');
  });

  it('corrects the two source-inconsistent objective mappings',()=>{
    expect(sql).toContain("('9618/11/M/J/24 Q1(a)','3.2-lo-05','3.2-lo-06'");
    expect(sql).toContain("('9618/11/M/J/24 Q2(c)(ii)','3.1-lo-01','3.1-lo-06'");
    expect(sql).toContain("('3.2-lo-06','Construct a logic expression.')");
    expect(sql).toContain("('3.1-lo-06','Describe the principal operations of a range of hardware devices.')");
    expect(sql).toContain('v_bad_old<>0');
    expect(sql).toContain('v_bad_new<>0');
  });

  it('does not rewrite question, LaTeX, mark-scheme or primary-subtopic content',()=>{
    expect(sql).not.toContain('UPDATE public.questions');
    expect(sql).not.toContain('UPDATE public.mark_schemes');
    expect(sql).not.toContain('UPDATE public.question_subtopics');
    expect(sql).not.toContain('stem_latex=');
    expect(sql).not.toContain('stem_md=');
  });

  it('is idempotent for reviewed targets and history',()=>{
    expect(sql).toContain('WHERE NOT EXISTS (');
    expect(sql).toContain('ON CONFLICT(question_id,lo_id)');
    expect(sql).toContain('GREATEST(public.question_learning_objectives.confidence,EXCLUDED.confidence)');
  });
});
