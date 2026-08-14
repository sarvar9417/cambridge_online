import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Claude wrapper.
 *
 * R9: this package is only ever imported by `apps/worker`. `ANTHROPIC_API_KEY`
 * exists in the worker environment alone, so an AI call can only happen by going
 * through the queue — the API process cannot make one even by mistake.
 *
 * R7: prompts are versioned files under `prompts/`, never inline strings, and
 * the version used is written to the database with every call.
 */

export const DEFAULT_MODEL = 'claude-sonnet-4-6';

const PROMPTS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'prompts');

export interface PromptFile {
  version: string;
  body: string;
}

const promptCache = new Map<string, PromptFile>();

/** Loads `prompts/<name>.v<N>.md` and returns its body plus its version id. */
export async function loadPrompt(name: string, version: number): Promise<PromptFile> {
  const key = `${name}.v${version}`;
  const cached = promptCache.get(key);
  if (cached) return cached;

  const body = await readFile(join(PROMPTS_DIR, `${key}.md`), 'utf8');
  const prompt: PromptFile = { version: key, body };
  promptCache.set(key, prompt);
  return prompt;
}

export interface AiUsage {
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  latencyMs: number;
}

export interface AiResponse<T> {
  data: T;
  usage: AiUsage;
  raw: unknown;
}

export interface ClaudeClientOptions {
  apiKey: string;
  model?: string;
  /** Injectable so tests drive the client without a network call. */
  fetchImpl?: typeof fetch;
}

/** Per-million-token prices, used to fill `ai_calls.cost_usd`. */
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3, output: 15 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICING[model] ?? PRICING[DEFAULT_MODEL]!;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

export class AiOutputError extends Error {
  constructor(
    message: string,
    readonly rawText: string,
  ) {
    super(message);
  }
}

/**
 * Extracts the JSON object from a model response. Prompts say "no markdown
 * fences", but a fence still appears often enough that silently failing on it
 * would waste calls; anything else is an error rather than a guess.
 */
export function parseJsonResponse<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced?.[1] ?? text).trim();
  try {
    return JSON.parse(candidate) as T;
  } catch (error) {
    throw new AiOutputError(`Model did not return JSON: ${(error as Error).message}`, text);
  }
}

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
  model: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

export class ClaudeClient {
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ClaudeClientOptions) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /**
   * Sends one message and returns the parsed JSON plus the usage record that the
   * caller must write to `ai_calls`.
   */
  async complete<T>(input: {
    prompt: PromptFile;
    userContent: string;
    maxTokens?: number;
  }): Promise<AiResponse<T>> {
    const startedAt = Date.now();
    const response = await this.fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.options.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: input.maxTokens ?? 4096,
        system: [{ type: 'text', text: input.prompt.body, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: input.userContent }],
      }),
    });

    if (!response.ok) {
      throw new AiOutputError(`Anthropic API ${response.status}`, await response.text());
    }

    const body = (await response.json()) as AnthropicResponse;
    const text = body.content.map((block) => block.text ?? '').join('');
    const inputTokens = body.usage?.input_tokens ?? 0;
    const outputTokens = body.usage?.output_tokens ?? 0;

    return {
      data: parseJsonResponse<T>(text),
      raw: body,
      usage: {
        model: body.model ?? this.model,
        promptVersion: input.prompt.version,
        inputTokens,
        outputTokens,
        cacheReadTokens: body.usage?.cache_read_input_tokens ?? 0,
        cacheWriteTokens: body.usage?.cache_creation_input_tokens ?? 0,
        costUsd: estimateCostUsd(this.model, inputTokens, outputTokens),
        latencyMs: Date.now() - startedAt,
      },
    };
  }
}
