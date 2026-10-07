import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer, { type Browser, type BrowserContext, type ConsoleMessage, type HTTPRequest, type Page } from 'puppeteer-core';

type ActorKey='teacher'|'projector'|'student1'|'student2';
type StudentKey='student1'|'student2';
type Mode='teacher'|'self';
type Status='question_open'|'marking'|'review'|'finished';
type Viewport={width:number;height:number};
type Answer={text:string;submitted:boolean;score:number|null;feedback:string|null;updatedAt:string};
type Review={id:string;target:StudentKey;kind:Mode;status:'assigned'|'submitted';score:number|null;feedback:string|null};
type HarnessState={
  sessionId:string;
  code:string;
  mode:Mode;
  status:Status;
  version:number;
  joined:Set<StudentKey>;
  answers:Record<StudentKey,Answer>;
  reviews:Record<StudentKey,Review>;
  allowLateJoin:boolean;
  lateJoinCreatedAnswer:boolean;
  expireOnHeartbeat:boolean;
  expiryReconciled:boolean;
};

const CLASS_ID='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const QUESTION_ID='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SESSION_QUESTION_ID='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const ASSET_ID='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const POINT_ID='11111111-1111-4111-8111-111111111111';
const PAPER_ID='ffffffff-ffff-4fff-8fff-ffffffffffff';
const baseTime=Date.parse('2026-10-07T06:40:00.000Z');
const iso=(offset=0)=>new Date(baseTime+offset).toISOString();
let tick=0;
const studentNumber=(student:StudentKey)=>Number(student.replace('student',''));
const studentId=(student:StudentKey)=>`30000000-0000-4000-8000-00000000000${studentNumber(student)}`;
const participantId=(student:StudentKey)=>`40000000-0000-4000-8000-00000000000${studentNumber(student)}`;
const answerId=(student:StudentKey)=>`50000000-0000-4000-8000-00000000000${studentNumber(student)}`;

function makeState(sessionId:string,code:string,mode:Mode,joined:StudentKey[]):HarnessState{
  const reviews:Record<StudentKey,Review>={
    student1:{id:`61000000-0000-4000-8000-000000000001`,target:'student1',kind:mode,status:'assigned',score:null,feedback:null},
    student2:{id:`61000000-0000-4000-8000-000000000002`,target:'student2',kind:mode,status:'assigned',score:null,feedback:null},
  };
  return{
    sessionId,code,mode,status:'question_open',version:1,joined:new Set(joined),allowLateJoin:true,lateJoinCreatedAnswer:false,
    expireOnHeartbeat:false,expiryReconciled:false,
    answers:{
      student1:{text:'',submitted:false,score:null,feedback:null,updatedAt:iso()},
      student2:{text:'',submitted:false,score:null,feedback:null,updatedAt:iso()},
    },
    reviews,
  };
}

const dist=normalize(join(fileURLToPath(new URL('.',import.meta.url)),'../../frontend/dist'));
const mime=(path:string)=>({
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.svg':'image/svg+xml',
  '.woff2':'font/woff2',
  '.ttf':'font/ttf',
}[extname(path)]??'application/octet-stream');

const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url??'/','http://localhost').pathname;
  const relative=pathname==='/'?'index.html':pathname.replace(/^\//,'');
  const candidate=normalize(join(dist,relative));
  if(!candidate.startsWith(dist)){res.writeHead(403).end();return;}
  try{
    const info=await stat(candidate);
    if(!info.isFile())throw new Error('not-file');
    res.writeHead(200,{'content-type':mime(candidate)});
    res.end(await readFile(candidate));
  }catch{
    res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
    res.end(await readFile(join(dist,'index.html')));
  }
});
const listen=()=>new Promise<import('node:net').AddressInfo>((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>{
    const address=server.address();
    if(!address||typeof address==='string'){reject(new Error('Static server did not expose a TCP port'));return;}
    resolve(address);
  });
});

function respondJson(request:HTTPRequest,body:unknown,status=200){
  return request.respond({status,contentType:'application/json',body:JSON.stringify(body)});
}
function respondError(request:HTTPRequest,message:string,code:string,status:number){
  return respondJson(request,{error:{message,code}},status);
}
function body(request:HTTPRequest){
  try{return JSON.parse(request.postData()??'{}') as Record<string,unknown>;}catch{return{} as Record<string,unknown>;}
}
function bump(state:HarnessState){state.version+=1;tick+=1;return state.version;}
function touch(answer:Answer){tick+=1;answer.updatedAt=iso(tick*1000);}
function isStudent(actor:ActorKey):actor is StudentKey{return actor==='student1'||actor==='student2';}

function user(actor:ActorKey){
  if(actor==='teacher'||actor==='projector')return{
    id:'10000000-0000-4000-8000-000000000001',fullName:'Acceptance teacher',role:'teacher',schoolId:'20000000-0000-4000-8000-000000000001',
  };
  return{id:studentId(actor),fullName:`Acceptance student ${studentNumber(actor)}`,role:'student',schoolId:'20000000-0000-4000-8000-000000000001'};
}

const sourceSvg='<svg xmlns="http://www.w3.org/2000/svg" width="520" height="150"><rect x="8" y="8" width="504" height="134" fill="white" stroke="black"/><text x="30" y="60" font-size="22">A</text><path d="M60 52 H180" stroke="black" stroke-width="3"/><rect x="180" y="28" width="110" height="65" fill="none" stroke="black" stroke-width="3"/><text x="205" y="67" font-size="22">NOT</text><path d="M290 60 H430" stroke="black" stroke-width="3"/><text x="445" y="67" font-size="22">Q</text></svg>';
const assetUrl=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(sourceSvg)}`;
const markScheme={
  id:'70000000-0000-4000-8000-000000000001',schemeType:'points',maxMarks:1,guidanceMd:null,levels:[],groups:[],
  points:[{id:POINT_ID,code:'M1',text:'Correct output stated.',marks:1,accept:null,reject:null,requires:[],isBod:false,groupId:null}],
};

function question(){
  return{
    id:SESSION_QUESTION_ID,sourceQuestionId:QUESTION_ID,position:0,marks:1,
    portable:{
      leaf:{
        id:QUESTION_ID,rootId:QUESTION_ID,label:'4',path:'4',displayRef:'9618/31/M/J/21 Q4',stem:'State the output Q.',commandWord:'State',marks:1,answerKind:'text',answerLines:2,
        contentJson:{version:1,source:{paperId:PAPER_ID,sha256:'b'.repeat(64)},blocks:[
          {type:'text',style:'task',text:'State the output Q.',source:{page:6}},
          {type:'asset',kind:'logic_circuit',assetId:ASSET_ID,altText:'Logic circuit',source:{page:6}},
          {type:'answer_area',kind:'lines',lines:2,source:{page:6}},
        ]},
      },
      chain:[{id:QUESTION_ID,label:'4',depth:0}],
      contextBlocks:[{id:QUESTION_ID,label:'4',displayRef:'9618/31/M/J/21 Q4',depth:0,context:null,assets:[
        {id:ASSET_ID,kind:'diagram',storagePath:null,url:assetUrl,contentMd:null,altText:'Logic circuit',sortOrder:0,sourcePage:6},
      ]}],
      dependencies:[],sourceRef:'9618/31/M/J/21 Q4',
    },
    dependencyWork:[],
  };
}

function ownAnswer(state:HarnessState,student:StudentKey){
  const answer=state.answers[student];
  return{
    id:answerId(student),text:answer.text,wordCount:answer.text.trim()?answer.text.trim().split(/\s+/).length:0,
    submittedAt:answer.submitted?iso(10_000):null,score:answer.score,feedback:answer.feedback,
    scoreSource:answer.score===null?null:state.mode,moderatedAt:null,updatedAt:answer.updatedAt,
  };
}
function teacherAnswers(state:HarnessState){
  return [...state.joined].map((student)=>{
    const answer=state.answers[student],review=state.reviews[student];
    return{
      ...ownAnswer(state,student),studentName:`Acceptance student ${studentNumber(student)}`,studentId:studentId(student),
      reviewId:review.id,reviewStatus:review.status,reviewKind:review.kind,
      reviewMatchedPointIds:review.score===1?[POINT_ID]:[],
    };
  });
}
function reviewFor(state:HarnessState,actor:StudentKey){
  if(state.status!=='marking'||state.mode!=='self')return null;
  const review=state.reviews[actor],answer=state.answers[actor];
  return{
    id:review.id,answerId:answerId(actor),kind:'self',status:review.status,answerText:answer.text,
    awardedMarks:review.score,feedback:review.feedback,submittedAt:review.status==='submitted'?iso(20_000):null,
    points:markScheme.points.map(point=>({...point,matched:review.score===1})),
  };
}
function report(state:HarnessState,actor:ActorKey){
  if(state.status!=='finished')return null;
  if(actor==='teacher'||actor==='projector'){
    const rows=[...state.joined].map(student=>({
      questionPosition:0,displayRef:'9618/31/M/J/21 Q4',marks:1,answerText:state.answers[student].text,
      score:state.answers[student].score,scoreSource:state.mode,studentId:studentId(student),studentName:`Acceptance student ${studentNumber(student)}`,
    }));
    return{rows,earned:rows.reduce((sum,row)=>sum+(row.score??0),0),possible:rows.length};
  }
  const answer=state.answers[actor];
  return{rows:[{questionPosition:0,displayRef:'9618/31/M/J/21 Q4',marks:1,answerText:answer.text,score:answer.score,scoreSource:state.mode}],earned:answer.score??0,possible:1};
}
function snapshot(state:HarnessState,actor:ActorKey){
  const detailed=actor==='teacher';
  const submitted=[...state.joined].filter(student=>state.answers[student].submitted).length;
  const reviewed=[...state.joined].filter(student=>state.reviews[student].status==='submitted').length;
  return{
    session:{
      id:state.sessionId,classId:CLASS_ID,className:'AS Computer Science',
      title:state.mode==='teacher'?'Teacher-mode acceptance':'Self-mode late-join acceptance',
      joinCode:state.code,status:state.status,markingMode:state.mode,questionTimeLimitS:300,version:state.version,
      pausedAt:null,pauseRemainingS:null,settings:{allowLateJoin:state.allowLateJoin,autoCloseWhenAllSubmitted:false,teacherOverrideEnabled:true,leaderboardMode:'marks'},
      questionCount:1,participantCount:state.joined.size,currentQuestionIndex:0,createdAt:iso(),updatedAt:iso(tick*1000),
      hostName:'Acceptance teacher',startedAt:iso(),finishedAt:state.status==='finished'?iso(40_000):null,questionStartedAt:iso(),
      deadline:iso(300_000),serverNow:iso(5_000),submittedCount:submitted,
      reviewCount:state.status==='marking'?state.joined.size:['review','finished'].includes(state.status)?state.joined.size:0,
      reviewedCount:state.status==='marking'?reviewed:['review','finished'].includes(state.status)?state.joined.size:0,
    },
    questions:detailed?[{id:SESSION_QUESTION_ID,position:0,marks:1,displayRef:'9618/31/M/J/21 Q4'}]:[],
    participants:detailed?[...state.joined].map(student=>({
      id:participantId(student),studentId:studentId(student),fullName:`Acceptance student ${studentNumber(student)}`,
      joinedAt:iso(),lastSeenAt:iso(),online:true,submitted:state.answers[student].submitted,score:state.answers[student].score,
      scoreSource:state.answers[student].score===null?null:state.mode,
    })):[],
    question:question(),markScheme:['marking','review','finished'].includes(state.status)?markScheme:null,
    ownAnswer:isStudent(actor)&&state.joined.has(actor)?ownAnswer(state,actor):null,
    review:isStudent(actor)&&state.joined.has(actor)?reviewFor(state,actor):null,
    teacherAnswers:detailed&&['marking','review','finished'].includes(state.status)?teacherAnswers(state):[],
    report:report(state,actor),
  };
}
function roundSummary(state:HarnessState){
  const standings=[...state.joined].map(student=>({
    studentId:studentId(student),studentName:`Acceptance student ${studentNumber(student)}`,score:state.answers[student].score??0,possible:1,
  })).sort((a,b)=>b.score-a.score||a.studentName.localeCompare(b.studentName)).map((row,index)=>({...row,rank:index+1}));
  return{
    sessionId:state.sessionId,questionPosition:0,marksFirst:true,leaderboardMode:'marks',
    round:{possible:1,average:standings.length?standings.reduce((sum,row)=>sum+row.score,0)/standings.length:0,distribution:[
      {score:0,count:standings.filter(row=>row.score===0).length},{score:1,count:standings.filter(row=>row.score===1).length},
    ],standings},
    overall:{possible:1,standings},
  };
}

async function handleApi(request:HTTPRequest,actor:ActorKey,state:HarnessState){
  const url=new URL(request.url());
  const path=url.pathname.slice('/api/v1'.length);
  const method=request.method().toUpperCase();

  if(path==='/auth/refresh')return respondJson(request,{accessToken:`token-${actor}-${state.mode}`,user:user(actor)});
  if(path==='/classes')return respondJson(request,{data:[{id:CLASS_ID,name:'AS Computer Science',grade:null,level:'AS',academicYear:'2026-2027',studentCount:2}]});
  if(path==='/assignments'||path==='/results'||path==='/exports')return respondJson(request,{data:[]});
  if(path==='/analytics/mastery'||path==='/analytics/command-words'||path==='/content/flashcards/due')return respondJson(request,{data:[]});
  if(path==='/content/games')return respondJson(request,{data:{termMatch:[],sequence:[],spotTheGap:[]}});
  if(path==='/live-exams')return respondJson(request,{data:[]});
  if(path==='/live-exams/join'&&method==='POST'){
    if(!isStudent(actor))return respondError(request,'students_only','students_only',403);
    const input=body(request);
    if(input.code!==state.code||state.status!=='question_open'||!state.allowLateJoin)return respondError(request,'Kod topilmadi.','live_code_not_found',404);
    state.joined.add(actor);state.answers[actor]={text:'',submitted:false,score:null,feedback:null,updatedAt:iso(tick*1000)};
    state.reviews[actor]={...state.reviews[actor],kind:state.mode,status:'assigned',score:null,feedback:null};
    state.lateJoinCreatedAnswer=true;bump(state);
    return respondJson(request,{sessionId:state.sessionId,participantId:participantId(actor)});
  }
  if(path===`/live-exams/${state.sessionId}`||path===`/live-exams/${state.sessionId}/projector`){
    if(isStudent(actor)&&!state.joined.has(actor))return respondError(request,'not_found','not_found',404);
    return respondJson(request,snapshot(state,actor));
  }
  if(path===`/live-exams/${state.sessionId}/events`){
    const after=Number(url.searchParams.get('afterVersion')??0);
    return respondJson(request,{sessionId:state.sessionId,currentVersion:state.version,changed:after!==state.version,events:after!==state.version?[{version:state.version,type:'mode.changed',createdAt:iso(tick*1000)}]:[]});
  }
  if(path===`/live-exams/${state.sessionId}/heartbeat`){
    if(state.expireOnHeartbeat&&!state.expiryReconciled&&state.status==='question_open'){
      for(const student of state.joined){
        state.answers[student].submitted=true;
        touch(state.answers[student]);
      }
      state.status='marking';
      state.expiryReconciled=true;
      bump(state);
    }
    return respondJson(request,{serverNow:iso(5_000)});
  }
  if(path===`/live-exams/${state.sessionId}/round-summary`)return respondJson(request,roundSummary(state));

  if(actor==='teacher'&&method==='POST'&&path===`/live-exams/${state.sessionId}/reveal`){
    state.status='marking';bump(state);return respondJson(request,{sessionId:state.sessionId,status:'marking',version:state.version});
  }
  if(actor==='teacher'&&method==='POST'&&path===`/live-exams/${state.sessionId}/marking/complete`){
    const pending=[...state.joined].filter(student=>state.reviews[student].status==='assigned');
    if(pending.length)return respondError(request,'Baholashlar tugallanmagan.','live_reviews_pending',409);
    state.status='review';bump(state);return respondJson(request,{sessionId:state.sessionId,status:'review',version:state.version});
  }
  if(actor==='teacher'&&method==='POST'&&path===`/live-exams/${state.sessionId}/next`){
    state.status='finished';bump(state);return respondJson(request,{sessionId:state.sessionId,status:'finished',version:state.version});
  }

  if(isStudent(actor)&&method==='PUT'&&path===`/live-exams/${state.sessionId}/answer`){
    if(!state.joined.has(actor)||state.status!=='question_open')return respondError(request,'locked','live_answer_locked',409);
    const input=body(request);if(typeof input.text==='string')state.answers[actor].text=input.text;touch(state.answers[actor]);
    return respondJson(request,{savedAt:state.answers[actor].updatedAt});
  }
  if(isStudent(actor)&&method==='POST'&&path===`/live-exams/${state.sessionId}/answer/submit`){
    if(!state.joined.has(actor)||state.status!=='question_open')return respondError(request,'locked','live_answer_locked',409);
    const input=body(request);if(typeof input.text==='string')state.answers[actor].text=input.text;
    state.answers[actor].submitted=true;touch(state.answers[actor]);bump(state);
    return respondJson(request,{submittedAt:iso(10_000),version:state.version,autoRevealed:false});
  }

  if(method==='POST'&&path.startsWith(`/live-exams/${state.sessionId}/reviews/`)&&path.endsWith('/submit')){
    const review=[...state.joined].map(student=>state.reviews[student]).find(item=>path.includes(item.id));
    if(!review)return respondError(request,'not_found','not_found',404);
    if(state.status!=='marking')return respondError(request,'invalid state','live_invalid_state',409);
    if(state.mode==='teacher'&&actor!=='teacher')return respondError(request,'not assigned','not_found',404);
    if(state.mode==='self'&&(!isStudent(actor)||review.target!==actor))return respondError(request,'not assigned','not_found',404);
    const input=body(request),matched=Array.isArray(input.matchedPointIds)&&input.matchedPointIds.includes(POINT_ID);
    review.status='submitted';review.score=matched?1:0;review.feedback=typeof input.feedback==='string'?input.feedback:null;
    const answer=state.answers[review.target];answer.score=review.score;answer.feedback=review.feedback;touch(answer);bump(state);
    return respondJson(request,{reviewId:review.id,score:review.score,version:state.version});
  }

  return respondJson(request,{data:[]});
}

async function installApi(page:Page,actor:ActorKey,state:HarnessState){
  await page.setRequestInterception(true);
  page.on('request',(request:HTTPRequest)=>{
    const url=new URL(request.url());
    if(!url.pathname.startsWith('/api/v1/')){void request.continue();return;}
    void handleApi(request,actor,state);
  });
}
async function openSurface(browser:Browser,base:string,actor:ActorKey,state:HarnessState,viewport:Viewport,hash:string){
  const context=await browser.createBrowserContext(),page=await context.newPage();
  await page.setViewport(viewport);await installApi(page,actor,state);
  const consoleErrors:string[]=[];
  page.on('console',(msg:ConsoleMessage)=>{if(msg.type()==='error')consoleErrors.push(msg.text());});
  page.on('pageerror',(err:unknown)=>consoleErrors.push(err instanceof Error?err.message:String(err)));
  await page.goto(`${base}/#${hash}`,{waitUntil:'networkidle0',timeout:30_000});
  return{context,page,consoleErrors};
}
async function waitText(page:Page,text:string,timeout=12_000){
  await page.waitForFunction(needle=>document.body.textContent?.includes(String(needle)),{timeout},text);
}
async function assertNoText(page:Page,text:string){
  const present=await page.evaluate(needle=>document.body.textContent?.includes(String(needle))??false,text);
  if(present)throw new Error(`Confidential text visible before reveal: ${text}`);
}
async function clickButton(page:Page,text:string){
  await page.waitForFunction(needle=>[...document.querySelectorAll('button')].some(button=>button.textContent?.includes(String(needle))),{timeout:12_000},text);
  const ok=await page.evaluate(needle=>{
    const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.includes(String(needle))) as HTMLButtonElement|undefined;
    if(!button||button.disabled)return false;button.click();return true;
  },text);
  if(!ok)throw new Error(`Button unavailable: ${text}`);
}
async function assertClean(items:Array<{consoleErrors:string[]}>,label:string){
  const errors=items.flatMap((item,index)=>item.consoleErrors.map(error=>`${label} surface ${index}: ${error}`));
  if(errors.length)throw new Error(errors.join(' | '));
}
async function closeAll(items:Array<{context:BrowserContext}>){
  await Promise.all(items.map(item=>item.context.close()));
}

async function teacherModeOneLearner(browser:Browser,base:string){
  const state=makeState('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','710001','teacher',['student1']);
  const teacher=await openSurface(browser,base,'teacher',state,{width:1440,height:1000},`oqitish/live?id=${state.sessionId}`);
  const projector=await openSurface(browser,base,'projector',state,{width:1920,height:1080},`oqitish/live?id=${state.sessionId}&projector=1`);
  const student=await openSurface(browser,base,'student1',state,{width:390,height:844},`oquvchi/live?id=${state.sessionId}`);
  const all=[teacher,projector,student];
  for(const item of all)await item.page.waitForSelector('.live-question-card',{timeout:15_000});
  for(const item of all){
    await assertNoText(item.page,'OFFICIAL MARK SCHEME');
    await assertNoText(item.page,'Correct output stated.');
  }

  await student.page.type('#live-answer','Q is zero');
  await clickButton(student.page,'Javobni topshirish');
  await clickButton(teacher.page,'Javoblarni yopish va MSni ochish');

  await Promise.all([
    waitText(teacher.page,'O‘QUVCHI JAVOBI'),
    waitText(teacher.page,'TEKSHIRILAYOTGAN SAVOL'),
    waitText(projector.page,'OFFICIAL MARK SCHEME'),
    waitText(student.page,'Baholash kutilmoqda'),
    waitText(student.page,'TEKSHIRILAYOTGAN SAVOL'),
  ]);

  await teacher.page.click('.live-teacher-marker .live-scheme-points input[type="checkbox"]');
  await teacher.page.type('.live-teacher-marker textarea','teacher browser mark');
  await clickButton(teacher.page,'Bahoni tasdiqlash');
  await waitText(teacher.page,'1/1 ta tugadi');
  await clickButton(teacher.page,'Natijalarni ochish');

  await Promise.all([
    waitText(student.page,'SAVOL NATIJASI'),
    waitText(student.page,'TEKSHIRILAYOTGAN SAVOL'),
    waitText(projector.page,'Live Challenge reytingi'),
    waitText(teacher.page,'SAVOL YAKUNI'),
    waitText(teacher.page,'TEKSHIRILAYOTGAN SAVOL'),
  ]);
  if(state.answers.student1.score!==1)throw new Error('teacher mode did not award the mark');

  await clickButton(teacher.page,'Sessiyani yakunlash');
  await Promise.all([waitText(teacher.page,'SESSIYA YAKUNLANDI'),waitText(student.page,'SESSIYA YAKUNLANDI'),waitText(projector.page,'Sessiya yakunlandi')]);
  if((state.status as Status)!=='finished')throw new Error('teacher mode did not finish');
  await assertClean(all,'teacher-mode');
  await closeAll(all);
}

async function selfModeTwoLearnersWithLateJoin(browser:Browser,base:string){
  const state=makeState('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','720002','self',['student1']);
  const teacher=await openSurface(browser,base,'teacher',state,{width:1440,height:1000},`oqitish/live?id=${state.sessionId}`);
  const projector=await openSurface(browser,base,'projector',state,{width:1920,height:1080},`oqitish/live?id=${state.sessionId}&projector=1`);
  const student1=await openSurface(browser,base,'student1',state,{width:390,height:844},`oquvchi/live?id=${state.sessionId}`);
  const student2=await openSurface(browser,base,'student2',state,{width:768,height:1024},'oquvchi/live');
  const all=[teacher,projector,student1,student2];

  await Promise.all([
    teacher.page.waitForSelector('.live-question-card',{timeout:15_000}),
    projector.page.waitForSelector('.live-question-card',{timeout:15_000}),
    student1.page.waitForSelector('#live-answer',{timeout:15_000}),
    student2.page.waitForSelector('input[aria-label="Xona kodi"]',{timeout:15_000}),
  ]);
  await student2.page.type('input[aria-label="Xona kodi"]',state.code);
  await clickButton(student2.page,'Qo‘shilish');
  await student2.page.waitForSelector('#live-answer',{timeout:15_000});
  if(!state.joined.has('student2')||!state.lateJoinCreatedAnswer)throw new Error('late join did not create the active learner answer');
  for(const item of [projector,student1,student2]){
    await assertNoText(item.page,'OFFICIAL MARK SCHEME');
    await assertNoText(item.page,'Correct output stated.');
  }

  await student1.page.type('#live-answer','self answer one');
  await student2.page.type('#live-answer','self answer two');
  await clickButton(student1.page,'Javobni topshirish');
  await clickButton(student2.page,'Javobni topshirish');
  await clickButton(teacher.page,'Javoblarni yopish va MSni ochish');

  await Promise.all([
    waitText(student1.page,'O‘Z JAVOBINGIZ'),
    waitText(student1.page,'TEKSHIRILAYOTGAN SAVOL'),
    waitText(student2.page,'O‘Z JAVOBINGIZ'),
    waitText(student2.page,'TEKSHIRILAYOTGAN SAVOL'),
    waitText(teacher.page,'TEKSHIRILAYOTGAN SAVOL'),
    waitText(projector.page,'OFFICIAL MARK SCHEME'),
  ]);
  for(const student of [student1,student2]){
    await student.page.click('.live-review-card .live-scheme-points input[type="checkbox"]');
    await student.page.type('.live-review-card textarea','self checked');
    await clickButton(student.page,'Baholashni yuborish');
    await waitText(student.page,'Baholash yuborildi');
  }

  await waitText(teacher.page,'2/2 ta tugadi');
  await clickButton(teacher.page,'Natijalarni ochish');
  await Promise.all([
    waitText(student1.page,'SAVOL NATIJASI'),
    waitText(student1.page,'TEKSHIRILAYOTGAN SAVOL'),
    waitText(student2.page,'SAVOL NATIJASI'),
    waitText(student2.page,'TEKSHIRILAYOTGAN SAVOL'),
    waitText(teacher.page,'TEKSHIRILAYOTGAN SAVOL'),
    waitText(projector.page,'Live Challenge reytingi'),
  ]);
  if(state.answers.student1.score!==1||state.answers.student2.score!==1)throw new Error('self mode scores did not reconcile');

  await clickButton(teacher.page,'Sessiyani yakunlash');
  await Promise.all([
    waitText(teacher.page,'SESSIYA YAKUNLANDI'),
    waitText(student1.page,'SESSIYA YAKUNLANDI'),
    waitText(student2.page,'SESSIYA YAKUNLANDI'),
    waitText(projector.page,'Sessiya yakunlandi'),
  ]);
  if((state.status as Status)!=='finished')throw new Error('self mode did not finish');
  await assertClean(all,'self-mode');
  await closeAll(all);
}


async function timedExpiryAndPreRevealPrivacy(browser:Browser,base:string){
  const state=makeState('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','730003','self',['student1']);
  const teacher=await openSurface(browser,base,'teacher',state,{width:1440,height:1000},`oqitish/live?id=${state.sessionId}`);
  const projector=await openSurface(browser,base,'projector',state,{width:1920,height:1080},`oqitish/live?id=${state.sessionId}&projector=1`);
  const student=await openSurface(browser,base,'student1',state,{width:390,height:844},`oquvchi/live?id=${state.sessionId}`);
  const all=[teacher,projector,student];

  await Promise.all([
    teacher.page.waitForSelector('.live-question-card',{timeout:15_000}),
    projector.page.waitForSelector('.live-question-card',{timeout:15_000}),
    student.page.waitForSelector('#live-answer',{timeout:15_000}),
  ]);
  for(const item of all){
    await assertNoText(item.page,'OFFICIAL MARK SCHEME');
    await assertNoText(item.page,'Correct output stated.');
  }

  await student.page.type('#live-answer','draft before deadline');
  await student.page.waitForFunction(()=>document.body.textContent?.includes('✓ Sinxronlandi'),{timeout:8_000});

  state.expireOnHeartbeat=true;
  await student.page.evaluate(async(sessionId)=>{
    await fetch(`/api/v1/live-exams/${sessionId}/heartbeat`,{method:'POST',credentials:'include'});
  },state.sessionId);

  await Promise.all([
    waitText(teacher.page,'BAHOLASH'),
    waitText(projector.page,'OFFICIAL MARK SCHEME'),
    waitText(student.page,'O‘Z JAVOBINGIZ'),
  ]);
  await student.page.waitForFunction(()=>!document.querySelector('#live-answer'),{timeout:12_000});

  if(!state.expiryReconciled)throw new Error('timed expiry heartbeat did not reconcile the round');
  if(!state.answers.student1.submitted)throw new Error('timed expiry did not force-submit the active answer');
  if(state.status!=='marking')throw new Error('timed expiry did not transition the round to marking');

  await assertClean(all,'timed-expiry');
  await closeAll(all);
}

const address=await listen(),base=`http://127.0.0.1:${address.port}`;
const chrome=process.env.CHROME_PATH;
if(!chrome)throw new Error('CHROME_PATH is required');
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});

try{
  await teacherModeOneLearner(browser,base);
  await selfModeTwoLearnersWithLateJoin(browser,base);
  await timedExpiryAndPreRevealPrivacy(browser,base);
  console.log('Live browser mode matrix passed: teacher/1 learner + self/2 learners with late join + timed expiry/privacy');
}finally{
  await browser.close();
  await new Promise<void>(resolve=>server.close(()=>resolve()));
}
