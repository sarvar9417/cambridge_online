import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { sm2 } from '../lib/srs.js';
import { DomainError } from './assignments-service.js';

export class ContentService {
  constructor(private pool: Pool) {}

  private student(actor: Actor) {
    if (actor.role !== 'student') throw new DomainError('students_only', 403);
  }

  async lessonProgress(actor: Actor) {
    this.student(actor);
    const result = await this.pool.query(
      `select course_code,chapter_no,slide_id,visited_at,completed_at
       from student_lesson_progress
       where student_id=$1
       order by course_code,chapter_no,visited_at`,
      [actor.id],
    );
    return result.rows.map((row) => ({
      courseCode: String(row.course_code) as '9618'|'0478',
      chapterNo: Number(row.chapter_no),
      slideId: row.slide_id,
      visitedAt: row.visited_at,
      completedAt: row.completed_at,
    }));
  }

  async touchLesson(actor: Actor, input: { courseCode: '9618'|'0478'; chapterNo: number; slideId: string; completed: boolean }) {
    this.student(actor);
    const result = await this.pool.query(
      `insert into student_lesson_progress(student_id,course_code,chapter_no,slide_id,visited_at,completed_at)
       values($1,$2,$3,$4,now(),case when $5 then now() else null end)
       on conflict(student_id,course_code,chapter_no,slide_id) do update set
         visited_at=now(),
         completed_at=case when $5 then coalesce(student_lesson_progress.completed_at,now()) else student_lesson_progress.completed_at end
       returning course_code,chapter_no,slide_id,visited_at,completed_at`,
      [actor.id, input.courseCode, input.chapterNo, input.slideId, input.completed],
    );
    const row = result.rows[0];
    return {
      courseCode: String(row.course_code) as '9618'|'0478',
      chapterNo: Number(row.chapter_no),
      slideId: row.slide_id,
      visitedAt: row.visited_at,
      completedAt: row.completed_at,
    };
  }

  async due(actor: Actor) {
    this.student(actor);
    const result = await this.pool.query(
      `select fr.flashcard_id,fc.front_md,fc.back_md,fc.hint_md,fr.ease_factor,fr.interval_days,
              fr.repetitions,fr.lapses,fr.due_at
       from flashcard_reviews fr join flashcards fc on fc.id=fr.flashcard_id
       where fr.user_id=$1 and fr.due_at<=now()
       order by fr.due_at limit 50`,
      [actor.id],
    );
    return result.rows;
  }

  async review(actor: Actor, cardId: string, grade: number) {
    this.student(actor);
    const result = await this.pool.query(
      `select ease_factor,interval_days,repetitions,lapses
       from flashcard_reviews where user_id=$1 and flashcard_id=$2`,
      [actor.id, cardId],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);
    const next = sm2({
      easeFactor: Number(result.rows[0].ease_factor),
      intervalDays: result.rows[0].interval_days,
      repetitions: result.rows[0].repetitions,
      lapses: result.rows[0].lapses,
    }, grade);
    await this.pool.query(
      `update flashcard_reviews
       set ease_factor=$3,interval_days=$4,repetitions=$5,lapses=$6,due_at=$7,last_grade=$8,last_reviewed_at=now()
       where user_id=$1 and flashcard_id=$2`,
      [actor.id, cardId, next.easeFactor, next.intervalDays, next.repetitions, next.lapses, next.dueAt, next.lastGrade],
    );
    return next;
  }

  async games(actor: Actor) {
    this.student(actor);
    const glossary = await this.pool.query(
      `select distinct gt.id,gt.term,gt.definition_en definition
       from glossary_terms gt join subtopics st on st.id=gt.subtopic_id join topics t on t.id=st.topic_id
       join classes c on c.syllabus_id=t.syllabus_id join enrollments e on e.class_id=c.id and e.left_at is null
       where e.student_id=$1 and gt.status='approved' order by gt.term limit 8`,
      [actor.id],
    );
    const objectives = await this.pool.query(
      `select distinct lo.id,lo.code,lo.text,lo.sort_order
       from learning_objectives lo join subtopics st on st.id=lo.subtopic_id join topics t on t.id=st.topic_id
       join classes c on c.syllabus_id=t.syllabus_id join enrollments e on e.class_id=c.id and e.left_at is null
       where e.student_id=$1 order by lo.sort_order,lo.code limit 6`,
      [actor.id],
    );
    const terms = glossary.rows.map((row) => ({ id: row.id, term: row.term, definition: row.definition }));
    return {
      termMatch: terms,
      sequence: objectives.rows.map((row) => ({ id: row.id, code: row.code, text: row.text })),
      spotTheGap: terms.map((row) => ({ id: row.id, prompt: `_____ — ${row.definition}`, answer: row.term })),
    };
  }


  /**
   * Interactive Games are based on the current PostgreSQL Hodder catalogue and glossary.
   * No hard-coded chapter map or content synchronisation is needed. Newly inserted chapters,
   * sections and terms become discoverable on the next API request.
   *
   * "needs_review" terms are made available for explicitly labelled, non-assessed
   * revision only. They are NEVER presented as approved grading evidence.
   */
  private async interactiveGamesAccess(actor: Actor, courseCode: '9618' | '0478') {
    if (actor.role !== 'student') return;
    const result = await this.pool.query(
      `select 1
         from enrollments e
         join classes c on c.id=e.class_id
         join syllabi sy on sy.id=c.syllabus_id
         where e.student_id=$1 and e.left_at is null and sy.code=$2 and sy.is_active=true
         limit 1`,
      [actor.id, courseCode],
    );
    if (!result.rowCount) throw new DomainError('not_enrolled_in_syllabus', 403);
  }

  async interactiveGameCatalog(actor: Actor, courseCode: '9618' | '0478' = '9618') {
    await this.interactiveGamesAccess(actor, courseCode);
    const [chaptersResult, sectionsResult, topicsResult] = await Promise.all([
      this.pool.query(
        `select t.number as chapter_no,min(t.title) title,
                count(distinct gt.id) filter (where gt.status in ('approved','needs_review'))::int term_count,
                count(distinct gt.id) filter (where gt.status='approved')::int approved_count
         from topics t
         join syllabi sy on sy.id=t.syllabus_id
         left join subtopics st on st.topic_id=t.id
         left join glossary_terms gt on gt.subtopic_id=st.id
         where sy.code=$1 and sy.is_active=true
         group by t.number
         having count(distinct gt.id) filter (where gt.status in ('approved','needs_review')) > 0
         order by t.number`,
        [courseCode],
      ),
      this.pool.query(
        `select bs.chapter_number chapter_no,bs.section_code,bs.title,bs.parent_code,
                (select count(distinct g.id)::int
                 from hodder_book_sections child
                 join hodder_glossary_section_links links on links.book_section_id=child.id
                 join glossary_terms g on g.id=links.glossary_term_id
                 where child.syllabus_id=bs.syllabus_id
                   and child.chapter_number=bs.chapter_number
                   and (child.section_code=bs.section_code or child.section_code like bs.section_code || '.%')
                   and g.status in ('approved','needs_review')) term_count
         from hodder_book_sections bs
         join syllabi sy on sy.id=bs.syllabus_id
         where sy.code=$1 and sy.is_active=true
           and bs.section_code <> bs.chapter_number::text
         order by bs.chapter_number,bs.section_code`,
        [courseCode],
      ),
      this.pool.query(
        `select t.number chapter_no,st.code,st.title,
                count(distinct gt.id) filter (where gt.status in ('approved','needs_review'))::int term_count
         from topics t
         join syllabi sy on sy.id=t.syllabus_id
         join subtopics st on st.topic_id=t.id
         left join glossary_terms gt on gt.subtopic_id=st.id
         where sy.code=$1 and sy.is_active=true
         group by t.number,st.code,st.title,st.sort_order
         having count(distinct gt.id) filter (where gt.status in ('approved','needs_review')) > 0
         order by t.number,st.sort_order,st.code`,
        [courseCode],
      ),
    ]);
    return {
      courseCode,
      chapters: chaptersResult.rows.map((row) => ({
        chapterNo: Number(row.chapter_no),
        title: String(row.title),
        termCount: Number(row.term_count),
        approvedCount: Number(row.approved_count),
        topics: topicsResult.rows.filter((topic) => Number(topic.chapter_no) === Number(row.chapter_no))
          .map((topic) => ({
            code: String(topic.code),
            title: String(topic.title),
            termCount: Number(topic.term_count),
          })),
        sections: sectionsResult.rows.filter((section) =>
          Number(section.chapter_no) === Number(row.chapter_no) &&
          String(section.section_code) !== String(row.chapter_no) &&
          Number(section.term_count) > 0,
        ).map((section) => ({
          code: String(section.section_code),
          title: String(section.title),
          parentCode: section.parent_code ? String(section.parent_code) : null,
          termCount: Number(section.term_count),
        })).sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true })),
      })),
    };
  }

  /**
   * Compose a single practice bank from selected chapters, syllabus topics and
   * Hodder sections. All queries are read-only and scoped to the active syllabus.
   */
  async interactiveGameCollection(actor: Actor, input: {
    courseCode: '9618' | '0478';
    scopes: Array<{ chapterNo: number; kind: 'chapter' | 'topic' | 'section'; code?: string }>;
  }) {
    const catalog = await this.interactiveGameCatalog(actor, input.courseCode);
    const distinct = new Map<string, typeof input.scopes[number]>();
    for (const scope of input.scopes) {
      const chapter = catalog.chapters.find((item) => item.chapterNo === scope.chapterNo);
      if (!chapter ||
        (scope.kind === 'chapter' && scope.code) ||
        (scope.kind !== 'chapter' && !scope.code) ||
        (scope.kind === 'topic' && !chapter.topics.some((topic) => topic.code === scope.code)) ||
        (scope.kind === 'section' && !chapter.sections.some((section) => section.code === scope.code))) {
        throw new DomainError('game_selection_not_found', 400);
      }
      distinct.set(scope.chapterNo + ':' + scope.kind + ':' + (scope.code ?? ''), scope);
    }
    const selected = [...distinct.values()];
    const full = new Set(selected.filter((scope) => scope.kind === 'chapter').map((scope) => scope.chapterNo));
    const scopes = selected.filter((scope) =>
      (scope.kind === 'chapter' || !full.has(scope.chapterNo)) &&
      (scope.kind !== 'section' || !selected.some((parent) =>
        parent.chapterNo === scope.chapterNo && parent.kind === 'section' &&
        parent.code && scope.code?.startsWith(parent.code + '.') && scope.code !== parent.code)));
    if (!scopes.length || scopes.length > 100) throw new DomainError('game_selection_invalid', 400);

    const result = await this.pool.query(
      `with requested as (
         select r.chapter_no,r.kind,r.code
         from jsonb_to_recordset($2::jsonb) as r(chapter_no int,kind text,code text)
       )
       select gt.id,gt.term,gt.definition_en definition,gt.status::text status
       from glossary_terms gt
       join subtopics st on st.id=gt.subtopic_id
       join topics t on t.id=st.topic_id
       join syllabi sy on sy.id=t.syllabus_id
       where sy.code=$1 and sy.is_active=true
         and gt.status in ('approved','needs_review')
         and nullif(trim(gt.term),'') is not null
         and nullif(trim(gt.definition_en),'') is not null
         and exists (
           select 1 from requested selection
           where selection.chapter_no=t.number
           and (
             selection.kind='chapter'
             or (selection.kind='topic' and selection.code=st.code)
             or (selection.kind='section' and exists (
               select 1 from hodder_glossary_section_links hgl
               join hodder_book_sections bs on bs.id=hgl.book_section_id
               where hgl.glossary_term_id=gt.id and bs.syllabus_id=t.syllabus_id
                 and bs.chapter_number=t.number
                 and (bs.section_code=selection.code
                   or bs.section_code like selection.code || '.%')
             ))
           )
         )
       order by case when gt.status='approved' then 0 else 1 end,
                lower(gt.term),gt.id`,
      [input.courseCode, JSON.stringify(scopes.map((scope) => ({
        chapter_no: scope.chapterNo,kind: scope.kind,code: scope.code ?? null,
      })))],
    );

    const seenTerms = new Set<string>();
    const seenDefinitions = new Set<string>();
    const pairs = result.rows.flatMap((row) => {
      const term = String(row.term).trim();
      const definition = String(row.definition).trim();
      const termKey = term.toLocaleLowerCase('en');
      const definitionKey = definition.toLocaleLowerCase('en');
      if (seenTerms.has(termKey) || seenDefinitions.has(definitionKey)) return [];
      seenTerms.add(termKey);
      seenDefinitions.add(definitionKey);
      return [{
        id: String(row.id),term,definition,
        status: String(row.status) as 'approved' | 'needs_review',
        source: null as null,
      }];
    });
    return {
      courseCode: input.courseCode,
      scopes,
      contentStatus: pairs.length > 0 && pairs.every((pair) => pair.status === 'approved')
        ? 'approved' as const : 'needs_review' as const,
      pairs,
      source: 'Active Cambridge syllabus glossary and Hodder section links',
      assessed: false as const,
    };
  }

  async interactiveGamePack(actor: Actor, input: {
    courseCode: '9618' | '0478';
    chapterNo: number;
    sectionCode?: string;
  }) {
    await this.interactiveGamesAccess(actor, input.courseCode);
    const { courseCode, chapterNo, sectionCode } = input;
    // Enforce an actual Hodder section before applying a subsection filter:
    // the broader syllabus subtopic codes are not interchangeable with book
    // section codes (e.g., syllabus 2.1 can include textbook 2.2 content).
    if (sectionCode) {
      const exists = await this.pool.query(
        `select bs.id from hodder_book_sections bs join syllabi sy on sy.id=bs.syllabus_id
         where sy.code=$1 and sy.is_active=true and bs.chapter_number=$2 and bs.section_code=$3 limit 1`,
        [courseCode, chapterNo, sectionCode],
      );
      if (!exists.rowCount) throw new DomainError('game_section_not_found', 404);
    }
    const result = await this.pool.query(
      `select gt.id,gt.term,gt.definition_en definition,gt.status::text status,
              st.code subtopic_code
       from glossary_terms gt
       join subtopics st on st.id=gt.subtopic_id
       join topics t on t.id=st.topic_id
       join syllabi sy on sy.id=t.syllabus_id
       where sy.code=$1 and sy.is_active=true and t.number=$2 and gt.status in ('approved','needs_review')
         and nullif(trim(gt.term),'') is not null
         and nullif(trim(gt.definition_en),'') is not null
         and ($3::text is null or exists (
           select 1 from hodder_glossary_section_links hgl
           join hodder_book_sections bs on bs.id=hgl.book_section_id
           where hgl.glossary_term_id=gt.id and bs.syllabus_id=t.syllabus_id
             and bs.chapter_number=$2
             and (bs.section_code=$3 or bs.section_code like $3 || '.%')
         ))
       order by lower(gt.term), case when gt.status='approved' then 0 else 1 end,gt.id
       `,
      [courseCode, chapterNo, sectionCode ?? null],
    );
    // The same term may occur in several syllabus subtopics. A game must not
    // contain indistinguishable competing answers for a definition.
    const seen = new Set<string>();
    const seenDefinitions = new Set<string>();
    const pairs = result.rows.flatMap((row) => {
      const term = String(row.term).trim();
      const key = term.toLocaleLowerCase('en');
      const definitionKey = String(row.definition).trim().toLocaleLowerCase('en');
      // Two different terms with an identical definition are ambiguous in
      // Match Up / Quiz; do not put indistinguishable answer slots in a game.
      if (seen.has(key) || seenDefinitions.has(definitionKey)) return [];
      seen.add(key);
      seenDefinitions.add(definitionKey);
      return [{
        id: String(row.id), term, definition: String(row.definition).trim(),
        status: String(row.status) as 'approved' | 'needs_review',
        source: null, // Private Drive source references are not exposed to students.
      }];
    });
    return {
      courseCode, chapterNo, sectionCode: sectionCode ?? null,
      contentStatus: pairs.length > 0 && pairs.every((pair) => pair.status === 'approved') ? 'approved' : 'needs_review',
      pairs,
      source: 'Current Cambridge 9618 Hodder-linked PostgreSQL glossary',
      assessed: false,
    };
  }

  async list(_actor: Actor) {
    const result = await this.pool.query(
      `select ci.id,ci.kind,ci.title,ci.body_md,st.code subtopic_code,st.title subtopic_title
       from content_items ci join subtopics st on st.id=ci.subtopic_id
       where ci.status='approved' order by st.code,ci.sort_order`,
    );
    return result.rows;
  }
}
