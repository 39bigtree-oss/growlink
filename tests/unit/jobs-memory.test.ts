import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    jobLog: {
      create: vi.fn(async ({ data }: { data: object }) => ({ id: "log1", ...data })),
      update: vi.fn(async () => ({})),
    },
  },
}));

import { MemoryJobQueue } from "@/lib/jobs/memory";

describe("MemoryJobQueue", () => {
  it("enqueue したジョブが setImmediate でハンドラに渡る", async () => {
    const q = new MemoryJobQueue("test");
    const calls: string[] = [];
    q.on<{ x: number }>("ping", async (p) => {
      calls.push(`${p.x}`);
    });
    await q.enqueue("ping", { x: 1 });
    await q.enqueue("ping", { x: 2 });
    await q.drain();
    expect(calls.sort()).toEqual(["1", "2"]);
  });

  it("ハンドラが例外を投げると attempts を消費する (default 1)", async () => {
    const q = new MemoryJobQueue("test");
    let attempts = 0;
    q.on<{ x: number }>("boom", async () => {
      attempts += 1;
      throw new Error("oops");
    });
    await q.enqueue("boom", { x: 1 });
    await q.drain();
    expect(attempts).toBe(1);
  });

  it("attempts: 3 でリトライが効く", async () => {
    const q = new MemoryJobQueue("test");
    let attempts = 0;
    q.on<{ x: number }>("flaky", async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("retry");
    });
    await q.enqueue("flaky", { x: 1 }, { attempts: 3 });
    await q.drain();
    expect(attempts).toBe(3);
  });

  it("未登録のジョブ名は失敗扱いになり例外を上に投げない", async () => {
    const q = new MemoryJobQueue("test");
    const r = await q.enqueue("unknown", { x: 1 });
    expect(typeof r.jobId).toBe("string");
    await q.drain();
  });
});
