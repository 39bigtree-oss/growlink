import { describe, expect, it } from "vitest";

import { mockOcrProvider } from "@/lib/ocr/providers/mock";

describe("mockOcrProvider", () => {
  it("ファイル名 pattern:<key> で明示的にパターンを選択できる", async () => {
    const a = await mockOcrProvider.recognize({
      bytes: Buffer.from("noise"),
      mimeType: "application/pdf",
      fileName: "pattern:nurse-mid-career.pdf",
    });
    expect(a.provider).toBe("mock:nurse-mid-career");
    expect(a.fullText).toContain("看護師");
  });

  it("同じバイト列なら同じパターンを返す (決定論的)", async () => {
    const bytes = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
    const x = await mockOcrProvider.recognize({ bytes, mimeType: "application/pdf" });
    const y = await mockOcrProvider.recognize({ bytes, mimeType: "application/pdf" });
    expect(x.provider).toBe(y.provider);
    expect(x.fullText).toBe(y.fullText);
  });

  it("3 パターン (nurse-mid-career, careworker-young, ja-bachelor-foreign) を返し得る", async () => {
    const keys = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const bytes = Buffer.from(`seed-${i}`);
      const r = await mockOcrProvider.recognize({ bytes, mimeType: "application/pdf" });
      keys.add(r.provider);
    }
    expect(keys.has("mock:nurse-mid-career")).toBe(true);
    expect(keys.size).toBeGreaterThanOrEqual(2);
  });
});
