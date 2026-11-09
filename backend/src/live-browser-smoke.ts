import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import puppeteer, { type Browser, type ConsoleMessage, type HTTPRequest, type Page } from 'puppeteer-core';

type ActorKey='teacher'|'projector'|'student1'|'student2'|'student3';
type ViewportSize={width:number;height:number};
type SnapshotStatus='lobby'|'question_open';
type AxeViolation={id:string;impact:string|null;help:string;nodes:Array<{target:string[]}>};
const require=createRequire(import.meta.url);
const axeCore=require('axe-core') as {source:string};

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

function snapshot(actor:ActorKey,status:SnapshotStatus='question_open',rehearsal=false){
  const isStaff=actor==='teacher'||actor==='projector';
  const tableRows=Array.from({length:6},(_,r)=>Array.from({length:8},(_,c)=>`${r}:${c}`));
  return{
    session:{
      id:SESSION_ID,classId:CLASS_ID,className:'AS Computer Science',title:'Browser acceptance',
      joinCode:'654321',status,markingMode:'peer',questionTimeLimitS:300,version:7,
      pausedAt:null,pauseRemainingS:null,
      settings:{rehearsalMode:rehearsal,allowLateJoin:rehearsal?false:true,autoCloseWhenAllSubmitted:false,teacherOverrideEnabled:true,leaderboardMode:'marks'},
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
              {type:'math',semantics:'boolean_expression',latex:'\\overline{A} \\land B',display:true,source:{page:9}},
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


const gameTerms = [
  {id:'game-1',term:'Legal',definition:'Relating to what is permitted or required by law.'},
  {id:'game-2',term:'Ethics',definition:'Moral principles guiding professional behaviour.'},
  {id:'game-3',term:'Culture',definition:'The shared values and practices of a society.'},
  {id:'game-4',term:'Morality',definition:'Personal beliefs about right and wrong.'},
  {id:'game-5',term:'Privacy',definition:'Keeping personal information from unauthorised access.'},
  {id:'game-6',term:'Plagiarism',definition:'Claiming another person’s work as your own.'},
  {id:'game-7',term:'Cache',definition:'Fast memory that stores frequently needed data.'},
  {id:'game-8',term:'Gateway',definition:'A device that connects networks using different protocols.'},
  {id:'game-9',term:'Database',definition:'An organised collection of data.'},
].map((item)=>({...item,status:'needs_review',source:null}));
const gameCatalog = {
  courseCode:'9618',
  chapters:[
    {chapterNo:1,title:'Information representation',termCount:9,approvedCount:0,sections:[
      {code:'1.1',title:'Data representation',parentCode:'1',termCount:9},
      {code:'1.1.1',title:'Number systems',parentCode:'1.1',termCount:5},
    ]},
    {chapterNo:2,title:'Communication',termCount:6,approvedCount:0,sections:[
      {code:'2.1.1',title:'Networking devices',parentCode:'2.1',termCount:6},
    ]},
  ],
};

async function installApi(page:Page,actor:ActorKey,status:SnapshotStatus='question_open',rehearsal=false){
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
    if(path==='/content/interactive-games/catalog'){void json(request,{data:gameCatalog});return;}
    if(path==='/content/interactive-games/pack'){
      const chapterNo=Number(url.searchParams.get('chapterNo')||1);
      const sectionCode=url.searchParams.get('sectionCode');
      const candidate=chapterNo===2?gameTerms.slice(3):gameTerms;
      const pairs=sectionCode==='1.1.1'?candidate.slice(0,5):candidate;
      void json(request,{data:{courseCode:'9618',chapterNo,sectionCode,contentStatus:'needs_review',pairs,source:'Browser acceptance glossary',assessed:false}});
      return;
    }
    if(path===`/live-exams/${SESSION_ID}`||path===`/live-exams/${SESSION_ID}/projector`){void json(request,snapshot(actor,status,rehearsal));return;}
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

async function assertAxe(page:Page,label:string){
  await page.addScriptTag({content:axeCore.source});
  const violations=await page.evaluate(async()=>{
    const axe=(window as unknown as {axe:{run:(root:Document,options:unknown)=>Promise<{violations:AxeViolation[]}>}}).axe;
    const result=await axe.run(document,{
      runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},
    });
    return result.violations;
  });
  if(violations.length){
    throw new Error(`${label} axe violations: ${violations.map((v)=>`${v.id}(${v.impact}): ${v.nodes.map((n)=>n.target.join(' ')).join(', ')}`).join(' | ')}`);
  }
}

async function assertJoinQrFlow(browser:Browser,base:string){
  const teacherContext=await browser.createBrowserContext();
  const teacher=await teacherContext.newPage();
  await teacher.setViewport({width:1440,height:1000});
  await installApi(teacher,'teacher','lobby');
  await teacher.goto(`${base}/#oqitish/live?id=${SESSION_ID}`,{waitUntil:'networkidle0',timeout:30_000});
  await teacher.waitForSelector('.live-code-card .live-join-qr svg',{timeout:15_000});
  const teacherQr=await teacher.$eval('.live-code-card .live-join-qr svg',(svg)=>({
    label:svg.getAttribute('aria-label')??'',
    modules:svg.querySelector('.live-join-qr-modules')?.getAttribute('d')?.length??0,
    width:svg.getBoundingClientRect().width,
    bodyOverflow:document.documentElement.scrollWidth-window.innerWidth,
  }));
  if(teacherQr.label!=='Live Challenge 654321 xonasiga kirish uchun QR kod'||teacherQr.modules<500||teacherQr.width<120||teacherQr.bodyOverflow>2){
    throw new Error(`teacher lobby QR failure: ${JSON.stringify(teacherQr)}`);
  }

  const projectorContext=await browser.createBrowserContext();
  const projector=await projectorContext.newPage();
  await projector.setViewport({width:1920,height:1080});
  await installApi(projector,'projector','lobby');
  await projector.goto(`${base}/#oqitish/live?id=${SESSION_ID}&projector=1`,{waitUntil:'networkidle0',timeout:30_000});
  await projector.waitForSelector('.live-projector-lobby .live-join-qr svg',{timeout:15_000});
  const projectorQr=await projector.$eval('.live-projector-lobby .live-join-qr svg',(svg)=>({
    modules:svg.querySelector('.live-join-qr-modules')?.getAttribute('d')?.length??0,
    width:svg.getBoundingClientRect().width,
  }));
  if(projectorQr.modules<500||projectorQr.width<180)throw new Error(`projector lobby QR failure: ${JSON.stringify(projectorQr)}`);

  const studentContext=await browser.createBrowserContext();
  const student=await studentContext.newPage();
  await student.setViewport({width:390,height:844});
  await installApi(student,'student1','lobby');
  await student.goto(`${base}/#oquvchi/live?code=654321`,{waitUntil:'networkidle0',timeout:30_000});
  await student.waitForSelector('input[aria-label="Xona kodi"]',{timeout:15_000});
  const shared=await student.$eval('input[aria-label="Xona kodi"]',(input)=>({
    value:(input as HTMLInputElement).value,
    note:document.querySelector('.live-shared-code-note')?.textContent??'',
    bodyOverflow:document.documentElement.scrollWidth-window.innerWidth,
  }));
  if(shared.value!=='654321'||!shared.note.includes('654321')||shared.bodyOverflow>2){
    throw new Error(`shared join-link prefill failure: ${JSON.stringify(shared)}`);
  }

  await assertAxe(teacher,'teacher QR lobby');
  await assertAxe(projector,'projector QR lobby');
  await assertAxe(student,'student shared join link');
  await Promise.all([teacherContext.close(),projectorContext.close(),studentContext.close()]);
}

async function assertRehearsalUi(browser:Browser,base:string){
  const teacherContext=await browser.createBrowserContext();
  const teacher=await teacherContext.newPage();
  await teacher.setViewport({width:1440,height:1000});
  await installApi(teacher,'teacher','lobby',true);
  await teacher.goto(`${base}/#oqitish/live?id=${SESSION_ID}`,{waitUntil:'networkidle0',timeout:30_000});
  await teacher.waitForSelector('.live-rehearsal-card',{timeout:15_000});
  const lobby=await teacher.evaluate(()=>({
    text:document.querySelector('.live-rehearsal-card')?.textContent??'',
    qr:Boolean(document.querySelector('.live-code-card .live-join-qr')),
    roster:Boolean(document.querySelector('.live-roster')),
    startDisabled:(document.querySelector('.live-rehearsal-card .live-start') as HTMLButtonElement|null)?.disabled??true,
  }));
  if(!lobby.text.includes('REHEARSAL')||lobby.qr||lobby.roster||lobby.startDisabled){
    throw new Error(`teacher rehearsal lobby failure: ${JSON.stringify(lobby)}`);
  }

  const projectorContext=await browser.createBrowserContext();
  const projector=await projectorContext.newPage();
  await projector.setViewport({width:1920,height:1080});
  await installApi(projector,'projector','lobby',true);
  await projector.goto(`${base}/#oqitish/live?id=${SESSION_ID}&projector=1`,{waitUntil:'networkidle0',timeout:30_000});
  await projector.waitForSelector('.live-rehearsal-projector',{timeout:15_000});
  const projectorState=await projector.evaluate(()=>({
    text:document.querySelector('.live-rehearsal-projector')?.textContent??'',
    qr:Boolean(document.querySelector('.live-join-qr')),
  }));
  if(!projectorState.text.includes('REHEARSAL')||projectorState.qr){
    throw new Error(`projector rehearsal failure: ${JSON.stringify(projectorState)}`);
  }

  const activeContext=await browser.createBrowserContext();
  const active=await activeContext.newPage();
  await active.setViewport({width:1440,height:1000});
  await installApi(active,'teacher','question_open',true);
  await active.goto(`${base}/#oqitish/live?id=${SESSION_ID}`,{waitUntil:'networkidle0',timeout:30_000});
  await active.waitForSelector('.live-question-card',{timeout:15_000});
  if(await active.$('.live-active-join'))throw new Error('rehearsal exposed a learner join control after start');

  await assertAxe(teacher,'teacher rehearsal lobby');
  await assertAxe(projector,'projector rehearsal lobby');
  await assertAxe(active,'teacher active rehearsal');
  await Promise.all([teacherContext.close(),projectorContext.close(),activeContext.close()]);
}

async function assertReducedMotion(browser:Browser,base:string){
  const context=await browser.createBrowserContext();
  const page=await context.newPage();
  await page.setViewport({width:390,height:844});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await installApi(page,'student1','lobby');
  await page.goto(`${base}/#oquvchi/live?id=${SESSION_ID}`,{waitUntil:'networkidle0',timeout:30_000});
  await page.waitForSelector('.live-pulse',{timeout:15_000});
  const result=await page.$eval('.live-pulse',(node)=>({
    animationName:getComputedStyle(node).animationName,
    liveText:node.parentElement?.querySelector('[role="status"]')?.textContent??'',
  }));
  if(result.animationName!=='none')throw new Error(`reduced-motion lobby still animates: ${result.animationName}`);
  if(!result.liveText.includes('O‘qituvchi'))throw new Error('lobby status is not exposed as a screen-reader status');
  await assertAxe(page,'student lobby reduced-motion');
  await context.close();
}


/** Native browser acceptance for every Interactive Games mode on desktop and mobile. */
async function assertInteractiveGames(browser:Browser,base:string){
  const teacherContext=await browser.createBrowserContext();
  const teacher=await teacherContext.newPage();
  await teacher.setViewport({width:1440,height:900});
  await installApi(teacher,'teacher','lobby');
  const errors:string[]=[];
  teacher.on('pageerror',(err)=>errors.push(err instanceof Error ? err.message : String(err)));
  teacher.on('console',(msg)=>{if(msg.type()==='error')errors.push(msg.text());});
  await teacher.goto(base+'/#oqitish/oyinlar',{waitUntil:'networkidle0',timeout:30_000});
  await teacher.waitForSelector('.ig-game-tile',{timeout:15_000});
  await teacher.waitForFunction(()=>document.querySelectorAll('.ig-game-tile').length===8);
  const clickMode=async(index:number)=>{await teacher.click('.ig-game-tile:nth-child('+index+')');};
  const assertText=async(selector:string,fragment:string)=>{
    const actual=await teacher.$eval(selector,(node)=>node.textContent??'');
    if(!actual.includes(fragment))throw new Error('Interactive Games missing '+fragment+' in '+selector+': '+actual);
  };
  await assertText('.ig-notice','pending curriculum review');
  await assertText('.ig-data-controls','Information representation');

  // Match Up must grade only after submission.
  await teacher.click('.ig-bank-term');
  await teacher.click('.ig-drop-target button[aria-label*="permitted or required by law"]');
  await assertText('.ig-score','1 of 9 placed');
  await teacher.click('.ig-match-actions button');
  await assertText('.ig-match-actions','1 / 9 correct');

  // Flip a definition, then switch games using the same chapter content.
  await clickMode(2);
  await teacher.waitForSelector('.ig-flashcard',{timeout:8_000});
  await assertText('.ig-flashcard','Relating to what is permitted');
  await teacher.click('.ig-flashcard');
  await assertText('.ig-flashcard','Legal');

  await clickMode(3);
  await teacher.waitForSelector('.ig-deck-controls',{timeout:8_000});
  await teacher.click('.ig-deck-controls button:last-child');
  await assertText('.ig-score','1 dealt');
  await teacher.click('.ig-deck-controls button:nth-child(2)');
  await assertText('.ig-score','0 dealt');

  await clickMode(4);
  await teacher.waitForSelector('.ig-wheel-panel',{timeout:8_000});
  await teacher.click('.ig-wheel-panel .ig-primary-button');
  await teacher.waitForSelector('.ig-wheel-result',{timeout:8_000});
  await teacher.click('.ig-wheel-actions button:last-child');
  await teacher.waitForFunction(()=>document.querySelectorAll('.ig-wheel-label').length===8);

  await clickMode(5);
  console.log('Open-box hit test',await teacher.evaluate(()=>{
    const tile=document.querySelector<HTMLElement>('.ig-game-tile:nth-child(5)');
    const rect=tile?.getBoundingClientRect();
    const hit=rect?document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2):null;
    return {
      rect:rect?{x:rect.x,y:rect.y,width:rect.width,height:rect.height}:null,
      interceptedBy:hit?.outerHTML.slice(0,480),
      scrollY:window.scrollY,
    };
  }));
  console.log('Open-box navigation state',await teacher.evaluate(()=>({
    selected:[...document.querySelectorAll<HTMLButtonElement>('.ig-game-tile')].map((button)=>({
      title:button.querySelector('strong')?.textContent,
      pressed:button.getAttribute('aria-pressed'),
      disabled:button.disabled,
    })),
    heading:document.querySelector('.ig-workspace-head h2')?.textContent,
    boxes:document.querySelectorAll('.ig-box').length,
    html:document.querySelector('.ig-workspace')?.textContent?.slice(0,280),
  })));
  await teacher.waitForSelector('.ig-box',{timeout:8_000});
  await teacher.click('.ig-box:first-child');
  await assertText('.ig-box-detail','Explain: Legal');
  await teacher.click('.ig-box-detail button');
  await assertText('.ig-box-detail','Relating to what is permitted');

  await clickMode(6);
  await teacher.waitForSelector('.ig-quiz .ig-answer-button');
  if((await teacher.$$('.ig-quiz .ig-answer-button')).length!==4)throw new Error('Quiz did not display exactly 4 answer choices');
  await teacher.click('.ig-quiz .ig-answer-button:first-child');
  await teacher.waitForSelector('.ig-answer-feedback');
  await teacher.click('.ig-answer-feedback button');
  await assertText('.ig-quiz .ig-score','Question 2');

  await clickMode(7);
  await teacher.waitForSelector('.ig-find-tile');
  await teacher.evaluate(()=>[...document.querySelectorAll<HTMLButtonElement>('.ig-find-tile')]
    .find((button)=>button.textContent==='Legal')?.click());
  await assertText('.ig-find-status','1 / 9 matched');
  await teacher.evaluate(()=>[...document.querySelectorAll<HTMLButtonElement>('.ig-find-tile')]
    .find((button)=>button.textContent==='Culture')?.click());
  const lives=await teacher.$eval('.ig-hearts',(node)=>node.getAttribute('aria-label')??'');
  if(lives!=='2 lives remaining')throw new Error('Find the Match life counter mismatch: '+lives);

  await clickMode(8);
  await teacher.waitForSelector('.ig-anagram-letter',{timeout:8_000});
  const word=await teacher.$eval('.ig-anagram-hint',(node)=>node.textContent??'');
  if(!word.includes('Relating to what is permitted'))throw new Error('Anagram did not use real source term');
  for(const ch of 'LEGAL'){
    await teacher.evaluate((letter)=>{
      const tile=[...document.querySelectorAll<HTMLButtonElement>('.ig-anagram-letter')]
        .find((button)=>button.textContent===letter && !button.disabled);
      if(!tile)throw new Error('Missing anagram tile '+letter);
      tile.click();
    },ch);
  }
  await teacher.click('.ig-card-controls button:nth-child(3)');
  await assertText('.ig-feedback','Correct! Legal');

  // Live section selection and a distinct chapter must reload from the API.
  await teacher.select('select[aria-label="Section"]','1.1.1');
  await teacher.waitForFunction(()=>document.querySelector('.ig-notice')?.textContent?.includes('5 unique'));
  await teacher.select('select[aria-label="Chapter"]','2');
  await teacher.waitForFunction(()=>document.querySelector('.ig-notice')?.textContent?.includes('6 unique'));
  await assertText('.ig-hero','Chapter 2');

  await assertAxe(teacher,'Interactive Games teacher desktop');
  const overflow=await teacher.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  if(overflow>3)throw new Error('Interactive Games desktop overflow: '+overflow);

  const studentContext=await browser.createBrowserContext();
  const student=await studentContext.newPage();
  await student.setViewport({width:390,height:844});
  await installApi(student,'student1','lobby');
  student.on('pageerror',(err)=>errors.push('mobile: '+(err instanceof Error ? err.message : String(err))));
  await student.goto(base+'/#oquvchi/oyinlar',{waitUntil:'networkidle0',timeout:30_000});
  await student.waitForSelector('.ig-game-tile',{timeout:15_000});
  await student.waitForFunction(()=>document.querySelectorAll('.ig-game-tile').length===8);
  const mobileOverflow=await student.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  if(mobileOverflow>3)throw new Error('Interactive Games mobile horizontal overflow: '+mobileOverflow);
  await assertAxe(student,'Interactive Games student mobile');
  if(errors.length)throw new Error('Interactive Games browser errors: '+errors.join(' | '));
  await studentContext.close();
  await teacherContext.close();
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
    openSurface(browser,base,'projector',{width:3840,height:2160},`oqitish/live?id=${SESSION_ID}&projector=1`),
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
  if(!surfaces[1].result.projector||!surfaces[2].result.projector)throw new Error('projector context did not render projector overlay');
  if(surfaces[0].result.projector)throw new Error('teacher context unexpectedly rendered projector overlay');
  const mobile=surfaces[3]!;
  const mobileA11y=await mobile.page.evaluate(()=>{
    const textarea=document.querySelector<HTMLTextAreaElement>('#live-answer');
    const status=document.querySelector('.live-save-status');
    return{
      textareaFont:textarea?Number.parseFloat(getComputedStyle(textarea).fontSize):0,
      textareaHeight:textarea?.getBoundingClientRect().height??0,
      describedBy:textarea?.getAttribute('aria-describedby')??'',
      saveRole:status?.getAttribute('role')??'',
      saveLive:status?.getAttribute('aria-live')??'',
    };
  });
  if(mobileA11y.textareaFont<16||mobileA11y.textareaHeight<200||mobileA11y.describedBy!=='live-answer-help'
    ||mobileA11y.saveRole!=='status'||mobileA11y.saveLive!=='polite'){
    throw new Error(`mobile student accessibility failure: ${JSON.stringify(mobileA11y)}`);
  }
  for(const [index,surface] of surfaces.entries())await assertAxe(surface.page,`live surface ${index}`);
  await assertReducedMotion(browser,base);
  await assertInteractiveGames(browser,base);
  await assertJoinQrFlow(browser,base);
  await assertRehearsalUi(browser,base);
  console.log('Live multi-context browser smoke passed: WCAG axe, reduced-motion, QR join link, teacher rehearsal, 1080p/4K projector, mobile answer UX, and source fidelity');
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
