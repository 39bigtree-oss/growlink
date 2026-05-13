import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { hasCapability } from "@/lib/auth/rbac";
import {
  generateNextQuestion,
  startInterview,
  submitAnswer,
} from "@/lib/interview/service";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["start", "ask", "answer"]),
  text: z.string().max(2000).optional(),
});

/**
 * シミュレータ用エンドポイント (admin only)。3 種の action:
 *   start  : Interview.status を in_progress にする
 *   ask    : 次の AI 質問を生成 (InterviewTurn role=ai)
 *   answer : 求職者の答えをテキストで投入 (InterviewTurn role=applicant)
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!hasCapability(session.user.role, "interviews:write")) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await ctx.params;
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

  const interview = await prisma.interview.findUnique({ where: { id } });
  if (!interview) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  if (parsed.data.action === "start") {
    const updated = await startInterview(id, "text");
    return NextResponse.json({ ok: true, interview: updated }, { status: 200 });
  }
  if (parsed.data.action === "ask") {
    const q = await generateNextQuestion(id);
    return NextResponse.json({ ok: true, ...q }, { status: 200 });
  }
  if (parsed.data.action === "answer") {
    if (!parsed.data.text) {
      return NextResponse.json({ ok: false, error: "TEXT_REQUIRED" }, { status: 400 });
    }
    const turn = await submitAnswer({ interviewId: id, text: parsed.data.text });
    return NextResponse.json({ ok: true, turn }, { status: 201 });
  }
  return NextResponse.json({ ok: false, error: "UNKNOWN_ACTION" }, { status: 400 });
}
