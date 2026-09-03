import { describe, expect, it } from 'vitest';
import { cleanExamStem, parseChoiceQuestion, parseWordBankQuestion, responseKindFor } from './question-workspace';

describe('lesson question workspace parsing', () => {
  it('separates Cambridge A-D options even when option A contains the letter A as content', () => {
    const question = 'Hypertext markup language (HTML) colour codes can be represented as hexadecimal. Tick ( 3 ) one box to show which statement about the hexadecimal number system is incorrect. A It uses the values 0 to 9 and A to F. B It can be used as a shorter representation of binary. C It is a base 10 system. D It can be used to represent error codes. [1]';
    const parsed = parseChoiceQuestion(question);
    expect(parsed?.kind).toBe('single');
    expect(parsed?.maxSelections).toBe(1);
    expect(parsed?.options.map((option) => option.key)).toEqual(['A', 'B', 'C', 'D']);
    expect(parsed?.options[0]?.text).toContain('0 to 9 and A to F');
    expect(parsed?.options[2]?.text).toBe('It is a base 10 system.');
  });

  it('turns a flattened circle-three list into a bounded multiple-choice control', () => {
    const question = 'A central processing unit (CPU) performs the fetch–decode–execute (FDE) cycle. Buses are used in the CPU to transmit data through the FDE cycle. Circle three buses that are used in the CPU. DO NOT WRITE IN THIS MARGIN fetch address register execute data decode calculation central value binary control [3]';
    const parsed = parseChoiceQuestion(question);
    expect(parsed?.kind).toBe('multiple');
    expect(parsed?.maxSelections).toBe(3);
    expect(parsed?.options.map((option) => option.text)).toEqual([
      'fetch', 'address', 'register', 'execute', 'data', 'decode', 'calculation', 'central', 'value', 'binary', 'control',
    ]);
  });

  it('separates a flattened word bank from the completion passage without guessing multi-word boundaries', () => {
    const question = 'Storage and memory are important components of a computer system. Virtual memory can be created in a computer system. Complete the description about virtual memory. Use the terms from the list. Some of the terms in the list will not be used. Some terms may be used more than once. binary hard disk drive (HDD) hexadecimal operating system pages random access memory (RAM) read only memory (ROM) sectors software tracks virtual memory Virtual memory is used when the is full. It is created by partitioning the . Data is divided into that can be sent from to the to be temporarily stored until they are required. [5]';
    const parsed = parseWordBankQuestion(question, 5);
    expect(parsed?.slots).toBe(5);
    expect(parsed?.bankText).toContain('hard disk drive (HDD)');
    expect(parsed?.bankText).toContain('virtual memory');
    expect(parsed?.passage.startsWith('Virtual memory is used')).toBe(true);
    expect(responseKindFor(question, 'text', 5)).toBe('word_bank');
  });

  it('removes margin and duplicate mark artefacts without changing the source task', () => {
    expect(cleanExamStem('Identify one character set. DO NOT WRITE IN THIS MARGIN [1]')).toBe('Identify one character set.');
  });
});
