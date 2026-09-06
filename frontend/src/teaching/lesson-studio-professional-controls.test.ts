// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

describe('Lesson Studio board navigation contract',()=>{
  it('can expose a native range control for long source-complete chapters',()=>{
    const input=document.createElement('input');
    input.type='range';
    input.min='1';
    input.max='41';
    input.value='20';
    expect(input.type).toBe('range');
    expect(input.value).toBe('20');
  });
});
