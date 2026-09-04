export type SourcePageTranscript = {
  /** 1-based page number inside the uploaded extract PDF. */
  pdfPage: number;
  /** Page number printed by the textbook itself. */
  printedPage: number;
  /** SHA-256 of the normalized extracted text for regression protection. */
  sha256: string;
  /** Full text-layer content for this page, kept source-faithful and line-preserving. */
  text: string;
};

export type SourcePageTranscriptCollection = {
  sourceFile: string;
  sourceFileSha256: string;
  pageCount: number;
  pages: SourcePageTranscript[];
};
