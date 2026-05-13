import "server-only";

import { prisma } from "@/lib/db";
import { buildDiagnosis } from "@/lib/ai/diagnosis/buildDiagnosis";
import { sendEmail } from "@/lib/email/client";
import { buildSkillSheetInviteEmail } from "@/lib/email/templates/skill-sheet-invite";
import { generateDiagnosisPdfBuffer } from "@/lib/pdf/generateDiagnosisPdf";
import { recordAuditLog } from "@/lib/repositories/audit-log";
import type { AdminApplicantApiInput } from "@/lib/schemas/applicant";
import {
  buildSkillSheetUrl,
  ensureSkillSheetToken,
  resolveAppBaseUrl,
} from "@/lib/skill-sheet/token";

export type RegisterByStaffResult =
  | {
      ok: true;
      applicantId: string;
      diagnosisProvider: string | null;
      inviteSent: boolean;
      pdfAttached: boolean;
    }
  | { ok: false; reason: "ALREADY_REGISTERED" };

/**
 * v1.2: 社内スタッフが求職者を代理登録するメインフロー。
 *
 *   1. Applicant をデータベースに作成 (`status=RECEIVED`)
 *   2. AI 適職診断を即時実行 (`buildDiagnosis` → 内部で Diagnosis 11 行 upsert)
 *   3. 診断結果 PDF を Buffer で生成
 *   4. スキルシート招待トークンを発行 + URL を組み立てる
 *   5. **招待メールに診断 PDF を添付** して送信
 *   6. AuditLog 記録
 *
 * 「`POST /api/applicants` (公開、求職者本人向け) は将来の HP 連動用に残す」
 * とのユーザ指示があるため、本関数は **完全独立** のフローとして実装する。
 * 既存のメール (`applicant.receipt` / `staff.notification`) は送らず、
 * **「招待メール 1 通だけ」** に集約してスタッフ目線でシンプルに。
 *
 * AI 診断と PDF 生成が失敗しても、招待メールだけは送る (PDF 添付なし)。
 * 求職者の登録機会を逃さないため。
 */
export async function registerApplicantByStaff(
  input: AdminApplicantApiInput,
  staffId: string,
): Promise<RegisterByStaffResult> {
  // 重複申込防止: メール一致は ALREADY_REGISTERED として弾く
  const existing = await prisma.applicant.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, reason: "ALREADY_REGISTERED" };
  }

  const applicant = await prisma.applicant.create({
    data: {
      lastName: input.lastName,
      firstName: input.firstName,
      lastNameKana: input.lastNameKana,
      firstNameKana: input.firstNameKana,
      birthDate: new Date(input.birthDate),
      gender: input.gender,
      email: input.email,
      phone: input.phone,
      nationality: input.nationality || null,
      language: input.language,
      desiredCategories: input.desiredCategories,
      wantsDiagnosis: input.wantsDiagnosis,
      qualifications: {
        create: input.qualifications.map((name) => ({ name })),
      },
    },
    select: { id: true, lastName: true, firstName: true, email: true, language: true },
  });

  // AI 診断を即時実行。失敗しても致命的ではないので warn ログだけ残す。
  let diagnosisProvider: string | null = null;
  let pdfBuffer: Buffer | null = null;
  try {
    const result = await buildDiagnosis(applicant.id);
    diagnosisProvider = result.provider;
  } catch (err) {
    console.warn("[registerByStaff] diagnosis failed", { applicantId: applicant.id, err: String(err) });
  }

  try {
    pdfBuffer = await generateDiagnosisPdfBuffer(applicant.id);
  } catch (err) {
    console.warn("[registerByStaff] diagnosis pdf generation failed", {
      applicantId: applicant.id,
      err: String(err),
    });
  }

  // 招待メール (PDF 添付)
  let inviteSent = false;
  try {
    const token = await ensureSkillSheetToken(applicant.id);
    const url = buildSkillSheetUrl(resolveAppBaseUrl(), token.token);
    const msg = buildSkillSheetInviteEmail({
      applicantId: applicant.id,
      to: applicant.email,
      lastName: applicant.lastName,
      firstName: applicant.firstName,
      locale: applicant.language ?? "ja",
      skillSheetUrl: url,
      attachments: pdfBuffer
        ? [
            {
              filename: `tsumugi-ai-shindan-${applicant.id}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ]
        : undefined,
    });
    const res = await sendEmail(msg);
    inviteSent = res.ok;
  } catch (err) {
    console.warn("[registerByStaff] invite email failed", {
      applicantId: applicant.id,
      err: String(err),
    });
  }

  await recordAuditLog({
    staffId,
    action: "applicant.registered_by_staff",
    target: applicant.id,
    payload: {
      diagnosisProvider,
      pdfAttached: !!pdfBuffer,
      inviteSent,
    },
  });

  return {
    ok: true,
    applicantId: applicant.id,
    diagnosisProvider,
    inviteSent,
    pdfAttached: !!pdfBuffer,
  };
}
