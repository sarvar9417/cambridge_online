import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(
  new URL('./migrations/0203_q7a_trace_table_source_repair.sql',import.meta.url),
  'utf8',
);

describe('0203 Q7(a) trace-table source repair',()=>{
  it('targets only the verified 9618/12/O/N/22 Q7(a) source paper',()=>{
    expect(sql).toContain("9618/12/O/N/22 Q7(a)");
    expect(sql).toContain("b4598c9803261b160d58018f7411abc161637b8b803d40fc79875089ea3922b0");
    expect(sql).toContain("'[153,234,1542,2214]'::jsonb");
    expect(sql).toContain("Original Cambridge source layout for 9618/12/O/N/22 Q7(a)");
  });

  it('repairs the canonical asset reference without deleting historical assets',()=>{
    expect(sql).toContain("set_question_structured_content_v1");
    expect(sql).toContain("q7a-trace-table-source-repair-v1");
    expect(sql).toContain("replace_prose_trace_table_placeholder_with_verified_source_crop");
    expect(sql).not.toMatch(/delete\s+from\s+public\.question_assets/i);
    expect(sql).not.toMatch(/update\s+public\.question_assets/i);
  });
});
