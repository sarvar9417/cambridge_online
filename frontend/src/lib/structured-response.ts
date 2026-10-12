import type { StructuredQuestionContent } from './structured-question-content';

export type StructuredStrokePoint={x:number;y:number};
export type StructuredStroke={points:StructuredStrokePoint[]};
export type StructuredResponseV1={
  version:1;
  tables:Record<string,string>;
  matches:Record<string,string>;
  drawings:Record<string,StructuredStroke[]>;
  stack:{steps:string[][]}|null;
};

export const STRUCTURED_RESPONSE_PREFIX='[[campath-response-v1]]';

export function emptyStructuredResponse():StructuredResponseV1 {
  return {version:1,tables:{},matches:{},drawings:{},stack:null};
}

function recordOfStrings(value:unknown){
  if(!value||typeof value!=='object'||Array.isArray(value))return {};
  return Object.fromEntries(Object.entries(value).filter(([,item])=>typeof item==='string')) as Record<string,string>;
}

export function parseStructuredResponse(value:string|undefined|null):StructuredResponseV1 {
  if(!value?.startsWith(STRUCTURED_RESPONSE_PREFIX))return emptyStructuredResponse();
  try{
    const parsed=JSON.parse(value.slice(STRUCTURED_RESPONSE_PREFIX.length)) as Partial<StructuredResponseV1>;
    const drawings:Record<string,StructuredStroke[]>={};
    if(parsed.drawings&&typeof parsed.drawings==='object'&&!Array.isArray(parsed.drawings)){
      for(const [key,strokes] of Object.entries(parsed.drawings)){
        if(!Array.isArray(strokes))continue;
        const safe=strokes.flatMap((stroke)=>{
          if(!stroke||typeof stroke!=='object'||!Array.isArray((stroke as StructuredStroke).points))return[];
          const points=(stroke as StructuredStroke).points
            .filter((point)=>point&&Number.isFinite(point.x)&&Number.isFinite(point.y))
            .map((point)=>({x:Math.max(0,Math.min(1,point.x)),y:Math.max(0,Math.min(1,point.y))}));
          return points.length?[{points}]:[];
        });
        drawings[key]=safe;
      }
    }
    const stack=parsed.stack&&Array.isArray(parsed.stack.steps)
      ?{steps:parsed.stack.steps.map((step)=>Array.isArray(step)?step.map((item)=>String(item??'')):[])}
      :null;
    return {
      version:1,
      tables:recordOfStrings(parsed.tables),
      matches:recordOfStrings(parsed.matches),
      drawings,
      stack,
    };
  }catch{return emptyStructuredResponse()}
}

export function serializeStructuredResponse(value:StructuredResponseV1){
  return STRUCTURED_RESPONSE_PREFIX+JSON.stringify(value);
}

export function structuredResponseHasValue(value:StructuredResponseV1){
  return Object.values(value.tables).some((item)=>item.trim())
    ||Object.values(value.matches).some(Boolean)
    ||Object.values(value.drawings).some((strokes)=>strokes.some((stroke)=>stroke.points.length>1))
    ||Boolean(value.stack?.steps.some((step)=>step.some((item)=>item.trim())));
}

export function isStructuredResponseText(value:string|undefined|null){
  return Boolean(value?.startsWith(STRUCTURED_RESPONSE_PREFIX));
}

export function structuredResponseSummary(value:string|undefined|null){
  if(!isStructuredResponseText(value))return value??'';
  const response=parseStructuredResponse(value);
  const lines:string[]=[];
  const tableEntries=Object.entries(response.tables).filter(([,answer])=>answer.trim());
  if(tableEntries.length){
    lines.push('Jadval javoblari:');
    for(const [key,answer] of tableEntries)lines.push(`• ${key.replace(/^table:/,'')}: ${answer}`);
  }
  const matches=Object.entries(response.matches).filter(([,answer])=>answer);
  if(matches.length){
    lines.push('Moslashtirish:');
    for(const [key,answer] of matches)lines.push(`• ${key.replace(/^match:/,'')} → ${answer}`);
  }
  if(Object.values(response.drawings).some((strokes)=>strokes.length))lines.push('• Diagrammaga chizma/annotatsiya kiritilgan.');
  if(response.stack?.steps.length){
    lines.push('Stack holatlari:');
    response.stack.steps.forEach((step,index)=>lines.push(`• ${index+1}-qadam: ${step.filter(Boolean).join(' | ')||'—'}`));
  }
  return lines.join('\n')||'Structured javob bo‘sh.';
}

export function structuredResponseMode(content:StructuredQuestionContent|undefined|null,answerKind?:string,stem?:string){
  if(!content)return 'text' as const;
  if(content.blocks.some((block)=>block.type==='table'&&block.editableCells.length))return 'table' as const;
  if(content.blocks.some((block)=>block.type==='matching'))return 'matching' as const;
  if(content.blocks.some((block)=>block.type==='answer_area'&&block.kind==='drawing'))return 'drawing' as const;
  const normalized=(stem??'').toLowerCase();
  if(/show (?:the )?changing contents of (?:the |this )?stack|complete (?:the )?(?:following )?stack|state of (?:the |this )?stack/.test(normalized))return 'stack' as const;
  if(answerKind==='diagram')return 'drawing' as const;
  return 'text' as const;
}
