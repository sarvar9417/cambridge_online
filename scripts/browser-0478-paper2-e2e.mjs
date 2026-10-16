// Integration acceptance against an isolated, synthetic 0478 Paper 2 fixture.
// Never run this against production; the fixture exists only in Live E2E seed.
import process from 'node:process';
import { createBrowserQA } from './browser-qa.mjs';
import { createRound, finishRound, snapshot } from './browser-live-qa.mjs';

for(const key of ['SEED_OWNER_USERNAME','SEED_OWNER_PASSWORD','SEED_STUDENT_PASSWORD','CHROME_EXECUTABLE_PATH']){
  if(!process.env[key])throw new Error(`Missing 0478 browser E2E setting: ${key}`);
}
const qa=await createBrowserQA({
  baseUrl:process.env.LIVE_E2E_BASE_URL??'http://localhost:5173',
  executablePath:process.env.CHROME_EXECUTABLE_PATH,
  outputDir:process.env.LIVE_E2E_OUTPUT_DIR??'output/live-browser-e2e',
});
const ref='0478/22/M/J/26 QA Q1(a)';
try{
  const teacher=await qa.login(process.env.SEED_OWNER_USERNAME,process.env.SEED_OWNER_PASSWORD,'0478 teacher');
  const student=await qa.login('student01',process.env.SEED_STUDENT_PASSWORD,'0478 student');
  const classes=await teacher.page.evaluate(async()=>{
    const {api}=await import('/src/lib/api.ts');
    return api('/classes');
  });
  const classId=classes.data.find(item=>item.name==='10-A CS')?.id;
  await qa.check('0478: existing 9618 test class can host formative Paper 2',Boolean(classId));

  const publicTopics=await student.page.evaluate(async()=>{
    const {api}=await import('/src/lib/api.ts');
    return api('/live-exams/sections');
  });
  await qa.check('0478: student gets only public Paper 2 syllabus taxonomy',
    publicTopics.topics.some(item=>item.syllabus_code==='0478'&&item.code==='8.1'
      &&item.topic_number===8&&item.component===2)
    && publicTopics.topics.every(item=>item.syllabus_code==='0478'&&item.component===2));
  await qa.check('0478: Hodder Chapter 7–10 includes 16 authentic Paper 2 book sections',
    publicTopics.igcseBookSections.length===16
    && new Set(publicTopics.igcseBookSections.map(item=>item.chapter_number)).size===4
    && publicTopics.igcseBookSections.find(item=>item.section_code==='7.7')
      ?.section_title==='Trace tables to document dry runs of algorithms'
    && publicTopics.igcseBookSections.find(item=>item.section_code==='10.3')
      ?.section_title.startsWith('Logic circuits, logic expressions'));



  // Screenshot regression: a bare fieldset used to fall into the 42px
  // progress-number track, squeezing every topic/checkbox into a column.
  // Validate actual browser geometry across shell and mobile widths.
  await qa.go(teacher.page,'oqitish/live');
  await teacher.page.waitForSelector('select[aria-label="Cambridge syllabus"]');
  await teacher.page.select('select[aria-label="Cambridge syllabus"]','0478');
  await teacher.page.waitForSelector('.live-topic-grid[data-syllabus="0478"] fieldset:nth-child(2) label');
  for(const width of [1440,1024,768,390]){
    await teacher.page.setViewport({width,height:920});
    const geometry=await teacher.page.evaluate(()=>{
      const main=document.querySelector('.live-create-main');
      const fields=document.querySelector('.live-create-fields');
      const topics=document.querySelector('.live-topic-grid[data-syllabus="0478"]');
      const items=[...topics.querySelectorAll('fieldset:nth-child(2) label')];
      const rect=element=>element.getBoundingClientRect();
      const m=rect(main),f=rect(fields),t=rect(topics);
      const labels=[...fields.querySelectorAll(':scope > label')].map(rect);
      return {
        viewport:window.innerWidth,mainWidth:m.width,topicsWidth:t.width,fieldsWidth:f.width,
        topicCount:items.length,chapterCount:topics.querySelectorAll('fieldset:first-child label').length,documentWidth:document.documentElement.scrollWidth,
        topicInMain:t.left>=m.left-2&&t.right<=m.right+2,
        fieldsInMain:f.left>=m.left-2&&f.right<=m.right+2,
        optionsWellSized:items.every(item=>rect(item).width>=190),
        fieldsWellSized:labels.every(item=>item.width>=190),
        optionsInPanel:items.every(item=>{const r=rect(item);return r.left>=t.left-2&&r.right<=t.right+2}),
      };
    });
    await qa.check(`0478 layout: topic grid readable at ${width}px`,
      geometry.topicCount>=16 && geometry.chapterCount===4
      && geometry.topicsWidth>=Math.min(250,geometry.mainWidth*0.7)
      && geometry.topicInMain&&geometry.fieldsInMain
      && geometry.optionsWellSized&&geometry.fieldsWellSized
      && geometry.optionsInPanel
      && geometry.documentWidth<=geometry.viewport+3,
      geometry);
    if(width===1440||width===390)await qa.screenshot(teacher.page,`0478-builder-${width}`);
  }
  await teacher.page.setViewport({width:1440,height:1000});

  const eligibility=await teacher.page.evaluate(async classId=>{
    const {api}=await import('/src/lib/api.ts');
    const params=new URLSearchParams({
      classId,syllabusCode:'0478',topicIds:'',subtopicIds:'',
      coursebookSectionCodes:'',igcseBookSectionCodes:'8.1',components:'2',includeDiagrams:'true',
      excludeSeen:'false',limit:'15',
    });
    return api(`/live-exams/eligible-questions?${params}`);
  },classId);
  await qa.check('0478: full-schema readiness includes source-scoped Paper 2 fixture',
    eligibility.data.some(item=>item.displayRef===ref&&item.component===2)
      &&eligibility.data.every(item=>item.component===2),eligibility);

  const id=await createRound(qa,teacher,[student],{
    classId,mode:'teacher',title:`0478 Paper 2 browser QA ${Date.now()}`,
    syllabusCode:'0478',igcseBookSectionCode:'8.1',displayRef:ref,excludeSeen:false,questionCount:1,
  });
  const marking=await snapshot(teacher.page,id);
  await qa.check('0478: live question source and manual-only mark scheme frozen',
    marking.question?.portable?.leaf?.displayRef===ref
      && marking.markScheme?.schemeType==='manual_only'
      && marking.markScheme.maxMarks===2
      && marking.markScheme.points.length===0,
    {displayRef:marking.question?.portable?.leaf?.displayRef,scheme:marking.markScheme?.schemeType});
  await qa.waitText(student.page,'OFFICIAL MARK SCHEME');

  const final=await finishRound(qa,teacher,[student],id,'teacher');
  await qa.check('0478: teacher-assessed marks released on completion',
    final.session.status==='finished'
      && final.report.rows.length===1
      && final.report.rows[0]?.marks===2
      && final.report.rows[0]?.score===2,
    {status:final.session.status,rows:final.report.rows});
  // Verify a different 9618 coursebook session cannot reuse our IGCSE fixture.
  const wrong=await teacher.page.evaluate(async ({classId,questionId})=>{
    const {api}=await import('/src/lib/api.ts');
    try{
      await api('/live-exams/selection-preview',{method:'POST',body:JSON.stringify({
        classId,syllabusCode:'9618',topicIds:[],subtopicIds:[],
        coursebookSectionCodes:['1.1'],includeDiagrams:true,excludeSeen:false,
        questionIds:[questionId],questionOrder:'fixed',
      })});
      return 'accepted';
    }catch(error){return error.code??'error';}
  },{classId,questionId:eligibility.data.find(item=>item.displayRef===ref)?.id});
  await qa.check('0478: manual injection into 9618 Chapter 1 is rejected',wrong!=='accepted',{wrong});

  const pageErrors=qa.report.pageErrors??[];
  await qa.check('0478: browser error-free',pageErrors.length===0,{pageErrors});
}finally{
  await qa.finish();
}
