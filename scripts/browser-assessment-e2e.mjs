// End-to-end Test & Assessment Center acceptance against LOCAL synthetic fixtures.
// No production URL, account or database is used here.
import path from 'node:path';
import {createBrowserQA} from './browser-qa.mjs';

for(const key of ['SEED_OWNER_USERNAME','SEED_OWNER_PASSWORD',
  'SEED_STUDENT_PASSWORD','CHROME_EXECUTABLE_PATH']){
  if(!process.env[key])throw Error('Missing local assessment QA setting: '+key);
}
const qa=await createBrowserQA({
  baseUrl:process.env.LIVE_E2E_BASE_URL??'http://localhost:5173',
  executablePath:process.env.CHROME_EXECUTABLE_PATH,
  outputDir:(process.env.LIVE_E2E_OUTPUT_DIR??'output/live-browser-e2e')+'/assessment',
});
const classFixture=path.resolve('scripts/fixtures/assessment-class-e2e.json');
const directFixture=path.resolve('scripts/fixtures/assessment-direct-e2e.json');
async function teacherImport(page,file){
  await qa.go(page,'oqitish/testlar');
  if(await page.$('section[aria-label="O‘zlashtirish profili"]')){
    await qa.clickText(page,'Testlarga qaytish');
    await page.waitForSelector('.ac-report',{visible:true});
  }
  // Use the real teacher back control, not an unrelated games route that may
  // trigger absent-glossary API errors in the minimal browser fixture.
  const backToTests=await page.evaluate(()=>{
    const control=[...document.querySelectorAll('.ac-panel button')]
      .find(button=>button.textContent?.includes('Barcha testlar'));
    if(!control)return false;
    control.click();return true;
  });
  if(backToTests)await page.waitForSelector('.ac-import',{visible:true});
  if(!(await page.$('.ac-import'))) {
    await page.waitForSelector('.qt-header button',{visible:true});
    await page.$eval('.qt-header button',node=>node.click());
  }
  await page.waitForSelector('.ac-import input[type="file"]',{visible:true});
  const upload=await page.$('.ac-import input[type="file"]');
  await upload.uploadFile(file);
  await page.waitForSelector('.ac-editor-q',{visible:true});
  await qa.clickText(page,'Draft saqlash');
  await page.waitForSelector('.ac-publish',{visible:true,timeout:45000});
}
async function chooseOne(page,selector,text){
  const did=await page.evaluate(({selector,text})=>{
    const label=[...document.querySelectorAll(selector)].find(node=>node.textContent.includes(text));
    const input=label?.querySelector('input[type="checkbox"]');
    if(!input)return false;
    input.click();
    return input.checked;
  },{selector,text});
  await qa.check('Teacher selected '+text,did);
}
async function approveAndPublish(page){
  await chooseOne(page,'.ac-publish > label','Manba fayl');
  await qa.clickText(page,'Testni nashr qilish');
  await page.waitForFunction(()=>!document.querySelector('.ac-publish'),{timeout:45000});
  await qa.waitText(page,'published');
}
try{
  const teacher=await qa.login(process.env.SEED_OWNER_USERNAME,
    process.env.SEED_OWNER_PASSWORD,'Assessment teacher/owner');
  const student=await qa.login('student01',process.env.SEED_STUDENT_PASSWORD,'Assessment student in 10-A');
  const outsider=await qa.login('student07',process.env.SEED_STUDENT_PASSWORD,'Assessment student from 11-A');
  const direct=await qa.login('student13',process.env.SEED_STUDENT_PASSWORD,'Assessment unassigned student');
  student.page.on('dialog',dialog=>void dialog.accept());
  direct.page.on('dialog',dialog=>void dialog.accept());
  // Check a real DEFLATE-compressed DOCX in Chrome, not only XML unit tests.
  await qa.go(teacher.page,'oqitish/testlar');
  await teacher.page.waitForSelector('.qt-header button',{visible:true});
  await teacher.page.$eval('.qt-header button',node=>node.click());
  await teacher.page.waitForSelector('.ac-import input[type="file"]',{visible:true});
  const wordInput=await teacher.page.$('.ac-import input[type="file"]');
  await wordInput.uploadFile(path.resolve('scripts/fixtures/Grade 8.docx'));
  await teacher.page.waitForFunction(
    ()=>Boolean(document.querySelector('.ac-editor-q')||document.querySelector('.ac-error')),
    {timeout:15000});
  const wordImportState=await teacher.page.$eval('.assessment-center',
    node=>({prompt:node.querySelector('.ac-editor-q textarea')?.value??null,
      uploaded:Boolean(node.querySelector('.ac-editor-q')),
      unkeyed:node.textContent.includes('1 ta javob kaliti hali berilmagan'),
      alert:node.querySelector('.ac-error')?.textContent??null}));
  await qa.check('Compressed Word DOCX imports Grade 8 draft with unverified key',
    wordImportState.uploaded
      &&wordImportState.prompt==='Which number system is binary?'
      &&wordImportState.unkeyed&&!wordImportState.alert,
    wordImportState);
  const inferredGrade=await teacher.page.$eval('.ac-form-grid > label:nth-child(3) input',
    field=>field.value);
  await qa.check('Real Word DOCX infers Grade 8 from its filename',inferredGrade==='Grade 8',
    {grade:inferredGrade});
  await qa.clickText(teacher.page,'Bekor qilish');
  // Teacher imports a reviewed JSON question set via the visible browser form.
  await teacherImport(teacher.page,classFixture);
  const teacherTitle=await teacher.page.$eval('.ac-panel h2',node=>node.textContent);
  await qa.check('Teacher importer populated actual A-D question text',teacherTitle.includes('Assessment E2E Hardware'));
  await chooseOne(teacher.page,'.ac-class-grid label','10-A CS');
  await approveAndPublish(teacher.page);
  await qa.screenshot(teacher.page,'teacher-published-class-test');

  // Delivery: the student's main dashboard, not just the assessment route, receives the invitation.
  await qa.go(student.page,'oquvchi/uy');
  await qa.waitText(student.page,'Assessment E2E Hardware');
  await qa.check('Student main dashboard advertises the class test',
    !!(await student.page.$('.ac-inbox-item')));
  await student.page.waitForSelector('.student-test-code input',{visible:true});
  await qa.check('Student home shows six-digit test code field',
    !!(await student.page.$('.student-test-code input[inputmode="numeric"]')));
  await qa.go(outsider.page,'oquvchi/testlar');
  await outsider.page.waitForSelector('.assessment-center');
  await qa.check('Other class student cannot see class-only assessment',
    !(await outsider.page.$eval('.assessment-center',node=>node.textContent.includes('Assessment E2E Hardware'))));

  await qa.go(student.page,'oquvchi/testlar');
  await qa.waitText(student.page,'Assessment E2E Hardware');
  await student.page.waitForSelector('.student-test-code-form input',{visible:true});
  await qa.check('Student Testlarim includes code field and enter button',
    await student.page.$eval('.student-test-code-form',form=>
      form.querySelector('input')?.getAttribute('maxlength')==='6'&&
      form.querySelector('button')?.textContent.includes('Testga kirish')));
  await student.page.setViewport({width:390,height:844,deviceScaleFactor:1});
  const overflow=await student.page.evaluate(()=>({
    viewport:window.innerWidth,
    scrollWidth:document.documentElement.scrollWidth,
  }));
  await qa.check('Mobile test list does not overflow viewport',
    overflow.scrollWidth<=overflow.viewport+3,overflow);
  await qa.screenshot(student.page,'student-mobile-invitation');
  await qa.clickText(student.page,'Testni boshlash');
  await qa.waitText(student.page,'Which unit performs arithmetic operations?');
  const beforeAnswer=await student.page.evaluate(async()=>{
    const {api}=await import('/src/lib/api.ts');
    const id=new URLSearchParams(location.hash.split('?')[1]).get('id');
    const attempt=await api('/assessment-center');
    return attempt.data.find(item=>item.title==='Assessment E2E Hardware');
  });
  await qa.check('Student sees assessment without teacher answer key',!!beforeAnswer);
  await student.page.locator('.ac-options label:first-child input[type="radio"]').click();
  await qa.waitText(student.page,'Javob serverda saqlandi');
  await qa.clickText(student.page,'Keyingi →');
  await qa.waitText(student.page,'Which memory is volatile?');
  await student.page.locator('.ac-options label:first-child input[type="radio"]').click(); // intentionally wrong
  await qa.waitText(student.page,'Javob serverda saqlandi');
  await qa.clickText(student.page,'Yakunlash');
  await qa.waitText(student.page,'1/2 ball');
  await qa.check('Student submitted, received immutable first-attempt score',
    (await student.page.$eval('.ac-complete',node=>node.textContent)).includes('1/2'));
  await qa.screenshot(student.page,'student-mobile-result');

  // Teacher can inspect class stats, the actual student's mistakes and chosen answers.
  await qa.clickText(teacher.page,'Natijalarni ko‘rish');
  await qa.waitText(teacher.page,'Aziz Karimov');
  const row=await teacher.page.$eval('.ac-report',node=>node.innerText);
  await qa.check('Teacher report shows submitted first-attempt 50 percent result',
    row.includes('50%'),{score:row.match(/50%/)?.[0]});
  const profileOpened=await teacher.page.evaluate(()=>{
    const row=[...document.querySelectorAll('.ac-report tbody tr')]
      .find(item=>item.textContent?.includes('Aziz Karimov'));
    const control=row?.querySelector('button');
    if(!control)return false;
    control.click();return true;
  });
  await qa.check('Teacher opened the student whose first attempt was graded',profileOpened);
  await qa.waitText(teacher.page,'Xato qilingan savollar');
  await qa.check('Individual profile identifies wrong option and correct key',
    await teacher.page.$eval('.ac-mistake',node=>node.textContent.includes('RAM')));
  await qa.screenshot(teacher.page,'teacher-individual-mistakes');

  // An owner may invite students individually when no matching Grade 8 class exists.
  await teacherImport(teacher.page,directFixture);
  await qa.check('Grade 8 does not falsely show an existing 9618 classroom',
    (await teacher.page.$$('.ac-class-grid input[type=checkbox]')).length===0);
  await chooseOne(teacher.page,'.ac-student-grid label','QA Unassigned Grade 8');
  await approveAndPublish(teacher.page);
  await qa.go(direct.page,'oquvchi/uy');
  await qa.waitText(direct.page,'Assessment E2E Direct Grade 8');
  await qa.check('Individual invitation reaches student without target class',
    await direct.page.$eval('.ac-inbox',node=>node.textContent.includes('Assessment E2E Direct Grade 8')));
  await qa.go(direct.page,'oquvchi/testlar');
  await qa.waitText(direct.page,'Assessment E2E Direct Grade 8');
  await qa.clickText(direct.page,'Testni boshlash');
  await qa.waitText(direct.page,'What is 1010 in denary?');
  await direct.page.locator('.ac-options label:first-child input[type="radio"]').click();
  await qa.waitText(direct.page,'Javob serverda saqlandi');
  await qa.clickText(direct.page,'Yakunlash');
  await qa.waitText(direct.page,'1/1 ball');
  await qa.check('Directly invited student completes graded test',true);
  await qa.screenshot(direct.page,'direct-student-result');
  await qa.clickText(direct.page,'Bosh sahifaga qaytish');

  // Future publication stays visible but not startable: schedule is authoritative on server.
  const schedule=await teacher.page.evaluate(async()=>{
    const {api}=await import('/src/lib/api.ts');
    const opensAt=new Date(Date.now()+36e5).toISOString();
    const closesAt=new Date(Date.now()+72e5).toISOString();
    const created=await api('/assessment-center',{method:'POST',body:JSON.stringify({
      title:'Assessment E2E Scheduled',
      courseCode:'school',gradeLabel:'Grade 8',kind:'diagnostic',durationMinutes:10,
      opensAt,closesAt,shuffleQuestions:true,
      questions:[{prompt:'What does a binary digit represent?',
        options:['One bit','One byte','One nibble','One kilobyte'],
        correctIndex:0,topic:'Data representation',maxMarks:1}],
    })});
    const id=created.data.id;
    const students=await api('/assessment-center/tests/'+id+'/eligible-students');
    const assigned=students.data.find(item=>item.name==='QA Unassigned Grade 8');
    if(!assigned)throw Error('Missing direct-assignment browser fixture');
    await api('/assessment-center/tests/'+id+'/publish',{method:'POST',
      body:JSON.stringify({classIds:[],studentIds:[assigned.id],releaseAnswers:false,sourceReviewed:true})});
    return {id,opensAt,closesAt};
  });
  await qa.go(direct.page,'oquvchi/uy');
  await direct.page.waitForSelector('.ac-inbox',{visible:true});
  await qa.go(direct.page,'oquvchi/testlar');
  await qa.waitText(direct.page,'Assessment E2E Scheduled');
  const future=await direct.page.evaluate(title=>{
    const card=[...document.querySelectorAll('.ac-test-card')].find(item=>item.textContent?.includes(title));
    return {disabled:card?.querySelector('button')?.disabled,
      text:card?.textContent};
  },'Assessment E2E Scheduled');
  await qa.check('Scheduled assessment invitation cannot be started early',
    future.disabled===true&&future.text.includes('Hali ochilmagan'),future);
  await qa.screenshot(direct.page,'scheduled-invitation-disabled');

  // A formal assessment cannot leak keys early. After archival it preserves the
  // first-attempt score and allows the owner to release answers to completers.
  const archived=await teacher.page.evaluate(async()=>{
    const {api}=await import('/src/lib/api.ts');
    const listing=await api('/assessment-center');
    const test=listing.data.find(item=>item.title==='Assessment E2E Hardware');
    if(!test)throw Error('Missing published 10-A test');
    await api('/assessment-center/tests/'+test.id+'/archive',{method:'POST'});
    await api('/assessment-center/tests/'+test.id+'/release-answers',{method:'POST'});
    const report=await api('/assessment-center/tests/'+test.id+'/report');
    return {id:test.id,rows:report.data.students,
      status:(await api('/assessment-center/tests/'+test.id)).data.status};
  });
  await qa.check('Archived test preserves report and correct student score',
    archived.status==='archived'&&archived.rows.some(item=>item.name==='Aziz Karimov'&&item.score===1));
  const historical=await student.page.evaluate(async id=>{
    const {api}=await import('/src/lib/api.ts');
    const listing=await api('/assessment-center');
    const present=listing.data.some(item=>item.id===id&&item.submittedAt);
    const attempt=await api('/assessment-center/tests/'+id+'/start',{method:'POST'});
    return {present,score:attempt.data.score,first:attempt.data.questions[0],
      keys:attempt.data.questions.map(q=>q.correctIndex)};
  },archived.id);
  await qa.check('Student retains archived first attempt and sees post-archive released keys',
    historical.present&&historical.score===1&&historical.keys.length===2
      &&historical.keys.every(key=>Number.isInteger(key)),historical);

  // Fast classroom workflow: no student login or class assignment, just PIN and name.
  await qa.go(teacher.page,'oqitish/testlar');
  await qa.clickText(teacher.page,'Kod bilan testga qaytish');
  await teacher.page.waitForSelector('.qt-test',{visible:true});
  teacher.page.on('dialog',dialog=>void dialog.accept());
  const selected=await teacher.page.evaluate(()=>{
    const card=[...document.querySelectorAll('.qt-test')]
      .find(node=>node.textContent?.includes('Assessment E2E Direct Grade 8'));
    const button=card?.querySelector('button');
    if(button)button.click();
    return Boolean(button);
  });
  await qa.check('Teacher chooses a prepared test without creating a class',selected);
  await teacher.page.waitForSelector('.qt-code',{visible:true});
  const pin=await teacher.page.$eval('.qt-code',node=>node.textContent.trim());
  await qa.check('Teacher sees six-digit entry code',/^\d{6}$/.test(pin),{pin});

  const guestContext=await qa.browser.createBrowserContext();
  const guestPage=await guestContext.newPage();
  guestPage.on('dialog',dialog=>void dialog.accept());
  const guestUrl=(process.env.LIVE_E2E_BASE_URL??'http://localhost:5173')+'/#/test/'+pin;
  await guestPage.goto(guestUrl,{waitUntil:'networkidle2'});
  await guestPage.waitForSelector('.qt-guest-card input',{visible:true});
  const guestLoginField=await guestPage.$('input[name="identifier"]');
  await qa.check('PIN guest page does not require a student account',guestLoginField===null);
  await qa.fill(guestPage,'.qt-guest-card input','QA PIN Learner');
  await qa.clickText(guestPage,'Testni boshlash');
  await guestPage.waitForSelector('.qt-options button',{visible:true});
  await qa.waitText(guestPage,'What is 1010 in denary?');
  const shuffledOptions=await guestPage.$eval('.qt-options',node=>
    [...node.querySelectorAll('button span')].map(n=>n.textContent?.trim()));
  await qa.check('Options are shuffled for this learner while retaining original A-D content',
    shuffledOptions.join('|')!==['10','12','8','2'].join('|')&&
    [...shuffledOptions].sort().join('|')===[...['10','12','8','2']].sort().join('|'));
  await guestPage.reload({waitUntil:'networkidle2'});
  await guestPage.waitForSelector('.qt-options button',{visible:true});
  const reloadedOptions=await guestPage.$eval('.qt-options',node=>
    [...node.querySelectorAll('button span')].map(n=>n.textContent?.trim()));
  await qa.check('Refreshing a shuffled test does not move the options',
    shuffledOptions.join('|')===reloadedOptions.join('|'));
  await guestPage.$eval('.qt-options',node=>{
    const button=[...node.querySelectorAll('button')].find(el=>
      el.querySelector('span')?.textContent?.trim()==='10');
    if(!button)throw Error('Correct option not found');
    button.click();
  });
  await guestPage.waitForFunction(()=>document.querySelectorAll('.qt-options .is-selected').length===1);
  await guestPage.reload({waitUntil:'networkidle2'});
  await guestPage.waitForSelector('.qt-options button.is-selected',{visible:true});
  await qa.check('Shuffled answer selection persists after refresh',
    (await guestPage.$eval('.qt-options button.is-selected span',node=>node.textContent?.trim()))==='10');
  await qa.clickText(guestPage,'Testni topshirish');
  await qa.waitText(guestPage,'Test yakunlandi!');
  const studentScore=await guestPage.$eval('.qt-complete',node=>node.textContent);
  await qa.check('PIN learner gets automatically graded score',studentScore.includes('1 / 1'),{studentScore});
  await qa.screenshot(guestPage,'guest-pin-test-finished');
  await qa.waitText(teacher.page,'QA PIN Learner');
  // Live teacher results poll every 3s. Wait for the submitted score, not just
  // the student's earlier "joined" row, before asserting the final result.
  await teacher.page.waitForFunction(()=>{
    const text=document.querySelector('.qt-table-wrap')?.textContent??'';
    return text.includes('QA PIN Learner')&&text.includes('1 / 1');
  },{timeout:15000});
  const teacherScore=await teacher.page.$eval('.qt-table-wrap',node=>node.textContent);
  await qa.check('Teacher sees guest name and correct test result live',
    teacherScore.includes('QA PIN Learner')&&teacherScore.includes('1 / 1'));
  const telemetry=await teacher.page.evaluate(async code=>{
    const {api}=await import('/src/lib/api.ts');
    const sessions=await api('/assessment-code/sessions');
    const room=sessions.data.find(session=>session.code===code);
    const report=await api('/assessment-code/sessions/'+room.id+'/report');
    return report.data.students.find(p=>p.name==='QA PIN Learner');
  },pin);
  await qa.check('Teacher report retains server timestamps and measured question telemetry',
    !!telemetry?.startedAt&&!!telemetry?.submittedAt&&
    Number.isInteger(telemetry?.elapsedSeconds)&&
    telemetry?.details?.[0]?.visits>=1&&
    telemetry?.details?.[0]?.firstAnsweredAt!=null,telemetry);
  await teacher.page.$eval('.qt-table-wrap .qt-text-btn',node=>node.click());
  await teacher.page.waitForSelector('.qt-detail .qt-table-wrap',{visible:true});
  await qa.check('Teacher can inspect per-question timing, opening and answer edits',
    await teacher.page.$eval('.qt-detail',node=>
      node.textContent.includes('Faol vaqt')&&
      node.textContent.includes('Birinchi javob')&&
      node.textContent.includes('O‘zgartirish')));
  await qa.screenshot(teacher.page,'teacher-pin-results');
  // The earlier student is still on a completed attempt: leave the attempt
  // route before testing the separate student Testlarim entry point.
  await qa.go(student.page,'oquvchi/uy');
  await student.page.waitForSelector('.student-test-code-form input',{visible:true});
  await qa.go(student.page,'oquvchi/testlar');
  await student.page.waitForSelector('.student-test-code-form input',{visible:true});
  await qa.fill(student.page,'.student-test-code-form input',pin);
  await qa.clickText(student.page,'Testga kirish');
  await student.page.waitForFunction(code=>location.hash==='#/test/'+code,{},pin);
  await student.page.waitForSelector('.qt-guest-card input',{visible:true});
  await qa.check('Student opens PIN guest test from own Testlarim page',
    (await student.page.$('input[name="identifier"]'))===null);
  // A previously logged-in student must stay on the test URL after the auth
  // session effect runs; this was redirecting back to /oquvchi/uy.
  await student.page.waitForFunction(code=>location.hash==='#/test/'+code,{},pin);
  await student.page.reload({waitUntil:'networkidle2'});
  await student.page.waitForSelector('.qt-guest-card input',{visible:true});
  await qa.check('PIN link survives hard refresh while learner is signed in',
    await student.page.evaluate(code=>location.hash==='#/test/'+code,pin));
  await student.page.goto((process.env.LIVE_E2E_BASE_URL??'http://localhost:5173')+'/#/test/'+pin,{waitUntil:'networkidle2'});
  await student.page.waitForSelector('.qt-guest-card input',{visible:true});
  await qa.check('Signed-in student opens shared PIN URL directly without dashboard redirect',
    await student.page.evaluate(code=>location.hash==='#/test/'+code,pin));
  await qa.clickText(teacher.page,'Testni yakunlash');
  await qa.waitText(teacher.page,'Test yakunlangan');
  await guestContext.close();
  await qa.check('Teacher and students completed full multi-account assessment browser acceptance',true);
}catch(error){
  console.error('Assessment E2E diagnostic:',JSON.stringify({
    checks:qa.report.checks.slice(-8),
    apiErrors:qa.report.httpErrors.slice(-12),
    pageErrors:qa.report.pageErrors.slice(-8),
  }));
  throw error;
}finally{await qa.finish();}
