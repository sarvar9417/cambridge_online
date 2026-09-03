import {
  LESSON_CHAPTERS as BASE_CHAPTERS,
  type LessonChapter,
  type LessonSlide,
  type LessonVisual,
} from './lesson-content-full';

export type { LessonChapter, LessonSlide, LessonVisual } from './lesson-content-full';

const insertAfter = (slides: LessonSlide[], afterId: string, additions: LessonSlide[]) => {
  const index = slides.findIndex((slide) => slide.id === afterId);
  if (index < 0) throw new Error(`Lesson source anchor missing: ${afterId}`);
  return [...slides.slice(0, index + 1), ...additions, ...slides.slice(index + 1)];
};

const chapter1SourceMap: LessonSlide = {
  id: 'c1-source-map',
  section: 'Chapter overview',
  eyebrow: 'HODDER SOURCE MAP · CHAPTER 01',
  title: 'Every coursebook section has a place in this lesson',
  lead: 'The lesson follows the full Chapter 1 route rather than only the syllabus headings. Each named Hodder subsection is taught before its Cambridge checkpoint.',
  keyTerms: [
    { term: '1.1.1–1.1.2', definition: 'Number systems; binary representation, signed values, arithmetic, range and overflow.' },
    { term: '1.1.3–1.1.5', definition: 'Hexadecimal; BCD; ASCII and Unicode character representation.' },
    { term: '1.2.1–1.2.2', definition: 'Bitmap images and vector graphics, including file size, metadata and display considerations.' },
    { term: '1.2.3–1.2.4', definition: 'Digital sound and the coursebook video extension.' },
    { term: '1.3.1', definition: 'Why compression is used and where lossy/lossless approaches fit.' },
    { term: '1.3.2', definition: 'General file-size reduction and media-specific compression methods.' },
  ],
  activity: {
    title: 'Teacher coverage check',
    prompt: 'At the end of the chapter, return here and ask learners to give one concrete example from every row.',
    reveal: 'A complete answer should mention number representation, character coding, bitmap/vector, sampled sound/video and compression.',
  },
  visual: 'recap',
  accent: 'indigo',
};

const chapter1AudioEditing: LessonSlide = {
  id: 'c1-12-audio-editing',
  section: '1.2 Multimedia',
  subtopicCode: '1.2',
  eyebrow: '1.2.3 · SOUND EDITING',
  title: 'A sound file can be processed after sampling',
  lead: 'The coursebook goes beyond capture and storage: digital audio software can transform sampled data without changing the fact that the file is represented as numerical samples.',
  bullets: [
    'Mix or merge multiple tracks and sound sources.',
    'Change properties such as level, timing or selected sections of a recording.',
    'Reduce unwanted noise or isolate a wanted signal from a mixture.',
    'Convert audio between file formats for different storage or playback requirements.',
    'Editing and compression are different ideas: editing changes the content; compression changes how efficiently it is represented.',
  ],
  teacherPrompt: 'Ask: “Which operation changes the sound itself, and which operation only changes how the same useful information is stored?”',
  visual: 'sound',
  accent: 'emerald',
};

const chapter1VideoExtension: LessonSlide = {
  id: 'c1-12-video-extension',
  section: '1.2 Multimedia',
  subtopicCode: '1.2',
  eyebrow: '1.2.4 · HODDER EXTENSION',
  title: 'Video is a timed sequence of digital image frames',
  lead: 'Hodder explicitly labels video as material included for completeness beyond the core syllabus. It is still useful because it links bitmap representation, sampled sound, frame rate and compression in one medium.',
  bullets: [
    'A camera sensor converts incoming light into electronic data for each captured frame.',
    'Frames shown rapidly in sequence create the perception of continuous movement.',
    'Frame rate is the number of captured or displayed frames per second.',
    'Higher resolution, colour depth and frame rate all increase the uncompressed data volume.',
    'Video commonly stores compressed image-frame data together with a synchronised audio stream.',
  ],
  activity: {
    title: 'Estimate the pressure on storage',
    prompt: 'If frame rate doubles while resolution, colour depth and duration stay fixed, what happens to the raw image data volume?',
    reveal: 'It approximately doubles because twice as many image frames must be represented.',
  },
  visual: 'pixels',
  accent: 'rose',
};

const chapter13SourceMap: LessonSlide = {
  id: 'c13-source-map',
  section: 'Chapter overview',
  eyebrow: 'HODDER SOURCE MAP · CHAPTER 13',
  title: 'Chapter 13 is taught as three complete reasoning systems',
  lead: 'The presentation mirrors the coursebook sequence and then aligns each idea with the current 2026 Cambridge terminology and learning outcomes.',
  keyTerms: [
    { term: '13.1.1', definition: 'Non-composite user-defined types: enumerated types and pointers.' },
    { term: '13.1.2', definition: 'Composite user-defined types: records, sets and classes/objects.' },
    { term: '13.2.1', definition: 'Serial, sequential and random file organisation plus sequential/direct access.' },
    { term: '13.2.2', definition: 'Hashing, physical record addresses, collisions and collision handling.' },
    { term: '13.3.1', definition: 'Binary floating-point format, conversion, normalisation, precision/range, approximation, overflow and underflow.' },
  ],
  visual: 'recap',
  accent: 'emerald',
};

const chapter13PriorKnowledge: LessonSlide = {
  id: 'c13-11-prior-knowledge',
  section: '13.1 User-defined data types',
  subtopicCode: '13.1',
  eyebrow: '13.1 · WHAT YOU SHOULD ALREADY KNOW',
  title: 'Start from primitive types and records',
  lead: 'Before defining new types, learners should be able to select suitable primitive types and design a record whose fields model one real-world entity.',
  activity: {
    title: 'Diagnostic',
    prompt: 'Choose types for a person’s name, an exam mark, a measured temperature, a date and a true/false state. Then sketch a record for one zoo animal with identity, date, location and notes.',
    reveal: 'The exact identifiers may vary; the important reasoning is matching each field to a valid domain and grouping related fields into one record.',
  },
  visual: 'types',
  accent: 'cyan',
};

const chapter13FilePriorKnowledge: LessonSlide = {
  id: 'c13-12-prior-knowledge',
  section: '13.2 File organisation and access',
  subtopicCode: '13.2',
  eyebrow: '13.2 · WHAT YOU SHOULD ALREADY KNOW',
  title: 'File mode, record structure and access are different decisions',
  lead: 'The coursebook starts this section by reconnecting to earlier file-processing knowledge before introducing physical organisation.',
  bullets: [
    'A program can open a file for reading, writing or appending according to the operation required.',
    'A file contains records; a record contains fields.',
    'A key field can uniquely identify a record and can control ordering or lookup.',
    'Opening mode describes what the program may do now; organisation describes how records are physically arranged.',
  ],
  visual: 'files',
  accent: 'cyan',
};

const chapter13PhysicalHashing: LessonSlide = {
  id: 'c13-12-physical-hash',
  section: '13.2 File organisation and access',
  subtopicCode: '13.2',
  eyebrow: '13.2.2 · HASH ADDRESS CALCULATION',
  title: 'A hash result becomes a physical record address',
  lead: 'A classroom hash such as key MOD numberOfRecords gives a record slot. The file’s start address and fixed record size can then turn that slot into a physical location.',
  formula: 'slot = key MOD N   ·   address = fileStart + (slot × recordSize)',
  example: {
    title: 'Physical-address model',
    lines: ['fileStart = 500', 'recordSize = 5 locations', 'N = 1000 records', 'key = 3024 → slot = 24', 'address = 500 + (24 × 5)'],
    answer: 'The hashing rule must map the key into the available record range before the record offset is applied.',
  },
  bullets: [
    'The same key must always calculate the same home location.',
    'The calculated slot must be within the allocated file capacity.',
    'The record key still has to be checked after reading because a collision may have moved the record away from its home location.',
  ],
  visual: 'hashing',
  accent: 'emerald',
};

const chapter13RangeExtremes: LessonSlide = {
  id: 'c13-13-range-extremes',
  section: '13.3 Floating-point numbers',
  subtopicCode: '13.3',
  eyebrow: '13.3.1 · PRECISION VS RANGE',
  title: 'Use extreme patterns to reason about the representation',
  lead: 'Hodder develops the precision/range trade-off by comparing how the fixed word is divided between mantissa and exponent and by considering the largest and smallest non-zero values.',
  bullets: [
    'For a fixed total word size, more mantissa bits retain more significant binary digits and therefore improve precision.',
    'More exponent bits allow the binary point to move across a wider scale and therefore increase range.',
    'The largest positive value combines the largest positive normalised mantissa with the largest positive exponent.',
    'The smallest positive non-zero magnitude combines the smallest positive normalised mantissa with the most negative exponent.',
    'Changing the mantissa/exponent split is therefore a design trade-off; neither field can be enlarged for free when total width is fixed.',
  ],
  teacherPrompt: 'Give 16 total bits. Compare 12+4, 8+8 and 4+12 mantissa/exponent splits: which favours precision, and which favours range?',
  visual: 'precision',
  accent: 'amber',
};

function sourceCorrectedSlides(chapter: LessonChapter): LessonSlide[] {
  let slides = chapter.slides.map((slide) => {
    if (chapter.number !== 13 || slide.id !== 'c13-12-09') return slide;
    return {
      ...slide,
      title: 'Hodder open and closed hashing resolve occupied home locations',
      lead: 'Use the coursebook terminology exactly in this lesson: open hashing searches forward for the next free record position; closed hashing places collided records in a separate overflow area.',
      keyTerms: [
        { term: 'Open hash (Hodder)', definition: 'If the home location is occupied, continue through following file locations until a free position is found. During lookup, continue forward if the key at the home position does not match.' },
        { term: 'Closed hash (Hodder)', definition: 'Place the collided record in the next free position in a separate overflow area. During lookup, search that overflow area if the home key does not match.' },
      ],
      activity: {
        title: 'Trace a collision',
        prompt: 'Two record keys calculate the same home location. Describe where the second record goes under Hodder open hashing, then under Hodder closed hashing.',
        reveal: 'Open: continue to a later free file position. Closed: store it in the overflow area. In both cases the stored key must be checked during retrieval.',
      },
    } satisfies LessonSlide;
  });

  if (chapter.number === 1) {
    slides = insertAfter(slides, 'c1-01', [chapter1SourceMap]);
    slides = insertAfter(slides, 'c1-12-13', [chapter1AudioEditing]);
    slides = insertAfter(slides, 'c1-12-14', [chapter1VideoExtension]);
    return slides;
  }

  slides = insertAfter(slides, 'c13-00', [chapter13SourceMap, chapter13PriorKnowledge]);
  slides = insertAfter(slides, 'c13-12-00', [chapter13FilePriorKnowledge]);
  slides = insertAfter(slides, 'c13-12-07', [chapter13PhysicalHashing]);
  slides = insertAfter(slides, 'c13-13-13', [chapter13RangeExtremes]);
  return slides;
}

export const LESSON_CHAPTERS: LessonChapter[] = BASE_CHAPTERS.map((chapter) => ({
  ...chapter,
  coverage: `Source-audited ${chapter.coverage.toLowerCase()}`,
  slides: sourceCorrectedSlides(chapter),
}));

export const lessonChapter = (number: number) =>
  LESSON_CHAPTERS.find((chapter) => chapter.number === number) ?? null;
