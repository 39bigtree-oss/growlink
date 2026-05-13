import { describe, expect, it } from "vitest";

import { mockSttProvider } from "@/lib/stt/providers/mock";

describe("mock STT 5 言語対応", () => {
  it.each(["ja", "en", "vi", "id", "zh"])("%s で空でない transcribe を返す", async (lang) => {
    const r = await mockSttProvider.transcribe({
      bytes: Buffer.from("x"),
      language: lang,
      hint: { turnIndex: 0, seed: "test" },
    });
    expect(r.text.length).toBeGreaterThan(0);
    expect(r.language).toBe(lang);
  });

  it("未対応言語は ja にフォールバック", async () => {
    const r = await mockSttProvider.transcribe({
      bytes: Buffer.from("x"),
      language: "fr",
      hint: { turnIndex: 0, seed: "test" },
    });
    expect(r.language).toBe("ja");
    expect(r.text.length).toBeGreaterThan(0);
  });
});
