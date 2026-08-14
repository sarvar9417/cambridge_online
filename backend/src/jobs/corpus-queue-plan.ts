import type{CorpusPreflightRow}from'./corpus-preflight.js';
export interface CorpusQueueItem{key:string;qpPaperId:string;msPaperId:string;reason:'incomplete_or_unreviewed'}
export interface CorpusQueuePlan{items:CorpusQueueItem[];skippedComplete:string[];blockedSources:string[]}
/** Pure planning only. Actual enqueueing must use the repository's durable JobQueue adapter. */
export function buildCorpusQueuePlan(rows:CorpusPreflightRow[]):CorpusQueuePlan{const items:CorpusQueueItem[]=[],skippedComplete:string[]=[],blockedSources:string[]=[];for(const row of rows){if(row.status==='COMPLETE'){skippedComplete.push(row.key);continue}if(row.status==='SOURCE_MISSING'||!row.msPaperId){blockedSources.push(row.key);continue}items.push({key:row.key,qpPaperId:row.qpPaperId,msPaperId:row.msPaperId,reason:'incomplete_or_unreviewed'})}return{items,skippedComplete,blockedSources}}
