import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(
  new URL('./migrations/0207_live_question_readiness_cache.sql',import.meta.url),
  'utf8',
);

describe('Live question readiness cache migration',()=>{
  it('precomputes class-syllabus-specific Live readiness behind a revision guard',()=>{
    expect(sql).toContain('CREATE TABLE public.live_question_readiness');
    expect(sql).toContain('CREATE TABLE public.live_question_readiness_state');
    expect(sql).toContain('target_syllabus_id uuid NOT NULL');
    expect(sql).toContain('base_ready boolean NOT NULL');
    expect(sql).toContain('dependency_ready boolean NOT NULL');
    expect(sql).toContain('live_ready boolean NOT NULL');
    expect(sql).toContain('cache_revision=current_revision');
  });

  it('keeps source fidelity and required dependency readiness fail-closed',()=>{
    expect(sql).toContain('live_question_visual_ready_v1');
    expect(sql).toContain('live_question_has_blocking_finding_v1');
    expect(sql).toContain("qd.strength::text='required'");
    expect(sql).toContain('required_dependency_not_ready');
    expect(sql).toContain('response_levels_not_ready');
    expect(sql).toContain('analytics_mapping_not_ready');
  });

  it('invalidates once per mutating statement and remains server-only',()=>{
    expect(sql).toContain('mark_live_question_readiness_stale_v1');
    expect(sql).toContain('FOR EACH STATEMENT');
    expect(sql).toContain('corpus_revision=corpus_revision+1');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('FROM anon, authenticated');
  });
});
