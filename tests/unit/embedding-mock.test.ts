import { describe, expect, it } from "vitest";

import {
  cosineSimilarity,
  findSimilar,
  mockEmbeddingProvider,
} from "@/lib/ai/embedding";

describe("mockEmbeddingProvider", () => {
  it("64 次元のベクトルを返す", async () => {
    const v = await mockEmbeddingProvider.embed("テスト");
    expect(v.length).toBe(64);
    expect(mockEmbeddingProvider.dimensions).toBe(64);
  });

  it("L2 ノルムが ≒ 1 (正規化済み)", async () => {
    const v = await mockEmbeddingProvider.embed("看護師として 10 年");
    const norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0));
    expect(norm).toBeGreaterThan(0.99);
    expect(norm).toBeLessThan(1.01);
  });

  it("同じ文字列は同じベクトル (決定論)", async () => {
    const a = await mockEmbeddingProvider.embed("text-a");
    const b = await mockEmbeddingProvider.embed("text-a");
    expect(a).toEqual(b);
  });

  it("異なる文字列は異なるベクトル", async () => {
    const a = await mockEmbeddingProvider.embed("text-a");
    const b = await mockEmbeddingProvider.embed("text-b");
    expect(a).not.toEqual(b);
  });

  it("embedBatch は要素数だけのベクトル配列を返す", async () => {
    const result = await mockEmbeddingProvider.embedBatch(["a", "b", "c"]);
    expect(result.length).toBe(3);
    expect(result.every((v) => v.length === 64)).toBe(true);
  });
});

describe("cosineSimilarity", () => {
  it("同じベクトル → 1", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 5);
  });

  it("直交ベクトル → 0", () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);
  });

  it("反対ベクトル → -1", () => {
    expect(cosineSimilarity([1, 0, 0], [-1, 0, 0])).toBe(-1);
  });

  it("次元不一致は例外", () => {
    expect(() => cosineSimilarity([1, 0], [1, 0, 0])).toThrow();
  });
});

describe("findSimilar", () => {
  it("query と一致するテキストが Top に来る", async () => {
    const result = await findSimilar(
      "看護師として 10 年の経験",
      [
        { id: "a", text: "看護師として 10 年の経験" }, // 完全一致 → similarity=1
        { id: "b", text: "介護福祉士として 5 年" },
        { id: "c", text: "理学療法士として 3 年" },
      ],
      3,
    );
    expect(result[0].item.id).toBe("a");
    expect(result[0].similarity).toBeCloseTo(1, 5);
  });

  it("topK で件数制限", async () => {
    const result = await findSimilar(
      "test",
      [
        { id: "a", text: "a" },
        { id: "b", text: "b" },
        { id: "c", text: "c" },
      ],
      2,
    );
    expect(result.length).toBe(2);
  });
});
