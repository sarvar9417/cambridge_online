import { describe, expect, it } from 'vitest';
import { lessonChapter } from './lesson-content-source-complete';
import { sourceAtomsForChapter, type LessonSourceAtom } from './lesson-source-atom-registry';

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
      expect(chapter.coverage).toContain(`${atoms.length}/${atoms.length} source tasks board-visible`);

      for (const atom of atoms) {
        const slide = chapter.slides.find((item) => item.id === atom.targetSlideId);
        expect(slide, `Missing target slide for ${atom.id}`).toBeTruthy();
        const richText = JSON.stringify(slide!.richBlocks ?? []);
        expect(richText, `${atom.id} is only hidden in the drawer`).toContain(atom.sourceRef);
        expect(richText).toContain(`Hodder p.${atom.page}`);
        for (const line of atom.needles) {
          expect(richText, `${atom.id} is missing board-visible source line: ${line}`).toContain(line);
        }
      }
    });
  }

  it('keeps the exact chapter-review tasks visible rather than title-only', () => {
    for (const chapterNumber of [1, 13] as const) {
      const chapter = lessonChapter(chapterNumber)!;
      const reviews = sourceAtomsForChapter(chapterNumber).filter((item) => item.kind === 'review');
      for (const atom of reviews) {
        const slide = chapter.slides.find((item) => item.id === atom.targetSlideId)!;
        const richText = JSON.stringify(slide.richBlocks ?? []);
        expect(richText).toContain(atom.sourceRef);
        expect(richText).toContain(atom.needles[0]);
      }
    }
  });
});
