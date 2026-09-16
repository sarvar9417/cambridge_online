import { describe, expect, it } from 'vitest';
import { CHAPTER_18_FINAL } from './lesson-content-chapter18-final';
import { lessonChapter } from './lesson-content-source-complete';

const EXPECTED_PAGES = Array.from({ length: 25 }, (_, index) => 425 + index);

const REQUIRED_IDS = [
  'h18-1811-dijkstra-steps',
  'h18-1811-dijkstra-worked',
  'h18-1812-astar-heuristic',
  'h18-1812-astar-f-values',
  'h18-1812-astar-route-activities',
  'h18-1821-ai-hierarchy',
  'h18-1822-machine-learning',
  'h18-1822-labelled-data',
  'h18-1822-supervised-unsupervised',
  'h18-1822-reinforcement-active',
  'h18-1823-neural-networks',
  'h18-1823-deep-workflow',
  'h18-1823-applications',
  'h18-1824-comparison',
  'h18-1825-future',
  'h18-1826-backprop',
  'h18-1826-regression',
  'h18-review-ai-learning',
  'h18-review-pathfinding',
] as const;

describe('Chapter 18 deep source-complete lesson', () => {
  it('is the active Cambridge 9618 Chapter 18 route', () => {
    expect(lessonChapter(18)).toBe(CHAPTER_18_FINAL);
    expect(CHAPTER_18_FINAL.title).toBe('Artificial intelligence (AI)');
    expect(CHAPTER_18_FINAL.sourceNote).toContain('pp.425–449');
    expect(CHAPTER_18_FINAL.coverage).toContain('25/25 printed chapter pages');
  });

  it('represents every printed source page from 425 through 449', () => {
    const pages = new Set(CHAPTER_18_FINAL.slides.flatMap(slide => slide.sourcePages ?? []));
    expect([...pages].sort((a, b) => a - b)).toEqual(EXPECTED_PAGES);
  });

  it('keeps all slide provenance inside the exact Chapter 18 range', () => {
    for (const slide of CHAPTER_18_FINAL.slides) {
      expect(slide.sourcePages?.length ?? 0, slide.id).toBeGreaterThan(0);
      for (const page of slide.sourcePages ?? []) {
        expect(page).toBeGreaterThanOrEqual(425);
        expect(page).toBeLessThanOrEqual(449);
      }
    }
  });

  it('contains shortest-path, learning-type, neural-network and training routes', () => {
    const ids = new Set(CHAPTER_18_FINAL.slides.map(slide => slide.id));
    for (const id of REQUIRED_IDS) expect(ids.has(id), id).toBe(true);
    expect(CHAPTER_18_FINAL.subtopics).toEqual([
      '18.1 Shortest path algorithms',
      '18.2 Artificial intelligence, machine learning and deep learning',
    ]);
  });

  it('preserves source terminology and named methods', () => {
    const text = JSON.stringify(CHAPTER_18_FINAL).toLowerCase();
    for (const token of [
      'dijkstra', 'a*', 'heuristic', 'manhattan', 'g(n)', 'h(n)', 'f(n)',
      'narrow ai', 'general ai', 'strong ai', 'machine learning', 'deep learning',
      'labelled data', 'unlabelled data', 'supervised learning', 'unsupervised learning',
      'reinforcement learning', 'semi-supervised', 'reward and punishment', 'web crawler',
      'artificial neural network', 'text mining', 'computer-assisted translation',
      'black box', 'back propagation', 'error gradient', 'static', 'recurrent', 'regression',
    ]) expect(text).toContain(token);
  });

  it('keeps printed review questions as study rather than live past-paper checkpoints', () => {
    const reviewSlides = CHAPTER_18_FINAL.slides.filter(slide => slide.section === 'Chapter review');
    expect(reviewSlides.length).toBe(2);
    expect(reviewSlides.every(slide => slide.examPractice !== true)).toBe(true);
  });
});
