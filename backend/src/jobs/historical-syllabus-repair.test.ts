import { describe, expect, it } from 'vitest';
import { historicalWindowForYear, validateRepairPlan, type HistoricalRepairPlan } from './historical-syllabus-repair.js';

const basePlan = (): HistoricalRepairPlan => ({
  current: { id: 'current', versionLabel: '2026-2028', validFrom: 2021, validTo: 2028, components: 4, topics: 20, subtopics: 44, learningObjectives: 203 },
  historical: [
    { id: 'old-a', versionLabel: '2021-2023', validFrom: 2021, validTo: 2023, components: 4, topics: 20, subtopics: 44, learningObjectives: 215 },
    { id: 'old-b', versionLabel: '2024-2025', validFrom: 2024, validTo: 2025, components: 4, topics: 20, subtopics: 44, learningObjectives: 219 },
  ],
  sourcePapersByVersion: [], affectedSourcePapers: 230, affectedQuestions: 159, affectedSubtopicLinks: 300, affectedLearningObjectiveLinks: 0, blockers: [],
});

describe('historical syllabus repair safety', () => {
  it('maps only the historical 2021-2025 windows', () => {
    expect(historicalWindowForYear(2021)?.versionLabel).toBe('2021-2023');
    expect(historicalWindowForYear(2023)?.versionLabel).toBe('2021-2023');
    expect(historicalWindowForYear(2024)?.versionLabel).toBe('2024-2025');
    expect(historicalWindowForYear(2025)?.versionLabel).toBe('2024-2025');
    expect(historicalWindowForYear(2026)).toBeNull();
  });

  it('accepts a complete historical taxonomy plan', () => {
    expect(validateRepairPlan(basePlan(), { requireHistorical: true })).toEqual([]);
  });

  it('blocks a missing or incomplete historical version', () => {
    const plan = basePlan();
    plan.historical = plan.historical.filter((item) => item.versionLabel !== '2024-2025');
    expect(validateRepairPlan(plan, { requireHistorical: true })).toContain('historical_syllabus_missing:2024-2025');
    const incomplete = basePlan();
    incomplete.historical[0]!.subtopics = 43;
    expect(validateRepairPlan(incomplete, { requireHistorical: true })).toContain('historical_syllabus_incomplete:2021-2023');
  });

  it('refuses to guess a cross-version learning-objective mapping', () => {
    const plan = basePlan();
    plan.affectedLearningObjectiveLinks = 12;
    expect(validateRepairPlan(plan, { requireHistorical: true })).toContain('historical_lo_links_require_reclassification:12');
    expect(validateRepairPlan(plan, { requireHistorical: true, allowDropLearningObjectiveLinks: true })).not.toContain('historical_lo_links_require_reclassification:12');
  });
});
