type PortableAsset = {
  id?: unknown;
  kind?: unknown;
  url?: unknown;
  contentMd?: unknown;
  altText?: unknown;
  sortOrder?: unknown;
  sourcePage?: unknown;
};

type PortableContextBlock = {
  label?: unknown;
  displayRef?: unknown;
  depth?: unknown;
  context?: unknown;
  contextLatex?: unknown;
  assets?: PortableAsset[];
};

type PortableLeaf = {
  label?: unknown;
  path?: unknown;
  displayRef?: unknown;
  stem?: unknown;
  stemLatex?: unknown;
  bodyFormat?: unknown;
  contentJson?: unknown;
  commandWord?: unknown;
  marks?: unknown;
  answerKind?: unknown;
  answerLines?: unknown;
};

type PortableQuestion = {
  leaf?: PortableLeaf;
  contextBlocks?: PortableContextBlock[];
  sourceRef?: unknown;
};

type BoardMarkSchemePoint = {
  code?: unknown;
  text?: unknown;
  marks?: unknown;
  accept?: unknown;
  reject?: unknown;
  isBod?: unknown;
};

type BoardMarkSchemeGroup = {
  label?: unknown;
  nRequired?: unknown;
  marksPerPoint?: unknown;
  maxMarks?: unknown;
  awardMode?: unknown;
};

type BoardMarkScheme = {
  schemeType?: unknown;
  maxMarks?: unknown;
  guidanceMd?: unknown;
  points?: BoardMarkSchemePoint[];
  groups?: BoardMarkSchemeGroup[];
};

type BoardSource = {
  session: {
    title?: unknown;
    className?: unknown;
    status?: unknown;
    currentQuestionIndex?: unknown;
    questionCount?: unknown;
    participantCount?: unknown;
    submittedCount?: unknown;
    reviewCount?: unknown;
    reviewedCount?: unknown;
    deadline?: unknown;
    serverNow?: unknown;
    joinCode?: unknown;
  };
  question?: {
    position?: unknown;
    marks?: unknown;
    portable?: PortableQuestion;
  } | null;
  markScheme?: BoardMarkScheme | null;
};

const text = (value: unknown) => typeof value === 'string' ? value : null;
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;
const bool = (value: unknown) => typeof value === 'boolean' ? value : null;
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function safeSourceLocation(value:unknown) {
  if(!object(value))return null;
  const page=number(value.page);
  const bbox=Array.isArray(value.bbox)&&value.bbox.length===4&&value.bbox.every((item)=>number(item)!==null)
    ? value.bbox.map((item)=>Number(item))
    : null;
  return page===null?null:{page,bbox};
}

/**
 * StructuredQuestionContent contains canonical paper/asset UUIDs and source
 * hashes. The shared board needs the source-faithful blocks, not those internal
 * identifiers, so transform it into a presentation-only block list.
 */
function projectStructuredBlocks(contentJson:unknown, contextBlocks:PortableContextBlock[]) {
  if(!object(contentJson)||!Array.isArray(contentJson.blocks))return null;
  const assetsById=new Map<string,PortableAsset>();
  for(const context of contextBlocks){
    for(const asset of context.assets??[]){
      const assetId=text(asset.id);
      if(assetId)assetsById.set(assetId,asset);
    }
  }

  const blocks:Record<string,unknown>[]=[];
  for(const candidate of contentJson.blocks){
    if(!object(candidate))continue;
    const type=text(candidate.type);
    const source=safeSourceLocation(candidate.source);
    if(!type)continue;

    if(type==='text'){
      blocks.push({type,style:text(candidate.style),text:text(candidate.text),source});
    }else if(type==='math'){
      blocks.push({type,semantics:text(candidate.semantics),latex:text(candidate.latex),display:bool(candidate.display),source});
    }else if(type==='code'){
      blocks.push({type,language:text(candidate.language),text:text(candidate.text),source});
    }else if(type==='list'){
      blocks.push({type,items:Array.isArray(candidate.items)?candidate.items.map(text).filter((item):item is string=>item!==null):[],source});
    }else if(type==='table'){
      const headers=Array.isArray(candidate.headers)?candidate.headers.map(text).filter((item):item is string=>item!==null):[];
      const rows=Array.isArray(candidate.rows)?candidate.rows.map((row)=>Array.isArray(row)?row.map((cell)=>cell===null?null:text(cell)):[]):[];
      blocks.push({type,kind:text(candidate.kind),headers,rows,source});
    }else if(type==='matching'){
      const projectSide=(value:unknown,prefix:string)=>Array.isArray(value)?value.flatMap((item,index)=>object(item)&&text(item.text)?[{key:`${prefix}${index+1}`,text:text(item.text)!}]:[]):[];
      blocks.push({type,left:projectSide(candidate.left,'L'),right:projectSide(candidate.right,'R'),source});
    }else if(type==='asset'){
      const internalAssetId=text(candidate.assetId);
      const asset=internalAssetId?assetsById.get(internalAssetId):undefined;
      blocks.push({
        type,
        kind:text(candidate.kind)??text(asset?.kind),
        altText:text(candidate.altText)??text(asset?.altText),
        url:text(asset?.url),
        contentMd:text(asset?.contentMd),
        sourcePage:number(asset?.sourcePage),
        source,
      });
    }else if(type==='answer_area'){
      blocks.push({type,kind:text(candidate.kind),lines:number(candidate.lines),source});
    }
  }
  return blocks.length?blocks:null;
}

/**
 * Learner-safe projection for the shared classroom board.
 *
 * The teacher snapshot contains participant identities, answer text, review
 * assignments, moderation state and internal database identifiers. The board
 * contract is an explicit allow-list instead: only classroom-facing state,
 * source-faithful question content and the already-authorised Mark Scheme can
 * cross this boundary.
 */
export function projectLiveExamForBoard(source: BoardSource) {
  const session = source.session;
  const portable = source.question?.portable;
  const leaf = portable?.leaf;
  const contexts=portable?.contextBlocks??[];

  const question = source.question && portable && leaf ? {
    position: number(source.question.position),
    marks: number(source.question.marks),
    sourceRef: text(portable.sourceRef),
    leaf: {
      label: text(leaf.label),
      path: text(leaf.path),
      displayRef: text(leaf.displayRef),
      stem: text(leaf.stem),
      stemLatex: text(leaf.stemLatex),
      bodyFormat: text(leaf.bodyFormat),
      // Raw StructuredQuestionContent contains paper UUID/hash and asset UUIDs.
      // The board receives only the presentation-safe transformed blocks below.
      contentJson: null,
      structuredBlocks: projectStructuredBlocks(leaf.contentJson,contexts),
      commandWord: text(leaf.commandWord),
      marks: number(leaf.marks),
      answerKind: text(leaf.answerKind),
      answerLines: number(leaf.answerLines),
    },
    contextBlocks: contexts.map((block) => ({
      label: text(block.label),
      displayRef: text(block.displayRef),
      depth: number(block.depth),
      context: text(block.context),
      contextLatex: text(block.contextLatex),
      assets: (block.assets ?? []).map((asset) => ({
        kind: text(asset.kind),
        url: text(asset.url),
        contentMd: text(asset.contentMd),
        altText: text(asset.altText),
        sortOrder: number(asset.sortOrder),
        sourcePage: number(asset.sourcePage),
      })),
    })),
  } : null;

  const status = text(session.status);
  const showJoinCode = status === 'lobby';
  const scheme = source.markScheme;
  const markScheme = scheme ? {
    schemeType: text(scheme.schemeType),
    maxMarks: number(scheme.maxMarks),
    guidanceMd: text(scheme.guidanceMd),
    points: (scheme.points ?? []).map((point) => ({
      code: text(point.code),
      text: text(point.text),
      marks: number(point.marks),
      accept: point.accept ?? null,
      reject: point.reject ?? null,
      isBod: bool(point.isBod),
    })),
    groups: (scheme.groups ?? []).map((group) => ({
      label: text(group.label),
      nRequired: number(group.nRequired),
      marksPerPoint: number(group.marksPerPoint),
      maxMarks: number(group.maxMarks),
      awardMode: text(group.awardMode),
    })),
  } : null;

  return {
    session: {
      title: text(session.title),
      className: text(session.className),
      status,
      currentQuestionIndex: number(session.currentQuestionIndex),
      questionCount: number(session.questionCount),
      participantCount: number(session.participantCount),
      submittedCount: number(session.submittedCount),
      reviewCount: number(session.reviewCount),
      reviewedCount: number(session.reviewedCount),
      deadline: session.deadline ?? null,
      serverNow: session.serverNow ?? null,
      joinCode: showJoinCode ? text(session.joinCode) : null,
    },
    question,
    // snapshot() enforces the reveal boundary; this second allow-list strips
    // Mark Scheme row ids/group ids and any future moderation-only metadata.
    markScheme,
  };
}
