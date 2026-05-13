import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/db";

import type { JobHandler, JobOptions, JobPayload, JobQueue } from "./types";

type Pending = {
  jobId: string;
  jobName: string;
  payload: JobPayload;
  attempts: number;
  target?: string;
};

/**
 * 同一プロセス内ジョブ実行。enqueue 直後に setImmediate でハンドラを起動。
 * JobLog テーブルに状態を記録するので、admin から進捗を追える。
 *
 * テストでは drain() で完了まで待てる。
 */
export class MemoryJobQueue implements JobQueue {
  readonly name: string;
  private handlers = new Map<string, JobHandler>();
  private inflight = new Set<Promise<void>>();

  constructor(name: string) {
    this.name = name;
  }

  async enqueue<P extends JobPayload>(
    jobName: string,
    payload: P,
    options: JobOptions = {},
  ): Promise<{ jobId: string }> {
    const jobId = options.dedupeKey ?? `${this.name}-${Date.now()}-${randomBytes(4).toString("hex")}`;

    // JobLog に "queued" で書き込む。書き込み失敗してもジョブ自体は走らせる (再現性のため)。
    let logId: string | null = null;
    try {
      const log = await prisma.jobLog.create({
        data: {
          queue: this.name,
          jobName,
          target: options.target ?? null,
          payload: payload as object,
          status: "queued",
        },
      });
      logId = log.id;
    } catch (err) {
      console.warn("[jobs:memory] failed to record JobLog (queued)", { err: String(err) });
    }

    const pending: Pending = {
      jobId,
      jobName,
      payload: payload as JobPayload,
      attempts: 0,
      target: options.target,
    };

    const run = this.runJob(pending, logId, options.attempts ?? 1);
    this.inflight.add(run);
    run.finally(() => this.inflight.delete(run));
    return { jobId };
  }

  on<P extends JobPayload>(jobName: string, handler: JobHandler<P>): void {
    this.handlers.set(jobName, handler as JobHandler);
  }

  async drain(): Promise<void> {
    while (this.inflight.size > 0) {
      await Promise.allSettled([...this.inflight]);
    }
  }

  async shutdown(): Promise<void> {
    await this.drain();
  }

  private runJob(pending: Pending, logId: string | null, maxAttempts: number): Promise<void> {
    return new Promise<void>((resolve) => {
      // 1 tick 後に実行することで、enqueue 呼び出し側が return してから走る。
      setImmediate(async () => {
        const handler = this.handlers.get(pending.jobName);
        if (!handler) {
          await this.markFailed(logId, "no_handler", pending);
          resolve();
          return;
        }
        let lastError: unknown = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          pending.attempts = attempt;
          await this.markActive(logId, attempt);
          try {
            await handler(pending.payload, { jobId: pending.jobId, attempt });
            await this.markCompleted(logId);
            resolve();
            return;
          } catch (err) {
            lastError = err;
            console.warn("[jobs:memory] handler failed", {
              queue: this.name,
              jobName: pending.jobName,
              attempt,
              error: String(err),
            });
          }
        }
        await this.markFailed(logId, String(lastError ?? "unknown"), pending);
        resolve();
      });
    });
  }

  private async markActive(logId: string | null, attempt: number) {
    if (!logId) return;
    try {
      await prisma.jobLog.update({
        where: { id: logId },
        data: { status: "active", attempts: attempt, startedAt: new Date() },
      });
    } catch {
      /* noop */
    }
  }

  private async markCompleted(logId: string | null) {
    if (!logId) return;
    try {
      await prisma.jobLog.update({
        where: { id: logId },
        data: { status: "completed", endedAt: new Date() },
      });
    } catch {
      /* noop */
    }
  }

  private async markFailed(logId: string | null, message: string, pending: Pending) {
    if (!logId) return;
    try {
      await prisma.jobLog.update({
        where: { id: logId },
        data: {
          status: "failed",
          errorMessage: message,
          attempts: pending.attempts,
          endedAt: new Date(),
        },
      });
    } catch {
      /* noop */
    }
  }
}
