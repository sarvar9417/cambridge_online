export type ConnectedHodderPageFingerprint = {
  printedPage: number;
  sha256: string;
};

export type ConnectedHodderSourceManifest = {
  syllabus: '9618' | '0478';
  chapter: number;
  sourceFile: string;
  sourceFileSha256: string;
  sourceFilePageCount: number;
  physicalPageRange: readonly [number, number];
  printedPageRange: readonly [number, number];
  pages: readonly ConnectedHodderPageFingerprint[];
};

export type RejectedConnectedHodderSourceEvidence = {
  syllabus: '9618' | '0478';
  requestedChapter: number;
  sourceFile: string;
  exportedSourceSha256: string;
  exportedPageCount: number;
  terminalPrintedPage: number;
  reason: string;
};

/**
 * Connected full-book locks must be derived from the bytes we can actually
 * retrieve during source verification. A Drive title alone is not proof that
 * the backing export contains the requested chapter.
 */
export const CONNECTED_HODDER_SOURCE_MANIFESTS: readonly ConnectedHodderSourceManifest[] = [];

/**
 * The connected Drive item named like the full 9618 Hodder coursebook currently
 * exports as a 97-page PDF whose text terminates in Chapter 2 (printed p.64).
 * It therefore cannot ground Chapter 3 (printed pp.68-106). Keep the observed
 * export identity here so a misleading filename/title cannot reactivate the
 * Chapter 3 draft without fresh byte-level verification.
 */
export const CHAPTER_3_CONNECTED_HODDER_SOURCE_REJECTION: RejectedConnectedHodderSourceEvidence = {
  syllabus: '9618',
  requestedChapter: 3,
  sourceFile: '9618 Coursebook Book (Hodder Education).pdf',
  exportedSourceSha256: '3994b727128cea398b0622ff1ae83a643edf9a3a654cbd3d548b1c5f65c06126',
  exportedPageCount: 97,
  terminalPrintedPage: 64,
  reason: 'Connected export ends in Chapter 2 and does not contain the requested Chapter 3 source pages.',
};
