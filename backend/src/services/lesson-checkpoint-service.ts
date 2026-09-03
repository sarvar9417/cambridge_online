import type { Pool } from 'pg';

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
};

export class LessonCheckpointService {
  constructor(private readonly pool: Pool) {}

  async list(
    learningObjectiveCodes: string[],
    yearFrom = 2021,
    yearTo = 2025,
    syllabusCode: '9618' | '0478' = '9618',
  ) {
    const result = await this.pool.query(
      `select
         q.id,
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
       left join questions parent on parent.id=q.parent_id
       where q.marks is not null
         and q.status='approved'
         and syllabus.code=$4
         and sp.year between $2 and $3
         and lo.code=any($1::text[])
       group by q.id,parent.id,sp.year,sp.series,sp.variant,component.number
       order by sp.year,sp.series,component.number,sp.variant,q.sort_order,q.display_ref`,
      [learningObjectiveCodes, yearFrom, yearTo, syllabusCode],
    );

    return {
      data: result.rows.map((row) => ({
        id: String(row.id),
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
      })) satisfies LessonCheckpointQuestion[],
      learningObjectiveCodes,
      syllabusCode,
      yearFrom,
      yearTo,
    };
  }
}
