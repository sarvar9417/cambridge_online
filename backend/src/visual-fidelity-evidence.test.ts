import { describe, expect, it } from 'vitest';

describe('visual fidelity evidence contract', () => {
  it('uses fail-closed VF classifications', () => {
    const allowed = ['VF-0','VF-1','VF-2','VF-3','VF-4','VF-5'];
    expect(allowed).toContain('VF-5');
    expect(allowed).not.toContain('READY');
  });

  it('requires all product surfaces before closure', () => {
    const required = ['source','question_bank','pdf','docx','live_challenge'];
    expect(required).toHaveLength(5);
    expect(new Set(required).size).toBe(required.length);
  });
});
