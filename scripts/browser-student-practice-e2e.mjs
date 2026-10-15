// End-to-end student-host acceptance against the isolated localhost Live fixture.
// This never uses production accounts, database URLs or session identifiers.
import { createBrowserQA } from './browser-qa.mjs';
import { markVisibleAnswer, joinLobby, snapshot } from './browser-live-qa.mjs';

for(const key of ['SEED_STUDENT_PASSWORD','CHROME_EXECUTABLE_PATH']){
  if(!process.env[key])throw new Error(`Missing local QA setting: ${key}`);
}
const qa=await createBrowserQA({
  baseUrl:process.env.LIVE_E2E_BASE_URL??'http://localhost:5173',
  executablePath:process.env.CHROME_EXECUTABLE_PATH,
  outputDir:process.env.LIVE_E2E_OUTPUT_DIR
    ?`${process.env.LIVE_E2E_OUTPUT_DIR}/student-practice`
    :'output/live-browser-e2e/student-practice',
});
const targetRef='9618/11/M/J/26 Q1(a)';

async function createRoom(host,mode){
  await qa.go(host.page,'oquvchi/live');
  await host.page.waitForSelector('select[aria-label="Mashq rejimi"]',{visible:true});
  await host.page.waitForSelector('.live-topic-grid fieldset:first-child input[type="checkbox"]',{visible:true});
  await host.page.select('select[aria-label="Mashq rejimi"]',mode);
  await qa.fill(host.page,'input[name="title"]',`Student ${mode} browser acceptance ${Date.now()}`);
  await host.page.locator('.live-topic-grid fieldset:first-child input[type="checkbox"]').click();
  const excludeSeen=await host.page.$eval('input[name="excludeSeen"]',el=>el.checked);
  if(excludeSeen)await host.page.locator('input[name="excludeSeen"]').click();
  await host.page.select('select[aria-label="Savol tanlash usuli"]','manual');
  await qa.clickText(host.page,'Savollarni ko‘rsatish');
  await qa.waitText(host.page,targetRef);
  const picked=await host.page.evaluate(ref=>{
    const label=[...document.querySelectorAll('.live-question-pool label')]
      .find(element=>element.textContent?.includes(ref));
    const box=label?.querySelector('input[type="checkbox"]');
    if(!(box instanceof HTMLInputElement))return false;
    box.click();
    return box.checked;
  },targetRef);
  await qa.check(`Student ${mode}: approved source-backed question selected`,picked);
  await qa.clickText(host.page,'Xonani yaratish');
  await host.page.waitForSelector('.live-student-host',{timeout:45000});
  const id=await host.page.evaluate(()=>new URLSearchParams(location.hash.split('?')[1]).get('id'));
  const state=await snapshot(host.page,id);
  await qa.check(`Student ${mode}: host owns room and participates without staff data`,
    state.session.isHost===true
      && state.session.settings.practiceMode===mode
      && state.session.participantCount===1
      && state.teacherAnswers.length===0
      && state.participants.length===0
      && state.questions.length===0
      && state.session.settings.allowLateJoin===false);
  qa.report.fixtures.push({type:'student-practice',mode,id});
  qa.save();
  const code=state.session.joinCode;
  return {id,code};
}
async function submit(student,value){
  await student.page.waitForSelector('#live-answer',{visible:true});
  await qa.fill(student.page,'#live-answer',value);
  await qa.clickText(student.page,'Javobni topshirish');
  await qa.waitText(student.page,'Topshirildi ✓');
}
async function review(student,kind,index){
  await qa.waitText(student.page,kind==='peer'?'ANONIM JAVOB':'O‘Z JAVOBINGIZ');
  await markVisibleAnswer(qa,student.page,'.live-review-card',
    `Student ${kind} review ${index}: matched Cambridge mark point`);
}

try{
  const host=await qa.login('student01',process.env.SEED_STUDENT_PASSWORD,'Student host');
  const peer=await qa.login('student02',process.env.SEED_STUDENT_PASSWORD,'Student peer');
  // Learner-host reveal/cancel actions deliberately require confirmation.
  // Handle the real Chrome dialog instead of leaving Puppeteer's click blocked.
  host.page.on('dialog',dialog=>void dialog.accept());

  // Solo: host is the sole participant and cannot show the scheme before submit.
  const solo=await createRoom(host,'solo');
  await qa.check('Solo: join code hidden from browser lobby',
    (await host.page.$('.live-student-host-code'))===null);
  await qa.clickText(host.page,'Start Challenge');
  await submit(host,'Uses binary digits zero and one');
  const soloReady=await snapshot(host.page,solo.id);
  const soloReveal=await host.page.evaluate(()=>{
    const el=[...document.querySelectorAll('.live-student-host-actions button')]
      .find(item=>item.textContent?.includes('Mark Scheme'));
    return {text:el?.textContent,disabled:el?.disabled,
      hostText:document.querySelector('.live-student-host')?.textContent};
  });
  console.log('Solo after submit:',JSON.stringify({
    serverStatus:soloReady.session.status,serverSubmitted:soloReady.session.submittedCount,
    serverParticipants:soloReady.session.participantCount,dom:soloReveal,
  }));
  await qa.check('Solo: server and host control agree that answer is submitted',
    soloReady.session.submittedCount===1&&soloReady.session.participantCount===1,
    {submitted:soloReady.session.submittedCount,participants:soloReady.session.participantCount,dom:soloReveal});
  await host.page.waitForFunction(()=>[...document.querySelectorAll('.live-student-host-actions button')]
    .some(item=>item.textContent?.includes('Mark Scheme')&&!item.disabled),{timeout:30000});
  await qa.clickText(host.page,'Javoblarni yopish · Mark Scheme');
  await review(host,'self',1);
  await qa.waitText(host.page,'SAVOL NATIJASI');
  await qa.clickText(host.page,'Mashqni yakunlash');
  await qa.waitText(host.page,'SESSIYA YAKUNLANDI');
  await qa.check('Solo: finished with personal scores only',
    (await snapshot(host.page,solo.id)).report.rows.length===1);

  // Group: two different learners submit and score anonymous peer answers.
  const group=await createRoom(host,'group');
  await qa.check('Group: Start disabled until at least two participants',
    await host.page.$eval('.live-student-host-actions button',button=>button.disabled));
  await joinLobby(qa,peer,group.code);
  await qa.waitText(peer.page,'XONAGA QO‘SHILDINGIZ');
  await host.page.waitForFunction(
    ()=>document.querySelector('.live-student-host')?.textContent?.includes('2 ishtirokchi'),
    {timeout:45000},
  );
  await qa.clickText(host.page,'Start Challenge');
  await submit(host,'The number system uses only zero and one');
  await submit(peer,'Each bit has one of two possible values');
  await qa.clickText(host.page,'Javoblarni yopish · Mark Scheme');
  // The reveal mutation and the peer's realtime snapshot may settle at
  // different times. Wait for the actual anonymous review workspace in both
  // browsers before asserting server-side assignment and privacy.
  await qa.waitText(host.page,'ANONIM JAVOB');
  await qa.waitText(peer.page,'ANONIM JAVOB');
  const hostPeer=await snapshot(host.page,group.id);
  const peerPeer=await snapshot(peer.page,group.id);
  await qa.check('Group: separate anonymous peer assignments',
    hostPeer.review?.kind==='peer'
      && peerPeer.review?.kind==='peer'
      && !hostPeer.review.studentId && !peerPeer.review.studentId
      && !hostPeer.review.studentName && !peerPeer.review.studentName);
  await review(host,'peer',1);
  await review(peer,'peer',2);
  await qa.waitText(host.page,'SAVOL NATIJASI');
  const score=await host.page.evaluate(async id=>{
    const {api}=await import('/src/lib/api.ts');
    return api(`/live-exams/${id}/round-summary`);
  },group.id);
  await qa.check('Group: released standings have aliases, not real names or IDs',
    score.round.standings.length===2
      && score.round.standings.every(item=>
        item.studentName.startsWith('Ishtirokchi ')&&!('studentId'in item)));
  await qa.clickText(host.page,'Mashqni yakunlash');
  await qa.waitText(peer.page,'SESSIYA YAKUNLANDI');

  // Collaborative: each learner evaluates their own answer in a shared room.
  const collaborative=await createRoom(host,'collaborative');
  await joinLobby(qa,peer,collaborative.code);
  await qa.waitText(peer.page,'XONAGA QO‘SHILDINGIZ');
  await qa.clickText(host.page,'Start Challenge');
  await submit(host,'A binary digit is either 0 or 1');
  await submit(peer,'Binary has base two');
  await qa.clickText(host.page,'Javoblarni yopish · Mark Scheme');
  const each=[await snapshot(host.page,collaborative.id),await snapshot(peer.page,collaborative.id)];
  await qa.check('Collaborative: self reviews keep ownership separate',
    each.every(x=>x.review?.kind==='self'&&x.teacherAnswers.length===0));
  await review(host,'self',1);
  await review(peer,'self',2);
  await qa.waitText(host.page,'SAVOL NATIJASI');
  await qa.clickText(host.page,'Mashqni yakunlash');
  await qa.waitText(peer.page,'SESSIYA YAKUNLANDI');

  await qa.check('Student practice: no browser page errors',qa.report.pageErrors.length===0,
    {errors:qa.report.pageErrors});
  await qa.check('Student practice: no unexpected API errors',
    qa.report.httpErrors.filter(x=>!(x.path==='/api/v1/auth/refresh'&&x.status===401)).length===0,
    {errors:qa.report.httpErrors});
  await qa.screenshot(host.page,'student-practice-finished');
}finally{
  await qa.finish();
}
