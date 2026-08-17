import type { Pool } from '../database/client.js';

export type TaxonomyIssueType =
  | 'missing_subtopic'
  | 'bad_primary_count'
  | 'cross_version_subtopic'
  | 'out_of_component_subtopic'
  | 'cross_version_lo'
  | 'out_of_component_lo'
  | 'lo_without_selected_subtopic'
  | 'low_confidence_not_needs_review'
  | 'identical_source_variant_conflict';

export type TaxonomyIssue = {
  issue: TaxonomyIssueType;
  questionId: string;
  displayRef: string;
  detail: string;
};

export type TaxonomyAudit = {
  ok: boolean;
  totalIssues: number;
  counts: Record<TaxonomyIssueType, number>;
  issues: TaxonomyIssue[];
};

const ISSUE_TYPES: TaxonomyIssueType[] = [
  'missing_subtopic',
  'bad_primary_count',
  'cross_version_subtopic',
  'out_of_component_subtopic',
  'cross_version_lo',
  'out_of_component_lo',
  'lo_without_selected_subtopic',
  'low_confidence_not_needs_review',
  'identical_source_variant_conflict',
];

/**
 * Structural and conservative semantic gate for the real imported corpus only.
 *
 * `source_url IS NOT NULL` is the durable boundary between source-backed
 * Cambridge papers and the Phase-0 synthetic seed paper. The seed remains
 * referenced by demo assignments/answers and must not block real-corpus checks.
 *
 * Low-confidence primary mappings are allowed only while the question remains
 * `needs_review`. Variant consistency is checked only when the published source
 * stem AND mark-scheme guidance are identical; question numbers alone are not a
 * semantic identity key because Cambridge variants can contain different content.
 */
export async function runQuestionTaxonomyAudit(pool: Pool): Promise<TaxonomyAudit> {
  const result = await pool.query<{
    issue: TaxonomyIssueType;
    question_id: string;
    display_ref: string;
    detail: string;
  }>(`
    with mark_bearing as (
      select q.id, q.display_ref, q.source_paper_id, q.stem_md, q.status
      from questions q
      join source_papers sp0 on sp0.id=q.source_paper_id
      where q.marks is not null
        and q.marks > 0
        and sp0.source_url is not null
    ),
    source_taxonomy as (
      select q.id question_id,
             q.display_ref,
             sp.year,
             sp.series::text series,
             sp.component_id,
             sp.variant,
             md5(trim(coalesce(q.stem_md,'')) || chr(31) || trim(coalesce(ms.guidance_md,''))) source_signature,
             st.code subtopic_code
      from mark_bearing q
      join source_papers sp on sp.id=q.source_paper_id
      join mark_schemes ms on ms.question_id=q.id
      join question_subtopics qs on qs.question_id=q.id and qs.is_primary
      join subtopics st on st.id=qs.subtopic_id
      where trim(coalesce(q.stem_md,''))<>''
        and trim(coalesce(ms.guidance_md,''))<>''
    ),
    identical_source_conflicts as (
      select year,series,component_id,source_signature
      from source_taxonomy
      group by year,series,component_id,source_signature
      having count(distinct variant)>1
         and count(distinct subtopic_code)>1
    ),
    issue_rows as (
      select 'missing_subtopic'::text issue, q.id question_id, q.display_ref,
             'mark-bearing question has no question_subtopics row'::text detail
      from mark_bearing q
      where not exists(select 1 from question_subtopics qs where qs.question_id=q.id)

      union all

      select 'bad_primary_count', q.id, q.display_ref,
             ('primary_count=' || count(*) filter(where qs.is_primary))::text
      from mark_bearing q
      join question_subtopics qs on qs.question_id=q.id
      group by q.id,q.display_ref
      having count(*) filter(where qs.is_primary) <> 1

      union all

      select 'cross_version_subtopic', q.id, q.display_ref,
             ('subtopic=' || st.code || '; source_syllabus=' || sp.syllabus_id || '; mapped_syllabus=' || t.syllabus_id)::text
      from question_subtopics qs
      join mark_bearing q on q.id=qs.question_id
      join source_papers sp on sp.id=q.source_paper_id
      join subtopics st on st.id=qs.subtopic_id
      join topics t on t.id=st.topic_id
      where t.syllabus_id<>sp.syllabus_id

      union all

      select 'out_of_component_subtopic', q.id, q.display_ref,
             ('subtopic=' || st.code || '; component_id=' || sp.component_id)::text
      from question_subtopics qs
      join mark_bearing q on q.id=qs.question_id
      join source_papers sp on sp.id=q.source_paper_id
      join subtopics st on st.id=qs.subtopic_id
      join topics t on t.id=st.topic_id
      where not exists(
        select 1 from component_topics ct
        where ct.component_id=sp.component_id and ct.topic_id=t.id
      )

      union all

      select 'cross_version_lo', q.id, q.display_ref,
             ('lo=' || lo.code || '; source_syllabus=' || sp.syllabus_id || '; mapped_syllabus=' || t.syllabus_id)::text
      from question_learning_objectives ql
      join mark_bearing q on q.id=ql.question_id
      join source_papers sp on sp.id=q.source_paper_id
      join learning_objectives lo on lo.id=ql.lo_id
      join subtopics st on st.id=lo.subtopic_id
      join topics t on t.id=st.topic_id
      where t.syllabus_id<>sp.syllabus_id

      union all

      select 'out_of_component_lo', q.id, q.display_ref,
             ('lo=' || lo.code || '; component_id=' || sp.component_id)::text
      from question_learning_objectives ql
      join mark_bearing q on q.id=ql.question_id
      join source_papers sp on sp.id=q.source_paper_id
      join learning_objectives lo on lo.id=ql.lo_id
      where not exists(
        select 1 from component_learning_objectives clo
        where clo.component_id=sp.component_id and clo.learning_objective_id=lo.id
      )

      union all

      select 'lo_without_selected_subtopic', q.id, q.display_ref,
             ('lo=' || lo.code || '; owning_subtopic=' || st.code)::text
      from question_learning_objectives ql
      join mark_bearing q on q.id=ql.question_id
      join learning_objectives lo on lo.id=ql.lo_id
      join subtopics st on st.id=lo.subtopic_id
      where not exists(
        select 1 from question_subtopics qs
        where qs.question_id=q.id and qs.subtopic_id=st.id
      )

      union all

      select 'low_confidence_not_needs_review', q.id, q.display_ref,
             ('confidence=' || qs.confidence || '; status=' || q.status::text || '; subtopic=' || st.code)::text
      from mark_bearing q
      join question_subtopics qs on qs.question_id=q.id and qs.is_primary
      join subtopics st on st.id=qs.subtopic_id
      where qs.confidence is not null
        and qs.confidence < 0.72
        and q.status::text <> 'needs_review'

      union all

      select 'identical_source_variant_conflict', stx.question_id, stx.display_ref,
             ('year=' || stx.year || '; series=' || stx.series || '; variant=' || stx.variant || '; subtopic=' || stx.subtopic_code || '; identical published stem+guidance maps inconsistently across variants')::text
      from source_taxonomy stx
      join identical_source_conflicts c
        on c.year=stx.year
       and c.series=stx.series
       and c.component_id=stx.component_id
       and c.source_signature=stx.source_signature
    )
    select issue,question_id,display_ref,detail
    from issue_rows
    order by issue,display_ref,question_id
  `);

  const counts = Object.fromEntries(ISSUE_TYPES.map((issue) => [issue, 0])) as Record<TaxonomyIssueType, number>;
  const issues = result.rows.map((row) => {
    counts[row.issue] += 1;
    return {
      issue: row.issue,
      questionId: row.question_id,
      displayRef: row.display_ref,
      detail: row.detail,
    };
  });

  return { ok: issues.length === 0, totalIssues: issues.length, counts, issues };
}
