import "server-only";

import { registerHandler } from "./registry";

/**
 * ジョブハンドラ登録: registry が `getQueue()` で初回呼び出しされた瞬間に dynamic import される。
 * 各ハンドラ実体は機能ごとのモジュールに置き、ここでは紐付けだけ行う。
 */

registerHandler<{ applicantId: string }>("diagnosis", "diagnosis.generate", async (payload) => {
  const { buildDiagnosis } = await import("@/lib/ai/diagnosis/buildDiagnosis");
  await buildDiagnosis(payload.applicantId);
});

registerHandler<{ uploadId: string }>("resume", "resume.process", async (payload) => {
  const { processResume } = await import("@/lib/skill-sheet/processResume");
  await processResume(payload.uploadId);
});

registerHandler<{ interviewId: string }>("interview", "interview.finalize", async (payload) => {
  const { finalizeInterview } = await import("@/lib/interview/finalizeInterview");
  await finalizeInterview(payload.interviewId);
});
