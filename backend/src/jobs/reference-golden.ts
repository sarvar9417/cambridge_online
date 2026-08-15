export interface ReferenceIdentity{year:number;series:string;componentNumber:number;variant:number}
export interface ReferenceGoldenLeaf{path:string;marks:number}
export interface ReferenceGolden{key:string;identity:ReferenceIdentity;totalMarks:number;leaves:ReferenceGoldenLeaf[]}
export interface ReferenceGoldenReport{key:string|null;available:boolean;pass:boolean|null;expectedLeafCount:number|null;actualLeafCount:number;expectedTotalMarks:number|null;actualTotalMarks:number;missingPaths:string[];extraPaths:string[];markMismatches:Array<{path:string;expected:number;actual:number}>;missingMarkSchemes:string[];extraMarkSchemes:string[]}

const GOLDENS:ReferenceGolden[]=[{
 key:'9618-s25-11',identity:{year:2025,series:'M/J',componentNumber:1,variant:1},totalMarks:75,
 leaves:[
  ['1.a',2],['1.b',2],['2.a',4],['2.b.i',4],['2.b.ii',3],['2.c',2],
  ['3.a',3],['3.b.i',2],['3.b.ii',1],['3.b.iii',1],['4.a',4],['4.b',2],
  ['5.a',3],['5.b',1],['5.c',2],['5.d',3],['5.e',4],['6.a.i',4],['6.a.ii',3],['6.a.iii',2],['6.b',5],
  ['7.a',3],['7.b',5],['7.c',3],['8.a',4],['8.b.i',1],['8.b.ii',1],['8.b.iii',1],
 ].map(([path,marks])=>({path:String(path),marks:Number(marks)})),
}];

export function assessReferenceGolden(identity:ReferenceIdentity,artifact:Record<string,unknown>):ReferenceGoldenReport{
 const golden=GOLDENS.find(item=>sameIdentity(item.identity,identity));
 const questions=Array.isArray(artifact.questions)?artifact.questions as Array<Record<string,unknown>>:[];
 const schemes=Array.isArray(artifact.markSchemes)?artifact.markSchemes as Array<Record<string,unknown>>:[];
 const actualLeaves=questions.flatMap(item=>{
  if(item.marks===null||item.marks===undefined)return[];
  const path=typeof item.path==='string'?item.path:null,marks=Number(item.marks);
  return path&&Number.isFinite(marks)?[{path,marks}]:[];
 });
 const actualMap=new Map(actualLeaves.map(item=>[item.path,item.marks] as const));
 const schemePaths=new Set(schemes.flatMap(item=>typeof item.path==='string'?[item.path]:[]));
 const actualTotalMarks=actualLeaves.reduce((sum,item)=>sum+item.marks,0);
 if(!golden)return{key:null,available:false,pass:null,expectedLeafCount:null,actualLeafCount:actualLeaves.length,expectedTotalMarks:null,actualTotalMarks,missingPaths:[],extraPaths:[],markMismatches:[],missingMarkSchemes:[],extraMarkSchemes:[]};
 const expectedMap=new Map(golden.leaves.map(item=>[item.path,item.marks] as const));
 const missingPaths=golden.leaves.filter(item=>!actualMap.has(item.path)).map(item=>item.path);
 const extraPaths=actualLeaves.filter(item=>!expectedMap.has(item.path)).map(item=>item.path).sort(pathSort);
 const markMismatches=golden.leaves.flatMap(item=>{const actual=actualMap.get(item.path);return actual===undefined||actual===item.marks?[]:[{path:item.path,expected:item.marks,actual}]} );
 const missingMarkSchemes=golden.leaves.filter(item=>!schemePaths.has(item.path)).map(item=>item.path);
 const extraMarkSchemes=[...schemePaths].filter(path=>!expectedMap.has(path)).sort(pathSort);
 const pass=missingPaths.length===0&&extraPaths.length===0&&markMismatches.length===0&&missingMarkSchemes.length===0&&extraMarkSchemes.length===0&&actualLeaves.length===golden.leaves.length&&actualTotalMarks===golden.totalMarks;
 return{key:golden.key,available:true,pass,expectedLeafCount:golden.leaves.length,actualLeafCount:actualLeaves.length,expectedTotalMarks:golden.totalMarks,actualTotalMarks,missingPaths,extraPaths,markMismatches,missingMarkSchemes,extraMarkSchemes};
}

function sameIdentity(a:ReferenceIdentity,b:ReferenceIdentity){return a.year===b.year&&normalizeSeries(a.series)===normalizeSeries(b.series)&&a.componentNumber===b.componentNumber&&a.variant===b.variant}
function normalizeSeries(value:string){const v=value.trim().toUpperCase().replace(/\s+/g,'');if(['M/J','MJ','MAY/JUNE','MAYJUNE'].includes(v))return'M/J';if(['O/N','ON','OCT/NOV','OCTNOV','OCTOBER/NOVEMBER'].includes(v))return'O/N';return v}
function pathSort(a:string,b:string){return a.localeCompare(b,undefined,{numeric:true})}
