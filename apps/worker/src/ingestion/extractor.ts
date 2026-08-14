import { ClaudeClient, loadPrompt, type AiUsage } from '@campath/ai';
import type {
  Classification,
  CrossCheckVerdict,
  DetectedDependency,
  ExtractQpBatch,
  ExtractedQuestion,
  ExtractedScheme,
} from './types.js';
import type { PreparedPage } from './prepare.js';
import { readPageImage } from './prepare.js';
import type { DependencyCandidate } from './pipeline.js';

/**
 * The seam between the pipeline and the model.
 *
 * Every method returns the parsed result plus the `AiUsage` the caller must
 * write to `ai_calls` (R7). Nothing here decides anything: the model reports,
 * the deterministic rules judge.
 */
export interface Extractor {
  available(): boolean;
  extractQuestions(input: {
    pages: PreparedPage[];
    metadata: Record<string, unknown>;
    priorRefs: string[];
  }): Promise<{ batch: ExtractQpBatch; usage: AiUsage }>;
  extractMarkScheme(input: {
    pages: PreparedPage[];
    metadata: Record<string, unknown>;
  }): Promise<{ schemes: ExtractedScheme[]; usage: AiUsage }>;
  classify(input: {
    question: ExtractedQuestion;
    scheme: ExtractedScheme | null;
    subtopics: Array<{ code: string; title: string }>;
    componentName: string;
    level: string;
  }): Promise<{ classification: Classification; usage: AiUsage }>;
  detectDependencies(input: {
    questions: ExtractedQuestion[];
    candidates: DependencyCandidate[];
  }): Promise<{ dependencies: DetectedDependency[]; usage: AiUsage }>;
  crossCheck(input: {
    pages: PreparedPage[];
    question: ExtractedQuestion;
    scheme: ExtractedScheme | null;
  }): Promise<{ verdict: CrossCheckVerdict; usage: AiUsage }>;
}

export class AiUnavailableError extends Error {
  readonly code = 'ai_unavailable';
  constructor() {
    super('ANTHROPIC_API_KEY is not set in the worker environment');
  }
}

/**
 * Serialises pages for the model: the text layer inline, the render as an image
 * block. Both go in the same message so the "trust the text for wording, the
 * image for layout" instruction has something to apply to.
 */
async function pageBlocks(pages: PreparedPage[]) {
  const blocks: Array<Record<string, unknown>> = [];
  for (const page of pages) {
    blocks.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: await readPageImage(page) },
    });
    blocks.push({
      type: 'text',
      text: `## Text layer, page ${page.page}\n\n${page.textLayer}`,
    });
  }
  return blocks;
}

export class ClaudeExtractor implements Extractor {
  constructor(private readonly client: ClaudeClient | null) {}

  available() {
    return this.client !== null;
  }

  private require(): ClaudeClient {
    if (!this.client) throw new AiUnavailableError();
    return this.client;
  }

  async extractQuestions(input: {
    pages: PreparedPage[];
    metadata: Record<string, unknown>;
    priorRefs: string[];
  }) {
    const prompt = await loadPrompt('extract-question', 1);
    const response = await this.require().complete<ExtractQpBatch>({
      prompt,
      userContent: JSON.stringify({
        metadata: input.metadata,
        prior_refs: input.priorRefs,
        pages: await pageBlocks(input.pages),
      }),
      maxTokens: 8192,
    });
    return { batch: response.data, usage: response.usage };
  }

  async extractMarkScheme(input: { pages: PreparedPage[]; metadata: Record<string, unknown> }) {
    const prompt = await loadPrompt('extract-markscheme', 1);
    const response = await this.require().complete<{ schemes: ExtractedScheme[] }>({
      prompt,
      userContent: JSON.stringify({
        metadata: input.metadata,
        pages: await pageBlocks(input.pages),
      }),
      maxTokens: 8192,
    });
    return { schemes: response.data.schemes ?? [], usage: response.usage };
  }

  async classify(input: {
    question: ExtractedQuestion;
    scheme: ExtractedScheme | null;
    subtopics: Array<{ code: string; title: string }>;
    componentName: string;
    level: string;
  }) {
    const prompt = await loadPrompt('classify-question', 1);
    const response = await this.require().complete<Classification>({
      prompt,
      userContent: JSON.stringify({
        stem_md: input.question.stemMd,
        command_word: input.question.commandWord,
        marks: input.question.marks,
        component_name: input.componentName,
        level: input.level,
        // The mark scheme is stronger evidence than the stem: what the examiner
        // rewards says what is being tested, while the stem is often scenario.
        mark_scheme_points: input.scheme?.points.map((point) => point.text) ?? [],
        subtopics: input.subtopics,
      }),
      maxTokens: 2048,
    });
    return {
      classification: { ...response.data, path: input.question.path },
      usage: response.usage,
    };
  }

  async detectDependencies(input: {
    questions: ExtractedQuestion[];
    candidates: DependencyCandidate[];
  }) {
    const prompt = await loadPrompt('detect-dependencies', 1);
    const response = await this.require().complete<{ dependencies: DetectedDependency[] }>({
      prompt,
      userContent: JSON.stringify({
        tree: input.questions.map((question) => ({
          path: question.path,
          stem_md: question.stemMd,
          context_md: question.contextMd,
        })),
        candidates: input.candidates,
      }),
      maxTokens: 4096,
    });
    return { dependencies: response.data.dependencies ?? [], usage: response.usage };
  }

  async crossCheck(input: {
    pages: PreparedPage[];
    question: ExtractedQuestion;
    scheme: ExtractedScheme | null;
  }) {
    const prompt = await loadPrompt('cross-check', 1);
    const response = await this.require().complete<Omit<CrossCheckVerdict, 'path'>>({
      prompt,
      userContent: JSON.stringify({
        extraction: { question: input.question, scheme: input.scheme },
        pages: await pageBlocks(input.pages),
      }),
      maxTokens: 2048,
    });
    return {
      verdict: { ...response.data, path: input.question.path },
      usage: response.usage,
    };
  }
}
