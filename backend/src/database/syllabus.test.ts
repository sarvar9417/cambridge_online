import { describe, expect, it } from 'vitest';
import { COMPONENTS, SUBTOPIC_COUNT, TOPICS } from './syllabus-9618-2026.js';

describe('9618 syllabus structure', () => {
  it('carries all 20 official topics in order', () => {
    expect(TOPICS).toHaveLength(20);
    expect(TOPICS.map((topic) => topic.number)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
  });

  it('carries all 44 official subtopics', () => {
    expect(SUBTOPIC_COUNT).toBe(44);
  });

  it('numbers every subtopic code under its own topic', () => {
    for (const topic of TOPICS) {
      for (const [index, subtopic] of topic.subtopics.entries()) {
        expect(subtopic.code).toBe(`${topic.number}.${index + 1}`);
      }
    }
  });

  it('maps topics to the components the syllabus assesses them in', () => {
    const componentOf = (number: number) =>
      TOPICS.find((topic) => topic.number === number)!.component;
    // Paper 1 assesses sections 1-8, Paper 2 sections 9-12,
    // Paper 3 sections 13-18 and Paper 4 sections 19-20.
    expect([1, 4, 8].map(componentOf)).toEqual([1, 1, 1]);
    expect([9, 12].map(componentOf)).toEqual([2, 2]);
    expect([13, 18].map(componentOf)).toEqual([3, 3]);
    expect([19, 20].map(componentOf)).toEqual([4, 4]);
  });

  it('marks sections 1-12 as AS and 13-20 as A2', () => {
    for (const topic of TOPICS) {
      expect(topic.level).toBe(topic.number <= 12 ? 'AS' : 'A2');
    }
  });

  it('describes four components worth 75 marks each', () => {
    expect(COMPONENTS).toHaveLength(4);
    expect(COMPONENTS.every((component) => component.totalMarks === 75)).toBe(true);
    expect(COMPONENTS.map((component) => component.durationMin)).toEqual([90, 120, 90, 150]);
  });

  it('has no duplicate subtopic code across the syllabus', () => {
    const codes = TOPICS.flatMap((topic) => topic.subtopics.map((subtopic) => subtopic.code));
    expect(new Set(codes).size).toBe(codes.length);
  });
});
