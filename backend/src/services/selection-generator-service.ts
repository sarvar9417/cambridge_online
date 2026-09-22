import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { generateSmartPaper, type SmartPaperCandidate } from '../lib/smart-paper-generator.js';
import type { PgSelectionsRepository } from '../repositories/selections-repository.js';
import type { SelectionRole } from './selection-review.js';
import { DomainError } from './assignments-service.js';

export interface SmartSelectionInput {
  name: string;
  syllabusCode: '9618';
  targetMarks: number;
  q?: string;
  component?: number;
  marksMin?: number;
  marksMax?: number;
  yearFrom?: number;
  yearTo?: number;
  series?: string[];
  aos?: string[];
  topicIds?: string[];
  subtopicIds?: string[];
  commandWords?: string[];
  hasDiagram?: boolean;
  dependency?: 'any' | 'independent';
  classId?: string;
  excludeSeen?: boolean;
  seed?: number;
}

type CandidateRow = {
  id: string;
  root_id: string;
  display_ref: string;
  marks: number;
  year: number;
  command_word: string | null;
  primary_subtopic: string | null;
  has_diagram: boolean;
};

type DependencyRow = {
  question_id: string;
  depends_on_id: string;
  kind: string;
  strength: string;
  source_ref: string;
  source_marks: number | null;
  source_status: string;
  source_ms_ready: boolean;
  target_ref: string;
  target_marks: number | null;
  target_status: string;
  target_ms_ready: boolean;
  source_sort_order: number;
  target_sort_order: number;
};

type NodeMeta = {
  id: string;
  sourceRef: string;
  marks: number | null;
  status: string;
  markSchemeReady: boolean;
  sortOrder: number;
};

type DependencyEdge = {
  targetId: string;
  kind: 'answer_ref' | 'text_ref';
  strength: string;
};

const normalizeKind = (value: string): DependencyEdge['kind'] =>
  value === 'answer' || value === 'answer_ref' ? 'answer_ref' : 'text_ref';

const push = (values: unknown[], value: unknown) => {
  values.push(value);
  return `$${values.length}`;
};

export class SelectionGeneratorService {
  constructor(
    private readonly pool: Pool,
    private readonly selections: PgSelectionsRepository,
  ) {}

  private async assertClassAccess(actor: Actor, classId: string) {
    const visible = await this.pool.query(
      `select 1
       from classes c
       where c.id=$1
         and c.archived_at is null
         and (
           ($2='owner' and c.school_id=$3)
           or ($2='teacher' and (
             c.owner_id=$4
             or exists(
               select 1 from class_teachers ct
               where ct.class_id=c.id and ct.teacher_id=$4
             )
           ))
         )`,
      [classId, actor.role, actor.schoolId, actor.id],
    );
    if (!visible.rowCount) throw new DomainError('class_not_found', 404);
  }

  private async candidates(actor: Actor, input: SmartSelectionInput) {
    if (input.excludeSeen && !input.classId) {
      throw new DomainError('generator_class_required', 400);
    }
    if (input.classId) await this.assertClassAccess(actor, input.classId);

    const values: unknown[] = [];
    const conditions = [
      `sy.code=${push(values, input.syllabusCode)}`,
      `sp.kind='QP'::paper_kind`,
      `sp.year between 2021 and 2026`,
      `sp.variant between 1 and 3`,
      `q.marks is not null`,
      `q.status='approved'`,
      `q.body_format='latex'`,
      `nullif(btrim(coalesce(q.stem_latex,'')),'') is not null`,
      `q.content_json is not null and q.content_version=1`,
      `exists(
        select 1 from canonical_mark_schemes cms
        where cms.question_id=q.id
          and cms.status='approved'
          and cms.max_marks=q.marks
      )`,
    ];

    if (input.component !== undefined) {
      conditions.push(`c.number=${push(values, input.component)}`);
    }
    if (input.marksMin !== undefined) {
      conditions.push(`q.marks>=${push(values, input.marksMin)}`);
    }
    if (input.marksMax !== undefined) {
      conditions.push(`q.marks<=${push(values, input.marksMax)}`);
    }
    if (input.yearFrom !== undefined) {
      conditions.push(`sp.year>=${push(values, input.yearFrom)}`);
    }
    if (input.yearTo !== undefined) {
      conditions.push(`sp.year<=${push(values, input.yearTo)}`);
    }
    if (input.series?.length) {
      conditions.push(`sp.series::text=any(${push(values, input.series)}::text[])`);
    }
    if (input.aos?.length) {
      conditions.push(`q.ao::text=any(${push(values, input.aos)}::text[])`);
    }
    if (input.commandWords?.length) {
      conditions.push(`q.command_word::text=any(${push(values, input.commandWords)}::text[])`);
    }
    if (input.q?.trim()) {
      const search = push(values, input.q.trim());
      conditions.push(`(
        to_tsvector('english',coalesce(q.stem_md,'')) @@ websearch_to_tsquery('english',${search})
        or q.stem_md ilike '%' || ${search} || '%'
        or q.display_ref ilike '%' || ${search} || '%'
      )`);
    }
    if (input.hasDiagram !== undefined) {
      const visual = `exists(
        select 1 from question_assets qa
        where qa.question_id=q.id and qa.kind in ('diagram','image')
      )`;
      conditions.push(input.hasDiagram ? visual : `not ${visual}`);
    }
    if (input.dependency === 'independent') {
      conditions.push(`not exists(
        select 1 from question_dependencies qd where qd.question_id=q.id
      )`);
    }
    if (input.topicIds?.length) {
      const selected = push(values, input.topicIds);
      conditions.push(`exists(
        select 1
        from question_subtopics qst
        join subtopics mapped_st on mapped_st.id=qst.subtopic_id
        join topics mapped_t on mapped_t.id=mapped_st.topic_id
        join syllabi mapped_sy on mapped_sy.id=mapped_t.syllabus_id
        where qst.question_id=q.id
          and exists(
            select 1
            from topics selected_t
            join syllabi selected_sy on selected_sy.id=selected_t.syllabus_id
            where selected_t.id=any(${selected}::uuid[])
              and selected_sy.code=mapped_sy.code
              and selected_t.number=mapped_t.number
          )
      )`);
    }
    if (input.subtopicIds?.length) {
      const selected = push(values, input.subtopicIds);
      conditions.push(`exists(
        select 1
        from question_subtopics qst
        join subtopics mapped_st on mapped_st.id=qst.subtopic_id
        join topics mapped_t on mapped_t.id=mapped_st.topic_id
        join syllabi mapped_sy on mapped_sy.id=mapped_t.syllabus_id
        where qst.question_id=q.id
          and exists(
            select 1
            from subtopics selected_st
            join topics selected_t on selected_t.id=selected_st.topic_id
            join syllabi selected_sy on selected_sy.id=selected_t.syllabus_id
            where selected_st.id=any(${selected}::uuid[])
              and selected_sy.code=mapped_sy.code
              and selected_t.number=mapped_t.number
              and selected_st.code=mapped_st.code
          )
      )`);
    }
    if (input.excludeSeen && input.classId) {
      const classId = push(values, input.classId);
      conditions.push(`not exists(
        select 1
        from assignment_questions aq
        join assignments a on a.id=aq.assignment_id
        where aq.question_id=q.id and a.class_id=${classId}
      )`);
    }

    const result = await this.pool.query(
      `with recursive matching as (
         select q.id,q.parent_id,q.depth,q.sort_order,q.display_ref,q.marks,q.command_word,
           q.ao,sp.year,
           exists(
             select 1 from question_assets qa
             where qa.question_id=q.id and qa.kind in ('diagram','image')
           ) has_diagram,
           (
             select st.code
             from question_subtopics qst
             join subtopics st on st.id=qst.subtopic_id
             where qst.question_id=q.id and qst.is_primary
             order by qst.confidence desc nulls last,st.code
             limit 1
           ) primary_subtopic
         from questions q
         join source_papers sp on sp.id=q.source_paper_id
         join syllabi sy on sy.id=sp.syllabus_id
         join components c on c.id=q.component_id
         where ${conditions.join(' and ')}
       ), chain as (
         select m.id leaf_id,m.id node_id,m.parent_id,m.depth
         from matching m
         union all
         select ch.leaf_id,p.id,p.parent_id,p.depth
         from chain ch
         join questions p on p.id=ch.parent_id
       ), roots as (
         select distinct on (leaf_id) leaf_id,node_id root_id
         from chain
         order by leaf_id,depth,node_id
       )
       select m.*,r.root_id
       from matching m
       join roots r on r.leaf_id=m.id
       order by m.year desc,m.sort_order,m.id`,
      values,
    );
    return result.rows as CandidateRow[];
  }

  private async dependencyGraph() {
    const result = await this.pool.query(
      `select qd.question_id,qd.depends_on_id,qd.kind::text,qd.strength::text,
         source.display_ref source_ref,source.marks source_marks,source.status::text source_status,
         source.sort_order source_sort_order,
         exists(
           select 1 from canonical_mark_schemes cms
           where cms.question_id=source.id and cms.status='approved' and cms.max_marks=source.marks
         ) source_ms_ready,
         target.display_ref target_ref,target.marks target_marks,target.status::text target_status,
         target.sort_order target_sort_order,
         exists(
           select 1 from canonical_mark_schemes cms
           where cms.question_id=target.id and cms.status='approved' and cms.max_marks=target.marks
         ) target_ms_ready
       from question_dependencies qd
       join questions source on source.id=qd.question_id
       join questions target on target.id=qd.depends_on_id
       join source_papers sp on sp.id=source.source_paper_id
       join syllabi sy on sy.id=sp.syllabus_id
       where sy.code='9618'
         and sp.kind='QP'::paper_kind
         and sp.year between 2021 and 2026
         and sp.variant between 1 and 3
       order by source.sort_order,target.sort_order,target.id`,
    );
    return result.rows as DependencyRow[];
  }

  private expandDependencies(
    seedIds: string[],
    candidates: CandidateRow[],
    dependencyRows: DependencyRow[],
  ) {
    const nodes = new Map<string, NodeMeta>();
    for (const candidate of candidates) {
      nodes.set(candidate.id, {
        id: candidate.id,
        sourceRef: candidate.display_ref,
        marks: Number(candidate.marks),
        status: 'approved',
        markSchemeReady: true,
        sortOrder: 0,
      });
    }

    const edges = new Map<string, DependencyEdge[]>();
    for (const row of dependencyRows) {
      nodes.set(row.question_id, {
        id: row.question_id,
        sourceRef: row.source_ref,
        marks: row.source_marks === null ? null : Number(row.source_marks),
        status: row.source_status,
        markSchemeReady: Boolean(row.source_ms_ready),
        sortOrder: Number(row.source_sort_order),
      });
      nodes.set(row.depends_on_id, {
        id: row.depends_on_id,
        sourceRef: row.target_ref,
        marks: row.target_marks === null ? null : Number(row.target_marks),
        status: row.target_status,
        markSchemeReady: Boolean(row.target_ms_ready),
        sortOrder: Number(row.target_sort_order),
      });
      const list = edges.get(row.question_id) ?? [];
      list.push({
        targetId: row.depends_on_id,
        kind: normalizeKind(row.kind),
        strength: row.strength,
      });
      edges.set(row.question_id, list);
    }

    const roles = new Map<string, SelectionRole>();
    const ordered: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const setRole = (id: string, role: SelectionRole) => {
      const current = roles.get(id);
      if (!current || (current === 'context_only' && role === 'graded')) roles.set(id, role);
    };

    const visit = (id: string, requestedRole: SelectionRole) => {
      setRole(id, requestedRole);
      if (visited.has(id)) return;
      if (visiting.has(id)) throw new DomainError('generator_dependency_cycle', 409);

      const node = nodes.get(id);
      if (!node || node.status !== 'approved' || node.marks === null) {
        throw new DomainError('generator_dependency_not_ready', 409);
      }
      if (requestedRole === 'graded' && !node.markSchemeReady) {
        throw new DomainError('generator_dependency_not_ready', 409);
      }

      visiting.add(id);
      if (requestedRole === 'graded') {
        for (const edge of edges.get(id) ?? []) {
          const dependencyRole: SelectionRole = edge.kind === 'answer_ref' ? 'graded' : 'context_only';
          visit(edge.targetId, dependencyRole);
        }
      }
      visiting.delete(id);
      visited.add(id);
      ordered.push(id);
    };

    for (const id of seedIds) visit(id, 'graded');

    if (ordered.length > 180) throw new DomainError('generator_selection_too_large', 409);

    const items = ordered.map((id) => {
      const node = nodes.get(id)!;
      return {
        questionId: id,
        role: roles.get(id) ?? 'graded',
        sourceRef: node.sourceRef,
        marks: node.marks ?? 0,
        sortOrder: node.sortOrder,
      };
    });

    const gradedMarks = items.reduce(
      (sum, item) => sum + (item.role === 'graded' ? item.marks : 0),
      0,
    );

    return {
      items,
      gradedMarks,
      gradedCount: items.filter((item) => item.role === 'graded').length,
      contextCount: items.filter((item) => item.role === 'context_only').length,
    };
  }

  async generate(actor: Actor, input: SmartSelectionInput) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
    if (!actor.schoolId) throw new DomainError('school_required', 403);

    const rows = await this.candidates(actor, input);
    const candidates: SmartPaperCandidate[] = rows.map((row) => ({
      id: row.id,
      rootId: row.root_id,
      sourceRef: row.display_ref,
      marks: Number(row.marks),
      year: Number(row.year),
      commandWord: row.command_word,
      primarySubtopic: row.primary_subtopic,
      hasDiagram: Boolean(row.has_diagram),
    }));

    if (!candidates.length) throw new DomainError('generator_empty_pool', 409);

    const seed = input.seed ?? Math.floor(Date.now() / 1000);
    const basePlan = generateSmartPaper(candidates, {
      targetMarks: input.targetMarks,
      seed,
      maxQuestions: 80,
    });
    if (!basePlan.questionIds.length) throw new DomainError('generator_empty_pool', 409);

    const dependencyRows = await this.dependencyGraph();
    const expanded = this.expandDependencies(basePlan.questionIds, rows, dependencyRows);
    const warnings = [...basePlan.warnings];

    const dependencyMarks = expanded.gradedMarks - basePlan.totalMarks;
    if (dependencyMarks > 0) warnings.push(`dependency_marks_added:${dependencyMarks}`);
    if (expanded.contextCount > 0) warnings.push(`context_items_added:${expanded.contextCount}`);
    if (Math.abs(expanded.gradedMarks - input.targetMarks) > 2) {
      warnings.push(`final_target_unmet:${expanded.gradedMarks}/${input.targetMarks}`);
    }

    const selection = await this.selections.createWithItems(
      actor,
      input.name,
      expanded.items.map(({ questionId, role, sourceRef }) => ({ questionId, role, sourceRef })),
    );
    if (!selection) throw new DomainError('generator_selection_failed', 500);

    const review = await this.selections.review(actor, selection.id);
    if (!review) throw new DomainError('generator_selection_failed', 500);
    if (!review.canPublish) throw new DomainError('generator_dependency_not_ready', 409);

    return {
      selection,
      review,
      generator: {
        seed,
        targetMarks: input.targetMarks,
        candidateCount: candidates.length,
        baseMarks: basePlan.totalMarks,
        totalMarks: review.totalMarks,
        baseQuestionCount: basePlan.questionIds.length,
        gradedCount: expanded.gradedCount,
        contextCount: expanded.contextCount,
        warnings,
      },
    };
  }
}
