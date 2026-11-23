import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveQuizReportView, liveQuizCsv } from './LiveQuizReportView';
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
    expect(host.querySelector('.lq-score-ring')?.getAttribute('aria-label')).toBe('33% accuracy');
    expect((host.querySelector('.lq-score-ring') as HTMLElement).style.getPropertyValue('--lq-accuracy')).toBe('33%');
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
    expect(host.textContent).not.toContain('Print complete answer key');
    const expand=[...host.querySelectorAll('button')].find(el=>el.textContent?.includes('Show all 3'))!;
    await act(async()=>expand.click());
    expect(host.textContent).toContain('First definition');
  });

  it('offers a teacher-only, print-ready complete answer key for unanswered questions',async()=>{
    const answerKey=report.students[0]!.details.map(detail=>({
      number:detail.number,prompt:detail.prompt,options:detail.options,
      correctIndex:detail.correctIndex,explanation:detail.explanation,
      sourceContext:detail.sourceContext,
    }));
    const withKey:LiveQuizReport={...report,answerKey};
    const print=vi.spyOn(window,'print').mockImplementation(()=>{});
    await act(async()=>root.render(<LiveQuizReportView report={withKey} teacher/>));
    expect(host.textContent).toContain('Print complete answer key');
    const sheet=document.body.querySelector('.lq-print-sheet');
    expect(sheet?.textContent).toContain('Question 3');
    expect(sheet?.textContent).toContain('Correct');
    expect(sheet?.textContent).toContain('L');
    const button=[...host.querySelectorAll('button')].find(el=>el.textContent?.includes('Print complete answer key'))!;
    await act(async()=>button.click());
    expect(print).toHaveBeenCalledTimes(1);
    await act(async()=>root.render(<LiveQuizReportView report={withKey} teacher={false}/>));
    expect(document.body.querySelector('.lq-print-sheet')).toBeNull();
    expect(host.textContent).not.toContain('Print complete answer key');
    print.mockRestore();
  });

  it('shows the correct answer and distinguishes repeated Treasure attempts in teacher question inspection',async()=>{
    const detailed:LiveQuizReport={...report,mode:'treasure',questionSummary:[{
      number:2,prompt:'Second definition',sourceContext:'Chapter 16',
      correct:0,wrong:1,skipped:0,total:1,
      wrongStudents:[{id:'student1',nickname:'Aziza',answer:'F',attemptNumber:3}],
    }]};
    await act(async()=>root.render(<LiveQuizReportView report={detailed} teacher/>));
    const breakdown=[...host.querySelectorAll('button')]
      .find(button=>button.textContent?.includes('Question breakdown'))!;
    await act(async()=>breakdown.click());
    expect(host.textContent).toContain('Counts are answer attempts, not unique students');
    const question=host.querySelector<HTMLButtonElement>('.lq-question-breakdown-list button')!;
    await act(async()=>question.click());
    expect(host.querySelector('.lq-question-inspector')?.textContent).toContain('Correct answer: G');
    expect(host.querySelector('.lq-question-inspector')?.textContent).toContain('Aziza · Attempt 3 — F');
  });

  it('accurately shows 0/0 for a player without any Treasure Quest attempts',async()=>{
    const treasure:LiveQuizReport={...report,mode:'treasure',students:[{
      id:'player2',nickname:'Sardor',avatar:'🐼',score:0,correct:0,answered:0,total:0,details:[],
    }]};
    await act(async()=>root.render(<LiveQuizReportView report={treasure} teacher={false}/>));
    expect(host.textContent).toContain('0 / 0');
    expect(host.textContent).toContain('No questions attempted during this game.');
    expect(host.textContent).toContain('Gold');
    expect(host.textContent).not.toContain('Excellent! All questions were answered correctly.');
  });

  it('keeps zero-attempt players in CSV and escapes participant-controlled formulas',()=>{
    const data:LiveQuizReport={...report,mode:'treasure',students:[...report.students,{
      id:'player2',nickname:'=HYPERLINK("malicious")',avatar:'🐼',score:0,correct:0,
      answered:0,total:0,details:[],
    }]};
    const csv=liveQuizCsv(data);
    expect(csv).toContain('"not attempted"');
    expect(csv).toContain('"\'=HYPERLINK(""malicious"")"');
    expect(csv).toContain('"Aziza"');
  });
});
