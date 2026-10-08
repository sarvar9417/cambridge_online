import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration=readFileSync(
  new URL('./migrations/0207_live_question_visual_readiness_cache.sql',import.meta.url),
  'utf8',
);
const refresh=readFileSync(
  new URL('./refresh-live-question-visual-readiness.ts',import.meta.url),
  'utf8',
);

describe('Live visual readiness cache',()=>{
  it('keeps cache use fail-closed behind one freshness flag',()=>{
    expect(migration).toContain('CREATE TABLE public.live_question_visual_readiness');
    expect(migration).toContain('CREATE TABLE public.live_question_visual_readiness_state');
    expect(migration).toContain('dirty boolean NOT NULL DEFAULT true');
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('REVOKE ALL ON public.live_question_visual_readiness');
  });

  it('invalidates cached readiness after canonical question or asset changes',()=>{
    expect(migration).toContain('questions_live_visual_readiness_dirty');
    expect(migration).toContain('question_assets_live_visual_readiness_dirty');
    expect(migration).toContain('mark_live_question_visual_readiness_dirty');
    expect(migration).toContain('SET dirty=true');
  });

  it('refreshes from the exact shared runtime visual predicates under stable source locks',()=>{
    expect(refresh).toContain("questionVisualIntegritySql('q')");
    expect(refresh).toContain("questionHasVisualSql('q')");
    expect(refresh).toContain('LOCK TABLE public.questions IN SHARE MODE');
    expect(refresh).toContain('LOCK TABLE public.question_assets IN SHARE MODE');
    expect(refresh).toContain('SET dirty=false');
  });
});
