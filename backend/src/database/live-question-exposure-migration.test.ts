import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(
  new URL('./migrations/0206_live_question_exposure_read_model.sql',import.meta.url),
  'utf8',
);

describe('Live question exposure read model migration',()=>{
  it('records exposure only from an actually opened Live round',()=>{
    expect(sql).toContain('CREATE TABLE public.class_question_exposures');
    expect(sql).toContain("source_type text NOT NULL DEFAULT 'live' CHECK (source_type='live')");
    expect(sql).toContain("WHEN (NEW.event_type='question.opened')");
    expect(sql).toContain('record_live_question_exposure_from_event');
    expect(sql).toContain("MESSAGE = 'live_question_opened_target_missing'");
  });

  it('backfills historical exposure from question.opened events rather than session preload membership',()=>{
    expect(sql).toContain("WHERE e.event_type='question.opened'");
    expect(sql).toContain("THEN (e.payload->>'position')::int");
    expect(sql).not.toContain('started_at is not null');
  });

  it('keeps the exposure ledger server-only and indexed for class/question reuse checks',()=>{
    expect(sql).toContain('class_question_exposures_class_question_idx');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('REVOKE ALL ON public.class_question_exposures FROM anon, authenticated');
  });
});
