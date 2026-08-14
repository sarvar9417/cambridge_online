import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Actor } from '@campath/shared';
import type pg from 'pg';
import { DATABASE_POOL } from '../database.module.js';
import type {
  AssetBlock,
  PortableQuestion,
  QuestionBankFilters,
  SelectionItemPortable,
  SelectionRole,
} from './question-bank.types.js';

type Params = unknown[];
const add = (values: Params, value: unknown) => {
  values.push(value);
  return `$${values.length}`;
};

@Injectable()
export class QuestionBankRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: pg.Pool) {}

  async list(actor: Actor, filters: QuestionBankFilters) {
    const values: Params = [actor.role, actor.schoolId, actor.id];
    const conditions = [
      'q.marks is not null',
      `exists(select 1 from classes visible where visible.syllabus_id=sp.syllabus_id and visible.archived_at is null and
        (($1='owner' and visible.school_id=$2)or($1='teacher' and(visible.owner_id=$3 or exists(
          select 1 from class_teachers ct where ct.class_id=visible.id and ct.teacher_id=$3)))))`,
    ];
    if (actor.role !== 'owner') conditions.push("q.status='approved'");
    else if (filters.status) conditions.push(`q.status::text=${add(values, filters.status)}`);
    if (filters.component !== undefined)
      conditions.push(`component.number=${add(values, filters.component)}`);
    if (filters.topicIds.length)
      conditions.push(
        `exists(select 1 from question_subtopics qst join subtopics st on st.id=qst.subtopic_id where qst.question_id=q.id and st.topic_id=any(${add(values, filters.topicIds)}::uuid[]))`,
      );
    if (filters.subtopicIds.length)
      conditions.push(
        `exists(select 1 from question_subtopics qst where qst.question_id=q.id and qst.subtopic_id=any(${add(values, filters.subtopicIds)}::uuid[]))`,
      );
    if (filters.commandWords.length)
      conditions.push(`q.command_word::text=any(${add(values, filters.commandWords)}::text[])`);
    if (filters.marksMin !== undefined)
      conditions.push(`q.marks>=${add(values, filters.marksMin)}`);
    if (filters.marksMax !== undefined)
      conditions.push(`q.marks<=${add(values, filters.marksMax)}`);
    if (filters.aos.length) conditions.push(`q.ao::text=any(${add(values, filters.aos)}::text[])`);
    if (filters.yearFrom !== undefined)
      conditions.push(`sp.year>=${add(values, filters.yearFrom)}`);
    if (filters.yearTo !== undefined) conditions.push(`sp.year<=${add(values, filters.yearTo)}`);
    if (filters.series.length)
      conditions.push(`sp.series::text=any(${add(values, filters.series)}::text[])`);
    if (filters.hasDiagram !== undefined) {
      const predicate = `exists(select 1 from question_assets qa where qa.question_id=q.id and qa.kind in('diagram','image'))`;
      conditions.push(filters.hasDiagram ? predicate : `not ${predicate}`);
    }
    if (filters.q) {
      const parameter = add(values, filters.q);
      conditions.push(
        `to_tsvector('english',coalesce(q.stem_md,q.stem_latex,''))@@plainto_tsquery('english',${parameter})`,
      );
    }
    if (filters.dependency === 'independent')
      conditions.push(
        'not exists(select 1 from question_dependencies qd where qd.question_id=q.id)',
      );

    const limit = add(values, filters.limit);
    const query = `with recursive matching as(
      select q.id,q.parent_id,q.label,q.path,q.display_ref,q.depth,q.sort_order,
        coalesce(q.stem_md,q.stem_latex,'')stem,q.command_word,q.marks,q.ao,q.answer_kind,q.status,
        component.number component,sp.year,sp.series,
        exists(select 1 from question_assets qa where qa.question_id=q.id and qa.kind in('diagram','image'))has_diagram
      from questions q join source_papers sp on sp.id=q.source_paper_id
      join components component on component.id=q.component_id where ${conditions.join(' and ')}
      order by sp.year desc,q.sort_order limit ${limit}
    ), chain as(
      select m.id leaf_id,m.id node_id,m.parent_id,m.display_ref,m.depth from matching m
      union all select c.leaf_id,p.id,p.parent_id,p.display_ref,p.depth from chain c join questions p on p.id=c.parent_id
    ), roots as(select distinct on(leaf_id)leaf_id,node_id root_id,display_ref root_ref from chain order by leaf_id,depth)
    select m.*,r.root_id,r.root_ref,
      coalesce((select jsonb_agg(jsonb_build_object('id',st.id,'code',st.code,'title',st.title)order by st.sort_order)
        from question_subtopics qs join subtopics st on st.id=qs.subtopic_id where qs.question_id=m.id),'[]'::jsonb)subtopics,
      exists(select 1 from question_dependencies qd where qd.question_id=m.id)has_dependency
    from matching m join roots r on r.leaf_id=m.id order by m.sort_order`;
    const result = await this.pool.query(query, values);
    const parts = result.rows.map(mapPart);
    if (filters.view === 'parts')
      return { data: parts, view: 'parts' as const, unavailableFilters: unavailable(filters) };

    const rootIds = [...new Set(parts.map((part) => part.rootId))];
    if (!rootIds.length)
      return { data: [], view: 'families' as const, unavailableFilters: unavailable(filters) };
    const all = await this.pool.query(
      `with recursive descendants as(
         select q.id root_id,q.id,q.parent_id,q.label,q.display_ref,q.depth,q.sort_order,q.marks,
           coalesce(q.stem_md,q.stem_latex,'')stem,q.command_word,q.ao,q.answer_kind,q.status
         from questions q where q.id=any($1::uuid[])
         union all select d.root_id,q.id,q.parent_id,q.label,q.display_ref,q.depth,q.sort_order,q.marks,
           coalesce(q.stem_md,q.stem_latex,'')stem,q.command_word,q.ao,q.answer_kind,q.status
         from descendants d join questions q on q.parent_id=d.id
       )select * from descendants where marks is not null order by root_id,sort_order`,
      [rootIds],
    );
    const matches = new Set(parts.map((part) => part.id));
    return {
      view: 'families' as const,
      unavailableFilters: unavailable(filters),
      data: rootIds.map((rootId) => {
        const matchingParts = parts.filter((part) => part.rootId === rootId);
        const allParts = all.rows
          .filter((row) => row.root_id === rootId)
          .map((row) => ({
            id: row.id,
            label: row.label,
            displayRef: row.display_ref,
            stem: row.stem,
            marks: Number(row.marks),
            commandWord: row.command_word,
            ao: row.ao,
            answerKind: row.answer_kind,
            status: row.status,
            matches: matches.has(row.id),
          }));
        return {
          rootId,
          rootRef: matchingParts[0]!.rootRef,
          matchCount: matchingParts.length,
          totalCount: allParts.length,
          parts: allParts,
        };
      }),
    };
  }

  async filterOptions(actor: Actor) {
    const visible = await this.pool.query(
      `select distinct t.id topic_id,t.number topic_number,t.title topic_title,st.id subtopic_id,st.code,st.title subtopic_title,
        st.sort_order, c.number component from classes cl join topics t on t.syllabus_id=cl.syllabus_id
        join subtopics st on st.topic_id=t.id left join components c on c.id=t.component_id
       where cl.archived_at is null and(($1='owner'and cl.school_id=$2)or($1='teacher'and(cl.owner_id=$3 or exists(
         select 1 from class_teachers ct where ct.class_id=cl.id and ct.teacher_id=$3))))
       order by t.number,st.sort_order`,
      [actor.role, actor.schoolId, actor.id],
    );
    const classes = await this.pool.query(
      `select distinct cl.id,cl.name from classes cl where cl.archived_at is null and
       (($1='owner'and cl.school_id=$2)or($1='teacher'and(cl.owner_id=$3 or exists(
         select 1 from class_teachers ct where ct.class_id=cl.id and ct.teacher_id=$3))))order by cl.name`,
      [actor.role, actor.schoolId, actor.id],
    );
    return { topics: visible.rows, classes: classes.rows };
  }

  async portable(actor: Actor, id: string): Promise<PortableQuestion> {
    const result = await this.pool.query(
      `with recursive chain as(
         select q.* from questions q join source_papers sp on sp.id=q.source_paper_id
         where q.id=$4 and q.marks is not null and exists(select 1 from classes visible
           where visible.syllabus_id=sp.syllabus_id and visible.archived_at is null and
           (($1='owner'and visible.school_id=$2)or($1='teacher'and(visible.owner_id=$3 or exists(
             select 1 from class_teachers ct where ct.class_id=visible.id and ct.teacher_id=$3)))))
         union all select p.* from chain c join questions p on p.id=c.parent_id
       )select c.id,c.parent_id,c.label,c.path,c.display_ref,c.depth,c.marks,c.command_word,c.answer_kind,c.answer_lines,
         coalesce(c.stem_md,c.stem_latex,'')stem,coalesce(c.context_md,c.context_latex)context,
         coalesce((select jsonb_agg(jsonb_build_object('id',qa.id,'kind',qa.kind,'storagePath',qa.storage_path,
           'contentMd',qa.content_md,'altText',qa.alt_text,'sortOrder',qa.sort_order,'svgMarkup',qa.svg_markup)order by qa.sort_order)
           from question_assets qa where qa.question_id=c.id),'[]'::jsonb)assets
       from chain c order by c.depth`,
      [actor.role, actor.schoolId, actor.id, id],
    );
    if (!result.rowCount) throw new NotFoundException('not_found');
    const leaf = result.rows[result.rows.length - 1]!;
    const dependencies = await this.pool.query(
      `select qd.id,qd.question_id,qd.depends_on_id,qd.kind,qd.strength,qd.evidence,
        target.display_ref,coalesce(target.stem_md,target.stem_latex)stem
       from question_dependencies qd join questions target on target.id=qd.depends_on_id
       where qd.question_id=$1 order by target.sort_order`,
      [id],
    );
    return {
      leaf: {
        id: leaf.id,
        rootId: result.rows[0]!.id,
        label: leaf.label,
        path: leaf.path,
        displayRef: leaf.display_ref,
        stem: leaf.stem,
        commandWord: leaf.command_word,
        marks: Number(leaf.marks),
        answerKind: leaf.answer_kind,
        answerLines: leaf.answer_lines,
      },
      chain: result.rows.map((row) => ({ id: row.id, label: row.label, depth: row.depth })),
      contextBlocks: result.rows
        .filter((row) => row.context || row.assets.length)
        .map((row) => ({
          id: row.id,
          label: row.label,
          displayRef: row.display_ref,
          depth: row.depth,
          context: row.context,
          assets: row.assets as AssetBlock[],
        })),
      dependencies: dependencies.rows.map((row) => ({
        id: row.id,
        questionId: row.question_id,
        dependsOnId: row.depends_on_id,
        displayRef: row.display_ref,
        stem: row.stem,
        kind: row.kind,
        strength: row.strength,
        evidence: row.evidence,
      })),
      sourceRef: leaf.display_ref,
    };
  }

  async listSelections(actor: Actor) {
    return (
      await this.pool.query(
        `select s.id,s.name,s.updated_at,count(si.id)::int item_count,
        coalesce(sum(case when si.role='graded'then q.marks else 0 end),0)::int total_marks
       from selections s left join selection_items si on si.selection_id=s.id left join questions q on q.id=si.question_id
       where s.owner_id=$1 and s.school_id=$2 group by s.id order by s.updated_at desc`,
        [actor.id, actor.schoolId],
      )
    ).rows;
  }

  async createSelection(actor: Actor, name: string) {
    if (!actor.schoolId) throw new NotFoundException('not_found');
    return (
      await this.pool.query(
        `insert into selections(school_id,owner_id,name)values($1,$2,$3)returning id,name,created_at,updated_at`,
        [actor.schoolId, actor.id, name],
      )
    ).rows[0];
  }

  async selectionItems(actor: Actor, selectionId: string): Promise<SelectionItemPortable[]> {
    await this.assertSelection(actor, selectionId);
    const rows = (
      await this.pool.query(
        `select si.id,si.question_id,si.role,si.sort_order,si.source_ref from selection_items si
       join selections s on s.id=si.selection_id where s.id=$1 and s.owner_id=$2 and s.school_id=$3
       order by si.sort_order,si.created_at`,
        [selectionId, actor.id, actor.schoolId],
      )
    ).rows;
    return Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        role: row.role,
        sortOrder: row.sort_order,
        sourceRef: row.source_ref,
        portable: await this.portable(actor, row.question_id),
      })),
    );
  }

  async addSelectionItem(
    actor: Actor,
    selectionId: string,
    questionId: string,
    role: SelectionRole,
  ) {
    const portable = await this.portable(actor, questionId);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const basket = await client.query(
        `select id from selections where id=$1 and owner_id=$2 and school_id=$3 for update`,
        [selectionId, actor.id, actor.schoolId],
      );
      if (!basket.rowCount) throw new NotFoundException('not_found');
      const item = await client.query(
        `insert into selection_items(selection_id,question_id,role,sort_order,source_ref)
         values($1,$2,$3,(select coalesce(max(sort_order),0)+1 from selection_items where selection_id=$1),$4)
         on conflict(selection_id,question_id)do update set role=excluded.role returning id,role,sort_order,source_ref`,
        [selectionId, questionId, role, portable.sourceRef],
      );
      await client.query(`update selections set updated_at=now()where id=$1`, [selectionId]);
      await client.query('commit');
      return { item: item.rows[0], portable, dependencies: portable.dependencies };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateSelectionItem(
    actor: Actor,
    selectionId: string,
    itemId: string,
    role: SelectionRole,
  ) {
    await this.assertSelection(actor, selectionId);
    const result = await this.pool.query(
      `update selection_items si set role=$4 from selections s where si.id=$1 and si.selection_id=$2
       and s.id=si.selection_id and s.owner_id=$3 and s.school_id=$5 returning si.id,si.role`,
      [itemId, selectionId, actor.id, role, actor.schoolId],
    );
    if (!result.rowCount) throw new NotFoundException('not_found');
    return result.rows[0];
  }

  async removeSelectionItem(actor: Actor, selectionId: string, itemId: string) {
    await this.assertSelection(actor, selectionId);
    const result = await this.pool.query(
      `delete from selection_items si using selections s where si.id=$1 and si.selection_id=$2
       and s.id=si.selection_id and s.owner_id=$3 and s.school_id=$4 returning si.id`,
      [itemId, selectionId, actor.id, actor.schoolId],
    );
    if (!result.rowCount) throw new NotFoundException('not_found');
  }

  private async assertSelection(actor: Actor, id: string) {
    const result = await this.pool.query(
      `select 1 from selections where id=$1 and owner_id=$2 and school_id=$3`,
      [id, actor.id, actor.schoolId],
    );
    if (!result.rowCount) throw new NotFoundException('not_found');
  }
}

const mapPart = (row: Record<string, unknown>) => ({
  id: String(row.id),
  rootId: String(row.root_id),
  rootRef: String(row.root_ref),
  label: String(row.label),
  displayRef: String(row.display_ref),
  stem: String(row.stem),
  marks: Number(row.marks),
  commandWord: row.command_word ? String(row.command_word) : null,
  ao: row.ao ? String(row.ao) : null,
  answerKind: String(row.answer_kind),
  status: String(row.status),
  component: Number(row.component),
  year: Number(row.year),
  series: String(row.series),
  hasDiagram: Boolean(row.has_diagram),
  hasDependency: Boolean(row.has_dependency),
  subtopics: row.subtopics as unknown[],
  difficulty: null,
});

const unavailable = (filters: QuestionBankFilters) => [
  ...(filters.difficulty ? ['difficulty'] : []),
  ...(filters.unusedInClassId ? ['unusedInClassId'] : []),
];
