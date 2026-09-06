import { describe, expect, it } from 'vitest';
import { normalizeLessonExamInsightTrust } from './lesson-exam-insight-trust';

describe('Lesson Studio exam insight trust labels',()=>{
  it('does not overstate partial 9618 mark-scheme review coverage',()=>{
    const source='Enrichment source: Drive AS topical notes + reviewed 9618 mark schemes. This is lesson guidance.';
    const result=normalizeLessonExamInsightTrust(source);
    expect(result).not.toContain('reviewed 9618 mark schemes');
    expect(result).toContain('9618 QP corpus + approved/review-tracked MS');
    expect(result).toContain('trust shown per question');
  });

  it('leaves the audited approved 0478 provenance unchanged',()=>{
    const source='Enrichment source: 0478 approved QP/MS corpus · 2015–2026.';
    expect(normalizeLessonExamInsightTrust(source)).toBe(source);
  });
});
