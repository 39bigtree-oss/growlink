import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { hasCapability } from "@/lib/auth/rbac";
import { sendEmail } from "@/lib/email/client";
import { buildInterviewInviteEmail } from "@/lib/email/templates/interview-invite";
import { ensureInterview } from "@/lib/interview/service";
import {
  buildInterviewUrl,
  ensureInterviewToken,
} from "@/lib/interview/token";
import { recordAuditLog } from "@/lib/repositories/audit-log";
import { prisma } from "@/lib/db";
import { resolveAppBaseUrl } from "@/lib/skill-sheet/token";

export const runtime = "nodejs";

const bodySchema = z.object({
  applicantId: z.string().min(1),
  channel: z.enum(["voice", "text"]).default("text"),
  /** スタッフが「招待メールを送る」かどうか。デフォルト true */
  sendInvite: z.boolean().default(true),
});

/** スタッフが面接を開始 (Interview + Token を作成 → 招待メール送信)。 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!hasCapability(session.user.role, "interviews:write")) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

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

  const applicant = await prisma.applicant.findFirst({
    where: { id: parsed.data.applicantId, deletedAt: null },
    select: { id: true, email: true, lastName: true, firstName: true, language: true },
  });
  if (!applicant) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const interview = await ensureInterview(applicant.id);
  const token = await ensureInterviewToken(interview.id);
  const url = buildInterviewUrl(resolveAppBaseUrl(), token.token);

  if (parsed.data.sendInvite) {
    await sendEmail(
      buildInterviewInviteEmail({
        applicantId: applicant.id,
        to: applicant.email,
        lastName: applicant.lastName,
        firstName: applicant.firstName,
        locale: applicant.language ?? "ja",
        interviewUrl: url,
      }),
    );
  }

  await recordAuditLog({
    staffId: session.user.id,
    action: "interview.scheduled",
    target: applicant.id,
    payload: { interviewId: interview.id, channel: parsed.data.channel, invited: parsed.data.sendInvite },
  });

  return NextResponse.json(
    {
      ok: true,
      interviewId: interview.id,
      tokenId: token.id,
      url,
      simulateUrl: `/admin/interviews/${interview.id}/simulate`,
    },
    { status: 201 },
  );
}
