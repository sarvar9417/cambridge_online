import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer, { type Browser, type ConsoleMessage, type HTTPRequest, type Page } from 'puppeteer-core';

type ActorKey='teacher'|'projector'|'student1'|'student2'|'student3';
type ViewportSize={width:number;height:number};

const SESSION_ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CLASS_ID='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const QUESTION_ID='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SESSION_QUESTION_ID='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const ASSET_ID='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const PAPER_ID='ffffffff-ffff-4fff-8fff-ffffffffffff';
const now='2026-10-07T05:00:00.000Z';

const dist=normalize(join(fileURLToPath(new URL('.',import.meta.url)),'../../frontend/dist'));

const mime = (path:string) => ({
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.svg':'image/svg+xml',
  '.woff2':'font/woff2',
  '.ttf':'font/ttf',
}[extname(path)] ?? 'application/octet-stream');

const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url??'/', 'http://localhost').pathname;
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

function json(request:HTTPRequest,body:unknown,status=200){
  return request.respond({status,contentType:'application/json',body:JSON.stringify(body)});
}

function user(actor:ActorKey){
  if(actor==='teacher'||actor==='projector')return{
    id:'10000000-0000-4000-8000-000000000001',
    fullName:'Acceptance teacher',
    role:'teacher',
    schoolId:'20000000-0000-4000-8000-000000000001',
  };
  const n=Number(actor.replace('student',''));
  return{
    id:`30000000-0000-4000-8000-00000000000${n}`,
    fullName:`Acceptance student ${n}`,
    role:'student',
    schoolId:'20000000-0000-4000-8000-000000000001',
  };
}

const sourceSvg='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="180" viewBox="0 0 640 180"><rect x="10" y="10" width="620" height="160" rx="8" fill="white" stroke="black"/><text x="40" y="60" font-size="24">A</text><path d="M70 52 H220" stroke="black" stroke-width="3"/><rect x="220" y="30" width="120" height="70" fill="none" stroke="black" stroke-width="3"/><text x="250" y="72" font-size="24">AND</text><path d="M340 65 H520" stroke="black" stroke-width="3"/><text x="530" y="72" font-size="24">Q</text><text x="40" y="130" font-size="20">Cambridge source-backed logic circuit</text></svg>';
const assetUrl=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(sourceSvg)}`;

function snapshot(actor:ActorKey){
  const isStaff=actor==='teacher'||actor==='projector';
  const tableRows=Array.from({length:6},(_,r)=>Array.from({length:8},(_,c)=>`${r}:${c}`));
  return{
    session:{
      id:SESSION_ID,classId:CLASS_ID,className:'AS Computer Science',title:'Browser acceptance',
      joinCode:'654321',status:'question_open',markingMode:'peer',questionTimeLimitS:300,version:7,
      pausedAt:null,pauseRemainingS:null,
      settings:{allowLateJoin:true,autoCloseWhenAllSubmitted:false,teacherOverrideEnabled:true,leaderboardMode:'marks'},
      questionCount:1,participantCount:3,currentQuestionIndex:0,createdAt:now,updatedAt:now,
      hostName:'Acceptance teacher',startedAt:now,finishedAt:null,questionStartedAt:now,
      deadline:'2026-10-07T05:05:00.000Z',serverNow:now,submittedCount:0,reviewCount:0,reviewedCount:0,
    },
    questions:isStaff&&actor!=='projector'?[{id:SESSION_QUESTION_ID,position:0,marks:5,displayRef:'9618/31/M/J/21 Q7'}]:[],
    participants:isStaff&&actor!=='projector'?[1,2,3].map((n)=>({
      id:`40000000-0000-4000-8000-00000000000${n}`,
      studentId:`30000000-0000-4000-8000-00000000000${n}`,
      fullName:`Acceptance student ${n}`,joinedAt:now,lastSeenAt:now,online:true,submitted:false,score:null,scoreSource:null,
    })):[],
    question:{
      id:SESSION_QUESTION_ID,sourceQuestionId:QUESTION_ID,position:0,marks:5,
      portable:{
        leaf:{
          id:QUESTION_ID,rootId:QUESTION_ID,label:'7',path:'7',displayRef:'9618/31/M/J/21 Q7',
          stem:'Complete the table, study the circuit and state the output.',
          commandWord:'Complete',marks:5,answerKind:'text',answerLines:4,
          contentJson:{
            version:1,
            source:{paperId:PAPER_ID,sha256:'a'.repeat(64)},
            blocks:[
              {type:'text',style:'task',text:'Complete the table, study the circuit and state the output.',source:{page:9}},
              {type:'table',kind:'truth_table',headers:['A','B','C','D','E','F','G','Q'],rows:tableRows,editableCells:[[5,7]],source:{page:9}},
              {type:'math',semantics:'boolean_expression',latex:'\\\\overline{A} \\\\land B',display:true,source:{page:9}},
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
    },
    markScheme:null,
    ownAnswer:actor.startsWith('student')?{
      id:'50000000-0000-4000-8000-000000000001',text:'',wordCount:0,submittedAt:null,score:null,feedback:null,scoreSource:null,moderatedAt:null,updatedAt:now,
    }:null,
    review:null,
    teacherAnswers:[],
    report:null,
  };
}

async function installApi(page:Page,actor:ActorKey){
  await page.setRequestInterception(true);
  page.on('request',(request:HTTPRequest)=>{
    const url=new URL(request.url());
    if(!url.pathname.startsWith('/api/v1/')){void request.continue();return;}
    const path=url.pathname.slice('/api/v1'.length);
    if(path==='/auth/refresh'){void json(request,{accessToken:`token-${actor}`,user:user(actor)});return;}
    if(path==='/classes'){void json(request,{data:[{id:CLASS_ID,name:'AS Computer Science',grade:null,level:'AS',academicYear:'2026-2027',studentCount:3}]});return;}
    if(path==='/assignments'||path==='/results'||path==='/exports'){void json(request,{data:[]});return;}
    if(path==='/analytics/mastery'||path==='/analytics/command-words'||path==='/content/flashcards/due'){void json(request,{data:[]});return;}
    if(path==='/content/games'){void json(request,{data:{termMatch:[],sequence:[],spotTheGap:[]}});return;}
    if(path===`/live-exams/${SESSION_ID}`||path===`/live-exams/${SESSION_ID}/projector`){void json(request,snapshot(actor));return;}
    if(path===`/live-exams/${SESSION_ID}/events`){void json(request,{sessionId:SESSION_ID,currentVersion:7,changed:false,events:[]});return;}
    if(path===`/live-exams/${SESSION_ID}/heartbeat`){void json(request,{serverNow:now});return;}
    void json(request,{data:[]});
  });
}

async function openSurface(browser:Browser,base:string,actor:ActorKey,viewport:ViewportSize,hash:string){
  const context=await browser.createBrowserContext();
  const page=await context.newPage();
  await page.setViewport(viewport);
  await installApi(page,actor);
  const consoleErrors:string[]=[];
  page.on('console',(msg:ConsoleMessage)=>{if(msg.type()==='error')consoleErrors.push(msg.text());});
  page.on('pageerror',(err:unknown)=>{consoleErrors.push(err instanceof Error?err.message:String(err));});
  await page.goto(`${base}/#${hash}`,{waitUntil:'networkidle0',timeout:30_000});
  await page.waitForSelector('.live-question-card',{timeout:15_000});
  const result=await page.evaluate(()=>{
    const table=document.querySelector('.live-question-card .structured-question-table');
    const host=document.querySelector('.live-question-card>.structured-question-view');
    const image=document.querySelector('.live-question-card .structured-question-asset img');
    const card=document.querySelector('.live-question-card');
    return{
      sourceRef:card?.textContent?.includes('9618/31/M/J/21 Q7')??false,
      tableRows:table?.querySelectorAll('tbody tr').length??0,
      tableColumns:table?.querySelectorAll('tbody tr:first-child td').length??0,
      image:Boolean(image),
      code:Boolean(document.querySelector('.structured-question-code')),
      katex:Boolean(document.querySelector('.structured-question-math .katex')),
      mathml:Boolean(document.querySelector('.structured-question-math math')),
      mathAria:document.querySelector('.structured-question-math')?.getAttribute('aria-label')??'',
      invalidMath:Boolean(document.querySelector('.structured-question-math-invalid')),
      invalid:Boolean(document.querySelector('.structured-question-invalid')),
      internalOverflow:host?host.scrollWidth>=host.clientWidth:true,
      bodyOverflow:document.documentElement.scrollWidth-window.innerWidth,
      projector:Boolean(document.querySelector('.live-projector-overlay')),
    };
  });
  return{context,page,result,consoleErrors};
}

const address=await listen();
const base=`http://127.0.0.1:${address.port}`;
const chrome=process.env.CHROME_PATH;
if(!chrome)throw new Error('CHROME_PATH is required');

const browser=await puppeteer.launch({
  executablePath:chrome,
  headless:true,
  args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'],
});

try{
  const surfaces=await Promise.all([
    openSurface(browser,base,'teacher',{width:1440,height:1000},`oqitish/live?id=${SESSION_ID}`),
    openSurface(browser,base,'projector',{width:1920,height:1080},`oqitish/live?id=${SESSION_ID}&projector=1`),
    openSurface(browser,base,'student1',{width:390,height:844},`oquvchi/live?id=${SESSION_ID}`),
    openSurface(browser,base,'student2',{width:768,height:1024},`oquvchi/live?id=${SESSION_ID}`),
    openSurface(browser,base,'student3',{width:1366,height:768},`oquvchi/live?id=${SESSION_ID}`),
  ]);

  for(const [index,surface] of surfaces.entries()){
    const {result,consoleErrors}=surface;
    if(consoleErrors.length)throw new Error(`surface ${index} console errors: ${consoleErrors.join(' | ')}`);
    if(!result.sourceRef||result.tableRows!==6||result.tableColumns!==8||!result.image||!result.code
      ||!result.katex||!result.mathml||result.invalidMath||result.mathAria!=='A̅ ∧ B'||result.invalid){
      throw new Error(`surface ${index} fidelity failure: ${JSON.stringify(result)}`);
    }
    if(result.bodyOverflow>2)throw new Error(`surface ${index} page overflowed by ${result.bodyOverflow}px`);
  }
  if(!surfaces[1].result.projector)throw new Error('projector context did not render projector overlay');
  if(surfaces[0].result.projector)throw new Error('teacher context unexpectedly rendered projector overlay');
  console.log('Live multi-context browser smoke passed: teacher + projector + 3 students with table/diagram/pseudocode/KaTeX+MathML fidelity');
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
