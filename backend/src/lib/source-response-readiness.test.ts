import { describe, expect, it } from 'vitest';
import { questionResponseIntegritySql } from './source-response-readiness.js';

describe('source response readiness',()=>{
  it('requires a usable response surface for table and diagram answers',()=>{
    const sql=questionResponseIntegritySql('q');
    expect(sql).toContain("q.answer_kind::text<>'table'");
    expect(sql).toContain("q.answer_kind::text<>'diagram'");
    expect(sql).toContain("response_block->>'type'='table'");
    expect(sql).toContain("response_block->>'kind' in ('drawing','table_cells')");
    expect(sql).toContain("response_asset.kind in ('table','diagram','image')");
  });

  it('allows dedicated stack workspaces without inventing a source table',()=>{
    const sql=questionResponseIntegritySql('candidate');
    expect(sql).toContain("lower(coalesce(candidate.stem_md,''))");
    expect(sql).toContain('rpn expression');
    expect(sql).toContain('changing contents');
  });
});
