import { describe, expect, it } from "vitest";

import { mockMyNumberOcrProvider } from "@/lib/compliance/my-number-ocr";

describe("mockMyNumberOcrProvider", () => {
  it("ファイル名に test-card を含むと 12 桁を返す (信頼度 0.98)", async () => {
    const buf = Buffer.alloc(1024, 0xff);
    const r = await mockMyNumberOcrProvider.recognize({
      bytes: buf,
      mimeType: "image/png",
      fileName: "test-card-example.png",
    });
    expect(r.detectedNumber).toBe("123456789012");
    expect(r.confidence).toBeGreaterThan(0.9);
  });

  it("test-card 以外は信頼度 0.42 + 12 桁の代替値", async () => {
    const buf = Buffer.alloc(1024, 0x00);
    const r = await mockMyNumberOcrProvider.recognize({
      bytes: buf,
      mimeType: "image/jpeg",
      fileName: "random.jpg",
    });
    expect(r.detectedNumber).toMatch(/^\d{12}$/);
    expect(r.confidence).toBeLessThan(0.5);
  });

  it("極端に小さい画像は例外", async () => {
    await expect(
      mockMyNumberOcrProvider.recognize({
        bytes: Buffer.alloc(16),
        mimeType: "image/png",
        fileName: "tiny.png",
      }),
    ).rejects.toThrow();
  });
});
