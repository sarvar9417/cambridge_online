import { TOPICS } from '../database/syllabus/9618-structure.js';

export type LiveCoursebookSection = {
  code: string;
  title: string;
  chapterNumber: number;
  chapterTitle: string;
  sourceTopicNumber: number;
  sourceSubtopicCode: string;
  includeLoTextAny?: string[];
  excludeLoTextAny?: string[];
  mappingKind: 'direct_subtopic' | 'learning_objective_bridge';
};

const chapterOverrides = new Map<number, LiveCoursebookSection[]>([
  [2, [
    {
      code:'2.1',
      title:'Networking',
      chapterNumber:2,
      chapterTitle:'Communication',
      sourceTopicNumber:2,
      sourceSubtopicCode:'2.1',
      excludeLoTextAny:['World Wide Web','internet','Uniform Resource Locator','Domain Name Service'],
      mappingKind:'learning_objective_bridge',
    },
    {
      code:'2.2',
      title:'The internet',
      chapterNumber:2,
      chapterTitle:'Communication',
      sourceTopicNumber:2,
      sourceSubtopicCode:'2.1',
      includeLoTextAny:['World Wide Web','internet','Uniform Resource Locator','Domain Name Service'],
      mappingKind:'learning_objective_bridge',
    },
  ]],
  [7, [
    {
      code:'7.1',
      title:'Legal, moral, ethical and cultural implications',
      chapterNumber:7,
      chapterTitle:'Ethics and ownership',
      sourceTopicNumber:7,
      sourceSubtopicCode:'7.1',
      includeLoTextAny:['ethic'],
      mappingKind:'learning_objective_bridge',
    },
    {
      code:'7.2',
      title:'Copyright issues',
      chapterNumber:7,
      chapterTitle:'Ethics and ownership',
      sourceTopicNumber:7,
      sourceSubtopicCode:'7.1',
      includeLoTextAny:['copyright','licenc'],
      mappingKind:'learning_objective_bridge',
    },
    {
      code:'7.3',
      title:'Artificial intelligence (AI)',
      chapterNumber:7,
      chapterTitle:'Ethics and ownership',
      sourceTopicNumber:7,
      sourceSubtopicCode:'7.1',
      includeLoTextAny:['Artificial Intelligence'],
      mappingKind:'learning_objective_bridge',
    },
  ]],
  [15, [
    {
      code:'15.1',
      title:'Processors and parallel processing',
      chapterNumber:15,
      chapterTitle:'Hardware',
      sourceTopicNumber:15,
      sourceSubtopicCode:'15.1',
      excludeLoTextAny:['virtual machine'],
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
      includeLoTextAny:['virtual machine'],
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
  [17, [
    {
      code:'17.1',
      title:'Encryption',
      chapterNumber:17,
      chapterTitle:'Security',
      sourceTopicNumber:17,
      sourceSubtopicCode:'17.1',
      includeLoTextAny:['encryption works','key terms associated with encryption','symmetric','asymmetric'],
      mappingKind:'learning_objective_bridge',
    },
    {
      code:'17.2',
      title:'Quantum cryptography',
      chapterNumber:17,
      chapterTitle:'Security',
      sourceTopicNumber:17,
      sourceSubtopicCode:'17.1',
      includeLoTextAny:['quantum cryptography'],
      mappingKind:'learning_objective_bridge',
    },
    {
      code:'17.3',
      title:'Protocols',
      chapterNumber:17,
      chapterTitle:'Security',
      sourceTopicNumber:17,
      sourceSubtopicCode:'17.1',
      includeLoTextAny:['Secure Socket Layer','Transport Layer Security','SSL','TLS'],
      mappingKind:'learning_objective_bridge',
    },
    {
      code:'17.4',
      title:'Digital signatures and digital certificates',
      chapterNumber:17,
      chapterTitle:'Security',
      sourceTopicNumber:17,
      sourceSubtopicCode:'17.1',
      includeLoTextAny:['digital cert'],
      mappingKind:'learning_objective_bridge',
    },
  ]],
  [18, [
    {
      code:'18.1',
      title:'Shortest path algorithms',
      chapterNumber:18,
      chapterTitle:'Artificial intelligence (AI)',
      sourceTopicNumber:18,
      sourceSubtopicCode:'18.1',
      includeLoTextAny:['graphs can be used','Dijkstra','A*'],
      mappingKind:'learning_objective_bridge',
    },
    {
      code:'18.2',
      title:'Artificial intelligence, machine learning and deep learning',
      chapterNumber:18,
      chapterTitle:'Artificial intelligence (AI)',
      sourceTopicNumber:18,
      sourceSubtopicCode:'18.1',
      excludeLoTextAny:['graphs can be used','Dijkstra','A*'],
      mappingKind:'learning_objective_bridge',
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
 * Most chapter sections align 1:1 with the syllabus. The uploaded Hodder
 * chapters prove several deliberate splits/relocations (2, 7, 15/16, 17 and
 * 18). Keep those classroom labels here while preserving the official syllabus
 * rows used for assessment evidence.
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
export const LIVE_COURSEBOOK_SECTION_CODES = new Set(byCode.keys());

export type CoursebookTaxonomyEvidence = {
  subtopics: Array<{ topicNumber:number; code:string }>;
  learningObjectives: Array<{ topicNumber:number; subtopicCode:string; text:string }>;
};

export function coursebookSectionsForEvidence(evidence:CoursebookTaxonomyEvidence) {
  const normalizedLo=evidence.learningObjectives.map((lo)=>({
    ...lo,
    normalized:lo.text.toLocaleLowerCase(),
  }));
  return LIVE_COURSEBOOK_SECTIONS.filter((section)=>{
    const inSourceSubtopic=evidence.subtopics.some((subtopic)=>
      subtopic.topicNumber===section.sourceTopicNumber
      && subtopic.code===section.sourceSubtopicCode
    );
    if(!inSourceSubtopic)return false;
    if(section.mappingKind==='direct_subtopic')return true;

    const sourceLos=normalizedLo.filter((lo)=>
      lo.topicNumber===section.sourceTopicNumber
      && lo.subtopicCode===section.sourceSubtopicCode
    );
    const includes=(section.includeLoTextAny??[]).map((term)=>term.toLocaleLowerCase());
    const excludes=(section.excludeLoTextAny??[]).map((term)=>term.toLocaleLowerCase());
    if(includes.length&&!sourceLos.some((lo)=>includes.some((term)=>lo.normalized.includes(term))))return false;
    if(excludes.length&&sourceLos.some((lo)=>excludes.some((term)=>lo.normalized.includes(term))))return false;
    return true;
  });
}

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

    const baseSubtopic=`exists(
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

    const loEvidence=(terms:string[],negated=false)=>{
      if(!terms.length)return null;
      const predicates=terms.map((term)=>{
        values.push(`%${term}%`);
        return `coursebook_lo.text ilike $${values.length}`;
      });
      return `${negated?'not ':''}exists(
        select 1
        from question_learning_objectives coursebook_qlo
        join learning_objectives coursebook_lo on coursebook_lo.id=coursebook_qlo.lo_id
        join subtopics coursebook_lo_st on coursebook_lo_st.id=coursebook_lo.subtopic_id
        join topics coursebook_lo_t on coursebook_lo_t.id=coursebook_lo_st.topic_id
        join syllabi coursebook_lo_sy on coursebook_lo_sy.id=coursebook_lo_t.syllabus_id
        where coursebook_qlo.question_id=${questionAlias}.id
          and coursebook_lo_sy.code='9618'
          and coursebook_lo_t.number=${topicParameter}
          and coursebook_lo_st.code=${subtopicParameter}
          and (${predicates.join(' or ')})
      )`;
    };

    const evidence=[baseSubtopic];
    const include=loEvidence(section.includeLoTextAny??[]);
    const exclude=loEvidence(section.excludeLoTextAny??[],true);
    if(include)evidence.push(include);
    if(exclude)evidence.push(exclude);
    return `(${evidence.join(' and ')})`;
  });

  return `(${clauses.join(' or ')})`;
}
