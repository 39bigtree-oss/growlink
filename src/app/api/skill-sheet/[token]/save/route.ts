import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { skillSheetContentSchema } from "@/lib/schemas/skill-sheet";
import { consumeSkillSheetToken } from "@/lib/skill-sheet/token";

export const runtime = "nodejs";

/**
 * 途中保存 / 公開エンドポイント。トークンによる本人確認のみで認可。
 * 既に submittedAt が入っている場合は 409 を返す (本人都合での修正は要スタッフ介入)。
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
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
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
    },
    update: {
      educations: parsed.data.educations,
      careers: parsed.data.careers,
      skills: parsed.data.skills,
      desired: parsed.data.desired,
      selfPR: parsed.data.selfPR,
      lastEditedBy: "applicant",
      savedAt: now,
    },
  });

  // 1 回でも本人入力が来たら status を SKILL_SHEET_INPROGRESS に進める。
  // status-machine 的に SKILL_SHEET_INPROGRESS は RECEIVED / DIAGNOSED から到達可能。
  await prisma.applicant.updateMany({
    where: {
      id: applicantId,
      status: { in: ["RECEIVED", "DIAGNOSED"] },
    },
    data: { status: "SKILL_SHEET_INPROGRESS" },
  });

  return NextResponse.json({ ok: true, savedAt: sheet.savedAt }, { status: 200 });
}
