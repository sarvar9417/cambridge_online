import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, type User } from '../lib/api';
import { AssessmentCenter } from './AssessmentCenter';

vi.mock('../lib/api',()=>({api:vi.fn()}));
const mockApi=vi.mocked(api);
const teacher={id:'teacher',role:'teacher',schoolId:'school',fullName:'Teacher'} as User;
const student={id:'student',role:'student',schoolId:'school',fullName:'Student'} as User;
const testId='c11a8f45-9446-4d56-a35b-dd98962af401';
const attemptId='b108e324-388a-4e64-956c-dfc4213b1ea2';
const questionId='b108e324-388a-4e64-956c-dfc4213b1e98';
const question={id:questionId,position:1,prompt:'What does CPU stand for?',
  options:['Central Processing Unit','Computer Pixel Unit','Cyber Processing Usage','Central Power Utility'],
  topic:'Computer architecture',maxMarks:1,choiceIndex:null};
describe('Assessment Center teacher/student experience',()=>{
  let root:Root,container:HTMLDivElement;
  beforeEach(()=>{
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
    container=document.createElement('div');document.body.appendChild(container);
    root=createRoot(container);mockApi.mockReset();
  });
  afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();vi.restoreAllMocks();});
  const click=async(text:string)=>{
    const button=[...container.querySelectorAll<HTMLButtonElement>('button')].find(x=>x.textContent?.includes(text));
    if(!button)throw Error('Button not found: '+text);
    await act(async()=>{button.click();await Promise.resolve();await Promise.resolve();});
  };
  it('adds a dedicated staff test creation editor but keeps all tests in draft by default',async()=>{
    mockApi.mockResolvedValue({data:[]});
    await act(async()=>{root.render(<AssessmentCenter user={teacher} classes={[]}/>);await Promise.resolve();});
    expect(container.textContent).toContain('Test & Assessment Center');
    await click('Test yaratish');
    expect(container.querySelector('.ac-editor-q')).not.toBeNull();
    expect(container.textContent).toContain('1 ta javob kaliti hali berilmagan');
    expect(mockApi.mock.calls.some(([path,options])=>path==='/assessment-center'&&options?.method==='POST')).toBe(false);
  });
  it('students see only their teacher-assigned test and save choices to the API',async()=>{
    const deadlineAt=new Date(Date.now()+20*60_000).toISOString();
    const start={data:{id:attemptId,testId,title:'Processor test',kind:'diagnostic',
      deadlineAt,serverNow:new Date().toISOString(),submittedAt:null,score:null,maxScore:null,
      questions:[question]}};
    mockApi.mockImplementation((async(path,options)=>{
      if(path==='/assessment-center'&&!options)return {data:[{id:testId,title:'Processor test',
        courseCode:'school',gradeLabel:'Grade 9',kind:'diagnostic',durationMinutes:20,
        questionCount:1,attemptId:null,submittedAt:null,score:null,maxScore:null,releaseAnswers:false}]};
      if(path==='/assessment-center/tests/'+testId+'/start')return start;
      if(path==='/assessment-center/attempts/'+attemptId+'/answers/'+questionId)
        return {data:{saved:true}};
      if(path==='/assessment-center/attempts/'+attemptId+'/submit')
        return {data:{...start.data,submittedAt:new Date().toISOString(),
          score:1,maxScore:1,questions:[{...question,choiceIndex:0}]}};
      throw Error('Unexpected '+path+' '+String(options?.method));
    }) as typeof api);
    await act(async()=>{root.render(<AssessmentCenter user={student} classes={[]}/>);await Promise.resolve();});
    expect(container.textContent).toContain('Processor test');
    expect(container.textContent).not.toContain('To‘g‘ri:');
    await click('Testni boshlash');
    expect(container.textContent).toContain('What does CPU stand for?');
    const radio=container.querySelector<HTMLInputElement>('input[type=radio]')!;
    await act(async()=>{radio.click();await Promise.resolve();await Promise.resolve();});
    expect(mockApi).toHaveBeenCalledWith('/assessment-center/attempts/'+attemptId+'/answers/'+questionId,
      expect.objectContaining({method:'PUT'}));
    expect(container.textContent).toContain('Javob serverda saqlandi');
    const confirm=vi.spyOn(window,'confirm').mockReturnValue(true);
    await click('Yakunlash');
    expect(mockApi).toHaveBeenCalledWith('/assessment-center/attempts/'+attemptId+'/submit',
      {method:'POST'});
    expect(container.textContent).toContain('1/1 ball');
    confirm.mockRestore();
  });
});
