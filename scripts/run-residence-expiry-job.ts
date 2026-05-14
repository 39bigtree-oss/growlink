/**
 * 在留期限アラートジョブの手動起動スクリプト。
 *
 * Usage:
 *   pnpm tsx scripts/run-residence-expiry-job.ts
 *
 * BullMQ + cron に乗せる前のローカル検証用。本番は worker からスケジュールする。
 */
import { runResidenceExpiryAlertJob } from "@/lib/compliance/residence-expiry-job";

async function main() {
  const result = await runResidenceExpiryAlertJob();
  console.log("[residence-expiry] done", result);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[residence-expiry] failed", err);
    process.exit(1);
  });
