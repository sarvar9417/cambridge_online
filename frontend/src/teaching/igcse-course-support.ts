export type IGCSECourseSupportFeature = {
  pdfPage: number;
  kind:
    | 'aims'
    | 'assessment'
    | 'book_feature'
    | 'find_out_more'
    | 'advice'
    | 'link'
    | 'extension'
    | 'summary'
    | 'key_terms'
    | 'exam_style'
    | 'pseudocode_languages'
    | 'command_words';
  title: string;
  lessonUse: string;
};

/**
 * Teaching-relevant material from the supplied 0478/0984/2210 book front matter.
 *
 * These pages are not chapter content, but they still affect how lessons should be
 * taught and how students should answer questions. Keeping them in a shared support
 * registry prevents them from disappearing merely because they sit before Chapter 1.
 * Wording is deliberately concise/derived rather than a reproduction of the book.
 */
export const IGCSE_COURSE_SUPPORT: readonly IGCSECourseSupportFeature[] = [
  {
    pdfPage: 7,
    kind: 'aims',
    title: 'Course aims',
    lessonUse: 'Keep programming, problem solving, testing and evaluation visible across the course rather than treating chapters as isolated facts.',
  },
  {
    pdfPage: 7,
    kind: 'assessment',
    title: 'Assessment structure',
    lessonUse: 'Use Paper 1 for Computer Systems topics 1-6 and Paper 2 for Algorithms, Programming and Logic topics 7-10; each paper contributes half of the qualification.',
  },
  {
    pdfPage: 8,
    kind: 'book_feature',
    title: 'Learning outline',
    lessonUse: 'Every unit should expose the chapter learning outline before teaching starts.',
  },
  {
    pdfPage: 8,
    kind: 'book_feature',
    title: 'Chapter introduction',
    lessonUse: 'Open each unit with a short purpose/context statement so students know what the chapter is for.',
  },
  {
    pdfPage: 8,
    kind: 'book_feature',
    title: 'Activity',
    lessonUse: 'Preserve short retrieval and understanding checks as student tasks rather than burying them inside source notes.',
  },
  {
    pdfPage: 8,
    kind: 'book_feature',
    title: 'Worked example',
    lessonUse: 'Technical and mathematical methods should include a worked model before independent practice.',
  },
  {
    pdfPage: 9,
    kind: 'find_out_more',
    title: 'Find out more',
    lessonUse: 'Keep beyond-syllabus curiosity prompts as optional enrichment, clearly separated from required learning.',
  },
  {
    pdfPage: 9,
    kind: 'advice',
    title: 'Advice',
    lessonUse: 'Preserve tips, background and syllabus-boundary notes as teacher/student guidance where they affect understanding.',
  },
  {
    pdfPage: 9,
    kind: 'link',
    title: 'Links',
    lessonUse: 'Retain explicit cross-chapter links so prerequisite and follow-on concepts remain connected.',
  },
  {
    pdfPage: 9,
    kind: 'extension',
    title: 'Extension',
    lessonUse: 'Keep advanced material available as optional stretch content without mixing it into the required core lesson.',
  },
  {
    pdfPage: 10,
    kind: 'summary',
    title: 'Chapter summary',
    lessonUse: 'End each unit with a concise recap/revision checkpoint covering the main points students should understand.',
  },
  {
    pdfPage: 10,
    kind: 'key_terms',
    title: 'Key terms',
    lessonUse: 'Every chapter key term must be represented in the lesson/glossary layer and retrievable for revision.',
  },
  {
    pdfPage: 11,
    kind: 'exam_style',
    title: 'Exam-style questions',
    lessonUse: 'Chapter exam-style questions belong in unit review/assessment and must remain distinct from verified Cambridge past-paper questions.',
  },
  {
    pdfPage: 11,
    kind: 'pseudocode_languages',
    title: 'Pseudocode and programming languages',
    lessonUse: 'Algorithms/programming lessons should preserve Cambridge pseudocode conventions and support the book\'s Python, VB.NET and Java examples where the source provides them.',
  },
  {
    pdfPage: 12,
    kind: 'command_words',
    title: 'Command words',
    lessonUse: 'Teach students how command words such as calculate, compare, define, describe, evaluate, explain, identify, outline, show, state and suggest change the expected form of an answer.',
  },
] as const;

export const IGCSE_COURSE_SUPPORT_PAGES = [...new Set(IGCSE_COURSE_SUPPORT.map((item) => item.pdfPage))];
