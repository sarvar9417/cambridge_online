import { describe, expect, it } from 'vitest';
import { LESSON_CHAPTERS } from './lesson-content-source-complete';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import type { HodderLessonSlide } from './lesson-content-hodder-types';
import { buildTopicPlan, flattenTopicPages, sourceFilePageForSlide } from './lesson-topic-plan';

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

  it('normalizes mixed printed/extract page numbers before grouping a physical source page', () => {
    for (const chapter of chapters) {
      const topics = buildTopicPlan(chapter.slides, chapter.subtopics);
      const studyPages = flattenTopicPages(topics).filter(item => item.page.kind === 'study');
      expect(studyPages.length, `Chapter ${chapter.number} study pages`).toBeGreaterThan(0);
      studyPages.forEach(({ topic, page }) => {
        if (page.bookPage == null) return;
        expect(page.slides.every(slide => sourceFilePageForSlide(topic.code,slide)===page.bookPage), `${chapter.number} ${page.id} source-page grouping`).toBe(true);
      });
    }
  });

  it('never mixes two physical source-file pages inside one exact transcript slide', () => {
    for(const chapter of chapters){
      const exact=(chapter.slides as HodderLessonSlide[]).filter(slide=>slide.id.startsWith('pdf-first-')&&!slide.id.startsWith('pdf-first-lens-'));
      expect(exact.length,`Chapter ${chapter.number} exact transcript pages`).toBeGreaterThan(0);
      exact.forEach(slide=>{
        const code=slide.subtopicCode!;
        const evidencePages=new Set((slide.sourceAtomEvidence??[]).map(item=>sourceFilePageForSlide(code,{...slide,sourcePages:[],sourceAtomEvidence:[item]})));
        expect(evidencePages.size,`${slide.id} physical source pages`).toBe(1);
        expect(slide.sourcePages?.length,`${slide.id} printed source page`).toBe(1);
      });
    }
  });

  it('uses page vocabulary instead of stale screen/presentation vocabulary in exact source transcripts', () => {
    for(const chapter of chapters){
      (chapter.slides as HodderLessonSlide[])
        .filter(slide=>slide.id.startsWith('pdf-first-')&&!slide.id.startsWith('pdf-first-lens-'))
        .forEach(slide=>{
          expect(slide.eyebrow).toContain('COURSEBOOK SOURCE');
          expect(slide.eyebrow).not.toContain('COURSEBOOK LESSON');
          expect(slide.title.toLowerCase()).not.toContain('coursebook sequence');
          expect(slide.lead.toLowerCase()).not.toContain('next screen');
        });
    }
  });
});
