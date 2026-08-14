import type{Pool}from'pg';

export interface SyllabusCoverageRow{syllabusId:string;code:string;title:string;validFrom:number;validTo:number;componentCount:number;topicCount:number;subtopicCount:number;learningObjectiveCount:number}
export interface SyllabusYearCoverage{year:number;status:'covered'|'missing'|'ambiguous'|'incomplete';matches:SyllabusCoverageRow[];message:string}
export interface SyllabusCoverageReport{code:string;yearFrom:number;yearTo:number;ready:boolean;years:SyllabusYearCoverage[]}

export async function loadSyllabusCoverage(pool:Pool,input:{code?:string;yearFrom?:number;yearTo?:number}={}):Promise<SyllabusCoverageReport>{
 const code=input.code??'9618',yearFrom=input.yearFrom??2021,yearTo=input.yearTo??2025;if(!/^\d{4}$/.test(code))throw new Error('syllabus_coverage_code_invalid');if(!Number.isInteger(yearFrom)||!Number.isInteger(yearTo)||yearFrom>yearTo)throw new Error('syllabus_coverage_year_range_invalid');
 const result=await pool.query(`select s.id,s.code,s.title,s.valid_from,s.valid_to,
   count(distinct c.id)::int component_count,count(distinct t.id)::int topic_count,
   count(distinct st.id)::int subtopic_count,count(distinct lo.id)::int learning_objective_count
  from syllabi s
  left join components c on c.syllabus_id=s.id
  left join topics t on t.syllabus_id=s.id
  left join subtopics st on st.topic_id=t.id
  left join learning_objectives lo on lo.subtopic_id=st.id
  where s.code=$1 and s.valid_to>=$2 and s.valid_from<=$3
  group by s.id,s.code,s.title,s.valid_from,s.valid_to
  order by s.valid_from,s.valid_to`,[code,yearFrom,yearTo]);
 const rows:SyllabusCoverageRow[]=result.rows.map(row=>({syllabusId:String(row.id),code:String(row.code),title:String(row.title),validFrom:Number(row.valid_from),validTo:Number(row.valid_to),componentCount:Number(row.component_count),topicCount:Number(row.topic_count),subtopicCount:Number(row.subtopic_count),learningObjectiveCount:Number(row.learning_objective_count)}));
 const years:SyllabusYearCoverage[]=[];for(let year=yearFrom;year<=yearTo;year++){const matches=rows.filter(row=>row.validFrom<=year&&row.validTo>=year);if(!matches.length){years.push({year,status:'missing',matches,message:`No ${code} syllabus version covers ${year}.`});continue}if(matches.length>1){years.push({year,status:'ambiguous',matches,message:`${matches.length} syllabus versions overlap in ${year}.`});continue}const only=matches[0]!,complete=only.componentCount===4&&only.topicCount>0&&only.subtopicCount>0&&only.learningObjectiveCount>0;years.push({year,status:complete?'covered':'incomplete',matches,message:complete?`${only.title} covers ${year} with a populated taxonomy.`:`${only.title} covers ${year} but its taxonomy is incomplete (${only.componentCount} components, ${only.topicCount} topics, ${only.subtopicCount} subtopics, ${only.learningObjectiveCount} learning objectives).`})}
 return{code,yearFrom,yearTo,ready:years.every(item=>item.status==='covered'),years};
}
