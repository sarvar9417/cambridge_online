import { describe, expect, it } from 'vitest';
import { LESSON_CHAPTERS } from './lesson-content-source-complete';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { buildTopicPlan, flattenTopicPages } from './lesson-topic-plan';

const chapters = [...LESSON_CHAPTERS, CHAPTER_7];

describe('book-like topic plan', () => {
  it('places every active-route slide exactly once into topic pages', () => {
    for (const chapter of chapters) {
      const topics = buildTopicPlan(chapter.slides, chapter.subtopics);
      const routed = flattenTopicPages(topics).flatMap(item => item.page.slides.map(slide => slide.id));
      expect(routed, `Chapter ${chapter.number} routed slide count`).toHaveLength(chapter.slides.length);
      expect(new Set(routed).size, `Chapter ${chapter.number} unique slide ids`).toBe(chapter.slides.length);
      expect(new Set(routed), `Chapter ${chapter.number} exact slide ids`).toEqual(new Set(chapter.slides.map(slide => slide.id)));
    }
  });

  it('keeps topic-specific Past Paper practice as the final page of every topic that has checkpoints', () => {
    for (const chapter of chapters) {
      const topics = buildTopicPlan(chapter.slides, chapter.subtopics);
      topics.filter(topic => topic.code !== 'overview').forEach(topic => {
        const topicSlides = chapter.slides.filter(slide => slide.subtopicCode === topic.code || slide.section.startsWith(topic.code));
        const hasCheckpoint = topicSlides.some(slide => slide.examPractice);
        if (!hasCheckpoint) return;
        const last = topic.pages.at(-1);
        expect(last?.kind, `${chapter.number} ${topic.code} last page`).toBe('practice');
        expect(last?.title, `${chapter.number} ${topic.code} practice label`).toBe('Past Paper practice');
        expect(last?.slides.some(slide => slide.examPractice), `${chapter.number} ${topic.code} checkpoint included`).toBe(true);
      });
    }
  });

  it('groups source-backed teaching by source-file page instead of arbitrary 14-screen lessons', () => {
    for (const chapter of chapters) {
      const topics = buildTopicPlan(chapter.slides, chapter.subtopics);
      const studyPages = flattenTopicPages(topics).filter(item => item.page.kind === 'study');
      expect(studyPages.length, `Chapter ${chapter.number} study pages`).toBeGreaterThan(0);
      studyPages.forEach(({ page }) => {
        if (page.bookPage == null) return;
        expect(page.slides.every(slide => {
          const evidencePages = slide.sourceAtomEvidence?.map(item => item.page) ?? [];
          const fallbackPages = slide.sourcePages ?? [];
          return evidencePages.includes(page.bookPage!) || (!evidencePages.length && fallbackPages.includes(page.bookPage!));
        }), `${chapter.number} ${page.id} source-page grouping`).toBe(true);
      });
    }
  });
});
