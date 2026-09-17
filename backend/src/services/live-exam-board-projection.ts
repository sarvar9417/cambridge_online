type PortableAsset = {
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
      contentJson: leaf.contentJson ?? null,
      commandWord: text(leaf.commandWord),
      marks: number(leaf.marks),
      answerKind: text(leaf.answerKind),
      answerLines: number(leaf.answerLines),
    },
    contextBlocks: (portable.contextBlocks ?? []).map((block) => ({
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
