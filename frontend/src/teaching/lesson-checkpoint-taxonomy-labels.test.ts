import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const enhancer=readFileSync(new URL('./lesson-checkpoint-taxonomy-labels.ts',import.meta.url),'utf8');
const entry=readFileSync(new URL('./LessonStudio.tsx',import.meta.url),'utf8');

describe('Lesson Studio checkpoint taxonomy labels',()=>{
  it('labels lesson intent as the current target and question provenance as the source LO',()=>{
    expect(enhancer).toContain("badge.textContent='CURRENT TARGET LO'");
    expect(enhancer).toContain('Historical source leaves are included only through explicit equivalent/subtopic_compatible compatibility edges.');
    expect(enhancer).toContain('SOURCE LO · ${value}');
  });

  it('loads the label normalizer from the canonical Lesson Studio entry point',()=>{
    expect(entry).toContain("import './lesson-checkpoint-taxonomy-labels';");
  });
});
