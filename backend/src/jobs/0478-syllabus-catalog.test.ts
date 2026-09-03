import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { syllabusCatalogSchema } from './syllabus-catalog-import.js';

async function load(name: string) {
  const path = fileURLToPath(new URL(`../database/catalogs/${name}`, import.meta.url));
  return syllabusCatalogSchema.parse(JSON.parse(await readFile(path, 'utf8')));
}

const counts = (catalog: Awaited<ReturnType<typeof load>>) => ({
  topics: catalog.topics.length,
  subtopics: catalog.topics.reduce((sum, topic) => sum + topic.subtopics.length, 0),
  learningObjectives: catalog.topics.reduce(
    (sum, topic) => sum + topic.subtopics.reduce((inner, subtopic) => inner + subtopic.learningObjectives.length, 0),
    0,
  ),
});

describe('0478 syllabus catalogs', () => {
  it('models the 2015-2022 assessment family as IGCSE with the historical 75/50 mark split', async () => {
    const catalog = await load('0478-2015-2022.json');
    expect(catalog.code).toBe('0478');
    expect([catalog.validFrom, catalog.validTo]).toEqual([2015, 2022]);
    expect(catalog.components).toHaveLength(2);
    expect(catalog.components.map((component) => component.level)).toEqual(['IGCSE', 'IGCSE']);
    expect(catalog.components.map((component) => [component.number, component.totalMarks, component.weightingPct])).toEqual([
      [1, 75, 60],
      [2, 50, 40],
    ]);
    expect(counts(catalog)).toEqual({ topics: 8, subtopics: 23, learningObjectives: 87 });
    expect(catalog.topics.flatMap((topic) => topic.subtopics.map((subtopic) => subtopic.code))).toContain('2.1.1');
  });

  it('models the 2023-2025 revised assessment family as two 75-mark papers', async () => {
    const catalog = await load('0478-2023-2025.json');
    expect([catalog.validFrom, catalog.validTo]).toEqual([2023, 2025]);
    expect(catalog.components.map((component) => [component.number, component.name, component.totalMarks, component.weightingPct])).toEqual([
      [1, 'Computer Systems', 75, 50],
      [2, 'Algorithms, Programming and Logic', 75, 50],
    ]);
    expect(counts(catalog)).toEqual({ topics: 10, subtopics: 24, learningObjectives: 96 });
    const chapter7 = catalog.topics.find((topic) => topic.number === 7);
    expect(chapter7?.subtopics[0]?.code).toBe('7');
    expect(chapter7?.subtopics[0]?.learningObjectives).toHaveLength(9);
    expect(chapter7?.subtopics[0]?.learningObjectives[0]?.text.toLowerCase()).toContain('program development life cycle');
  });

  it('keeps the historical and revised validity windows non-overlapping', async () => {
    const historical = await load('0478-2015-2022.json');
    const revised = await load('0478-2023-2025.json');
    expect(historical.validTo).toBeLessThan(revised.validFrom);
    expect(historical.isActive).toBe(false);
    expect(revised.isActive).toBe(false);
  });
});
