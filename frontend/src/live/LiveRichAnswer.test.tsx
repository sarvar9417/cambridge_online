import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIVE_RICH_ANSWER_PREFIX, LiveAnswerDisplay, LiveRichAnswerEditor, liveAnswerPlainText, sanitizeLiveRichHtml } from './LiveRichAnswer';

describe('Live rich-text answers',()=>{
  let container:HTMLDivElement;
  let root:Root;
  beforeEach(()=>{
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
    container=document.createElement('div');
    document.body.appendChild(container);
    root=createRoot(container);
  });
  afterEach(async()=>{
    await act(async()=>root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  it('preserves legacy plain text and counts visible words rather than HTML markup',()=>{
    expect(liveAnswerPlainText('first <tag>')).toBe('first <tag>');
    expect(liveAnswerPlainText(LIVE_RICH_ANSWER_PREFIX+'<p><strong>two</strong> words</p><p>third</p>'))
      .toBe('two words\nthird');
  });
  it('sanitizes all untrusted attributes and active content',async()=>{
    const unsafe='<p onclick="alert(1)">Safe <strong style="color:red">bold</strong></p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">plain</a>';
    const safe=sanitizeLiveRichHtml(unsafe);
    expect(safe).toContain('<strong>bold</strong>');
    expect(safe).toContain('plain');
    expect(safe).not.toMatch(/script|onerror|onclick|javascript:|img|style=|href=/);
    await act(async()=>root.render(<LiveAnswerDisplay value={LIVE_RICH_ANSWER_PREFIX+unsafe}/>));
    expect(container.querySelector('script, img, a')).toBeNull();
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.textContent).not.toContain('alert(1)');
  });
  it('provides accessible format controls and autosave-compatible rich serialization',async()=>{
    const onChange=vi.fn();
    await act(async()=>root.render(<LiveRichAnswerEditor id="live-answer" value="" onChange={onChange}/>));
    expect(container.querySelectorAll('[role="toolbar"] button')).toHaveLength(8);
    expect(container.querySelector('[aria-label$="Qalin"]')).toBeTruthy();
    const editor=container.querySelector<HTMLElement>('[role="textbox"]')!;
    await act(async()=>{
      editor.textContent='Firewall controls traffic';
      editor.dispatchEvent(new InputEvent('input',{bubbles:true}));
    });
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining(LIVE_RICH_ANSWER_PREFIX));
    expect(onChange.mock.lastCall?.[0]).toContain('Firewall controls traffic');
  });
  it('never interprets a previously saved plain-text HTML-looking answer as markup',async()=>{
    await act(async()=>root.render(<LiveRichAnswerEditor id="live-answer" value={'<img src=x>\nA & B'} onChange={()=>{}}/>));
    expect(container.querySelector('.live-editor-surface img')).toBeNull();
    expect(container.querySelector('.live-editor-surface')?.textContent).toBe('<img src=x>\nA & B');
  });
});
