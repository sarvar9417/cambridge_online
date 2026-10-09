export const STRUCTURED_ANSWER_PREFIX='CAMPATH_RESPONSE_V1:';

function strings(value:unknown,output:string[]){
  if(typeof value==='string'){if(value.trim())output.push(value.trim());return}
  if(Array.isArray(value)){value.forEach((item)=>strings(item,output));return}
  if(value&&typeof value==='object'){
    for(const [key,item] of Object.entries(value as Record<string,unknown>)){
      if(key==='id'||key==='version'||key==='x'||key==='y'||key==='x1'||key==='y1'||key==='x2'||key==='y2')continue;
      strings(item,output);
    }
  }
}

export function structuredAnswerPlainText(value:string){
  if(!value.startsWith(STRUCTURED_ANSWER_PREFIX))return value;
  try{
    const parsed=JSON.parse(value.slice(STRUCTURED_ANSWER_PREFIX.length));
    const output:string[]=[];
    strings(parsed,output);
    return output.join(' ');
  }catch{return value}
}

export function answerWordCount(value:string){
  const plain=structuredAnswerPlainText(value).trim();
  return plain?plain.split(/\s+/).length:0;
}
