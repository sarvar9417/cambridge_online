import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0208_structured_response_payloads.sql',import.meta.url),'utf8');

describe('structured response migration',()=>{
  it('adds bounded versioned response payloads to assignment and Live answers',()=>{
    expect(sql).toContain('ALTER TABLE public.answers');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS response_json jsonb');
    expect(sql).toContain('ALTER TABLE public.live_exam_answers');
    expect(sql).toContain("response_json->>'version'='1'");
    expect(sql).toContain('pg_column_size(response_json)<=262144');
  });
});
