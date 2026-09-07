import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('./migrations/0121_question_source_identity_cleanup.sql', import.meta.url),
  'utf8',
);

const exactDuplicateAudit = readFileSync(
  new URL('./audits/question-exact-duplicates.sql', import.meta.url),
  'utf8',
);

const occurrenceAudit = readFileSync(
  new URL('./audits/question-source-occurrence-equivalence.sql', import.meta.url),
  'utf8',
);

const distinctnessMigration = readFileSync(
  new URL('./migrations/0151_source_variant_distinctness_reviews.sql', import.meta.url),
  'utf8',
);

describe('question source identity and dedupe contracts', () => {
  it('repairs the one ambiguous display ref and fails closed on future collisions', () => {
    expect(migration).toContain("path = '6.a'");
    expect(migration).toContain("display_ref = '9618/11/M/J/23 Q6(a)'");
    expect(migration).toContain('question_source_identity_cleanup_precondition_failed');
    expect(migration).toContain('question_source_identity_duplicate_display_refs_remaining');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS questions_display_ref_key');
    expect(migration).not.toMatch(/DELETE\s+FROM\s+questions/i);
  });

  it('defines destructive duplicate candidates only inside the same source paper', () => {
    expect(exactDuplicateAudit).toContain('GROUP BY source_paper_id, canonical_hash');
    expect(exactDuplicateAudit).toContain("'mark_schemes'");
    expect(exactDuplicateAudit).toContain("'assets'");
    expect(exactDuplicateAudit).toContain("'subtopics'");
    expect(exactDuplicateAudit).toContain("'learning_objectives'");
    expect(exactDuplicateAudit).not.toMatch(/DELETE\s+FROM\s+questions/i);
  });

  it('canonicalizes source-verified cross-variant equivalents while preserving official occurrences', () => {
    expect(occurrenceAudit).toContain('source_paper_equivalences');
    expect(occurrenceAudit).toContain('question_source_occurrences');
    expect(occurrenceAudit).toContain("e.equivalence_kind='exact_content'");
    expect(occurrenceAudit).toContain('v_physical_on_equivalent');
    expect(occurrenceAudit).toContain('source_occurrences');
    expect(occurrenceAudit).toContain('canonical_questions');
    expect(occurrenceAudit).not.toMatch(/DELETE\s+FROM\s+questions/i);
  });

  it('persists source-verified decisions for same-shape variants that are materially distinct', () => {
    expect(distinctnessMigration).toContain('source_paper_distinctness_reviews');
    expect(distinctnessMigration).toContain("result='distinct_content'");
    expect(distinctnessMigration).toContain("'sourceVerified',true");
    expect(distinctnessMigration).toContain('v_unreviewed');
    expect(distinctnessMigration).toContain('unreviewed same-shape 9618 source variant candidates');
    expect(distinctnessMigration).not.toMatch(/DELETE\s+FROM\s+questions/i);
  });
});
