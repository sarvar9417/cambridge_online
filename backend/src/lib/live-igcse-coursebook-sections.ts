/**
 * Source of truth: David Watson and Helen Williams, Cambridge IGCSE and
 * O Level Computer Science, Second Edition (Hodder Education, 2021),
 * printed contents p.iv, SECTION 2: Algorithms, Programming and Logic.
 *
 * Only chapters 7-10 belong to the current 0478 Paper 2 game.
 * The book gives section titles, not separate third-level subsection codes.
 * The official 2023-2025/2026-2028 syllabus LOs have corresponding
 * chapter/section meanings. Do not invent mappings for 2015-2022 papers.
 */
export type LiveIgcseBookSection = {
  code:string;
  title:string;
  chapterNumber:number;
  chapterTitle:string;
  sourcePage:number;
  loCodes:readonly string[];
  mappingKind:'direct_subtopic'|'learning_objective_bridge';
};
const chapterTitles:Record<number,string>={
  7:'Algorithm design and problem solving',
  8:'Programming',
  9:'Databases',
  10:'Boolean logic',
};
function section(code:string,title:string,page:number,loCodes:string[]):LiveIgcseBookSection {
  const chapterNumber=Number(code.split('.')[0]);
  return {code,title,chapterNumber,chapterTitle:chapterTitles[chapterNumber]!,sourcePage:page,
    loCodes,mappingKind:'learning_objective_bridge'};
}
export const LIVE_IGCSE_PAPER2_SECTIONS:readonly LiveIgcseBookSection[]=[
  section('7.1','The program development life cycle',258,['7-lo-01']),
  section('7.2','Computer systems, sub-systems and decomposition',260,['7-lo-02']),
  section('7.3','Explaining the purpose of an algorithm',271,['7-lo-03']),
  section('7.4','Standard methods of solution',272,['7-lo-04']),
  section('7.5','Validation and verification',276,['7-lo-05']),
  section('7.6','Test data',281,['7-lo-06']),
  section('7.7','Trace tables to document dry runs of algorithms',282,['7-lo-07']),
  section('7.8','Identifying errors in algorithms',285,['7-lo-08']),
  section('7.9','Writing and amending algorithms',288,['7-lo-09']),
  section('8.1','Programming concepts',302,['8.1-lo-01','8.1-lo-02','8.1-lo-03','8.1-lo-04','8.1-lo-05','8.1-lo-06','8.1-lo-07','8.1-lo-08']),
  section('8.2','Arrays',329,['8.2-lo-01','8.2-lo-02','8.2-lo-03']),
  section('8.3','File handling',333,['8.3-lo-01','8.3-lo-02']),
  section('9.1','Databases',339,['9-lo-01','9-lo-02','9-lo-03','9-lo-04']),
  section('10.1','Standard logic gate symbols',356,['10-lo-01']),
  section('10.2','The function of the six logic gates',358,['10-lo-02']),
  section('10.3','Logic circuits, logic expressions, truth tables and problem statements',360,['10-lo-03']),
];
export const LIVE_IGCSE_PAPER2_SECTION_CODES=new Set(LIVE_IGCSE_PAPER2_SECTIONS.map(s=>s.code));

export function resolveIgcseBookSections(codes:readonly string[]) {
  const codeSet=new Set(codes);
  if([...codeSet].some(code=>!LIVE_IGCSE_PAPER2_SECTION_CODES.has(code))){
    throw new Error('Unknown IGCSE coursebook section');
  }
  return LIVE_IGCSE_PAPER2_SECTIONS.filter(section=>codeSet.has(section.code));
}

/**
 * Source-verified bridge by official 0478 learning objective ID.
 * Not a text similarity classifier. Older (2015-2022) syllabus editions
 * have different LO numbering, so they're deliberately excluded from
 * narrow book-section filtering until separately reviewed.
 *
 * Every section, including 8.1–8.3, currently filters through specific
 * learning objectives. MappingKind must reflect that instead of claiming
 * that a subtopic-only join is sufficient.
 *
 * 'qAlias' MUST be a fixed code-authored SQL table alias.
 */
export function liveIgcseBookQuestionFilter(values:unknown[],codes:readonly string[],qAlias='q'){
  if(!codes.length)return '';
  const sections=resolveIgcseBookSections(codes);
  values.push([...new Set(sections.flatMap(section=>section.loCodes))]);
  const slot='$'+values.length;
  return `exists(
    select 1 from question_learning_objectives book_qlo
    join learning_objectives book_lo on book_lo.id=book_qlo.lo_id
    join subtopics book_st on book_st.id=book_lo.subtopic_id
    join topics book_topic on book_topic.id=book_st.topic_id
    join syllabi book_sy on book_sy.id=book_topic.syllabus_id
    where book_qlo.question_id=${qAlias}.id
      and book_sy.code='0478' and book_sy.valid_from>=2023
      and book_lo.code=any(${slot}::text[])
      and book_topic.syllabus_id=(
        select book_source.syllabus_id from questions book_question
        join source_papers book_source on book_source.id=book_question.source_paper_id
        where book_question.id=${qAlias}.id
      )
  )`;
}
