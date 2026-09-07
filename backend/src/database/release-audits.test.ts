import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentRelease = readFileSync(
  new URL('./audits/9618-current-release-state.sql', import.meta.url),
  'utf8',
);
const exportReadiness = readFileSync(
  new URL('./audits/9618-question-export-readiness.sql', import.meta.url),
  'utf8',
);

describe('9618 release audit contracts', () => {
  it('keeps the current 2026 release behind the strict source-verified year gate', () => {
    expect(currentRelease).toContain("assert_source_verified_year_v1('9618', 2026)");
    expect(currentRelease).toContain('qp_count<>12');
    expect(currentRelease).toContain('ms_count<>12');
    expect(currentRelease).toContain('blocked_count<>0');
    expect(currentRelease).toContain('broken_pairs<>0');
    expect(currentRelease).toContain("'strictCurrentTargetVerified',true");
  });

  it('reports current-target counts separately from the historical source-backed corpus', () => {
    expect(currentRelease).toContain("'expectedPapers',12");
    expect(currentRelease).toContain("'sourceCompleteQuestions'");
    expect(currentRelease).toContain('sp.year BETWEEN 2021 AND 2026');
    expect(currentRelease).toContain("'historicalSourceBackedQuestions'");
  });

  it('accepts only materializable private Supabase assets instead of blanket-rejecting storage-backed visuals', () => {
    expect(exportReadiness).toContain("qa.storage_path !~ '^supabase://[^/]+/.+'");
    expect(exportReadiness).toContain("to_regclass('storage.objects') IS NOT NULL");
    expect(exportReadiness).toContain("o.bucket_id=split_part(replace(qa.storage_path,'supabase://',''),'/',1)");
    expect(exportReadiness).toContain("o.name=regexp_replace(replace(qa.storage_path,'supabase://',''),'^[^/]+/','')");
    expect(exportReadiness).toContain('required assets have neither inline content nor a valid private storage path');
    expect(exportReadiness).toContain('private asset storage objects are missing');
  });

  it('retains fail-closed export integrity gates', () => {
    expect(exportReadiness).toContain('mark-bearing leaves have blank stems');
    expect(exportReadiness).toContain('source-backed leaves lack primary taxonomy');
    expect(exportReadiness).toContain('dependency targets are missing');
    expect(exportReadiness).toContain('mark schemes have no exportable points/levels');
    expect(exportReadiness).toContain('source-backed QPs are not 75 marks');
  });
});
