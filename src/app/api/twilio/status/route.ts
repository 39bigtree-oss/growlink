import { NextResponse } from "next/server";

import { endInterview } from "@/lib/interview/service";
import { drainAllQueues, enqueueJob } from "@/lib/jobs/registry";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Twilio が呼ぶ status callback。`CallStatus=completed` のときに面接終了処理を起動する。
 * 認証なしの公開エンドポイントだが、interviewId が一致する場合のみ処理する。
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const interviewId = url.searchParams.get("interviewId");
  if (!interviewId) {
    return NextResponse.json({ ok: false, error: "MISSING_INTERVIEW_ID" }, { status: 400 });
  }
  const form = await req.formData().catch(() => null);
  const status = form?.get("CallStatus");
  const callSid = form?.get("CallSid");
  if (typeof callSid === "string") {
    await prisma.interview.update({
      where: { id: interviewId },
      data: { callSid },
    }).catch(() => {});
  }
  if (status === "completed" || status === "failed") {
    await endInterview(interviewId);
    await enqueueJob("interview", "interview.finalize", { interviewId }, { target: interviewId });
    if ((process.env.QUEUE_PROVIDER ?? "memory") === "memory") {
      await drainAllQueues();
    }
  }
  return NextResponse.json({ ok: true });
}
