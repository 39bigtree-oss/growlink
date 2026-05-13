import { describe, expect, it } from "vitest";

/**
 * Gemini プロバイダの起動条件テスト。
 * 実 API は叩かない (GEMINI_API_KEY 必須で throw する設計)。
 */
describe("Gemini provider", () => {
  it("GEMINI_API_KEY なしで getModel が呼ばれると throw", async () => {
    const prev = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const mod = await import("@/lib/ai/providers/gemini");
    const res = await mod.geminiProvider.complete({
      promptName: "test",
      system: "x",
      user: "y",
      model: "smart",
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain("gemini_failed");
    if (prev) process.env.GEMINI_API_KEY = prev;
  });
});
