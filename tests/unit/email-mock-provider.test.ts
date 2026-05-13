import { promises as fs } from "node:fs";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { mockEmailProvider } from "@/lib/email/providers/mock";
import { getStorageRoot } from "@/lib/storage/local";

describe("mockEmailProvider", () => {
  let storageRoot: string;
  const originalEnv = { ...process.env };

  beforeAll(() => {
    process.env.STORAGE_DIR = "/tmp/growlink-test-storage-" + Date.now();
    storageRoot = getStorageRoot();
  });

  beforeEach(() => {
    delete process.env.EMAIL_MOCK_FAIL;
  });

  afterAll(async () => {
    Object.assign(process.env, originalEnv);
    try {
      await fs.rm(storageRoot, { recursive: true, force: true });
    } catch {
      /* noop */
    }
  });

  it("送信成功時は .eml を storage に書き出し storedKey を返す", async () => {
    const res = await mockEmailProvider.send({
      to: "ml@example.test",
      subject: "件名テスト",
      text: "本文 plain",
      html: "<p>本文 html</p>",
      template: "applicant.receipt",
      locale: "ja",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return; // type narrow
    const fullPath = path.join(storageRoot, res.storedKey!);
    const content = await fs.readFile(fullPath, "utf8");
    expect(content).toContain("Subject:");
    expect(content).toContain("本文 plain");
    expect(content).toContain("本文 html");
    expect(content).toContain("X-Growlink-Template: applicant.receipt");
  });

  it("EMAIL_MOCK_FAIL=1 で失敗を返す (再送系のテスト用)", async () => {
    process.env.EMAIL_MOCK_FAIL = "1";
    const res = await mockEmailProvider.send({
      to: "x@example.test",
      subject: "x",
      text: "x",
      html: "x",
      template: "x.x",
      locale: "ja",
    });
    expect(res.ok).toBe(false);
  });

  it("非 ASCII 件名は MIME B-encoding される", async () => {
    const res = await mockEmailProvider.send({
      to: "ml@example.test",
      subject: "【グロウリンク】スキルシート入力のお願い",
      text: "x",
      html: "x",
      template: "x.x",
      locale: "ja",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const fullPath = path.join(storageRoot, res.storedKey!);
    const content = await fs.readFile(fullPath, "utf8");
    expect(content).toMatch(/Subject: =\?UTF-8\?B\?/);
  });
});
