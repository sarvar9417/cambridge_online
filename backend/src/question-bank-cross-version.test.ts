import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { PgQuestionsRepository } from './repositories/questions-repository.js';

const teacher = { id:'teacher', role:'teacher' as const, schoolId:'school', fullName:'Teacher' };

describe('Question Bank cross-version syllabus matching', () => {
  it('scopes corpus searches by qualification code without pinning a historical syllabus UUID', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount:0, rows:[] });
    const repository = new PgQuestionsRepository({ query } as unknown as Pool);

    await repository.findVisible(teacher, { view:'parts', syllabusCode:'0478' });

    const [sql, values] = query.mock.calls[0]!;
    expect(sql).toContain('join syllabi syllabus on syllabus.id=sp.syllabus_id');
    expect(sql).toContain('syllabus.code=$1');
    expect(values[0]).toBe('0478');
    expect(sql).not.toContain('sp.syllabus_id=$1');
  });

  it('matches selected topic IDs by qualification code and topic number, not historical UUID', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount:0, rows:[] });
    const repository = new PgQuestionsRepository({ query } as unknown as Pool);
    const topicId = '9675e38b-99ed-47b6-8287-2ee77abb3858';

    await repository.findVisible(teacher, { view:'parts', topicIds:[topicId] });

    const [sql, values] = query.mock.calls[0]!;
    expect(sql).toContain('selected_syllabus.code=mapped_syllabus.code');
    expect(sql).toContain('selected_topic.number=mapped_topic.number');
    expect(sql).not.toContain('st.topic_id=any');
    expect(values).toContainEqual([topicId]);
  });

  it('matches selected subtopics by qualification code, topic number and subtopic code', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount:0, rows:[] });
    const repository = new PgQuestionsRepository({ query } as unknown as Pool);
    const subtopicId = '11111111-1111-4111-8111-111111111111';

    await repository.findVisible(teacher, { view:'parts', subtopicIds:[subtopicId] });

    const [sql, values] = query.mock.calls[0]!;
    expect(sql).toContain('selected_syllabus.code=mapped_syllabus.code');
    expect(sql).toContain('selected_topic.number=mapped_topic.number');
    expect(sql).toContain('selected_subtopic.code=mapped_subtopic.code');
    expect(sql).not.toContain('qst.subtopic_id=any');
    expect(values).toContainEqual([subtopicId]);
  });

  it('treats approved Cambridge corpus questions as portable staff reference content without requiring a matching class', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount:0, rows:[] });
    const repository = new PgQuestionsRepository({ query } as unknown as Pool);

    await repository.portable(teacher, '22222222-2222-4222-8222-222222222222');

    const [sql, values] = query.mock.calls[0]!;
    expect(sql).toContain("q.status in ('approved','needs_review')");
    expect(sql).not.toContain('from classes visible');
    expect(sql).not.toContain('class_teachers');
    expect(values).toEqual(['22222222-2222-4222-8222-222222222222']);
  });
});
