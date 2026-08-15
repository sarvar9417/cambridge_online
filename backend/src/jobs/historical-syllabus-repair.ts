import type { Pool, PoolClient } from 'pg';

export const HISTORICAL_WINDOWS = [
  { versionLabel: '2021-2023', validFrom: 2021, validTo: 2023 },
  { versionLabel: '2024-2025', validFrom: 2024, validTo: 2025 },
] as const;
export const CURRENT_VERSION_LABEL = '2026-2028';

type Window = (typeof HISTORICAL_WINDOWS)[number];
export interface VersionRow {
  id: string;
  versionLabel: string;
  validFrom: number;
  validTo: number;
  components: number;
  topics: number;
  subtopics: number;
  learningObjectives: number;
}
export interface HistoricalRepairPlan {
  current: VersionRow | null;
  historical: VersionRow[];
  sourcePapersByVersion: Array<{ year: number; versionLabel: string; count: number }>;
  affectedSourcePapers: number;
  affectedQuestions: number;
  affectedSubtopicLinks: number;
  affectedLearningObjectiveLinks: number;
  blockers: string[];
}

export function historicalWindowForYear(year: number): Window | null {
  return HISTORICAL_WINDOWS.find((window) => year >= window.validFrom && year <= window.validTo) ?? null;
}

export function validateRepairPlan(plan: HistoricalRepairPlan, options: { requireHistorical?: boolean; allowDropLearningObjectiveLinks?: boolean } = {}) {
  const blockers = [...plan.blockers];
  if (!plan.current) blockers.push('current_2026_2028_syllabus_missing');
  if (options.requireHistorical) {
    for (const expected of HISTORICAL_WINDOWS) {
      const row = plan.historical.find((item) => item.versionLabel === expected.versionLabel);
      if (!row) blockers.push(`historical_syllabus_missing:${expected.versionLabel}`);
      else if (row.validFrom !== expected.validFrom || row.validTo !== expected.validTo) blockers.push(`historical_syllabus_window_mismatch:${expected.versionLabel}`);
      else if (row.components !== 4 || row.topics !== 20 || row.subtopics !== 44 || row.learningObjectives <= 0) blockers.push(`historical_syllabus_incomplete:${expected.versionLabel}`);
    }
  }
  if (plan.affectedLearningObjectiveLinks > 0 && !options.allowDropLearningObjectiveLinks) {
    blockers.push(`historical_lo_links_require_reclassification:${plan.affectedLearningObjectiveLinks}`);
  }
  return [...new Set(blockers)];
}

export async function loadHistoricalRepairPlan(pool: Pool): Promise<HistoricalRepairPlan> {
  const versions = await pool.query(`
    select s.id,s.version_label,s.valid_from,s.valid_to,
      (select count(*)::int from components c where c.syllabus_id=s.id) components,
      (select count(*)::int from topics t where t.syllabus_id=s.id) topics,
      (select count(*)::int from subtopics st join topics t on t.id=st.topic_id where t.syllabus_id=s.id) subtopics,
      (select count(*)::int from learning_objectives lo join subtopics st on st.id=lo.subtopic_id join topics t on t.id=st.topic_id where t.syllabus_id=s.id) learning_objectives
    from syllabi s where s.code='9618' order by s.valid_from,s.valid_to,s.version_label`);
  const rows: VersionRow[] = versions.rows.map((row) => ({
    id: String(row.id), versionLabel: String(row.version_label), validFrom: Number(row.valid_from), validTo: Number(row.valid_to),
    components: Number(row.components), topics: Number(row.topics), subtopics: Number(row.subtopics), learningObjectives: Number(row.learning_objectives),
  }));
  const currentMatches = rows.filter((row) => row.versionLabel === CURRENT_VERSION_LABEL);
  const current = currentMatches.length === 1 ? currentMatches[0]! : null;
  const historical = rows.filter((row) => HISTORICAL_WINDOWS.some((window) => window.versionLabel === row.versionLabel));
  const sourceCounts = await pool.query(`
    select sp.year,s.version_label,count(*)::int n
    from source_papers sp join syllabi s on s.id=sp.syllabus_id
    where s.code='9618' and sp.year between 2021 and 2025
    group by sp.year,s.version_label order by sp.year,s.version_label`);
  const affected = await pool.query(`
    with affected_questions as (
      select q.id from questions q
      join source_papers sp on sp.id=q.source_paper_id
      join syllabi s on s.id=sp.syllabus_id
      where s.code='9618' and s.version_label=$1 and sp.year between 2021 and 2025
    )
    select
      (select count(*)::int from source_papers sp join syllabi s on s.id=sp.syllabus_id where s.code='9618' and s.version_label=$1 and sp.year between 2021 and 2025) source_papers,
      (select count(*)::int from affected_questions) questions,
      (select count(*)::int from question_subtopics qs join affected_questions aq on aq.id=qs.question_id) subtopic_links,
      (select count(*)::int from question_learning_objectives qlo join affected_questions aq on aq.id=qlo.question_id) lo_links`,
    [CURRENT_VERSION_LABEL],
  );
  const blockers: string[] = [];
  if (currentMatches.length !== 1) blockers.push(`current_2026_2028_syllabus_count:${currentMatches.length}`);
  if (current && current.validTo !== 2028) blockers.push(`current_2026_2028_valid_to:${current.validTo}`);
  const a = affected.rows[0] ?? {};
  return {
    current, historical,
    sourcePapersByVersion: sourceCounts.rows.map((row) => ({ year: Number(row.year), versionLabel: String(row.version_label), count: Number(row.n) })),
    affectedSourcePapers: Number(a.source_papers ?? 0), affectedQuestions: Number(a.questions ?? 0),
    affectedSubtopicLinks: Number(a.subtopic_links ?? 0), affectedLearningObjectiveLinks: Number(a.lo_links ?? 0), blockers,
  };
}

/**
 * Restores the artificial 2021 start on the 2026-2028 row before historical
 * catalogs are imported. Existing source-paper FKs remain valid; staging new
 * historical papers fails closed until the two historical catalogs exist.
 */
export async function prepareHistoricalSyllabusWindow(pool: Pool) {
  const plan = await loadHistoricalRepairPlan(pool);
  const blockers = validateRepairPlan(plan);
  if (blockers.length) throw new Error(`historical_syllabus_prepare_blocked:${blockers.join(',')}`);
  const current = plan.current!;
  if (current.validFrom === 2026) return { changed: false, syllabusId: current.id, validFrom: 2026 };
  if (current.validFrom !== 2021) throw new Error(`historical_syllabus_unexpected_current_window:${current.validFrom}-${current.validTo}`);
  const result = await pool.query(`update syllabi set valid_from=2026 where id=$1 and valid_from=2021 and valid_to=2028 returning id`, [current.id]);
  if (result.rowCount !== 1) throw new Error('historical_syllabus_prepare_concurrent_change');
  return { changed: true, syllabusId: current.id, validFrom: 2026 };
}

export async function remapHistoricalSyllabusSources(pool: Pool, options: { allowDropLearningObjectiveLinks?: boolean } = {}) {
  const before = await loadHistoricalRepairPlan(pool);
  const blockers = validateRepairPlan(before, { requireHistorical: true, allowDropLearningObjectiveLinks: options.allowDropLearningObjectiveLinks });
  if (blockers.length) throw new Error(`historical_syllabus_remap_blocked:${blockers.join(',')}`);
  const currentId = before.current!.id;
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(`select id from syllabi where code='9618' for update`);
    let movedSources = 0;
    let remappedSubtopicLinks = 0;
    let droppedLearningObjectiveLinks = 0;
    for (const window of HISTORICAL_WINDOWS) {
      const target = before.historical.find((row) => row.versionLabel === window.versionLabel)!;
      await assertTargetCatalog(client, target.id, window);
      const moved = await client.query(`
        update source_papers sp set syllabus_id=$2,component_id=target_component.id
        from components old_component,components target_component
        where sp.syllabus_id=$1 and sp.year between $3 and $4
          and old_component.id=sp.component_id
          and target_component.syllabus_id=$2 and target_component.number=old_component.number
        returning sp.id`, [currentId, target.id, window.validFrom, window.validTo]);
      movedSources += moved.rowCount ?? 0;

      await client.query(`
        update questions q set component_id=sp.component_id
        from source_papers sp
        where q.source_paper_id=sp.id and sp.syllabus_id=$1 and sp.year between $2 and $3
          and q.component_id is distinct from sp.component_id`, [target.id, window.validFrom, window.validTo]);

      const inserted = await client.query(`
        insert into question_subtopics(question_id,subtopic_id,is_primary,weight,confidence,set_by)
        select qs.question_id,target_st.id,qs.is_primary,qs.weight,qs.confidence,qs.set_by
        from question_subtopics qs
        join questions q on q.id=qs.question_id
        join source_papers sp on sp.id=q.source_paper_id and sp.syllabus_id=$2 and sp.year between $3 and $4
        join subtopics old_st on old_st.id=qs.subtopic_id
        join topics old_t on old_t.id=old_st.topic_id and old_t.syllabus_id=$1
        join subtopics target_st on target_st.code=old_st.code
        join topics target_t on target_t.id=target_st.topic_id and target_t.syllabus_id=$2
        on conflict(question_id,subtopic_id) do update set
          is_primary=excluded.is_primary,weight=excluded.weight,confidence=excluded.confidence,set_by=excluded.set_by
        returning question_id`, [currentId, target.id, window.validFrom, window.validTo]);
      remappedSubtopicLinks += inserted.rowCount ?? 0;
      await client.query(`
        delete from question_subtopics qs using questions q,source_papers sp,subtopics st,topics t
        where qs.question_id=q.id and q.source_paper_id=sp.id and sp.syllabus_id=$2 and sp.year between $3 and $4
          and qs.subtopic_id=st.id and st.topic_id=t.id and t.syllabus_id=$1`, [currentId, target.id, window.validFrom, window.validTo]);
    }

    const oldLoLinks = await client.query(`
      select qlo.question_id from question_learning_objectives qlo
      join questions q on q.id=qlo.question_id
      join source_papers sp on sp.id=q.source_paper_id
      join learning_objectives lo on lo.id=qlo.lo_id
      join subtopics st on st.id=lo.subtopic_id join topics t on t.id=st.topic_id
      where sp.year between 2021 and 2025 and t.syllabus_id=$1`, [currentId]);
    if ((oldLoLinks.rowCount ?? 0) > 0) {
      if (!options.allowDropLearningObjectiveLinks) throw new Error(`historical_lo_links_require_reclassification:${oldLoLinks.rowCount}`);
      const deleted = await client.query(`
        delete from question_learning_objectives qlo using questions q,source_papers sp,learning_objectives lo,subtopics st,topics t
        where qlo.question_id=q.id and q.source_paper_id=sp.id and sp.year between 2021 and 2025
          and qlo.lo_id=lo.id and lo.subtopic_id=st.id and st.topic_id=t.id and t.syllabus_id=$1
        returning qlo.question_id`, [currentId]);
      droppedLearningObjectiveLinks = deleted.rowCount ?? 0;
      await client.query(`
        update questions q set status='needs_review',notes=concat_ws(E'\n',nullif(q.notes,''),'Historical syllabus repair removed non-portable learning-objective links; reclassification required.'),updated_at=now()
        from source_papers sp where q.source_paper_id=sp.id and sp.year between 2021 and 2025
          and q.id=any($1::uuid[])`, [oldLoLinks.rows.map((row) => String(row.question_id))]);
    }

    await client.query(`update syllabi set valid_from=2026 where id=$1 and valid_from<2026`, [currentId]);
    await assertRepairResult(client, currentId);
    await client.query('commit');
    return { movedSources, remappedSubtopicLinks, droppedLearningObjectiveLinks };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function assertTargetCatalog(client: PoolClient, syllabusId: string, window: Window) {
  const result = await client.query(`
    select s.version_label,s.valid_from,s.valid_to,
      (select count(*)::int from components c where c.syllabus_id=s.id) components,
      (select count(*)::int from topics t where t.syllabus_id=s.id) topics,
      (select count(*)::int from subtopics st join topics t on t.id=st.topic_id where t.syllabus_id=s.id) subtopics
    from syllabi s where s.id=$1`, [syllabusId]);
  const row = result.rows[0];
  if (!row || String(row.version_label) !== window.versionLabel || Number(row.valid_from) !== window.validFrom || Number(row.valid_to) !== window.validTo || Number(row.components) !== 4 || Number(row.topics) !== 20 || Number(row.subtopics) !== 44) {
    throw new Error(`historical_syllabus_target_invalid:${window.versionLabel}`);
  }
}

async function assertRepairResult(client: PoolClient, currentId: string) {
  const badSources = await client.query(`select count(*)::int n from source_papers where syllabus_id=$1 and year between 2021 and 2025`, [currentId]);
  if (Number(badSources.rows[0]?.n ?? 0) !== 0) throw new Error(`historical_syllabus_sources_still_current:${badSources.rows[0]?.n}`);
  const crossSubtopics = await client.query(`
    select count(*)::int n from question_subtopics qs
    join questions q on q.id=qs.question_id join source_papers sp on sp.id=q.source_paper_id
    join subtopics st on st.id=qs.subtopic_id join topics t on t.id=st.topic_id
    where sp.year between 2021 and 2025 and t.syllabus_id<>sp.syllabus_id`);
  if (Number(crossSubtopics.rows[0]?.n ?? 0) !== 0) throw new Error(`historical_syllabus_cross_version_subtopics:${crossSubtopics.rows[0]?.n}`);
  const componentMismatch = await client.query(`
    select count(*)::int n from questions q join source_papers sp on sp.id=q.source_paper_id
    where sp.year between 2021 and 2025 and q.component_id<>sp.component_id`);
  if (Number(componentMismatch.rows[0]?.n ?? 0) !== 0) throw new Error(`historical_syllabus_component_mismatch:${componentMismatch.rows[0]?.n}`);
}
