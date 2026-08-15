import{describe,expect,it,vi}from'vitest';import type{Pool}from'pg';import{PgQuestionsRepository}from'./questions-repository.js';
const actor={id:'teacher-1',role:'teacher'as const,schoolId:'school-1',fullName:'Teacher One'};
const asset={id:'asset-1',kind:'diagram',storagePath:'supabase://question-assets/papers/p1/q1/a.png',contentMd:null,altText:'Network diagram',sortOrder:0,sourcePage:3};
const rows=[
 {id:'root-1',parent_id:null,label:'1',path:'1',display_ref:'9618/11/M/J/25 Q1',depth:0,marks:null,command_word:null,answer_kind:'text',answer_lines:null,stem:'',context:'Study the network diagram.',assets:[asset]},
 {id:'leaf-1',parent_id:'root-1',label:'a',path:'1.a',display_ref:'9618/11/M/J/25 Q1(a)',depth:1,marks:2,command_word:'Explain',answer_kind:'text',answer_lines:2,stem:'Explain one advantage.',context:null,assets:[]},
];
function pool(){const query=vi.fn(async(sql:string)=>sql.startsWith('with recursive chain')?{rowCount:rows.length,rows}:sql.startsWith('select qd.id')?{rowCount:0,rows:[]}:(()=>{throw new Error(`unexpected ${sql}`)})());return{value:{query}as unknown as Pool,query}}
describe('portable private assets',()=>{
 it('adds a five-minute signed browser URL after teacher visibility has been checked',async()=>{const p=pool(),signStoragePath=vi.fn().mockResolvedValue('https://project.supabase.co/storage/v1/object/sign/question-assets/papers/p1/q1/a.png?token=temp'),repo=new PgQuestionsRepository(p.value,{signStoragePath});const portable=await repo.portable(actor,'leaf-1');expect(portable?.contextBlocks[0]?.assets[0]).toEqual({...asset,url:'https://project.supabase.co/storage/v1/object/sign/question-assets/papers/p1/q1/a.png?token=temp'});expect(signStoragePath).toHaveBeenCalledWith(asset.storagePath,300)});
 it('preserves internal provenance and returns url:null when no signer is configured',async()=>{const p=pool(),repo=new PgQuestionsRepository(p.value);const portable=await repo.portable(actor,'leaf-1');expect(portable?.contextBlocks[0]?.assets[0]).toEqual({...asset,url:null})});
 it('does not sign anything when a student asks for portable teacher material',async()=>{const p=pool(),signStoragePath=vi.fn(),repo=new PgQuestionsRepository(p.value,{signStoragePath});await expect(repo.portable({id:'student-1',role:'student',schoolId:'school-1',fullName:'Student One'},'leaf-1')).resolves.toBeNull();expect(signStoragePath).not.toHaveBeenCalled();expect(p.query).not.toHaveBeenCalled()});
});
