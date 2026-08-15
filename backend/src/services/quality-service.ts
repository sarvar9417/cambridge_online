import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export interface QualitySummary {
  extraction: {
    /** Mean model confidence over every extracted question. */
    meanConfidence: number | null;
    lowConfidence: number;
    total: number;
    crossChecks: { total: number; agreed: number; disagreed: number; agreementPct: number | null };
    disagreements: Array<{ field: string; severity: string; count: number }>;
  };
  grading: {
    evaluations: Array<{
      promptVersion: string; model: string; sampleSize: number;
      pointAgreementPct: number | null; falsePositivePct: number | null; falseNegativePct: number | null;
      computedAt: string;
    }>;
    /** Marked answers a teacher has actually checked, which is what makes the numbers above meaningful. */
    teacherCheckedPoints: number;
  };
  promptVersions: Array<{ purpose: string; promptVersion: string; calls: number; failed: number }>;
}

/**
 * Is the machine getting it right?
 *
 * Two independent questions live here. Extraction quality asks whether a
 * question was read off the paper correctly -- measured by the model's own
 * confidence and by the second model that cross-checks it. Grading quality asks
 * whether a mark was awarded correctly, which can only be measured against a
 * teacher who checked it.
 *
 * Kept apart because a good number in one says nothing about the other, and
 * because grading quality is empty until teachers have marked enough work,
 * while extraction quality exists from the first paper.
 */
export class QualityService {
  constructor(private readonly pool: Pool) {}

  async summary(actor: Actor): Promise<QualitySummary> {
    if (actor.role !== 'owner') throw new DomainError('owners_only', 403);

    const [extraction, crossChecks, disagreements, evaluations, checked, prompts] = await Promise.all([
      this.pool.query(`
        select count(*)::int total,
               round(avg(extract_confidence)::numeric, 3) mean_confidence,
               count(*) filter (where extract_confidence < 0.80)::int low_confidence
        from questions where extract_confidence is not null`),

      this.pool.query(`
        select count(*)::int total,
               count(*) filter (where agrees)::int agreed,
               count(*) filter (where not agrees)::int disagreed
        from cross_checks where ref_table = 'questions'`),

      // What the checker disagrees about, not merely how often -- one recurring
      // field is a fixable prompt problem, scattered ones are not.
      this.pool.query(`
        select item->>'field' field,
               coalesce(item->>'severity', 'warning') severity,
               count(*)::int count
        from cross_checks cc
        cross join lateral jsonb_array_elements(
          case when jsonb_typeof(cc.disagreement) = 'array' then cc.disagreement else '[]'::jsonb end
        ) item
        where not cc.agrees
        group by 1, 2 order by count(*) desc limit 10`),

      this.pool.query(`
        select prompt_version, model, sample_size, point_agreement_pct,
               false_positive_pct, false_negative_pct, computed_at
        from grading_evaluations order by computed_at desc limit 10`),

      this.pool.query(`
        select count(*)::int n from grading_points where teacher_matched is not null`),

      this.pool.query(`
        select purpose, prompt_version, count(*)::int calls, count(*) filter (where not ok)::int failed
        from ai_calls where prompt_version is not null
        group by purpose, prompt_version order by count(*) desc limit 20`),
    ]);

    const e = extraction.rows[0]!;
    const c = crossChecks.rows[0]!;
    const crossTotal = Number(c.total);

    return {
      extraction: {
        meanConfidence: e.mean_confidence === null ? null : Number(e.mean_confidence),
        lowConfidence: Number(e.low_confidence),
        total: Number(e.total),
        crossChecks: {
          total: crossTotal,
          agreed: Number(c.agreed),
          disagreed: Number(c.disagreed),
          agreementPct: crossTotal ? Math.round((Number(c.agreed) / crossTotal) * 100) : null,
        },
        disagreements: disagreements.rows.map((row) => ({
          field: String(row.field ?? 'unknown'),
          severity: String(row.severity),
          count: Number(row.count),
        })),
      },
      grading: {
        evaluations: evaluations.rows.map((row) => ({
          promptVersion: String(row.prompt_version),
          model: String(row.model),
          sampleSize: Number(row.sample_size),
          pointAgreementPct: row.point_agreement_pct === null ? null : Number(row.point_agreement_pct),
          falsePositivePct: row.false_positive_pct === null ? null : Number(row.false_positive_pct),
          falseNegativePct: row.false_negative_pct === null ? null : Number(row.false_negative_pct),
          computedAt: String(row.computed_at),
        })),
        teacherCheckedPoints: Number(checked.rows[0]!.n),
      },
      promptVersions: prompts.rows.map((row) => ({
        purpose: String(row.purpose),
        promptVersion: String(row.prompt_version),
        calls: Number(row.calls),
        failed: Number(row.failed),
      })),
    };
  }
}
