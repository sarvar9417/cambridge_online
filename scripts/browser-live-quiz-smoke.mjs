/** Real Chromium guest-journey smoke test with a deterministic local API stub.
 * It validates the built React interaction, NOT the PostgreSQL migration.
 * No networked database, deployment or production resources are used.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const port=5188;
const origin=`http://127.0.0.1:${port}`;
const playerId='2bbcc2fa-38c9-4ebd-8120-111111111111';
const roomId='a8918dd9-6325-4e32-a602-222222222222';
const token='a'.repeat(64);
const question=(index)=>({id:`q${index}`,index,
  prompt:index===0?'Old definition':'New definition',
  options:index===0?['Old A','Old B','Old C','Old D']:['New A','New B','New C','New D'],
  sourceContext:'Chapter 18'});
const game={phase:'waiting',requests:[]};
const clock=()=>new Date().toISOString();

function snapshot(){
  const finished=game.phase==='finished';
  const waiting=game.phase==='waiting';
  const first=game.phase==='first';
  const index=first||waiting?0:1;
  return {id:roomId,pin:'123456',courseCode:'9618',mode:'treasure',
    status:finished?'finished':waiting?'waiting':'active',
    questionCount:4,questionIndex:index,questionSeconds:20,
    questionStartedAt:clock(),serverNow:clock(),
    endsAt:new Date(Date.now()+180000).toISOString(),treasureGoal:5000,
    ownScore:finished?350:0,ownCorrect:['chest','finished'].includes(game.phase)?1:0,
    ownTurn:finished?2:index,players:[{id:playerId,nickname:'Aziza',avatar:'🦊',
      score:finished?350:0,answered:index}],answeredCount:first?0:index+1,
    question:waiting||finished||game.phase==='chest'?null:question(index),
    ownAnswer:null,selfId:playerId,nickname:'Aziza',
    pendingReward:game.phase==='chest'?{turnIndex:1,type:null,targets:[]}:null};
}
const report={id:roomId,pin:'123456',courseCode:'9618',mode:'treasure',
  totalQuestions:4,questionBankSize:4,finishedAt:clock(),students:[{
    id:playerId,nickname:'Aziza',avatar:'🦊',score:350,correct:1,answered:2,total:2,
    details:[
      {number:1,prompt:'Old definition',options:question(0).options,choiceIndex:0,
        correctIndex:2,correct:false,points:0,explanation:'Old C is correct',
        sourceContext:'Chapter 18',status:'wrong',rewardType:'none'},
      {number:2,prompt:'New definition',options:question(1).options,choiceIndex:2,
        correctIndex:2,correct:true,points:0,explanation:'New C is correct',
        sourceContext:'Chapter 18',status:'correct',rewardType:'gold'},
    ],
  }]};

function response(data){return {status:200,contentType:'application/json',body:JSON.stringify({data})};}
async function serveRequest(request){
  const url=new URL(request.url());
  if(!url.pathname.startsWith('/api/v1/live-quiz-guest/'))return request.continue();
  const path=url.pathname.slice('/api/v1/live-quiz-guest'.length);
  const method=request.method();
  const body=method==='POST'?JSON.parse(request.postData()??'{}'):null;
  game.requests.push({path,method,body});
  if(path==='/lobby/123456')return request.respond(response({pin:'123456',
    courseCode:'9618',mode:'treasure',status:'waiting',randomNames:false,playerCount:0}));
  if(path==='/join'){
    assert.equal(body?.nickname,'Aziza');
    return request.respond(response({playerId,token,pin:'123456',roomId}));
  }
  if(path===`/${playerId}`)return request.respond(response(snapshot()));
  if(path===`/${playerId}/answer`){
    if(game.phase==='first'){
      assert.deepEqual(body,{questionIndex:0,choiceIndex:0});game.phase='second';
      return request.respond(response({submitted:true,turnIndex:0,correct:false,
        rewardPending:false,correctIndex:2}));
    }
    assert.equal(game.phase,'second');
    assert.deepEqual(body,{questionIndex:1,choiceIndex:2});game.phase='chest';
    return request.respond(response({submitted:true,turnIndex:1,correct:true,
      rewardPending:true,correctIndex:2}));
  }
  if(path===`/${playerId}/reward`){
    assert.equal(game.phase,'chest');assert.deepEqual(body,{turnIndex:1,chestIndex:0});
    game.phase='finished';
    return request.respond(response({rewardType:'gold',needsTarget:false,delta:350,
      newScore:350,gameFinished:true}));
  }
  if(path===`/${playerId}/report`)return request.respond(response(report));
  return request.respond({status:404,body:'Unknown local test route'});
}

async function waitForVite(child){
  for(let attempt=0;attempt<80;attempt++){
    if(child.exitCode!==null)throw Error('Vite exited before the browser started.');
    try{const result=await fetch(origin);if(result.ok)return;}catch{/* server booting */}
    await delay(100);
  }
  throw Error('Local Vite test server did not start.');
}

const vite=spawn(process.execPath,[join(root,'node_modules/vite/bin/vite.js'),
  '--host','127.0.0.1','--port',String(port),'--strictPort'],{
  cwd:join(root,'frontend'),stdio:['ignore','pipe','pipe'],
});
let browser;
try{
  await waitForVite(vite);
  browser=await puppeteer.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',
    headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',request=>{void serveRequest(request).catch(error=>{
    console.error(error);void request.abort();
  });});
  await page.goto(`${origin}/#/play/123456`,{waitUntil:'networkidle2'});
  await page.waitForSelector('input[placeholder="Enter your name"]');
  await page.type('input[placeholder="Enter your name"]','Aziza');
  await page.click('.lq-guest-join .lq-primary');
  await page.waitForSelector('.lq-guest-waiting');
  game.phase='first';
  await page.waitForSelector('.lq-guest-question .lq-options button');
  await page.click('.lq-guest-question .lq-options button:first-child');
  await page.waitForFunction(()=>document.body.textContent.includes('Correct answer: Old C'));
  await page.waitForFunction(()=>document.body.textContent.includes('New definition'));
  await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
  const mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
  assert.equal(mobileOverflow,false,'The live mobile question layout must not overflow horizontally.');
  await page.click('.lq-guest-question .lq-options button:nth-child(3)');
  await page.waitForSelector('.lq-chest-grid button');
  assert.equal(await page.$$eval('.lq-chest-grid button',items=>items.length),3);
  await page.click('.lq-chest-grid button:first-child');
  await page.waitForFunction(()=>document.body.textContent.includes('1 / 2'));
  assert.ok((await page.content()).includes('Old definition'));
  assert.ok((await page.content()).includes('Correct answer:'));
  assert.equal(game.requests.filter(item=>item.path.endsWith('/reward')).length,1);
  console.log('LIVE QUIZ CHROME SMOKE OK: PIN join, wrong correction, mobile layout, chest and 1/2 report.');
}finally{
  await browser?.close();
  vite.kill('SIGTERM');
}
