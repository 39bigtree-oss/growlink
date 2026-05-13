/**
 * AI provider 共通インターフェース。AI_PROVIDER (mock | anthropic) で実体が切り替わる。
 *
 * server-only マーカーは付けていない (テスト用 tsx スクリプトから直接呼べるように)。
 * Prisma を触る上位レイヤ (buildDiagnosis 等) で server-only を担保する。
 *
 * 設計方針:
 *  - 本番化までの間はすべてのコードパスがコストゼロで動くこと
 *  - 切り替えは環境変数だけで完結すること (コード差し替え不要)
 *  - 戻り値が JSON か文字列かは jsonSchema 引数の有無で決まる
 */
export type AiModelTier = "smart" | "fast";

export type CompleteOptions = {
  /** プロンプト名 (例: "diagnosis.system") — モック実装が分岐に使う */
  promptName: string;
  /** システムプロンプト本体 */
  system: string;
  /** ユーザー入力 (構造化データなら JSON 文字列で渡す) */
  user: string;
  /** "smart" → MODEL_SMART / "fast" → MODEL_FAST */
  model: AiModelTier;
  /** JSON 強制したい場合は JSONSchema を渡す。渡さなければプレーンテキスト */
  jsonSchema?: object;
  /** 既定 1024 */
  maxTokens?: number;
};

export type CompleteResult<T = unknown> =
  | { ok: true; kind: "json"; data: T; provider: string }
  | { ok: true; kind: "text"; text: string; provider: string }
  | { ok: false; error: string; provider: string };

type Provider = {
  name: string;
  complete<T = unknown>(opts: CompleteOptions): Promise<CompleteResult<T>>;
};

let cachedProvider: Provider | null = null;

async function resolveProvider(): Promise<Provider> {
  if (cachedProvider) return cachedProvider;
  const name = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  if (name === "anthropic") {
    const mod = await import("./providers/anthropic");
    cachedProvider = mod.anthropicProvider;
  } else {
    const mod = await import("./providers/mock");
    cachedProvider = mod.mockProvider;
  }
  return cachedProvider;
}

/**
 * 汎用呼び出し。各機能は promptName と user payload を渡すだけで、
 * プロバイダの選択・モデルマッピング・リトライは内側で完結する。
 */
export async function complete<T = unknown>(opts: CompleteOptions): Promise<CompleteResult<T>> {
  const provider = await resolveProvider();
  return provider.complete<T>(opts);
}

export function modelIdFor(tier: AiModelTier): string {
  if (tier === "smart") return process.env.MODEL_SMART ?? "claude-sonnet-4-6";
  return process.env.MODEL_FAST ?? "claude-haiku-4-5";
}

// テスト時に provider キャッシュをリセットしたい場合に使う。
export function __resetAiClientForTests() {
  cachedProvider = null;
}
