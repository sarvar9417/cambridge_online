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
    // 1M in at $3 + 100k out at $15, plus cached input: reads bill at a tenth of
    // the input rate and writes at 1.25x, so they are not free and not full price.
    expect(result.usage).toMatchObject({model:'claude-sonnet-4-20250514',inputTokens:1_000_000,outputTokens:100_000,cacheReadTokens:50,cacheWriteTokens:25,costUsd:3+1.5+50*3*.1/1e6+25*3*1.25/1e6});
    expect(estimateCostUsd('future-model-with-unknown-price',1000,1000)).toBeNull();
    // The model the corpus actually runs on must be priced, or a 115-paper run
    // reports its whole spend as zero.
    expect(estimateCostUsd('claude-sonnet-4-6',1_000_000,0)).toBe(3);
  });

  it('names the output budget when the model is cut off, instead of a JSON syntax error',async()=>{
    const fetchImpl=vi.fn(async()=>new Response(JSON.stringify({
      content:[{type:'text',text:'{"questions":[{"stem_md":"Explain why'}],model:'claude-sonnet-4-20250514',
      stop_reason:'max_tokens',usage:{input_tokens:10,output_tokens:8192},
    }),{status:200,headers:{'content-type':'application/json'}}));
    const promise=new ClaudeIngestionClient({apiKey:'test',fetchImpl:fetchImpl as typeof fetch}).complete({purpose:'extract_qp',prompt:{version:'v1',body:'p'},content:[{type:'text',text:'x'}],maxTokens:8192});
    await expect(promise).rejects.toThrow(/8192 output token limit for extract_qp/);
  });

  it('marks a request the server will keep rejecting as fatal, and a rate limit as retryable',async()=>{
    const respond=(status:number)=>vi.fn(async()=>new Response('{"error":{"message":"credit balance is too low"}}',{status}));
    const call=(status:number)=>new ClaudeIngestionClient({apiKey:'test',fetchImpl:respond(status) as unknown as typeof fetch})
      .complete({purpose:'classify',prompt:{version:'v1',body:'p'},content:[{type:'text',text:'x'}]});
    // An exhausted balance returns the same 400 every time; two more attempts
    // only delay the message and triple it across a corpus run.
    await expect(call(400)).rejects.toMatchObject({fatal:true});
    await expect(call(401)).rejects.toMatchObject({fatal:true});
    await expect(call(429)).rejects.toMatchObject({fatal:false});
    await expect(call(529)).rejects.toMatchObject({fatal:false});
  });

  it('surfaces non-2xx API responses as explicit extraction errors',async()=>{
    const fetchImpl=vi.fn(async()=>new Response('{"error":"bad"}',{status:429}));
    const promise=new ClaudeIngestionClient({apiKey:'test',fetchImpl:fetchImpl as typeof fetch}).complete({purpose:'extract_qp',prompt:{version:'v1',body:'p'},content:[{type:'text',text:'x'}]});
    // The body says which field was rejected; the status alone does not.
    await expect(promise).rejects.toMatchObject({message:'Anthropic API 429 for extract_qp: {"error":"bad"}',rawText:'{"error":"bad"}'});
  });
});
