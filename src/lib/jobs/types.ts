/**
 * Phase 3: ジョブキュー抽象。
 * - メモリ provider (デフォルト): enqueue 直後に setImmediate でワーカが回る。
 *   既存 API テストの「即時完了」期待を保ったまま、ロジックをジョブハンドラに切り出せる。
 * - BullMQ provider: Redis (REDIS_URL) を使う。本番・大量処理向け。
 */

export type JobPayload = Record<string, unknown>;

export type JobHandler<P extends JobPayload = JobPayload> = (
  payload: P,
  ctx: { jobId: string; attempt: number },
) => Promise<void>;

export type JobOptions = {
  /** 同じ target に対する重複 enqueue を弾く識別子。BullMQ では jobId として渡す。 */
  dedupeKey?: string;
  /** 監査ログ用の target (Applicant / Upload / Interview id など)。 */
  target?: string;
  attempts?: number;
};

export interface JobQueue {
  readonly name: string;
  enqueue<P extends JobPayload>(jobName: string, payload: P, options?: JobOptions): Promise<{ jobId: string }>;
  on<P extends JobPayload>(jobName: string, handler: JobHandler<P>): void;
  /** テスト用: 既にキューにあるジョブを全部完了まで回す。memory provider のみ正確に動く。 */
  drain(): Promise<void>;
  shutdown(): Promise<void>;
}
