import "server-only";

import { prisma } from "@/lib/db";
import {
  buildDiagnosisPdfInput,
  buildOverviewText,
} from "@/lib/pdf/diagnosisPdf.helpers";
import { renderDiagnosisPdf } from "@/lib/pdf/diagnosisPdf";

/**
 * v1.2: 申込者の AI 適職診断 PDF を Buffer で取得する共通ヘルパ。
 *
 * Use cases:
 *   - スタッフ代理登録時の招待メールに添付 (`registerApplicantByStaff`)
 *   - 既存の `/api/diagnosis/[id]/pdf` route からも同じロジックを呼びたいが、
 *     後者は HTTP レスポンスに変換するため、共通化はこの関数の Buffer 出力で完結する
 *
 * Returns null when there is no diagnosis yet (= まだ buildDiagnosis が走っていない)。
 */
export async function generateDiagnosisPdfBuffer(applicantId: string): Promise<Buffer | null> {
  const applicant = await prisma.applicant.findFirst({
    where: { id: applicantId, deletedAt: null },
    select: { id: true, lastName: true, firstName: true },
  });
  if (!applicant) return null;
  const diagnoses = await prisma.diagnosis.findMany({ where: { applicantId } });
  if (diagnoses.length === 0) return null;
  const overview = buildOverviewText(diagnoses);
  const input = buildDiagnosisPdfInput(applicant, diagnoses, overview);
  return renderDiagnosisPdf(input);
}
