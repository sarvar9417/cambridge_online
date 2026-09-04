import {
  SOURCE_EXHAUSTIVE_CHAPTER_1,
  SOURCE_EXHAUSTIVE_CHAPTER_13,
} from './lesson-content-source-exhaustive';
import type {
  HodderLessonChapter,
  HodderLessonSlide,
  LessonRichBlock,
} from './lesson-content-hodder-types';

const patch = (
  slides: HodderLessonSlide[],
  id: string,
  mutate: (slide: HodderLessonSlide) => HodderLessonSlide,
) => slides.map((slide) => (slide.id === id ? mutate(slide) : slide));

const appendBlocks = (
  slide: HodderLessonSlide,
  blocks: LessonRichBlock[],
  sourceElements: string[] = [],
): HodderLessonSlide => ({
  ...slide,
  richBlocks: [...(slide.richBlocks ?? []), ...blocks],
  sourceElements: [...(slide.sourceElements ?? []), ...sourceElements],
});

let chapter1Slides = [...SOURCE_EXHAUSTIVE_CHAPTER_1.slides];

chapter1Slides = patch(chapter1Slides, 'h1-111-number-systems', (slide) =>
  appendBlocks(slide, [
    {
      kind: 'callout',
      tone: 'info',
      title: 'Source cross-chapter note',
      text: 'Hodder explicitly defers decimal-fraction representation to Chapter 13 because it is more complex than the integer positional model introduced here.',
    },
  ], ['Decimal fractions explicitly deferred to Chapter 13']),
);

chapter1Slides = patch(chapter1Slides, 'h1-115-unicode', (slide) =>
  appendBlocks(slide, [
    {
      kind: 'source-note',
      title: 'Historical Unicode storage wording preserved',
      sourceLabel: 'Hodder printed source',
      sourceText: 'The source contrasts ASCII as one byte per character with Unicode supporting up to four bytes per character, and describes the original Unicode design goal as uniform 16-bit or 32-bit character codes.',
      examSafeLabel: 'Teaching clarification',
      examSafeText: 'Keep this as the coursebook\'s historical explanation. Modern Unicode distinguishes code points from concrete encodings such as UTF-8/UTF-16/UTF-32, so do not turn the historical 16/32-bit wording into a universal modern encoding rule.',
    },
  ], ['ASCII one-byte versus Unicode up-to-four-byte source comparison', 'Historical Unicode 16-bit/32-bit design-goal wording']),
);

chapter1Slides = patch(chapter1Slides, 'h1-124-video', (slide) =>
  appendBlocks(slide, [
    {
      kind: 'callout',
      tone: 'info',
      title: 'Hodder video data-rate example',
      text: 'The source gives an illustrative uncompressed/very lightly processed video data-rate figure of about 25 MB per second before discussing compressed digital-video storage and frame rate. Treat this as the coursebook example, not as a universal rate for every video format.',
    },
  ], ['Video 25 MB per second source example']),
);

chapter1Slides = patch(chapter1Slides, 'h1-131-mp3-jpeg', (slide) =>
  appendBlocks(slide, [
    {
      kind: 'callout',
      tone: 'info',
      title: 'MP3 reduction worked source example',
      text: 'Hodder illustrates perceptual audio compression with an 80 MB source file reduced to about 8 MB, a 90% reduction, before discussing the quality/bit-rate trade-off.',
    },
  ], ['MP3 80 MB to 8 MB / 90 percent reduction example']),
);

chapter1Slides = patch(chapter1Slides, 'h1-rle-text', (slide) =>
  appendBlocks(slide, [
    {
      kind: 'callout',
      tone: 'info',
      title: 'Flag-based RLE source result',
      text: 'For the longer mixed-run example, the source uses 255 as a flag before worthwhile runs and compares 32 original bytes with 15 encoded bytes, a reduction of about 53%. Short non-run data is stored directly so naive RLE does not expand it unnecessarily.',
    },
  ], ['RLE flag byte 255', 'RLE 32 bytes to 15 bytes / 53 percent reduction']),
);

chapter1Slides = patch(chapter1Slides, 'h1-rle-images', (slide) =>
  appendBlocks(slide, [
    {
      kind: 'callout',
      tone: 'info',
      title: 'Colour-image RLE percentage retained',
      text: 'For the four-colour 8 × 8 RGB example the source compares 192 uncompressed RGB values with 92 RLE values, corresponding to roughly a 52% reduction in the simplified classroom model.',
    },
  ], ['Figure 1.8 simplified 52 percent reduction']),
);

let chapter13Slides = [...SOURCE_EXHAUSTIVE_CHAPTER_13.slides];

chapter13Slides = patch(chapter13Slides, 'h13-sets-classes', (slide) =>
  appendBlocks(slide, [
    {
      kind: 'callout',
      tone: 'info',
      title: 'Coursebook progression',
      text: 'Hodder introduces classes here only as a composite-type concept and explicitly says classes and objects are considered in more depth in Chapter 20.',
    },
  ], ['Classes and objects linked forward to Chapter 20']),
);

chapter13Slides = patch(chapter13Slides, 'h13-float-format', (slide) =>
  appendBlocks(slide, [
    {
      kind: 'callout',
      tone: 'info',
      title: 'Why floating point is introduced',
      text: 'The source contrasts fixed-point integer storage with floating point: 8-bit two\'s-complement fixed point gives −128 to +127 and the coursebook states a 16-bit example range of −16,384 to +16,383. Fixed point limits range and does not provide the fractional flexibility needed here, motivating M × 2^E.',
    },
  ], ['Fixed-point 8-bit and 16-bit range contrast before floating point']),
);

const finish = (
  chapter: HodderLessonChapter,
  slides: HodderLessonSlide[],
): HodderLessonChapter => ({
  ...chapter,
  slides,
  coverage: `${chapter.coverage} · final PDF-detail hardening applied`,
});

export const SOURCE_FINAL_CHAPTER_1 = finish(SOURCE_EXHAUSTIVE_CHAPTER_1, chapter1Slides);
export const SOURCE_FINAL_CHAPTER_13 = finish(SOURCE_EXHAUSTIVE_CHAPTER_13, chapter13Slides);
