import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveQuizReportView } from './LiveQuizReportView';
import type { LiveQuizReport } from './live-quiz-api';

const report:LiveQuizReport={id:'room',pin:'482915',courseCode:'9618',totalQuestions:3,
  finishedAt:'2026-11-20T10:00:00Z',students:[{
    id:'student1',nickname:'Aziza',avatar:'🦊',score:875,correct:1,answered:2,total:3,
    details:[
      {number:1,prompt:'First definition',options:['A','B','C','D'],choiceIndex:0,correctIndex:0,
        correct:true,points:875,explanation:'A is correct',sourceContext:'Chapter 15',status:'correct'},
      {number:2,prompt:'Second definition',options:['E','F','G','H'],choiceIndex:1,correctIndex:2,
        correct:false,points:0,explanation:'G is the answer',sourceContext:'Chapter 16',status:'wrong'},
      {number:3,prompt:'Third definition',options:['I','J','K','L'],choiceIndex:null,correctIndex:3,
        correct:false,points:0,explanation:'L is the answer',sourceContext:'Chapter 17',status:'skipped'},
    ],
  }]};

describe('Live Quiz first-attempt result report',()=>{
  let host:HTMLDivElement,root:Root;
  beforeEach(()=>{
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
    host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
  });
  afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});

  it('shows an individual the exact correct and attempted totals, wrong and skipped questions',async()=>{
    await act(async()=>root.render(<LiveQuizReportView report={report} teacher={false}/>));
    expect(host.textContent).toContain('1 / 3');
    expect(host.textContent).toContain('2 / 3');
    expect(host.textContent).toContain('33%');
    expect(host.textContent).toContain('Incorrect and unanswered questions (2)');
    expect(host.textContent).toContain('Second definition');
    expect(host.textContent).toContain('Student answer: F');
    expect(host.textContent).toContain('Correct answer: G');
    expect(host.textContent).toContain('Third definition');
    expect(host.textContent).toContain('Not answered');
    expect(host.textContent).toContain('Correct answer: L');
    expect(host.textContent).not.toContain('First definition');
    expect(host.textContent).not.toContain('Download detailed CSV');
  });

  it('allows the teacher to inspect all answers and export a report',async()=>{
    await act(async()=>root.render(<LiveQuizReportView report={report} teacher/>));
    expect(host.textContent).toContain('Aziza');
    expect(host.textContent).toContain('Download detailed CSV report');
    const expand=[...host.querySelectorAll('button')].find(el=>el.textContent?.includes('Show all 3'))!;
    await act(async()=>expand.click());
    expect(host.textContent).toContain('First definition');
  });
});
