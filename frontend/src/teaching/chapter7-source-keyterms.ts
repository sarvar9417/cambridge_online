import type { LessonSlide } from './lesson-content-full';

export type Chapter7SourceKeyTerm = { term: string; definition: string };

/**
 * Source-faithful key-term page from the supplied Chapter 7 extract (printed p.294).
 * The wording is kept intentionally close to the book so the presenter does not
 * replace formal textbook terminology with a shorter teaching paraphrase.
 */
export const CHAPTER_7_SOURCE_KEY_TERMS: Chapter7SourceKeyTerm[] = [
  { term: 'analysis', definition: 'part of the program development life cycle; a process of investigation, leading to the specification of what a program is required to do' },
  { term: 'design', definition: 'part of the program development life cycle; uses the program specification from the analysis stage to show how the program should be developed' },
  { term: 'coding', definition: 'part of the program development life cycle; the writing of the program or suite of programs' },
  { term: 'testing', definition: 'part of the program development life cycle; systematic checks done on a program to make sure that it works under all conditions' },
  { term: 'abstraction', definition: 'a method used in the analysis stage of the program development life cycle; the key elements required for the solution to the problem are kept and unnecessary details and information that are not required are discarded' },
  { term: 'decomposition', definition: 'a method used in the analysis stage of the program development life cycle; a complex problem is broken down into smaller parts, which can then be subdivided into even smaller parts that can be solved more easily' },
  { term: 'top-down design', definition: 'the breaking down of a computer system into a set of sub-systems, then breaking each sub-system down into a set of smaller sub-systems, until each sub-system just performs a single action' },
  { term: 'inputs', definition: 'the data used by the system that needs to be entered while the system is active' },
  { term: 'processes', definition: 'the tasks that need to be performed by a program using the input data and any other previously stored data' },
  { term: 'output', definition: 'information that needs to be displayed or printed for the users of the system' },
  { term: 'storage', definition: 'data that needs to be stored in files on an appropriate media for use in the future' },
  { term: 'structure diagram', definition: 'a diagram that shows the design of a computer system in a hierarchical way, with each level giving a more detailed breakdown of the system into sub-systems' },
  { term: 'flowchart', definition: 'a diagram that shows the steps required for a task (sub-system) and the order in which the steps are to be performed' },
  { term: 'algorithm', definition: 'an ordered set of steps to solve a problem' },
  { term: 'pseudocode', definition: 'a simple method of showing an algorithm; it describes what the algorithm does by using English key words that are very similar to those used in a high-level programming language but without the strict syntax rules' },
  { term: 'linear search', definition: 'an algorithm that inspects each item in a list in turn to see if the item matches the value searched for' },
  { term: 'bubble sort', definition: 'an algorithm that makes multiple passes through a list comparing each element with the next element and swapping them; this continues until there is a pass where no more swaps are made' },
  { term: 'validation', definition: 'automated checks carried out by a program that data is reasonable before it is accepted into a computer system' },
  { term: 'verification', definition: 'checking that data has been accurately copied from another source and input into a computer or transferred from one part of a computer system to another' },
  { term: 'set of test data', definition: 'all the items of data required to work through a solution' },
  { term: 'normal data', definition: 'data that is accepted by a program' },
  { term: 'abnormal data', definition: 'data that is rejected by a program' },
  { term: 'extreme data', definition: 'the largest/smallest data value that is accepted by a program' },
  { term: 'boundary data', definition: 'the largest/smallest data value that is accepted by a program and the corresponding smallest/largest rejected data value' },
  { term: 'range check', definition: 'a check that the value of a number is between an upper value and a lower value' },
  { term: 'length check', definition: 'a method used to check that the data entered is a specific number of characters long or that the number of characters is between an upper value and a lower value' },
  { term: 'type check', definition: 'a check that the data entered is of a specific type' },
  { term: 'presence check', definition: 'a check that a data item has been entered' },
  { term: 'format check', definition: 'a check that the characters entered conform to a pre-defined pattern' },
  { term: 'check digit', definition: 'an additional digit appended to a number to check if the entered number is error-free; check digit is a data entry check and not a data transmission check' },
];

const keyTermGroups: Record<string, Chapter7SourceKeyTerm[]> = {
  'ch7-book-keyterms-a': CHAPTER_7_SOURCE_KEY_TERMS.slice(0, 11),
  'ch7-book-keyterms-b': CHAPTER_7_SOURCE_KEY_TERMS.slice(11, 20),
  'ch7-book-keyterms-c': CHAPTER_7_SOURCE_KEY_TERMS.slice(20),
};

export const withChapter7SourceKeyTerms = (slides: LessonSlide[]): LessonSlide[] =>
  slides.map((slide) => {
    const keyTerms = keyTermGroups[slide.id];
    return keyTerms ? { ...slide, keyTerms } : slide;
  });
