import { describe, expect, it } from 'vitest';
import { liveExamReportCsv, renderLiveExamReportHtml, type LiveExamDetailedReport } from './live-exam-report-service.js';

const report:LiveExamDetailedReport={
  session:{id:'session',title:'Chapter 1 Live',className:'AS "Blue", Group',finishedAt:'2026-10-12T06:00:00.000Z',participantCount:2,questionCount:1},
  classAggregate:{totalEarned:3,totalPossible:4,averageEarnedPerStudent:1.5,averagePossiblePerStudent:2,averagePercentage:75},
  students:[
    {studentId:'s1',studentName:'Student, One',earned:2,possible:2,percentage:100},
    {studentId:'s2',studentName:'Student Two',earned:1,possible:2,percentage:50},
  ],
  questions:[
    {questionPosition:0,displayRef:'9618/11/M/J/25 Q1',learnerCount:2,earned:3,possible:4,averageScore:1.5,averagePercentage:75},
  ],
  topics:[{key:'t1',label:'1. Information representation',learnerCount:2,answerCount:2,earned:3,possible:4,percentage:75}],
  subtopics:[{key:'st1',label:'1.1 Data representation',learnerCount:2,answerCount:2,earned:3,possible:4,percentage:75}],
  mostMissedMarkPoints:[{questionPosition:0,displayRef:'9618/11/M/J/25 Q1',code:'M1',text:'State the required fact',marks:1,attempts:2,matched:1,missed:1,missRate:50}],
  reteachCandidates:[{subtopicCode:'1.1',subtopicTitle:'Data representation',percentage:75,earned:3,possible:4,learnerCount:2,answerCount:2,basis:'lowest_observed_mark_rate'}],
  rows:[
    {studentId:'s1',studentName:'Student, One',questionPosition:0,displayRef:'9618/11/M/J/25 Q1',marks:2,score:2,percentage:100,scoreSource:'teacher',teacherOverridden:false,feedback:'Good',topics:[{number:1,title:'Information representation'}],subtopics:[{code:'1.1',title:'Data representation'}]},
    {studentId:'s2',studentName:'Student Two',questionPosition:0,displayRef:'9618/11/M/J/25 Q1',marks:2,score:1,percentage:50,scoreSource:'peer',teacherOverridden:true,feedback:'Check\nagain',topics:[{number:1,title:'Information representation'}],subtopics:[{code:'1.1',title:'Data representation'}]},
  ],
};

describe('Live detailed report rendering',()=>{
  it('keeps class total and per-learner averages semantically distinct in PDF HTML',()=>{
    const html=renderLiveExamReportHtml(report,'School watermark');
    expect(html).toContain('Class total');
    expect(html).toContain('3 / 4');
    expect(html).toContain('Average per learner');
    expect(html).toContain('1.50 / 2.00');
    expect(html).toContain('Average percentage');
    expect(html).toContain('75%');
    expect(html).toContain('Most-missed mark points');
    expect(html).toContain('Reteach candidates');
    expect(html).toContain('lowest observed subtopic mark rates');
    expect(html).not.toContain('Student answer:');
  });

  it('exports one CSV row per learner/question with correct quoting',()=>{
    const csv=liveExamReportCsv(report);
    expect(csv.startsWith('\uFEFFStudent,Question,Score,Possible,Percent')).toBe(true);
    expect(csv).toContain('"Student, One"');
    expect(csv).toContain('9618/11/M/J/25 Q1');
    expect(csv).toContain('1.1 Data representation');
    expect(csv.split('\r\n')).toHaveLength(3);
  });
});
