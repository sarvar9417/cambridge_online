import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export interface OverviewBlocker {
  code: string;
  /** What stopped, in the operator's terms. */
  title: string;
  detail: string;
}

export interface Overview {
  waiting: { pendingUsers: number; reviewQueue: number; openAppeals: number };
  corpus: {
    ingestedPapers: number;
    totalPapers: number;
    questions: number;
    markSchemes: number;
    markPoints: number;
    recent: Array<{ label: string; questions: number; marks: number; status: string }>;
  };
  syllabus: { topics: number; subtopics: number; objectives: number; coverage: Array<{ band: string; percent: number; subtopics: number }> };
  spend: { monthUsd: number; calls: number; unpriced: number };
  blockers: OverviewBlocker[];
}

/**
 * Everything the Umumiy holat screen shows, in one request.
 *
 * One endpoint rather than eight, because the screen is worthless half-loaded:
 * a dashboard that fills in over four seconds is read as broken. The figures are
 * cheap counts and they are always fetched together.
 *
 * Owner only. It aggregates across every school and every paper, which is the
 * platform operator's view, not a teacher's.
 */
export class OverviewService {
  constructor(private readonly pool: Pool) {}

  async load(actor: Actor): Promise<Overview> {
    if (actor.role !== 'owner') throw new DomainError('owners_only', 403);

    const [waiting, corpus, recent, syllabus, coverage, spend, stalled] = await Promise.all([
      this.pool.query(`
        select
          (select count(*) from users where status = 'pending' and is_active) pending_users,
          (select count(*) from questions where status = 'needs_review') review_queue,
          (select count(*) from grading_appeals where status = 'open') open_appeals`),

      this.pool.query(`
        select
          (select count(distinct q.source_paper_id) from questions q) ingested_papers,
          (select count(*) from source_papers where kind = 'QP') total_papers,
          (select count(*) from questions) questions,
          (select count(*) from mark_schemes) mark_schemes,
          (select count(*) from mark_scheme_points) mark_points`),

      // The papers the operator most recently touched, ingested or not, so a
      // run that stopped is visible next to the ones that finished.
      this.pool.query(`
        select sp.year, sp.series::text series, sp.variant,
               count(q.id)::int questions,
               coalesce(sum(q.marks), 0)::int marks,
               count(*) filter (where q.status = 'needs_review')::int needs_review
        from source_papers sp
        left join questions q on q.source_paper_id = sp.id
        where sp.kind = 'QP'
        group by sp.id, sp.year, sp.series, sp.variant
        having count(q.id) > 0
        order by max(q.created_at) desc nulls last
        limit 5`),

      this.pool.query(`
        select
          (select count(*) from topics t join syllabi s on s.id = t.syllabus_id where s.is_active) topics,
          (select count(*) from subtopics st join topics t on t.id = st.topic_id
             join syllabi s on s.id = t.syllabus_id where s.is_active) subtopics,
          (select count(*) from learning_objectives lo join subtopics st on st.id = lo.subtopic_id
             join topics t on t.id = st.topic_id join syllabi s on s.id = t.syllabus_id
             where s.is_active) objectives`),

      /*
       * Coverage is "how many of this band's subtopics have at least one
       * question", four topics to a row so twenty fit a card.
       *
       * Matched on subtopic *code*, not id. The database holds three 9618
       * versions -- 2021-2023, 2024-2025 and the active 2026-2028 -- and every
       * classified question so far hangs off one of the older two. Joining on id
       * against the active version reported 0% across the board, which read as
       * "nothing is classified" when in fact 84 questions are. Subtopic 1.1 is
       * 1.1 in any version, so the code is what the reader means.
       */
      this.pool.query(`
        with active_subtopics as (
          select st.code, t.number topic_number
          from subtopics st
          join topics t on t.id = st.topic_id
          join syllabi s on s.id = t.syllabus_id and s.is_active
        ),
        covered as (
          select distinct st.code
          from question_subtopics qs
          join subtopics st on st.id = qs.subtopic_id
        )
        select case
                 when topic_number between 1 and 4 then '1–4'
                 when topic_number between 5 and 8 then '5–8'
                 when topic_number between 9 and 12 then '9–12'
                 when topic_number between 13 and 16 then '13–16'
                 else '17–20'
               end band,
               round(count(*) filter (where code in (select code from covered)) * 100.0
                     / nullif(count(*), 0))::int percent,
               count(*)::int subtopics
        from active_subtopics
        group by 1
        order by min(topic_number)`),

      this.pool.query(`
        select coalesce(round(sum(cost_usd)::numeric, 4), 0) month_usd,
               count(*)::int calls,
               count(*) filter (where cost_usd is null)::int unpriced
        from ai_calls
        where created_at >= date_trunc('month', now())`),

      // A run left in 'failed' is the single thing most likely to be blocking
      // the corpus, and it names the stage it died at.
      this.pool.query(`
        select ir.year, ir.series::text series, ir.variant, j.kind stage, j.error
        from ingestion_runs ir
        left join jobs j on j.ref_table = 'ingestion_runs' and j.ref_id = ir.id and j.status = 'failed'
        where ir.status = 'failed'
        order by ir.updated_at desc
        limit 1`),
    ]);

    const w = waiting.rows[0]!;
    const c = corpus.rows[0]!;
    const s = syllabus.rows[0]!;
    const p = spend.rows[0]!;

    const blockers: OverviewBlocker[] = [];
    const stop = stalled.rows[0];
    if (stop) {
      blockers.push({
        code: 'ingestion_stalled',
        title: 'Korpus to‘ldirish to‘xtagan',
        detail: `${stop.year} ${stop.series} ${stop.variant}${stop.stage ? ` — ${String(stop.stage).replace('ingest-', '')}` : ''}`
          + (stop.error ? `: ${String(stop.error).slice(0, 160)}` : ''),
      });
    }
    if (Number(p.unpriced) > 0) {
      blockers.push({
        code: 'unpriced_model',
        title: 'AI xarajati to‘liq hisoblanmayapti',
        detail: `${p.unpriced} ta chaqiruvning narxi noma’lum — model narx jadvalida yo‘q.`,
      });
    }

    return {
      waiting: {
        pendingUsers: Number(w.pending_users),
        reviewQueue: Number(w.review_queue),
        openAppeals: Number(w.open_appeals),
      },
      corpus: {
        ingestedPapers: Number(c.ingested_papers),
        totalPapers: Number(c.total_papers),
        questions: Number(c.questions),
        markSchemes: Number(c.mark_schemes),
        markPoints: Number(c.mark_points),
        recent: recent.rows.map((row) => ({
          label: `${row.year} ${row.series} ${row.variant}`,
          questions: Number(row.questions),
          marks: Number(row.marks),
          status: Number(row.needs_review) > 0 ? 'needs_review' : 'reviewed',
        })),
      },
      syllabus: {
        topics: Number(s.topics),
        subtopics: Number(s.subtopics),
        objectives: Number(s.objectives),
        coverage: coverage.rows.map((row) => ({
          band: String(row.band),
          percent: Number(row.percent ?? 0),
          subtopics: Number(row.subtopics ?? 0),
        })),
      },
      spend: { monthUsd: Number(p.month_usd), calls: Number(p.calls), unpriced: Number(p.unpriced) },
      blockers,
    };
  }
}
