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
    {chapterNo:1,title:'Information representation',termCount:9,approvedCount:0,topics:[
      {code:'1.1',title:'Data representation',termCount:5},
      {code:'1.2',title:'Multimedia',termCount:4},
    ],sections:[
      {code:'1.1',title:'Data representation',parentCode:'1',termCount:9},
      {code:'1.1.1',title:'Number systems',parentCode:'1.1',termCount:5},
    ]},
    {chapterNo:2,title:'Communication',termCount:6,approvedCount:0,topics:[
      {code:'2.1',title:'Networks',termCount:6},
    ],sections:[
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
    if(path==='/content/interactive-games/collection' && request.method()==='POST'){
      const body=JSON.parse(request.postData()||'{}') as {
        scopes:Array<{chapterNo:number;kind:'chapter'|'topic'|'section';code?:string}>;
      };
      const rows=body.scopes.flatMap((scope)=>{
        const terms=scope.chapterNo===2?gameTerms.slice(3).map((term)=>({
          ...term,id:'ch2-'+term.id,term:'2: '+term.term,
          definition:'[2] '+term.definition,
        })):gameTerms;
        if(scope.kind==='section')return terms.slice(0,scope.chapterNo===1?5:4);
        if(scope.kind==='topic')return terms.slice(0,scope.chapterNo===1?5:6);
        return terms;
      });
      const pairs=[...new Map(rows.map((term)=>[term.id,term])).values()];
      void json(request,{data:{courseCode:'9618',scopes:body.scopes,contentStatus:'needs_review',pairs,source:'Browser glossary',assessed:false}});
      return;
    }
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
  // Reproduce user navigation from a different page. A working deep link alone
  // does not prove the game exists in the menu.
  await teacher.goto(base+'/#oqitish/darslar',{waitUntil:'networkidle0',timeout:30_000});
  const sidebarGame=await teacher.$('.shell-nav-groups a[href="#oqitish/oyinlar"]');
  if(!sidebarGame)throw new Error('Interactive Games is missing from teacher left menu');
  await teacher.$eval('.shell-nav-groups a[href="#oqitish/oyinlar"]',(node)=>node.scrollIntoView({block:'center'}));
  await teacher.click('.shell-nav-groups a[href="#oqitish/oyinlar"]');
  await teacher.waitForSelector('.ig-game-tile',{timeout:15_000});
  await teacher.waitForFunction(()=>document.querySelectorAll('.ig-game-tile').length===8);
  const clickGameControl=async(selector:string)=>{
    await teacher.$eval(selector,(node)=>node.scrollIntoView({block:'center',behavior:'auto'}));
    await teacher.click(selector);
  };
  const clickMode=async(index:number)=>{
    const selector='.ig-game-tile:nth-child('+index+')';
    // Sticky shell header can cover a tile at the very top of the viewport.
    // Scroll the target into the visible centre before native mouse input.
    await teacher.$eval(selector,(node)=>node.scrollIntoView({block:'center',behavior:'auto'}));
    await teacher.click(selector);
    await teacher.waitForFunction((choice)=>{
      const button=document.querySelectorAll<HTMLButtonElement>('.ig-game-tile')[choice-1];
      return button?.getAttribute('aria-pressed')==='true';
    },{timeout:5_000},index);
  };
  const assertText=async(selector:string,fragment:string)=>{
    const actual=await teacher.$eval(selector,(node)=>node.textContent??'');
    if(!actual.includes(fragment))throw new Error('Interactive Games missing '+fragment+' in '+selector+': '+actual);
  };
  await assertText('.ig-notice','pending review');
  await assertText('.ig-scope-picker','Information representation');
  // Teachers routinely search by the printed Hodder code, not only its title.
  const searchInput='input[aria-label="Search chapters and topics"]';
  await teacher.type(searchInput,'2.1.1');
  await teacher.waitForFunction(()=>document.querySelectorAll('.ig-scope-chapter').length===1);
  await assertText('.ig-scope-chapter','Communication');
  await teacher.click(searchInput);
  await teacher.keyboard.down('Control');
  await teacher.keyboard.press('A');
  await teacher.keyboard.up('Control');
  await teacher.keyboard.press('Backspace');
  await teacher.waitForFunction(()=>document.querySelectorAll('.ig-scope-chapter').length===2);

  // Complete all eight games through the same controls a teacher actually uses.
  for(const [index,term] of gameTerms.entries()){
    const bankIndex=await teacher.$$eval('.ig-bank-term',(nodes,expected)=>
      nodes.findIndex((node)=>node.textContent===expected),term.term);
    if(bankIndex<0)throw new Error('Missing Match Up term: '+term.term);
    await clickGameControl('.ig-bank-term:nth-of-type('+(bankIndex+1)+')');
    const slotIndex=await teacher.$$eval('.ig-drop-target button',(nodes,definition)=>
      nodes.findIndex((node)=>node.getAttribute('aria-label')?.endsWith(definition)),term.definition);
    if(slotIndex<0)throw new Error('Missing Match Up slot: '+term.definition);
    await clickGameControl('.ig-match-row:nth-of-type('+(slotIndex+1)+') .ig-drop-target button');
    if(index===0){
      await assertText('.ig-score','1 of 9 placed');
      const prematureSubmit=await teacher.$eval('.ig-match-actions button',(node)=>(node as HTMLButtonElement).disabled);
      if(!prematureSubmit)throw new Error('Match Up allowed submission before all terms were placed');
    }
  }
  await clickGameControl('.ig-match-actions button');
  await assertText('.ig-match-actions','9 / 9 correct');
  await teacher.waitForSelector('.ig-result-panel');
  await assertText('.ig-answer-review summary','9');

  await clickMode(2);
  await teacher.waitForSelector('.ig-flashcard',{timeout:8_000});
  await assertText('.ig-flashcard','Relating to what is permitted');
  await clickGameControl('.ig-flashcard');
  await assertText('.ig-flashcard','Legal');
  await clickGameControl('.ig-card-controls button:nth-child(2)');
  await clickGameControl('.ig-flashcard');
  await assertText('.ig-session-metrics','1 reviewed');
  for(let index=0;index<9;index++)await clickGameControl('.ig-card-controls button:last-child');
  await teacher.waitForSelector('.ig-result-panel');

  await clickMode(3);
  await teacher.waitForSelector('.ig-deck-controls',{timeout:8_000});
  await clickGameControl('.ig-deck-controls button:last-child');
  await assertText('.ig-score','1 dealt');
  await clickGameControl('.ig-dealt-card button');
  await assertText('.ig-dealt-card','Matching term');
  await clickGameControl('.ig-deck-controls button:nth-child(2)');
  await assertText('.ig-score','0 dealt');
  await clickGameControl('.ig-deck-controls button:first-child');
  for(let index=0;index<10;index++)await clickGameControl('.ig-deck-controls button:last-child');
  await teacher.waitForSelector('.ig-result-panel');
  await assertText('.ig-session-metrics','9 reviewed');

  await clickMode(4);
  await teacher.waitForSelector('.ig-wheel-controls',{timeout:8_000});
  await clickGameControl('.ig-wheel-controls .ig-primary-button');
  await assertText('.ig-wheel-controls .ig-primary-button','Spinning');
  if(await teacher.$('.ig-wheel-result'))throw new Error('Wheel revealed its result before the spin ended');
  await teacher.waitForSelector('.ig-wheel-result',{timeout:8_000});
  const wheelQuestion=await teacher.$eval('.ig-wheel-quiz h3',(node)=>node.textContent);
  const wheelMatch=gameTerms.find((term)=>term.definition===wheelQuestion);
  if(!wheelMatch)throw new Error('Spin the Wheel showed an unknown question: '+wheelQuestion);
  const wheelChoices=await teacher.$$eval('.ig-wheel-choice',(nodes)=>nodes.map((node)=>({
    term:node.querySelector('strong')?.textContent,
    top:node.getBoundingClientRect().top,
  })));
  if(wheelChoices.length!==4||new Set(wheelChoices.map((choice)=>choice.top)).size!==1){
    throw new Error('Spin the Wheel did not display four answer cards in one desktop row');
  }
  const correctChoice=wheelChoices.findIndex((choice)=>choice.term===wheelMatch.term);
  if(correctChoice<0)throw new Error('Spin the Wheel is missing its correct answer');
  await clickGameControl('.ig-wheel-choice:nth-child('+(correctChoice+1)+')');
  await assertText('.ig-wheel-answer-status','Correct!');
  await clickGameControl('.ig-wheel-actions button:first-child');
  await teacher.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  for(let remaining=9;remaining>0;remaining--){
    await clickGameControl('.ig-wheel-controls .ig-primary-button');
    await teacher.waitForSelector('.ig-wheel-actions button:last-child');
    await clickGameControl('.ig-wheel-actions button:last-child');
    await teacher.waitForFunction((expected)=>document.querySelectorAll('.ig-wheel-label').length===expected,{},remaining-1);
  }
  await teacher.waitForSelector('.ig-result-panel');
  await teacher.emulateMediaFeatures([]);

  await clickMode(5);
  await teacher.waitForSelector('.ig-box',{timeout:8_000});
  for(let box=1;box<=9;box++){
    await clickGameControl('.ig-box:nth-child('+box+')');
    await teacher.waitForSelector('.ig-box.is-opened:nth-child('+box+')');
    if(box===1){
      await assertText('.ig-box:nth-child(1)','Legal');
      await clickGameControl('.ig-box:nth-child(1)');
      await assertText('.ig-box:nth-child(1)','Relating to what is permitted');
    }
  }
  await clickGameControl('.ig-box-actions button');
  await teacher.waitForSelector('.ig-result-panel');

  await clickMode(5);
  await teacher.select('.ig-template-options select','questions');
  await clickGameControl('.ig-box:nth-child(1)');
  await teacher.waitForSelector('.ig-box-question');
  await assertText('.ig-box-clock','00:30');
  if((await teacher.$$('.ig-box-question .ig-choice-card')).length!==4)throw new Error('A question box is missing answer cards');
  const boxPrompt=await teacher.$eval('.ig-box-question h3',(node)=>node.textContent);
  const boxTerm=gameTerms.find((term)=>term.definition===boxPrompt)?.term;
  const boxChoices=await teacher.$eval('.ig-box-question .ig-choice-card strong',(nodes)=>nodes.map((node)=>node.textContent));
  const boxChoiceIndex=boxChoices.indexOf(boxTerm??'');
  if(boxChoiceIndex<0)throw new Error('Question box is missing its source-backed correct term');
  await clickGameControl('.ig-box-question .ig-choice-card:nth-child('+(boxChoiceIndex+1)+')');
  await assertText('.ig-box-question .ig-reveal','Correct!');
  await teacher.waitForSelector('.ig-box.is-opened:nth-child(1):disabled');
  await assertText('.ig-session-metrics','1 correct');
  await assertText('.ig-box.is-opened:nth-child(1)','✓ Correct');

  await clickMode(6);
  for(let index=0;index<9;index++){
    await teacher.waitForFunction((number)=>document.querySelector('.ig-quiz .ig-score')?.textContent?.startsWith(`Question ${number} /`),{},index+1);
    const answerRows=await teacher.$$eval('.ig-quiz .ig-choice-card',(nodes)=>nodes.map((node)=>(node as HTMLElement).offsetTop));
    if(answerRows.length!==4||new Set(answerRows).size!==1)throw new Error('Quiz did not display four cards in one desktop row: '+answerRows.join(', '));
    const prompt=await teacher.$eval('.ig-quiz .ig-question',(node)=>node.textContent);
    const expectedTerm=gameTerms.find((term)=>term.definition===prompt)?.term;
    const options=await teacher.$eval('.ig-quiz .ig-choice-card strong',(nodes)=>nodes.map((node)=>node.textContent));
    const answerIndex=options.indexOf(expectedTerm??'');
    if(answerIndex<0)throw new Error('Quiz item does not contain its correct glossary answer');
    await clickGameControl('.ig-quiz .ig-choice-card:nth-child('+(answerIndex+1)+')');
    await teacher.waitForSelector('.ig-choice-card.is-correct');
  }
  await teacher.waitForSelector('.ig-result-panel');
  await assertText('.ig-session-metrics','9 correct');

  await clickMode(7);
  await teacher.waitForSelector('.ig-find-tile');
  const clickTile=async (term:string)=>{
    const index=await teacher.$$eval('.ig-find-grid > *',(nodes,expected)=>nodes.findIndex((node)=>node.textContent===expected),term);
    if(index<0)throw new Error('Missing Find the Match tile: '+term);
    await clickGameControl('.ig-find-tile:nth-child('+(index+1)+')');
  };
  const readClue=()=>teacher.$eval('.ig-find-clue p',(node)=>node.textContent);
  const initialClue=await readClue();
  const wrongTerm=gameTerms.find((term)=>term.definition!==initialClue)!;
  await clickTile(wrongTerm.term);
  const lives=await teacher.$eval('.ig-hearts',(node)=>node.getAttribute('aria-label')??'');
  if(lives!=='2 lives remaining')throw new Error('Find the Match life counter mismatch: '+lives);
  for(const _ of gameTerms){
    const clue=await readClue();
    const match=gameTerms.find((term)=>term.definition===clue);
    if(!match)throw new Error('Find the Match displayed an unknown clue: '+clue);
    await clickTile(match.term);
  }
  await teacher.waitForSelector('.ig-result-panel');
  await assertText('.ig-session-metrics','8 correct');
  await assertText('.ig-session-metrics','1 reviewed');

  await clickMode(8);
  await teacher.waitForSelector('.ig-anagram-letter',{timeout:8_000});
  await assertText('.ig-anagram-hint','Relating to what is permitted');
  await clickGameControl('.ig-anagram .ig-template-options input[type=checkbox]');
  for(const term of gameTerms){
    for(const letter of term.term.toUpperCase().replace(/[^A-Z0-9]/g,'')){
      const tile=await teacher.$$eval('.ig-anagram-letter',(buttons,char)=>
        buttons.findIndex((button)=>button.textContent===char && !(button as HTMLButtonElement).disabled),letter);
      if(tile<0)throw new Error('Missing anagram tile '+letter);
      await clickGameControl('.ig-anagram-letter:nth-child('+(tile+1)+')');
    }
    await assertText('.ig-feedback','Correct! '+term.term);
    await clickGameControl('.ig-card-controls button:last-child');
  }
  await teacher.waitForSelector('.ig-result-panel');

  // Narrow a chapter directly while another chapter remains selected.
  await clickGameControl('input[aria-label="Select entire Chapter 2"]');
  await teacher.waitForFunction(()=>document.querySelector('.ig-notice')?.textContent?.includes('15 unique'));
  if(!await teacher.$('.ig-scope-chapter:first-child details[open]')){
    await clickGameControl('.ig-scope-chapter:first-child summary');
  }
  await clickGameControl('input[aria-label="Hodder section 1.1.1 · Chapter 1"]');
  await teacher.waitForFunction(()=>document.querySelector('.ig-notice')?.textContent?.includes('11 unique'));
  await clickGameControl('input[aria-label="Topic 1.1 · Chapter 1"]');
  await teacher.waitForFunction(()=>document.querySelector('.ig-session-name')?.textContent?.includes('3 selections'));
  await assertText('.ig-hero','2 chapters selected');
  const fullChapter=await teacher.$eval('input[aria-label="Select entire Chapter 1"]',(node)=>(node as HTMLInputElement).checked);
  if(fullChapter)throw new Error('Selecting a subtopic did not narrow its whole chapter');

  await assertAxe(teacher,'Interactive Games teacher desktop');
  // Optional sound, countdown, full interaction pause and honest session summary.
  await teacher.$eval('.ig-sound-toggle',(node)=>node.scrollIntoView({block:'center',behavior:'auto'}));
  await teacher.click('.ig-sound-toggle');
  const soundPressed=await teacher.$eval('.ig-sound-toggle',(node)=>node.getAttribute('aria-pressed'));
  if(soundPressed!=='true')throw new Error('Game sound toggle did not turn on');
  await teacher.select('select[aria-label="Time limit"]','30');
  await assertText('.ig-clock','Remaining 00:30');
  await clickGameControl('.ig-start-panel button');
  await teacher.$eval('.ig-pause-button',(node)=>node.scrollIntoView({block:'center',behavior:'auto'}));
  await teacher.click('.ig-pause-button');
  const frozen=await teacher.$eval('fieldset.ig-game-stage',(node)=>node.hasAttribute('disabled'));
  if(!frozen)throw new Error('Pausing the timer did not freeze gameplay');
  await assertText('.ig-paused-banner','Paused');
  await teacher.$eval('.ig-pause-button',(node)=>node.scrollIntoView({block:'center',behavior:'auto'}));
  await teacher.click('.ig-pause-button');
  const resumed=await teacher.$eval('fieldset.ig-game-stage',(node)=>!node.hasAttribute('disabled'));
  if(!resumed)throw new Error('Resume did not reactivate game');
  await teacher.$eval('.ig-finish-button',(node)=>node.scrollIntoView({block:'center',behavior:'auto'}));
  await teacher.click('.ig-finish-button');
  await teacher.waitForSelector('.ig-result-panel',{timeout:5_000});
  await assertText('.ig-result-panel','Practice feedback only');
  await assertAxe(teacher,'Interactive Games finished round');
  await teacher.click('.ig-result-actions button:first-child');
  await teacher.waitForSelector('.ig-start-panel button',{visible:true});
  await assertText('.ig-clock','Remaining 00:30');
  const overflow=await teacher.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  if(overflow>3)throw new Error('Interactive Games desktop overflow: '+overflow);

  const studentContext=await browser.createBrowserContext();
  const student=await studentContext.newPage();
  await student.setViewport({width:390,height:844});
  await installApi(student,'student1','lobby');
  student.on('pageerror',(err)=>errors.push('mobile: '+(err instanceof Error ? err.message : String(err))));
  await student.goto(base+'/#oquvchi/uy',{waitUntil:'networkidle0',timeout:30_000});
  const studentGame=await student.$('.shell-nav-groups a[href="#oquvchi/oyinlar"]');
  if(!studentGame)throw new Error('Interactive Games is missing from student left menu');
  const headerShortcut=await student.$('.shell-games-shortcut[href="#oquvchi/oyinlar"]');
  if(!headerShortcut)throw new Error('Interactive Games is missing from the mobile header');
  await student.click('.shell-games-shortcut');
  await student.waitForSelector('.ig-game-tile',{timeout:15_000});
  await student.waitForFunction(()=>document.querySelectorAll('.ig-game-tile').length===8);
  const mobileOverflow=await student.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  if(mobileOverflow>3)throw new Error('Interactive Games mobile horizontal overflow: '+mobileOverflow);
  await assertAxe(student,'Interactive Games student mobile');
  for(let modeIndex=1;modeIndex<=8;modeIndex++){
    const selector='.ig-game-tile:nth-child('+modeIndex+')';
    await student.$eval(selector,(node)=>node.scrollIntoView({block:'center',behavior:'auto'}));
    const disabled=await student.$eval(selector,(node)=>('disabled' in node && Boolean((node as HTMLButtonElement).disabled)));
    if(disabled)continue;
    await student.click(selector);
    await student.waitForFunction((choice)=>{
      const button=document.querySelectorAll<HTMLButtonElement>('.ig-game-tile')[choice-1];
      return button?.getAttribute('aria-pressed')==='true';
    },{timeout:5_000},modeIndex);
    const overlap=await student.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    if(overlap>3)throw new Error('Interactive Games mobile overflow in mode '+modeIndex+': '+overlap);
    await assertAxe(student,'Interactive Games student mobile mode '+modeIndex);
    if(modeIndex===5){
      await student.select('.ig-template-options select','questions');
      const firstBox='.ig-box:first-child';
      await student.$eval(firstBox,(node)=>node.scrollIntoView({block:'center',behavior:'auto'}));
      await student.click(firstBox);
      await student.waitForSelector('.ig-box-question');
      await assertAxe(student,'Interactive Games question box on mobile');
      const questionOverflow=await student.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
      if(questionOverflow>3)throw new Error('Question box overflow on mobile: '+questionOverflow);
    }
    if(modeIndex===4){
      await student.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      const spin='.ig-wheel-controls .ig-primary-button';
      await student.$eval(spin,(node)=>node.scrollIntoView({block:'center',behavior:'auto'}));
      await student.click(spin);
      await student.waitForSelector('.ig-wheel-quiz');
      const rows=await student.$$eval('.ig-wheel-choice',(nodes)=>nodes.map((node)=>node.getBoundingClientRect().top));
      if(rows.length!==4||new Set(rows).size!==2)throw new Error('Spin the Wheel did not display two rows of answer cards on mobile');
      await assertAxe(student,'Interactive Games wheel question on mobile');
      await student.emulateMediaFeatures([]);
    }
  }
  await assertAxe(student,'Interactive Games student anagram/mobile');
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
