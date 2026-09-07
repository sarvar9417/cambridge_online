import type { LessonRichBlock, LessonSlide } from './lesson-content-source-complete';

export const TEACHER_DIRECTIVE_PATTERN = /\b(?:ask learners|ask students|ask the class|invite a student|invite learners|tell learners|have learners|show learners|before teaching|teacher prompt|teacher activity)\b/i;
export const AUTHORING_META_PATTERN = /\b(?:Hodder\b|CamPath\b|source-atom-complete|source-audited|historical (?:LO|learning objective)|learning objective codes|approved .* leaves explicitly mapped|live checkpoints? query)\b/i;

function capitalise(value:string){
  const text=value.trim();
  return text ? text[0]!.toUpperCase()+text.slice(1) : text;
}

function stripTerminalPeriod(value:string){
  return value.trim().replace(/\.+$/,'');
}

function unwrapPromptQuotes(value:string){
  const text=value.trim();
  const match=text.match(/^[“"]([\s\S]+)[”"]\.?$/);
  return match?.[1]?.trim()??text;
}

/** Convert legacy authoring directions into words that can be projected directly to learners. */
export function studentFacingText(value:string){
  let text=value.trim();
  if(!text)return text;

  text=text.replace(/^HODDER CHAPTER\s+(\d+)\s*·\s*SOURCE-FAITHFUL$/i,'CHAPTER $1 · CORE LESSON');
  text=text.replace(/\bHODDER EXTENSION\b/gi,'EXTENSION');
  text=text.replace(/^HODDER END-OF-CHAPTER QUESTIONS$/i,'END-OF-CHAPTER REVIEW');
  if(/^(?:BOOK|COURSEBOOK) PRACTICE\b/i.test(text))return 'Coursebook practice';
  if(/^SOURCE DETAIL\b/i.test(text))return 'Source detail';

  if(/^use this as (?:a|an) .*retrieval check before teaching/i.test(text))return 'Before we start, check what you already know.';
  if(/^(?:this checkpoint is loaded live|only approved .* leaves explicitly mapped|approved .* leaves)/i.test(text))return 'Apply what you have just learned to real Cambridge past-paper questions. Attempt each question before the mark scheme is revealed.';
  if(/^complete Hodder Chapter 1 teaching route/i.test(text))return 'Numbers, text, graphics, sound and compression — explained with clear examples, visual models and Cambridge practice.';
  if(/^complete Hodder Chapter 13 route/i.test(text))return 'User-defined data types, file organisation, hashing and floating-point representation — explained step by step with Cambridge practice.';
  if(/^guided discovery first, then a source-atom-complete Chapter 7/i.test(text))return 'Discover how a problem becomes a working program, then learn the formal Cambridge terms through examples, design tasks and past-paper practice.';

  if(/^Hodder labels this video material as beyond the 9618 syllabus/i.test(text))return 'Video is included here as an extension beyond the assessed 9618 content. No unrelated multimedia question is substituted when there is no exact Cambridge past-paper match.';
  if(/no exact 2021[–-]2025 historical LO dedicated to editing operations/i.test(text))return 'Sound-editing operations are included for complete understanding, but the approved 2021–2026 past-paper set has no exact question for this learning point. No unrelated sampling question is substituted.';
  if(/historical corpus has compression LOs, but no exact LO representing this combined/i.test(text))return 'This section combines several ways to reduce image, sound and video size. The approved 2021–2026 past-paper set has no single exact question covering the whole combined list, so no loosely related question is substituted.';
  if(/^These source questions remain visible as a chapter-review map/i.test(text))return 'Use these mixed review prompts to connect ideas from the whole chapter. Current Cambridge past-paper practice appears separately at the relevant learning points.';
  if(/^The Hodder review includes older exam-style material/i.test(text))return 'Use the coursebook review for broad retrieval. Use the Cambridge practice screens for approved past-paper questions matched to each learning point.';
  if(/^The source finishes with exam-style material\. CamPath preserves the coverage/i.test(text))return 'Finish with these mixed exam-style review prompts, then use the Cambridge practice screens for approved 2021–2026 past-paper questions.';
  if(/^Some printed (?:Hodder|The coursebook) review items cite older 9608 papers/i.test(text))return 'Some coursebook review items cite older 9608 papers. Use them for broad topic review; the Cambridge practice screens use approved 2021–2026 9618 past-paper questions.';

  const diagnostic=text.match(/^Hodder opens with a diagnostic on (.+)$/i);
  if(diagnostic)return `Before you start, check your understanding of ${stripTerminalPeriod(diagnostic[1]!)}.`;
  const priorCheck=text.match(/^Hodder begins by checking whether learners can (.+)$/i);
  if(priorCheck)return `Before you start, check that you can ${stripTerminalPeriod(priorCheck[1]!)}.`;
  const teaches=text.match(/^Hodder teaches (.+)$/i);
  if(teaches)return `Learn ${stripTerminalPeriod(teaches[1]!)}.`;
  const usesToShow=text.match(/^Hodder uses (.+?) to show (.+)$/i);
  if(usesToShow)return `Use ${usesToShow[1]!.trim()} to understand ${stripTerminalPeriod(usesToShow[2]!)}.`;
  const uses=text.match(/^Hodder uses (.+)$/i);
  if(uses)return `Study ${stripTerminalPeriod(uses[1]!)}.`;
  const firstEstablishes=text.match(/^Hodder first establishes (.+)$/i);
  if(firstEstablishes)return `Start with this idea: ${stripTerminalPeriod(firstEstablishes[1]!)}.`;
  const compares=text.match(/^Hodder compares (.+)$/i);
  if(compares)text=`Compare ${stripTerminalPeriod(compares[1]!)}.`;

  text=text.replace(/^CAMBRIDGE CHECKPOINT\b/i,'CAMBRIDGE PAST-PAPER PRACTICE');
  text=text.replace(/^Start with (?:one )?question:\s*/i,'');
  text=unwrapPromptQuotes(text);

  const showAndAsk=text.match(/^Show (.+?) and ask why (.+)$/i);
  if(showAndAsk){
    const object=showAndAsk[1]!.replace(/[.]$/,'');
    const reason=showAndAsk[2]!.replace(/[.?]$/,'');
    return `Study ${object}. Why ${reason}?`;
  }

  text=text.replace(/^Ask (?:learners|students|the class) to\s+/i,'');
  text=text.replace(/^Ask (?:learners|students|the class) why\s+/i,'Why ');
  text=text.replace(/^Ask (?:learners|students|the class) how\s+/i,'How ');
  text=text.replace(/^Ask (?:learners|students|the class) what\s+/i,'What ');
  text=text.replace(/^Ask (?:learners|students|the class) whether\s+/i,'Decide whether ');
  text=text.replace(/^Invite (?:a student|learners|students) to\s+/i,'');
  text=text.replace(/^Tell (?:learners|students|the class) to\s+/i,'');
  text=text.replace(/^Have (?:learners|students|the class)\s+/i,'');
  text=text.replace(/^Ask for\s+/i,'Give ');
  text=text.replace(/^Ask why\s+/i,'Why ');
  text=text.replace(/^Ask:\s*/i,'');
  text=text.replace(/^Discuss with (?:learners|students|the class):?\s*/i,'Discuss: ');
  text=text.replace(/^Chapter source scope:\s*/i,'In this chapter: ');
  text=text.replace(/\bmay ask learners to\b/gi,'may require you to');
  text=text.replace(/\basks learners to\b/gi,'requires you to');
  text=text.replace(/\bask learners to\b/gi,'require you to');
  text=unwrapPromptQuotes(text);

  if(/^Hodder p\.\s*\d+\s*·\s*complete prior-knowledge diagnostic/i.test(text))return 'Before you start · Prior knowledge check';
  if(/^Hodder p\.\s*\d+\s*·\s*complete file-I\/O diagnostic/i.test(text))return 'Before you start · File I/O knowledge check';
  text=text.replace(/^Hodder p\.\s*\d+\s*·\s*/i,'');

  text=text.replace(/\bHodder’s\b/gi,'The coursebook’s');
  text=text.replace(/\bHodder\b/gi,'The coursebook');
  text=text.replace(/\bCamPath[’']s\b/gi,'The current lesson’s');
  text=text.replace(/\bCamPath intentionally does not substitute\b/gi,'This lesson does not substitute');
  text=text.replace(/\bCamPath keeps\b/gi,'This lesson keeps');
  text=text.replace(/\bCamPath preserves\b/gi,'This lesson preserves');

  text=capitalise(text);
  if(/^(?:Why|How|What)\b/i.test(text)){
    text=stripTerminalPeriod(text);
    if(!/[?!]$/.test(text))text+='?';
  }
  return text;
}

/** Source-fidelity audit blocks can be exact and useful to teachers without being useful learner copy. */
function isLearnerBlock(block:LessonRichBlock){
  if(block.kind==='steps' && block.title && /^Hodder p\.\s*\d+\s*·\s*complete (?:prior-knowledge|file-I\/O) diagnostic/i.test(block.title))return false;
  if(block.kind==='bullets' && block.items.length===1 && /^Chapter source scope:/i.test(block.items[0]??''))return false;
  if(block.kind==='callout' && /^Board diagnostic$/i.test(block.title))return false;
  return true;
}

function projectRichBlock(block:LessonRichBlock):LessonRichBlock{
  if(block.kind==='paragraph')return {...block,text:studentFacingText(block.text)};
  if(block.kind==='bullets')return {...block,items:block.items.map(studentFacingText)};
  if(block.kind==='steps')return {...block,title:block.title?studentFacingText(block.title):block.title,items:block.items.map(studentFacingText)};
  if(block.kind==='callout')return {...block,title:studentFacingText(block.title),text:studentFacingText(block.text)};
  if(block.kind==='comparison')return {...block,leftTitle:studentFacingText(block.leftTitle),rightTitle:studentFacingText(block.rightTitle),rows:block.rows.map(([left,right])=>[studentFacingText(left),studentFacingText(right)])};
  if(block.kind==='source-note')return {...block,title:studentFacingText(block.title),sourceLabel:'Coursebook wording',sourceText:studentFacingText(block.sourceText),examSafeLabel:'Exam-ready wording',examSafeText:studentFacingText(block.examSafeText)};
  if(block.kind==='table')return {...block,table:{...block.table,caption:block.table.caption?studentFacingText(block.table.caption):block.table.caption,headers:block.table.headers.map(studentFacingText),rows:block.table.rows.map(row=>row.map(studentFacingText))}};
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
    example:slide.example?{...slide.example,title:studentFacingText(slide.example.title),lines:slide.example.lines.map(studentFacingText),answer:slide.example.answer?studentFacingText(slide.example.answer):slide.example.answer}:slide.example,
    teacherPrompt:slide.teacherPrompt?studentFacingText(slide.teacherPrompt):slide.teacherPrompt,
    activity:slide.activity?{...slide.activity,title:studentFacingText(slide.activity.title),prompt:studentFacingText(slide.activity.prompt),reveal:slide.activity.reveal?studentFacingText(slide.activity.reveal):slide.activity.reveal}:slide.activity,
    richBlocks:slide.richBlocks?.filter(isLearnerBlock).map(projectRichBlock),
  };
}

export function lessonPurpose(slide:LessonSlide){
  if(slide.examPractice)return 'CAMBRIDGE PRACTICE';
  if(/recap|review|summary/i.test(`${slide.section} ${slide.title}`))return 'RECAP';
  if(slide.activity)return 'YOUR TURN';
  if(slide.example)return 'WORKED EXAMPLE';
  return 'LEARN';
}
