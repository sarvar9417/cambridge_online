import { describe, expect, it } from 'vitest';
import { structureQuestionText } from './question-structure';

describe('structureQuestionText', () => {
  it('separates the LibraryRecord source question into readable semantic blocks', () => {
    const stem = `Data types can be defined using pseudocode.
The data type, LibraryRecord, is defined in pseudocode as:
TYPE LibraryRecord
DECLARE Title : STRING
DECLARE Fiction : BOOLEAN
DECLARE Author : STRING
DECLARE NumberOfCopies : INTEGER
ENDTYPE
A variable, LibraryBook, is declared in pseudocode as:
DECLARE LibraryBook : LibraryRecord

The type definition for LibraryRecord is changed.

The value for NumberOfCopies must be between 1 and 10 inclusive.
Write the updated line of pseudocode from the type definition of LibraryRecord to
implement the change.`;

    expect(structureQuestionText(stem)).toEqual([
      { type: 'paragraph', text: 'Data types can be defined using pseudocode. The data type, LibraryRecord, is defined in pseudocode as:' },
      { type: 'code', text: 'TYPE LibraryRecord\nDECLARE Title : STRING\nDECLARE Fiction : BOOLEAN\nDECLARE Author : STRING\nDECLARE NumberOfCopies : INTEGER\nENDTYPE' },
      { type: 'paragraph', text: 'A variable, LibraryBook, is declared in pseudocode as:' },
      { type: 'code', text: 'DECLARE LibraryBook : LibraryRecord' },
      { type: 'paragraph', text: 'The type definition for LibraryRecord is changed.' },
      { type: 'paragraph', text: 'The value for NumberOfCopies must be between 1 and 10 inclusive.' },
      { type: 'task', text: 'Write the updated line of pseudocode from the type definition of LibraryRecord to implement the change.' },
    ]);
  });

  it('keeps Cambridge bullet requirements as a list after an instruction', () => {
    const stem = `Write pseudocode statements to assign:
• A Level Computer Science to Title of LibraryBook
• FALSE to Fiction of LibraryBook.`;

    expect(structureQuestionText(stem)).toEqual([
      { type: 'task', text: 'Write pseudocode statements to assign:' },
      { type: 'list', items: ['A Level Computer Science to Title of LibraryBook', 'FALSE to Fiction of LibraryBook.'] },
    ]);
  });

  it('preserves explicit pseudocode lines without rewriting them', () => {
    const stem = `The file is opened for random access.
OPENFILE DataFile FOR RANDOM
SEEK DataFile, Address
GETRECORD DataFile, ThisRecord
CLOSEFILE DataFile
Explain why direct access is suitable.`;

    expect(structureQuestionText(stem)).toEqual([
      { type: 'paragraph', text: 'The file is opened for random access.' },
      { type: 'code', text: 'OPENFILE DataFile FOR RANDOM\nSEEK DataFile, Address\nGETRECORD DataFile, ThisRecord\nCLOSEFILE DataFile' },
      { type: 'task', text: 'Explain why direct access is suitable.' },
    ]);
  });

  it('does not over-format an ordinary one-line question', () => {
    expect(structureQuestionText('Give two advantages of Unicode over ASCII.')).toEqual([
      { type: 'task', text: 'Give two advantages of Unicode over ASCII.' },
    ]);
  });

  it('recognises fenced code and pipe tables already preserved by ingestion', () => {
    const stem = `Use the following data.

| Name | Value |
| A | 10 |

\`\`\`
DECLARE Total : INTEGER
Total ← 0
\`\`\`
Calculate the final value.`;

    expect(structureQuestionText(stem)).toEqual([
      { type: 'paragraph', text: 'Use the following data.' },
      { type: 'table', rows: ['| Name | Value |', '| A | 10 |'] },
      { type: 'code', text: 'DECLARE Total : INTEGER\nTotal ← 0' },
      { type: 'task', text: 'Calculate the final value.' },
    ]);
  });
});
