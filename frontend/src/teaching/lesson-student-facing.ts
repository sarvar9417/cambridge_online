import type { LessonRichBlock, LessonSlide } from './lesson-content-source-complete';

export const TEACHER_DIRECTIVE_PATTERN = /\b(?:ask learners|ask students|ask the class|invite a student|invite learners|tell learners|have learners|show learners|before teaching|teacher prompt|teacher activity)\b/i;

function capitalise(value:string){
  const text=value.trim();
  return text ? text[0]!.toUpperCase()+text.slice(1) : text;
}

function unwrapPromptQuotes(value:string){
  const text=value.trim();
  const match=text.match(/^[“"]([\s\S]+)[”"]\.?$/);
  return match?.[1]?.trim()??text;
}

/**
 * Convert legacy authoring directions into words that can be projected directly
 * to learners. Academic statements are otherwise left untouched.
 */
export function studentFacingText(value:string){
  let text=value.trim();
  if(!text)return text;

  if(/^use this as (?:a|an) .*retrieval check before teaching/i.test(text)){
    return 'Before we start, check what you already know.';
  }
  if(/^(?:this checkpoint is loaded live|only approved .* leaves explicitly mapped|approved .* leaves)/i.test(text)){
    return 'Apply what you have just learned to real Cambridge past-paper questions. Attempt each question before the mark scheme is revealed.';
  }

  text=text.replace(/^Start with (?:one )?question:\s*/i,'');
  text=unwrapPromptQuotes(text);

  const showAndAsk=text.match(/^Show (.+?) and ask why (.+)$/i);
  if(showAndAsk){
    const object=showAndAsk[1]!.replace(/[.]$/,'');
    const reason=showAndAsk[2]!.replace(/[.?]$/,'');
    return `Study ${object}. Why ${reason}?`;
  }

  text=text.replace(/^Ask (?:learners|students|the class) to\s+/i,'');
  text=text.replace(/^Invite (?:a student|learners|students) to\s+/i,'');
  text=text.replace(/^Tell (?:learners|students|the class) to\s+/i,'');
  text=text.replace(/^Have (?:learners|students|the class)\s+/i,'');
  text=text.replace(/^Ask for\s+/i,'Give ');
  text=text.replace(/^Ask why\s+/i,'Why ');
  text=text.replace(/^Ask:\s*/i,'');
  text=text.replace(/^Discuss with (?:learners|students|the class):?\s*/i,'Discuss: ');
  text=text.replace(/^Chapter source scope:\s*/i,'In this chapter: ');

  if(/^Hodder p\.\s*\d+\s*·\s*complete prior-knowledge diagnostic/i.test(text)){
    return 'Before you start · Prior knowledge check';
  }
  if(/^Hodder p\.\s*\d+\s*·\s*complete file-I\/O diagnostic/i.test(text)){
    return 'Before you start · File I/O knowledge check';
  }

  text=capitalise(text);
  if(/^Why\b/i.test(text)&&!/[?!]$/.test(text))text+='?';
  return text;
}

function projectRichBlock(block:LessonRichBlock):LessonRichBlock{
  if(block.kind==='paragraph')return {...block,text:studentFacingText(block.text)};
  if(block.kind==='bullets')return {...block,items:block.items.map(studentFacingText)};
  if(block.kind==='steps')return {...block,title:block.title?studentFacingText(block.title):block.title,items:block.items.map(studentFacingText)};
  if(block.kind==='callout')return {...block,title:studentFacingText(block.title),text:studentFacingText(block.text)};
  if(block.kind==='comparison')return {...block,leftTitle:studentFacingText(block.leftTitle),rightTitle:studentFacingText(block.rightTitle),rows:block.rows.map(([left,right])=>[studentFacingText(left),studentFacingText(right)])};
  if(block.kind==='source-note')return {
    ...block,
    title:studentFacingText(block.title),
    sourceLabel:'Coursebook wording',
    sourceText:studentFacingText(block.sourceText),
    examSafeLabel:'Exam-ready wording',
    examSafeText:studentFacingText(block.examSafeText),
  };
  if(block.kind==='table')return {...block,table:{...block.table,caption:studentFacingText(block.table.caption),headers:block.table.headers.map(studentFacingText),rows:block.table.rows.map(row=>row.map(studentFacingText))}};
  // Program code and source-backed figure geometry are intentionally not rewritten.
  return block;
}

export function studentFacingSlide<T extends LessonSlide>(slide:T):T{
  return {
    ...slide,
    eyebrow:studentFacingText(slide.eyebrow),
    title:studentFacingText(slide.title),
    lead:studentFacingText(slide.lead),
    bullets:slide.bullets?.map(studentFacingText),
    keyTerms:slide.keyTerms?.map(item=>({...item,definition:studentFacingText(item.definition)})),
    example:slide.example?{
      ...slide.example,
      title:studentFacingText(slide.example.title),
      lines:slide.example.lines.map(studentFacingText),
      answer:slide.example.answer?studentFacingText(slide.example.answer):slide.example.answer,
    }:slide.example,
    teacherPrompt:slide.teacherPrompt?studentFacingText(slide.teacherPrompt):slide.teacherPrompt,
    activity:slide.activity?{
      ...slide.activity,
      title:studentFacingText(slide.activity.title),
      prompt:studentFacingText(slide.activity.prompt),
      reveal:slide.activity.reveal?studentFacingText(slide.activity.reveal):slide.activity.reveal,
    }:slide.activity,
    richBlocks:slide.richBlocks?.map(projectRichBlock),
  };
}

export function lessonPurpose(slide:LessonSlide){
  if(slide.examPractice)return 'CAMBRIDGE PRACTICE';
  if(/recap|review|summary/i.test(`${slide.section} ${slide.title}`))return 'RECAP';
  if(slide.activity)return 'YOUR TURN';
  if(slide.example)return 'WORKED EXAMPLE';
  return 'LEARN';
}
