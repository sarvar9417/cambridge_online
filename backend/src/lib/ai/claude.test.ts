import{describe,expect,it,vi}from'vitest';import{AiOutputError,ClaudeIngestionClient,estimateCostUsd,parseJsonResponse}from'./claude.js';

describe('Claude ingestion client',()=>{
  it('parses plain and fenced JSON without guessing around invalid output',()=>{
    expect(parseJsonResponse<{ok:boolean}>('{"ok":true}')).toEqual({ok:true});
    expect(parseJsonResponse<{ok:boolean}>('```json\n{"ok":true}\n```')).toEqual({ok:true});
    expect(()=>parseJsonResponse('not json')).toThrow(AiOutputError);
  });

  it('sends actual Anthropic image and text content blocks instead of JSON-stringifying them',async()=>{
    const fetchImpl=vi.fn(async(_url:unknown,init?:RequestInit)=>new Response(JSON.stringify({
      content:[{type:'text',text:'{"questions":[]}'}],model:'claude-sonnet-4-20250514',usage:{input_tokens:100,output_tokens:20},
    }),{status:200,headers:{'content-type':'application/json'}}));
    const client=new ClaudeIngestionClient({apiKey:'test-key',fetchImpl:fetchImpl as typeof fetch});
    await client.complete({purpose:'extract_qp',prompt:{version:'extract-question.v1',body:'SYSTEM'},content:[
      {type:'text',text:'metadata'},
      {type:'image',source:{type:'base64',media_type:'image/png',data:'abc123'}},
      {type:'text',text:'## Text layer, page 1\nQuestion text'},
    ]});
    const body=JSON.parse(String((fetchImpl.mock.calls[0]![1] as RequestInit).body));
    expect(body.system).toBe('SYSTEM');
    expect(body.messages[0].content).toEqual(expect.arrayContaining([
      expect.objectContaining({type:'image',source:expect.objectContaining({type:'base64',media_type:'image/png',data:'abc123'})}),
      expect.objectContaining({type:'text',text:expect.stringContaining('Text layer')}),
    ]));
    expect(typeof body.messages[0].content).not.toBe('string');
  });

  it('records known-model token usage and does not invent unknown-model pricing',async()=>{
    const fetchImpl=vi.fn(async()=>new Response(JSON.stringify({
      content:[{type:'text',text:'{"ok":true}'}],model:'claude-sonnet-4-20250514',
      usage:{input_tokens:1_000_000,output_tokens:100_000,cache_read_input_tokens:50,cache_creation_input_tokens:25},
    }),{status:200,headers:{'content-type':'application/json'}}));
    const result=await new ClaudeIngestionClient({apiKey:'test',fetchImpl:fetchImpl as typeof fetch}).complete<{ok:boolean}>({purpose:'extract_qp',prompt:{version:'v1',body:'p'},content:[{type:'text',text:'x'}]});
    expect(result.data).toEqual({ok:true});
    expect(result.usage).toMatchObject({model:'claude-sonnet-4-20250514',inputTokens:1_000_000,outputTokens:100_000,cacheReadTokens:50,cacheWriteTokens:25,costUsd:4.5});
    expect(estimateCostUsd('future-model-with-unknown-price',1000,1000)).toBeNull();
  });

  it('surfaces non-2xx API responses as explicit extraction errors',async()=>{
    const fetchImpl=vi.fn(async()=>new Response('{"error":"bad"}',{status:429}));
    const promise=new ClaudeIngestionClient({apiKey:'test',fetchImpl:fetchImpl as typeof fetch}).complete({purpose:'extract_qp',prompt:{version:'v1',body:'p'},content:[{type:'text',text:'x'}]});
    await expect(promise).rejects.toMatchObject({message:'Anthropic API 429',rawText:'{"error":"bad"}'});
  });
});
