import {
  SOURCE_ATOM_COMPLETE_CHAPTER_1,
  SOURCE_ATOM_COMPLETE_CHAPTER_13,
} from './lesson-content-source-atom-complete';
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

const appendKeyTerms = (
  slide: HodderLessonSlide,
  terms: NonNullable<HodderLessonSlide['keyTerms']>,
  sourceElements: string[] = [],
): HodderLessonSlide => ({
  ...slide,
  keyTerms: [...(slide.keyTerms ?? []), ...terms],
  sourceElements: [...(slide.sourceElements ?? []), ...sourceElements],
});

const sourceNote = (
  title: string,
  sourceText: string,
  examSafeText: string,
): LessonRichBlock => ({
  kind: 'source-note',
  title,
  sourceLabel: 'Hodder printed source',
  sourceText,
  examSafeLabel: 'Teaching clarification',
  examSafeText,
});

let chapter1Slides = [...SOURCE_ATOM_COMPLETE_CHAPTER_1.slides];

chapter1Slides = patch(chapter1Slides, 'h1-112-signed', (slide) =>
  appendBlocks(slide, [
    {
      kind: 'paragraph',
      text: 'Source scope detail: after introducing one’s complement, two’s complement and sign-and-magnitude, Hodder deliberately uses two’s complement for the remainder of the chapter because it makes binary addition and subtraction more straightforward; the reader is left to investigate one’s-complement and sign-and-magnitude arithmetic further.',
    },
  ], ['Signed-representation source scope and arithmetic rationale']),
);

chapter1Slides = patch(chapter1Slides, 'h1-112-arithmetic', (slide) =>
  appendBlocks(slide, [
    {
      kind: 'callout',
      tone: 'info',
      title: 'Hodder arithmetic checks that must remain visible',
      text: 'When two positive signed values are added, a negative stored result is a warning sign for overflow; likewise two negative values should not produce a positive mathematical result. In the 95 − 68 worked subtraction, a carry beyond the fixed 8-bit word creates a ninth bit, which is discarded, leaving 00011011 = 27.',
    },
  ], ['Same-sign overflow sanity check', 'Fixed-width subtraction discards ninth carry bit']),
);

chapter1Slides = patch(chapter1Slides, 'h1-memory-units', (slide) =>
  appendBlocks(slide, [
    sourceNote(
      'Printed byte wording retained explicitly',
      'The source describes the byte as the smallest memory unit and then refers to 16-bit and 32-bit systems as using larger multiples of 8.',
      'Teach the source statement as historical coursebook wording while keeping the exam-safe unit relationships explicit: a byte is 8 bits in Cambridge calculations, and larger word/register widths are multiples of bits/bytes rather than re-definitions of the byte.',
    ),
  ], ['Printed byte/memory-unit wording and teaching clarification']),
);

chapter1Slides = patch(chapter1Slides, 'h1-115-ascii', (slide) => {
  const withTerms = appendKeyTerms(slide, [
    { term: 'ASCII code', definition: 'A coding system for keyboard characters together with control codes.' },
  ], ['ASCII code formal source key term']);
  return appendBlocks(withTerms, [
    {
      kind: 'paragraph',
      text: 'Hodder’s historical source detail: ASCII was established for communication/computer systems in 1963 and a newer version was published in 1986. Standard ASCII uses 7-bit values 0–127; codes 0–31 are control codes. Extended ASCII uses 8-bit values 128–255, allowing additional non-English and drawing characters.',
    },
  ], ['ASCII 1963/1986 historical detail', 'Extended ASCII 128–255 purpose']);
});

chapter1Slides = patch(chapter1Slides, 'h1-115-unicode', (slide) => {
  const withTerms = appendKeyTerms(slide, [
    { term: 'Unicode', definition: 'A coding system intended to represent writing systems and symbols from languages around the world; the first 128 values overlap with ASCII.' },
  ], ['Unicode formal source key term']);
  return appendBlocks(withTerms, [
    {
      kind: 'steps',
      title: 'Hodder Unicode-consortium source detail',
      items: [
        'The Unicode Consortium was set up in 1991; Hodder presents Version 1.0 through five design goals.',
        'Create a universal standard covering languages and writing systems.',
        'Produce a coding system more efficient than the ASCII approach described in the source.',
        'Use uniform character codes and make each stored value unambiguous.',
        'Reserve private-use code space so users can assign their own characters/symbols.',
        'Hodder explicitly notes that ASCII tables/extensions are not fully standardised and that variants other than its Tables 1.5–1.6 exist.',
      ],
    },
  ], ['Unicode Consortium 1991 and five goals', 'ASCII-table non-standardisation nuance', 'Unicode private-use space']);
});

chapter1Slides = patch(chapter1Slides, 'h1-bitmap-resolution', (slide) =>
  appendBlocks(slide, [
    {
      kind: 'callout',
      tone: 'info',
      title: 'Human vision and bitmap quality',
      text: 'The source links bitmap compression/quality to human perception: the eye can tolerate some reduction in resolution before the loss of quality becomes significant. This is why resolution can sometimes be reduced to save storage or transfer time without an immediately obvious visual penalty.',
    },
  ], ['Human-eye tolerance of limited resolution reduction']),
);

chapter1Slides = patch(chapter1Slides, 'h1-bitmap-size', (slide) =>
  appendBlocks(slide, [
    {
      kind: 'callout',
      tone: 'info',
      title: 'Exact source unit comparison',
      text: 'For the full-screen 1920 × 1080 × 24-bit example, Hodder gives 49,766,400 bits = 6,220,800 bytes, expressed as about 6.222 MB using SI units or 5.933 MiB using binary units; an image occupying less than the full screen needs less pixel data.',
    },
  ], ['6.222 MB versus 5.933 MiB exact worked comparison']),
);

let chapter13Slides = [...SOURCE_ATOM_COMPLETE_CHAPTER_13.slides];

chapter13Slides = patch(chapter13Slides, 'h13-file-terms', (slide) =>
  appendKeyTerms(slide, [
    { term: 'File access', definition: 'The method used to physically find a record in a file.' },
    { term: 'Hashing algorithm (file access)', definition: 'A mathematical calculation on a record key whose result gives the address where the record should be found.' },
  ], ['File access formal source key term', 'Hashing algorithm (file access) formal source key term']),
);

chapter13Slides = patch(chapter13Slides, 'h13-hash-address', (slide) =>
  appendBlocks(slide, [
    {
      kind: 'callout',
      tone: 'info',
      title: 'Source connection beyond file addressing',
      text: 'Hodder explicitly notes that more complex hashing algorithms are also used in data encryption. In this chapter, however, the worked hashing formula is used for file-address calculation from a record key.',
    },
  ], ['Hashing-to-encryption source connection']),
);

chapter13Slides = patch(chapter13Slides, 'h13-float-format', (slide) =>
  appendKeyTerms(slide, [
    { term: 'Binary floating-point number', definition: 'A binary value represented in the form M × 2^E, where M is the mantissa and E is the exponent.' },
  ], ['Binary floating-point number formal source key term']),
);

chapter13Slides = patch(chapter13Slides, 'h13-sets-classes', (slide) =>
  appendKeyTerms(slide, [
    { term: 'Set', definition: 'An unordered collection of elements of a base type that can use set operations such as intersection and union.' },
    { term: 'Class', definition: 'A composite type containing data/attributes and methods; objects are instances defined from the class.' },
  ], ['Set formal source key term', 'Class/object source definition']),
);

const withCoverage = (chapter: HodderLessonChapter, slides: HodderLessonSlide[], label: string): HodderLessonChapter => ({
  ...chapter,
  slides,
  coverage: `${chapter.coverage} · ${label}`,
});

export const SOURCE_EXHAUSTIVE_CHAPTER_1 = withCoverage(
  SOURCE_ATOM_COMPLETE_CHAPTER_1,
  chapter1Slides,
  'source-exhaustiveness hardening applied',
);

export const SOURCE_EXHAUSTIVE_CHAPTER_13 = withCoverage(
  SOURCE_ATOM_COMPLETE_CHAPTER_13,
  chapter13Slides,
  'source-exhaustiveness hardening applied',
);
