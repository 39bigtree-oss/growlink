import { promises as fs } from "node:fs";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { mockEmailProvider } from "@/lib/email/providers/mock";
import { getStorageRoot } from "@/lib/storage/local";

/**
 * v1.2: メール添付 (PDF) が mock provider で .eml に正しく組み込まれることを検証。
 */
describe("mockEmailProvider attachments", () => {
  let storageRoot: string;
  const origEnv = { ...process.env };

  beforeAll(() => {
    process.env.STORAGE_DIR = "/tmp/growlink-attach-test-" + Date.now();
    storageRoot = getStorageRoot();
  });
  beforeEach(() => {
    delete process.env.EMAIL_MOCK_FAIL;
  });
  afterAll(async () => {
    Object.assign(process.env, origEnv);
    try {
      await fs.rm(storageRoot, { recursive: true, force: true });
    } catch {
      /* noop */
    }
  });

  it("attachments なしは multipart/alternative のまま", async () => {
    const res = await mockEmailProvider.send({
      to: "t@example.test",
      subject: "no-attach",
      text: "hello",
      html: "<p>hello</p>",
      template: "test.no-attach",
      locale: "ja",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const eml = await fs.readFile(path.join(storageRoot, res.storedKey!), "utf8");
    expect(eml).toContain("Content-Type: multipart/alternative");
    expect(eml).not.toContain("Content-Type: multipart/mixed");
  });

  it("attachments ありは multipart/mixed で添付が base64 で含まれる", async () => {
    const pdf = Buffer.from("%PDF-1.4 dummy content for test", "utf8");
    const res = await mockEmailProvider.send({
      to: "t@example.test",
      subject: "with-attach",
      text: "see attached",
      html: "<p>see attached</p>",
      template: "test.with-attach",
      locale: "ja",
      attachments: [
        {
          filename: "diagnosis.pdf",
          content: pdf,
          contentType: "application/pdf",
        },
      ],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const eml = await fs.readFile(path.join(storageRoot, res.storedKey!), "utf8");
    expect(eml).toContain("Content-Type: multipart/mixed");
    expect(eml).toContain("Content-Type: application/pdf");
    expect(eml).toContain('filename="diagnosis.pdf"');
    expect(eml).toContain("Content-Disposition: attachment");
    expect(eml).toContain("Content-Transfer-Encoding: base64");
    // base64 でエンコードされた内容が含まれる
    expect(eml).toContain(pdf.toString("base64").slice(0, 40));
  });

  it("複数 attachments も含められる", async () => {
    const a = Buffer.from("aaa", "utf8");
    const b = Buffer.from("bbb", "utf8");
    const res = await mockEmailProvider.send({
      to: "t@example.test",
      subject: "multi",
      text: "x",
      html: "x",
      template: "test.multi",
      locale: "ja",
      attachments: [
        { filename: "a.txt", content: a, contentType: "text/plain" },
        { filename: "b.bin", content: b, contentType: "application/octet-stream" },
      ],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const eml = await fs.readFile(path.join(storageRoot, res.storedKey!), "utf8");
    expect(eml).toContain('filename="a.txt"');
    expect(eml).toContain('filename="b.bin"');
  });
});
