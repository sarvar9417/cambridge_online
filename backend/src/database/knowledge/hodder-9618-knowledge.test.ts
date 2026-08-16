import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Catalog = {
  topics: Array<{
    subtopics: Array<{ code: string; learningObjectives: Array<{ code: string }> }>;
  }>;
};

type SourceIndex = {
  stats: { chapters: number; hodderSections: number; fineGrainedUnits: number; canonicalSubtopicsCovered: number };
  sections: Array<[string, string, number, number, string[], string]>;
  units: Array<[string, string, number, number, string[], string]>;
};

type Crosswalk = {
  stats: { canonicalLearningObjectivesMapped: number; canonicalSubtopicsCovered: number; hodderFineUnitsAvailable: number };
  mapping: Record<string, string[]>;
};

const here = dirname(fileURLToPath(import.meta.url));
const readJson = <T>(path: string): T => JSON.parse(readFileSync(resolve(here, path), 'utf8')) as T;

describe('Hodder 9618 knowledge crosswalk', () => {
  const catalog = readJson<Catalog>('../syllabus/9618-catalog.json');
  const source = readJson<SourceIndex>('./hodder-9618-source-index.json');
  const crosswalk = readJson<Crosswalk>('./hodder-9618-lo-crosswalk.json');

  const catalogSubtopics = catalog.topics.flatMap((topic) => topic.subtopics);
  const canonicalSubtopicCodes = new Set(catalogSubtopics.map((subtopic) => subtopic.code));
  const canonicalLoCodes = new Set(catalogSubtopics.flatMap((subtopic) => subtopic.learningObjectives.map((lo) => lo.code)));
  const unitByCode = new Map(source.units.map((unit) => [unit[0], unit]));
  const sectionByCode = new Map(source.sections.map((section) => [section[0], section]));

  it('preserves the expected structural inventory', () => {
    expect(source.stats).toEqual({ chapters: 20, hodderSections: 52, fineGrainedUnits: 167, canonicalSubtopicsCovered: 44 });
    expect(source.sections).toHaveLength(52);
    expect(source.units).toHaveLength(167);
    expect(canonicalSubtopicCodes.size).toBe(44);
  });

  it('maps every current internal learning-objective code exactly once', () => {
    expect(new Set(Object.keys(crosswalk.mapping))).toEqual(canonicalLoCodes);
    expect(crosswalk.stats.canonicalLearningObjectivesMapped).toBe(canonicalLoCodes.size);
  });

  it('never points an LO at an unknown or out-of-scope Hodder unit', () => {
    for (const [loCode, sourceCodes] of Object.entries(crosswalk.mapping)) {
      for (const sourceCode of sourceCodes) {
        const sourceRef = unitByCode.get(sourceCode) ?? sectionByCode.get(sourceCode);
        expect(sourceRef, `${loCode} -> ${sourceCode}`).toBeDefined();
        expect(sourceRef?.[5], `${loCode} -> ${sourceCode}`).toBe('mapped');
      }
    }
  });

  it('records the important 2026 structural moves explicitly', () => {
    expect(unitByCode.get('16.2.1')?.[4]).toEqual(['15.1']);
    expect(unitByCode.get('16.3.1')?.[4]).toEqual(['16.2']);
    expect(unitByCode.get('17.3.1')?.[4]).toEqual(['17.1']);
    expect(unitByCode.get('18.1.1')?.[4]).toEqual(['18.1']);
  });
});
