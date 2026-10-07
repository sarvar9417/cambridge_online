import type { StructuredQuestionBlock, StructuredQuestionContent } from './structured-question-content';

export type StructuredQuestionIntegrityCode =
  | 'flattened_table_in_text'
  | 'duplicate_table_text';

export type StructuredQuestionIntegrityFinding = {
  code: StructuredQuestionIntegrityCode;
  severity: 'error';
  blockIndex: number;
  message: string;
};

const FLATTENED_TABLE_HEADERS = [
  /\bstatement\s+number\s+statement\b/i,
  /\bregister\s+(?:purpose|description|function)\b/i,
  /\bfield\s+value\b/i,
  /\binput\s+output\b/i,
  /\baddress\s+(?:content|contents|value)\b/i,
  /\binstruction\s+(?:opcode|operand|meaning)\b/i,
];

function normalized(value:string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}

function sequentialNumberEvidence(value:string) {
  const numbers=[...value.matchAll(/(?:^|\s)(\d{1,2})(?=\s|[.)\]:,-]|$)/g)]
    .map((match)=>Number(match[1]))
    .filter((number)=>Number.isInteger(number)&&number>=1&&number<=20);
  const unique=[...new Set(numbers)];
  if(unique.length<3)return false;
  for(let start=0;start<unique.length-2;start++){
    let run=1;
    for(let index=start+1;index<unique.length;index++){
      if(unique[index]===unique[index-1]!+1)run+=1;
      else if(unique[index]!==unique[index-1])break;
      if(run>=3)return true;
    }
  }
  return false;
}

function looksLikeFlattenedTable(value:string) {
  if(value.length<80)return false;
  if(!FLATTENED_TABLE_HEADERS.some((pattern)=>pattern.test(value)))return false;
  return sequentialNumberEvidence(value);
}

function tableDuplicatedInsideText(text:string,table:Extract<StructuredQuestionBlock,{type:'table'}>) {
  const haystack=` ${normalized(text)} `;
  const headers=table.headers.map(normalized).filter((value)=>value.length>=2);
  if(headers.length<2||!headers.every((header)=>haystack.includes(` ${header} `)))return false;

  const evidence=table.rows
    .flatMap((row)=>row)
    .filter((cell):cell is string=>typeof cell==='string')
    .map(normalized)
    .filter((value)=>value.length>=3)
    .slice(0,8);
  return evidence.filter((value)=>haystack.includes(` ${value} `)).length>=2;
}

/**
 * High-confidence presentation-integrity checks for source-backed question ASTs.
 *
 * These checks deliberately fail closed only for structures that are extremely
 * unlikely to be intentional prose. Ambiguous content remains renderable and
 * should be handled by the source-fidelity audit rather than guessed in-browser.
 */
export function inspectStructuredQuestionIntegrity(content:StructuredQuestionContent) {
  const findings:StructuredQuestionIntegrityFinding[]=[];
  const tables=content.blocks.filter((block):block is Extract<StructuredQuestionBlock,{type:'table'}>=>block.type==='table');

  content.blocks.forEach((block,blockIndex)=>{
    if(block.type!=='text')return;
    if(looksLikeFlattenedTable(block.text)){
      findings.push({
        code:'flattened_table_in_text',
        severity:'error',
        blockIndex,
        message:'Source table content appears to have been flattened into prose.',
      });
    }
    if(tables.some((table)=>tableDuplicatedInsideText(block.text,table))){
      findings.push({
        code:'duplicate_table_text',
        severity:'error',
        blockIndex,
        message:'A source table appears both as prose and as structured table content.',
      });
    }
  });

  return findings;
}
