import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { PgQuestionsRepository } from './repositories/questions-repository.js';

const teacher = { id:'teacher', role:'teacher' as const, schoolId:'school', fullName:'Teacher' };

describe('Question Bank cross-version syllabus matching', () => {
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

  it('authorizes portable historical questions through any visible class for the same qualification code', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount:0, rows:[] });
    const repository = new PgQuestionsRepository({ query } as unknown as Pool);

    await repository.portable(teacher, '22222222-2222-4222-8222-222222222222');

    const [sql] = query.mock.calls[0]!;
    expect(sql).toContain('join syllabi visible_syllabus');
    expect(sql).toContain('join syllabi source_syllabus');
    expect(sql).toContain('visible_syllabus.code=source_syllabus.code');
    expect(sql).not.toContain('visible.syllabus_id=sp.syllabus_id');
  });
});
