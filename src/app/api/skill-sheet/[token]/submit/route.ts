import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";
import { buildSkillSheetReceivedEmail } from "@/lib/email/templates/skill-sheet-received";
import { skillSheetContentSchema } from "@/lib/schemas/skill-sheet";
import { consumeSkillSheetToken } from "@/lib/skill-sheet/token";

export const runtime = "nodejs";

/**
 * 提出 (status を SKILL_SHEET_DONE に確定)。
 * 提出後は本人による編集を不可にする (本人都合での修正はスタッフ経由)。
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const auth = await consumeSkillSheetToken(token);
  if (!auth) {
    return NextResponse.json({ ok: false, error: "INVALID_TOKEN" }, { status: 404 });
  }
  if (auth.status !== "ok") {
    return NextResponse.json({ ok: false, error: auth.status }, { status: 410 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    raw = {};
  }
  const parsed = skillSheetContentSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_ERROR", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const applicantId = auth.token.applicantId;
  const existing = await prisma.skillSheet.findUnique({ where: { applicantId } });
  if (existing?.submittedAt) {
    return NextResponse.json({ ok: false, error: "ALREADY_SUBMITTED" }, { status: 409 });
  }
  const applicant = await prisma.applicant.findFirst({
    where: { id: applicantId, deletedAt: null },
  });
  if (!applicant) {
    return NextResponse.json({ ok: false, error: "APPLICANT_GONE" }, { status: 410 });
  }

  const now = new Date();
  const sheet = await prisma.skillSheet.upsert({
    where: { applicantId },
    create: {
      applicantId,
      educations: parsed.data.educations,
      careers: parsed.data.careers,
      skills: parsed.data.skills,
      desired: parsed.data.desired,
      selfPR: parsed.data.selfPR,
      lastEditedBy: "applicant",
      savedAt: now,
      submittedAt: now,
      completedAt: now,
    },
    update: {
      educations: parsed.data.educations,
      careers: parsed.data.careers,
      skills: parsed.data.skills,
      desired: parsed.data.desired,
      selfPR: parsed.data.selfPR,
      lastEditedBy: "applicant",
      savedAt: now,
      submittedAt: now,
      completedAt: now,
    },
  });

  await prisma.applicant.update({
    where: { id: applicantId },
    data: { status: "SKILL_SHEET_DONE" },
  });

  // 受領メール送信は失敗を握りつぶす (本人提出自体は成功とする)。
  try {
    await sendEmail(
      buildSkillSheetReceivedEmail({
        applicantId,
        to: applicant.email,
        lastName: applicant.lastName,
        firstName: applicant.firstName,
        locale: applicant.language ?? "ja",
      }),
    );
  } catch (err) {
    console.warn("[skill-sheet:submit] receipt email failed", { applicantId, err: String(err) });
  }

  return NextResponse.json({ ok: true, submittedAt: sheet.submittedAt }, { status: 200 });
}
