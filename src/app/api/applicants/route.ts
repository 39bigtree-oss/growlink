import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";
import { sendReceiptEmail, sendStaffNotificationEmail } from "@/lib/email/receipt";
import { buildSkillSheetInviteEmail } from "@/lib/email/templates/skill-sheet-invite";
import { applicantApiSchema } from "@/lib/schemas/applicant";
import { ipKey, rateLimit } from "@/lib/security/rate-limit";
import { verifyRecaptchaToken } from "@/lib/security/recaptcha";
import {
  buildSkillSheetUrl,
  ensureSkillSheetToken,
  resolveAppBaseUrl,
} from "@/lib/skill-sheet/token";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // 同一 IP からの大量申込を防ぐ。5 分で 5 件まで。
  const limit = rateLimit(ipKey(req, "apply"), 5, 5 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "RATE_LIMITED", resetAt: limit.resetAt },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = applicantApiSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_ERROR", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const recaptcha = await verifyRecaptchaToken(data.recaptchaToken ?? null);
  if ("ok" in recaptcha && recaptcha.ok === false) {
    return NextResponse.json(
      { ok: false, error: "RECAPTCHA_REJECTED", reason: recaptcha.reason },
      { status: 400 },
    );
  }

  // 同一メールでの重複申込はやさしく弾く（ユーザーには「すでに受付済み」と返す）。
  const existing = await prisma.applicant.findUnique({ where: { email: data.email } });
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "ALREADY_REGISTERED" },
      { status: 409 },
    );
  }

  const applicant = await prisma.applicant.create({
    data: {
      lastName: data.lastName,
      firstName: data.firstName,
      lastNameKana: data.lastNameKana,
      firstNameKana: data.firstNameKana,
      birthDate: new Date(data.birthDate),
      gender: data.gender,
      email: data.email,
      phone: data.phone,
      nationality: data.nationality || null,
      language: data.language,
      desiredCategories: data.desiredCategories,
      wantsDiagnosis: data.wantsDiagnosis,
      // status はデフォルトの RECEIVED。
      qualifications: {
        create: data.qualifications.map((name) => ({ name })),
      },
    },
    select: { id: true },
  });

  // スキルシート編集用トークンを発行 → 招待メールに含める。
  // 失敗しても受付自体は成功とみなし、warn ログだけ残す（再送・再発行はスタッフ側で対応）。
  try {
    const token = await ensureSkillSheetToken(applicant.id);
    const skillSheetUrl = buildSkillSheetUrl(resolveAppBaseUrl(), token.token);

    await Promise.all([
      sendReceiptEmail({
        applicantId: applicant.id,
        email: data.email,
        lastName: data.lastName,
        firstName: data.firstName,
        language: data.language,
        wantsDiagnosis: data.wantsDiagnosis,
      }),
      sendEmail(
        buildSkillSheetInviteEmail({
          applicantId: applicant.id,
          to: data.email,
          lastName: data.lastName,
          firstName: data.firstName,
          locale: data.language ?? "ja",
          skillSheetUrl,
        }),
      ),
      sendStaffNotificationEmail({ applicantId: applicant.id }),
    ]);
  } catch (err) {
    console.warn("[apply] post-receipt steps failed", {
      applicantId: applicant.id,
      err: String(err),
    });
  }

  return NextResponse.json({ ok: true, applicantId: applicant.id }, { status: 201 });
}
