import "server-only";

import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type Part,
} from "@google/generative-ai";

import type { AiModelTier, CompleteOptions, CompleteResult } from "../client";

/**
 * Gemini Provider (Phase v1 final).
 *
 * `AI_PROVIDER=gemini` で有効化。GEMINI_API_KEY が必要。
 * モデルは GEMINI_MODEL_SMART / GEMINI_MODEL_FAST で切替。
 *
 * 設計判断 (Recommended):
 *  - Anthropic と同じインタフェース (CompleteOptions / CompleteResult) を踏襲
 *  - JSON 出力時は responseMimeType="application/json" を指定 (Gemini ネイティブ)
 *  - 5xx / 429 は最大 4 回まで指数バックオフでリトライ
 *  - 失敗は throw せず CompleteResult.ok=false を返し、呼び出し側でフォールバック可能に
 */

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 500;

let cachedClient: GoogleGenerativeAI | null = null;
function client(): GoogleGenerativeAI {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. AI_PROVIDER=gemini requires a valid API key.");
  }
  cachedClient = new GoogleGenerativeAI(apiKey);
  return cachedClient;
}

function modelIdForGemini(tier: AiModelTier): string {
  if (tier === "smart") {
    return process.env.GEMINI_MODEL_SMART ?? "gemini-2.5-pro";
  }
  return process.env.GEMINI_MODEL_FAST ?? "gemini-2.5-flash";
}

function getModel(tier: AiModelTier, wantsJson: boolean, schema: object | undefined): GenerativeModel {
  return client().getGenerativeModel({
    model: modelIdForGemini(tier),
    generationConfig: wantsJson
      ? {
          responseMimeType: "application/json",
          // schema を直接渡すと OpenAPI に変換されるが、対応外フィールドで弾かれることがあるので
          // システムプロンプト側でも明示する (anthropic provider と同じ戦略)。
          ...(schema ? { responseSchema: schema as never } : {}),
        }
      : {},
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  // Gemini SDK のエラーは status コードを直接持たないことがあるので、メッセージで判定する。
  if (/\b429\b/.test(message)) return true;
  if (/\b5\d\d\b/.test(message)) return true;
  if (/timeout|ECONNRESET|ETIMEDOUT/i.test(message)) return true;
  return false;
}

export const geminiProvider = {
  name: "gemini",
  async complete<T = unknown>(opts: CompleteOptions): Promise<CompleteResult<T>> {
    const wantsJson = Boolean(opts.jsonSchema);
    const system = wantsJson
      ? `${opts.system}\n\n以下の JSON Schema に厳密に従い、JSON のみを出力してください:\n${JSON.stringify(
          opts.jsonSchema,
          null,
          2,
        )}`
      : opts.system;

    let model: GenerativeModel;
    try {
      model = getModel(opts.model, wantsJson, opts.jsonSchema);
    } catch (err) {
      // GEMINI_API_KEY 未設定など、初期化段階の失敗。リトライしても直らないので即返す。
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `gemini_failed: ${message}`, provider: "gemini" };
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const parts: Part[] = [{ text: opts.user }];
        const resp = await model.generateContent({
          contents: [{ role: "user", parts }],
          systemInstruction: { role: "system", parts: [{ text: system }] },
        });
        const text = resp.response.text();

        if (wantsJson) {
          const json = extractJson(text);
          return { ok: true, kind: "json", data: json as T, provider: "gemini" };
        }
        return { ok: true, kind: "text", text, provider: "gemini" };
      } catch (err) {
        if (attempt < MAX_RETRIES && isRetryable(err)) {
          await sleep(BASE_DELAY_MS * 2 ** attempt);
          continue;
        }
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: `gemini_failed: ${message}`, provider: "gemini" };
      }
    }
    return { ok: false, error: "gemini_exhausted_retries", provider: "gemini" };
  },
};

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]+?)```$/m.exec(trimmed);
  const candidate = fence?.[1] ?? trimmed;
  return JSON.parse(candidate);
}
