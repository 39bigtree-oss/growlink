import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { hasCapability } from "@/lib/auth/rbac";
import { registerApplicantByStaff } from "@/lib/applicants/registerByStaff";
import { adminApplicantApiSchema } from "@/lib/schemas/applicant";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * v1.2: 社内スタッフが求職者を「代理登録」する API。
 *
 * 既存の `POST /api/applicants` (求職者本人の自己応募) は将来の HP 連動用に残し、
 * こちらは認証 + RBAC が必要な内部エンドポイントとして分離する。
 *
 * フロー: 申込登録 → AI 適職診断 → 招待メール (診断 PDF 添付) 送信
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!hasCapability(session.user.role, "applicants:write")) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = adminApplicantApiSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_ERROR", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await registerApplicantByStaff(parsed.data, session.user.id);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 409 });
  }

  return NextResponse.json(
    {
      ok: true,
      applicantId: result.applicantId,
      diagnosisProvider: result.diagnosisProvider,
      inviteSent: result.inviteSent,
      pdfAttached: result.pdfAttached,
    },
    { status: 201 },
  );
}
