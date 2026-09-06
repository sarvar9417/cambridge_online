import { describe, expect, it } from 'vitest';
import { CHAPTER_7_PAST_PAPER_CHECKPOINTS } from './chapter7-past-paper-checkpoints';
import { lessonChapter } from './lesson-content-source-complete';

const text=(value:unknown)=>JSON.stringify(value);

describe('Lesson Studio exam enrichment coverage',()=>{
  it('keeps an exam checkpoint for every IGCSE Chapter 7 subtopic',()=>{
    expect(CHAPTER_7_PAST_PAPER_CHECKPOINTS.map(slide=>slide.subtopicCode)).toEqual([
      '7.1','7.2','7.3','7.4','7.5','7.6','7.7','7.8','7.9',
    ]);
    CHAPTER_7_PAST_PAPER_CHECKPOINTS.forEach(slide=>{
      expect(slide.checkpointSyllabusCode).toBe('0478');
      expect(slide.learningObjectiveCodes?.length).toBeGreaterThan(0);
      expect(slide.examPractice).toBe(true);
    });
  });

  it('keeps exact-LO past-paper checkpoints throughout both 9618 lessons',()=>{
    for(const chapterNo of [1,13]){
      const chapter=lessonChapter(chapterNo);
      expect(chapter).not.toBeNull();
      const checkpoints=chapter!.slides.filter(slide=>slide.examPractice&&Boolean(slide.learningObjectiveCodes?.length));
      expect(checkpoints.length).toBeGreaterThan(8);
      checkpoints.forEach(slide=>{
        expect(slide.checkpointSyllabusCode??'9618').toBe('9618');
        expect(slide.learningObjectiveCodes?.length).toBeGreaterThan(0);
        expect(slide.checkpointYearFrom).toBe(2021);
        expect(slide.checkpointYearTo).toBe(2025);
      });

      const noDirect=chapter!.slides.filter(slide=>slide.examPractice&&Boolean(slide.checkpointUnavailableReason));
      noDirect.forEach(slide=>{
        expect(slide.learningObjectiveCodes).toBeUndefined();
        expect(slide.checkpointUnavailableReason?.length).toBeGreaterThan(0);
      });
    }
  });

  it('retains the source-complete coverage contracts while exam enrichment is layered on top',()=>{
    expect(text(lessonChapter(1))).toContain('26/26 page fingerprints');
    expect(text(lessonChapter(13))).toContain('24/24 page fingerprints');
    expect(text(CHAPTER_7_PAST_PAPER_CHECKPOINTS)).toContain('Cambridge 0478 corpus');
  });
});
