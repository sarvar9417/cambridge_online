import { describe, expect, it } from 'vitest';
import { lessonChapter } from './lesson-content-source-complete';
import { sourceAtomsForChapter, type LessonSourceAtom } from './lesson-source-atom-registry';
import { sourceTeachingAtomsForSlide } from './lesson-source-teaching-model';

const isBoardPracticeAtom = (item: LessonSourceAtom) =>
  item.kind === 'prior' ||
  item.kind === 'activity' ||
  item.kind === 'review' ||
  (item.kind === 'extension' && /activity/i.test(item.sourceRef));

describe('board-visible Hodder source practice', () => {
  for (const chapterNumber of [1, 13] as const) {
    it(`keeps every Chapter ${chapterNumber} source task on the main lesson canvas`, () => {
      const chapter = lessonChapter(chapterNumber)!;
      const atoms = sourceAtomsForChapter(chapterNumber).filter(isBoardPracticeAtom);
      expect(atoms.length).toBeGreaterThan(0);
      expect(chapter.coverage).toContain('source teaching rendered on main canvas');

      for (const atom of atoms) {
        expect(chapter.slides.some((item) => item.id === atom.targetSlideId), `Missing target slide for ${atom.id}`).toBe(true);
        const visible=sourceTeachingAtomsForSlide(chapterNumber,atom.targetSlideId).find(item=>item.id===atom.id);
        expect(visible,`${atom.id} is not exposed to the teacher canvas`).toBeTruthy();
        expect(visible!.sourceRef).toBe(atom.sourceRef);
        expect(visible!.lines).toEqual(atom.needles);
      }
    });
  }

  it('keeps the exact chapter-review tasks visible rather than title-only', () => {
    for (const chapterNumber of [1, 13] as const) {
      const reviews = sourceAtomsForChapter(chapterNumber).filter((item) => item.kind === 'review');
      for (const atom of reviews) {
        const visible=sourceTeachingAtomsForSlide(chapterNumber,atom.targetSlideId).find(item=>item.id===atom.id);
        expect(visible).toBeTruthy();
        expect(visible!.sourceRef).toBe(atom.sourceRef);
        expect(visible!.lines).toEqual(atom.needles);
      }
    }
  });
});
