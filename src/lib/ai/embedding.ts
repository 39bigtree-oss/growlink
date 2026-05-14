import "server-only";

import { createHash } from "node:crypto";

/**
 * v1.9: 自由記述 (スキルシート selfPR / 案件 notes) のベクトル検索。
 *
 * 設計判断:
 *   - provider 抽象化 ("mock" / "gemini" / "anthropic_text_embedding")
 *   - mock は決定論的な疑似ベクトルを返す (hash → 64 次元の数値ベクトル)
 *     → DB に保存しないので、同じ文字列なら毎回同じ結果を返す
 *   - 本番は `gemini-text-embedding-004` (768 次元) を採用予定
 *   - 類似度: cosine similarity
 *
 * 注意:
 *   - mock は意味的に近い文字列を本当には認識しない (hash ベース)
 *   - 「実 AI に切り替えるとどう変わるか目視確認」目的のスキャフォールド
 */

export type EmbeddingVector = number[];

export interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  embed(text: string): Promise<EmbeddingVector>;
  /** バッチ. mock は forEach、本番は API バッチ呼び出し */
  embedBatch(texts: string[]): Promise<EmbeddingVector[]>;
}

const MOCK_DIMS = 64;

/**
 * mock provider: 文字列の sha256 → 64 次元のベクトル。
 * 完全に決定論的だが、意味的な類似性は保たない。
 */
export const mockEmbeddingProvider: EmbeddingProvider = {
  name: "embedding:mock",
  dimensions: MOCK_DIMS,
  async embed(text: string): Promise<EmbeddingVector> {
    const hash = createHash("sha256").update(text || "").digest();
    const vec: number[] = [];
    for (let i = 0; i < MOCK_DIMS; i++) {
      // [0, 255] → [-1, 1]
      vec.push((hash[i % hash.length] / 255) * 2 - 1);
    }
    // 正規化 (L2 ノルム = 1)
    const norm = Math.sqrt(vec.reduce((a, b) => a + b * b, 0));
    return norm > 0 ? vec.map((v) => v / norm) : vec;
  },
  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  },
};

let cached: EmbeddingProvider | null = null;

/** 環境変数で切替。default は mock。 */
export function getEmbeddingProvider(): EmbeddingProvider {
  if (cached) return cached;
  const choice = process.env.EMBEDDING_PROVIDER ?? "mock";
  if (choice === "gemini") {
    // v2.0 で実装予定。現状は mock にフォールバック (API キーゼロ運用維持)
    cached = mockEmbeddingProvider;
  } else {
    cached = mockEmbeddingProvider;
  }
  return cached;
}

/** テスト用 */
export function __resetEmbeddingProviderForTests(): void {
  cached = null;
}

/**
 * コサイン類似度 (-1 〜 1)。両ベクトルは同次元で正規化済を想定。
 */
export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.length !== b.length) {
    throw new Error(`次元不一致: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return dot / denom;
}

/**
 * クエリテキスト × 候補テキスト群 → 類似度降順で Top K を返す。
 */
export async function findSimilar<T extends { id: string; text: string }>(
  query: string,
  candidates: T[],
  topK = 10,
): Promise<Array<{ item: T; similarity: number }>> {
  const provider = getEmbeddingProvider();
  const [qVec, cVecs] = await Promise.all([
    provider.embed(query),
    provider.embedBatch(candidates.map((c) => c.text)),
  ]);
  return candidates
    .map((item, i) => ({ item, similarity: cosineSimilarity(qVec, cVecs[i]) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
