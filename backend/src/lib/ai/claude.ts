import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';

const PROMPTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../prompts');
export const DEFAULT_INGESTION_MODEL = 'claude-sonnet-4-20250514';

export interface PromptFile { version:string; body:string }
export type ClaudeUserBlock =
  | { type:'text'; text:string }
  | { type:'image'; source:{type:'base64';media_type:'image/png'|'image/jpeg';data:string} };
export interface AiUsage {
  purpose:string;model:string;promptVersion:string;inputTokens:number;outputTokens:number;
  cacheReadTokens:number;cacheWriteTokens:number;costUsd:number|null;latencyMs:number;
}

const promptCache=new Map<string,PromptFile>();
export async function loadPrompt(name:string,version=1):Promise<PromptFile>{
  const key=`${name}.v${version}`,cached=promptCache.get(key);if(cached)return cached;
  const body=await readFile(resolve(PROMPTS_DIR,`${key}.md`),'utf8');const prompt={version:key,body};promptCache.set(key,prompt);return prompt;
}

export class AiOutputError extends Error{constructor(message:string,readonly rawText:string){super(message)}}
export function parseJsonResponse<T>(text:string):T{
  const fenced=text.match(/```(?:json)?\s*([\s\S]*?)```/),candidate=(fenced?.[1]??text).trim();
  try{return JSON.parse(candidate)as T}catch(error){throw new AiOutputError(`Model did not return JSON: ${(error as Error).message}`,text)}
}

type AnthropicResponse={
  content:Array<{type:string;text?:string}>;model?:string;
  usage?:{input_tokens?:number;output_tokens?:number;cache_read_input_tokens?:number;cache_creation_input_tokens?:number};
};

const PRICING:Record<string,{input:number;output:number}>={
  // Keep pricing explicit. Unknown/future model IDs intentionally produce null cost.
  'claude-sonnet-4-20250514':{input:3,output:15},
};
export function estimateCostUsd(model:string,inputTokens:number,outputTokens:number):number|null{
  const price=PRICING[model];return price?(inputTokens*price.input+outputTokens*price.output)/1_000_000:null;
}

export class ClaudeIngestionClient{
  constructor(private readonly options:{apiKey:string;model?:string;fetchImpl?:typeof fetch}){}
  get model(){return this.options.model??DEFAULT_INGESTION_MODEL}
  async complete<T>(input:{purpose:string;prompt:PromptFile;content:ClaudeUserBlock[];maxTokens?:number}){
    const started=Date.now(),fetchImpl=this.options.fetchImpl??fetch;
    const response=await fetchImpl('https://api.anthropic.com/v1/messages',{
      method:'POST',headers:{'content-type':'application/json','x-api-key':this.options.apiKey,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:this.model,max_tokens:input.maxTokens??4096,system:input.prompt.body,messages:[{role:'user',content:input.content}]})
    });
    if(!response.ok)throw new AiOutputError(`Anthropic API ${response.status}`,await response.text());
    const body=await response.json()as AnthropicResponse,text=body.content.map(block=>block.text??'').join('');
    const inputTokens=body.usage?.input_tokens??0,outputTokens=body.usage?.output_tokens??0,model=body.model??this.model;
    const usage:AiUsage={purpose:input.purpose,model,promptVersion:input.prompt.version,inputTokens,outputTokens,
      cacheReadTokens:body.usage?.cache_read_input_tokens??0,cacheWriteTokens:body.usage?.cache_creation_input_tokens??0,
      costUsd:estimateCostUsd(model,inputTokens,outputTokens),latencyMs:Date.now()-started};
    return{data:parseJsonResponse<T>(text),usage,raw:body};
  }
}

export async function imageBlock(path:string):Promise<ClaudeUserBlock>{
  const lower=path.toLowerCase(),media_type=lower.endsWith('.jpg')||lower.endsWith('.jpeg')?'image/jpeg':'image/png';
  return{type:'image',source:{type:'base64',media_type,data:(await readFile(path)).toString('base64')}};
}

export async function recordAiCall(pool:Pool,usage:AiUsage,ref?:{table:string;id:string}){
  await pool.query(`insert into ai_calls(purpose,model,prompt_version,ref_table,ref_id,input_tokens,output_tokens,cache_read_tokens,cache_write_tokens,cost_usd,latency_ms,ok,error)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,null)`,[
      usage.purpose,usage.model,usage.promptVersion,ref?.table??null,ref?.id??null,usage.inputTokens,usage.outputTokens,
      usage.cacheReadTokens,usage.cacheWriteTokens,usage.costUsd,usage.latencyMs,
    ]);
}

/** A failed HTTP/parse call has no trustworthy usage numbers; store nulls rather than inventing zero-cost usage. */
export async function recordAiFailure(pool:Pool,input:{purpose:string;model:string;promptVersion:string;ref?:{table:string;id:string};error:unknown;latencyMs:number}){
  await pool.query(`insert into ai_calls(purpose,model,prompt_version,ref_table,ref_id,input_tokens,output_tokens,cache_read_tokens,cache_write_tokens,cost_usd,latency_ms,ok,error)
    values($1,$2,$3,$4,$5,null,null,null,null,null,$6,false,$7)`,[
      input.purpose,input.model,input.promptVersion,input.ref?.table??null,input.ref?.id??null,input.latencyMs,
      input.error instanceof Error?input.error.message.slice(0,1000):String(input.error).slice(0,1000),
    ]);
}
