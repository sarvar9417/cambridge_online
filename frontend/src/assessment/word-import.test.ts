import {describe,it,expect} from 'vitest';
import {extractWordMcqs,detectWordAssessmentMetadata,verifyWordSourceGrade} from './word-import';
const wrap=(body:string)=>'<?xml version="1.0" encoding="UTF-8"?>'+
  '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+
  body+'</w:body></w:document>';
const p=(text:string)=>'<w:p><w:r><w:t>'+text+'</w:t></w:r></w:p>';
describe('Conservative Word MCQ draft extraction',()=>{
  it('detects grade and syllabus from filename without defaulting to Grade 9',()=>{
    expect(detectWordAssessmentMetadata('Grade 8.docx')).toMatchObject({
      gradeLabel:'Grade 8',courseCode:'school'});
    expect(detectWordAssessmentMetadata('9618_Paper3_Demo.docx')).toMatchObject({
      courseCode:'9618',gradeLabel:'Paper 3'});
  });
  it('refuses an explicit Grade 7 / Stage 9 mismatch in a Word source',()=>{
    expect(()=>verifyWordSourceGrade('Grade 7.docx',['COMPUTING','Stage 9 | Computing']))
      .toThrow('Stage 9');
  });
  it('extracts complete A–D options but never invents an answer key',()=>{
    const qs=extractWordMcqs(wrap([
      p('1. What is binary?'),p('A. Base two'),p('B. Base ten'),p('C. Base sixteen'),
      p('D. Base eight'),p('2. What is RAM?'),p('A. ROM'),p('B. Primary memory'),
      p('C. CPU'),p('D. A keyboard'),p('Answer Key'),p('1. A 2. B'),
    ].join('')));
    expect(qs).toHaveLength(2);
    expect(qs[0]).toMatchObject({sourceNumber:1,correctIndex:null,prompt:'What is binary?',
      options:['Base two','Base ten','Base sixteen','Base eight']});
    expect(qs[1]?.correctIndex).toBeNull();
  });
  it('rejects drawings rather than hiding question evidence',()=>{
    expect(()=>extractWordMcqs(wrap(p('1. Graphic question')+
      '<w:p><w:r><w:drawing/></w:r></w:p>'))).toThrow('diagramma');
  });
  it('rejects incomplete or ambiguous A-D answer sets',()=>{
    expect(()=>extractWordMcqs(wrap(p('1. Question')+p('A. First option')+p('B. Second option'))))
      .toThrow('variantlari');
  });
});
