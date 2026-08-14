import type { Pool } from 'pg';

export interface SubtopicNode {
  id: string;
  code: string;
  title: string;
  questionCount: number;
}

export interface TopicNode {
  id: string;
  number: number;
  title: string;
  level: 'AS' | 'A2';
  componentNumber: number | null;
  subtopics: SubtopicNode[];
}

/**
 * Read-only view of the official 9618 tree. Every authenticated user may read it:
 * it carries no student data and both the authoring editor and the student
 * "O'rganish" section navigate by it.
 */
export class SyllabusService {
  constructor(private readonly pool: Pool) {}

  async tree(syllabusCode = '9618'): Promise<TopicNode[]> {
    const result = await this.pool.query(
      `select t.id, t.number, t.title, t.level, c.number as component_number,
              coalesce((
                select json_agg(json_build_object(
                  'id', s.id, 'code', s.code, 'title', s.title,
                  'questionCount', (
                    select count(*) from question_subtopics qs
                    join questions q on q.id = qs.question_id
                    where qs.subtopic_id = s.id and q.status = 'approved'
                  )
                ) order by s.sort_order, s.code)
                from subtopics s where s.topic_id = t.id
              ), '[]'::json) as subtopics
       from topics t
       join syllabi sy on sy.id = t.syllabus_id
       left join components c on c.id = t.component_id
       where sy.code = $1 and sy.is_active = true
       order by t.number`,
      [syllabusCode],
    );

    return result.rows.map((row) => ({
      id: String(row.id),
      number: Number(row.number),
      title: String(row.title),
      level: row.level as 'AS' | 'A2',
      componentNumber: row.component_number === null ? null : Number(row.component_number),
      subtopics: (row.subtopics as SubtopicNode[]).map((subtopic) => ({
        ...subtopic,
        questionCount: Number(subtopic.questionCount),
      })),
    }));
  }

  async components(syllabusCode = '9618') {
    const result = await this.pool.query(
      `select c.id, c.number, c.name, c.level, c.duration_min, c.total_marks
       from components c join syllabi sy on sy.id = c.syllabus_id
       where sy.code = $1 and sy.is_active = true
       order by c.number`,
      [syllabusCode],
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      number: Number(row.number),
      name: String(row.name),
      level: row.level as 'AS' | 'A2',
      durationMin: Number(row.duration_min),
      totalMarks: Number(row.total_marks),
    }));
  }
}
