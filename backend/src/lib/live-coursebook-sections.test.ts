import { describe, expect, it } from 'vitest';
import {
  LIVE_COURSEBOOK_SECTIONS,
  liveCoursebookQuestionFilter,
  resolveLiveCoursebookSections,
} from './live-coursebook-sections.js';

describe('9618 Live coursebook section bridge',()=>{
  it('preserves the three Hodder Chapter 16 sections',()=>{
    const chapter16=LIVE_COURSEBOOK_SECTIONS.filter((section)=>section.chapterNumber===16);
    expect(chapter16.map((section)=>[section.code,section.title])).toEqual([
      ['16.1','Purposes of an operating system (OS)'],
      ['16.2','Virtual machines (VMs)'],
      ['16.3','Translation software'],
    ]);
  });

  it('bridges textbook Chapter 16.2 to the official virtual-machine learning objectives in syllabus 15.1',()=>{
    const section=resolveLiveCoursebookSections(['16.2'])[0]!;
    expect(section).toMatchObject({
      sourceTopicNumber:15,
      sourceSubtopicCode:'15.1',
      includeLoTextAny:['virtual machine'],
      mappingKind:'learning_objective_bridge',
    });
    const values:unknown[]=[];
    const sql=liveCoursebookQuestionFilter(values,['16.2']);
    expect(values).toEqual([15,'15.1','%virtual machine%']);
    expect(sql).toContain('question_learning_objectives coursebook_qlo');
    expect(sql).toContain('coursebook_lo.text ilike $3');
  });

  it('bridges textbook Chapter 16.3 to official syllabus 16.2 without corrupting syllabus codes',()=>{
    const section=resolveLiveCoursebookSections(['16.3'])[0]!;
    expect(section).toMatchObject({
      sourceTopicNumber:16,
      sourceSubtopicCode:'16.2',
      mappingKind:'direct_subtopic',
    });
    const values:unknown[]=[];
    const sql=liveCoursebookQuestionFilter(values,['16.3']);
    expect(values).toEqual([16,'16.2']);
    expect(sql).toContain('question_subtopics coursebook_qst');
    expect(sql).not.toContain('coursebook_lo.text');
  });

  it('preserves source-backed splits for Chapters 2, 7, 17 and 18',()=>{
    expect(LIVE_COURSEBOOK_SECTIONS.filter((section)=>section.chapterNumber===2).map((section)=>section.code))
      .toEqual(['2.1','2.2']);
    expect(LIVE_COURSEBOOK_SECTIONS.filter((section)=>section.chapterNumber===7).map((section)=>section.code))
      .toEqual(['7.1','7.2','7.3']);
    expect(LIVE_COURSEBOOK_SECTIONS.filter((section)=>section.chapterNumber===17).map((section)=>section.code))
      .toEqual(['17.1','17.2','17.3','17.4']);
    expect(LIVE_COURSEBOOK_SECTIONS.filter((section)=>section.chapterNumber===18).map((section)=>section.code))
      .toEqual(['18.1','18.2']);
  });

  it('keeps virtual-machine questions out of textbook Chapter 15.1',()=>{
    const section=resolveLiveCoursebookSections(['15.1'])[0]!;
    expect(section.excludeLoTextAny).toEqual(['virtual machine']);
    const values:unknown[]=[];
    const sql=liveCoursebookQuestionFilter(values,['15.1']);
    expect(values).toEqual([15,'15.1','%virtual machine%']);
    expect(sql).toContain('not exists(');
    expect(sql).toContain('coursebook_lo.text ilike $3');
  });
});
