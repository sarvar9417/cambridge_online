import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { structuredResponseHasContent, structuredResponsePayloadSchema, structuredResponseSummary } from '../lib/structured-question-response.js';

const responseMigration=readFileSync(new URL('./migrations/0208_structured_response_payload.sql',import.meta.url),'utf8');
const fidelityMigration=readFileSync(new URL('./migrations/0209_structured_response_fidelity_v1.sql',import.meta.url),'utf8');

describe('structured Cambridge response persistence',()=>{
  it('bounds tables, matching and drawings instead of accepting arbitrary JSON',()=>{
    const parsed=structuredResponsePayloadSchema.parse({
      version:1,
      values:{'table:2:0:1':'1010'},
      matches:{'matching:3:paging':['d6']},
      drawings:{'drawing:4':{strokes:[[{x:0.1,y:0.2},{x:0.4,y:0.5}]]}},
    });
    expect(structuredResponseHasContent(parsed)).toBe(true);
    expect(structuredResponseSummary(parsed)).toContain('table:2:0:1: 1010');
    expect(()=>structuredResponsePayloadSchema.parse({
      version:1,values:{},matches:{},
      drawings:{'drawing:0':{strokes:[[{x:4,y:0.2}]]}},
    })).toThrow();
  });

  it('stores payloads alongside the legacy readable answer text',()=>{
    expect(responseMigration).toContain('ALTER TABLE public.answers');
    expect(responseMigration).toContain('ADD COLUMN IF NOT EXISTS response_payload jsonb');
    expect(responseMigration).toContain('ALTER TABLE public.live_exam_answers');
    expect(responseMigration).toContain("response_payload->>'version'='1'");
    expect(responseMigration).toContain('pg_column_size(response_payload) <= 262144');
  });

  it('repairs verified truth-table, matching and stack source scaffolds',()=>{
    expect(fidelityMigration).toContain("q.display_ref='9618/11/M/J/25 Q1(b)'");
    expect(fidelityMigration).toContain("'kind','truth_table'");
    expect(fidelityMigration).toContain("'9618/31/M/J/21 Q3(a)'");
    expect(fidelityMigration).toContain("'9618/32/M/J/21 Q3(a)'");
    expect(fidelityMigration).toContain("'9618/33/M/J/21 Q3(a)'");
    expect(fidelityMigration).toContain("'type','matching','mode','single'");
    expect(fidelityMigration).toContain("q.display_ref='9618/12/M/J/23 Q3(a)'");
    expect(fidelityMigration).toContain("'type','matching','mode','multiple'");
    expect(fidelityMigration).toContain("'9618/32/O/N/25 Q8(c)'");
    expect(fidelityMigration).toContain("'type','stack'");
  });

  it('fails closed on high-confidence response-fidelity gaps instead of inventing source structure',()=>{
    expect(fidelityMigration).toContain('STRUCTURED_RESPONSE_TABLE_MISSING');
    expect(fidelityMigration).toContain('STRUCTURED_RESPONSE_MATCHING_MISSING');
    expect(fidelityMigration).toContain('STRUCTURED_RESPONSE_STACK_MISSING');
    expect(fidelityMigration).toContain('STRUCTURED_RESPONSE_DRAWING_MISSING');
    expect(fidelityMigration).toContain("'error'::finding_severity");
  });
});
