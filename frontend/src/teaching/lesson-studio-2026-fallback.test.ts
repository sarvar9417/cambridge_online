import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const studioSource=()=>readFileSync(resolve(process.cwd(),'src/teaching/LessonStudioV2.tsx'),'utf8');

describe('Lesson Studio generic checkpoint window',()=>{
  it('defaults missing checkpoint yearTo values to the verified 2026 corpus',()=>{
    const source=studioSource();
    expect(source).toContain('checkpointYearTo??2026');
    expect(source).not.toContain('checkpointYearTo??2025');
  });
});