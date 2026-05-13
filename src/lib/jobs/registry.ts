import "server-only";

import { MemoryJobQueue } from "./memory";
import type { JobHandler, JobPayload, JobQueue } from "./types";

export type QueueName = "diagnosis" | "resume" | "interview" | "fax";

let registry: Partial<Record<QueueName, JobQueue>> = {};
let initialized = false;

/**
 * 環境変数 QUEUE_PROVIDER で memory / bullmq を切替える。
 * 既定は memory: enqueue 直後に in-process でハンドラが走る。Redis 不要。
 * BullMQ を使う場合は WORKER_INLINE=1 でも同プロセスで処理できる。
 */
function createQueue(name: QueueName): JobQueue {
  const provider = process.env.QUEUE_PROVIDER ?? "memory";
  if (provider === "bullmq") {
    // 動的 import で memory ユーザーが ioredis を起動しない
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { BullMqJobQueue } = require("./bullmq") as typeof import("./bullmq");
    return new BullMqJobQueue(name);
  }
  return new MemoryJobQueue(name);
}

export function getQueue(name: QueueName): JobQueue {
  if (!registry[name]) {
    registry[name] = createQueue(name);
  }
  // 初回アクセス時にハンドラ登録を行う (handler は side effect で `on()` を呼ぶ)。
  if (!initialized) {
    initialized = true;
    // 動的 import で循環参照を回避。
    void import("./handlers").catch((err) => {
      console.warn("[jobs:registry] handler module load failed", { err: String(err) });
    });
  }
  return registry[name]!;
}

export async function enqueueJob<P extends JobPayload>(
  queue: QueueName,
  jobName: string,
  payload: P,
  options?: Parameters<JobQueue["enqueue"]>[2],
): Promise<{ jobId: string }> {
  return getQueue(queue).enqueue(jobName, payload, options);
}

export function registerHandler<P extends JobPayload>(
  queue: QueueName,
  jobName: string,
  handler: JobHandler<P>,
): void {
  getQueue(queue).on(jobName, handler);
}

/** テスト用: 全 queue のキャッシュをリセット + 既存ハンドラを破棄。 */
export async function __resetQueueRegistryForTests(): Promise<void> {
  for (const q of Object.values(registry)) {
    await q?.shutdown();
  }
  registry = {};
  initialized = false;
}

/** テスト用: 全 queue のジョブが終わるまで待つ。memory provider 専用。 */
export async function drainAllQueues(): Promise<void> {
  for (const q of Object.values(registry)) {
    if (q) await q.drain();
  }
}
