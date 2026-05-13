import { NextResponse } from "next/server";

import { endInterview } from "@/lib/interview/service";
import { consumeInterviewToken } from "@/lib/interview/token";
import { drainAllQueues, enqueueJob } from "@/lib/jobs/registry";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const auth = await consumeInterviewToken(token);
  if (!auth) return NextResponse.json({ ok: false, error: "INVALID_TOKEN" }, { status: 404 });
  if (auth.status !== "ok")
    return NextResponse.json({ ok: false, error: auth.status }, { status: 410 });

  await endInterview(auth.token.interviewId);
  await enqueueJob(
    "interview",
    "interview.finalize",
    { interviewId: auth.token.interviewId },
    { target: auth.token.interviewId },
  );
  if ((process.env.QUEUE_PROVIDER ?? "memory") === "memory") {
    await drainAllQueues();
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
