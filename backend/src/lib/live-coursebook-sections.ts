import { TOPICS } from '../database/syllabus/9618-structure.js';

export type LiveCoursebookSection = {
  code: string;
  title: string;
  chapterNumber: number;
  chapterTitle: string;
  sourceTopicNumber: number;
  sourceSubtopicCode: string;
  includeLoText?: string[];
  excludeLoText?: string[];
  mappingKind: 'direct_subtopic' | 'learning_objective_bridge';
};

const chapterOverrides = new Map<number, LiveCoursebookSection[]>([
  [15, [
    {
      code:'15.1',
      title:'Processors and parallel processing',
      chapterNumber:15,
      chapterTitle:'Hardware',
      sourceTopicNumber:15,
      sourceSubtopicCode:'15.1',
      excludeLoText:['virtual machine'],
      mappingKind:'learning_objective_bridge',
    },
    {
      code:'15.2',
      title:'Boolean algebra and logic circuits',
      chapterNumber:15,
      chapterTitle:'Hardware',
      sourceTopicNumber:15,
      sourceSubtopicCode:'15.2',
      mappingKind:'direct_subtopic',
    },
  ]],
  [16, [
    {
      code:'16.1',
      title:'Purposes of an operating system (OS)',
      chapterNumber:16,
      chapterTitle:'System software and virtual machines',
      sourceTopicNumber:16,
      sourceSubtopicCode:'16.1',
      mappingKind:'direct_subtopic',
    },
    {
      code:'16.2',
      title:'Virtual machines (VMs)',
      chapterNumber:16,
      chapterTitle:'System software and virtual machines',
      sourceTopicNumber:15,
      sourceSubtopicCode:'15.1',
      includeLoText:['virtual machine'],
      mappingKind:'learning_objective_bridge',
    },
    {
      code:'16.3',
      title:'Translation software',
      chapterNumber:16,
      chapterTitle:'System software and virtual machines',
      sourceTopicNumber:16,
      sourceSubtopicCode:'16.2',
      mappingKind:'direct_subtopic',
    },
  ]],
]);

/**
 * Live Challenge has two different taxonomies that must not be conflated:
 *
 * - Cambridge syllabus taxonomy is authoritative for assessment, LO compatibility,
 *   mastery and analytics.
 * - The Hodder coursebook chapter taxonomy is what teachers see when they ask for
 *   "Chapter 16.2" or "Chapter 16.3".
 *
 * Most chapter sections align 1:1 with the syllabus. Chapters 15/16 do not:
 * virtual machines are Chapter 16.2 in the coursebook, but are assessed under
 * syllabus 15.1; coursebook 16.3 Translation software is syllabus 16.2.
 *
 * Keep this as a bridge. Never rename official syllabus rows to make the book fit.
 */
export const LIVE_COURSEBOOK_SECTIONS: LiveCoursebookSection[] = TOPICS.flatMap((topic) => {
  const override=chapterOverrides.get(topic.number);
  if(override)return override;
  return topic.subtopics.map((subtopic)=>({
    code:subtopic.code,
    title:subtopic.title,
    chapterNumber:topic.number,
    chapterTitle:topic.title,
    sourceTopicNumber:topic.number,
    sourceSubtopicCode:subtopic.code,
    mappingKind:'direct_subtopic' as const,
  }));
});

const byCode = new Map(LIVE_COURSEBOOK_SECTIONS.map((section)=>[section.code,section]));

export function liveCoursebookSectionOptions() {
  return LIVE_COURSEBOOK_SECTIONS.map((section)=>({
    syllabus_code:'9618',
    chapter_number:section.chapterNumber,
    chapter_title:section.chapterTitle,
    section_code:section.code,
    section_title:section.title,
    mapping_kind:section.mappingKind,
  }));
}

export function resolveLiveCoursebookSections(codes:string[]) {
  const unique=[...new Set(codes)];
  const sections=unique.map((code)=>byCode.get(code)).filter((section):section is LiveCoursebookSection=>Boolean(section));
  if(sections.length!==unique.length){
    const known=new Set(sections.map((section)=>section.code));
    const unknown=unique.filter((code)=>!known.has(code));
    throw new Error(`Unknown 9618 coursebook section: ${unknown.join(', ')}`);
  }
  return sections;
}

export function liveCoursebookQuestionFilter(
  values:unknown[],
  codes:string[],
  questionAlias='q',
){
  const sections=resolveLiveCoursebookSections(codes);
  if(!sections.length)return null;

  const clauses=sections.map((section)=>{
    values.push(section.sourceTopicNumber);
    const topicParameter=`$${values.length}`;
    values.push(section.sourceSubtopicCode);
    const subtopicParameter=`$${values.length}`;

    if(section.mappingKind==='direct_subtopic'){
      return `exists(
        select 1
        from question_subtopics coursebook_qst
        join subtopics coursebook_st on coursebook_st.id=coursebook_qst.subtopic_id
        join topics coursebook_t on coursebook_t.id=coursebook_st.topic_id
        join syllabi coursebook_sy on coursebook_sy.id=coursebook_t.syllabus_id
        where coursebook_qst.question_id=${questionAlias}.id
          and coursebook_sy.code='9618'
          and coursebook_t.number=${topicParameter}
          and coursebook_st.code=${subtopicParameter}
      )`;
    }

    const loFilters:string[]=[];
    for(const term of section.includeLoText??[]){
      values.push(`%${term}%`);
      loFilters.push(`coursebook_lo.text ilike $${values.length}`);
    }
    for(const term of section.excludeLoText??[]){
      values.push(`%${term}%`);
      loFilters.push(`coursebook_lo.text not ilike $${values.length}`);
    }

    return `exists(
      select 1
      from question_learning_objectives coursebook_qlo
      join learning_objectives coursebook_lo on coursebook_lo.id=coursebook_qlo.lo_id
      join subtopics coursebook_st on coursebook_st.id=coursebook_lo.subtopic_id
      join topics coursebook_t on coursebook_t.id=coursebook_st.topic_id
      join syllabi coursebook_sy on coursebook_sy.id=coursebook_t.syllabus_id
      where coursebook_qlo.question_id=${questionAlias}.id
        and coursebook_sy.code='9618'
        and coursebook_t.number=${topicParameter}
        and coursebook_st.code=${subtopicParameter}
        ${loFilters.length?`and ${loFilters.join(' and ')}`:''}
    )`;
  });

  return `(${clauses.join(' or ')})`;
}
