import { describe, expect, it, vi } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import { importSyllabusCatalog, syllabusCatalogSchema } from './syllabus-catalog-import.js';

const catalog = () => ({
  code: '9618' as const,
  subject: 'Computer Science',
  versionLabel: '2021-2025',
  validFrom: 2021,
  validTo: 2025,
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
    number: 19,
    title: 'Computational thinking and Problem-solving',
    sortOrder: 19,
    componentNumbers: [3, 4],
    subtopics: [{
      code: '19.1',
      title: 'Algorithms',
      sortOrder: 1,
      learningObjectives: [{ code: '19.1-lo-01', text: 'Describe a linear and binary search.', sortOrder: 1 }],
    }],
  }],
});

function harness(options: { overlap?: Record<string, unknown>[]; exactPopulated?: boolean } = {}) {
  let component = 0;
  let topic = 0;
  let sub = 0;
  const query = vi.fn(async (sql: string, _values?: unknown[]) => {
    if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return { rowCount: null, rows: [] };
    if (sql.includes('select id,valid_from,valid_to from syllabi')) {
      const rows = options.overlap ?? [];
      return { rowCount: rows.length, rows };
    }
    if (sql.includes('select count(*)::int components')) {
      return {
        rowCount: 1,
        rows: [{ components: options.exactPopulated ? 4 : 0, topics: options.exactPopulated ? 20 : 0 }],
      };
    }
    if (sql.includes('insert into syllabi')) return { rowCount: 1, rows: [{ id: 'syllabus-1' }] };
    if (sql.includes('insert into components')) return { rowCount: 1, rows: [{ id: `component-${++component}` }] };
    if (sql.includes('insert into topics')) return { rowCount: 1, rows: [{ id: `topic-${++topic}` }] };
    if (sql.includes('insert into subtopics')) return { rowCount: 1, rows: [{ id: `sub-${++sub}` }] };
    return { rowCount: 1, rows: [] };
  });
  const client = { query, release: vi.fn() } as unknown as PoolClient;
  const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool;
  return { pool, query };
}

describe('syllabus catalog import', () => {
  it('validates four components, multi-component references and nested uniqueness before DB mutation', () => {
    const parsed = syllabusCatalogSchema.parse(catalog());
    expect(parsed.components).toHaveLength(4);
    expect(parsed.topics[0]?.componentNumbers).toEqual([3, 4]);
    const duplicate = catalog();
    duplicate.topics.push({ ...duplicate.topics[0]! });
    expect(() => syllabusCatalogSchema.parse(duplicate)).toThrow(/Duplicate topic number/);
    const duplicateCoverage = catalog();
    duplicateCoverage.topics[0]!.componentNumbers = [3, 3];
    expect(() => syllabusCatalogSchema.parse(duplicateCoverage)).toThrow(/Duplicate component number/);
    const badComponent = catalog();
    badComponent.topics[0]!.componentNumbers = [5];
    expect(() => syllabusCatalogSchema.parse(badComponent)).toThrow();
  });

  it('imports main-schema columns and persists both Paper 3/Paper 4 coverage for topic 19', async () => {
    const h = harness();
    const result = await importSyllabusCatalog(h.pool, catalog());
    expect(result).toEqual({
      syllabusId: 'syllabus-1', components: 4, topics: 1, componentTopicLinks: 2,
      subtopics: 1, learningObjectives: 1,
    });
    expect(h.query).toHaveBeenCalledWith('begin');
    expect(h.query).toHaveBeenCalledWith('commit');

    const syllabusInsert = h.query.mock.calls.find(([sql]) => String(sql).includes('insert into syllabi'))!;
    expect(String(syllabusInsert[0])).toContain('code,subject,version_label,valid_from,valid_to,is_active');

    const componentInsert = h.query.mock.calls.find(([sql]) => String(sql).includes('insert into components'))!;
    expect(String(componentInsert[0])).toContain('duration_min,total_marks,weight_pct');
    expect(String(componentInsert[0])).not.toContain('duration_minutes');

    const topicInsert = h.query.mock.calls.find(([sql]) => String(sql).includes('insert into topics'))!;
    expect(String(topicInsert[0])).toContain('title,level,sort_order');
    expect(topicInsert[1]).toEqual(['syllabus-1', 'component-3', 19, 'Computational thinking and Problem-solving', 'A2', 19]);

    const coverageCalls = h.query.mock.calls.filter(([sql]) => String(sql).includes('insert into component_topics'));
    expect(coverageCalls).toHaveLength(2);
    expect(coverageCalls.map((call) => call[1])).toEqual([
      ['component-3', 'topic-1', true],
      ['component-4', 'topic-1', false],
    ]);
    expect(h.query.mock.calls.some(([sql]) => String(sql).includes('insert into learning_objectives'))).toBe(true);
  });

  it('rejects a partially overlapping syllabus validity window', async () => {
    const h = harness({ overlap: [{ id: 'existing', valid_from: 2024, valid_to: 2028 }] });
    await expect(importSyllabusCatalog(h.pool, catalog()))
      .rejects.toThrow('syllabus_catalog_validity_overlap:9618:2021-2025');
    expect(h.query).toHaveBeenCalledWith('rollback');
    expect(h.query.mock.calls.some(([sql]) => String(sql).includes('insert into syllabi'))).toBe(false);
  });

  it('refuses to overwrite an already populated exact version', async () => {
    const h = harness({ overlap: [{ id: 'existing', valid_from: 2021, valid_to: 2025 }], exactPopulated: true });
    await expect(importSyllabusCatalog(h.pool, catalog()))
      .rejects.toThrow('syllabus_catalog_version_already_populated:existing');
    expect(h.query).toHaveBeenCalledWith('rollback');
    expect(h.query.mock.calls.some(([sql]) => String(sql).includes('insert into components'))).toBe(false);
  });

  it('allows completing an empty exact-version shell without deleting anything', async () => {
    const h = harness({ overlap: [{ id: 'existing', valid_from: 2021, valid_to: 2025 }], exactPopulated: false });
    const result = await importSyllabusCatalog(h.pool, catalog());
    expect(result.syllabusId).toBe('existing');
    const update = h.query.mock.calls.find(([sql]) => String(sql).includes('update syllabi'))!;
    expect(String(update[0])).toContain('subject=$2,version_label=$3,is_active=$4');
    expect(update[1]).toEqual(['existing', 'Computer Science', '2021-2025', false]);
    expect(h.query.mock.calls.some(([sql]) => String(sql).toLowerCase().includes('delete '))).toBe(false);
  });
});
