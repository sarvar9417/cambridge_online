import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

const sql=readFileSync(
  new URL('./migrations/0209_source_markdown_response_table_repair.sql',import.meta.url),
  'utf8',
);

describe('0209 source-backed Markdown response-table repair',()=>{
  it('requires canonical provenance and a referenced table asset before repair',()=>{
    expect(sql).toContain("q.content_version=1");
    expect(sql).toContain("v_q.content_json->'source'->>'paperId'");
    expect(sql).toContain("v_q.content_json->'source'->>'sha256'");
    expect(sql).toContain("b->>'assetId'=qa.id::text");
  });

  it('only turns source blank or underscore cells into editable cells',()=>{
    expect(sql).toContain("v_cell='' OR v_cell~'^_+$'");
    expect(sql).toContain("'editableCells',v_parsed->'editableCells'");
    expect(sql).toContain("'answerInference',false");
  });

  it('fails closed on ambiguous candidate tables and never changes review status',()=>{
    expect(sql).toContain('competitor.editable_count=candidate.editable_count');
    expect(sql).toContain('candidate.editable_count>=2');
    expect(sql).not.toMatch(/update\s+public\.questions[\s\S]*status\s*=/i);
    expect(sql).not.toMatch(/update\s+public\.validation_findings/i);
  });

  it('records every applied repair in the structured-content audit ledger',()=>{
    expect(sql).toContain("source-markdown-response-table-v1");
    expect(sql).toContain('structured_content_backfill_audits');
    expect(sql).toContain('set_question_structured_content_v1');
  });
});
