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

/**
 * `fatal` means retrying cannot help. An exhausted credit balance, a bad key or
 * a malformed request returns the same 400 on every attempt, so burning the
 * remaining tries only delays the real message and, across a 115-paper run,
 * multiplies it by three. Rate limits and 5xx are the opposite and stay
 * retryable.
 */
export class AiOutputError extends Error{
  constructor(message:string,readonly rawText:string,readonly fatal=false){super(message)}
}
export const isFatalAiError=(error:unknown)=>error instanceof AiOutputError&&error.fatal;
export function parseJsonResponse<T>(text:string):T{
  const fenced=text.match(/```(?:json)?\s*([\s\S]*?)```/),candidate=(fenced?.[1]??text).trim();
  try{return JSON.parse(candidate)as T}catch(error){throw new AiOutputError(`Model did not return JSON: ${(error as Error).message}`,text)}
}

type AnthropicResponse={
  content:Array<{type:string;text?:string}>;model?:string;stop_reason?:string|null;
  usage?:{input_tokens?:number;output_tokens?:number;cache_read_input_tokens?:number;cache_creation_input_tokens?:number};
};

const PRICING:Record<string,{input:number;output:number}>={
  // Keep pricing explicit. Unknown/future model IDs intentionally produce null cost.
  'claude-sonnet-4-20250514':{input:3,output:15},
  'claude-sonnet-4-6':{input:3,output:15},
};
// Cache reads bill at a tenth of the input rate and cache writes at 1.25x.
const CACHE_READ_RATE=.1,CACHE_WRITE_RATE=1.25;
export function estimateCostUsd(model:string,inputTokens:number,outputTokens:number,cacheReadTokens=0,cacheWriteTokens=0):number|null{
  const price=PRICING[model];if(!price)return null;
  // The API reports cached input separately from input_tokens, so they are
  // additive here rather than a subset that would be double counted.
  return(inputTokens*price.input+outputTokens*price.output
    +cacheReadTokens*price.input*CACHE_READ_RATE+cacheWriteTokens*price.input*CACHE_WRITE_RATE)/1_000_000;
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
    // The body is the whole diagnosis for a 4xx -- which field was rejected and
    // why. It used to live only in rawText, which nothing prints and nothing
    // stores, so a 400 reached the log as the bare status three times over.
    if(!response.ok){const body=await response.text();
      // 429 and 5xx are transient. Everything else in the 4xx range is a
      // request the server will keep rejecting: credit, key, model, shape.
      const fatal=response.status>=400&&response.status<500&&response.status!==429;
      throw new AiOutputError(`Anthropic API ${response.status} for ${input.purpose}: ${body.slice(0,600)}`,body,fatal)}
    const body=await response.json()as AnthropicResponse,text=body.content.map(block=>block.text??'').join('');
    const inputTokens=body.usage?.input_tokens??0,outputTokens=body.usage?.output_tokens??0,model=body.model??this.model;
    const cacheReadTokens=body.usage?.cache_read_input_tokens??0,cacheWriteTokens=body.usage?.cache_creation_input_tokens??0;
    const usage:AiUsage={purpose:input.purpose,model,promptVersion:input.prompt.version,inputTokens,outputTokens,
      cacheReadTokens,cacheWriteTokens,
      costUsd:estimateCostUsd(model,inputTokens,outputTokens,cacheReadTokens,cacheWriteTokens),latencyMs:Date.now()-started};
    // Running out of output budget leaves valid JSON cut mid-string, which the
    // parser reports as a syntax error at some offset -- true, but it sends the
    // reader looking for a malformed model instead of a budget that is too small.
    if(body.stop_reason==='max_tokens')throw new AiOutputError(
      `Model hit the ${input.maxTokens??4096} output token limit for ${input.purpose} and the JSON is incomplete. Reduce the batch or raise maxTokens.`,text);
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
