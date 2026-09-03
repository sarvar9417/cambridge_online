import { HODDER_CHAPTER_1 } from './lesson-content-hodder-ch1';
import { HODDER_CHAPTER_13 } from './lesson-content-hodder-ch13';
import { noDirectCheckpoint, type HodderLessonChapter, type HodderLessonSlide } from './lesson-content-hodder-types';

export type { LessonVisual } from './lesson-content-full';
export type {
  HodderLessonChapter as LessonChapter,
  HodderLessonSlide as LessonSlide,
  LessonRichBlock,
  LessonTable,
} from './lesson-content-hodder-types';

const insertAfter=(slides:HodderLessonSlide[],afterId:string,addition:HodderLessonSlide)=>{
  const index=slides.findIndex(slide=>slide.id===afterId);
  if(index<0)throw new Error(`Missing Hodder lesson anchor: ${afterId}`);
  return [...slides.slice(0,index+1),addition,...slides.slice(index+1)];
};

let chapter1Slides=HODDER_CHAPTER_1.slides;
chapter1Slides=insertAfter(chapter1Slides,'h1-memory-units',noDirectCheckpoint(
  'h1-cp-memory-prefixes','1.1 Data representation','Past papers: binary versus decimal memory prefixes',
  'The uploaded Hodder chapter teaches SI versus IEC memory-size prefixes here, but the historical 2021–2025 taxonomy does not expose a dedicated exact LO for this newer objective. CamPath therefore does not inject a broad number-base question as a substitute.',[6,7],
));
chapter1Slides=insertAfter(chapter1Slides,'h1-sound-editing',noDirectCheckpoint(
  'h1-cp-sound-editing','1.2 Multimedia','Past papers: sound-editing operations',
  'Sound-editing features are included in Hodder for complete teaching coverage, but there is no exact 2021–2025 historical LO dedicated to editing operations. The checkpoint remains explicit rather than mixing in sampling questions.',[20],
));
chapter1Slides=insertAfter(chapter1Slides,'h1-132-general',noDirectCheckpoint(
  'h1-cp-general-reduction','1.3 File compression','Past papers: general media-size reduction methods',
  'Figure 1.9 combines several source-quality reductions across image, sound and video. The historical corpus has compression LOs, but no exact LO representing this combined Hodder-only list, so the lesson does not silently broaden the checkpoint.',[24],
));

const CHAPTER_1:HodderLessonChapter={...HODDER_CHAPTER_1,slides:chapter1Slides};
export const LESSON_CHAPTERS = [CHAPTER_1, HODDER_CHAPTER_13];
export const lessonChapter = (number: number) => LESSON_CHAPTERS.find((chapter) => chapter.number === number) ?? null;
