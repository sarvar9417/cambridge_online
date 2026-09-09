import { describe, expect, it } from 'vitest';
import { HODDER_CHAPTER_13 } from './lesson-content-hodder-ch13';
import { presentationBeatsForSlide } from './lesson-experience-model';

describe('source-first presentation infrastructure',()=>{
  it('keeps Chapter 13 Hodder source structures presentation-addressable',()=>{
    const beats=HODDER_CHAPTER_13.slides.flatMap(slide=>presentationBeatsForSlide(slide,slide.title));
    expect(beats.some(beat=>beat.richBlock?.kind==='code')).toBe(true);
    expect(beats.some(beat=>beat.richBlock?.kind==='steps')).toBe(true);
    expect(beats.some(beat=>beat.richBlock?.kind==='table')).toBe(true);
    expect(beats.some(beat=>beat.keyTerms?.length)).toBe(true);
    expect(beats.some(beat=>beat.example)).toBe(true);
  });

  it('preserves the uploaded Chapter 13 floating-point practice values',()=>{
    const text=JSON.stringify(HODDER_CHAPTER_13);
    expect(text).toContain('+4.75');
    expect(text).toContain('−8.375');
    expect(text).toContain('mantissa');
    expect(text).toContain('exponent');
  });
});
