import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { hasCapability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";
import { buildSkillSheetInviteEmail } from "@/lib/email/templates/skill-sheet-invite";
import { recordAuditLog } from "@/lib/repositories/audit-log";
import {
  buildSkillSheetUrl,
  ensureSkillSheetToken,
  resolveAppBaseUrl,
} from "@/lib/skill-sheet/token";

export const runtime = "nodejs";

/**
 * スタッフが「スキルシート入力リンクを再送する」アクション。
 * 既存トークンが残り 24h 以上なら使い回し、短ければ新規発行 (ensureSkillSheetToken 内)。
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!hasCapability(session.user.role, "applicants:write")) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const applicant = await prisma.applicant.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      email: true,
      lastName: true,
      firstName: true,
      language: true,
    },
  });
  if (!applicant) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const token = await ensureSkillSheetToken(applicant.id);
  const url = buildSkillSheetUrl(resolveAppBaseUrl(), token.token);
  const result = await sendEmail(
    buildSkillSheetInviteEmail({
      applicantId: applicant.id,
      to: applicant.email,
      lastName: applicant.lastName,
      firstName: applicant.firstName,
      locale: applicant.language ?? "ja",
      skillSheetUrl: url,
    }),
  );

  await recordAuditLog({
    staffId: session.user.id,
    action: "skill_sheet.invite_resent",
    target: applicant.id,
    payload: { tokenId: token.id, success: result.ok },
  });

  return NextResponse.json(
    { ok: result.ok, url, expiresAt: token.expiresAt },
    { status: result.ok ? 200 : 502 },
  );
}
