import {describe,it,expect} from 'vitest';
import {assessmentCsvCell} from './assessment-csv';

describe('assessment CSV spreadsheet protection',()=>{
  it('neutralizes formula prefixes even with leading whitespace',()=>{
    for(const source of ['=HYPERLINK("https://bad")','+SUM(1,2)','-3+4','@payload','  =2+2']){
      expect(assessmentCsvCell(source)).toMatch(/^"'/);
    }
  });
  it('quotes columns and removes newlines or control characters',()=>{
    expect(assessmentCsvCell('Student "A", Grade 9')).toBe('"Student ""A"", Grade 9"');
    expect(assessmentCsvCell('Jane\r\nSmith')).toBe('"Jane  Smith"');
    expect(assessmentCsvCell(null)).toBe('""');
  });
});
