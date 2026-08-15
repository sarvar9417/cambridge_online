import { describe, expect, it, vi } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import { importSyllabusCatalog, syllabusCatalogSchema } from './syllabus-catalog-import.js';

const catalog = () => ({
  code: '9618' as const,
  subject: 'Computer Science',
  versionLabel: '2021-2023',
  validFrom: 2021,
  validTo: 2023,
  isActive: false,
  components: [1, 2, 3, 4].map((number) => ({
    number,
    name: `Paper ${number}`,
    level: number <= 2 ? 'AS' as const : 'A2' as const,
    durationMinutes: number === 2 ? 120 : number === 4 ? 150 : 90,
    totalMarks: 75,
    weightingPct: 25,
  })),
  topics: [{
    number: 20,
    title: 'Further Programming',
    sortOrder: 20,
    componentNumbers: [3, 4],
    subtopics: [{
      code: '20.1',
      title: 'Programming Paradigms',
      sortOrder: 1,
      learningObjectives: [
        { code: '20.1-lo-01', text: 'Explain what is meant by a programming paradigm.', sortOrder: 1 },
        { code: '20.1-lo-02', text: 'Write low-level code that uses various addressing modes.', sortOrder: 2, componentNumbers: [3] },
      ],
    }],
  }],
});

function harness(options: { overlap?: Record<string, unknown>[]; exactPopulated?: boolean } = {}) {
  let component = 0, topic = 0, sub = 0, lo = 0;
  const query = vi.fn(async (sql: string, _values?: unknown[]) => {
    if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return { rowCount: null, rows: [] };
    if (sql.includes('select id,valid_from,valid_to from syllabi')) { const rows = options.overlap ?? []; return { rowCount: rows.length, rows }; }
    if (sql.includes('select count(*)::int components')) return { rowCount: 1, rows: [{ components: options.exactPopulated ? 4 : 0, topics: options.exactPopulated ? 20 : 0 }] };
    if (sql.includes('insert into syllabi')) return { rowCount: 1, rows: [{ id: 'syllabus-1' }] };
    if (sql.includes('insert into components')) return { rowCount: 1, rows: [{ id: `component-${++component}` }] };
    if (sql.includes('insert into topics')) return { rowCount: 1, rows: [{ id: `topic-${++topic}` }] };
    if (sql.includes('insert into subtopics')) return { rowCount: 1, rows: [{ id: `sub-${++sub}` }] };
    if (sql.includes('insert into learning_objectives')) return { rowCount: 1, rows: [{ id: `lo-${++lo}` }] };
    return { rowCount: 1, rows: [] };
  });
  const client = { query, release: vi.fn() } as unknown as PoolClient;
  return { pool: { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool, query };
}

describe('syllabus catalog import', () => {
  it('validates topic and LO component coverage before DB mutation', () => {
    const parsed = syllabusCatalogSchema.parse(catalog());
    expect(parsed.topics[0]?.componentNumbers).toEqual([3, 4]);
    expect(parsed.topics[0]?.subtopics[0]?.learningObjectives[1]?.componentNumbers).toEqual([3]);
    const outside = catalog();
    outside.topics[0]!.subtopics[0]!.learningObjectives[1]!.componentNumbers = [2];
    expect(() => syllabusCatalogSchema.parse(outside)).toThrow(/outside topic coverage/);
  });

  it('persists broad topic coverage and precise LO coverage', async () => {
    const h = harness();
    const result = await importSyllabusCatalog(h.pool, catalog());
    expect(result).toEqual({ syllabusId: 'syllabus-1', components: 4, topics: 1, componentTopicLinks: 2, subtopics: 1, learningObjectives: 2, componentLearningObjectiveLinks: 3 });
    const topicCoverage = h.query.mock.calls.filter(([sql]) => String(sql).includes('insert into component_topics'));
    expect(topicCoverage.map((call) => call[1])).toEqual([['component-3', 'topic-1', true], ['component-4', 'topic-1', false]]);
    const loCoverage = h.query.mock.calls.filter(([sql]) => String(sql).includes('insert into component_learning_objectives'));
    expect(loCoverage.map((call) => call[1])).toEqual([['component-3', 'lo-1'], ['component-4', 'lo-1'], ['component-3', 'lo-2']]);
  });

  it('rejects a partially overlapping syllabus validity window', async () => {
    const h = harness({ overlap: [{ id: 'existing', valid_from: 2022, valid_to: 2025 }] });
    await expect(importSyllabusCatalog(h.pool, catalog())).rejects.toThrow('syllabus_catalog_validity_overlap:9618:2021-2023');
    expect(h.query).toHaveBeenCalledWith('rollback');
  });

  it('refuses to overwrite an already populated exact version', async () => {
    const h = harness({ overlap: [{ id: 'existing', valid_from: 2021, valid_to: 2023 }], exactPopulated: true });
    await expect(importSyllabusCatalog(h.pool, catalog())).rejects.toThrow('syllabus_catalog_version_already_populated:existing');
  });

  it('allows completing an empty exact-version shell without deleting anything', async () => {
    const h = harness({ overlap: [{ id: 'existing', valid_from: 2021, valid_to: 2023 }], exactPopulated: false });
    const result = await importSyllabusCatalog(h.pool, catalog());
    expect(result.syllabusId).toBe('existing');
    expect(h.query.mock.calls.some(([sql]) => String(sql).toLowerCase().includes('delete '))).toBe(false);
  });
});
