import { createHash } from 'node:crypto';

export type LiveAtomicPoint = {
  id: string;
  code: string;
  text: string;
  marks: number;
  accept: unknown;
  reject: unknown;
  requires: unknown;
  isBod: boolean;
  groupId: string | null;
};

export type LiveAtomicGroup = {
  id: string;
  label: string | null;
  nRequired: number;
  marksPerPoint: number;
  maxMarks: number;
  awardMode: 'fixed' | 'point_marks';
};

export type LiveMarkSchemeForNormalization = {
  id: string;
  schemeType: string;
  maxMarks: number;
  guidanceMd: string | null;
  points: LiveAtomicPoint[];
  groups: LiveAtomicGroup[];
};

type ParsedRubric = {
  schemeType: 'all_required' | 'any_n_from_m' | 'manual_only';
  points: LiveAtomicPoint[];
  groups: LiveAtomicGroup[];
};

type BulletSection = {
  cap: number | null;
  label: string;
  bullets: string[];
  manualOnly: boolean;
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function stableUuid(seed: string) {
  const chars=createHash('sha256').update(seed).digest('hex').slice(0,32).split('');
  chars[12]='4';
  chars[16]=['8','9','a','b'][Number.parseInt(chars[16]!,16)%4]!;
  const hex=chars.join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}

function numberValue(raw: string | undefined) {
  if (!raw) return null;
  const compact=raw.toLowerCase().replace(/\s+/g,'');
  if (/^\d+$/.test(compact)) return Number(compact);
  return NUMBER_WORDS[compact] ?? null;
}

function normalizeOcrWords(value: string) {
  return value
    .replace(/\bt\s+wo\b/gi,'two')
    .replace(/\bt\s+hree\b/gi,'three')
    .replace(/\bf\s+our\b/gi,'four')
    .replace(/\bf\s+ive\b/gi,'five')
    .replace(/\bs\s+ix\b/gi,'six')
    .replace(/\bs\s+even\b/gi,'seven')
    .replace(/\be\s+ight\b/gi,'eight')
    .replace(/\bn\s+ine\b/gi,'nine')
    .replace(/\bt\s+en\b/gi,'ten');
}

function sourceLines(value: string) {
  const lines=value.replace(/\r/g,'').split('\n').map((line)=>line.trim()).filter(Boolean);
  const safe:string[]=[];
  for (const line of lines) {
    if (/^(?:Trace ID:|Re-uploading,|Licensed for hosting|Downloaded from PapaCambridge|PUBLISHED\b|Question\s+Answer\s+Marks\b)/i.test(line)) break;
    if (/^(?:0478|9618)\s*\/\s*\d+/i.test(line) && /Mark Scheme/i.test(line)) break;
    safe.push(line);
  }
  return safe;
}

function headerInfo(line: string, fallbackMax: number) {
  const normalized=normalizeOcrWords(line);
  const from=normalized.match(/\b(?:any\s+)?(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+from\b/i);
  const max=normalized.match(/\bmax(?:imum)?\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i);
  const oneMark=/\b(?:one|1)\s+mark(?:s)?\b/i.test(normalized)
    && /\b(?:each|per\s+mark\s+point|for\s+each|for\s+every)\b/i.test(normalized);
  const pairedRubric=/\b(?:expansion|matching\s+description|matching\s+explanation)\b/i.test(normalized);
  if (!from && !max && !oneMark) return null;
  const cap=numberValue(max?.[1]) ?? numberValue(from?.[1]) ?? (oneMark ? fallbackMax : null);
  const labelMatch=normalized.match(/(?:one|1)\s+mark\s+(?:per\s+mark\s+point|for\s+each\s+mark\s+point)\s+for\s+([^,:]+?)(?:,|\s+max\b)/i);
  return { cap, label: labelMatch?.[1]?.trim() || 'main', manualOnly:pairedRubric };
}

function cleanCriterion(value: string) {
  return value.replace(/^[-–—:]\s*/,'').replace(/\s+/g,' ').trim();
}

function makePoint(
  schemeId:string,
  index:number,
  code:string,
  text:string,
  groupId:string|null,
  requires:string[]=[],
):LiveAtomicPoint {
  return {
    id:stableUuid(`${schemeId}:live-atomic-point:${index}:${code}`),
    code,
    text:cleanCriterion(text),
    marks:1,
    accept:[],
    reject:[],
    requires,
    isBod:false,
    groupId,
  };
}

function parseExplicitMp(source:string,schemeId:string,maxMarks:number):ParsedRubric|null {
  const normalized=normalizeOcrWords(source);
  const structuralCue=/(?:\b(?:one|1)\s+mark\s+(?:per\s+mark\s+point|for\s+each\s+mark\s+point|each)\b|\bmark\s+(?:as\s+follows|points?)\b)/i.test(normalized);
  if (!structuralCue) return null;
  const lines=sourceLines(source);
  const rows:Array<{number:number;text:string[]}>=[];
  let current:{number:number;text:string[]}|null=null;
  const seen=new Set<number>();
  for (const line of lines) {
    if (/^(?:for example|example|correct code)\s*[:,]?$/i.test(line)) break;
    const match=line.match(/^MP\s*(\d+)\s*(.*)$/i);
    if (match) {
      const number=Number(match[1]);
      const rest=cleanCriterion(match[2]??'');
      if (!rest || /^(?:and\s+MP\b|BOD\b|accept\b|allow\b|do\s+not\b|must\b|dependent\b|TV\b|NE\b|is\b)/i.test(rest)) {
        current=null;
        continue;
      }
      if (seen.has(number)) return null;
      seen.add(number);
      current={number,text:[rest]};
      rows.push(current);
      continue;
    }
    if (current && !/^•/.test(line) && !headerInfo(line,maxMarks)) current.text.push(line);
  }
  if (rows.length<maxMarks) return null;
  const groupNeeded=rows.length>maxMarks;
  const groupId=groupNeeded?stableUuid(`${schemeId}:live-atomic-group:explicit`):null;
  const points=rows.map((row,index)=>makePoint(
    schemeId,index,`MP${row.number}`,row.text.join(' '),groupId,
  ));
  return {
    schemeType:groupNeeded?'any_n_from_m':'all_required',
    points,
    groups:groupNeeded?[{
      id:groupId!,
      label:'main',
      nRequired:maxMarks,
      marksPerPoint:1,
      maxMarks,
      awardMode:'fixed',
    }]:[],
  };
}

function parseBulletSections(source:string,schemeId:string,maxMarks:number):ParsedRubric|null {
  const lines=sourceLines(source);
  const sections:BulletSection[]=[];
  let section:BulletSection|null=null;
  let currentBullet=-1;
  let sawAwardHeader=false;

  for (const line of lines) {
    const header=headerInfo(line,maxMarks);
    if (header && !/^•/.test(line)) {
      sawAwardHeader=true;
      if (section?.bullets.length) {
        section=null;
      }
      if (!section) {
        section={cap:header.cap,label:header.label,bullets:[],manualOnly:header.manualOnly};
        sections.push(section);
      } else {
        section.cap=header.cap;
        section.label=header.label;
        section.manualOnly=section.manualOnly||header.manualOnly;
      }
      currentBullet=-1;
      continue;
    }
    if (/^•/.test(line)) {
      if (!section) {
        section={cap:null,label:'main',bullets:[],manualOnly:false};
        sections.push(section);
      }
      section.bullets.push(cleanCriterion(line.replace(/^•\s*/,'')));
      currentBullet=section.bullets.length-1;
      continue;
    }
    if (section && currentBullet>=0) {
      if (/^(?:for example|example|correct code)\s*:?/i.test(line)) {
        currentBullet=-1;
        continue;
      }
      section.bullets[currentBullet]=cleanCriterion(`${section.bullets[currentBullet]} ${line}`);
    }
  }

  const nonEmpty=sections.filter((item)=>item.bullets.length);
  if (!sawAwardHeader || !nonEmpty.length) return null;
  const resolved=nonEmpty.map((item)=>({
    ...item,
    cap:item.cap ?? (nonEmpty.length===1?maxMarks:null),
  }));
  if (resolved.some((item)=>!item.cap || item.cap<1 || item.bullets.length<item.cap)) return null;
  const capSum=resolved.reduce((sum,item)=>sum+(item.cap??0),0);
  if (capSum!==maxMarks) return null;

  const needGroups=resolved.length>1 || resolved.some((item)=>item.bullets.length!==(item.cap??0));
  const groups:LiveAtomicGroup[]=[];
  const points:LiveAtomicPoint[]=[];
  let pointIndex=0;
  for (const [sectionIndex,item] of resolved.entries()) {
    const groupId=needGroups?stableUuid(`${schemeId}:live-atomic-group:${sectionIndex}`):null;
    if (groupId) groups.push({
      id:groupId,
      label:item.label||'main',
      nRequired:item.cap!,
      marksPerPoint:1,
      maxMarks:item.cap!,
      awardMode:'fixed',
    });
    let previousCode:string|null=null;
    for (const bullet of item.bullets) {
      const code=`MP${pointIndex+1}`;
      const dependsOnPrevious=/^(?:…|\.\.\.)/.test(bullet) && previousCode ? [previousCode] : [];
      points.push(makePoint(schemeId,pointIndex,code,bullet,groupId,dependsOnPrevious));
      previousCode=code;
      pointIndex+=1;
    }
  }
  if (points.length<maxMarks) return null;
  return {
    schemeType:resolved.some((item)=>item.manualOnly)
      ?'manual_only'
      :(needGroups?'any_n_from_m':'all_required'),
    points,
    groups,
  };
}

function parseOneMarkClauses(source:string,schemeId:string,maxMarks:number):ParsedRubric|null {
  const criteria:string[]=[];
  for (const line of sourceLines(source).slice(0,12)) {
    const matches=[...line.matchAll(/one\s+mark\s+for\s+(.+?)(?=(?:,\s*)?one\s+mark\s+for\b|$)/gi)];
    for (const match of matches) {
      const value=cleanCriterion(match[1]??'');
      if (value) criteria.push(value);
    }
  }
  if (criteria.length!==maxMarks) return null;
  return {
    schemeType:'all_required',
    points:criteria.map((text,index)=>makePoint(schemeId,index,`MP${index+1}`,text,null)),
    groups:[],
  };
}

/**
 * Historical source ingestion stored many multi-mark Cambridge rubrics as one
 * synthetic M1 row worth the whole question. Live Challenge must never present
 * that row as if it were a single Cambridge marking point.
 *
 * High-confidence source layouts are expanded into 1-mark atomic points.
 * Ambiguous manual rubrics fail safe to numeric/manual scoring with the full
 * original guidance still visible instead of inventing MP boundaries.
 */
export function normalizeCollapsedLiveMarkScheme<T extends LiveMarkSchemeForNormalization>(scheme:T):T {
  const only=scheme.points.length===1?scheme.points[0]:null;
  const collapsed=Boolean(
    only
    && scheme.maxMarks>1
    && only.marks===scheme.maxMarks
    && /^M(?:P)?1$/i.test(only.code),
  );
  if (!collapsed) return scheme;

  const source=(scheme.guidanceMd?.trim() || only?.text.trim() || '');
  if (!source) return scheme;

  const parsed=parseExplicitMp(source,scheme.id,scheme.maxMarks)
    ?? parseBulletSections(source,scheme.id,scheme.maxMarks)
    ?? parseOneMarkClauses(source,scheme.id,scheme.maxMarks);

  if (parsed) return {
    ...scheme,
    schemeType:parsed.schemeType,
    guidanceMd:scheme.guidanceMd || source,
    points:parsed.points,
    groups:parsed.groups,
  } as T;

  if (scheme.schemeType==='manual_only') return {
    ...scheme,
    guidanceMd:scheme.guidanceMd || source,
    points:[],
    groups:[],
  } as T;

  return scheme;
}
