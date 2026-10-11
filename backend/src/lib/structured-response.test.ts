import { describe, expect, it } from 'vitest';
import { structuredResponseSchema } from './structured-response.js';

describe('structured response payload',()=>{
  it('accepts bounded table matching annotation and line responses',()=>{
    expect(structuredResponseSchema.parse({
      version:1,
      tables:{'1':{'0:1':'value'}},
      matching:{'2':{left:'right'}},
      annotations:{'3':[{id:'note',x:.25,y:.75,text:'TOS'}]},
      lines:{'3':[{id:'line',x1:0,y1:.2,x2:1,y2:.8}]},
    })).toBeTruthy();
  });

  it('rejects coordinates outside the source canvas',()=>{
    expect(()=>structuredResponseSchema.parse({
      version:1,tables:{},matching:{},
      annotations:{'0':[{id:'bad',x:1.2,y:0,text:'x'}]},
      lines:{},
    })).toThrow();
  });

  it('rejects arbitrary non-versioned blobs',()=>{
    expect(()=>structuredResponseSchema.parse({foo:'bar'})).toThrow();
  });
});
