import { describe, expect, it, vi } from 'vitest';
import { QuestionBankRepository } from './question-bank.repository.js';

describe('QuestionBankRepository.portable', () => {
  it('returns only the ancestor chain and keeps inherited assets in position', async () => {
    const pool = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rowCount: 3,
          rows: [
            {
              id: 'root',
              parent_id: null,
              label: '3',
              path: '3',
              display_ref: '3',
              depth: 0,
              marks: null,
              command_word: null,
              answer_kind: 'short',
              answer_lines: null,
              stem: '',
              context: 'Root context',
              assets: [{ id: 'asset-1', sortOrder: 1 }],
            },
            {
              id: 'parent',
              parent_id: 'root',
              label: 'a',
              path: '3.a',
              display_ref: '3(a)',
              depth: 1,
              marks: null,
              command_word: null,
              answer_kind: 'short',
              answer_lines: null,
              stem: '',
              context: null,
              assets: [{ id: 'asset-2', sortOrder: 2 }],
            },
            {
              id: 'leaf',
              parent_id: 'parent',
              label: 'ii',
              path: '3.a.ii',
              display_ref: '3(a)(ii)',
              depth: 2,
              marks: 4,
              command_word: 'explain',
              answer_kind: 'short',
              answer_lines: 4,
              stem: 'Leaf only',
              context: null,
              assets: [],
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }),
    };
    const repository = new QuestionBankRepository(pool as never);
    const portable = await repository.portable(
      { id: 'teacher', role: 'teacher', schoolId: 'school', fullName: 'Teacher' },
      'leaf',
    );
    expect(portable.chain.map((node) => node.id)).toEqual(['root', 'parent', 'leaf']);
    expect(portable.contextBlocks.map((block) => block.assets[0]?.id)).toEqual([
      'asset-1',
      'asset-2',
    ]);
    expect(JSON.stringify(portable)).not.toContain('sibling');
    expect(pool.query.mock.calls[0]![0]).toContain('join questions p on p.id=c.parent_id');
  });

  it('starts bank results from mark-bearing leaf parts', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const repository = new QuestionBankRepository(pool as never);
    await repository.list(
      { id: 'owner', role: 'owner', schoolId: 'school', fullName: 'Owner' },
      {
        view: 'parts',
        topicIds: [],
        subtopicIds: [],
        commandWords: [],
        aos: [],
        series: [],
        dependency: 'any',
        limit: 20,
      },
    );
    expect(pool.query.mock.calls[0]![0]).toContain('q.marks is not null');
  });
});
