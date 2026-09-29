import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page = readFileSync(resolve(process.cwd(), 'src/live/LiveExamPage.tsx'), 'utf8');

describe('Live Challenge snapshot polling contract', () => {
  it('stops snapshot polling and heartbeats after a session is terminal', () => {
    expect(page).toContain("const terminal=status==='finished'||status==='cancelled'");
    expect(page).toMatch(/useEffect\(\(\)=>\{\s*if\(terminal\)return;\s*void refresh\(\)/);
    expect(page).toMatch(/useEffect\(\(\)=>\{\s*if\(!status\|\|terminal\)return;\s*const beat=/);
  });
});
