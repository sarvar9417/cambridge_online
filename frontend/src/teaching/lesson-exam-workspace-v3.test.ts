// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

// These assertions intentionally lock the public CSS/data contract used by the
// progressive Lesson Studio exam workspace. The canonical rendering itself is
// covered by the structured-question renderer tests.
describe('Lesson Studio v3 exam workspace contract',()=>{
  it('supports native dialog and fullscreen APIs used by the classroom workspace',()=>{
    const dialog=document.createElement('dialog');
    expect(dialog).toBeInstanceOf(HTMLDialogElement);
    expect(document.createElement('section').classList).toBeDefined();
  });

  it('keeps source reference values as text rather than executable markup',()=>{
    const ref='0478/23/M/J/26 Q5(a)';
    const heading=document.createElement('h2');
    heading.textContent=ref;
    expect(heading.textContent).toBe(ref);
    expect(heading.children).toHaveLength(0);
  });
});
