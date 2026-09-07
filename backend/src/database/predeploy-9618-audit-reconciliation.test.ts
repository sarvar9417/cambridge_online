import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('./migrations/0153_predeploy_9618_audit_reconciliation.sql', import.meta.url),
  'utf8',
);
const audit = readFileSync(
  new URL('./audits/9618-corpus-completion.sql', import.meta.url),
  'utf8',
);

describe('predeploy 9618 audit reconciliation', () => {
  it('repairs the omitted historical binary-magnitude LO without hard-coded database ids', () => {
    expect(migration).toContain("lo.code='1.1-lo-00'");
    expect(migration).toContain("target_lo.code='1.1.1'");
    expect(migration).toContain("source_s.version_label IN ('2021-2023','2024-2025')");
    expect(migration).toContain("'equivalent'");
    expect(migration).toContain('v_component_edges<>2');
    expect(migration).toContain('v_compatibility_edges<>2');
    expect(migration).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });

  it('re-runs deterministic 2025 dependency reconciliation and fails closed if explicit dependencies remain missing', () => {
    expect(migration).toContain("reconcile_source_question_dependencies_v1('9618',2025)");
    expect(migration).toContain("qd.kind='answer_ref'");
    expect(migration).toContain("qd.strength='required'");
    expect(migration).toContain('v_missing_answer<>0');
    expect(migration).toContain('v_missing_practical<>0');
  });

  it('scopes broad corpus checks to 9618 instead of mixing other syllabuses into the release gate', () => {
    const scopedJoins = audit.match(/sy\.code='9618'/g) ?? [];
    expect(scopedJoins.length).toBeGreaterThanOrEqual(12);
    expect(audit).toContain("join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'");
    expect(audit).toContain("sp.kind='QP'::paper_kind");
  });

  it('honours source-verified canonical approval and the explicit manual_only marking boundary', () => {
    expect(audit).toContain('source-verified-corpus-completion-v1');
    expect(audit).toContain('verified-canonical');
    expect(audit).toContain("ms.scheme_type<>'manual_only'::scheme_type");
    expect(audit).toContain("coalesce(ms.prompt_version,'') !~ '^manual-'");
    expect(audit).toContain("coalesce(ms.prompt_version,'') !~ '^manual-practical'");
  });

  it('keeps dependency, scorer and cycle failures release-blocking', () => {
    expect(audit).toContain('bad_capacity');
    expect(audit).toContain('bad_group');
    expect(audit).toContain('missing_dep');
    expect(audit).toContain('q_missing_answer');
    expect(audit).toContain('q_missing_practical');
    expect(audit).toContain('q_cross');
    expect(audit).toContain('q_cycles');
    expect(audit).toContain("raise exception '9618 corpus audit failed");
  });
});
