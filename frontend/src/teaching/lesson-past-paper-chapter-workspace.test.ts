import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=readFileSync(resolve(process.cwd(),'src','teaching','LessonPastPaper.tsx'),'utf8');

describe('chapter Past Paper workspace safeguards',()=>{
  it('requests every chapter LO rather than a single topic checkpoint',()=>{
    expect(source).toContain('chapterPastPaperScope(chapterTopics)');
    expect(source).toContain("codes.forEach(code=>params.append('loCodes',code));");
  });

  it('refuses mixed-course and mismatched API scope responses',()=>{
    expect(source).toContain('syllabuses.length>1');
    expect(source).toContain("result.syllabusCode!==syllabusCode||result.yearFrom!==yearFrom||result.yearTo!==yearTo");
    expect(source).toContain("throw new Error('checkpoint_scope_mismatch')");
  });

  it('keeps incomplete source questions out of the learner workspace',()=>{
    expect(source).toContain('if(question.hasDiagram&&!assets.some(asset=>isVisualAsset(asset)&&assetComplete(asset)))return false;');
    expect(source).toContain('if(question.hasDependency&&!question.dependencies.length)return false;');
    expect(source).toContain('.filter(questionComplete)');
  });

  it('resets filters between chapters and labels the verified course window',()=>{
    expect(source).toContain("setQuery('');");
    expect(source).toContain("setYear('all');");
    expect(source).toContain("CHAPTER PAST PAPERS · {syllabusCode} · {yearFrom}–{yearTo}");
    expect(source).toContain('filtered.length===questions.length');
  });

  it('never substitutes a weakly related question when the approved corpus is empty',()=>{
    expect(source).toContain('No exact question match was found.');
    expect(source).toContain('A weakly related question has not been inserted.');
  });
});
