import { describe, expect, it } from 'vitest';
import { lessonChapter, type LessonSlide } from './lesson-content-source-complete';
import { sourceAtomsForChapter, type LessonSourceAtom } from './lesson-source-atom-registry';
import { studentFacingSlide, studentFacingText } from './lesson-student-facing';

const isBoardPracticeAtom = (item: LessonSourceAtom) =>
  item.kind === 'prior' ||
  item.kind === 'activity' ||
  item.kind === 'review' ||
  (item.kind === 'extension' && /activity/i.test(item.sourceRef));

const learnerTaskLine = (atom: LessonSourceAtom) => {
  let value = atom.needles.at(-1) ?? '';
  for (const separator of [' · ', ': ']) {
    const prefix = `${atom.sourceRef}${separator}`;
    if (value.toLowerCase().startsWith(prefix.toLowerCase())) {
      value = value.slice(prefix.length).trim();
      break;
    }
  }
  return studentFacingText(value);
};

describe('board-visible coursebook practice', () => {
  for (const chapterNumber of [1, 13] as const) {
    it(`keeps every Chapter ${chapterNumber} source task learner-visible while provenance stays exact`, () => {
      const chapter = lessonChapter(chapterNumber)!;
      const atoms = sourceAtomsForChapter(chapterNumber).filter(isBoardPracticeAtom);
      expect(atoms.length).toBeGreaterThan(0);
      expect(chapter.coverage).toContain(`${atoms.length}/${atoms.length} source tasks board-visible`);

      for (const atom of atoms) {
        const sourceSlide = chapter.slides.find((item) => item.id === atom.targetSlideId);
        expect(sourceSlide, `Missing target slide for ${atom.id}`).toBeTruthy();

        const evidence = sourceSlide!.sourceAtomEvidence?.find((item) => item.id === atom.id);
        expect(evidence, `${atom.id} is missing exact source evidence`).toBeTruthy();
        expect(evidence?.sourceRef).toBe(atom.sourceRef);
        expect(evidence?.page).toBe(atom.page);
        expect(evidence?.lines).toEqual(atom.needles);

        const projected = studentFacingSlide(sourceSlide as LessonSlide);
        const richText = JSON.stringify(projected.richBlocks ?? []);
        const distinctiveTaskLine = learnerTaskLine(atom);
        expect(distinctiveTaskLine, `${atom.id} has no task data`).toBeTruthy();
        expect(richText, `${atom.id} has no learner-visible task data`).toContain(distinctiveTaskLine);
        expect(richText).not.toContain(`Hodder p.${atom.page}`);
        expect(richText).not.toContain(`SOURCE ATOM ${atom.id}`);
      }
    });
  }

  it('keeps chapter-review question content visible with clean learner labels', () => {
    for (const chapterNumber of [1, 13] as const) {
      const chapter = lessonChapter(chapterNumber)!;
      const reviews = sourceAtomsForChapter(chapterNumber).filter((item) => item.kind === 'review');
      for (const atom of reviews) {
        const sourceSlide = chapter.slides.find((item) => item.id === atom.targetSlideId)!;
        const projected = studentFacingSlide(sourceSlide as LessonSlide);
        const richText = JSON.stringify(projected.richBlocks ?? []);
        expect(sourceSlide.sourceAtomEvidence?.find((item) => item.id === atom.id)?.lines).toEqual(atom.needles);
        expect(richText).toContain(learnerTaskLine(atom));
        expect(richText).not.toContain(`Hodder p.${atom.page}`);
      }
    }
  });
});
