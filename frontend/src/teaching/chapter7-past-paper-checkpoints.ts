import type { LessonSlide } from './lesson-content-full';
import type { HodderLessonSlide } from './lesson-content-hodder-types';

type Chapter7CheckpointSpec = {
  subtopicCode: `7.${1|2|3|4|5|6|7|8|9}`;
  section: string;
  title: string;
  learningObjectiveCodes: string[];
  sourcePages: number[];
  yearFrom?: number;
  accent?: HodderLessonSlide['accent'];
};

const checkpointSlide = ({
  subtopicCode,
  section,
  title,
  learningObjectiveCodes,
  sourcePages,
  yearFrom = 2015,
  accent = 'indigo',
}: Chapter7CheckpointSpec): HodderLessonSlide => ({
  id: `ch7-cp-${subtopicCode.replace('.','')}`,
  section,
  subtopicCode,
  eyebrow: `CAMBRIDGE 0478 CHECKPOINT · ${yearFrom}–2026`,
  title,
  lead: 'Work through approved Cambridge 0478 past-paper questions resolved from the current Topic 7 learning objective through explicit cross-version compatibility. Historical questions appear only when their source learning objective is equivalent or safely subtopic-compatible.',
  learningObjectiveCodes,
  checkpointLabel: `${subtopicCode} · ${title.replace(/^Past papers:\s*/,'')}`,
  checkpointSyllabusCode: '0478',
  checkpointYearFrom: yearFrom,
  checkpointYearTo: 2026,
  sourcePages,
  sourceLabel: 'Hodder Chapter 7 + Cambridge 0478 corpus',
  sourceElements: ['Current 0478 target LO checkpoint', 'Explicit historical LO compatibility'],
  examPractice: true,
  accent,
});

export const CHAPTER_7_PAST_PAPER_CHECKPOINTS: HodderLessonSlide[] = [
  checkpointSlide({
    subtopicCode:'7.1',
    section:'Past Papers · 7.1',
    title:'Past papers: program development life cycle',
    learningObjectiveCodes:['7-lo-01'],
    sourcePages:[258,259],
    yearFrom:2023,
    accent:'indigo',
  }),
  checkpointSlide({
    subtopicCode:'7.2',
    section:'Past Papers · 7.2',
    title:'Past papers: systems, decomposition and solution design',
    learningObjectiveCodes:['7-lo-02'],
    sourcePages:[260,261,262,263,264,265,266,267,268,269,270],
    accent:'cyan',
  }),
  checkpointSlide({
    subtopicCode:'7.3',
    section:'Past Papers · 7.3',
    title:'Past papers: explain the purpose of an algorithm',
    learningObjectiveCodes:['7-lo-03'],
    sourcePages:[271],
    accent:'emerald',
  }),
  checkpointSlide({
    subtopicCode:'7.4',
    section:'Past Papers · 7.4',
    title:'Past papers: standard methods of solution',
    learningObjectiveCodes:['7-lo-04'],
    sourcePages:[272,273,274,275,276],
    accent:'amber',
  }),
  checkpointSlide({
    subtopicCode:'7.5',
    section:'Past Papers · 7.5',
    title:'Past papers: validation and verification',
    learningObjectiveCodes:['7-lo-05'],
    sourcePages:[276,277,278,279,280],
    accent:'rose',
  }),
  checkpointSlide({
    subtopicCode:'7.6',
    section:'Past Papers · 7.6',
    title:'Past papers: normal, abnormal, extreme and boundary test data',
    learningObjectiveCodes:['7-lo-06'],
    sourcePages:[281,282],
    accent:'cyan',
  }),
  checkpointSlide({
    subtopicCode:'7.7',
    section:'Past Papers · 7.7',
    title:'Past papers: trace tables and dry runs',
    learningObjectiveCodes:['7-lo-07'],
    sourcePages:[283,284],
    accent:'indigo',
  }),
  checkpointSlide({
    subtopicCode:'7.8',
    section:'Past Papers · 7.8',
    title:'Past papers: identify and correct algorithm errors',
    learningObjectiveCodes:['7-lo-08'],
    sourcePages:[285,286,287,288],
    accent:'rose',
  }),
  checkpointSlide({
    subtopicCode:'7.9',
    section:'Past Papers · 7.9',
    title:'Past papers: write and amend algorithms',
    learningObjectiveCodes:['7-lo-09'],
    sourcePages:[288,289,290,291,292,293],
    accent:'emerald',
  }),
];

const checkpointBySubtopic = new Map(
  CHAPTER_7_PAST_PAPER_CHECKPOINTS.map((slide) => [slide.subtopicCode, slide] as const),
);

/** Insert one current-target Cambridge checkpoint after the final book slide for each 7.1–7.9 section. */
export function withChapter7PastPaperCheckpoints(slides: LessonSlide[]): HodderLessonSlide[] {
  const output: HodderLessonSlide[] = [];
  for (let index=0; index<slides.length; index+=1) {
    const slide = slides[index]! as HodderLessonSlide;
    output.push(slide);
    const code = slide.subtopicCode;
    const nextCode = slides[index+1]?.subtopicCode;
    const checkpoint = code ? checkpointBySubtopic.get(code as Chapter7CheckpointSpec['subtopicCode']) : undefined;
    if (checkpoint && code !== nextCode) output.push(checkpoint);
  }
  return output;
}
