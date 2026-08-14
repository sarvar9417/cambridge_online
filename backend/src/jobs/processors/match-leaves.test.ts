import{describe,expect,it}from'vitest';import{matchLeafMarkSchemes}from'./match-leaves.js';
const root={path:'1',marks:null},a={path:'1.a',marks:2},b={path:'1.b',marks:1};
describe('leaf-only QP/MS matching',()=>{
 it('does not require a mark scheme for context parents',()=>{const result=matchLeafMarkSchemes({questions:[root,a],markSchemes:[{path:'1.a'}]})as any;expect(result.matchReport).toEqual({duplicateQuestionRefs:[],unmatchedQuestions:[],unmatchedSchemes:[]});expect(result.markSchemes).toEqual([{path:'1.a'}])});
 it('flags only missing mark-bearing leaves',()=>{const result=matchLeafMarkSchemes({questions:[root,a,b],markSchemes:[{path:'1.a'}]})as any;expect(result.matchReport.unmatchedQuestions).toEqual(['1.b'])});
 it('flags orphan mark schemes without dropping valid matches',()=>{const result=matchLeafMarkSchemes({questions:[root,a],markSchemes:[{path:'1.a'},{path:'9.a'}]})as any;expect(result.matchReport.unmatchedSchemes).toEqual(['9.a']);expect(result.markSchemes).toEqual([{path:'1.a'}])});
});
