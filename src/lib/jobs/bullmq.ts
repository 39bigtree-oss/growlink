import "server-only";

import { Queue, QueueEvents, Worker, type JobsOptions } from "bullmq";
import IORedis from "ioredis";

import { prisma } from "@/lib/db";

import type { JobHandler, JobOptions, JobPayload, JobQueue } from "./types";

let sharedConnection: IORedis | null = null;
function getConnection(): IORedis {
  if (sharedConnection) return sharedConnection;
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  // BullMQ requires maxRetriesPerRequest = null
  sharedConnection = new IORedis(url, { maxRetriesPerRequest: null });
  return sharedConnection;
}

/**
 * BullMQ ベースの本番ジョブキュー。enqueue → Redis に積む、別プロセス (worker) で消化。
 * 同一 Node プロセス内に Worker を立てたい場合は WORKER_INLINE=1 で `on()` 経由で消化する。
 */
export class BullMqJobQueue implements JobQueue {
  readonly name: string;
  private queue: Queue;
  private workers: Worker[] = [];
  private events: QueueEvents | null = null;

  constructor(name: string) {
    this.name = name;
    this.queue = new Queue(name, { connection: getConnection() });
  }

  async enqueue<P extends JobPayload>(
    jobName: string,
    payload: P,
    options: JobOptions = {},
  ): Promise<{ jobId: string }> {
    const opts: JobsOptions = {
      attempts: options.attempts ?? 1,
      jobId: options.dedupeKey,
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 200 },
    };
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
      console.warn("[jobs:bullmq] failed to record JobLog (queued)", { err: String(err) });
    }

    const job = await this.queue.add(jobName, { ...payload, __logId: logId }, opts);
    return { jobId: String(job.id) };
  }

  on<P extends JobPayload>(jobName: string, handler: JobHandler<P>): void {
    const worker = new Worker(
      this.name,
      async (job) => {
        if (job.name !== jobName) return;
        const { __logId, ...payload } = job.data as P & { __logId?: string };
        const logId = (__logId ?? null) as string | null;
        if (logId) {
          await prisma.jobLog
            .update({
              where: { id: logId },
              data: { status: "active", attempts: job.attemptsMade + 1, startedAt: new Date() },
            })
            .catch(() => {});
        }
        try {
          await handler(payload as P, {
            jobId: String(job.id),
            attempt: job.attemptsMade + 1,
          });
          if (logId) {
            await prisma.jobLog
              .update({
                where: { id: logId },
                data: { status: "completed", endedAt: new Date() },
              })
              .catch(() => {});
          }
        } catch (err) {
          if (logId) {
            await prisma.jobLog
              .update({
                where: { id: logId },
                data: { status: "failed", errorMessage: String(err), endedAt: new Date() },
              })
              .catch(() => {});
          }
          throw err;
        }
      },
      { connection: getConnection() },
    );
    this.workers.push(worker);
  }

  async drain(): Promise<void> {
    // BullMQ では active を待つ。テスト時はメモリ provider 経由のほうが楽。
    if (!this.events) {
      this.events = new QueueEvents(this.name, { connection: getConnection() });
    }
    const counts = await this.queue.getJobCounts("waiting", "active");
    if ((counts.waiting ?? 0) === 0 && (counts.active ?? 0) === 0) return;
    await new Promise<void>((resolve) => {
      const check = async () => {
        const c = await this.queue.getJobCounts("waiting", "active");
        if ((c.waiting ?? 0) === 0 && (c.active ?? 0) === 0) resolve();
        else setTimeout(check, 100);
      };
      check();
    });
  }

  async shutdown(): Promise<void> {
    for (const w of this.workers) {
      await w.close();
    }
    await this.queue.close();
    await this.events?.close();
  }
}
