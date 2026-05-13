import { NextResponse } from "next/server";
import { z } from "zod";

import {
  generateNextQuestion,
  startInterview,
  submitAnswer,
} from "@/lib/interview/service";
import { consumeInterviewToken } from "@/lib/interview/token";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["start", "ask", "answer"]),
  text: z.string().max(2000).optional(),
});

/**
 * 求職者向け: トークンで本人確認のみ。挙動は admin の同名ルートと同一。
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const auth = await consumeInterviewToken(token);
  if (!auth) return NextResponse.json({ ok: false, error: "INVALID_TOKEN" }, { status: 404 });
  if (auth.status !== "ok")
    return NextResponse.json({ ok: false, error: auth.status }, { status: 410 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_ERROR", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const interview = await prisma.interview.findUnique({
    where: { id: auth.token.interviewId },
  });
  if (!interview) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  if (interview.status === "completed") {
    return NextResponse.json({ ok: false, error: "ALREADY_COMPLETED" }, { status: 409 });
  }

  if (parsed.data.action === "start") {
    const updated = await startInterview(interview.id, "text");
    return NextResponse.json({ ok: true, interview: updated }, { status: 200 });
  }
  if (parsed.data.action === "ask") {
    const q = await generateNextQuestion(interview.id);
    return NextResponse.json({ ok: true, ...q }, { status: 200 });
  }
  if (parsed.data.action === "answer") {
    if (!parsed.data.text) {
      return NextResponse.json({ ok: false, error: "TEXT_REQUIRED" }, { status: 400 });
    }
    const turn = await submitAnswer({ interviewId: interview.id, text: parsed.data.text });
    return NextResponse.json({ ok: true, turn }, { status: 201 });
  }
  return NextResponse.json({ ok: false, error: "UNKNOWN_ACTION" }, { status: 400 });
}
