import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { loadSyllabusCatalogDocument } from './syllabus-catalog-loader.js';

const catalogPath = (name: string) => fileURLToPath(new URL(`../database/catalogs/${name}`, import.meta.url));
const subtopicCount = (catalog: Awaited<ReturnType<typeof loadSyllabusCatalogDocument>>) =>
  catalog.topics.reduce((sum, topic) => sum + topic.subtopics.length, 0);
const objectiveCount = (catalog: Awaited<ReturnType<typeof loadSyllabusCatalogDocument>>) =>
  catalog.topics.reduce((sum, topic) => sum + topic.subtopics.reduce((inner, sub) => inner + sub.learningObjectives.length, 0), 0);

function subtopic(catalog: Awaited<ReturnType<typeof loadSyllabusCatalogDocument>>, code: string) {
  return catalog.topics.flatMap((topic) => topic.subtopics).find((item) => item.code === code)!;
}

describe('historical 9618 catalog descriptors', () => {
  it('resolves the 2021-2023 descriptor into the complete 20-topic / 44-subtopic catalog', async () => {
    const catalog = await loadSyllabusCatalogDocument(catalogPath('9618-2021-2023.json'));
    expect([catalog.validFrom, catalog.validTo]).toEqual([2021, 2023]);
    expect(catalog.topics).toHaveLength(20);
    expect(subtopicCount(catalog)).toBe(44);
    expect(objectiveCount(catalog)).toBe(215);
    expect(catalog.components.map((component) => [component.number, component.durationMinutes, component.totalMarks])).toEqual([
      [1, 90, 75], [2, 120, 75], [3, 90, 75], [4, 150, 75],
    ]);
    expect(catalog.topics.find((topic) => topic.number === 19)?.componentNumbers).toEqual([3, 4]);
    expect(catalog.topics.find((topic) => topic.number === 20)?.componentNumbers).toEqual([3, 4]);
  });

  it('keeps low-level and declarative programming out of Paper 4 LO coverage', async () => {
    const catalog = await loadSyllabusCatalogDocument(catalogPath('9618-2021-2023.json'));
    const programming = subtopic(catalog, '20.1');
    expect(programming.learningObjectives.find((lo) => lo.code === '20.1-lo-02')?.componentNumbers).toEqual([3]);
    expect(programming.learningObjectives.find((lo) => lo.code === '20.1-lo-06')?.componentNumbers).toEqual([3]);
    expect(programming.learningObjectives.find((lo) => lo.code === '20.1-lo-03')?.componentNumbers).toBeUndefined();
    expect(programming.learningObjectives.find((lo) => lo.code === '20.1-lo-05')?.componentNumbers).toBeUndefined();
  });

  it('applies the 2024-2025 9.2 clarification without duplicating the shared taxonomy', async () => {
    const catalog = await loadSyllabusCatalogDocument(catalogPath('9618-2024-2025.json'));
    expect([catalog.validFrom, catalog.validTo]).toEqual([2024, 2025]);
    expect(catalog.topics).toHaveLength(20);
    expect(subtopicCount(catalog)).toBe(44);
    expect(objectiveCount(catalog)).toBe(217);
    const algorithms = subtopic(catalog, '9.2');
    expect(algorithms.learningObjectives.map((lo) => lo.text)).toEqual(expect.arrayContaining([
      'Draw a flowchart from a structured English description or pseudocode.',
      'Use logic statements to define parts of an algorithm solution.',
    ]));
  });

  it('uses internal ordinal LO identifiers rather than presenting them as Cambridge reference codes', async () => {
    const catalog = await loadSyllabusCatalogDocument(catalogPath('9618-2021-2023.json'));
    const codes = catalog.topics.flatMap((topic) => topic.subtopics.flatMap((sub) => sub.learningObjectives.map((lo) => lo.code)));
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => /^\d+\.\d+-lo-\d{2}$/.test(code))).toBe(true);
  });
});
