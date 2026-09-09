import type { Pool } from 'pg';
import type { AssetUrlSigner } from '../jobs/asset-store.js';

export type LessonCheckpointAsset = {
  id: string;
  kind: string;
  url: string | null;
  contentMd: string | null;
  altText: string;
  sourcePage: number | null;
};

export type LessonCheckpointContextBlock = {
  id: string;
  displayRef: string;
  contextMd: string | null;
  assets: LessonCheckpointAsset[];
};

export type LessonCheckpointDependency = {
  id: string;
  displayRef: string;
  stem: string;
  contextMd: string | null;
  assets: LessonCheckpointAsset[];
};

export type LessonCheckpointMarkPoint = {
  code: string;
  text: string;
  marks: number;
};

export type LessonCheckpointQuestion = {
  id: string;
  displayRef: string;
  stem: string;
  contextMd: string | null;
  commandWord: string | null;
  marks: number;
  year: number;
  series: string;
  variant: number;
  component: number;
  hasDiagram: boolean;
  hasDependency: boolean;
  matchedLearningObjectiveCodes: string[];
  contextBlocks: LessonCheckpointContextBlock[];
  dependencies: LessonCheckpointDependency[];
  markSchemePoints: LessonCheckpointMarkPoint[];
};

type AssetRow = {
  id: string;
  question_id: string;
  kind: string;
  storage_path: string | null;
  content_md: string | null;
  alt_text: string | null;
  source_page: number | null;
};

export class LessonCheckpointService {
  constructor(
    private readonly pool: Pool,
    private readonly assetUrlSigner?: AssetUrlSigner,
  ) {}

  private async materializeAsset(row: AssetRow): Promise<LessonCheckpointAsset> {
    const url = row.storage_path && this.assetUrlSigner
      ? await this.assetUrlSigner.signStoragePath(row.storage_path, 300)
      : null;
    return {
      id: String(row.id),
      kind: String(row.kind),
      url,
      contentMd: row.content_md ? String(row.content_md) : null,
      altText: row.alt_text ? String(row.alt_text) : '',
      sourcePage: row.source_page == null ? null : Number(row.source_page),
    };
  }

  async list(
    learningObjectiveCodes: string[],
    yearFrom = 2021,
    yearTo = 2026,
    syllabusCode: '9618' | '0478' = '9618',
  ) {
    const result = await this.pool.query(
      `with requested_lo as (
         select distinct lo.id,lo.code
         from learning_objectives lo
         join subtopics st on st.id=lo.subtopic_id
         join topics t on t.id=st.topic_id
         join syllabi target_syllabus on target_syllabus.id=t.syllabus_id
         where target_syllabus.code=$4
           and target_syllabus.valid_from <= $3
           and target_syllabus.valid_to >= $3
           and lo.code=any($1::text[])
       ), eligible_lo as (
         select id,code from requested_lo
         union
         select distinct source_lo.id,source_lo.code
         from learning_objective_compatibility compat
         join requested_lo target_lo on target_lo.id=compat.target_lo_id
         join learning_objectives source_lo on source_lo.id=compat.source_lo_id
         join subtopics source_st on source_st.id=source_lo.subtopic_id
         join topics source_t on source_t.id=source_st.topic_id
         join syllabi source_syllabus on source_syllabus.id=source_t.syllabus_id
         where compat.relation in('equivalent','subtopic_compatible')
           and source_syllabus.code=$4
       )
       select
         q.id,
         q.parent_id,
         q.display_ref,
         coalesce(q.stem_md,'') stem,
         coalesce(nullif(q.context_md,''),nullif(parent.context_md,'')) context_md,
         q.command_word,
         q.marks,
         sp.year,
         sp.series,
         sp.variant,
         component.number component,
         array_agg(distinct lo.code order by lo.code) matched_lo_codes,
         coalesce((
           select json_agg(json_build_object(
             'code',msp.code,
             'text',msp.text,
             'marks',msp.marks
           ) order by msp.sort_order,msp.code)
           from mark_schemes ms
           join mark_scheme_points msp on msp.mark_scheme_id=ms.id
           where ms.question_id=q.id and ms.status='approved'
         ),'[]'::json) mark_scheme_points,
         exists(
           select 1
           from question_assets qa
           where qa.question_id in (q.id,parent.id)
             and qa.kind in ('diagram','image')
         ) has_diagram,
         exists(
           select 1 from question_dependencies qd where qd.question_id=q.id
         ) has_dependency
       from questions q
       join source_papers sp on sp.id=q.source_paper_id
       join syllabi syllabus on syllabus.id=sp.syllabus_id
       join components component on component.id=q.component_id
       join question_learning_objectives qlo on qlo.question_id=q.id
       join learning_objectives lo on lo.id=qlo.lo_id
       join eligible_lo eligible on eligible.id=lo.id
       left join questions parent on parent.id=q.parent_id
       where q.marks is not null
         and q.status='approved'
         and syllabus.code=$4
         and sp.year between $2 and $3
       group by q.id,parent.id,sp.year,sp.series,sp.variant,component.number
       order by sp.year,sp.series,component.number,sp.variant,q.sort_order,q.display_ref`,
      [learningObjectiveCodes, yearFrom, yearTo, syllabusCode],
    );

    const questionIds = result.rows.map((row) => String(row.id));
    if (!questionIds.length) {
      return { data: [] as LessonCheckpointQuestion[], learningObjectiveCodes, syllabusCode, yearFrom, yearTo };
    }

    const chainResult = await this.pool.query(
      `with recursive chain as (
         select q.id leaf_id,q.id,q.parent_id,q.display_ref,q.context_md,q.depth
         from questions q
         where q.id=any($1::uuid[])
         union all
         select chain.leaf_id,parent.id,parent.parent_id,parent.display_ref,parent.context_md,parent.depth
         from chain
         join questions parent on parent.id=chain.parent_id
       )
       select leaf_id,id,parent_id,display_ref,context_md,depth
       from chain
       order by leaf_id,depth,id`,
      [questionIds],
    );

    const dependencyResult = await this.pool.query(
      `select qd.question_id,qd.depends_on_id,target.display_ref,
         coalesce(target.stem_md,'') stem,target.context_md
       from question_dependencies qd
       join questions target on target.id=qd.depends_on_id
       where qd.question_id=any($1::uuid[])
       order by qd.question_id,target.sort_order,target.id`,
      [questionIds],
    );

    const assetQuestionIds = [...new Set([
      ...chainResult.rows.map((row) => String(row.id)),
      ...dependencyResult.rows.map((row) => String(row.depends_on_id)),
    ])];
    const assetResult = assetQuestionIds.length
      ? await this.pool.query(
        `select id,question_id,kind,storage_path,
           coalesce(svg_markup,content_md) content_md,alt_text,source_page
         from question_assets
         where question_id=any($1::uuid[])
         order by question_id,sort_order,id`,
        [assetQuestionIds],
      )
      : { rows: [] as AssetRow[] };

    const materializedAssets = await Promise.all(
      (assetResult.rows as AssetRow[]).map(async (row) => ({
        questionId: String(row.question_id),
        asset: await this.materializeAsset(row),
      })),
    );
    const assetsByQuestion = new Map<string, LessonCheckpointAsset[]>();
    for (const item of materializedAssets) {
      const list = assetsByQuestion.get(item.questionId) ?? [];
      list.push(item.asset);
      assetsByQuestion.set(item.questionId, list);
    }

    const chainByLeaf = new Map<string, typeof chainResult.rows>();
    for (const row of chainResult.rows) {
      const leafId = String(row.leaf_id);
      const list = chainByLeaf.get(leafId) ?? [];
      list.push(row);
      chainByLeaf.set(leafId, list);
    }
    const dependenciesByQuestion = new Map<string, typeof dependencyResult.rows>();
    for (const row of dependencyResult.rows) {
      const questionId = String(row.question_id);
      const list = dependenciesByQuestion.get(questionId) ?? [];
      list.push(row);
      dependenciesByQuestion.set(questionId, list);
    }

    return {
      data: result.rows.map((row) => {
        const id = String(row.id);
        const contextBlocks = (chainByLeaf.get(id) ?? [])
          .map((item) => ({
            id: String(item.id),
            displayRef: String(item.display_ref),
            contextMd: item.context_md ? String(item.context_md) : null,
            assets: assetsByQuestion.get(String(item.id)) ?? [],
          }))
          .filter((item) => Boolean(item.contextMd) || item.assets.length > 0);
        const dependencies = (dependenciesByQuestion.get(id) ?? []).map((item) => ({
          id: String(item.depends_on_id),
          displayRef: String(item.display_ref),
          stem: String(item.stem ?? ''),
          contextMd: item.context_md ? String(item.context_md) : null,
          assets: assetsByQuestion.get(String(item.depends_on_id)) ?? [],
        }));
        return {
          id,
          displayRef: String(row.display_ref),
          stem: String(row.stem ?? ''),
          contextMd: row.context_md ? String(row.context_md) : null,
          commandWord: row.command_word ? String(row.command_word) : null,
          marks: Number(row.marks),
          year: Number(row.year),
          series: String(row.series),
          variant: Number(row.variant),
          component: Number(row.component),
          hasDiagram: Boolean(row.has_diagram),
          hasDependency: Boolean(row.has_dependency),
          matchedLearningObjectiveCodes: (row.matched_lo_codes ?? []).map(String),
          contextBlocks,
          dependencies,
          markSchemePoints: (row.mark_scheme_points ?? []).map((point: { code?:unknown;text?:unknown;marks?:unknown }) => ({
            code:String(point.code ?? ''),
            text:String(point.text ?? ''),
            marks:Number(point.marks ?? 1),
          })),
        } satisfies LessonCheckpointQuestion;
      }),
      learningObjectiveCodes,
      syllabusCode,
      yearFrom,
      yearTo,
    };
  }
}
