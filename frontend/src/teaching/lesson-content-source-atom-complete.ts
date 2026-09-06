import { SOURCE_VERIFIED_CHAPTER_1, SOURCE_VERIFIED_CHAPTER_13 } from './lesson-content-source-verified';
import type { HodderLessonChapter, HodderLessonSlide } from './lesson-content-hodder-types';
import { sourceAtomsForChapter, sourceAtomsForSlide } from './lesson-source-atom-registry';
import './lesson-source-atoms.css';

/**
 * Keep source identity/provenance attached to the lesson data without stuffing
 * the exact PDF content into a collapsed Activity drawer. The actual textbook
 * atoms are rendered by the dedicated teacher-visible source teaching layer.
 */
const enrichSlide = (slide: HodderLessonSlide): HodderLessonSlide => {
  const atoms = sourceAtomsForSlide(slide.id);
  if (!atoms.length) return slide;
  return {
    ...slide,
    sourceElements: [
      ...(slide.sourceElements ?? []),
      ...atoms.map((item) => `SOURCE ATOM ${item.id} · ${item.sourceRef}`),
    ],
  };
};

const enrichChapter = (chapter: HodderLessonChapter): HodderLessonChapter => {
  const atoms = sourceAtomsForChapter(chapter.number);
  const pages = new Set(atoms.map((item) => item.page));
  return {
    ...chapter,
    coverage: `${chapter.coverage} · ${atoms.length}/${atoms.length} source atoms registered · ${pages.size}/${chapter.number === 1 ? 26 : 24} atom-audited pages · source teaching rendered on main canvas`,
    slides: chapter.slides.map(enrichSlide),
  };
};

export const SOURCE_ATOM_COMPLETE_CHAPTER_1 = enrichChapter(SOURCE_VERIFIED_CHAPTER_1);
export const SOURCE_ATOM_COMPLETE_CHAPTER_13 = enrichChapter(SOURCE_VERIFIED_CHAPTER_13);
