import { createHash } from 'node:crypto';

/**
 * Stable, server-only per-attempt permutations. The randomly generated guest
 * token's SHA-256 hash is never sent to the learner or included in staff JSON.
 * Variant 0 preserves historical attempts unchanged.
 */
export function perStudentOrder<T>(
  items:readonly T[],playerTokenHash:string,version:number,namespace:string,id:(item:T)=>string,
):T[]{
  if(version!==1)return [...items];
  const rank=(key:string)=>createHash('sha256')
    .update(JSON.stringify([namespace,playerTokenHash,key])).digest('hex');
  return items.map((item,index)=>({item,index,key:id(item),hash:rank(id(item))}))
    .sort((a,b)=>a.hash.localeCompare(b.hash)||a.key.localeCompare(b.key)||a.index-b.index)
    .map(entry=>entry.item);
}

/** Returns the canonical option index for each visible A-D position. */
export function studentOptionOrder(
  questionId:string,playerTokenHash:string,version:number,optionCount:number,
):number[]{
  if(!Number.isInteger(optionCount)||optionCount<1||optionCount>20)
    throw Error('invalid option count');
  return perStudentOrder(Array.from({length:optionCount},(_,i)=>i),
    playerTokenHash,version,'option:'+questionId,index=>String(index));
}
export function canonicalChoice(visibleChoice:number,optionOrder:readonly number[]):number{
  if(!Number.isInteger(visibleChoice)||visibleChoice<0||visibleChoice>=optionOrder.length)
    throw Error('invalid option choice');
  return optionOrder[visibleChoice]!;
}
export function visibleChoice(canonicalIndex:number|null,optionOrder:readonly number[]):number|null{
  if(canonicalIndex===null)return null;
  const visible=optionOrder.indexOf(canonicalIndex);
  if(visible<0)throw Error('invalid saved canonical choice');
  return visible;
}
