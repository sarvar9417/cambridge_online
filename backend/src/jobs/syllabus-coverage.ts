import type{Pool}from'pg';

export interface SyllabusCoverageRow{syllabusId:string;code:string;subject:string;versionLabel:string;title:string;validFrom:number;validTo:number;componentCount:number;topicCount:number;subtopicCount:number;learningObjectiveCount:number;componentTopicCount:number;componentLearningObjectiveCount:number}
export interface SyllabusYearCoverage{year:number;status:'covered'|'missing'|'ambiguous'|'incomplete';matches:SyllabusCoverageRow[];message:string}
export interface SyllabusCoverageReport{code:string;yearFrom:number;yearTo:number;ready:boolean;years:SyllabusYearCoverage[]}

export async function loadSyllabusCoverage(pool:Pool,input:{code?:string;yearFrom?:number;yearTo?:number}={}):Promise<SyllabusCoverageReport>{
 const code=input.code??'9618',yearFrom=input.yearFrom??2021,yearTo=input.yearTo??2025;if(!/^\d{4}$/.test(code))throw new Error('syllabus_coverage_code_invalid');if(!Number.isInteger(yearFrom)||!Number.isInteger(yearTo)||yearFrom>yearTo)throw new Error('syllabus_coverage_year_range_invalid');
 const result=await pool.query(`select s.id,s.code,s.subject,s.version_label,s.valid_from,s.valid_to,
   count(distinct c.id)::int component_count,count(distinct t.id)::int topic_count,
   count(distinct st.id)::int subtopic_count,count(distinct lo.id)::int learning_objective_count,
   count(distinct (ct.component_id,ct.topic_id))::int component_topic_count,
   count(distinct (clo.component_id,clo.learning_objective_id))::int component_learning_objective_count
  from syllabi s
  left join components c on c.syllabus_id=s.id
  left join topics t on t.syllabus_id=s.id
  left join subtopics st on st.topic_id=t.id
  left join learning_objectives lo on lo.subtopic_id=st.id
  left join component_topics ct on ct.topic_id=t.id
  left join component_learning_objectives clo on clo.learning_objective_id=lo.id
  where s.code=$1 and s.valid_to>=$2 and s.valid_from<=$3
  group by s.id,s.code,s.subject,s.version_label,s.valid_from,s.valid_to
  order by s.valid_from,s.valid_to`,[code,yearFrom,yearTo]);
 const rows:SyllabusCoverageRow[]=result.rows.map(row=>{const subject=String(row.subject),versionLabel=String(row.version_label);return{syllabusId:String(row.id),code:String(row.code),subject,versionLabel,title:`${subject} ${versionLabel}`,validFrom:Number(row.valid_from),validTo:Number(row.valid_to),componentCount:Number(row.component_count),topicCount:Number(row.topic_count),subtopicCount:Number(row.subtopic_count),learningObjectiveCount:Number(row.learning_objective_count),componentTopicCount:Number(row.component_topic_count),componentLearningObjectiveCount:Number(row.component_learning_objective_count)}});
 const years:SyllabusYearCoverage[]=[];for(let year=yearFrom;year<=yearTo;year++){const matches=rows.filter(row=>row.validFrom<=year&&row.validTo>=year);if(!matches.length){years.push({year,status:'missing',matches,message:`No ${code} syllabus version covers ${year}.`});continue}if(matches.length>1){years.push({year,status:'ambiguous',matches,message:`${matches.length} syllabus versions overlap in ${year}.`});continue}const only=matches[0]!,complete=isComplete(code,only);years.push({year,status:complete?'covered':'incomplete',matches,message:complete?`${only.title} covers ${year} with a populated taxonomy and component crosswalk.`:`${only.title} covers ${year} but its taxonomy/crosswalk is incomplete (${only.componentCount} components, ${only.topicCount} topics, ${only.subtopicCount} subtopics, ${only.learningObjectiveCount} learning objectives, ${only.componentTopicCount} component-topic links, ${only.componentLearningObjectiveCount} component-LO links).`})}
 return{code,yearFrom,yearTo,ready:years.every(item=>item.status==='covered'),years};
}
function isComplete(code:string,row:SyllabusCoverageRow){if(code==='9618')return row.componentCount===4&&row.topicCount===20&&row.subtopicCount===44&&row.learningObjectiveCount>0&&row.componentTopicCount>=22&&row.componentLearningObjectiveCount>=row.learningObjectiveCount;return row.componentCount>0&&row.topicCount>0&&row.subtopicCount>0&&row.learningObjectiveCount>0&&row.componentTopicCount>0&&row.componentLearningObjectiveCount>0}
