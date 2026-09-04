import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

const migration=(name:string)=>readFileSync(new URL(`./migrations/${name}`,import.meta.url),'utf8');

describe('structured question migration contracts',()=>{
  it('fails closed when future approved QP leaves have no canonical v1 content',()=>{
    const sql=migration('0117_future_ingestion_structured_content_gate.sql');
    expect(sql).toContain("checker_prompt_version='cross-check.v3'");
    expect(sql).toContain("sourceMode'<>'page_image+text_layer'");
    expect(sql).toContain("structured_content_ingestion_unrepresentable");
    expect(sql).toContain('content_version IS DISTINCT FROM 1');
    expect(sql).toContain('DEFERRABLE INITIALLY DEFERRED');
    expect(sql).toContain('set_question_structured_content_v1');
    expect(sql).not.toMatch(/SET\s+status\s*=\s*['\"]approved/i);
  });

  it('enriches only printed Boolean expressions and preserves the matched audit line',()=>{
    const sql=migration('0118_boolean_expression_semantics.sql');
    expect(sql).toContain("'semantics','boolean_expression'");
    expect(sql).toContain("candidate !~ '(_{3,}|\\.{3,})'");
    expect(sql).toContain('boolean_source_to_latex_v1');
    expect(sql).toContain('v_expression := v_line');
    expect(sql).toContain('v_source_page,v_expression,v_latex');
    expect(sql).toContain('set_question_structured_content_v1');
    expect(sql).toContain("'status','no_printed_expression'");
    expect(sql).toContain('boolean_expression_semantic_audits');
    expect(sql).not.toMatch(/SET\s+status\s*=\s*['\"]approved/i);
  });
});
