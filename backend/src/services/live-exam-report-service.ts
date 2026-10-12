import puppeteer from 'puppeteer-core';
import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { config } from '../config.js';
import { DomainError } from './assignments-service.js';

export interface LiveExamReportRow {
  studentId:string;
  studentName:string;
  questionPosition:number;
  displayRef:string;
  marks:number;
  score:number;
  percentage:number;
  scoreSource:string|null;
  teacherOverridden:boolean;
  feedback:string|null;
  topics:Array<{number:number;title:string}>;
  subtopics:Array<{code:string;title:string}>;
}

export interface LiveExamAggregateRow {
  key:string;
  label:string;
  learnerCount:number;
  answerCount:number;
  earned:number;
  possible:number;
  percentage:number;
}

export interface LiveExamDetailedReport {
  session:{
    id:string;
    title:string;
    className:string;
    finishedAt:string|null;
    participantCount:number;
    questionCount:number;
  };
  classAggregate:{
    totalEarned:number;
    totalPossible:number;
    averageEarnedPerStudent:number;
    averagePossiblePerStudent:number;
    averagePercentage:number;
  };
  students:Array<{
    studentId:string;
    studentName:string;
    earned:number;
    possible:number;
    percentage:number;
  }>;
  questions:Array<{
    questionPosition:number;
    displayRef:string;
    learnerCount:number;
    earned:number;
    possible:number;
    averageScore:number;
    averagePercentage:number;
  }>;
  topics:LiveExamAggregateRow[];
  subtopics:LiveExamAggregateRow[];
  mostMissedMarkPoints:Array<{
    questionPosition:number;
    displayRef:string;
    code:string;
    text:string;
    marks:number;
    attempts:number;
    matched:number;
    missed:number;
    missRate:number;
  }>;
  reteachCandidates:Array<{
    subtopicCode:string;
    subtopicTitle:string;
    percentage:number;
    earned:number;
    possible:number;
    learnerCount:number;
    answerCount:number;
    basis:'lowest_observed_mark_rate';
  }>;
  rows:LiveExamReportRow[];
}

function percent(earned:number,possible:number) {
  return possible>0 ? Math.round((earned/possible)*1000)/10 : 0;
}

function csvCell(value:unknown) {
  const text=value==null?'':String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"','""')}"` : text;
}

export function liveExamReportCsv(report:LiveExamDetailedReport) {
  const header=[
    'Student','Question','Score','Possible','Percent','Score source','Teacher override','Topics','Subtopics',
  ];
  const lines=[header.map(csvCell).join(',')];
  for(const row of report.rows) {
    lines.push([
      row.studentName,
      row.displayRef,
      row.score,
      row.marks,
      row.percentage,
      row.scoreSource??'',
      row.teacherOverridden?'yes':'no',
      row.topics.map((item)=>`${item.number}. ${item.title}`).join(' | '),
      row.subtopics.map((item)=>`${item.code} ${item.title}`).join(' | '),
    ].map(csvCell).join(','));
  }
  return '\uFEFF'+lines.join('\r\n');
}

function htmlEscape(value:unknown) {
  return String(value??'').replace(/[&<>"']/g,(char)=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
  })[char]??char);
}

export function renderLiveExamReportHtml(report:LiveExamDetailedReport,watermark:string) {
  const rows=(items:string[])=>items.join('');
  const studentRows=rows(report.students.map((item)=>`<tr><td>${htmlEscape(item.studentName)}</td><td>${item.earned} / ${item.possible}</td><td>${item.percentage}%</td></tr>`));
  const questionRows=rows(report.questions.map((item)=>`<tr><td>${item.questionPosition+1}. ${htmlEscape(item.displayRef)}</td><td>${item.averageScore.toFixed(2)}</td><td>${item.averagePercentage}%</td></tr>`));
  const subtopicRows=rows(report.subtopics.map((item)=>`<tr><td>${htmlEscape(item.label)}</td><td>${item.earned} / ${item.possible}</td><td>${item.percentage}%</td><td>${item.learnerCount}</td></tr>`));
  const missedRows=rows(report.mostMissedMarkPoints.map((item)=>`<tr><td>${htmlEscape(item.displayRef)}</td><td>${htmlEscape(item.code)}</td><td>${htmlEscape(item.text)}</td><td>${item.missed} / ${item.attempts}</td><td>${item.missRate}%</td></tr>`));
  const reteachRows=rows(report.reteachCandidates.map((item)=>`<tr><td>${htmlEscape(item.subtopicCode)} ${htmlEscape(item.subtopicTitle)}</td><td>${item.earned} / ${item.possible}</td><td>${item.percentage}%</td><td>${item.learnerCount}</td></tr>`));
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;font-size:11px}
    h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:20px 0 8px}p{margin:3px 0}.muted{color:#657084}
    .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.stat{border:1px solid #d8dde8;padding:10px;border-radius:7px}.stat b{display:block;font-size:18px}
    table{width:100%;border-collapse:collapse;margin:6px 0 12px}th,td{border:1px solid #d8dde8;padding:6px;text-align:left;vertical-align:top}th{background:#f3f5f8}
    footer{position:fixed;bottom:0;left:0;right:0;font-size:8px;color:#7a8497;text-align:center}
  </style></head><body>
  <h1>${htmlEscape(report.session.title)}</h1><p>${htmlEscape(report.session.className)} · Live Challenge detailed report</p>
  <p class="muted">Finished: ${htmlEscape(report.session.finishedAt??'—')} · ${report.session.participantCount} learners · ${report.session.questionCount} questions</p>
  <div class="stats"><div class="stat"><span>Class total</span><b>${report.classAggregate.totalEarned} / ${report.classAggregate.totalPossible}</b></div>
  <div class="stat"><span>Average per learner</span><b>${report.classAggregate.averageEarnedPerStudent.toFixed(2)} / ${report.classAggregate.averagePossiblePerStudent.toFixed(2)}</b></div>
  <div class="stat"><span>Average percentage</span><b>${report.classAggregate.averagePercentage}%</b></div></div>
  <h2>Per learner</h2><table><thead><tr><th>Learner</th><th>Marks</th><th>%</th></tr></thead><tbody>${studentRows}</tbody></table>
  <h2>Per question</h2><table><thead><tr><th>Question</th><th>Average mark</th><th>Average %</th></tr></thead><tbody>${questionRows}</tbody></table>
  <h2>Subtopic evidence</h2><table><thead><tr><th>Subtopic</th><th>Marks</th><th>%</th><th>Learners</th></tr></thead><tbody>${subtopicRows}</tbody></table>
  <h2>Most-missed mark points</h2><table><thead><tr><th>Question</th><th>Point</th><th>Criterion</th><th>Missed</th><th>Miss rate</th></tr></thead><tbody>${missedRows||'<tr><td colspan="5">No point-level evidence.</td></tr>'}</tbody></table>
  <h2>Reteach candidates</h2><p class="muted">Evidence basis: the lowest observed subtopic mark rates in this completed session. This is a prioritisation signal, not an inferred diagnosis.</p>
  <table><thead><tr><th>Subtopic</th><th>Marks</th><th>%</th><th>Learners</th></tr></thead><tbody>${reteachRows||'<tr><td colspan="4">No subtopic evidence.</td></tr>'}</tbody></table>
  <footer>${htmlEscape(watermark)}</footer></body></html>`;
}

type MappingRow={session_question_id:string;topic_number:number;topic_title:string;subtopic_code:string;subtopic_title:string};

export class LiveExamReportService {
  constructor(private readonly pool:Pool) {}

  private async controlledFinishedSession(actor:Actor,sessionId:string) {
    if(actor.role==='student')throw new DomainError('staff_only',403);
    const result=await this.pool.query(
      `select les.id,les.title,les.status::text,les.finished_at,c.name class_name
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       where les.id=$1 and (
         ($2='owner' and c.school_id=$3)
         or ($2='teacher' and (c.owner_id=$4 or exists(
           select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4
         )))
       )`,
      [sessionId,actor.role,actor.schoolId,actor.id],
    );
    if(!result.rowCount)throw new DomainError('not_found',404);
    if(result.rows[0].status!=='finished')throw new DomainError('live_report_not_ready',409);
    return result.rows[0] as {id:string;title:string;status:string;finished_at:Date|null;class_name:string};
  }

  async report(actor:Actor,sessionId:string):Promise<LiveExamDetailedReport> {
    const session=await this.controlledFinishedSession(actor,sessionId);
    const [detailResult,mappingResult,topicResult,subtopicResult,missedResult]=await Promise.all([
      this.pool.query(
        `select lep.student_id,u.full_name,leq.id session_question_id,leq.position,leq.marks,
           coalesce(leq.question_snapshot->>'sourceRef',leq.question_snapshot->'leaf'->>'displayRef','') display_ref,
           a.final_score::float8 score,a.score_source::text,a.final_feedback_md,
           (a.moderated_by is not null) teacher_overridden
         from live_exam_participants lep
         join users u on u.id=lep.student_id
         join live_exam_questions leq on leq.session_id=lep.session_id
         left join live_exam_answers a on a.session_question_id=leq.id and a.participant_id=lep.id
         where lep.session_id=$1 and lep.left_at is null
         order by u.full_name,lep.student_id,leq.position`,
        [sessionId],
      ),
      this.pool.query<MappingRow>(
        `select distinct e.session_question_id,t.number topic_number,t.title topic_title,
           st.code subtopic_code,st.title subtopic_title
         from live_exam_learning_evidence e
         join subtopics st on st.id=e.subtopic_id
         join topics t on t.id=st.topic_id
         where e.session_id=$1
         order by e.session_question_id,t.number,st.code`,
        [sessionId],
      ),
      this.pool.query(
        `with evidence as (
           select distinct e.answer_id,e.student_id,t.id topic_id,t.number,t.title,e.marks_earned,e.marks_possible
           from live_exam_learning_evidence e
           join subtopics st on st.id=e.subtopic_id
           join topics t on t.id=st.topic_id
           where e.session_id=$1
         )
         select topic_id,number,title,count(distinct student_id)::int learner_count,count(*)::int answer_count,
           coalesce(sum(marks_earned),0)::float8 earned,coalesce(sum(marks_possible),0)::float8 possible
         from evidence group by topic_id,number,title order by number`,
        [sessionId],
      ),
      this.pool.query(
        `with evidence as (
           select distinct e.answer_id,e.student_id,e.subtopic_id,e.marks_earned,e.marks_possible
           from live_exam_learning_evidence e where e.session_id=$1
         )
         select st.id subtopic_id,st.code,st.title,count(distinct evidence.student_id)::int learner_count,
           count(*)::int answer_count,coalesce(sum(evidence.marks_earned),0)::float8 earned,
           coalesce(sum(evidence.marks_possible),0)::float8 possible
         from evidence join subtopics st on st.id=evidence.subtopic_id
         group by st.id,st.code,st.title order by st.code`,
        [sessionId],
      ),
      this.pool.query(
        `with catalog as (
           select leq.id session_question_id,leq.position,
             coalesce(leq.question_snapshot->>'sourceRef',leq.question_snapshot->'leaf'->>'displayRef','') display_ref,
             point.value->>'id' point_id,coalesce(point.value->>'code','') code,
             coalesce(point.value->>'text','') text,coalesce((point.value->>'marks')::numeric,0)::float8 marks
           from live_exam_questions leq
           cross join lateral jsonb_array_elements(coalesce(leq.mark_scheme_snapshot->'points','[]'::jsonb))
             with ordinality point(value,ordinality)
           where leq.session_id=$1
         ), outcomes as (
           select r.session_question_id,rp.mark_scheme_point_id::text point_id,
             count(*) filter(where r.status in('submitted','moderated'))::int attempts,
             count(*) filter(where r.status in('submitted','moderated') and rp.matched)::int matched
           from live_exam_reviews r
           join live_exam_review_points rp on rp.review_id=r.id
           join live_exam_questions leq on leq.id=r.session_question_id
           where leq.session_id=$1
           group by r.session_question_id,rp.mark_scheme_point_id
         )
         select catalog.*,coalesce(outcomes.attempts,0)::int attempts,coalesce(outcomes.matched,0)::int matched
         from catalog left join outcomes
           on outcomes.session_question_id=catalog.session_question_id and outcomes.point_id=catalog.point_id
         where coalesce(outcomes.attempts,0)>0
         order by (coalesce(outcomes.attempts,0)-coalesce(outcomes.matched,0)) desc,
           case when coalesce(outcomes.attempts,0)>0
             then (coalesce(outcomes.attempts,0)-coalesce(outcomes.matched,0))::float/coalesce(outcomes.attempts,1)
             else 0 end desc,
           catalog.position,catalog.code
         limit 20`,
        [sessionId],
      ),
    ]);

    const mappingByQuestion=new Map<string,{topics:Array<{number:number;title:string}>;subtopics:Array<{code:string;title:string}>}>();
    for(const row of mappingResult.rows) {
      const current=mappingByQuestion.get(row.session_question_id)??{topics:[],subtopics:[]};
      if(!current.topics.some((item)=>item.number===Number(row.topic_number)))current.topics.push({number:Number(row.topic_number),title:String(row.topic_title)});
      if(!current.subtopics.some((item)=>item.code===String(row.subtopic_code)))current.subtopics.push({code:String(row.subtopic_code),title:String(row.subtopic_title)});
      mappingByQuestion.set(row.session_question_id,current);
    }

    const rows:LiveExamReportRow[]=detailResult.rows.map((row)=>{
      const marks=Number(row.marks);
      const score=row.score==null?0:Number(row.score);
      const mapping=mappingByQuestion.get(String(row.session_question_id))??{topics:[],subtopics:[]};
      return {
        studentId:String(row.student_id),studentName:String(row.full_name),
        questionPosition:Number(row.position),displayRef:String(row.display_ref),marks,score,
        percentage:percent(score,marks),scoreSource:row.score_source==null?null:String(row.score_source),
        teacherOverridden:Boolean(row.teacher_overridden),feedback:row.final_feedback_md==null?null:String(row.final_feedback_md),
        topics:mapping.topics,subtopics:mapping.subtopics,
      };
    });

    const studentMap=new Map<string,{studentId:string;studentName:string;earned:number;possible:number}>();
    const questionMap=new Map<number,{questionPosition:number;displayRef:string;learnerCount:number;earned:number;possible:number}>();
    for(const row of rows) {
      const student=studentMap.get(row.studentId)??{studentId:row.studentId,studentName:row.studentName,earned:0,possible:0};
      student.earned+=row.score;student.possible+=row.marks;studentMap.set(row.studentId,student);
      const question=questionMap.get(row.questionPosition)??{questionPosition:row.questionPosition,displayRef:row.displayRef,learnerCount:0,earned:0,possible:0};
      question.learnerCount+=1;question.earned+=row.score;question.possible+=row.marks;questionMap.set(row.questionPosition,question);
    }
    const students=[...studentMap.values()].map((item)=>({...item,percentage:percent(item.earned,item.possible)}))
      .sort((a,b)=>b.earned-a.earned||a.studentName.localeCompare(b.studentName));
    const questions=[...questionMap.values()].map((item)=>({
      ...item,
      averageScore:item.learnerCount?item.earned/item.learnerCount:0,
      averagePercentage:percent(item.earned,item.possible),
    })).sort((a,b)=>a.questionPosition-b.questionPosition);
    const totalEarned=students.reduce((sum,item)=>sum+item.earned,0);
    const totalPossible=students.reduce((sum,item)=>sum+item.possible,0);
    const participantCount=students.length;

    const toAggregate=(row:any,label:string):LiveExamAggregateRow=>{
      const earned=Number(row.earned),possible=Number(row.possible);
      return {key:String(row.topic_id??row.subtopic_id),label,learnerCount:Number(row.learner_count),answerCount:Number(row.answer_count),earned,possible,percentage:percent(earned,possible)};
    };
    const topics=topicResult.rows.map((row)=>toAggregate(row,`${row.number}. ${row.title}`));
    const subtopics=subtopicResult.rows.map((row)=>toAggregate(row,`${row.code} ${row.title}`));
    const mostMissedMarkPoints=missedResult.rows.map((row)=>{
      const attempts=Number(row.attempts),matched=Number(row.matched),missed=Math.max(0,attempts-matched);
      return {questionPosition:Number(row.position),displayRef:String(row.display_ref),code:String(row.code),text:String(row.text),marks:Number(row.marks),attempts,matched,missed,missRate:percent(missed,attempts)};
    });
    const reteachCandidates=subtopics.filter((item)=>item.possible>0&&item.earned<item.possible)
      .sort((a,b)=>a.percentage-b.percentage||b.possible-a.possible||a.label.localeCompare(b.label))
      .slice(0,5)
      .map((item)=>{
        const match=item.label.match(/^(\S+)\s+(.*)$/);
        return {
          subtopicCode:match?.[1]??item.label,subtopicTitle:match?.[2]??'',
          percentage:item.percentage,earned:item.earned,possible:item.possible,
          learnerCount:item.learnerCount,answerCount:item.answerCount,basis:'lowest_observed_mark_rate' as const,
        };
      });

    return {
      session:{id:session.id,title:session.title,className:session.class_name,finishedAt:session.finished_at?.toISOString?.()??(session.finished_at?String(session.finished_at):null),participantCount,questionCount:questions.length},
      classAggregate:{
        totalEarned,totalPossible,
        averageEarnedPerStudent:participantCount?totalEarned/participantCount:0,
        averagePossiblePerStudent:participantCount?totalPossible/participantCount:0,
        averagePercentage:percent(totalEarned,totalPossible),
      },
      students,questions,topics,subtopics,mostMissedMarkPoints,reteachCandidates,rows,
    };
  }

  async csv(actor:Actor,sessionId:string) {
    return Buffer.from(liveExamReportCsv(await this.report(actor,sessionId)),'utf8');
  }

  async pdf(actor:Actor,sessionId:string) {
    const report=await this.report(actor,sessionId);
    const watermark=`${report.session.className} · ${new Date().toISOString().slice(0,10)} · Ichki foydalanish uchun`;
    let executable=config.CHROME_EXECUTABLE_PATH??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    let launchArgs=['--no-sandbox'];
    if(process.env.VERCEL){
      const chromium=(await import('@sparticuz/chromium-min')).default;
      executable=await chromium.executablePath(config.CHROMIUM_PACK_URL??'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar');
      launchArgs=chromium.args;
    }
    const browser=await puppeteer.launch({executablePath:executable,headless:true,args:launchArgs});
    try{
      const page=await browser.newPage();
      await page.setContent(renderLiveExamReportHtml(report,watermark),{waitUntil:'load'});
      const pdf=await page.pdf({format:'A4',printBackground:true});
      return Buffer.from(pdf);
    }finally{
      await browser.close();
    }
  }
}
