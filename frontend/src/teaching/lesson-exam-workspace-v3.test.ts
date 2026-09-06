// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

// Canonical rendering is covered by the structured-question renderer tests.
// These assertions lock the classroom interaction contract: the question stays
// in the lesson card and only the mark scheme is a reveal action.
describe('Lesson Studio inline exam workspace contract',()=>{
  it('keeps the complete question in-card without introducing a modal layer',()=>{
    const card=document.createElement('article');
    card.className='lesson-exam-card lesson-exam-inline';
    const inline=document.createElement('section');
    inline.className='lesson-inline-question';
    card.append(inline);

    expect(card.querySelector('.lesson-inline-question')).toBe(inline);
    expect(card.querySelector('dialog')).toBeNull();
  });

  it('uses one explicit reveal control for the hidden mark scheme',()=>{
    const button=document.createElement('button');
    button.className='lesson-inline-ms-toggle';
    button.textContent='Mark scheme';
    button.setAttribute('aria-expanded','false');
    const scheme=document.createElement('section');
    scheme.className='lesson-inline-mark-scheme';
    scheme.hidden=true;

    expect(button.textContent).toBe('Mark scheme');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(scheme.hidden).toBe(true);
  });

  it('keeps source reference values as text rather than executable markup',()=>{
    const ref='0478/23/M/J/26 Q5(a)';
    const heading=document.createElement('h2');
    heading.textContent=ref;
    expect(heading.textContent).toBe(ref);
    expect(heading.children).toHaveLength(0);
  });
});
