import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer, { type Browser, type BrowserContext, type ConsoleMessage, type HTTPRequest, type Page } from 'puppeteer-core';

type ActorKey='teacher'|'projector'|'student1'|'student2'|'student3'|'outsider';
type StudentKey='student1'|'student2'|'student3';
type ViewportSize={width:number;height:number};
type AnswerState={text:string;submitted:boolean;score:number|null;feedback:string|null;updatedAt:string};
type ReviewState={id:string;reviewer:StudentKey;target:StudentKey;status:'assigned'|'submitted';score:number|null;feedback:string|null};
type LifecycleStatus='question_open'|'marking'|'review'|'finished';
type LifecycleState={
  status:LifecycleStatus;
  paused:boolean;
  version:number;
  autosaveFailures:number;
  student3Disconnected:boolean;
  answers:Record<StudentKey,AnswerState>;
  reviews:Record<StudentKey,ReviewState>;
};

const SESSION_ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CLASS_ID='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const QUESTION_ID='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SESSION_QUESTION_ID='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const ASSET_ID='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const POINT_ID='11111111-1111-4111-8111-111111111111';
const PAPER_ID='ffffffff-ffff-4fff-8fff-ffffffffffff';
const baseTime=Date.parse('2026-10-07T06:00:00.000Z');
const iso=(offsetMs=0)=>new Date(baseTime+offsetMs).toISOString();
const students:StudentKey[]=['student1','student2','student3'];

const state:LifecycleState={
  status:'question_open',
  paused:false,
  version:10,
  autosaveFailures:1,
  student3Disconnected:false,
  answers:{
    student1:{text:'',submitted:false,score:null,feedback:null,updatedAt:iso()} as AnswerState,
    student2:{text:'',submitted:false,score:null,feedback:null,updatedAt:iso()} as AnswerState,
    student3:{text:'',submitted:false,score:null,feedback:null,updatedAt:iso()} as AnswerState,
  },
  reviews:{
    student1:{id:'61000000-0000-4000-8000-000000000001',reviewer:'student1',target:'student2',status:'assigned',score:null,feedback:null},
    student2:{id:'61000000-0000-4000-8000-000000000002',reviewer:'student2',target:'student3',status:'assigned',score:null,feedback:null},
    student3:{id:'61000000-0000-4000-8000-000000000003',reviewer:'student3',target:'student1',status:'assigned',score:null,feedback:null},
  },
};
let tick=0;
const bump=()=>{state.version+=1;tick+=1;return state.version;};
const touch=(answer:AnswerState)=>{tick+=1;answer.updatedAt=iso(tick*1000);};

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
    if(!info.isFile())throw new Error('not file');
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
function parseBody(request:HTTPRequest){
  const raw=request.postData();
  if(!raw)return{} as Record<string,unknown>;
  try{return JSON.parse(raw) as Record<string,unknown>;}catch{return{} as Record<string,unknown>;}
}
function studentNumber(actor:StudentKey){return Number(actor.replace('student',''));}
function studentId(actor:StudentKey){return `30000000-0000-4000-8000-00000000000${studentNumber(actor)}`;}
function participantId(actor:StudentKey){return `40000000-0000-4000-8000-00000000000${studentNumber(actor)}`;}
function answerId(actor:StudentKey){return `50000000-0000-4000-8000-00000000000${studentNumber(actor)}`;}
function isStudent(actor:ActorKey):actor is StudentKey{return students.includes(actor as StudentKey);}

function user(actor:ActorKey){
  if(actor==='teacher'||actor==='projector')return{
    id:'10000000-0000-4000-8000-000000000001',
    fullName:'Acceptance teacher',
    role:'teacher',
    schoolId:'20000000-0000-4000-8000-000000000001',
  };
  if(actor==='outsider')return{
    id:'30000000-0000-4000-8000-000000000099',
    fullName:'Outside student',
    role:'student',
    schoolId:'20000000-0000-4000-8000-000000000001',
  };
  return{
    id:studentId(actor),
    fullName:`Acceptance student ${studentNumber(actor)}`,
    role:'student',
    schoolId:'20000000-0000-4000-8000-000000000001',
  };
}

const sourceSvg='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="180" viewBox="0 0 640 180"><rect x="10" y="10" width="620" height="160" rx="8" fill="white" stroke="black"/><text x="40" y="60" font-size="24">A</text><path d="M70 52 H220" stroke="black" stroke-width="3"/><rect x="220" y="30" width="120" height="70" fill="none" stroke="black" stroke-width="3"/><text x="250" y="72" font-size="24">AND</text><path d="M340 65 H520" stroke="black" stroke-width="3"/><text x="530" y="72" font-size="24">Q</text><text x="40" y="130" font-size="20">Browser lifecycle source diagram</text></svg>';
const assetUrl=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(sourceSvg)}`;
const markScheme={
  id:'70000000-0000-4000-8000-000000000001',
  schemeType:'points',
  maxMarks:1,
  guidanceMd:'Award one mark for the correct result.',
  levels:[],
  groups:[],
  points:[{id:POINT_ID,code:'M1',text:'States the correct output.',marks:1,accept:null,reject:null,requires:[],isBod:false,groupId:null}],
};

function portableQuestion(){
  const tableRows=Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>`${r}:${c}`));
  return{
    id:SESSION_QUESTION_ID,sourceQuestionId:QUESTION_ID,position:0,marks:1,
    portable:{
      leaf:{
        id:QUESTION_ID,rootId:QUESTION_ID,label:'7',path:'7',displayRef:'9618/31/M/J/21 Q7',
        stem:'Complete the table, study the circuit and state the output.',
        commandWord:'Complete',marks:1,answerKind:'text',answerLines:4,
        contentJson:{
          version:1,
          source:{paperId:PAPER_ID,sha256:'a'.repeat(64)},
          blocks:[
            {type:'text',style:'task',text:'Complete the table, study the circuit and state the output.',source:{page:9}},
            {type:'table',kind:'truth_table',headers:['A','B','C','D','E','F','G','Q'],rows:tableRows,editableCells:[[3,7]],source:{page:9}},
            {type:'asset',kind:'logic_circuit',assetId:ASSET_ID,altText:'Logic circuit',source:{page:9}},
            {type:'code',language:'pseudocode',text:'IF Q = 1 THEN\n    OUTPUT "ON"\nENDIF',source:{page:9}},
            {type:'answer_area',kind:'lines',lines:4,source:{page:9}},
          ],
        },
      },
      chain:[{id:QUESTION_ID,label:'7',depth:0}],
      contextBlocks:[{
        id:QUESTION_ID,label:'7',displayRef:'9618/31/M/J/21 Q7',depth:0,context:null,
        assets:[{id:ASSET_ID,kind:'diagram',storagePath:null,url:assetUrl,contentMd:null,altText:'Logic circuit',sortOrder:0,sourcePage:9}],
      }],
      dependencies:[],
      sourceRef:'9618/31/M/J/21 Q7',
    },
    dependencyWork:[],
  };
}

function teacherAnswers(){
  return students.map((owner)=>{
    const review=students.map((reviewer)=>state.reviews[reviewer]).find((item)=>item.target===owner)!;
    const answer=state.answers[owner];
    return{
      id:answerId(owner),
      text:answer.text,
      wordCount:answer.text.trim()?answer.text.trim().split(/\s+/).length:0,
      submittedAt:answer.submitted?iso(20_000):null,
      score:answer.score,
      feedback:answer.feedback,
      scoreSource:answer.score===null?null:'peer',
      moderatedAt:null,
      updatedAt:answer.updatedAt,
      studentName:`Acceptance student ${studentNumber(owner)}`,
      studentId:studentId(owner),
      reviewId:review.id,
      reviewStatus:review.status,
      reviewKind:'peer',
      reviewMatchedPointIds:review.score===1?[POINT_ID]:[],
    };
  });
}

function ownAnswer(actor:StudentKey){
  const answer=state.answers[actor];
  return{
    id:answerId(actor),text:answer.text,
    wordCount:answer.text.trim()?answer.text.trim().split(/\s+/).length:0,
    submittedAt:answer.submitted?iso(20_000):null,
    score:answer.score,feedback:answer.feedback,scoreSource:answer.score===null?null:'peer',
    moderatedAt:null,updatedAt:answer.updatedAt,
  };
}

function reviewFor(actor:StudentKey){
  if(state.status!=='marking')return null;
  const review=state.reviews[actor];
  const target=state.answers[review.target];
  return{
    id:review.id,
    answerId:answerId(review.target),
    kind:'peer',
    status:review.status,
    answerText:target.text,
    awardedMarks:review.score,
    feedback:review.feedback,
    submittedAt:review.status==='submitted'?iso(30_000):null,
    points:markScheme.points.map((point)=>({...point,matched:review.score===1})),
  };
}

function reportFor(actor:ActorKey){
  if(state.status!=='finished')return null;
  if(actor==='teacher'||actor==='projector'){
    const rows=students.map((student)=>({
      questionPosition:0,displayRef:'9618/31/M/J/21 Q7',marks:1,answerText:state.answers[student].text,
      score:state.answers[student].score,scoreSource:'peer',studentId:studentId(student),
      studentName:`Acceptance student ${studentNumber(student)}`,
    }));
    return{rows,earned:rows.reduce((sum,row)=>sum+(row.score??0),0),possible:3};
  }
  if(!isStudent(actor))return null;
  const answer=state.answers[actor];
  return{
    rows:[{questionPosition:0,displayRef:'9618/31/M/J/21 Q7',marks:1,answerText:answer.text,score:answer.score,scoreSource:'peer'}],
    earned:answer.score??0,possible:1,
  };
}

function snapshot(actor:ActorKey){
  const staff=actor==='teacher'||actor==='projector';
  const detailed=actor==='teacher';
  const submittedCount=students.filter((student)=>state.answers[student].submitted).length;
  const reviewedCount=students.filter((student)=>state.reviews[student].status==='submitted').length;
  return{
    session:{
      id:SESSION_ID,classId:CLASS_ID,className:'AS Computer Science',title:'Lifecycle browser acceptance',
      joinCode:'654321',status:state.status,markingMode:'peer',questionTimeLimitS:300,version:state.version,
      pausedAt:state.paused?iso(10_000):null,pauseRemainingS:state.paused?240:null,
      settings:{allowLateJoin:true,autoCloseWhenAllSubmitted:false,teacherOverrideEnabled:true,leaderboardMode:'marks'},
      questionCount:1,participantCount:3,currentQuestionIndex:0,createdAt:iso(),updatedAt:iso(tick*1000),
      hostName:'Acceptance teacher',startedAt:iso(),finishedAt:state.status==='finished'?iso(50_000):null,
      questionStartedAt:iso(),deadline:state.paused?null:iso(300_000),serverNow:iso(15_000),
      submittedCount,reviewCount:state.status==='marking'?3:state.status==='review'||state.status==='finished'?3:0,
      reviewedCount:state.status==='marking'?reviewedCount:state.status==='review'||state.status==='finished'?3:0,
    },
    questions:detailed?[{id:SESSION_QUESTION_ID,position:0,marks:1,displayRef:'9618/31/M/J/21 Q7'}]:[],
    participants:detailed?students.map((student)=>({
      id:participantId(student),studentId:studentId(student),
      fullName:`Acceptance student ${studentNumber(student)}`,joinedAt:iso(),lastSeenAt:iso(),
      online:student!=='student3'||!state.student3Disconnected,
      submitted:state.answers[student].submitted,score:state.answers[student].score,scoreSource:state.answers[student].score===null?null:'peer',
    })):[],
    question:portableQuestion(),
    markScheme:['marking','review','finished'].includes(state.status)?markScheme:null,
    ownAnswer:isStudent(actor)?ownAnswer(actor):null,
    review:isStudent(actor)?reviewFor(actor):null,
    teacherAnswers:detailed&&['marking','review','finished'].includes(state.status)?teacherAnswers():[],
    report:reportFor(actor),
    staff,
  };
}

function roundSummary(){
  const standings=students.map((student)=>({
    studentId:studentId(student),studentName:`Acceptance student ${studentNumber(student)}`,
    score:state.answers[student].score??0,possible:1,
  })).sort((a,b)=>b.score-a.score||a.studentName.localeCompare(b.studentName)).map((row,index)=>({...row,rank:index+1}));
  return{
    sessionId:SESSION_ID,questionPosition:0,marksFirst:true,leaderboardMode:'marks',
    round:{possible:1,average:standings.reduce((sum,row)=>sum+row.score,0)/3,distribution:[{score:0,count:standings.filter(row=>row.score===0).length},{score:1,count:standings.filter(row=>row.score===1).length}],standings},
    overall:{possible:1,standings},
  };
}

async function handleApi(request:HTTPRequest,actor:ActorKey){
  const url=new URL(request.url());
  const path=url.pathname.slice('/api/v1'.length);
  const method=request.method().toUpperCase();
  if(path==='/auth/refresh')return respondJson(request,{accessToken:`token-${actor}`,user:user(actor)});
  if(path==='/classes')return respondJson(request,{data:[{id:CLASS_ID,name:'AS Computer Science',grade:null,level:'AS',academicYear:'2026-2027',studentCount:3}]});
  if(path==='/assignments'||path==='/results'||path==='/exports')return respondJson(request,{data:[]});
  if(path==='/analytics/mastery'||path==='/analytics/command-words'||path==='/content/flashcards/due')return respondJson(request,{data:[]});
  if(path==='/content/games')return respondJson(request,{data:{termMatch:[],sequence:[],spotTheGap:[]}});
  if(path===`/live-exams/${SESSION_ID}`||path===`/live-exams/${SESSION_ID}/projector`){
    if(actor==='outsider')return respondError(request,'Live sessiya topilmadi.','not_found',404);
    return respondJson(request,snapshot(actor));
  }
  if(path===`/live-exams/${SESSION_ID}/events`){
    const after=Number(url.searchParams.get('afterVersion')??0);
    return respondJson(request,{sessionId:SESSION_ID,currentVersion:state.version,changed:state.version!==after,events:state.version!==after?[{version:state.version,type:'acceptance.changed',createdAt:iso(tick*1000)}]:[]});
  }
  if(path===`/live-exams/${SESSION_ID}/heartbeat`)return respondJson(request,{serverNow:iso(15_000)});
  if(path===`/live-exams/${SESSION_ID}/round-summary`)return respondJson(request,roundSummary());

  if(actor==='teacher'&&method==='POST'&&path===`/live-exams/${SESSION_ID}/pause`){
    state.paused=true;bump();return respondJson(request,{sessionId:SESSION_ID,status:state.status,paused:true,version:state.version});
  }
  if(actor==='teacher'&&method==='POST'&&path===`/live-exams/${SESSION_ID}/resume`){
    state.paused=false;bump();return respondJson(request,{sessionId:SESSION_ID,status:state.status,paused:false,version:state.version});
  }
  if(actor==='teacher'&&method==='POST'&&path===`/live-exams/${SESSION_ID}/reveal`){
    state.status='marking';state.paused=false;bump();return respondJson(request,{sessionId:SESSION_ID,status:'marking',version:state.version});
  }
  if(actor==='teacher'&&method==='POST'&&path===`/live-exams/${SESSION_ID}/marking/complete`){
    const body=parseBody(request);
    const pending=students.filter((student)=>state.reviews[student].status==='assigned');
    if(pending.length&&!body.force)return respondError(request,'Baholashlar tugallanmagan.','live_reviews_pending',409);
    for(const reviewer of pending){
      const review=state.reviews[reviewer];
      review.status='submitted';review.score=0;review.feedback='O‘qituvchi tomonidan baholash yopildi.';
      const target=state.answers[review.target];
      target.score=0;target.feedback=review.feedback;touch(target);
    }
    state.status='review';bump();
    return respondJson(request,{sessionId:SESSION_ID,status:'review',version:state.version});
  }
  if(actor==='teacher'&&method==='POST'&&path===`/live-exams/${SESSION_ID}/next`){
    state.status='finished';bump();return respondJson(request,{sessionId:SESSION_ID,status:'finished',version:state.version});
  }

  if(isStudent(actor)&&method==='PUT'&&path===`/live-exams/${SESSION_ID}/answer`){
    if(state.paused||state.status!=='question_open')return respondError(request,'Javob yopilgan.','live_answer_locked',409);
    if(actor==='student1'&&state.autosaveFailures>0){
      state.autosaveFailures-=1;
      return respondError(request,'Temporary browser network drop.','temporary_network_drop',503);
    }
    const body=parseBody(request);
    state.answers[actor].text=typeof body.text==='string'?body.text:state.answers[actor].text;
    touch(state.answers[actor]);
    return respondJson(request,{savedAt:state.answers[actor].updatedAt});
  }
  if(isStudent(actor)&&method==='POST'&&path===`/live-exams/${SESSION_ID}/answer/submit`){
    if(state.paused||state.status!=='question_open')return respondError(request,'Javob yopilgan.','live_answer_locked',409);
    const body=parseBody(request);
    if(typeof body.text==='string')state.answers[actor].text=body.text;
    state.answers[actor].submitted=true;touch(state.answers[actor]);bump();
    return respondJson(request,{submittedAt:iso(20_000),version:state.version,autoRevealed:false});
  }
  if(isStudent(actor)&&method==='POST'&&path.startsWith(`/live-exams/${SESSION_ID}/reviews/`)&&path.endsWith('/submit')){
    if(state.status!=='marking')return respondError(request,'Baholash yopilgan.','live_invalid_state',409);
    const review=state.reviews[actor];
    if(!path.includes(review.id))return respondError(request,'Baholash topilmadi.','not_found',404);
    const body=parseBody(request);
    const matched=Array.isArray(body.matchedPointIds)&&body.matchedPointIds.includes(POINT_ID);
    review.status='submitted';review.score=matched?1:0;review.feedback=typeof body.feedback==='string'?body.feedback:null;
    const target=state.answers[review.target];
    target.score=review.score;target.feedback=review.feedback;touch(target);bump();
    return respondJson(request,{reviewId:review.id,score:review.score,version:state.version});
  }

  return respondJson(request,{data:[]});
}

async function installApi(page:Page,actor:ActorKey){
  await page.setRequestInterception(true);
  page.on('request',(request:HTTPRequest)=>{
    const url=new URL(request.url());
    if(!url.pathname.startsWith('/api/v1/')){void request.continue();return;}
    void handleApi(request,actor);
  });
}

async function openSurface(browser:Browser,base:string,actor:ActorKey,viewport:ViewportSize,hash:string){
  const context=await browser.createBrowserContext();
  const page=await context.newPage();
  await page.setViewport(viewport);
  await installApi(page,actor);
  const consoleErrors:string[]=[];
  page.on('console',(msg:ConsoleMessage)=>{if(msg.type()==='error')consoleErrors.push(msg.text());});
  page.on('pageerror',(err:unknown)=>consoleErrors.push(err instanceof Error?err.message:String(err)));
  await page.goto(`${base}/#${hash}`,{waitUntil:'networkidle0',timeout:30_000});
  return{context,page,consoleErrors};
}

async function waitText(page:Page,text:string,timeout=12_000){
  await page.waitForFunction((needle)=>document.body.textContent?.includes(String(needle)),{timeout},text);
}
async function waitNotText(page:Page,text:string,timeout=12_000){
  await page.waitForFunction((needle)=>!document.body.textContent?.includes(String(needle)),{timeout},text);
}
async function clickButton(page:Page,text:string){
  await page.waitForFunction((needle)=>[...document.querySelectorAll('button')].some((button)=>button.textContent?.includes(String(needle))),{timeout:12_000},text);
  const clicked=await page.evaluate((needle)=>{
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent?.includes(String(needle))) as HTMLButtonElement|undefined;
    if(!button||button.disabled)return false;
    button.click();return true;
  },text);
  if(!clicked)throw new Error(`Button unavailable: ${text}`);
}
async function assertNoConsoleErrors(surfaces:Array<{consoleErrors:string[]}>) {
  const errors=surfaces.flatMap((surface,index)=>surface.consoleErrors.map((error)=>`surface ${index}: ${error}`));
  if(errors.length)throw new Error(`Browser console/page errors: ${errors.join(' | ')}`);
}
async function closeContext(context:BrowserContext){await context.close();}

const address=await listen();
const base=`http://127.0.0.1:${address.port}`;
const chrome=process.env.CHROME_PATH;
if(!chrome)throw new Error('CHROME_PATH is required');

const browser=await puppeteer.launch({
  executablePath:chrome,headless:true,
  args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'],
});

try{
  const teacher=await openSurface(browser,base,'teacher',{width:1440,height:1000},`oqitish/live?id=${SESSION_ID}`);
  const projector=await openSurface(browser,base,'projector',{width:1920,height:1080},`oqitish/live?id=${SESSION_ID}&projector=1`);
  const student1=await openSurface(browser,base,'student1',{width:390,height:844},`oquvchi/live?id=${SESSION_ID}`);
  const student2=await openSurface(browser,base,'student2',{width:768,height:1024},`oquvchi/live?id=${SESSION_ID}`);
  const student3=await openSurface(browser,base,'student3',{width:1366,height:768},`oquvchi/live?id=${SESSION_ID}`);
  const surfaces=[teacher,projector,student1,student2,student3];

  for(const surface of surfaces)await surface.page.waitForSelector('.live-question-card',{timeout:15_000});

  // Autosave + retry + reload recovery.
  await student1.page.type('#live-answer','student one recovered answer');
  await waitText(student1.page,'Javob saqlanmadi.',5_000);
  await student1.page.waitForFunction(()=>document.body.textContent?.includes('✓ Sinxronlandi'),{timeout:8_000});
  if(state.answers.student1.text!=='student one recovered answer')throw new Error('student1 autosave retry did not persist server state');
  await student1.page.reload({waitUntil:'networkidle0'});
  await student1.page.waitForSelector('#live-answer',{timeout:12_000});
  const restored=await student1.page.$eval('#live-answer',(node)=>(node as HTMLTextAreaElement).value);
  if(restored!=='student one recovered answer')throw new Error(`student1 reconnect recovery mismatch: ${restored}`);

  // Pause must propagate to every active role and block the student workspace.
  await clickButton(teacher.page,'Pauza');
  await Promise.all([
    waitText(teacher.page,'Challenge pauzada'),
    waitText(projector.page,'CHALLENGE PAUZADA'),
    waitText(student1.page,'CHALLENGE PAUZADA'),
    waitText(student2.page,'CHALLENGE PAUZADA'),
    waitText(student3.page,'CHALLENGE PAUZADA'),
  ]);
  if(!state.paused)throw new Error('pause mutation was not committed in browser harness');

  await clickButton(teacher.page,'Davom ettirish');
  await Promise.all([
    student1.page.waitForSelector('#live-answer',{timeout:12_000}),
    student2.page.waitForSelector('#live-answer',{timeout:12_000}),
    student3.page.waitForSelector('#live-answer',{timeout:12_000}),
    waitNotText(projector.page,'CHALLENGE PAUZADA'),
  ]);

  // Three students submit through the real UI.
  await student2.page.type('#live-answer','student two answer');
  await student3.page.type('#live-answer','student three answer');
  await clickButton(student1.page,'Javobni topshirish');
  await clickButton(student2.page,'Javobni topshirish');
  await clickButton(student3.page,'Javobni topshirish');
  await student3.page.waitForFunction(()=>document.body.textContent?.includes('Topshirildi ✓'),{timeout:12_000});
  if(students.some((student)=>!state.answers[student].submitted))throw new Error('not every student answer reached submitted state');

  // Teacher reveals MS, all student contexts transition to peer review.
  await clickButton(teacher.page,'Javoblarni yopish va MSni ochish');
  await Promise.all([
    waitText(teacher.page,'BAHOLASH'),
    waitText(projector.page,'OFFICIAL MARK SCHEME'),
    waitText(student1.page,'ANONIM JAVOB'),
    waitText(student2.page,'ANONIM JAVOB'),
    waitText(student3.page,'ANONIM JAVOB'),
  ]);

  // Two reviewers submit; the third disconnects and is force-completed by teacher.
  for(const student of [student1,student2]){
    await student.page.click('.live-review-card .live-scheme-points input[type="checkbox"]');
    await student.page.type('.live-review-card textarea','reviewed in browser');
    await clickButton(student.page,'Baholashni yuborish');
    await waitText(student.page,'Baholash yuborildi');
  }
  state.student3Disconnected=true;
  await closeContext(student3.context);
  teacher.page.on('dialog',(dialog)=>void dialog.accept());
  await waitText(teacher.page,'2/3 ta tugadi');
  await clickButton(teacher.page,'Kutilayotganlarsiz davom etish');

  await Promise.all([
    waitText(teacher.page,'SAVOL YAKUNI'),
    waitText(projector.page,'Live Challenge reytingi'),
    waitText(student1.page,'SAVOL NATIJASI'),
    waitText(student2.page,'SAVOL NATIJASI'),
  ]);
  if(state.status!=='review')throw new Error('force-complete did not transition to review');
  if(state.reviews.student3.status!=='submitted'||state.answers.student1.score!==0)throw new Error('disconnected reviewer was not safely force-completed');

  // Finalize and verify reports across roles.
  await clickButton(teacher.page,'Sessiyani yakunlash');
  await Promise.all([
    waitText(teacher.page,'SESSIYA YAKUNLANDI'),
    waitText(projector.page,'Sessiya yakunlandi'),
    waitText(student1.page,'SESSIYA YAKUNLANDI'),
    waitText(student2.page,'SESSIYA YAKUNLANDI'),
  ]);
  if((state.status as LifecycleStatus)!=='finished')throw new Error('browser lifecycle did not reach finished state');

  // Unauthorized learner must fail closed.
  const outsider=await openSurface(browser,base,'outsider',{width:390,height:844},`oquvchi/live?id=${SESSION_ID}`);
  await waitText(outsider.page,'Live sessiya topilmadi yoki unda qatnashish huquqingiz yo‘q.',12_000);
  await closeContext(outsider.context);

  const mobileOverflow=await student1.page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  if(mobileOverflow>2)throw new Error(`student mobile lifecycle page overflowed by ${mobileOverflow}px`);

  await assertNoConsoleErrors([teacher,projector,student1,student2]);
  console.log('Live lifecycle browser acceptance passed: autosave/reconnect, pause/resume, 3 submits, peer marking, disconnect force-complete, finish/report, unauthorized access');
}finally{
  await browser.close();
  await new Promise<void>((resolve)=>server.close(()=>resolve()));
}
