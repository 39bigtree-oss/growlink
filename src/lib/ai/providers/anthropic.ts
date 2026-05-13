import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { modelIdFor, type CompleteOptions, type CompleteResult } from "../client";

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 500; // 0.5s → 1s → 2s → 4s
const DEFAULT_TIMEOUT_MS = 30_000;

let cachedClient: Anthropic | null = null;
function client(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. AI_PROVIDER=anthropic requires a valid API key.");
  }
  cachedClient = new Anthropic({
    apiKey,
    timeout: DEFAULT_TIMEOUT_MS,
    maxRetries: 0, // 自前で指数バックオフするため SDK 側は無効化
  });
  return cachedClient;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    if (err.status === 429) return true; // rate limited
    if (typeof err.status === "number" && err.status >= 500) return true;
  }
  return false;
}

export const anthropicProvider = {
  name: "anthropic",
  async complete<T = unknown>(opts: CompleteOptions): Promise<CompleteResult<T>> {
    const model = modelIdFor(opts.model);
    const maxTokens = opts.maxTokens ?? 1024;
    const wantsJson = Boolean(opts.jsonSchema);

    const system = wantsJson
      ? `${opts.system}\n\n以下の JSON Schema に厳密に従い、JSON のみを出力してください:\n${JSON.stringify(
          opts.jsonSchema,
          null,
          2,
        )}`
      : opts.system;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const resp = await client().messages.create({
          model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: opts.user }],
        });
        const text = resp.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((b) => b.text)
          .join("");

        if (wantsJson) {
          const json = extractJson(text);
          return { ok: true, kind: "json", data: json as T, provider: "anthropic" };
        }
        return { ok: true, kind: "text", text, provider: "anthropic" };
      } catch (err) {
        if (attempt < MAX_RETRIES && isRetryable(err)) {
          const delay = BASE_DELAY_MS * 2 ** attempt;
          await sleep(delay);
          continue;
        }
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: `anthropic_failed: ${message}`, provider: "anthropic" };
      }
    }
    return { ok: false, error: "anthropic_exhausted_retries", provider: "anthropic" };
  },
};

/**
 * Claude の応答テキストから JSON を抽出する。コードフェンスで囲まれている場合に対応。
 */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // ```json ... ``` フェンスを剥がす
  const fence = /^```(?:json)?\s*([\s\S]+?)```$/m.exec(trimmed);
  const candidate = fence?.[1] ?? trimmed;
  return JSON.parse(candidate);
}
